'use client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const body = await request.json()
    const { menus, roles, permissions, users, employees } = body
    
    const results = { menus: [], roles: [], permissions: [], users: [], employees: [] }
    
    // Sync Menus
    if (menus?.length > 0) {
      for (const menu of menus) {
        await prisma.menuItem.upsert({
          where: { key: menu.key },
          update: menu,
          create: menu
        })
        results.menus.push(menu.key)
      }
    }
    
    // Sync Roles
    if (roles?.length > 0) {
      for (const role of roles) {
        await prisma.role.upsert({
          where: { name: role.name },
          update: role,
          create: role
        })
        results.roles.push(role.name)
      }
    }
    
    // Sync Permissions
    if (permissions?.length > 0) {
      for (const perm of permissions) {
        await prisma.permission.upsert({
          where: { key: perm.key },
          update: perm,
          create: perm
        })
        results.permissions.push(perm.key)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data synced to database',
      results 
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Sync endpoint ready',
    endpoints: ['POST /api/sync/all - Sync all store data to database']
  })
}