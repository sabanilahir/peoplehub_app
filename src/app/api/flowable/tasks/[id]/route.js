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

      const isApproved = variables.find((v) => v.name === 'approved')?.value === true
      const approverName = variables.find((v) => v.name === 'approverName')?.value || 'Approver'
      const approvalNote = variables.find((v) => v.name === 'approvalNote')?.value || (isApproved ? 'Disetujui' : 'Ditolak')

      const varMap = {}
      taskVariables.forEach((v) => { varMap[v.name] = v.value })
      ;(variables || []).forEach((v) => { varMap[v.name] = v.value })

      // Cari leave record di DB
      let existingLeave = null
      if (varMap.leaveId) {
        existingLeave = await prisma.leave.findUnique({
          where: { id: Number(varMap.leaveId) },
        })
      }
      if (!existingLeave && taskInfo?.processInstanceId) {
        existingLeave = await prisma.leave.findFirst({
          where: {
            customData: {
              path: ['flowableProcessInstanceId'],
              equals: taskInfo.processInstanceId,
            },
          },
        })
      }

      const taskKey = (taskInfo?.taskDefinitionKey || '').toLowerCase()
      const taskName = (taskInfo?.name || '').toLowerCase()
      const isHRStep = taskKey.includes('hrapproval') || taskKey.includes('task_hr') || taskName.includes('hr approval') || taskKey === 'hr'

      // Jika ini adalah operational task (Task_Approver) dan disetujui, evaluasi next approver dalam dynamic loop
      if (!isHRStep && isApproved && existingLeave) {
        const matrix = Array.isArray(existingLeave.customData?.flowableMatrix) ? existingLeave.customData.flowableMatrix : []
        const currIdx = Number(existingLeave.customData?.currentMatrixIndex ?? 0)
        const nextIdx = currIdx + 1

        if (nextIdx < matrix.length) {
          const nextApp = matrix[nextIdx]
          variables.push(
            { name: 'hasMoreApprovers', value: true, type: 'boolean' },
            { name: 'currentApproverUsername', value: nextApp.username, type: 'string' },
            { name: 'currentStepLabel', value: nextApp.label, type: 'string' },
            { name: 'stepIndex', value: String(nextIdx), type: 'string' },
          )
        } else {
          variables.push(
            { name: 'hasMoreApprovers', value: false, type: 'boolean' }
          )
        }
      }

      // 2. Eksekusi complete ke Flowable Engine
      result = await completeTask(id, variables)

      // 3. Jika berhasil, lakukan sinkronisasi otomatis ke tabel PostgreSQL prisma.leave
      if (result.success) {
        let finalLeaveStatus = 'Pending'
        if (!isApproved) {
          finalLeaveStatus = 'Rejected'
        } else if (isHRStep) {
          finalLeaveStatus = 'Approved' // HANYA HR yang mengesahkan menjadi final Approved!
        } else {
          finalLeaveStatus = 'Pending' // Level operasional selesai, status DB tetap Pending menunggu HR
        }

        if (existingLeave) {
          const currentSteps = Array.isArray(existingLeave.steps) ? [...existingLeave.steps] : []
          const matrix = Array.isArray(existingLeave.customData?.flowableMatrix) ? existingLeave.customData.flowableMatrix : []
          const currIdx = Number(existingLeave.customData?.currentMatrixIndex ?? 0)
          const nextIdx = currIdx + 1

          if (!isHRStep) {
            // Tandai step aktif sebagai Approved / Rejected
            const activeItem = matrix[currIdx]
            let targetStepIdx = currentSteps.findIndex(s => s.status === 'Pending' && s.tier !== 'hr_approval')
            if (targetStepIdx < 0 && activeItem) {
              targetStepIdx = currentSteps.findIndex(s => s.level === activeItem.level)
            }

            if (targetStepIdx >= 0) {
              currentSteps[targetStepIdx] = {
                ...currentSteps[targetStepIdx],
                status: isApproved ? 'Approved' : 'Rejected',
                approverName: approverName || currentSteps[targetStepIdx].approverName,
                actedAt: new Date().toISOString(),
                note: approvalNote,
              }
            }

            let updatedCustom = { ...(existingLeave.customData || {}) }
            if (isApproved) {
              if (nextIdx < matrix.length) {
                // Aktifkan step berikutnya menjadi Pending
                const nextItem = matrix[nextIdx]
                const nextStepIdx = currentSteps.findIndex(s => s.level === nextItem.level)
                if (nextStepIdx >= 0) {
                  currentSteps[nextStepIdx].status = 'Pending'
                }
                updatedCustom.currentMatrixIndex = nextIdx
              } else {
                // Seluruh level operasional selesai -> HR Step menjadi Pending!
                const hrStepIdx = currentSteps.findIndex(s => s.tier === 'hr_approval' || s.type === 'hr')
                if (hrStepIdx >= 0) {
                  currentSteps[hrStepIdx].status = 'Pending'
                }
              }
            }

            await prisma.leave.update({
              where: { id: existingLeave.id },
              data: {
                status: finalLeaveStatus,
                steps: currentSteps,
                customData: updatedCustom,
              },
            })
          } else {
            // Task HR selesai
            const hrStepIdx = currentSteps.findIndex(s => s.tier === 'hr_approval' || s.type === 'hr')
            if (hrStepIdx >= 0) {
              currentSteps[hrStepIdx] = {
                ...currentSteps[hrStepIdx],
                status: isApproved ? 'Approved' : 'Rejected',
                approverName: approverName || 'HR Department',
                actedAt: new Date().toISOString(),
                note: approvalNote,
              }
            }

            await prisma.leave.update({
              where: { id: existingLeave.id },
              data: {
                status: finalLeaveStatus,
                steps: currentSteps,
              },
            })
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
