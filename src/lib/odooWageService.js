// src/lib/odooWageService.js
import { prisma } from './prisma.js'

export const DEFAULT_LOCATION_RULES = {
  ho: {
    locationName: 'Head Office (HO)',
    enableTransport: true,
    enableNonPermanent: true,
    enableKpi: true,
    transportPercent: 15,
    nonPermanentPercent: 10,
    kpiPercent: 10,
  },
  sales: {
    locationName: 'Area Sales (Others)',
    enableTransport: true,
    enableNonPermanent: true,
    enableKpi: true,
    transportPercent: 15,
    nonPermanentPercent: 10,
    kpiPercent: 10,
  },
  gudang: {
    locationName: 'Gudang (Warehouse)',
    enableTransport: true,
    enableNonPermanent: true,
    enableKpi: true,
    transportPercent: 15,
    nonPermanentPercent: 10,
    kpiPercent: 10,
  },
  livestream: {
    locationName: 'Livestream (Manhattan)',
    enableTransport: true,
    enableNonPermanent: true,
    enableKpi: true,
    transportPercent: 15,
    nonPermanentPercent: 10,
    kpiPercent: 10,
  },
}

export const DEFAULT_SALARY_BREAKDOWN_CONFIG = {
  basicPercent: 75,
  transportPercent: 15,
  nonPermanentPercent: 10,
  kpiPercent: 10,
  roundingStep: 1, // Default: perhitungan riil eksak tanpa pembulatan kelipatan (Rp 1)
  locationRules: DEFAULT_LOCATION_RULES,
}

const CONFIG_KEY = 'payroll_salary_breakdown_config'
const OVERRIDES_KEY = 'employee_allowance_overrides'

/**
 * Mengambil konfigurasi persentase pemecahan gaji, aturan pembulatan, & aturan per lokasi kerja
 */
export async function getSalaryBreakdownConfig() {
  try {
    const row = await prisma.appState.findUnique({
      where: { key: CONFIG_KEY },
    })
    if (row && row.value) {
      const parsed = JSON.parse(row.value)
      if (
        typeof parsed.basicPercent === 'number' &&
        typeof parsed.transportPercent === 'number' &&
        typeof parsed.kpiPercent === 'number'
      ) {
        return {
          ...DEFAULT_SALARY_BREAKDOWN_CONFIG,
          ...parsed,
          roundingStep: Number(parsed.roundingStep) || DEFAULT_SALARY_BREAKDOWN_CONFIG.roundingStep,
          locationRules: {
            ...DEFAULT_LOCATION_RULES,
            ...(parsed.locationRules || {}),
          },
        }
      }
    }
  } catch (err) {
    console.warn('[Salary Breakdown] Failed to read config from appState, using defaults:', err.message)
  }
  return { ...DEFAULT_SALARY_BREAKDOWN_CONFIG }
}

/**
 * Menyimpan konfigurasi persentase pemecahan gaji baru & aturan pembulatan / lokasi kerja
 */
export async function saveSalaryBreakdownConfig(config) {
  const current = await getSalaryBreakdownConfig()

  const basic = Number(config.basicPercent) || current.basicPercent || 75
  const transport = Number(config.transportPercent) || current.transportPercent || 15
  const nonPermanent = Number(config.nonPermanentPercent ?? config.kpiPercent) || current.nonPermanentPercent || current.kpiPercent || 10
  const roundingStep = Number(config.roundingStep) || current.roundingStep || 1
  const locationRules = config.locationRules || current.locationRules || DEFAULT_LOCATION_RULES

  const total = Math.round((basic + transport + nonPermanent) * 100) / 100
  if (total !== 100) {
    throw new Error(`Total persentase harus tepat 100% (saat ini ${total}%: Basic ${basic}%, Transport ${transport}%, Non Permanent ${nonPermanent}%)`)
  }

  const payload = {
    basicPercent: basic,
    transportPercent: transport,
    nonPermanentPercent: nonPermanent,
    kpiPercent: nonPermanent, // alias
    roundingStep,
    locationRules,
    updatedAt: new Date().toISOString(),
  }

  await prisma.appState.upsert({
    where: { key: CONFIG_KEY },
    update: { value: JSON.stringify(payload) },
    create: { key: CONFIG_KEY, value: JSON.stringify(payload) },
  })

  return payload
}

/**
 * Menyimpan aturan khusus per lokasi kerja (Work Location Rules)
 */
export async function saveLocationRules(locationRules) {
  const current = await getSalaryBreakdownConfig()
  const updatedLocationRules = {
    ...current.locationRules,
    ...locationRules,
  }

  return saveSalaryBreakdownConfig({
    ...current,
    locationRules: updatedLocationRules,
  })
}

