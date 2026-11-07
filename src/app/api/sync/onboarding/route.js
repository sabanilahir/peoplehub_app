import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const onboarding = await prisma.onboarding.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(onboarding)
  } catch (error) {
    console.error('Onboarding fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const onboarding = await request.json()
    
    for (const o of onboarding) {
      await prisma.onboarding.create({
        data: {
          id: o.id,
          employeeId: o.employeeId,
          templateId: o.templateId,
          status: o.status || 'pending',
          startDate: o.startDate,
          endDate: o.endDate,
          progress: o.progress || 0,
          checklist: o.checklist || '[]'
        }
      })
    }
    
    return NextResponse.json({ success: true, count: onboarding.length })
  } catch (error) {
    console.error('Onboarding sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}