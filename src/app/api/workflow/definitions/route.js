import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  OVERTIME_REQUEST_BPMN_XML,
  DEFAULT_OVERTIME_FORMS,
} from '@/lib/flowable/definitions/overtimeRequestBpmn'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Ensure default overtime process definition is registered
    const overtimeExists = await prisma.workflowDefinition.findFirst({
      where: { key: 'overtime-request-process' },
    })

    if (!overtimeExists) {
      await prisma.workflowDefinition.create({
        data: {
          name: 'Persetujuan Lembur Karyawan',
          key: 'overtime-request-process',
          xml: OVERTIME_REQUEST_BPMN_XML,
          forms: DEFAULT_OVERTIME_FORMS,
          description: 'Alur persetujuan lembur karyawan oleh Atasan Langsung (MSS) dan Verifikasi HR Payroll (HO Calculator & Odoo).',
          active: true,
        },
      })
    }

    const definitions = await prisma.workflowDefinition.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: definitions,
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
