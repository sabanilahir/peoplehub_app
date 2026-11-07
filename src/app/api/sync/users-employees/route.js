'use client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const body = await request.json()
    const { users, employees } = body
    
    const results = { users: [], employees: [] }
    
    // Sync Users
    if (users?.length > 0) {
      for (const user of users) {
        await prisma.user.upsert({
          where: { username: user.username },
          update: user,
          create: user
        })
        results.users.push(user.username)
      }
    }
    
    // Sync Employees
    if (employees?.length > 0) {
      for (const emp of employees) {
        await prisma.employee.upsert({
          where: { nik: emp.nik },
          update: emp,
          create: emp
        })
        results.employees.push(emp.nik)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Users & Employees synced',
      results 
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}