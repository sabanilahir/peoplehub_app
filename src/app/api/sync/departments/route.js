import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Departments fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const departments = await request.json()
    
    for (const dept of departments) {
      await prisma.department.create({
        data: {
          id: dept.id,
          businessUnitId: dept.businessUnitId,
          code: dept.code || '',
          name: dept.name,
          status: dept.status || 'Active'
        }
      })
    }
    
    return NextResponse.json({ success: true, count: departments.length })
  } catch (error) {
    console.error('Departments sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}