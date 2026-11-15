import { NextResponse } from 'next/server'
import { sendTestEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

/**
 * Endpoint untuk uji coba koneksi SMTP dan mengirimkan email tes
 * POST /api/email/test
 * Body: { to: string, smtpConfig?: object }
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { to, smtpConfig } = body || {}

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Alamat email penerima tes (to) wajib diisi.' },
        { status: 400 }
      )
    }

    const result = await sendTestEmail({ to, smtpConfig })

    return NextResponse.json({
      success: true,
      message: `Email tes berhasil dikirimkan ke ${to}. Silakan periksa inbox atau folder spam Anda.`,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error('[API /api/email/test Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengirimkan email tes. Periksa kembali host, port, user, dan password SMTP Anda.',
      },
      { status: 500 }
    )
  }
}
