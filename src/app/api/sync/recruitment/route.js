import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const candidates = await prisma.candidate.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(candidates)
  } catch (error) {
    console.error('Recruitment fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const candidates = await request.json()
    
    for (const c of candidates) {
      await prisma.candidate.create({
        data: {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || '',
          position: c.position || '',
          status: c.status || 'new',
          source: c.source || '',
          notes: c.notes || ''
        }
      })
    }
    
    return NextResponse.json({ success: true, count: candidates.length })
  } catch (error) {
    console.error('Recruitment sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}