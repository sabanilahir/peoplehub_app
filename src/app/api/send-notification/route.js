import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Sends the resolved Career Site candidate-confirmation email (subject/body
// already filled in with real data by the caller — see
// src/store/notificationSettingsStore.js resolveTemplate) via the SMTP
// mailbox from cPanel. Kept server-side so SMTP_PASS never reaches the
// browser bundle.
export async function POST(req) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return Response.json({ error: 'SMTP belum diset di environment.' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch { return Response.json({ error: 'Body tidak valid.' }, { status: 400 }) }
  const { to, subject, body } = payload || {}
  if (!to || !subject || !body) {
    return Response.json({ error: 'to, subject, dan body wajib diisi.' }, { status: 400 })
  }

  try {
    const port = Number(SMTP_PORT) || 465
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text: body,
    })
    return Response.json({ id: info.messageId || null })
  } catch (err) {
    return Response.json({ error: err?.message || 'Gagal mengirim email.' }, { status: 500 })
  }
}
