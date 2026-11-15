import { NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/emailService'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TEMPLATES } from '@/store/notificationSettingsStore'

export const dynamic = 'force-dynamic'

/**
 * Endpoint terpadu pengiriman email notifikasi sistem PeopleHub
 * POST /api/email/send
 * Body: {
 *   eventKey: string, // e.g. 'leave_requested', 'contract_expiring_hr', etc.
 *   to: string | string[],
 *   variables: object,
 *   customSubject?: string,
 *   customBody?: string,
 *   ctaUrl?: string,
 *   ctaText?: string,
 *   accentColor?: string
 * }
 */
export async function POST(req) {
  try {
    const payload = await req.json()
    const {
      eventKey = 'custom',
      to,
      variables = {},
      customSubject,
      customBody,
      ctaUrl,
      ctaText,
      accentColor,
    } = payload || {}

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email tujuan (to) wajib diisi.' },
        { status: 400 }
      )
    }

    // Ambil template aktif dari database atau fallback ke default
    let template = DEFAULT_TEMPLATES[eventKey] || {}

    try {
      const record = await prisma.appState.findUnique({
        where: { key: 'hcm-notification-settings-v1' },
      })
      if (record?.data) {
        const parsed = typeof record.data === 'string' ? JSON.parse(record.data) : record.data
        if (parsed?.state?.templates?.[eventKey]) {
          template = parsed.state.templates[eventKey]
        }
      }
    } catch (e) {
      // Gunakan default
    }

    // Jika template dinonaktifkan oleh admin
    if (template.active === false) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Template ${eventKey} sedang dinonaktifkan oleh admin.`,
      })
    }

    const subject = customSubject || template.subject || 'Notifikasi PeopleHub HRMS'
    const body = customBody || template.body || ''
    const finalCtaText = ctaText !== undefined ? ctaText : template.ctaText
    const finalCtaUrl = ctaUrl !== undefined ? ctaUrl : template.ctaUrl
    const finalAccentColor = accentColor || template.accentColor || '#2563eb'

    // Format array tujuan jika jamak
    const recipientList = Array.isArray(to) ? to.join(', ') : to

    const result = await sendNotificationEmail({
      to: recipientList,
      subject,
      body,
      ctaText: finalCtaText,
      ctaUrl: finalCtaUrl,
      accentColor: finalAccentColor,
      eventKey,
      variables,
      recipientName: variables.recipient_name || variables.employee_name || '',
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Gagal mengirim email.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email notifikasi berhasil dikirim.',
    })
  } catch (error) {
    console.error('[API /api/email/send Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    )
  }
}
