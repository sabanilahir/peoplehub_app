// src/app/api/odoo/payroll/disbursement/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCutoffDateRange } from '@/lib/odooPayrollService'

export const dynamic = 'force-dynamic'

const BANK_APP_STATE_KEY = 'hcm-employee-bank-accounts-v1'

/**
 * Helper mengambil data rekening tersimpan dari AppState
 */
async function getStoredBankAccounts() {
  try {
    const row = await prisma.appState.findUnique({
      where: { key: BANK_APP_STATE_KEY },
    })
    if (row?.value) {
      return JSON.parse(row.value)
    }
  } catch (err) {
    // Ignore if DB unreachable
  }
  return {}
}

/**
 * Helper menyimpan data rekening ke AppState
 */
async function saveStoredBankAccounts(bankMap) {
  try {
    await prisma.appState.upsert({
      where: { key: BANK_APP_STATE_KEY },
      create: { key: BANK_APP_STATE_KEY, value: JSON.stringify(bankMap) },
      update: { value: JSON.stringify(bankMap) },
    })
    return true
  } catch (err) {
    return false
  }
}

/**
 * Data simulasi bawaan jika Odoo belum terkoneksi atau sedang offline
 * Sesuai contoh slip gaji nyata Ari Tegar Riawan dan template transfer BCA
 */
