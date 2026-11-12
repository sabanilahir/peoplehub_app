// src/app/api/work-locations/targets/[id]/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT: Perbarui data target lokasi / distributor
export async function PUT(req, props) {
  try {
    const params = await props.params
    const id = Number(params.id)
    const body = await req.json()

    let empName = body.employeeName !== undefined ? body.employeeName : undefined
    let empIdNum = body.employeeId !== undefined ? (body.employeeId ? Number(body.employeeId) : null) : undefined

    if (empIdNum && empName === undefined) {
      const emp = await prisma.employee.findUnique({
        where: { id: empIdNum },
        select: { name: true },
      })
      if (emp) empName = emp.name
    }

    const updated = await prisma.workLocationTarget.update({
      where: { id },
      data: {
        code: body.code !== undefined ? body.code : undefined,
        name: body.name !== undefined ? body.name.trim() : undefined,
        type: body.type !== undefined ? body.type : undefined,
        employeeId: empIdNum,
        employeeName: empName,
        distributorName: body.distributorName !== undefined ? (body.distributorName ? body.distributorName.trim() : null) : undefined,
        address: body.address !== undefined ? body.address.trim() : undefined,
        city: body.city !== undefined ? body.city : undefined,
        province: body.province !== undefined ? body.province : undefined,
        latitude: body.latitude !== undefined ? parseFloat(body.latitude) : undefined,
        longitude: body.longitude !== undefined ? parseFloat(body.longitude) : undefined,
        radiusMeters: body.radiusMeters !== undefined ? Number(body.radiusMeters) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    })

    return Response.json({ success: true, target: updated })
  } catch (error) {
    console.error('Error updating work location target:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE: Hapus target lokasi
export async function DELETE(req, props) {
  try {
    const params = await props.params
    const id = Number(params.id)
    await prisma.workLocationTarget.delete({
      where: { id },
    })
    return Response.json({ success: true, message: 'Lokasi berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting work location target:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