/**
 * Mengambil seluruh data override hak tunjangan per karyawan
 * @returns {Promise<Record<string, { enableTransport: boolean, enableKpi: boolean }>>}
 */
export async function getEmployeeAllowanceOverrides() {
  try {
    const row = await prisma.appState.findUnique({
      where: { key: OVERRIDES_KEY },
    })
    if (row && row.value) {
      return JSON.parse(row.value)
    }
  } catch (err) {
    console.warn('[Salary Breakdown] Failed to read overrides:', err.message)
  }
  return {}
}

/**
 * Menyimpan override hak tunjangan untuk satu karyawan tertentu
 */
export async function saveEmployeeAllowanceOverride(empId, { enableTransport, enableKpi }) {
  const overrides = await getEmployeeAllowanceOverrides()
  const idStr = String(empId)

  overrides[idStr] = {
    enableTransport: Boolean(enableTransport),
    enableKpi: Boolean(enableKpi),
    updatedAt: new Date().toISOString(),
  }

  await prisma.appState.upsert({
    where: { key: OVERRIDES_KEY },
    update: { value: JSON.stringify(overrides) },
    create: { key: OVERRIDES_KEY, value: JSON.stringify(overrides) },
  })

  return overrides[idStr]
}

/**
 * Helper fungsi perhitungan nominal (default riil / eksak Rp 1)
 */
export function roundToStep(val, step = 1) {
  if (!step || step <= 1) return Math.round(val)
  return Math.round(val / step) * step
}

/**
 * Menghitung rincian komponen gaji dari Odoo Wage (Basic Salary 75%)
 * Memperhitungkan aturan Work Location & Override Individu Karyawan
 * @param {number} odooWage - Nilai wage dari tab payroll Odoo (Basic Salary)
 * @param {object} config - Konfigurasi persentase, aturan pembulatan & lokasi kerja
 * @param {object} [options] - { locationCode, employeeOverride }
 */
export function calculateSalaryBreakdown(odooWage, config = DEFAULT_SALARY_BREAKDOWN_CONFIG, options = {}) {
  const basic = Math.max(0, Number(odooWage) || 0)
  const basicPercent = Number(config.basicPercent) || DEFAULT_SALARY_BREAKDOWN_CONFIG.basicPercent
  const roundingStep = Number(config.roundingStep) || DEFAULT_SALARY_BREAKDOWN_CONFIG.roundingStep

  const locCode = (options.locationCode || 'ho').toLowerCase()
  const locRule = (config.locationRules && config.locationRules[locCode]) || DEFAULT_LOCATION_RULES[locCode] || {}
  const override = options.employeeOverride || null

  // 1. Tentukan apakah Transport & Non Permanent Allowance Aktif (Hierarki: Override Individu > Aturan Lokasi > Default True)
  let enableTransport = true
  let enableNonPermanent = true

  if (override && typeof override.enableTransport === 'boolean') {
    enableTransport = override.enableTransport
  } else if (typeof locRule.enableTransport === 'boolean') {
    enableTransport = locRule.enableTransport
  }

  const rawOverrideNP = override ? (override.enableNonPermanent ?? override.enableKpi) : undefined
  const rawLocNP = locRule.enableNonPermanent ?? locRule.enableKpi

  if (typeof rawOverrideNP === 'boolean') {
    enableNonPermanent = rawOverrideNP
  } else if (typeof rawLocNP === 'boolean') {
    enableNonPermanent = rawLocNP
  }

  // 2. Persentase Tunjangan (Lokasi Rule atau Global Config)
  const transportPercent = typeof locRule.transportPercent === 'number'
    ? locRule.transportPercent
    : (Number(config.transportPercent) || DEFAULT_SALARY_BREAKDOWN_CONFIG.transportPercent)

  const nonPermanentPercent = typeof (locRule.nonPermanentPercent ?? locRule.kpiPercent) === 'number'
    ? (locRule.nonPermanentPercent ?? locRule.kpiPercent)
    : (Number(config.nonPermanentPercent ?? config.kpiPercent) || DEFAULT_SALARY_BREAKDOWN_CONFIG.nonPermanentPercent)

  if (basic === 0) {
    return {
      basicSalary: 0,
      transportAllowance: 0,
      nonPermanentAllowance: 0,
      kpiAllowance: 0, // alias
      grossSalary: 0,
      enableTransport,
      enableNonPermanent,
      enableKpi: enableNonPermanent, // alias
      isOverridden: !!override,
      percentages: {
        basicPercent,
        transportPercent,
        nonPermanentPercent,
        kpiPercent: nonPermanentPercent,
        roundingStep,
      },
    }
  }

  // 3. Tunjangan dihitung proporsional terhadap Basic Salary jika aktif
  const transportRaw = enableTransport && basicPercent > 0 ? (basic * transportPercent) / basicPercent : 0
  const npRaw = enableNonPermanent && basicPercent > 0 ? (basic * nonPermanentPercent) / basicPercent : 0

  // 4. Terapkan pembulatan ke kelipatan step
  const transportAllowance = enableTransport ? roundToStep(transportRaw, roundingStep) : 0
  const nonPermanentAllowance = enableNonPermanent ? roundToStep(npRaw, roundingStep) : 0

  // 5. Gross Salary adalah penjumlahan pasti Basic + Transport + NPA agar total selalu klop 100%
  const grossSalary = basic + transportAllowance + nonPermanentAllowance

  return {
    basicSalary: basic,
    transportAllowance,
    nonPermanentAllowance,
    kpiAllowance: nonPermanentAllowance, // alias
    grossSalary,
    enableTransport,
    enableNonPermanent,
    enableKpi: enableNonPermanent, // alias
    isOverridden: !!override,
    percentages: {
      basicPercent,
      transportPercent,
      nonPermanentPercent,
      kpiPercent: nonPermanentPercent,
      roundingStep,
    },
  }
}

