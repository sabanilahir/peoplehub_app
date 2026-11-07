import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const payroll = await prisma.payroll.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(payroll)
  } catch (error) {
    console.error('Payroll fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const payroll = await request.json()
    
    for (const p of payroll) {
      await prisma.payroll.create({
        data: {
          id: p.id,
          employeeId: p.employeeId,
          period: p.period || '',
          basicSalary: p.basicSalary || 0,
          allowances: p.allowances || 0,
          deductions: p.deductions || 0,
          tax: p.tax || 0,
          netSalary: p.netSalary || 0,
          status: p.status || 'draft'
        }
      })
    }
    
    return NextResponse.json({ success: true, count: payroll.length })
  } catch (error) {
    console.error('Payroll sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}