// src/app/api/workflow/tasks/route.js
import { prisma } from '@/lib/prisma'
import { getTasksWithIdentityLinks } from '@/lib/flowable/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workflow/tasks
 * Mengambil seluruh tugas persetujuan (Cuti DB, Cuti Flowable, & Lembur DB) yang pending
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userIdParam = searchParams.get('userId')
    const statusParam = searchParams.get('status') || 'open'
    const categoryParam = searchParams.get('category') || 'all'

    const targetUserId = userIdParam ? Number(userIdParam) : null

    // Ambil data user yang login (jika ada) untuk mengecek role & aliases
    let currentUser = null
    let currentEmp = null
    let userAliases = new Set()

    if (targetUserId) {
      currentUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, role: true, employeeId: true, username: true, odoo_id: true },
      })
      if (currentUser?.employeeId) {
        currentEmp = await prisma.employee.findUnique({
          where: { id: currentUser.employeeId },
          select: { id: true, name: true, role: true, managerId: true, nik: true, odoo_id: true },
        })
      }

      if (currentUser) {
        userAliases.add(currentUser.username)
        userAliases.add(String(currentUser.id))
        if (currentUser.employeeId) userAliases.add(String(currentUser.employeeId))
        if (currentUser.odoo_id) {
          userAliases.add(String(currentUser.odoo_id))
          userAliases.add(`ODOO-${currentUser.odoo_id}`)
        }
      }

      if (currentEmp) {
        userAliases.add(String(currentEmp.id))
        if (currentEmp.nik) userAliases.add(currentEmp.nik)
        if (currentEmp.odoo_id) {
          userAliases.add(String(currentEmp.odoo_id))
          userAliases.add(`ODOO-${currentEmp.odoo_id}`)
        }
      }
    }

    const isHrOrAdmin = !currentUser || ['superadmin', 'admin', 'hr', 'hr_manager', 'director'].includes(currentUser?.role)

    // 1. Ambil Pengajuan Cuti dari PostgreSQL (Leave)
    const leaveWhere = {}
    if (statusParam === 'open') {
      leaveWhere.status = 'Pending'
    } else if (statusParam === 'completed') {
      leaveWhere.status = { in: ['Approved', 'Rejected'] }
    }

    const leaves = await prisma.leave.findMany({
      where: leaveWhere,
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

    // 2. Ambil Pengajuan Lembur dari PostgreSQL (Overtime)
    const otWhere = {}
    if (statusParam === 'open') {
      otWhere.status = 'Pending'
    } else if (statusParam === 'completed') {
      otWhere.status = { in: ['Approved', 'Rejected'] }
    }

    const overtimes = await prisma.overtimeRecord.findMany({
      where: otWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nik: true,
            dept: true,
            location: true,
            workLocationCode: true,
            salary: true,
            position: true,
            managerId: true,
            approver1Id: true,
            approver2Id: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    })

    // 3. Ambil Tugas Flowable Engine (BPMN)
    let flowableTasks = []
    if (statusParam === 'open') {
      try {
        // Resolusi Candidate Groups untuk user yang sedang aktif
        const userCandidateGroups = new Set()
        const isSuperadminUser = currentUser?.role === 'superadmin' || currentUser?.role === 'admin'
        if (isSuperadminUser) {
          userCandidateGroups.add('superadmin')
          userCandidateGroups.add('hr')
          userCandidateGroups.add('managers')
          userCandidateGroups.add('supervisors')
          userCandidateGroups.add('finance')
        } else if (currentUser) {
          const uRole = (currentUser.role || '').toLowerCase()
          const eRole = (currentEmp?.role || '').toLowerCase()
          const uDept = (currentUser.dept || currentEmp?.dept || '').toLowerCase()

          if (['hr', 'hr_manager', 'director'].includes(uRole) || ['hr', 'hr_manager'].includes(eRole) || uDept.includes('hr')) {
            userCandidateGroups.add('hr')
          }
          if (['manager', 'supervisor'].includes(uRole) || ['manager', 'supervisor'].includes(eRole)) {
            userCandidateGroups.add('managers')
            userCandidateGroups.add('supervisors')
          } else {
            const subCount = await prisma.employee.count({
              where: {
                OR: [
                  { managerId: currentUser.id },
                  { approver1Id: currentUser.id },
                  ...(currentEmp?.id ? [{ managerId: currentEmp.id }, { approver1Id: currentEmp.id }] : []),
                ],
              },
            })
            if (subCount > 0) {
              userCandidateGroups.add('managers')
              userCandidateGroups.add('supervisors')
            }
          }
          if (['finance', 'accounting'].includes(uRole) || uDept.includes('finance') || uDept.includes('keuangan')) {
            userCandidateGroups.add('finance')
          }

          // Userlists AppState
          try {
            const appStateRow = await prisma.appState.findUnique({ where: { key: 'hcm-userlists' } })
            if (appStateRow?.value) {
              const parsed = JSON.parse(appStateRow.value)
              const lists = parsed.state?.userlists || []
              for (const list of lists) {
                const listSlug = (list.name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '_')
                let isMember = false
                if (list.roles && (list.roles.includes(uRole) || list.roles.includes(eRole))) isMember = true
                if (list.employeeIds && currentEmp?.id && list.employeeIds.includes(currentEmp.id)) isMember = true
                if (list.positionIds && currentEmp?.positionId && list.positionIds.includes(currentEmp.positionId)) isMember = true
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
          } catch (e) {}
        }

        const flowRes = await getTasksWithIdentityLinks({ size: 100, includeProcessVariables: true })
        if (flowRes.success && Array.isArray(flowRes.data?.data)) {
          const rawFlowTasks = flowRes.data.data

          // Filter tugas yang relevan untuk user yang login
          const matchedFlowTasks = isHrOrAdmin
            ? rawFlowTasks
            : rawFlowTasks.filter((ft) => {
                const vars = ft.variables || []
                const empId = vars.find((v) => v.name === 'employeeId')?.value
                const empNik = vars.find((v) => v.name === 'employeeNik')?.value
                const initiator = vars.find((v) => v.name === 'initiatorUsername' || v.name === 'initiator')?.value

                // Pemohon tidak boleh meng-approve permohonan sendiri via candidate group
                const isSelfApplicant =
                  (empId && userAliases.has(String(empId))) ||
                  (empNik && userAliases.has(String(empNik))) ||
                  (initiator && userAliases.has(String(initiator)))

                if (isSelfApplicant) {
                  return false
                }

                if (ft.assignee && userAliases.has(ft.assignee)) return true
                if (ft.owner && userAliases.has(ft.owner)) return true

                const supId = vars.find((v) => v.name === 'supervisorId')?.value
                const supUser = vars.find((v) => v.name === 'supervisorUsername')?.value
                const app1Id = vars.find((v) => v.name === 'approverId')?.value
                if (supId && userAliases.has(String(supId))) return true
                if (supUser && userAliases.has(String(supUser))) return true
                if (app1Id && userAliases.has(String(app1Id))) return true

                // Jika task belum di-assign (task pool untuk group), cocokkan ke candidate groups
                if (!ft.assignee || ft.assignee.trim() === '') {
                  const taskGroups = (ft.candidateGroups || []).map((g) => g.toLowerCase())
                  if (taskGroups.some((g) => userCandidateGroups.has(g))) return true

                  const taskUsers = ft.candidateUsers || []
                  if (taskUsers.some((u) => userAliases.has(u))) return true
                }

                return false
              })

          flowableTasks = matchedFlowTasks.map((ft) => {
            const varMap = {}
            ;(ft.variables || []).forEach((v) => {
              varMap[v.name] = v.value
            })

            const leaveType = varMap.leaveType || 'Cuti Tahunan'
            const typeLower = leaveType.toLowerCase()
            let payrollImpact = 'Memotong kuota cuti tahunan'
            let payrollTone = 'blue'

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

            const applicantName = varMap.employeeName || ft.description || 'Karyawan'
            const applicantNik = varMap.employeeNik || (varMap.employeeId ? `EMP-${varMap.employeeId}` : '')
            const days = varMap.days || '1'
            const startDate = varMap.startDate || ft.createTime?.slice(0, 10) || ''
            const endDate = varMap.endDate || startDate

            return {
              id: `flowable-${ft.id}`,
              taskId: ft.id,
              isFlowable: true,
              category: 'leave',
              type: 'Permohonan Cuti (Flowable BPMN)',
              title: `${leaveType} · ${applicantName}`,
              applicantName,
              applicantNik,
              applicantDept: varMap.employeeDept || 'Operasional',
              applicantPosition: varMap.employeePosition || 'Staff',
              leaveType,
              startDate,
              endDate,
              durationText: `${days} Hari Kerja`,
              note: varMap.reason || ft.description || 'Pengajuan via Flowable BPMN Engine',
              attachment: null,
              status: 'Pending',
              currentStep: ft.name || 'Supervisor Approval',
              currentLevel: 1,
              totalLevels: 2,
              steps: [
                {
                  level: 1,
                  label: ft.name || 'Supervisor Approval',
                  status: 'Pending',
                  approverName: ft.assignee || 'Supervisor',
                },
              ],
              payrollImpact,
              payrollTone,
              canApprove: true,
              createdAt: ft.createTime || new Date().toISOString(),
            }
          })
        }
      } catch (err) {
        console.warn('[Workflow Tasks] Could not query Flowable tasks:', err.message)
      }
    }

    // 4. Normalisasi tugas cuti PostgreSQL
    const leaveTasks = leaves.map((l) => {
      const steps = Array.isArray(l.steps) ? l.steps : []
      const currentPendingStep = steps.find((s) => s.status === 'Pending') || steps[0] || null
      const currentLevel = currentPendingStep?.level || 1
      const currentStepLabel = currentPendingStep?.label || (l.status === 'Approved' ? 'Selesai (Disetujui)' : 'Approval')

      let payrollImpact = 'Memotong kuota cuti tahunan'
      let payrollTone = 'blue'
      const typeLower = (l.typeName || '').toLowerCase()
      if (typeLower.includes('setengah')) {
        payrollImpact = 'Akan memotong 50% Gaji Gross harian di HO Calculator'
        payrollTone = 'amber'
      } else if (typeLower.includes('sakit')) {
        if (l.attachment) {
          payrollImpact = 'Hanya memotong Prorata Tunjangan Transport di HO Calculator (Surat Terlampir)'
          payrollTone = 'emerald'
        } else {
          payrollImpact = 'Tanpa surat dokter: dialihkan memotong 100% Gaji Gross (Unpaid Leave)'
          payrollTone = 'red'
        }
      } else if (typeLower.includes('unpaid') || typeLower.includes('potong gaji')) {
        payrollImpact = 'Akan memotong 100% Gaji Gross harian di HO Calculator'
        payrollTone = 'red'
      }

      let canApprove = isHrOrAdmin
      if (!isHrOrAdmin && targetUserId && currentPendingStep) {
        const empId = currentUser?.employeeId || targetUserId
        if (currentPendingStep.approverId === targetUserId || currentPendingStep.approverId === empId) {
          canApprove = true
        }
      }

      return {
        id: `leave-${l.id}`,
        taskId: l.id,
        isFlowable: false,
        category: 'leave',
        type: 'Permohonan Cuti / Izin',
        title: `${l.typeName} · ${l.user?.name || 'Karyawan'}`,
        applicantName: l.user?.name || 'Karyawan',
        applicantNik: l.user?.employeeId ? `EMP-${l.user.employeeId}` : `USR-${l.userId}`,
        applicantDept: l.user?.dept || 'Head Office',
        applicantPosition: l.user?.position || 'Staff',
        leaveType: l.typeName,
        startDate: l.startDate,
        endDate: l.endDate,
        durationText: `${l.days} Hari Kerja`,
        note: l.note || 'Tidak ada catatan',
        attachment: l.attachment || null,
        status: l.status,
        currentStep: currentStepLabel,
        currentLevel,
        totalLevels: steps.length || 1,
        steps,
        payrollImpact,
        payrollTone,
        canApprove,
        createdAt: l.createdAt,
      }
    })

    // 5. Normalisasi tugas lembur PostgreSQL
    const overtimeTasks = overtimes.map((ot) => {
      let canApprove = isHrOrAdmin
      if (!isHrOrAdmin && targetUserId && ot.employee) {
        const empId = currentUser?.employeeId || targetUserId
        if (ot.employee.managerId === empId || ot.employee.approver1Id === empId || ot.employee.approver2Id === empId) {
          canApprove = true
        }
      }

      return {
        id: `overtime-${ot.id}`,
        taskId: ot.id,
        isFlowable: false,
        category: 'overtime',
        type: 'Permohonan Lembur',
        title: `Lembur ${ot.totalHours} Jam (${ot.dayName || 'Hari'}) · ${ot.employee?.name}`,
        applicantName: ot.employee?.name || 'Karyawan',
        applicantNik: ot.employee?.nik || `EMP-${ot.empId}`,
        applicantDept: ot.employee?.dept || ot.employee?.location || 'Operasional',
        applicantPosition: ot.employee?.position || 'Staff',
        leaveType: 'Lembur',
        startDate: ot.date,
        endDate: ot.date,
        durationText: `${ot.totalHours} Jam (${ot.startTime} - ${ot.endTime})`,
        note: ot.taskNote || 'Tidak ada catatan lembur',
        attachment: null,
        status: ot.status,
        currentStep: ot.status === 'Approved' ? 'Selesai (Disetujui)' : 'Persetujuan Atasan',
        currentLevel: 1,
        totalLevels: 1,
        steps: [
          {
            level: 1,
            label: 'Atasan Langsung',
            status: ot.status,
            approverId: ot.approvedById,
            actedAt: ot.updatedAt,
          },
        ],
        payrollImpact: `Akan menambah Uang Lembur (+Rp ${ot.totalFee.toLocaleString('id-ID')}) di HO Calculator`,
        payrollTone: 'emerald',
        canApprove,
        createdAt: ot.createdAt,
      }
    })

    // Gabungkan seluruh pengajuan
    const allLeaveTasks = [...flowableTasks, ...leaveTasks]

    let combinedTasks = []
    if (categoryParam === 'leave') {
      combinedTasks = allLeaveTasks
    } else if (categoryParam === 'overtime') {
      combinedTasks = overtimeTasks
    } else {
      combinedTasks = [...allLeaveTasks, ...overtimeTasks]
    }

    // Urutkan tugas terbaru di atas
    combinedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Hitung ringkasan statistik
    const stats = {
      totalPending: combinedTasks.filter((t) => t.status === 'Pending').length,
      pendingLeaves: allLeaveTasks.filter((t) => t.status === 'Pending').length,
      pendingOvertimes: overtimeTasks.filter((t) => t.status === 'Pending').length,
      completedTotal: combinedTasks.filter((t) => t.status === 'Approved' || t.status === 'Rejected').length,
    }

    return Response.json({
      success: true,
      stats,
      data: combinedTasks,
    })
  } catch (error) {
    console.error('[API /api/workflow/tasks GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
