import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTask, getTaskVariables, completeTask, claimTask } from '@/lib/flowable/client'

export const dynamic = 'force-dynamic'

export async function GET(request, props) {
  try {
    const params = await props.params
    const { id } = params
    const result = await getTask(id)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Task not found', details: result.error },
        { status: 404 }
      )
    }

    const varsResult = await getTaskVariables(id)

    // Look up form schema from WorkflowDefinition if available
    let formSchema = null
    try {
      const processKey = result.data.processDefinitionId
        ? result.data.processDefinitionId.split(':')[0]
        : null

      if (processKey) {
        const wfDef = await prisma.workflowDefinition.findFirst({
          where: { key: processKey },
        })
        if (wfDef?.forms) {
          const forms = typeof wfDef.forms === 'string' ? JSON.parse(wfDef.forms) : wfDef.forms
          formSchema =
            forms[result.data.taskDefinitionKey] ||
            forms[result.data.formKey] ||
            forms[`${result.data.taskDefinitionKey}-form`] ||
            null
        }
      }
    } catch (err) {
      console.error('Failed to resolve workflow form schema:', err)
    }

    const taskData = {
      ...result.data,
      variables: varsResult.success ? varsResult.data : [],
      formSchema,
    }

    return NextResponse.json({
      success: true,
      data: taskData,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request, props) {
  try {
    const params = await props.params
    const { id } = params
    const body = await request.json()
    const { action, variables = [], assignee } = body

    let result

    if (action === 'claim') {
      if (!assignee) {
        return NextResponse.json(
          { error: 'assignee is required for claim action' },
          { status: 400 }
        )
      }
      result = await claimTask(id, assignee)
    } else if (action === 'complete' || !action) {
      // 1. Ambil detail task dan variabel sebelum complete untuk sinkronisasi DB
      let taskInfo = null
      let taskVariables = []
      try {
        const [tRes, varsRes] = await Promise.all([
          getTask(id),
          getTaskVariables(id),
        ])
        if (tRes.success) taskInfo = tRes.data
        if (varsRes.success) taskVariables = varsRes.data || []
      } catch (e) {
        console.warn('Could not pre-fetch task info:', e.message)
      }

      // 2. Eksekusi complete ke Flowable Engine
      result = await completeTask(id, variables)

      // 3. Jika berhasil, lakukan sinkronisasi otomatis ke tabel PostgreSQL prisma.leave
      if (result.success) {
        const isApproved = variables.find((v) => v.name === 'approved')?.value === true
        const approverName = variables.find((v) => v.name === 'approverName')?.value || 'Approver'
        const approvalNote = variables.find((v) => v.name === 'approvalNote')?.value || (isApproved ? 'Disetujui' : 'Ditolak')

        const varMap = {}
        taskVariables.forEach((v) => {
          varMap[v.name] = v.value
        })
        ;(variables || []).forEach((v) => {
          varMap[v.name] = v.value
        })

        const procInstId = taskInfo?.processInstanceId || varMap.processInstanceId

        // Cek apakah masih ada langkah berikutnya di Flowable
        let hasNextTasks = false
        if (isApproved && procInstId) {
          try {
            const nextTasksRes = await getTasks({ processInstanceId: procInstId })
            if (nextTasksRes.success && Array.isArray(nextTasksRes.data?.data) && nextTasksRes.data.data.length > 0) {
              hasNextTasks = true
            }
          } catch (e) {}
        }

        const taskKey = (taskInfo?.taskDefinitionKey || '').toLowerCase()
        const taskName = (taskInfo?.name || '').toLowerCase()
        const isStep1 = taskKey.includes('approver1') || taskName.includes('approval 1')
        const isStep2 = taskKey.includes('approver2') || taskName.includes('approval 2')
        const isHRStep = taskKey.includes('hrapproval') || taskKey.includes('task_hr') || taskName.includes('hr approval') || taskKey === 'hr'

        let finalLeaveStatus = 'Pending'
        if (!isApproved) {
          finalLeaveStatus = 'Rejected'
        } else if (isHRStep) {
          finalLeaveStatus = 'Approved' // HANYA HR yang mengesahkan menjadi final Approved!
        } else {
          finalLeaveStatus = 'Pending' // Tingkat 1 & Tingkat 2 selesai, status DB tetap Pending menunggu HR
        }

        if (varMap.employeeId || varMap.leaveType || varMap.startDate) {
          try {
            const empId = Number(varMap.employeeId) || 0
            const leaveTypeName = varMap.leaveType || 'Cuti Tahunan'
            const startDate = varMap.startDate || new Date().toISOString().slice(0, 10)
            const endDate = varMap.endDate || startDate
            const days = Number(varMap.days) || 1
            const reason = varMap.reason || varMap.note || 'Pengajuan via Flowable BPMN'

            // Cari jenis cuti yang cocok di DB
            let lt = await prisma.leaveType.findFirst({
              where: { name: { contains: leaveTypeName, mode: 'insensitive' } },
            })
            if (!lt) {
              lt = await prisma.leaveType.findFirst()
            }

            // Cari user di DB
            let user = await prisma.user.findFirst({
              where: {
                OR: [
                  ...(empId ? [{ id: empId }, { employeeId: empId }] : []),
                  ...(varMap.employeeName ? [{ name: { contains: varMap.employeeName, mode: 'insensitive' } }] : []),
                ],
              },
            })

            if (!user && empId) {
              const emp = await prisma.employee.findUnique({ where: { id: empId } })
              if (emp) {
                user = await prisma.user.create({
                  data: {
                    id: emp.id,
                    username: emp.nik || `user_${emp.id}`,
                    password: 'defaultPassword123',
                    name: emp.name,
                    role: 'employee',
                    employeeId: emp.id,
                    dept: emp.dept || '',
                    position: emp.position || '',
                  },
                })
              }
            }

            let existingLeave = null
            if (varMap.leaveId) {
              existingLeave = await prisma.leave.findUnique({
                where: { id: Number(varMap.leaveId) },
              })
            }

            if (!existingLeave && user) {
              existingLeave = await prisma.leave.findFirst({
                where: {
                  userId: user.id,
                  startDate,
                  endDate,
                },
                orderBy: { id: 'desc' },
              })
            }

            const step1Obj = {
              level: 1,
              tier: 'approval_1',
              label: 'Approval 1',
              status: isApproved ? 'Approved' : 'Rejected',
              approverName,
              actedAt: new Date().toISOString(),
              note: approvalNote,
            }

            const step2Obj = {
              level: 2,
              tier: 'approval_2',
              label: 'Approval 2',
              status: isApproved ? 'Approved' : 'Rejected',
              approverName,
              actedAt: new Date().toISOString(),
              note: approvalNote,
            }

            if (existingLeave) {
              const currentSteps = Array.isArray(existingLeave.steps) ? existingLeave.steps : []
              let updatedSteps = currentSteps.length > 0 ? [...currentSteps] : []

              if (updatedSteps.length === 0) {
                // Inisialisasi jika steps sebelumnya kosong
                updatedSteps = [
                  { level: 1, tier: 'approval_1', label: 'Approval 1', status: 'Approved' },
                  { level: 2, tier: 'hr_approval', label: 'HR Approval', status: 'Pending' },
                ]
              }

              if (isStep1) {
                const s1Idx = updatedSteps.findIndex(s => s.tier === 'approval_1' || s.level === 1)
                if (s1Idx >= 0) {
                  updatedSteps[s1Idx] = {
                    ...updatedSteps[s1Idx],
                    status: isApproved ? 'Approved' : 'Rejected',
                    approverName,
                    actedAt: new Date().toISOString(),
                    note: approvalNote,
                  }
                }
                // Langkah berikutnya menjadi Pending
                const nextStepIdx = updatedSteps.findIndex(s => s.level === (updatedSteps[s1Idx]?.level || 1) + 1)
                if (nextStepIdx >= 0 && isApproved) {
                  updatedSteps[nextStepIdx].status = 'Pending'
                }
              } else if (isStep2) {
                const s2Idx = updatedSteps.findIndex(s => s.tier === 'approval_2' || (s.level === 2 && s.tier !== 'hr_approval'))
                if (s2Idx >= 0) {
                  updatedSteps[s2Idx] = {
                    ...updatedSteps[s2Idx],
                    status: isApproved ? 'Approved' : 'Rejected',
                    approverName,
                    actedAt: new Date().toISOString(),
                    note: approvalNote,
                  }
                }
                // Langkah HR menjadi Pending
                const hrIdx = updatedSteps.findIndex(s => s.tier === 'hr_approval' || s.type === 'hr')
                if (hrIdx >= 0 && isApproved) {
                  updatedSteps[hrIdx].status = 'Pending'
                }
              } else if (isHRStep) {
                const hrIdx = updatedSteps.findIndex(s => s.tier === 'hr_approval' || s.type === 'hr')
                if (hrIdx >= 0) {
                  updatedSteps[hrIdx] = {
                    ...updatedSteps[hrIdx],
                    status: isApproved ? 'Approved' : 'Rejected',
                    approverName,
                    actedAt: new Date().toISOString(),
                    note: approvalNote,
                  }
                } else {
                  updatedSteps.push({
                    level: updatedSteps.length + 1,
                    tier: 'hr_approval',
                    label: 'HR Approval',
                    status: isApproved ? 'Approved' : 'Rejected',
                    approverName,
                    actedAt: new Date().toISOString(),
                    note: approvalNote,
                  })
                }
              }

              await prisma.leave.update({
                where: { id: existingLeave.id },
                data: {
                  status: finalLeaveStatus,
                  steps: updatedSteps,
                },
              })
            } else if (user) {
              await prisma.leave.create({
                data: {
                  userId: user.id,
                  typeId: lt?.id || 1,
                  typeName: leaveTypeName,
                  startDate,
                  endDate,
                  days,
                  note: reason,
                  status: finalLeaveStatus,
                  steps: isFinalStep ? [step1Obj, step2Obj] : [step1Obj],
                },
              })
            }
          } catch (syncErr) {
            console.error('[Flowable -> PostgreSQL Sync] Error:', syncErr)
          }
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "claim" or "complete"' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process task action' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Task successfully ${action || 'completed'}`,
      data: result.data,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
