// src/app/api/payroll/salary-breakdown/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getSalaryBreakdownConfig,
  saveSalaryBreakdownConfig,
  saveLocationRules,
  getEmployeeAllowanceOverrides,
  saveEmployeeAllowanceOverride,
  calculateSalaryBreakdown,
  syncOdooWages,
  DEFAULT_LOCATION_RULES,
} from '@/lib/odooWageService'

export const dynamic = 'force-dynamic'

// GET: Ambil daftar karyawan beserta kalkulasi rincian komponen gaji (Memperhitungkan Aturan Lokasi & Override Individu)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const dept = searchParams.get('dept') || ''
    const location = searchParams.get('location') || ''

    // 1. Ambil konfigurasi persentase, aturan pembulatan, & aturan per lokasi
    const config = await getSalaryBreakdownConfig()

    // 2. Ambil data override hak tunjangan per karyawan
    const overrides = await getEmployeeAllowanceOverrides()

    // 3. Ambil data seluruh karyawan aktif
    const whereClause = { status: 'Active' }
    if (dept && dept !== 'all') {
      whereClause.dept = dept
    }
    if (location && location !== 'all') {
      whereClause.workLocationCode = location
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        nik: true,
        name: true,
        dept: true,
        position: true,
        location: true,
        workLocationCode: true,
        odoo_id: true,
        salary: true,
        last_sync_at: true,
      },
      orderBy: { name: 'asc' },
    })

    // 4. Filter berdasarkan pencarian jika ada
    const filtered = search
      ? employees.filter(
          (e) =>
            e.name.toLowerCase().includes(search) ||
            e.nik.toLowerCase().includes(search) ||
            (e.dept || '').toLowerCase().includes(search) ||
            (e.position || '').toLowerCase().includes(search)
        )
      : employees

    // 5. Hitung rincian komponen gaji per karyawan
    let totalGross = 0
    let totalBasic = 0
    let totalTransport = 0
    let totalNonPermanent = 0
    let totalKpi = 0
    let withWageCount = 0

    const enrichedEmployees = filtered.map((emp) => {
      // emp.salary adalah Odoo Wage (Basic Salary 75%)
      const basicWage = Number(emp.salary) || 0
      const locCode = emp.workLocationCode || 'ho'
      const empOverride = overrides[String(emp.id)] || null

      const breakdown = calculateSalaryBreakdown(basicWage, config, {
        locationCode: locCode,
        employeeOverride: empOverride,
      })

      if (basicWage > 0) {
        withWageCount++
        totalBasic += breakdown.basicSalary
        totalTransport += breakdown.transportAllowance
        totalNonPermanent += breakdown.nonPermanentAllowance
        totalKpi = totalNonPermanent
        totalGross += breakdown.grossSalary
      }

      return {
        id: emp.id,
        nik: emp.nik,
        name: emp.name,
        dept: emp.dept || 'General',
        position: emp.position || 'Staff',
        location: emp.location || 'Head Office',
        workLocationCode: locCode,
        odoo_id: emp.odoo_id ? Number(emp.odoo_id) : null,
        hasOdooWage: basicWage > 0,
        basicSalary: breakdown.basicSalary,
        transportAllowance: breakdown.transportAllowance,
        nonPermanentAllowance: breakdown.nonPermanentAllowance,
        kpiAllowance: breakdown.kpiAllowance,
        grossSalary: breakdown.grossSalary,
        enableTransport: breakdown.enableTransport,
        enableNonPermanent: breakdown.enableNonPermanent,
        enableKpi: breakdown.enableKpi,
        isOverridden: breakdown.isOverridden,
        lastSyncAt: emp.last_sync_at,
      }
    })

    // Ambil daftar unik seluruh departemen & lokasi untuk filter dropdown
    const allDepts = Array.from(new Set(employees.map((e) => e.dept || 'General').filter(Boolean))).sort()

    return NextResponse.json({
      success: true,
      config,
      locationRules: config.locationRules || DEFAULT_LOCATION_RULES,
      overrides,
      stats: {
        totalEmployees: employees.length,
        filteredCount: enrichedEmployees.length,
        withWageCount,
        withoutWageCount: employees.length - withWageCount,
        totalBasic,
        totalTransport,
        totalNonPermanent,
        totalKpi: totalNonPermanent,
        totalGross,
      },
      departments: allDepts,
      data: enrichedEmployees,
    })
  } catch (err) {
    console.error('Error in GET /api/payroll/salary-breakdown:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// POST: Eksekusi Sync Odoo, Update Wage Manual, Update Konfigurasi, atau Update Aturan Tunjangan
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    // Aksi 1: Tarik seluruh data Wage dari Odoo hr.version (sebagai Basic Salary 75%)
    if (action === 'sync_odoo') {
      const result = await syncOdooWages()
      return NextResponse.json({
        success: true,
        message: `Sinkronisasi selesai: ${result.updatedCount} karyawan diperbarui Basic Salary-nya dari Odoo Wage, ${result.unchangedCount} karyawan tetap.`,
        ...result,
      })
    }

    // Aksi 2: Update / Koreksi Basic Salary satu karyawan secara langsung
    if (action === 'update_wage') {
      const { empId, wage, enableTransport, enableNonPermanent, enableKpi } = body
      if (!empId) {
        return NextResponse.json({ success: false, error: 'empId wajib disertakan' }, { status: 400 })
      }
      const newWage = Math.max(0, Math.round(Number(wage) || 0))
      const updated = await prisma.employee.update({
        where: { id: Number(empId) },
        data: {
          salary: newWage,
          last_sync_at: new Date(),
        },
      })

      // Jika ada perubahan hak tunjangan karyawan
      const hasNP = typeof enableNonPermanent === 'boolean' || typeof enableKpi === 'boolean'
      if (typeof enableTransport === 'boolean' || hasNP) {
        await saveEmployeeAllowanceOverride(empId, {
          enableTransport: enableTransport ?? true,
          enableKpi: enableNonPermanent ?? enableKpi ?? true,
        })
      }

      return NextResponse.json({
        success: true,
        message: `Data untuk ${updated.name} berhasil diperbarui (Basic Salary: Rp ${newWage.toLocaleString('id-ID')})`,
        employee: updated,
      })
    }

    // Aksi 3: Simpan override hak tunjangan individu karyawan
    if (action === 'update_employee_allowance') {
      const { empId, enableTransport, enableNonPermanent, enableKpi } = body
      if (!empId) {
        return NextResponse.json({ success: false, error: 'empId wajib disertakan' }, { status: 400 })
      }
      const override = await saveEmployeeAllowanceOverride(empId, {
        enableTransport,
        enableKpi: enableNonPermanent ?? enableKpi,
      })
      return NextResponse.json({
        success: true,
        message: 'Hak tunjangan karyawan berhasil diperbarui.',
        override,
      })
    }

    // Aksi 4: Simpan aturan tunjangan per Lokasi Kerja (Work Location Rules)
    if (action === 'update_location_rules') {
      const { locationRules } = body
      if (!locationRules || typeof locationRules !== 'object') {
        return NextResponse.json({ success: false, error: 'locationRules wajib disertakan' }, { status: 400 })
      }
      const updatedConfig = await saveLocationRules(locationRules)
      return NextResponse.json({
        success: true,
        message: 'Aturan tunjangan per Lokasi Kerja berhasil disimpan.',
        locationRules: updatedConfig.locationRules,
      })
    }

    // Aksi 5: Simpan konfigurasi persentase global & aturan pembulatan
    if (action === 'update_config') {
      const { basicPercent, transportPercent, nonPermanentPercent, kpiPercent, roundingStep, locationRules } = body
      const newConfig = await saveSalaryBreakdownConfig({
        basicPercent,
        transportPercent,
        nonPermanentPercent: nonPermanentPercent ?? kpiPercent,
        kpiPercent: nonPermanentPercent ?? kpiPercent,
        roundingStep,
        locationRules,
      })
      return NextResponse.json({
        success: true,
        message: `Konfigurasi berhasil disimpan: Basic ${newConfig.basicPercent}%, Transport ${newConfig.transportPercent}%, Non Permanent Allowance ${newConfig.nonPermanentPercent}% (Pembulatan: Rp ${newConfig.roundingStep.toLocaleString('id-ID')})`,
        config: newConfig,
      })
    }

    return NextResponse.json({ success: false, error: `Aksi tidak dikenal: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('Error in POST /api/payroll/salary-breakdown:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
