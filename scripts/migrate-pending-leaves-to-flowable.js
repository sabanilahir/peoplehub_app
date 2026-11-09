// scripts/migrate-pending-leaves-to-flowable.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

// Load .env manually if not already present
try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim()
        let val = trimmed.slice(eqIdx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
} catch (e) {}

import { startProcess, ensureLeaveProcessDeployed } from '../src/lib/flowable/client.js'

const prisma = new PrismaClient()

async function main() {
  console.log('=== [PeopleHub] Migrasi Pengajuan Cuti Pending ke Flowable BPMN Engine ===')

  // 1. Pastikan LeaveRequest BPMN sudah ter-deploy di Flowable Engine
  console.log('1. Memastikan proses LeaveRequest terdeploy di Flowable Engine...')
  const deployRes = await ensureLeaveProcessDeployed()
  if (!deployRes.success) {
    console.error('❌ Gagal deploy proses ke Flowable Engine:', deployRes.error)
    process.exit(1)
  }
  console.log('✅ Definisi proses LeaveRequest siap di Flowable Engine.')

  // 2. Ambil data cuti pending dari database
  const pendingLeaves = await prisma.leave.findMany({
    where: { status: 'Pending' },
    include: {
      user: true,
      leaveType: true,
    },
  })

  console.log(`2. Ditemukan ${pendingLeaves.length} pengajuan cuti berstatus Pending di database.`)

  let migratedCount = 0
  let skippedCount = 0

  for (const leave of pendingLeaves) {
    const customData = (typeof leave.customData === 'object' && leave.customData !== null) ? leave.customData : {}

    if (customData.flowableProcessInstanceId) {
      console.log(`- Cuti #${leave.id} (${leave.user?.name || 'User #' + leave.userId}) sudah memiliki instance Flowable: ${customData.flowableProcessInstanceId}. Lewati.`)
      skippedCount++
      continue
    }

    console.log(`- Memigrasikan Cuti #${leave.id} (${leave.user?.name || 'User #' + leave.userId}) ke Flowable...`)

    // Temukan atasan / supervisor
    let supervisorUsername = 'admin'
    let supervisorId = ''

    if (leave.userId) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: leave.userId },
            { nik: leave.user?.username || '' },
          ],
        },
      })

      if (emp?.managerId || emp?.approver1Id) {
        supervisorId = String(emp.managerId || emp.approver1Id)
        const supEmp = await prisma.employee.findUnique({
          where: { id: Number(supervisorId) },
        })
        if (supEmp) {
          supervisorUsername = supEmp.nik || (supEmp.odoo_id ? `ODOO-${supEmp.odoo_id}` : supEmp.name)
        }
      }
    }

    const flowVariables = [
      { name: 'leaveId', value: String(leave.id), type: 'string' },
      { name: 'employeeId', value: String(leave.userId), type: 'string' },
      { name: 'employeeName', value: leave.user?.name || 'Karyawan', type: 'string' },
      { name: 'employeeNik', value: leave.user?.username || '', type: 'string' },
      { name: 'employeeDept', value: leave.user?.dept || '', type: 'string' },
      { name: 'leaveType', value: leave.leaveType?.name || leave.typeName || 'Cuti Tahunan', type: 'string' },
      { name: 'startDate', value: leave.startDate || '', type: 'string' },
      { name: 'endDate', value: leave.endDate || '', type: 'string' },
      { name: 'days', value: String(leave.days || 1), type: 'string' },
      { name: 'reason', value: leave.note || 'Pengajuan Cuti', type: 'string' },
      { name: 'supervisorId', value: supervisorId, type: 'string' },
      { name: 'supervisorUsername', value: supervisorUsername, type: 'string' },
    ]

    try {
      const procRes = await startProcess('LeaveRequest', flowVariables)
      if (procRes.success && procRes.data?.id) {
        const updatedCustom = {
          ...customData,
          flowableProcessInstanceId: procRes.data.id,
          migratedToFlowableAt: new Date().toISOString(),
        }

        await prisma.leave.update({
          where: { id: leave.id },
          data: { customData: updatedCustom },
        })

        console.log(`  ✅ Berhasil dimigrasikan ke Flowable Instance ID: ${procRes.data.id}`)
        migratedCount++
      } else {
        console.error(`  ❌ Gagal startProcess untuk Cuti #${leave.id}:`, procRes.error)
      }
    } catch (err) {
      console.error(`  ❌ Exception saat migrasi Cuti #${leave.id}:`, err.message)
    }
  }

  console.log('=== [Hasil Migrasi] ===')
  console.log(`Total Diproses : ${pendingLeaves.length}`)
  console.log(`Berhasil Migrasi: ${migratedCount}`)
  console.log(`Dilewati (Sudah Ada Flowable): ${skippedCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
