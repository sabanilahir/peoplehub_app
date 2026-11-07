import { NextResponse } from 'next/server'
import {
  startProcess,
  getProcessInstances,
  getHistoricProcessInstances,
} from '@/lib/flowable/client'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const size = searchParams.get('size') || 50
    const finished = searchParams.get('finished')

    let flowableData = []
    try {
      // Fetch running or historic processes from Flowable Engine
      const result =
        finished === 'true'
          ? await getHistoricProcessInstances({ size })
          : await getProcessInstances({ size })

      if (result.success && result.data) {
        flowableData = result.data.data || (Array.isArray(result.data) ? result.data : [])
      }
    } catch (err) {
      console.warn('Flowable get processes error:', err.message)
    }

    // Also fetch from local database ProcessInstance
    let localData = []
    try {
      const instances = await prisma.processInstance.findMany({
        take: Number(size),
        orderBy: { startedAt: 'desc' },
        include: { definition: true, tasks: true },
      })
      localData = instances.map((inst) => ({
        id: String(inst.id),
        processDefinitionId: String(inst.definitionId),
        processDefinitionKey: inst.definition?.key || 'process',
        processDefinitionName: inst.definition?.name || inst.definition?.key || 'Process',
        status: inst.status,
        startTime: inst.startedAt ? new Date(inst.startedAt).toISOString() : null,
        endTime: inst.completedAt ? new Date(inst.completedAt).toISOString() : null,
        variables: inst.variables,
      }))
    } catch (dbErr) {
      console.warn('DB get processes error:', dbErr.message)
    }

    const allProcesses = flowableData.length > 0 ? flowableData : localData

    return NextResponse.json({
      success: true,
      data: {
        data: allProcesses,
        total: allProcesses.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { processDefinitionKey, variables = [], initiatorId = 1, ...rest } = body

    if (!processDefinitionKey) {
      return NextResponse.json(
        { error: 'processDefinitionKey is required' },
        { status: 400 }
      )
    }

    const result = await startProcess(processDefinitionKey, variables)

    // Save instance to local database
    let localInstance = null
    try {
      const definition = await prisma.workflowDefinition.findFirst({
        where: { key: processDefinitionKey },
      })
      if (definition) {
        localInstance = await prisma.processInstance.create({
          data: {
            definitionId: definition.id,
            flowableId: result.data?.id || null,
            status: 'active',
            initiatorId: Number(initiatorId) || 1,
            variables: variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {}),
          },
        })
      }
    } catch (dbErr) {
      console.warn('Failed to save instance in local DB:', dbErr.message)
    }

    if (!result.success) {
      // If Flowable is offline but local instance was recorded
      if (localInstance) {
        return NextResponse.json({
          success: true,
          data: localInstance,
          message: 'Process started in offline/local fallback mode',
        })
      }
      return NextResponse.json(
        { error: 'Failed to start process', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      localInstance,
      message: 'Process started successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
