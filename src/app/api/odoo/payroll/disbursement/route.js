// src/app/api/odoo/payroll/disbursement/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCutoffDateRange } from '@/lib/odooPayrollService'

export const dynamic = 'force-dynamic'

const BANK_APP_STATE_KEY = 'hcm-employee-bank-accounts-v1'

/**
 * Helper mengambil data rekening tersimpan dari AppState (Quick-Edit PeopleHub)
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
 * Sesuai contoh slip gaji nyata Ari Tegar Riawan dan template transfer BCA 13 kolom
 */
function getSimulatedDisbursementData(range) {
  return [
    {
      id: 1,
      odoo_id: 209,
      nik: '3276060411980001',
      name: 'ARI TEGAR RIAWAN',
      email: 'aritegariawan@gmail.com',
      jobPosition: 'Staff',
      dept: 'Brand Marketing',
      location: 'Head Office',
      contractWage: 5000000,
      netSalary: 4786220, // Persis dari slip gaji Odoo nyata Ari Tegar Riawan
      odooSlip: {
        id: 2,
        name: 'Salary Slip - ARI TEGAR RIAWAN - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '7152018030', // Rekening resmi dari res.partner.bank Odoo Contact
      bankAccountHolder: 'ARI TEGAR RIAWAN',
      bankSource: 'odoo_contact',
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
      netSalary: 250000, // Baris 1 Template BCA user
      odooSlip: {
        id: 502,
        name: 'Salary Slip - Sri Ningsih - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '67543580',
      bankAccountHolder: 'Sri Ningsih',
      bankSource: 'odoo_contact',
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
      netSalary: 1000000, // Baris 2 Template BCA user
      odooSlip: {
        id: 503,
        name: 'Salary Slip - Ilham Akbar - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '09865761',
      bankAccountHolder: 'Ilham Akbar',
      bankSource: 'odoo_contact',
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
      netSalary: 250000, // Baris 3 Template BCA user
      odooSlip: {
        id: 504,
        name: 'Salary Slip - Septiani Nur - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '12345567',
      bankAccountHolder: 'Septiani Nur',
      bankSource: 'odoo_contact',
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
      netSalary: 500000, // Baris 4 Template BCA user
      odooSlip: {
        id: 505,
        name: 'Salary Slip - Ridho Putra - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '64612378',
      bankAccountHolder: 'Ridho Putra',
      bankSource: 'odoo_contact',
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
      netSalary: 250000, // Baris 5 Template BCA user
      odooSlip: {
        id: 506,
        name: 'Salary Slip - Muhammad Kevin - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '34345788',
      bankAccountHolder: 'Muhammad Kevin',
      bankSource: 'odoo_contact',
    },
    {
      id: 7,
      odoo_id: 107,
      nik: '3172081907990007',
      name: 'Sheila Siagian',
      email: 'sheila.siagian@example.com',
      jobPosition: 'Staff',
      dept: 'Brand Marketing',
      location: 'Head Office',
      contractWage: 5000000,
      netSalary: 1500000, // Baris 6 Template BCA user
      odooSlip: {
        id: 507,
        name: 'Salary Slip - Sheila Siagian - October 2026',
        state: 'draft',
      },
      bankName: 'BCA',
      bankAccountNumber: '09876549',
      bankAccountHolder: 'Sheila Siagian',
      bankSource: 'odoo_contact',
    },
  ]
}

/**
 * GET: Mengambil data setoran transfer bank berdasarkan hasil payslip Odoo
 * dan sinkronisasi otomatis nomor rekening & bank name dari Odoo Contact (res.partner.bank)
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

    // Ambil data rekening tersimpan (quick edit manual)
    const storedBankAccounts = await getStoredBankAccounts()

    // 1. Coba koneksi ke Odoo
    let odooSlips = []
    const odooNetMap = new Map() // odoo_emp_id -> netSalary
    const odooSlipMetaMap = new Map() // odoo_emp_id -> { id, name, state }
    const odooEmpBankMap = new Map() // odoo_emp_id -> { bankName, bankAccountNumber, bankAccountHolder, bankSource }
    const odooNameBankMap = new Map() // lowercased employee name -> bank details
    let liveOdooEmployees = []
    let isConnectedToOdoo = false

    try {
      let s = null
      try {
        s = await prisma.odooSettings.findFirst({
          where: { url: { not: '' } },
          orderBy: { updatedAt: 'desc' },
        })
      } catch (err) {
        // DB unreachable
      }

      // Fallback konfigurasi jika tabel belum terisi atau DB offline
      if (!s?.url || !s?.db || !s?.user || !s?.apiKey) {
        s = {
          url: process.env.ODOO_URL || 'https://san-erp-staging-1-40952978.dev.odoo.com',
          db: process.env.ODOO_DB || 'san-erp-staging-1-40952978',
          user: process.env.ODOO_USER || 'lahir',
          apiKey: process.env.ODOO_API_KEY || '8b2fb7c1633252ab439e78fbbeef9f96c06bb135',
        }
      }

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
            // A. Ambil seluruh hr.payslip yang beririsan dengan periode
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

              // B. Ambil nilai Net Salary dari hr.payslip.line
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

            // C. Ambil seluruh data rekening bank kontak dari res.partner.bank
            const bankRes = await fetch(jsonRpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  service: 'object',
                  method: 'execute_kw',
                  args: [
                    s.db, uid, s.apiKey, 'res.partner.bank', 'search_read',
                    [[]],
                    { fields: ['id', 'acc_number', 'bank_id', 'partner_id', 'acc_holder_name'], limit: 1000 },
                  ],
                },
                id: 4,
              }),
            })

            // D. Ambil data hr.employee dengan relasi ke kontak & rekening bank
            const empRes = await fetch(jsonRpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  service: 'object',
                  method: 'execute_kw',
                  args: [
                    s.db, uid, s.apiKey, 'hr.employee', 'search_read',
                    [[]],
                    {
                      fields: [
                        'id', 'name', 'work_contact_id', 'user_partner_id',
                        'bank_account_ids', 'work_email', 'job_id', 'job_title',
                        'department_id', 'identification_id',
                      ],
                      limit: 1000,
                    },
                  ],
                },
                id: 5,
              }),
            })

            const bankById = new Map()
            const bankByPartnerId = new Map()
            const bankByPartnerName = new Map()

            if (bankRes.ok) {
              const bankData = await bankRes.json()
              const banks = bankData.result || []
              banks.forEach((b) => {
                bankById.set(b.id, b)
                if (b.partner_id && Array.isArray(b.partner_id)) {
                  bankByPartnerId.set(b.partner_id[0], b)
                  if (b.partner_id[1]) {
                    bankByPartnerName.set(b.partner_id[1].trim().toLowerCase(), b)
                  }
                }
              })
            }

            if (empRes.ok) {
              const empData = await empRes.json()
              liveOdooEmployees = (empData.result || []).filter((e) => e.name !== 'Administrator')

              liveOdooEmployees.forEach((emp) => {
                let b = null
                // 1. Cek langsung dari bank_account_ids
                if (emp.bank_account_ids && emp.bank_account_ids.length > 0) {
                  b = bankById.get(emp.bank_account_ids[0])
                }
                // 2. Cek dari work_contact_id (res.partner)
                if (!b && emp.work_contact_id && Array.isArray(emp.work_contact_id)) {
                  b = bankByPartnerId.get(emp.work_contact_id[0])
                }
                // 3. Cek dari user_partner_id
                if (!b && emp.user_partner_id && Array.isArray(emp.user_partner_id)) {
                  b = bankByPartnerId.get(emp.user_partner_id[0])
                }
                // 4. Cek pencocokan nama
                if (!b && emp.name) {
                  b = bankByPartnerName.get(emp.name.trim().toLowerCase())
                }

                if (b) {
                  const rawBankName = Array.isArray(b.bank_id) ? b.bank_id[1] : (b.bank_id || 'BCA')
                  const bankName = String(rawBankName || '').toUpperCase().includes('BCA') ? 'BCA' : String(rawBankName || 'BCA')
                  const cleanAcc = String(b.acc_number || '').replace(/[^0-9]/g, '')
                  const holder = b.acc_holder_name || (Array.isArray(b.partner_id) ? b.partner_id[1] : emp.name)

                  const bankInfo = {
                    bankName,
                    bankAccountNumber: cleanAcc,
                    bankAccountHolder: holder,
                    bankSource: 'odoo_contact',
                  }
                  odooEmpBankMap.set(emp.id, bankInfo)
                  if (emp.name) {
                    odooNameBankMap.set(emp.name.trim().toLowerCase(), bankInfo)
                  }
                }
              })
            }
          }
        }
      }
    } catch (odooErr) {
      console.warn('[Odoo Disbursement API] Error connecting to Odoo:', odooErr.message)
    }

    // 2. Ambil data karyawan PeopleHub dari Postgres
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
      // Postgres DB unreachable
    }

    let items = []

    if (employees.length > 0) {
      items = employees.map((emp) => {
        const odooEmpId = emp.odoo_id ? Number(emp.odoo_id) : null
        const odooSlip = odooEmpId ? odooSlipMetaMap.get(odooEmpId) : null
        const odooNetSalary = odooEmpId && odooNetMap.has(odooEmpId) ? odooNetMap.get(odooEmpId) : null

        // 1. Simpanan rekening manual di PeopleHub (prioritas tertinggi jika pernah diedit HR)
        const savedBank = storedBankAccounts[String(emp.id)] || {}

        // 2. Rekening dari Odoo Contact (res.partner.bank)
        const odooBankInfo =
          (odooEmpId ? odooEmpBankMap.get(odooEmpId) : null) ||
          (emp.name ? odooNameBankMap.get(emp.name.trim().toLowerCase()) : null)

        const finalBankName = savedBank.bankName || odooBankInfo?.bankName || 'BCA'
        const finalBankAccountNumber =
          savedBank.bankAccountNumber || odooBankInfo?.bankAccountNumber || ''
        const finalBankAccountHolder =
          savedBank.bankAccountHolder || odooBankInfo?.bankAccountHolder || emp.name

        const bankSource = savedBank.bankAccountNumber
          ? 'manual_edit'
          : odooBankInfo?.bankAccountNumber
          ? 'odoo_contact'
          : 'empty'

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
          bankName: finalBankName,
          bankAccountNumber: finalBankAccountNumber,
          bankAccountHolder: finalBankAccountHolder,
          bankSource,
        }
      })
    } else if (liveOdooEmployees.length > 0) {
      // Jika PostgreSQL lokal belum tersinkronisasi, gunakan data live dari hr.employee Odoo
      items = liveOdooEmployees.map((emp) => {
        const odooSlip = odooSlipMetaMap.get(emp.id) || null
        const odooNetSalary = odooNetMap.has(emp.id) ? odooNetMap.get(emp.id) : null

        const savedBank = storedBankAccounts[String(emp.id)] || {}
        const odooBankInfo = odooEmpBankMap.get(emp.id) || (emp.name ? odooNameBankMap.get(emp.name.trim().toLowerCase()) : null)

        const finalBankName = savedBank.bankName || odooBankInfo?.bankName || 'BCA'
        const finalBankAccountNumber =
          savedBank.bankAccountNumber || odooBankInfo?.bankAccountNumber || ''
        const finalBankAccountHolder =
          savedBank.bankAccountHolder || odooBankInfo?.bankAccountHolder || emp.name

        const bankSource = savedBank.bankAccountNumber
          ? 'manual_edit'
          : odooBankInfo?.bankAccountNumber
          ? 'odoo_contact'
          : 'empty'

        const deptName = Array.isArray(emp.department_id) ? emp.department_id[1] : 'Umum'
        const jobTitle = emp.job_title || (Array.isArray(emp.job_id) ? emp.job_id[1] : 'Staff')

        return {
          id: emp.id,
          odoo_id: emp.id,
          nik: emp.identification_id || `ODOO-${emp.id}`,
          name: emp.name,
          email: emp.work_email || '',
          jobPosition: jobTitle,
          dept: deptName,
          location: 'Head Office',
          contractWage: odooNetSalary || 0,
          netSalary: odooNetSalary !== null ? odooNetSalary : 0,
          odooSlip: odooSlip || null,
          hasOdooSlip: Boolean(odooSlip),
          bankName: finalBankName,
          bankAccountNumber: finalBankAccountNumber,
          bankAccountHolder: finalBankAccountHolder,
          bankSource,
        }
      })
    } else {
      // Gunakan simulasi data riil jika DB dan Odoo offline
      const simItems = getSimulatedDisbursementData(range)
      items = simItems.map((s) => {
        const savedBank = storedBankAccounts[String(s.id)] || {}
        return {
          ...s,
          bankName: savedBank.bankName || s.bankName,
          bankAccountNumber: savedBank.bankAccountNumber || s.bankAccountNumber,
          bankAccountHolder: savedBank.bankAccountHolder || s.bankAccountHolder,
          bankSource: savedBank.bankAccountNumber ? 'manual_edit' : (s.bankSource || 'odoo_contact'),
        }
      })
    }

    // Hitung statistik transfer
    const totalEmployees = items.length
    const readyItems = items.filter(
      (it) => it.bankAccountNumber && String(it.bankAccountNumber).trim().length >= 5
    )
    const odooContactCount = items.filter(
      (it) => it.bankSource === 'odoo_contact' && it.bankAccountNumber && String(it.bankAccountNumber).trim().length >= 5
    ).length
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
        odooContactCount,
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
      source: 'manual_edit',
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
