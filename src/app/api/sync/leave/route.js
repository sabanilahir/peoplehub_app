import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const leaves = await prisma.leave.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(leaves)
  } catch (error) {
    console.error('Leave fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const leaves = await request.json()
    
    for (const leave of leaves) {
      await prisma.leave.create({
        data: {
          id: leave.id,
          employeeId: leave.employeeId,
          type: leave.type,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: leave.days || 1,
          reason: leave.reason || '',
          status: leave.status || 'pending',
          approvedBy: leave.approvedBy,
          approvedAt: leave.approvedAt,
          notes: leave.notes || ''
        }
      })
    }
    
    return NextResponse.json({ success: true, count: leaves.length })
  } catch (error) {
    console.error('Leave sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}