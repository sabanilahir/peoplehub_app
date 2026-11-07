import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { deployProcess, testConnection } from '@/lib/flowable/client'

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, key, xml, description, forms } = body

    if (!name || !xml) {
      return NextResponse.json(
        { success: false, error: 'Name and BPMN XML are required' },
        { status: 400 }
      )
    }

    const workflowKey = (key || name)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')

    // Check Flowable engine connection
    const conn = await testConnection()
    let flowableDeployment = null
    let deployedToFlowable = false
    let flowableError = null

    if (conn.success) {
      const deployResult = await deployProcess(xml, name, workflowKey)
      if (deployResult.success) {
        flowableDeployment = deployResult.data
        deployedToFlowable = true
      } else {
        flowableError = deployResult.error
      }
    } else {
      flowableError = 'Flowable engine is offline or unreachable at configured URL'
    }

    // Save or update workflow definition in local Prisma database
    const definition = await prisma.workflowDefinition.upsert({
      where: { key: workflowKey },
      update: {
        name,
        xml,
        forms: forms !== undefined ? forms : undefined,
        description: description || '',
        active: true,
      },
      create: {
        name,
        key: workflowKey,
        xml,
        forms: forms || null,
        description: description || '',
        active: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: deployedToFlowable
        ? 'Workflow successfully deployed to local Flowable engine and saved!'
        : `Workflow saved locally (Flowable status: ${flowableError})`,
      data: {
        definition,
        deployedToFlowable,
        flowableDeployment,
        flowableError,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
