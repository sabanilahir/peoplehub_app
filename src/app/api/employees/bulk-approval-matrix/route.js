import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const body = await request.json()
    const { items = [], autoCreateDirector = true, updateNik = false } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tidak ada data matriks approval yang dikirim.'
      }, { status: 400 })
    }

    let directorCreated = false
    let directorId = null

    // Check if any item references Andy Lesmana or requires director creation
    if (autoCreateDirector) {
      let existingDirector = await prisma.employee.findFirst({
        where: {
          name: { equals: 'Andy Lesmana', mode: 'insensitive' }
        }
      })

      if (!existingDirector) {
        const maxEmp = await prisma.employee.findFirst({ orderBy: { id: 'desc' } })
        directorId = Math.max((maxEmp?.id || 300190) + 1, 300199)

        existingDirector = await prisma.employee.create({
          data: {
            id: directorId,
            nik: 'DIR-001',
            name: 'Andy Lesmana',
            status: 'Active',
            role: 'manager',
            dept: 'Management',
            position: 'Director',
            jobPosition: 'Director',
            jobTitle: 'Director',
            email: 'andy.lesmana@peoplehub.com',
          }
        })

        // Also create User if not exists
        const userExists = await prisma.user.findFirst({
          where: { username: 'andy.lesmana' }
        })
        if (!userExists) {
          await prisma.user.create({
            data: {
              id: directorId,
              username: 'andy.lesmana',
              password: 'pass123',
              name: 'Andy Lesmana',
              role: 'manager',
              dept: 'Management',
              position: 'Director',
              email: 'andy.lesmana@peoplehub.com',
              employeeId: directorId,
            }
          })
        }
        directorCreated = true
      } else {
        directorId = existingDirector.id
      }
    }

    // Execute bulk updates in a transaction
    const updateOps = items.map(item => {
      const { employeeId, csvId, managerId, approver1Id, approver2Id, approvalMatrix } = item

      // If managerId or approver1Id was flagged for Andy Lesmana (e.g. -1 or 'andy' or null with name), map to directorId
      const finalManagerId = (managerId === -1 || managerId === 'andy') && directorId
        ? directorId
        : (managerId ? Number(managerId) : null)

      const finalApprover1Id = (approver1Id === -1 || approver1Id === 'andy') && directorId
        ? directorId
        : (approver1Id ? Number(approver1Id) : null)

      const finalApprover2Id = (approver2Id === -1 || approver2Id === 'andy') && directorId
        ? directorId
        : (approver2Id ? Number(approver2Id) : null)

      const cleanedMatrix = (approvalMatrix || []).map(m => {
        const empId = (m.employeeId === -1 || m.employeeId === 'andy') && directorId
          ? directorId
          : Number(m.employeeId)
        return {
          level: m.level,
          employeeId: empId,
          label: m.label || `Approval ${m.level}`,
        }
      }).filter(m => m.employeeId && !isNaN(m.employeeId))

      const dataToUpdate = {
        managerId: finalManagerId,
        approver1Id: finalApprover1Id,
        approver2Id: finalApprover2Id,
        approvalMatrix: cleanedMatrix,
      }

      if (updateNik && csvId) {
        dataToUpdate.nik = String(csvId).trim()
      }

      return prisma.employee.update({
        where: { id: Number(employeeId) },
        data: dataToUpdate,
      })
    })

    const results = await prisma.$transaction(updateOps)

    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      directorCreated,
      directorId,
    })
  } catch (error) {
    console.error('[Bulk Approval Matrix] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menyimpan pembaruan matriks approval massal.'
    }, { status: 500 })
  }
}
