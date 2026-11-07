import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Shift fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const shifts = await request.json()
    
    for (const s of shifts) {
      await prisma.shift.create({
        data: {
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          breakDuration: s.breakDuration || 0,
          status: s.status || 'active'
        }
      })
    }
    
    return NextResponse.json({ success: true, count: shifts.length })
  } catch (error) {
    console.error('Shift sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}