import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/emailService'
import { DEFAULT_TEMPLATES } from '@/store/notificationSettingsStore'

export const dynamic = 'force-dynamic'

/**
 * Helper untuk normalisasi tanggal YYYY-MM-DD
 */
function getTodayDateString() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function parseDaysRemaining(endDateStr, todayStr) {
  if (!endDateStr) return null
  try {
    const end = new Date(endDateStr)
    const today = new Date(todayStr)
    if (isNaN(end.getTime()) || isNaN(today.getTime())) return null
    const diffTime = end.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } catch (e) {
    return null
  }
}

/**
 * Runner scan kontrak mau habis (Cron & Manual Trigger)
 * GET /api/cron/contract-expiry?secret=...
 * POST /api/cron/contract-expiry
 */
export async function GET(req) {
  return handleContractExpiryScan(req)
}

export async function POST(req) {
  return handleContractExpiryScan(req)
}

async function handleContractExpiryScan(req) {
  try {
    // 1. Ambil pengaturan notifikasi & kontrak dari AppState
    let contractSettings = {
      alertIntervals: [60, 30, 14, 7, 1],
      hrEmails: 'hr@example.com',
      notifyManager: true,
      notifyEmployee: true,
    }
    let templates = DEFAULT_TEMPLATES

    try {
      const record = await prisma.appState.findUnique({
        where: { key: 'hcm-notification-settings-v1' },
      })
      if (record?.data) {
        const parsed = typeof record.data === 'string' ? JSON.parse(record.data) : record.data
        if (parsed?.state?.contractSettings) {
          contractSettings = { ...contractSettings, ...parsed.state.contractSettings }
        }
        if (parsed?.state?.templates) {
          templates = { ...templates, ...parsed.state.templates }
        }
      }
    } catch (e) {
      // Abaikan dan gunakan default
    }

    const { alertIntervals, hrEmails, notifyManager, notifyEmployee } = contractSettings
    const todayStr = getTodayDateString()

    // 2. Ambil seluruh data karyawan aktif yang memiliki tanggal akhir kontrak (endDate)
    const employees = await prisma.employee.findMany({
      where: {
        status: { in: ['Active', 'active', 'ACTIVE'] },
        endDate: { not: '' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        dept: true,
        position: true,
        employmentType: true,
        joinDate: true,
        endDate: true,
        managerId: true,
      },
    })

    // Dapatkan daftar manager untuk memetakan nama & email atasan
    const managerIds = [...new Set(employees.map(e => e.managerId).filter(Boolean))]
    const managers = await prisma.employee.findMany({
      where: { id: { in: managerIds } },
      select: { id: true, name: true, email: true },
    })
    const managerMap = new Map(managers.map(m => [m.id, m]))

    const results = []
    let totalNotified = 0

    // 3. Evaluasi setiap karyawan
    for (const emp of employees) {
      const daysRemaining = parseDaysRemaining(emp.endDate, todayStr)

      // Karyawan tidak valid atau kontrak sudah lewat jauh
      if (daysRemaining === null || daysRemaining < 0) continue

      const isAlertDay = alertIntervals.includes(daysRemaining)

      const manager = emp.managerId ? managerMap.get(emp.managerId) : null
      const managerName = manager?.name || '—'
      const managerEmail = manager?.email || ''

      const empDetail = {
        employeeId: emp.id,
        name: emp.name,
        employmentType: emp.employmentType || 'PKWT / Kontrak',
        department: emp.dept || '—',
        position: emp.position || '—',
        endDate: emp.endDate,
        daysRemaining,
        isAlertDay,
        managerName,
        managerEmail,
        hrNotified: false,
        employeeNotified: false,
      }

      // Jika hari ini tepat tanggal peringatan (misal H-60, H-30, H-14, H-7, H-1)
      if (isAlertDay) {
        const variables = {
          employee_name: emp.name,
          employee_id: `EMP-${emp.id}`,
          department: emp.dept || '—',
          position: emp.position || '—',
          contract_end_date: emp.endDate,
          days_remaining: String(daysRemaining),
          manager_name: managerName,
          company_name: 'PeopleHub HRMS',
        }

        // A. Kirim ke HR & Manager
        const hrTemplate = templates.contract_expiring_hr || DEFAULT_TEMPLATES.contract_expiring_hr
        if (hrTemplate.active) {
          const recipients = [hrEmails]
          if (notifyManager && managerEmail && managerEmail.includes('@')) {
            recipients.push(managerEmail)
          }

          const targetTo = recipients.filter(Boolean).join(', ')
          if (targetTo) {
            await sendNotificationEmail({
              to: targetTo,
              subject: hrTemplate.subject,
              body: hrTemplate.body,
              ctaText: hrTemplate.ctaText,
              ctaUrl: hrTemplate.ctaUrl,
              accentColor: hrTemplate.accentColor,
              eventKey: 'contract_expiring_hr',
              variables,
              recipientName: 'Tim HR & Manager',
            })
            empDetail.hrNotified = true
            totalNotified++
          }
        }

        // B. Kirim ke Karyawan (jika diaktifkan dan sisa hari <= 14)
        if (notifyEmployee && daysRemaining <= 14 && emp.email && emp.email.includes('@')) {
          const empTemplate = templates.contract_expiring_employee || DEFAULT_TEMPLATES.contract_expiring_employee
          if (empTemplate.active) {
            await sendNotificationEmail({
              to: emp.email,
              subject: empTemplate.subject,
              body: empTemplate.body,
              ctaText: empTemplate.ctaText,
              ctaUrl: empTemplate.ctaUrl,
              accentColor: empTemplate.accentColor,
              eventKey: 'contract_expiring_employee',
              variables,
              recipientName: emp.name,
            })
            empDetail.employeeNotified = true
            totalNotified++
          }
        }
      }

      results.push(empDetail)
    }

    // Urutkan dari yang sisa harinya paling sedikit
    results.sort((a, b) => a.daysRemaining - b.daysRemaining)

    return NextResponse.json({
      success: true,
      scanDate: todayStr,
      scannedEmployeesCount: employees.length,
      expiringWithinScopeCount: results.length,
      notificationsSentToday: totalNotified,
      employees: results,
      message: `Pengecekan selesai. ${results.length} karyawan kontrak dipantau, ${totalNotified} notifikasi dikirimkan hari ini (${todayStr}).`,
    })
  } catch (error) {
    console.error('[API /api/cron/contract-expiry Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengeksekusi scan kontrak.' },
      { status: 500 }
    )
  }
}
