// src/lib/odooWageService.js
import { prisma } from './prisma.js'

export const RULE_POOL_CACHE_KEY = 'odoo_salary_rule_pool'

/**
 * Mengambil katalog Salary Rules resmi dari Odoo ERP secara dinamis (100% murni tanpa data hardcode)
 * Memfilter aturan dengan kategori Allowance (ALW) dan Deduction (DED) pada Structure ID 6 (atau yang aktif).
 */
export async function fetchOdooSalaryRules({ forceRefresh = false } = {}) {
  // 1. Periksa cache di AppState jika tidak meminta forceRefresh
  if (!forceRefresh) {
    try {
      const cachedRow = await prisma.appState.findUnique({
        where: { key: RULE_POOL_CACHE_KEY },
      })
      if (cachedRow?.value) {
        const parsed = JSON.parse(cachedRow.value)
        // Cache valid selama 1 jam (3600000 ms) jika data ada
        if (Array.isArray(parsed.rules) && parsed.rules.length > 0) {
          const age = Date.now() - (parsed.updatedAt || 0)
          if (age < 3600000) {
            return parsed.rules
          }
        }
      }
    } catch (e) {
      console.warn('Gagal membaca cache rule pool Odoo:', e.message)
    }
  }

  // 2. Ambil kredensial Odoo dari tabel odooSettings
  const s = await prisma.odooSettings.findFirst()
  if (!s || !s.url || !s.db || !s.user || !s.apiKey) {
    // Jika Odoo belum disetting, coba ambil dari cache terakhir (jika ada)
    try {
      const fallbackRow = await prisma.appState.findUnique({
        where: { key: RULE_POOL_CACHE_KEY },
      })
      if (fallbackRow?.value) {
        const parsed = JSON.parse(fallbackRow.value)
        if (Array.isArray(parsed.rules)) return parsed.rules
      }
    } catch {}
    throw new Error('Kredensial Odoo ERP belum dikonfigurasi di Pengaturan Odoo.')
  }

  const baseUrl = s.url.replace(/\/$/, '').replace(/\/odoo$/, '')
  const jsonRpcUrl = `${baseUrl}/jsonrpc`

  // 3. Authenticate JSON-RPC ke Odoo
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
  if (!authRes.ok) {
    throw new Error(`Koneksi HTTP ke Odoo gagal (status ${authRes.status})`)
  }
  const authData = await authRes.json()
  const uid = authData.result
  if (!uid) {
    throw new Error(`Autentikasi Odoo gagal: ${authData.error?.data?.message || authData.error?.message || 'Invalid credentials'}`)
  }

  // 4. Cari kategori Allowance (ALW) & Deduction (DED)
  const catRes = await fetch(jsonRpcUrl, {
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
          'hr.salary.rule.category',
          'search_read',
          [[['code', 'in', ['ALW', 'DED']]]],
          { fields: ['id', 'name', 'code'] },
        ],
      },
      id: 2,
    }),
  })
  const targetCategories = (await catRes.json()).result || []
  let catIds = targetCategories.map((c) => c.id)

  if (catIds.length === 0) {
    // Fallback search by category name
    const catByNameRes = await fetch(jsonRpcUrl, {
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
            'hr.salary.rule.category',
            'search_read',
            [[['name', 'in', ['Allowance', 'Deduction']]]],
            { fields: ['id', 'name', 'code'] },
          ],
        },
        id: 21,
      }),
    })
    const catsByName = (await catByNameRes.json()).result || []
    catIds = catsByName.map((c) => c.id)
  }

  // 5. Query Salary Rules pada Structure ID 6 (atau yang aktif)
  const ruleRes = await fetch(jsonRpcUrl, {
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
          'hr.salary.rule',
          'search_read',
          [[['struct_id', '=', 6], ['category_id', 'in', catIds]]],
          { fields: ['id', 'name', 'code', 'category_id', 'amount_select'], order: 'category_id asc, name asc' },
        ],
      },
      id: 3,
    }),
  })
  const rules = (await ruleRes.json()).result || []

  // 6. Query Payslip Input Types untuk pemetaan odooInputCode otomatis
  const inputTypeRes = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip.input.type', 'search_read', [[]], { fields: ['id', 'name', 'code'] }],
      },
      id: 4,
    }),
  })
  const inputTypes = (await inputTypeRes.json()).result || []

  // 7. Bentuk katalog dinamis murni (100% Odoo, tanpa data mock)
  const catalog = rules.map((r) => {
    const catName = Array.isArray(r.category_id) ? r.category_id[1] : ''
    const isAlw = catName.toLowerCase().includes('allowance')
    const codeLower = (r.code || '').toLowerCase()
    const nameLower = (r.name || '').toLowerCase()

    const matchInput = inputTypes.find(
      (t) =>
        (t.code && t.code.toLowerCase() === codeLower) ||
        (t.name && t.name.toLowerCase() === nameLower) ||
        (codeLower === 'np_allowance' && (t.code === 'NPA' || t.name?.toLowerCase().includes('non permanent'))) ||
        (codeLower === 'transport' && t.code?.toLowerCase() === 'transport')
    )

    return {
      code: r.code,
      name: r.name,
      category: isAlw ? 'ALW' : 'DED',
      categoryName: catName || (isAlw ? 'Allowance' : 'Deduction'),
      odooRuleId: r.id,
      odooRuleCode: r.code,
      odooInputCode: matchInput?.code || r.code,
      amountSelect: r.amount_select,
      isSickDeductible: codeLower.includes('transport'),
    }
  })

  // 8. Simpan ke AppState cache
  try {
    await prisma.appState.upsert({
      where: { key: RULE_POOL_CACHE_KEY },
      update: { value: JSON.stringify({ updatedAt: Date.now(), rules: catalog }) },
      create: { key: RULE_POOL_CACHE_KEY, value: JSON.stringify({ updatedAt: Date.now(), rules: catalog }) },
    })
  } catch (err) {
    console.warn('Gagal menyimpan cache rule pool Odoo:', err.message)
  }

  return catalog
}

