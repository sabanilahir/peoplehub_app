import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { title: 'asc' }
    })
    return NextResponse.json(courses)
  } catch (error) {
    console.error('Learning fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const courses = await request.json()
    
    for (const c of courses) {
      await prisma.course.create({
        data: {
          id: c.id,
          title: c.title,
          description: c.description || '',
          category: c.category || '',
          duration: c.duration || 0,
          level: c.level || 'beginner',
          status: c.status || 'active'
        }
      })
    }
    
    return NextResponse.json({ success: true, count: courses.length })
  } catch (error) {
    console.error('Learning sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}