function getSimulatedDisbursementData(range) {
  return [
    {
      id: 1,
      odoo_id: 101,
      nik: '3276060411980001',
      name: 'ARI TEGAR RIAWAN',
      email: 'aritegariawan@gmail.com',
      jobPosition: 'Staff',
      dept: 'Brand Marketing',
      location: 'Head Office',
      contractWage: 5000000,
      netSalary: 4786220, // Persis dari slip gaji Odoo user
      odooSlip: {
        id: 501,
        name: 'Salary Slip - ARI TEGAR RIAWAN - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '67543580',
      bankAccountHolder: 'ARI TEGAR RIAWAN',
    },
    {
      id: 2,
      odoo_id: 102,
      nik: '3171012304950002',
      name: 'Sri Ningsih',
      email: 'sri.ningsih@example.com',
      jobPosition: 'Staff',
      dept: 'Finance & Accounting',
      location: 'Head Office',
      contractWage: 4500000,
      netSalary: 4325000,
      odooSlip: {
        id: 502,
        name: 'Salary Slip - Sri Ningsih - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '09865761',
      bankAccountHolder: 'Sri Ningsih',
    },
    {
      id: 3,
      odoo_id: 103,
      nik: '3275021208940003',
      name: 'Ilham Akbar',
      email: 'ilham.akbar@example.com',
      jobPosition: 'Staff',
      dept: 'Information Technology',
      location: 'Head Office',
      contractWage: 6000000,
      netSalary: 5740000,
      odooSlip: {
        id: 503,
        name: 'Salary Slip - Ilham Akbar - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '12345567',
      bankAccountHolder: 'Ilham Akbar',
    },
    {
      id: 4,
      odoo_id: 104,
      nik: '3174092505960004',
      name: 'Septiani Nur',
      email: 'septiani.nur@example.com',
      jobPosition: 'Staff',
      dept: 'Human Resources',
      location: 'Head Office',
      contractWage: 5200000,
      netSalary: 4980000,
      odooSlip: {
        id: 504,
        name: 'Salary Slip - Septiani Nur - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '64612378',
      bankAccountHolder: 'Septiani Nur',
    },
    {
      id: 5,
      odoo_id: 105,
      nik: '3273031809970005',
      name: 'Ridho Putra',
      email: 'ridho.putra@example.com',
      jobPosition: 'Staff',
      dept: 'Operations',
      location: 'Gudang',
      contractWage: 4800000,
      netSalary: 4610000,
      odooSlip: {
        id: 505,
        name: 'Salary Slip - Ridho Putra - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '34345788',
      bankAccountHolder: 'Ridho Putra',
    },
    {
      id: 6,
      odoo_id: 106,
      nik: '3175061403980006',
      name: 'Muhammad Kevin',
      email: 'muhammad.kevin@example.com',
      jobPosition: 'Staff',
      dept: 'Brand Marketing',
      location: 'Head Office',
      contractWage: 5000000,
      netSalary: 4800000,
      odooSlip: {
        id: 506,
        name: 'Salary Slip - Muhammad Kevin - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '09876549',
      bankAccountHolder: 'Muhammad Kevin',
    },
  ]
}

/**
 * GET: Mengambil data setoran transfer bank berdasarkan hasil payslip Odoo
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customDateFrom = searchParams.get('dateFrom')
    const customDateTo = searchParams.get('dateTo')
    const dateRef = searchParams.get('dateRef')

    let range
    if (customDateFrom && customDateTo) {
      range = {
        dateFrom: customDateFrom,
        dateTo: customDateTo,
        label: `${customDateFrom} s/d ${customDateTo}`,
      }
    } else {
      range = getCutoffDateRange(dateRef)
    }

    // Ambil data rekening tersimpan
    const storedBankAccounts = await getStoredBankAccounts()

    // 1. Coba koneksi ke Odoo
    let odooSlips = []
    let odooNetMap = new Map() // odoo_emp_id -> netSalary
    let odooSlipMetaMap = new Map() // odoo_emp_id -> { id, name, state }
    let isConnectedToOdoo = false

    try {
      const s = await prisma.odooSettings.findFirst({
        where: { url: { not: '' } },
        orderBy: { updatedAt: 'desc' },
      })

      if (s?.url && s?.db && s?.user && s?.apiKey) {
        const baseUrl = s.url.replace(/\/$/, '').replace(/\/odoo$/, '')
        const jsonRpcUrl = `${baseUrl}/jsonrpc`

        // Authenticate
        const authRes = await fetch(jsonRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: { service: 'common', method: 'authenticate', args: [s.db, s.user, s.apiKey, {}] },
            id: 1,
          }),
        })

        if (authRes.ok) {
          const authData = await authRes.json()
          const uid = authData.result

          if (uid) {
            // Ambil seluruh hr.payslip yang beririsan dengan periode
            const payslipRes = await fetch(jsonRpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  service: 'object',
                  method: 'execute_kw',
                  args: [
                    s.db, uid, s.apiKey, 'hr.payslip', 'search_read',
                    [[['date_from', '<=', range.dateTo], ['date_to', '>=', range.dateFrom]]],
                    { fields: ['id', 'name', 'employee_id', 'state', 'line_ids'], order: 'id desc' },
                  ],
                },
                id: 2,
              }),
            })

            if (payslipRes.ok) {
              const payslipData = await payslipRes.json()
              odooSlips = payslipData.result || []
              isConnectedToOdoo = true

              const slipIds = odooSlips.map((p) => p.id)

              // Ambil nilai Net Salary dari hr.payslip.line
              if (slipIds.length > 0) {
                const lineRes = await fetch(jsonRpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                      service: 'object',
                      method: 'execute_kw',
                      args: [
                        s.db, uid, s.apiKey, 'hr.payslip.line', 'search_read',
                        [[
                          ['slip_id', 'in', slipIds],
                          ['code', 'in', ['NET', 'NETTO', 'THP', 'Net Salary']],
                        ]],
                        { fields: ['slip_id', 'code', 'name', 'total'] },
                      ],
                    },
                    id: 3,
                  }),
                })

                if (lineRes.ok) {
                  const lineData = await lineRes.json()
                  const netLines = lineData.result || []
                  const slipToNet = new Map()

                  netLines.forEach((l) => {
                    const sId = Array.isArray(l.slip_id) ? l.slip_id[0] : l.slip_id
                    // Ambil nilai total net salary
                    if (!slipToNet.has(sId) || l.code === 'NET') {
                      slipToNet.set(sId, Number(l.total) || 0)
                    }
                  })

                  // Petakan ke employee Odoo
                  odooSlips.forEach((p) => {
                    const empId = Array.isArray(p.employee_id) ? p.employee_id[0] : p.employee_id
                    if (!odooSlipMetaMap.has(empId) || (p.state !== 'cancel')) {
                      odooSlipMetaMap.set(empId, {
                        id: p.id,
                        name: p.name,
                        state: p.state,
                      })
                      const netVal = slipToNet.get(p.id) || 0
                      odooNetMap.set(empId, netVal)
                    }
                  })
                }
              }
            }
          }
        }
      }
    } catch (odooErr) {
      console.warn('[Odoo Disbursement API] Error connecting to Odoo:', odooErr.message)
    }

    // 2. Ambil data karyawan PeopleHub
    let employees = []
    try {
      employees = await prisma.employee.findMany({
        where: { status: 'Active' },
        select: {
          id: true,
          odoo_id: true,
          nik: true,
          name: true,
          dept: true,
          position: true,
          jobPosition: true,
          location: true,
          salary: true,
          email: true,
          personalEmail: true,
        },
        orderBy: { name: 'asc' },
      })
    } catch (dbErr) {
      // If DB unreachable, will fallback
    }

    let items = []

    if (employees.length > 0) {
      items = employees.map((emp) => {
        const odooEmpId = emp.odoo_id ? Number(emp.odoo_id) : null
        const odooSlip = odooEmpId ? odooSlipMetaMap.get(odooEmpId) : null
        const odooNetSalary = odooEmpId && odooNetMap.has(odooEmpId) ? odooNetMap.get(odooEmpId) : null

        // Simpanan rekening di AppState
        const savedBank = storedBankAccounts[String(emp.id)] || {}

        // Fallback default nominal jika belum dihitung di Odoo: gaji bruto
        const finalNet = odooNetSalary !== null ? odooNetSalary : (Number(emp.salary) || 0)

        return {
          id: emp.id,
          odoo_id: emp.odoo_id,
          nik: emp.nik,
          name: emp.name,
          email: emp.email || emp.personalEmail || '',
          jobPosition: emp.jobPosition || emp.position || 'Staff',
          dept: emp.dept || 'Umum',
          location: emp.location || 'Head Office',
          contractWage: Number(emp.salary) || 0,
          netSalary: finalNet,
          odooSlip: odooSlip || null,
          hasOdooSlip: Boolean(odooSlip),
          bankName: savedBank.bankName || 'BCA',
          bankAccountNumber: savedBank.bankAccountNumber || '',
          bankAccountHolder: savedBank.bankAccountHolder || emp.name,
        }
      })
    } else {
      // Gunakan simulasi data riil jika DB/Odoo offline
      const simItems = getSimulatedDisbursementData(range)
      items = simItems.map((s) => {
        const savedBank = storedBankAccounts[String(s.id)] || {}
        return {
          ...s,
          bankName: savedBank.bankName || s.bankName,
          bankAccountNumber: savedBank.bankAccountNumber || s.bankAccountNumber,
          bankAccountHolder: savedBank.bankAccountHolder || s.bankAccountHolder,
        }
      })
    }

    // Hitung statistik
    const totalEmployees = items.length
    const readyItems = items.filter(
      (it) => it.netSalary > 0 && it.bankAccountNumber && String(it.bankAccountNumber).trim().length >= 5
    )
    const missingAccountItems = items.filter(
      (it) => !it.bankAccountNumber || String(it.bankAccountNumber).trim().length < 5
    )
    const totalAmount = items.reduce((sum, it) => sum + (Number(it.netSalary) || 0), 0)

    return NextResponse.json({
      success: true,
      range,
      source: isConnectedToOdoo ? 'odoo_live' : 'fallback_simulation',
      stats: {
        totalEmployees,
        totalAmount,
        readyCount: readyItems.length,
        missingAccountCount: items.length - readyItems.length,
      },
      data: items,
    })
  } catch (err) {
    console.error('[Disbursement API Error]:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memuat data setoran transfer bank' },
      { status: 500 }
    )
  }
}

/**
 * POST: Menyimpan atau memperbarui data rekening bank karyawan (Quick-Edit)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { empId, bankName, bankAccountNumber, bankAccountHolder } = body

    if (!empId) {
      return NextResponse.json({ success: false, error: 'Employee ID wajib disertakan.' }, { status: 400 })
    }

    const currentMap = await getStoredBankAccounts()
    currentMap[String(empId)] = {
      bankName: bankName || 'BCA',
      bankAccountNumber: String(bankAccountNumber || '').replace(/[^0-9]/g, ''),
      bankAccountHolder: bankAccountHolder || '',
      updatedAt: new Date().toISOString(),
    }

    await saveStoredBankAccounts(currentMap)

    return NextResponse.json({
      success: true,
      message: 'Nomor rekening berhasil disimpan.',
      data: currentMap[String(empId)],
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menyimpan nomor rekening.' },
      { status: 500 }
    )
  }
}
