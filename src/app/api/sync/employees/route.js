import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Employees fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request) {
  try {
    const employees = await request.json()
    
    // Clear existing employees
    await prisma.employee.deleteMany()
    
    // Insert new employees
    for (const emp of employees) {
      await prisma.employee.create({
        data: {
          id: emp.id,
          nik: emp.nik || '',
          name: emp.name,
          status: emp.status || 'Active',
          companyId: emp.companyId,
          divisionId: emp.divisionId,
          businessUnitId: emp.businessUnitId,
          departmentId: emp.departmentId,
          positionId: emp.positionId,
          gradeId: emp.gradeId,
          managerId: emp.managerId,
          employmentType: emp.employmentType || '',
          role: emp.role || 'employee',
          joinDate: emp.joinDate || '',
          endDate: emp.endDate || '',
          gender: emp.gender || '',
          birthPlace: emp.birthPlace || '',
          birthDate: emp.birthDate || '',
          nationality: emp.nationality || '',
          religion: emp.religion || '',
          maritalStatus: emp.maritalStatus || '',
          ktp: emp.ktp || '',
          phone: emp.phone || '',
          email: emp.email || '',
          personalEmail: emp.personalEmail || '',
          address: emp.address || '',
          city: emp.city || '',
          province: emp.province || '',
          country: emp.country || '',
          location: emp.location || '',
          dept: emp.dept || '',
          position: emp.position || '',
          salary: emp.salary || 0
        }
      })
    }
    
    return NextResponse.json({ success: true, count: employees.length })
  } catch (error) {
    console.error('Employees sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}