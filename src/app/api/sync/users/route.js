import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const users = await request.json()
    
    // Clear existing users
    await prisma.user.deleteMany()
    
    // Insert new users
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          password: user.password,
          name: user.name,
          role: user.role,
          dept: user.dept || '',
          position: user.position || '',
          email: user.email || '',
          employeeId: user.employeeId,
          salary: user.salary || 0,
          active: user.active !== false
        }
      })
    }
    
    return NextResponse.json({ success: true, count: users.length })
  } catch (error) {
    console.error('Users sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}