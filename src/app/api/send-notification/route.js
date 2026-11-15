import { NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Endpoint pengiriman email notifikasi lamaran kandidat (Career Site)
 * Memakai emailService terpadu agar mematuhi pengaturan SMTP PeopleHub.
 */
export async function POST(req) {
  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  const { to, subject, body, candidateName } = payload || {}
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'to, subject, dan body wajib diisi.' }, { status: 400 })
  }

  try {
    const result = await sendNotificationEmail({
      to,
      subject,
      body,
      ctaText: 'Lihat Lowongan Lainnya',
      ctaUrl: '/careers',
      accentColor: '#14b8a6', // Teal
      eventKey: 'candidate_applied',
      recipientName: candidateName || '',
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Gagal mengirim email.' }, { status: 500 })
    }

    return NextResponse.json({ id: result.messageId || null })
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Gagal mengirim email.' }, { status: 500 })
  }
}
