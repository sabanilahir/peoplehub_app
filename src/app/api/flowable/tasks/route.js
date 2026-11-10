import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTasksWithIdentityLinks } from '@/lib/flowable/client'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const assigneeParam = searchParams.get('assignee')
    const candidateUser = searchParams.get('candidateUser')
    const candidateOrAssigned = searchParams.get('candidateOrAssigned')
    const userIdParam = searchParams.get('userId')
    const usernameParam = searchParams.get('username')
    const candidateGroup = searchParams.get('candidateGroup')
    const processInstanceId = searchParams.get('processInstanceId')
    const status = searchParams.get('status') || 'open'
    const size = Number(searchParams.get('size')) || 50

    const searchIdentifier = candidateOrAssigned || usernameParam || userIdParam || assigneeParam

    let targetUser = null
    let targetEmployee = null
    let userAliases = new Set()

    if (searchIdentifier) {
      // 1. Temukan data user di database PostgreSQL
      const numId = isNaN(Number(searchIdentifier)) ? undefined : Number(searchIdentifier)
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: searchIdentifier },
            ...(numId ? [{ id: numId }, { employeeId: numId }] : []),
          ],
        },
      })

      if (targetUser?.employeeId) {
        targetEmployee = await prisma.employee.findUnique({
          where: { id: targetUser.employeeId },
        })
      } else if (numId) {
        targetEmployee = await prisma.employee.findUnique({
          where: { id: numId },
        })
      }

      // Kumpulkan seluruh alias identitas user (username, odoo_id, nik, id numerik)
      if (targetUser) {
        userAliases.add(targetUser.username)
        userAliases.add(String(targetUser.id))
        if (targetUser.employeeId) userAliases.add(String(targetUser.employeeId))
        if (targetUser.odoo_id) {
          userAliases.add(String(targetUser.odoo_id))
          userAliases.add(`ODOO-${targetUser.odoo_id}`)
        }
      }

      if (targetEmployee) {
        userAliases.add(String(targetEmployee.id))
        if (targetEmployee.nik) userAliases.add(targetEmployee.nik)
        if (targetEmployee.odoo_id) {
          userAliases.add(String(targetEmployee.odoo_id))
          userAliases.add(`ODOO-${targetEmployee.odoo_id}`)
        }
      }

      // Sertakan juga string pencarian asli
      userAliases.add(searchIdentifier)
    }

    const isSuperadmin =
      targetUser?.role === 'superadmin' ||
      targetUser?.role === 'admin' ||
      searchIdentifier === 'admin'

    // Resolusi Candidate Groups yang dimiliki user
    const userCandidateGroups = new Set()
    if (isSuperadmin) {
      userCandidateGroups.add('superadmin')
      userCandidateGroups.add('hr')
      userCandidateGroups.add('managers')
      userCandidateGroups.add('supervisors')
      userCandidateGroups.add('finance')
    } else {
      const userRole = (targetUser?.role || '').toLowerCase()
      const empRole = (targetEmployee?.role || '').toLowerCase()
      const dept = (targetUser?.dept || targetEmployee?.dept || '').toLowerCase()

      // 1. HR Group
      if (
        userRole.includes('hr') ||
        userRole.includes('director') ||
        dept.includes('hr') ||
        dept.includes('human resource')
      ) {
        userCandidateGroups.add('hr')
      }

      // 2. Finance Group
      if (
        userRole.includes('finance') ||
        dept.includes('finance') ||
        dept.includes('keuangan') ||
        dept.includes('accounting')
      ) {
        userCandidateGroups.add('finance')
      }

      // 3. Managers / Supervisors Group
      if (
        userRole === 'manager' ||
        userRole === 'supervisor' ||
        empRole === 'manager' ||
        empRole === 'supervisor'
      ) {
        userCandidateGroups.add('managers')
        userCandidateGroups.add('supervisors')
      } else {
        const subordinateCount = await prisma.employee.count({
          where: {
            OR: [
              ...(targetUser?.id ? [{ managerId: targetUser.id }, { approver1Id: targetUser.id }] : []),
              ...(targetEmployee?.id ? [{ managerId: targetEmployee.id }, { approver1Id: targetEmployee.id }] : []),
            ],
          },
        })
        if (subordinateCount > 0) {
          userCandidateGroups.add('managers')
          userCandidateGroups.add('supervisors')
        }
      }

      // 4. Custom Userlists dari AppState (hcm-userlists)
      try {
        const appStateRow = await prisma.appState.findUnique({ where: { key: 'hcm-userlists' } })
        if (appStateRow?.value) {
          const parsed = JSON.parse(appStateRow.value)
          const lists = parsed.state?.userlists || []
          for (const list of lists) {
            const listSlug = (list.name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '_')
            let isMember = false

            if (list.roles && (list.roles.includes(userRole) || list.roles.includes(empRole))) {
              isMember = true
            }
            if (list.employeeIds && targetEmployee?.id && list.employeeIds.includes(targetEmployee.id)) {
              isMember = true
            }
            if (list.positionIds && targetEmployee?.positionId && list.positionIds.includes(targetEmployee.positionId)) {
              isMember = true
            }

            if (isMember) {
              userCandidateGroups.add(listSlug)
              const nameLower = (list.name || '').toLowerCase().trim()
              userCandidateGroups.add(nameLower)
              userCandidateGroups.add(String(list.id))
              if (nameLower.includes('hr')) userCandidateGroups.add('hr')
              if (nameLower.includes('manager')) userCandidateGroups.add('managers')
              if (nameLower.includes('finance')) userCandidateGroups.add('finance')
            }
          }
        }
      } catch (e) {
        // Abaikan jika store belum ada
      }
    }

    // Parameter default ke Flowable Engine
    const params = {
      size: Math.max(size, 100),
      includeProcessVariables: true,
      includeTaskLocalVariables: true,
    }

    if (processInstanceId) params.processInstanceId = processInstanceId

    // Ambil data task lengkap dengan identity links (candidate groups & candidate users)
    const result = await getTasksWithIdentityLinks(params)

    if (!result.success) {
      return NextResponse.json({
        success: true,
        data: { data: [], total: 0 },
        warning: result.error,
      })
    }

    const allTasks = result.data?.data || []

    // Filter tugas berdasarkan Smart Identity & Candidate Groups Resolver
    let filteredTasks = allTasks

    if (!isSuperadmin && userAliases.size > 0) {
      filteredTasks = allTasks.filter((task) => {
        const vars = Array.isArray(task.variables) ? task.variables : []
        const empId = vars.find((v) => v.name === 'employeeId')?.value
        const empNik = vars.find((v) => v.name === 'employeeNik')?.value
        const initiator = vars.find((v) => v.name === 'initiatorUsername' || v.name === 'initiator')?.value

        const isSelfApplicant =
          (empId && userAliases.has(String(empId))) ||
          (empNik && userAliases.has(String(empNik))) ||
          (initiator && userAliases.has(String(initiator)))

        // Pemohon sendiri tidak boleh meng-approve permohonan cutinya sendiri
        if (isSelfApplicant) {
          return false
        }

        // 1. Cocokkan langsung ke assignee atau owner task
        if (task.assignee && userAliases.has(task.assignee)) return true
        if (task.owner && userAliases.has(task.owner)) return true

        // 2. Cocokkan ke variabel proses approver tingkat 1 dan 2
        const app1Id = vars.find((v) => v.name === 'approver1Id')?.value
        const app1User = vars.find((v) => v.name === 'approver1Username')?.value
        const app2Id = vars.find((v) => v.name === 'approver2Id')?.value
        const app2User = vars.find((v) => v.name === 'approver2Username')?.value
        const supId = vars.find((v) => v.name === 'supervisorId')?.value
        const supUser = vars.find((v) => v.name === 'supervisorUsername')?.value
        const appOldId = vars.find((v) => v.name === 'approverId')?.value
        const targetUsername = vars.find((v) => v.name === 'targetUsername')?.value

        const taskKeyLower = (task.taskDefinitionKey || '').toLowerCase()
        const isTask1 = taskKeyLower.includes('approver1') || taskKeyLower.includes('supervisor')
        const isTask2 = taskKeyLower.includes('approver2') || taskKeyLower.includes('hr')

        if (isTask1) {
          if (app1Id && userAliases.has(String(app1Id))) return true
          if (app1User && userAliases.has(String(app1User))) return true
          if (supId && userAliases.has(String(supId))) return true
          if (supUser && userAliases.has(String(supUser))) return true
        }

        if (isTask2) {
          if (app2Id && userAliases.has(String(app2Id))) return true
          if (app2User && userAliases.has(String(app2User))) return true
        }

        if (appOldId && userAliases.has(String(appOldId))) return true
        if (targetUsername && userAliases.has(String(targetUsername))) return true

        // 3. Jika task BELUM memiliki assignee spesifik (task pool untuk group),
        // atau assignee kosong, cocokkan dengan candidate groups user
        if (!task.assignee || task.assignee.trim() === '') {
          const taskGroups = (task.candidateGroups || []).map((g) => g.toLowerCase())
          if (taskGroups.some((g) => userCandidateGroups.has(g))) return true

          const taskUsers = task.candidateUsers || []
          if (taskUsers.some((u) => userAliases.has(u))) return true
        }

        return false
      })
    }

    // Filter tambahan jika client secara eksplisit meminta candidateGroup tertentu
    if (candidateGroup) {
      filteredTasks = filteredTasks.filter((t) =>
        (t.candidateGroups || []).map((g) => g.toLowerCase()).includes(candidateGroup.toLowerCase())
      )
    }

    // Normalisasi variabel untuk kemudahan frontend
    const enrichedTasks = filteredTasks.map((t) => {
      const varMap = {}
      ;(t.variables || []).forEach((v) => {
        varMap[v.name] = v.value
      })

      const leaveType = varMap.leaveType || 'Cuti'
      let payrollImpact = 'Memotong kuota cuti tahunan'
      let payrollTone = 'blue'
      const typeLower = leaveType.toLowerCase()

      if (typeLower.includes('setengah')) {
        payrollImpact = 'Akan memotong 50% Gaji Gross harian di HO Calculator'
        payrollTone = 'amber'
      } else if (typeLower.includes('sakit')) {
        payrollImpact = 'Hanya memotong Prorata Tunjangan Transport jika ada surat dokter'
        payrollTone = 'emerald'
      } else if (typeLower.includes('unpaid') || typeLower.includes('potong gaji')) {
        payrollImpact = 'Akan memotong 100% Gaji Gross harian di HO Calculator'
        payrollTone = 'red'
      }

      return {
        ...t,
        parsedVariables: varMap,
        candidateGroups: t.candidateGroups || [],
        candidateGroupDisplay: (t.candidateGroups || []).join(', ') || null,
        applicantName: varMap.employeeName || varMap.initiatorName || 'Karyawan',
        applicantNik: varMap.employeeNik || '',
        applicantDept: varMap.employeeDept || 'Operasional',
        applicantPosition: varMap.employeePosition || '',
        leaveType,
        startDate: varMap.startDate || '',
        endDate: varMap.endDate || '',
        days: varMap.days || '1',
        reason: varMap.reason || varMap.note || '',
        payrollImpact,
        payrollTone,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        data: enrichedTasks,
        total: enrichedTasks.length,
      },
      resolvedAliases: Array.from(userAliases),
      resolvedCandidateGroups: Array.from(userCandidateGroups),
    })
  } catch (error) {
    console.error('[API /api/flowable/tasks GET] Error:', error)
    return NextResponse.json({
      success: true,
      data: { data: [], total: 0 },
      error: error.message,
    })
  }
}