/**
 * Menghubungkan ke Odoo dan menyinkronkan field Wage dari hr.version ke Employee.salary (sebagai Basic Salary)
 */
export async function syncOdooWages() {
  const s = await prisma.odooSettings.findFirst({
    where: { url: { not: '' } },
    orderBy: { updatedAt: 'desc' },
  })

  if (!s || !s.url || !s.db || !s.user || !s.apiKey) {
    throw new Error('Kredensial Odoo belum dikonfigurasi di Settings > Odoo API.')
  }

  const baseUrl = s.url.replace(/\/$/, '').replace(/\/odoo$/, '')
  const jsonRpcUrl = `${baseUrl}/jsonrpc`

  // 1. Authenticate
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

  const authData = await authRes.json()
  const uid = authData.result
  if (!uid) {
    throw new Error(`Autentikasi Odoo gagal: ${authData.error?.data?.message || authData.error?.message || 'Invalid credentials'}`)
  }

  // 2. Fetch seluruh kontrak dari model hr.version
  const verRes = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          s.db,
          uid,
          s.apiKey,
          'hr.version',
          'search_read',
          [[]],
          { fields: ['id', 'name', 'employee_id', 'wage', 'contract_wage', 'date_start', 'date_end'], limit: 1000 },
        ],
      },
      id: 2,
    }),
  })

  const verData = await verRes.json()
  if (verData.error) {
    throw new Error(`Gagal membaca kontrak hr.version dari Odoo: ${verData.error.data?.message || verData.error.message}`)
  }

  const versions = verData.result || []

  // 3. Ambil seluruh karyawan aktif dari database PeopleHub
  const employees = await prisma.employee.findMany({
    where: { status: 'Active' },
    select: { id: true, name: true, odoo_id: true, salary: true },
  })

  // Petakan versi kontrak berdasarkan Odoo Employee ID
  const versionMap = new Map()
  for (const v of versions) {
    const odooEmpId = Array.isArray(v.employee_id) ? v.employee_id[0] : v.employee_id
    if (odooEmpId) {
      const existing = versionMap.get(String(odooEmpId))
      if (!existing || (Number(v.wage) > 0 && Number(existing.wage || 0) === 0)) {
        versionMap.set(String(odooEmpId), v)
      }
    }
  }

  let updatedCount = 0
  let unchangedCount = 0
  const updatedList = []

  for (const emp of employees) {
    if (!emp.odoo_id) continue
    const contract = versionMap.get(String(emp.odoo_id))
    if (!contract) continue

    const odooWage = Math.round(Number(contract.wage) || 0)
    if (odooWage !== emp.salary) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          salary: odooWage,
          last_sync_at: new Date(),
        },
      })
      updatedCount++
      updatedList.push({
        id: emp.id,
        name: emp.name,
        odoo_id: emp.odoo_id,
        oldWage: emp.salary,
        newWage: odooWage,
      })
    } else {
      unchangedCount++
    }
  }

  return {
    success: true,
    totalVersions: versions.length,
    matchedEmployees: versionMap.size,
    updatedCount,
    unchangedCount,
    updatedList,
  }
}
