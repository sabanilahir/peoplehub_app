// src/lib/overtimeConfigService.js
import { prisma } from '@/lib/prisma'

export const CONFIG_OVERTIME_KEY = 'payroll_overtime_config'

export const DEFAULT_OVERTIME_CONFIG = {
  warehouse: {
    weekdayRate: 15000,
    holidayRate: 25000,
  },
  ho: {
    hoursPerDay: 8,
  },
  sales: {
    hoursPerDay: 8,
  },
}

/**
 * Normalisasi objek konfigurasi lembur
 */
export function normalizeOvertimeConfig(raw = {}) {
  const warehouse = raw.warehouse || {}
  const ho = raw.ho || {}
  const sales = raw.sales || {}

  return {
    warehouse: {
      weekdayRate: Math.max(0, Number(warehouse.weekdayRate) || DEFAULT_OVERTIME_CONFIG.warehouse.weekdayRate),
      holidayRate: Math.max(0, Number(warehouse.holidayRate) || DEFAULT_OVERTIME_CONFIG.warehouse.holidayRate),
    },
    ho: {
      hoursPerDay: Math.max(1, Number(ho.hoursPerDay) || DEFAULT_OVERTIME_CONFIG.ho.hoursPerDay),
    },
    sales: {
      hoursPerDay: Math.max(1, Number(sales.hoursPerDay) || DEFAULT_OVERTIME_CONFIG.sales.hoursPerDay),
    },
  }
}

/**
 * Mengambil konfigurasi tarif & aturan lembur dari appState
 */
export async function getOvertimeConfig() {
  try {
    const row = await prisma.appState.findUnique({
      where: { key: CONFIG_OVERTIME_KEY },
    })
    if (row && row.value) {
      const parsed = JSON.parse(row.value)
      return normalizeOvertimeConfig(parsed)
    }
  } catch (err) {
    console.warn('[Overtime Config] Failed to read from appState, using defaults:', err.message)
  }
  return { ...DEFAULT_OVERTIME_CONFIG }
}

/**
 * Menyimpan konfigurasi tarif & aturan lembur baru ke appState
 */
export async function saveOvertimeConfig(config) {
  const current = await getOvertimeConfig()
  const normalized = normalizeOvertimeConfig({
    ...current,
    ...config,
    warehouse: {
      ...current.warehouse,
      ...(config.warehouse || {}),
    },
    ho: {
      ...current.ho,
      ...(config.ho || {}),
    },
    sales: {
      ...current.sales,
      ...(config.sales || {}),
    },
  })

  await prisma.appState.upsert({
    where: { key: CONFIG_OVERTIME_KEY },
    create: {
      key: CONFIG_OVERTIME_KEY,
      value: JSON.stringify(normalized),
    },
    update: {
      value: JSON.stringify(normalized),
    },
  })

  return normalized
}
