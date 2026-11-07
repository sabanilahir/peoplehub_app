import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const attendance = await prisma.attendance.findMany({
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Attendance fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const attendance = await request.json()
    
    for (const att of attendance) {
      await prisma.attendance.create({
        data: {
          id: att.id,
          employeeId: att.employeeId,
          date: att.date,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          status: att.status || 'present',
          notes: att.notes || ''
        }
      })
    }
    
    return NextResponse.json({ success: true, count: attendance.length })
  } catch (error) {
    console.error('Attendance sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}