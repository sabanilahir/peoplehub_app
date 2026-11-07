import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const positions = await prisma.position.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(positions)
  } catch (error) {
    console.error('Positions fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const positions = await request.json()
    
    for (const pos of positions) {
      await prisma.position.create({
        data: {
          id: pos.id,
          departmentId: pos.departmentId,
          jobFamilyId: pos.jobFamilyId,
          gradeId: pos.gradeId,
          code: pos.code || '',
          name: pos.name,
          status: pos.status || 'Active'
        }
      })
    }
    
    return NextResponse.json({ success: true, count: positions.length })
  } catch (error) {
    console.error('Positions sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}