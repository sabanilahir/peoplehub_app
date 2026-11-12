// src/app/api/work-locations/targets/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: Ambil semua target lokasi (HO & Distributor Sales)
// Jika ada query ?employeeId=..., ambil lokasi yang relevan untuk karyawan tersebut
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const rawEmpId = searchParams.get('employeeId')
    const type = searchParams.get('type')
    const activeOnly = searchParams.get('active') !== 'false'

    let empId = rawEmpId ? Number(rawEmpId) : null

    // Jika empId diberikan, cari data karyawan untuk cek tipe lokasi kerja (HO vs Sales)
    let employee = null
    if (empId) {
      employee = await prisma.employee.findUnique({
        where: { id: empId },
        select: { id: true, name: true, location: true, workLocationCode: true, dept: true },
      })
      if (!employee) {
        // Coba cari jika empId adalah User.id
        const user = await prisma.user.findUnique({
          where: { id: empId },
          select: { employeeId: true },
        })
        if (user?.employeeId) {
          empId = user.employeeId
          employee = await prisma.employee.findUnique({
            where: { id: empId },
            select: { id: true, name: true, location: true, workLocationCode: true, dept: true },
          })
        }
      }
    }

    // Jika filter spesifik untuk karyawan tertentu
    if (empId) {
      const isHO =
        employee?.workLocationCode === 'ho' ||
        String(employee?.location || '').toLowerCase().includes('head office') ||
        String(employee?.dept || '').toLowerCase().includes('head office')

      // Cari target yang di-assign langsung ke employeeId ini
      const assignedTargets = await prisma.workLocationTarget.findMany({
        where: {
          employeeId: empId,
          ...(activeOnly ? { active: true } : {}),
        },
        orderBy: { id: 'asc' },
      })

      // Ambil juga target Head Office (HO)
      const hoTarget = await prisma.workLocationTarget.findFirst({
        where: {
          type: 'head_office',
          ...(activeOnly ? { active: true } : {}),
        },
      })

      let targets = []
      if (assignedTargets.length > 0) {
        targets = [...assignedTargets]
        // Jika karyawan juga punya hak HO, sertakan HO
        if (isHO && hoTarget && !targets.some((t) => t.id === hoTarget.id)) {
          targets.unshift(hoTarget)
        }
      } else if (isHO) {
        // Jika karyawan HO, kembalikan HO target
        targets = hoTarget ? [hoTarget] : []
      } else {
        // Fallback: Jika sales belum di-assign spesifik, kembalikan HO atau daftar target
        targets = hoTarget ? [hoTarget] : []
      }

      return Response.json({
        success: true,
        employee: employee
          ? {
              id: employee.id,
              name: employee.name,
              location: employee.location,
              workLocationCode: employee.workLocationCode,
            }
          : null,
        targets,
      })
    }

    // Ambil seluruh target untuk admin / sysadmin
    const whereClause = {}
    if (type) whereClause.type = type
    if (activeOnly) whereClause.active = true

    const targets = await prisma.workLocationTarget.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        employee: {
          select: { id: true, name: true, location: true, dept: true },
        },
      },
      orderBy: [{ type: 'asc' }, { id: 'asc' }],
    })

    return Response.json({ success: true, targets })
  } catch (error) {
    console.error('Error fetching work location targets:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: Buat target lokasi baru
export async function POST(req) {
  try {
    const body = await req.json()
    const {
      code,
      name,
      type = 'sales_distributor',
      employeeId,
      employeeName,
      distributorName,
      address,
      city,
      province,
      latitude,
      longitude,
      radiusMeters = 300,
      active = true,
      notes,
    } = body

    if (!name || latitude == null || longitude == null) {
      return Response.json(
        { success: false, error: 'Nama lokasi, latitude, dan longitude wajib diisi' },
        { status: 400 }
      )
    }

    let empName = employeeName || null
    let empIdNum = employeeId ? Number(employeeId) : null
    if (empIdNum && !empName) {
      const emp = await prisma.employee.findUnique({
        where: { id: empIdNum },
        select: { name: true },
      })
      if (emp) empName = emp.name
    }

    const created = await prisma.workLocationTarget.create({
      data: {
        code: code || `LOC-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        type,
        employeeId: empIdNum,
        employeeName: empName,
        distributorName: distributorName ? distributorName.trim() : null,
        address: address ? address.trim() : '',
        city: city ? city.trim() : null,
        province: province ? province.trim() : null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: Number(radiusMeters) || 300,
        active: Boolean(active),
        notes: notes ? notes.trim() : null,
      },
    })

    return Response.json({ success: true, target: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating work location target:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
