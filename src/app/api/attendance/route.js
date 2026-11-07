// src/app/api/attendance/route.js
import { prisma } from '@/lib/prisma'
import { calculateAttendancePenalty } from '@/lib/attendanceCalculator'

export const dynamic = 'force-dynamic'

const dbDown = (err) => new Response(JSON.stringify({ error: 'db_unavailable', details: err?.message }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// GET: ambil semua attendance records (bisa filter by empId, startDate, endDate, limit via query param)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const rawEmpId = searchParams.get('empId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const rawLimit = searchParams.get('limit')
    let empId = rawEmpId ? Number(rawEmpId) : undefined
    const take = rawLimit ? Number(rawLimit) : (empId ? 180 : 5000)

    let whereClause = {}
    if (empId) {
      // Periksa apakah empId adalah User.id yang memiliki employeeId terpisah
      const user = await prisma.user.findUnique({
        where: { id: empId },
        select: { employeeId: true },
      })

      if (user?.employeeId && user.employeeId !== empId) {
        whereClause.OR = [
          { empId: empId },
          { empId: user.employeeId },
        ]
      } else {
        whereClause.empId = empId
      }
    }

    if (startDate || endDate) {
      whereClause.date = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      }
    }

    const records = await prisma.attendance.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        employee: {
          select: { name: true, location: true, dept: true },
        },
      },
      orderBy: { date: 'desc' },
      take,
    })
    return Response.json(records)
  } catch (err) {
    console.error('Error in GET /api/attendance:', err)
    return dbDown(err)
  }
}

// POST: buat record baru (clock in)
export async function POST(req) {
  try {
    const body = await req.json()
    let empId = Number(body.empId)

    if (!empId || isNaN(empId)) {
      return Response.json({ error: 'Valid empId is required' }, { status: 400 })
    }

    // 1. Cek apakah employee dengan id ini ada
    let employee = await prisma.employee.findUnique({
      where: { id: empId },
      select: { id: true, name: true, location: true, dept: true, workLocationCode: true },
    })

    // 2. Jika tidak ada, cek apakah ini User.id yang me-referensikan Employee.id lain
    if (!employee) {
      const user = await prisma.user.findUnique({
        where: { id: empId },
        select: { id: true, name: true, dept: true, employeeId: true },
      })

      if (user?.employeeId) {
        const linkedEmp = await prisma.employee.findUnique({
          where: { id: user.employeeId },
          select: { id: true, name: true, location: true, dept: true, workLocationCode: true },
        })
        if (linkedEmp) {
          empId = user.employeeId
          employee = linkedEmp
        }
      }

      // 3. Jika tetap belum ada di Employee, buat fallback Employee agar FK constraint tidak fail
      if (!employee) {
        employee = await prisma.employee.create({
          data: {
            id: empId,
            nik: `EMP${empId}`,
            name: user?.name || `Employee #${empId}`,
            dept: user?.dept || 'General',
            location: 'HO',
            status: 'Active',
          },
        })
      }
    }

    let status = body.status || 'Present'
    let lateMinutes = Number(body.lateMinutes) || 0
    let penaltyAmount = Number(body.penaltyAmount) || 0
    let note = body.note ?? null

    // Jika ada checkIn baru, hitung denda & keterlambatan otomatis sesuai aturan lokasi
    if (body.checkIn) {
      const calc = await calculateAttendancePenalty({
        clockInTime: body.checkIn,
        date: body.date,
        locationCode: employee?.workLocationCode || null,
        locationName: employee?.location || 'HO',
        deptName: employee?.dept || '',
      })
      status = calc.status
      lateMinutes = calc.lateMinutes
      penaltyAmount = calc.penaltyAmount
      if (calc.penaltyLabel) {
        note = calc.penaltyLabel
      }
    }

    // upsert: kalau sudah ada record hari ini, update — jangan buat duplikat
    const record = await prisma.attendance.upsert({
      where: {
        empId_date: {
          empId,
          date: String(body.date),
        },
      },
      create: {
        empId,
        date: String(body.date),
        checkIn: body.checkIn ?? null,
        checkOut: body.checkOut ?? null,
        status,
        lateMinutes,
        penaltyAmount,
        note: note,
      },
      update: {
        checkIn: body.checkIn ?? undefined,
        checkOut: body.checkOut ?? undefined,
        status: body.checkIn ? status : (body.status ?? undefined),
        lateMinutes: body.checkIn ? lateMinutes : undefined,
        penaltyAmount: body.checkIn ? penaltyAmount : undefined,
        note: note ?? undefined,
      },
    })
    return Response.json(record, { status: 201 })
  } catch (error) {
    console.error('Error in attendance POST:', error)
    return dbDown(error)
  }
}
