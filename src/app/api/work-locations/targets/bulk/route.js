// src/app/api/work-locations/targets/bulk/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST: Bulk Import / Upsert Titik Lokasi Distributor Area Sales
 * Body: {
 *   targets: Array<TargetRow>,
 *   mode: 'upsert' | 'insert_only' | 'replace_all'
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { targets = [], mode = 'upsert' } = body

    if (!Array.isArray(targets) || targets.length === 0) {
      return Response.json(
        { success: false, error: 'Daftar data target lokasi kosong atau tidak valid' },
        { status: 400 }
      )
    }

    // 1. Ambil seluruh master karyawan untuk mencocokkan nama sales secara cerdas
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, location: true, dept: true },
    })

    // Buat map pencocokan nama (case-insensitive & trim)
    const empByName = new Map()
    employees.forEach((emp) => {
      if (emp?.name) {
        empByName.set(emp.name.trim().toLowerCase(), emp)
      }
    })

    // 2. Ambil seluruh target distributor yang ada saat ini
    const existingTargets = await prisma.workLocationTarget.findMany({
      where: { type: 'sales_distributor' },
    })

    const existingByCode = new Map()
    const existingByPair = new Map()

    existingTargets.forEach((t) => {
      if (t.code) existingByCode.set(t.code.trim().toUpperCase(), t)
      const pairKey = `${t.employeeName || ''}___${t.distributorName || t.name}`.trim().toLowerCase()
      existingByPair.set(pairKey, t)
    })

    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors = []

    // 3. Jika mode 'replace_all', hapus seluruh titik sales distributor yang lama
    if (mode === 'replace_all') {
      await prisma.workLocationTarget.deleteMany({
        where: { type: 'sales_distributor' },
      })
      existingByCode.clear()
      existingByPair.clear()
    }

    // 4. Proses baris per baris di dalam transaksi prisma
    await prisma.$transaction(
      async (tx) => {
        let currentSeq = existingTargets.length + 1

        for (let i = 0; i < targets.length; i++) {
          const row = targets[i]
          const rowNum = i + 1

          const rawName = String(row.name || row.distributorName || '').trim()
          const rawDistributor = String(row.distributorName || row.name || '').trim()
          const rawEmployeeName = String(row.employeeName || '').trim()
          const rawAddress = String(row.address || '').trim()
          const rawCity = row.city ? String(row.city).trim() : null
          const rawProvince = row.province ? String(row.province).trim() : null

          const latNum = parseFloat(String(row.latitude).replace(',', '.'))
          const lngNum = parseFloat(String(row.longitude).replace(',', '.'))

          if (!rawDistributor && !rawName) {
            errors.push(`Baris ${rowNum}: Nama distributor/lokasi kosong`)
            skippedCount++
            continue
          }

          if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
            errors.push(`Baris ${rowNum} (${rawDistributor}): Koordinat Latitude/Longitude tidak valid`)
            skippedCount++
            continue
          }

          // Pencocokan Employee ID
          let matchedEmp = null
          if (row.employeeId) {
            matchedEmp = employees.find((e) => String(e.id) === String(row.employeeId))
          }
          if (!matchedEmp && rawEmployeeName) {
            matchedEmp = empByName.get(rawEmployeeName.toLowerCase()) || null
          }

          const finalEmployeeId = matchedEmp ? matchedEmp.id : (row.employeeId ? Number(row.employeeId) : null)
          const finalEmployeeName = matchedEmp ? matchedEmp.name : (rawEmployeeName || null)

          // Cek apakah target sudah ada
          const rowCode = row.code ? String(row.code).trim().toUpperCase() : null
          const pairKey = `${finalEmployeeName || ''}___${rawDistributor || rawName}`.trim().toLowerCase()

          const existingRecord =
            (rowCode && existingByCode.get(rowCode)) ||
            existingByPair.get(pairKey) ||
            null

          const targetData = {
            name: rawName || rawDistributor,
            distributorName: rawDistributor || rawName,
            type: 'sales_distributor',
            employeeId: finalEmployeeId,
            employeeName: finalEmployeeName,
            address: rawAddress,
            city: rawCity,
            province: rawProvince,
            latitude: latNum,
            longitude: lngNum,
            radiusMeters: Number(row.radiusMeters) || 300,
            active: row.active !== undefined ? Boolean(row.active) : true,
            notes: row.notes ? String(row.notes).trim() : null,
          }

          if (existingRecord && mode === 'upsert') {
            // Update
            await tx.workLocationTarget.update({
              where: { id: existingRecord.id },
              data: targetData,
            })
            updatedCount++
          } else if (existingRecord && mode === 'insert_only') {
            skippedCount++
          } else {
            // Insert baru
            const generatedCode = rowCode || `DIST-${String(currentSeq++).padStart(2, '0')}`
            await tx.workLocationTarget.create({
              data: {
                code: generatedCode,
                ...targetData,
              },
            })
            createdCount++
          }
        }
      },
      {
        timeout: 30000,
      }
    )

    return Response.json({
      success: true,
      total: targets.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
      message: `Berhasil memproses ${targets.length} data: ${createdCount} ditambah, ${updatedCount} diperbarui, ${skippedCount} dilewati.`,
    })
  } catch (error) {
    console.error('Error in bulk targets import:', error)
    return Response.json(
      { success: false, error: error.message || 'Gagal memproses upload massal' },
      { status: 500 }
    )
  }
}