// Deprecated: Tidak lagi menggunakan data hardcoded
export const ODOO_PRECONFIGURED_RULE_POOL = []

export const DEFAULT_COMPONENTS = [
  {
    id: 'comp_basic',
    code: 'BASIC',
    name: 'Basic Salary (Gaji Pokok)',
    percent: 75,
    isBase: true,
    isRemovable: false,
    odooRuleCode: 'BASIC',
    odooInputCode: 'BASIC',
  },
  {
    id: 'comp_trans',
    code: 'TRANS',
    name: 'Transport Allowance',
    percent: 15,
    isBase: false,
    isRemovable: true,
    isSickDeductible: true,
    odooRuleCode: 'TRANS',
    odooInputCode: 'transport',
  },
  {
    id: 'comp_npa',
    code: 'NPA',
    name: 'Non Permanent Allowance',
    percent: 10,
    isBase: false,
    isRemovable: true,
    isSickDeductible: false,
    odooRuleCode: 'NPA',
    odooInputCode: 'NPA',
  },
]

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
  components: DEFAULT_COMPONENTS,
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
 * Normalisasi konfigurasi salary breakdown agar kompatibel baik format lama maupun baru (array components)
 */
export function normalizeSalaryConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SALARY_BREAKDOWN_CONFIG }
  }

  let components = Array.isArray(raw.components) && raw.components.length > 0 ? raw.components : null

  if (!components) {
    const basic = typeof raw.basicPercent === 'number' ? raw.basicPercent : 75
    const transport = typeof raw.transportPercent === 'number' ? raw.transportPercent : 15
    const npa = typeof (raw.nonPermanentPercent ?? raw.kpiPercent) === 'number' ? (raw.nonPermanentPercent ?? raw.kpiPercent) : 10

    components = [
      {
        id: 'comp_basic',
        code: 'BASIC',
        name: 'Basic Salary (Gaji Pokok)',
        percent: basic,
        isBase: true,
        isRemovable: false,
        odooRuleCode: 'BASIC',
        odooInputCode: 'BASIC',
      },
      {
        id: 'comp_trans',
        code: 'TRANS',
        name: 'Transport Allowance',
        percent: transport,
        isBase: false,
        isRemovable: true,
        isSickDeductible: true,
        odooRuleCode: 'TRANS',
        odooInputCode: 'transport',
      },
      {
        id: 'comp_npa',
        code: 'NPA',
        name: 'Non Permanent Allowance',
        percent: npa,
        isBase: false,
        isRemovable: true,
        isSickDeductible: false,
        odooRuleCode: 'NPA',
        odooInputCode: 'NPA',
      },
    ]
  }

  // Cari base comp
  const baseComp = components.find((c) => c.isBase) || components[0]
  const basicPercent = Number(baseComp?.percent) || 75
  const transportComp = components.find((c) => c.code === 'TRANS')
  const transportPercent = transportComp ? Number(transportComp.percent) : 0
  const npaComp = components.find((c) => c.code === 'NPA')
  const nonPermanentPercent = npaComp ? Number(npaComp.percent) : 0

  // Normalisasi location rules untuk 4 lokasi standar (ho, sales, gudang, livestream)
  const locationKeys = ['ho', 'sales', 'gudang', 'livestream']
  const locationRules = {}
  const rawLocRules = raw.locationRules || {}

  for (const key of locationKeys) {
    const baseLoc = DEFAULT_LOCATION_RULES[key] || { locationName: key }
    const rule = rawLocRules[key] || {}
    let enabledCodes = Array.isArray(rule.enabledComponentCodes) ? [...rule.enabledComponentCodes] : null

    if (!enabledCodes) {
      enabledCodes = []
      if (rule.enableTransport ?? baseLoc.enableTransport ?? true) enabledCodes.push('TRANS')
      if (rule.enableNonPermanent ?? rule.enableKpi ?? baseLoc.enableNonPermanent ?? true) enabledCodes.push('NPA')
      // Seluruh komponen non-base lainnya yang ada di components aktif secara default untuk lokasi ini
      for (const comp of components) {
        if (!comp.isBase && !enabledCodes.includes(comp.code)) {
          enabledCodes.push(comp.code)
        }
      }
    }

    locationRules[key] = {
      ...baseLoc,
      ...rule,
      locationName: rule.locationName || baseLoc.locationName || key,
      enabledComponentCodes: enabledCodes,
      enableTransport: enabledCodes.includes('TRANS'),
      enableNonPermanent: enabledCodes.includes('NPA'),
      enableKpi: enabledCodes.includes('NPA'),
    }
  }

  return {
    ...DEFAULT_SALARY_BREAKDOWN_CONFIG,
    ...raw,
    components,
    basicPercent,
    transportPercent,
    nonPermanentPercent,
    kpiPercent: nonPermanentPercent,
    roundingStep: Number(raw.roundingStep) || 1,
    locationRules,
  }
}

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
      return normalizeSalaryConfig(parsed)
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

  let components = null
  if (Array.isArray(config.components) && config.components.length > 0) {
    components = config.components.map((c) => ({
      ...c,
      percent: Math.max(0, Number(c.percent) || 0),
    }))
  } else {
    const basic = Number(config.basicPercent) || current.basicPercent || 75
    const transport = Number(config.transportPercent) || current.transportPercent || 15
    const nonPermanent = Number(config.nonPermanentPercent ?? config.kpiPercent) || current.nonPermanentPercent || current.kpiPercent || 10

    components = [
      {
        id: 'comp_basic',
        code: 'BASIC',
        name: 'Basic Salary (Gaji Pokok)',
        percent: basic,
        isBase: true,
        isRemovable: false,
        odooRuleCode: 'BASIC',
        odooInputCode: 'BASIC',
      },
      {
        id: 'comp_trans',
        code: 'TRANS',
        name: 'Transport Allowance',
        percent: transport,
        isBase: false,
        isRemovable: true,
        isSickDeductible: true,
        odooRuleCode: 'TRANS',
        odooInputCode: 'transport',
      },
      {
        id: 'comp_npa',
        code: 'NPA',
        name: 'Non Permanent Allowance',
        percent: nonPermanent,
        isBase: false,
        isRemovable: true,
        isSickDeductible: false,
        odooRuleCode: 'NPA',
        odooInputCode: 'NPA',
      },
    ]
  }

  // Validasi total persentase harus tepat 100%
  const total = Math.round(components.reduce((acc, c) => acc + (Number(c.percent) || 0), 0) * 100) / 100
  if (total !== 100) {
    throw new Error(`Total persentase seluruh komponen harus tepat 100% (saat ini ${total}%)`)
  }

  const baseComp = components.find((c) => c.isBase) || components[0]
  if (!baseComp || Number(baseComp.percent) <= 0) {
    throw new Error('Komponen dasar (Basic Salary) harus memiliki persentase lebih dari 0%')
  }

  const basic = Number(baseComp.percent)
  const transportComp = components.find((c) => c.code === 'TRANS')
  const transport = transportComp ? Number(transportComp.percent) : 0
  const npaComp = components.find((c) => c.code === 'NPA')
  const nonPermanent = npaComp ? Number(npaComp.percent) : 0

  const roundingStep = Number(config.roundingStep) || current.roundingStep || 1
  const locationRules = config.locationRules || current.locationRules || DEFAULT_LOCATION_RULES

  const payload = {
    components,
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

  return normalizeSalaryConfig(payload)
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
 * @returns {Promise<Record<string, any>>}
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
export async function saveEmployeeAllowanceOverride(empId, overrideData) {
  const overrides = await getEmployeeAllowanceOverrides()
  const idStr = String(empId)

  overrides[idStr] = {
    ...(overrides[idStr] || {}),
    ...overrideData,
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
 * Menghitung rincian komponen gaji dari Odoo Wage (Basic Salary)
 * Memperhitungkan aturan Work Location & Override Individu Karyawan
 * Mendukung komponen gaji dinamis (Strategi 2: Pre-Configured Rule Pool)
 * @param {number} odooWage - Nilai wage dari tab payroll Odoo (Basic Salary)
 * @param {object} rawConfig - Konfigurasi persentase, aturan pembulatan & lokasi kerja
 * @param {object} [options] - { locationCode, employeeOverride }
 */
export function calculateSalaryBreakdown(odooWage, rawConfig = DEFAULT_SALARY_BREAKDOWN_CONFIG, options = {}) {
  const config = normalizeSalaryConfig(rawConfig)
  const basic = Math.max(0, Number(odooWage) || 0)
  const roundingStep = Number(config.roundingStep) || 1
  const components = config.components || DEFAULT_COMPONENTS

  const locCode = (options.locationCode || 'ho').toLowerCase()
  const locRule = (config.locationRules && config.locationRules[locCode]) || DEFAULT_LOCATION_RULES[locCode] || {}
  const override = options.employeeOverride || null

  // 1. Identifikasi komponen base (Basic Salary)
  const baseComp = components.find((c) => c.isBase) || components[0]
  const basePercent = Number(baseComp?.percent) || 75

  // 2. Loop dan hitung rincian tiap komponen
  const items = {}
  let grossSalary = 0
  let sickDeductibleTotal = 0

  components.forEach((comp) => {
    if (comp.isBase) {
      items[comp.code] = {
        id: comp.id,
        code: comp.code,
        name: comp.name,
        percent: comp.percent,
        amount: basic,
        enabled: true,
        isBase: true,
        isSickDeductible: false,
        odooRuleCode: comp.odooRuleCode || comp.code,
        odooInputCode: comp.odooInputCode || comp.code.toLowerCase(),
      }
      grossSalary += basic
      return
    }

    // Tentukan apakah komponen aktif untuk karyawan ini
    // Hierarki: Override Individu > Aturan Lokasi > Default Aktif
    let isEnabled = true

    if (override) {
      if (override.componentOverrides && typeof override.componentOverrides[comp.code] === 'boolean') {
        isEnabled = override.componentOverrides[comp.code]
      } else if (typeof override[comp.code] === 'boolean') {
        isEnabled = override[comp.code]
      } else if (comp.code === 'TRANS' && typeof override.enableTransport === 'boolean') {
        isEnabled = override.enableTransport
      } else if (comp.code === 'NPA') {
        const rawNP = override.enableNonPermanent ?? override.enableKpi
        if (typeof rawNP === 'boolean') isEnabled = rawNP
      }
    } else if (locRule) {
      if (Array.isArray(locRule.enabledComponentCodes)) {
        isEnabled = locRule.enabledComponentCodes.includes(comp.code)
      } else if (comp.code === 'TRANS' && typeof locRule.enableTransport === 'boolean') {
        isEnabled = locRule.enableTransport
      } else if (comp.code === 'NPA') {
        const rawLocNP = locRule.enableNonPermanent ?? locRule.enableKpi
        if (typeof rawLocNP === 'boolean') isEnabled = rawLocNP
      }
    }

    // Perhitungan Nominal: Proporsional terhadap Base Wage (Odoo Wage)
    const rawAmount = isEnabled && basic > 0 && basePercent > 0
      ? (basic * Number(comp.percent)) / basePercent
      : 0
    const nominal = isEnabled && basic > 0 ? roundToStep(rawAmount, roundingStep) : 0

    items[comp.code] = {
      id: comp.id,
      code: comp.code,
      name: comp.name,
      percent: comp.percent,
      amount: nominal,
      enabled: isEnabled,
      isBase: false,
      isSickDeductible: Boolean(comp.isSickDeductible),
      odooRuleCode: comp.odooRuleCode || comp.code,
      odooInputCode: comp.odooInputCode || comp.code.toLowerCase(),
    }

    if (isEnabled && nominal > 0) {
      grossSalary += nominal
      if (comp.isSickDeductible) {
        sickDeductibleTotal += nominal
      }
    }
  })

  // Backward-compatibility aliases
  const transportAllowance = items['TRANS']?.amount || 0
  const nonPermanentAllowance = items['NPA']?.amount || 0
  const enableTransport = items['TRANS']?.enabled ?? true
  const enableNonPermanent = items['NPA']?.enabled ?? true

  return {
    basicSalary: basic,
    transportAllowance,
    nonPermanentAllowance,
    kpiAllowance: nonPermanentAllowance, // alias
    grossSalary,
    sickDeductibleTotal: sickDeductibleTotal || transportAllowance, // basis potongan cuti sakit
    items,
    components,
    enableTransport,
    enableNonPermanent,
    enableKpi: enableNonPermanent, // alias
    isOverridden: !!override,
    percentages: {
      basicPercent: basePercent,
      transportPercent: items['TRANS']?.percent || 0,
      nonPermanentPercent: items['NPA']?.percent || 0,
      kpiPercent: items['NPA']?.percent || 0,
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

    // Proteksi: Jika wage di Odoo bernilai 0 namun karyawan sudah memiliki gaji di PeopleHub,
    // jangan menimpa gaji positif lokal dengan 0 (karena belum semua kontrak diinput di Odoo)
    if (odooWage === 0 && emp.salary > 0) {
      unchangedCount++
      continue
    }

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
