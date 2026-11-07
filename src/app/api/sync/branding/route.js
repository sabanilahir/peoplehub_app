import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const branding = await prisma.branding.findMany()
    return NextResponse.json(branding)
  } catch (error) {
    console.error('Branding fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const branding = await request.json()
    
    // Save or update branding settings
    await prisma.branding.upsert({
      where: { key: branding.key || 'default' },
      update: { value: branding.value },
      create: { key: branding.key || 'default', value: branding.value }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Branding sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}