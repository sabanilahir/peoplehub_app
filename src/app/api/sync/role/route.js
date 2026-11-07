'use client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const roles = await request.json()
    
    // Clear existing roles
    await prisma.role.deleteMany()
    
    // Insert new roles
    for (const role of roles) {
      await prisma.role.create({
        data: {
          name: role.name,
          label: role.label,
          color: role.color || '#666666',
          permissions: role.permissions || []
        }
      })
    }
    
    return NextResponse.json({ success: true, count: roles.length })
  } catch (error) {
    console.error('Role sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}