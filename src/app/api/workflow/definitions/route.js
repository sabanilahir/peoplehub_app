import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const definitions = await prisma.workflowDefinition.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: definitions
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, key, xml, description, forms } = body

    if (!name || !xml) {
      return NextResponse.json(
        { success: false, error: 'name and xml are required' },
        { status: 400 }
      )
    }

    // Generate key from name if not provided
    const workflowKey = key || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Check if key already exists
    const existing = await prisma.workflowDefinition.findFirst({
      where: { key: workflowKey }
    })

    let definition
    if (existing) {
      definition = await prisma.workflowDefinition.update({
        where: { id: existing.id },
        data: {
          name,
          xml,
          forms: forms !== undefined ? forms : existing.forms,
          description: description !== undefined ? description : existing.description,
          updatedAt: new Date(),
        }
      })
    } else {
      definition = await prisma.workflowDefinition.create({
        data: {
          name,
          key: workflowKey,
          xml,
          forms: forms || null,
          description: description || '',
          active: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: definition,
      message: existing ? 'Workflow definition updated' : 'Workflow definition created'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
