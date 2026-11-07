// src/app/api/leave/requests/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function calcDaysBetween(startStr, endStr) {
  if (!startStr || !endStr) return 1
  const s = new Date(startStr)
  const e = new Date(endStr)
  const diffTime = Math.abs(e - s)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const supervisorId = searchParams.get('supervisorId')

    const where = {}
    if (userId) where.userId = Number(userId)
    if (status && status !== 'all') where.status = status

    let leaves = await prisma.leave.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            dept: true,
            position: true,
            email: true,
            employeeId: true,
          },
        },
        leaveType: true,
      },
      orderBy: { id: 'desc' },
    })

    // Filter jika mencari pengajuan bawahan untuk supervisor tertentu (Approval 1 / Approval 2)
    if (supervisorId) {
      const sId = Number(supervisorId)
      // Dapatkan daftar id bawahan dari Employee table
      const subordinates = await prisma.employee.findMany({
        where: {
          OR: [
            { managerId: sId },
            { approver1Id: sId },
            { approver2Id: sId },
          ],
        },
        select: { id: true },
      })
      const subIds = new Set(subordinates.map((e) => e.id))

      leaves = leaves.filter((l) => {
        // Cek apakah bawahan langsung di matriks
        if (subIds.has(l.userId)) return true

        // Cek apakah task saat ini sedang pending untuk approver ini
        const steps = Array.isArray(l.steps) ? l.steps : []
        const currentPendingStep = steps.find((s) => s.status === 'Pending')
        if (currentPendingStep && currentPendingStep.approverId === sId) return true

        return false
      })
    }

    return Response.json({ success: true, data: leaves })
  } catch (error) {
    console.error('[API /api/leave/requests GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      userId,
      typeId,
      startDate,
      endDate,
      note = '',
      customData = {},
      attachment = null,
    } = body

    if (!userId || !typeId || !startDate || !endDate) {
      return Response.json(
        { success: false, error: 'User ID, Jenis Cuti, Tanggal Mulai dan Selesai wajib diisi' },
        { status: 400 }
      )
    }

    if (endDate < startDate) {
      return Response.json(
        { success: false, error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' },
        { status: 400 }
      )
    }

    // Ambil data Jenis Cuti dari DB
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: Number(typeId) },
    })

    if (!leaveType) {
      return Response.json({ success: false, error: 'Jenis cuti tidak ditemukan' }, { status: 404 })
    }

    // Ambil info Karyawan beserta Approver 1 & Approver 2
    const employee = await prisma.employee.findUnique({
      where: { id: Number(userId) },
    })

    const days = calcDaysBetween(startDate, endDate)

    // Resolve Approver 1 & Approver 2 from matrix
    const app1Id = employee?.approver1Id || employee?.managerId || null
    const app2Id = employee?.approver2Id || null

    let approver1 = null
    let approver2 = null
    if (app1Id) {
      approver1 = await prisma.employee.findUnique({
        where: { id: app1Id },
        select: { id: true, name: true, jobPosition: true, role: true },
      })
    }
    if (app2Id) {
      approver2 = await prisma.employee.findUnique({
        where: { id: app2Id },
        select: { id: true, name: true, jobPosition: true, role: true },
      })
    }

    // Smart Auto-Bypass: Jika pemohon adalah Approval 1 itu sendiri (Koordinator / Lead)
    const isSelfApprover1 = Boolean(app1Id && employee?.id === app1Id)

    const steps = []

    if (leaveType.autoApprove) {
      steps.push({
        level: 1,
        tier: 'auto_approved',
        type: 'auto',
        label: 'Otomatis Disetujui Sistem',
        status: 'Approved',
        approverId: null,
        approverName: 'Sistem',
        actedAt: new Date().toISOString(),
        note: 'Auto approve by policy',
      })
    } else {
      // Step 1: Approval 1 (Koordinator / Team Lead / SPV)
      if (app1Id) {
        steps.push({
          level: 1,
          tier: 'approval_1',
          type: 'coordinator',
          label: `Approval 1 (${approver1?.jobPosition || approver1?.name || 'Koordinator / Lead'})`,
          status: isSelfApprover1 ? 'Approved' : 'Pending',
          approverId: app1Id,
          approverName: approver1?.name || 'Approval 1',
          actedAt: isSelfApprover1 ? new Date().toISOString() : null,
          note: isSelfApprover1 ? 'Auto-Bypass: Pemohon adalah Approval 1 (Koordinator)' : '',
        })
      }

      // Step 2: Approval 2 (Manager / Dept Head / HR Manager)
      if (app2Id && app2Id !== app1Id) {
        steps.push({
          level: steps.length + 1,
          tier: 'approval_2',
          type: 'manager',
          label: `Approval 2 (${approver2?.jobPosition || approver2?.name || 'Manager / Head'})`,
          status: isSelfApprover1 ? 'Pending' : 'Waiting',
          approverId: app2Id,
          approverName: approver2?.name || 'Approval 2',
          actedAt: null,
          note: '',
        })
      }
    }

    // Validasi field dinamis wajib dari Form Builder
    const fields = Array.isArray(leaveType.formFields) ? leaveType.formFields : []
    for (const f of fields) {
      if (f.required) {
        const val = customData[f.id]
        if (val === undefined || val === null || val === '') {
          return Response.json(
            { success: false, error: `Kolom '${f.label}' wajib diisi!` },
            { status: 400 }
          )
        }
      }
    }

    // Simpan ke database
    const created = await prisma.leave.create({
      data: {
        userId: Number(userId),
        typeId: Number(typeId),
        typeName: leaveType.name,
        startDate,
        endDate,
        days,
        note,
        customData,
        attachment,
        status: leaveType.autoApprove ? 'Approved' : 'Pending',
        steps,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true, dept: true },
        },
        leaveType: true,
      },
    })

    return Response.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('[API /api/leave/requests POST] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
