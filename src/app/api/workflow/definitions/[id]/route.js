import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request, { params }) {
  try {
    const { id } = params

    const definition = await prisma.workflowDefinition.findUnique({
      where: { id: parseInt(id) }
    })

    if (!definition) {
      return NextResponse.json(
        { success: false, error: 'Workflow definition not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: definition
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, xml, description, active, forms } = body

    const definition = await prisma.workflowDefinition.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(xml && { xml }),
        ...(forms !== undefined && { forms }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      data: definition,
      message: 'Workflow definition updated'
    })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Workflow definition not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    await prisma.workflowDefinition.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({
      success: true,
      message: 'Workflow definition deleted'
    })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Workflow definition not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
