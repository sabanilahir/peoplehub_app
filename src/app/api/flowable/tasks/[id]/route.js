import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getTask, getTaskVariables, completeTask, claimTask } from '@/lib/flowable/client'

const prisma = new PrismaClient()

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
      // Default action is complete
      result = await completeTask(id, variables)
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
