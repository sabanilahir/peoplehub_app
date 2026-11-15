import nodemailer from 'nodemailer'
import { prisma } from './prisma.js'

/**
 * Mengambil konfigurasi SMTP aktif dari AppState (database)
 * dengan fallback ke environment variables (.env).
 */
export async function getSmtpConfig() {
  let dbSmtp = null

  try {
    const record = await prisma.appState.findUnique({
      where: { key: 'hcm-notification-settings-v1' },
    })
    if (record?.data) {
      const parsed = typeof record.data === 'string' ? JSON.parse(record.data) : record.data
      if (parsed?.state?.smtp?.host) {
        dbSmtp = parsed.state.smtp
      }
    }
  } catch (e) {
    // Abaikan jika DB belum siap, gunakan fallback .env
  }

  const host = dbSmtp?.host || process.env.SMTP_HOST || ''
  const port = Number(dbSmtp?.port || process.env.SMTP_PORT || 465)
  const user = dbSmtp?.user || process.env.SMTP_USER || ''
  const pass = dbSmtp?.pass || process.env.SMTP_PASS || ''
  const fromName = dbSmtp?.fromName || 'PeopleHub HRMS'
  const fromEmail = dbSmtp?.fromEmail || process.env.SMTP_FROM || user || 'no-reply@peoplehub.local'
  const replyTo = dbSmtp?.replyTo || ''
  const active = dbSmtp?.active !== undefined ? dbSmtp.active : true

  return {
    host,
    port,
    secure: dbSmtp?.secure !== undefined ? dbSmtp.secure : port === 465,
    user,
    pass,
    fromName,
    fromEmail,
    from: `"${fromName}" <${fromEmail}>`,
    replyTo: replyTo || fromEmail,
    active,
  }
}

/**
 * Membuat transporter Nodemailer
 */
export function createTransporter(config) {
  if (!config.host || !config.user || !config.pass) {
    throw new Error('Konfigurasi SMTP belum lengkap (Host, Username, atau Password masih kosong).')
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false, // Memungkinkan self-signed cert jika di VPS / cPanel
    },
  })
}

/**
 * Menggantikan placeholder {{variable_name}} dengan data riil
 */
export function resolveTemplate(text, variables = {}) {
  if (!text) return ''
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? String(variables[key] ?? '') : match
  })
}

/**
 * Format teks body (linebreaks & bold) ke dalam HTML terstruktur
 */
function formatBodyToHtml(text) {
  if (!text) return ''
  return text
    .split('\n\n')
    .map(paragraph => {
      const formatted = paragraph
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>')
      return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">${formatted}</p>`
    })
    .join('')
}

/**
 * Membangun template email HTML responsif yang profesional untuk PeopleHub
 */
export function buildHtmlEmail({
  title = 'Pemberitahuan Sistem',
  preheader = '',
  body = '',
  ctaText = '',
  ctaUrl = '',
  accentColor = '#2563eb', // Default Blue
  companyName = 'PeopleHub HRMS',
  recipientName = '',
}) {
  const formattedBody = formatBodyToHtml(body)
  const appBaseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const fullCtaUrl = ctaUrl?.startsWith('http') ? ctaUrl : `${appBaseUrl}${ctaUrl}`

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text for inbox preview -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all; font-size: 1px; line-height: 1px; color: #fff;">
    ${preheader || title}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Top Accent Color Bar -->
          <tr>
            <td height="6" style="background-color: ${accentColor};"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em; display: inline-flex; align-items: center; gap: 8px;">
                      <span style="background-color: ${accentColor}; color: #ffffff; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; border-radius: 8px; font-size: 14px; font-weight: 900;">P</span>
                      <span style="vertical-align: middle;">${companyName}</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; tracking: 0.05em; color: ${accentColor}; background-color: #f8fafc; padding: 4px 10px; border-radius: 20px; border: 1px solid #e2e8f0;">
                      HR Notification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Banner -->
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                ${title}
              </h1>
              ${recipientName ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">Yth. Bapak/Ibu <strong>${recipientName}</strong>,</p>` : ''}
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 12px 32px 24px 32px; font-size: 14px; color: #334155; line-height: 1.6;">
              ${formattedBody}
            </td>
          </tr>

          <!-- Call to Action Button (Optional) -->
          ${ctaText && ctaUrl ? `
          <tr>
            <td align="center" style="padding: 8px 32px 32px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: ${accentColor};">
                    <a href="${fullCtaUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
                Atau salin tautan berikut ke browser: <br/>
                <a href="${fullCtaUrl}" style="color: #64748b; word-break: break-all;">${fullCtaUrl}</a>
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                ${companyName} &bull; Human Capital Management System
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Email ini dibuat secara otomatis oleh sistem PeopleHub. Harap tidak membalas langsung ke alamat email ini.<br/>
                Jika Anda memiliki pertanyaan, silakan hubungi tim HR atau Administrator sistem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Mencatat log pengiriman email ke dalam database AppState
 */
async function appendEmailLog(logEntry) {
  try {
    const record = await prisma.appState.findUnique({
      where: { key: 'hcm-notification-settings-v1' },
    })

    let data = { state: { logs: [] } }
    if (record?.data) {
      data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data
    }

    if (!data.state) data.state = {}
    if (!Array.isArray(data.state.logs)) data.state.logs = []

    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      sentAt: new Date().toISOString(),
      ...logEntry,
    }

    // Simpan 200 log terakhir
    data.state.logs = [newLog, ...data.state.logs].slice(0, 200)

    await prisma.appState.upsert({
      where: { key: 'hcm-notification-settings-v1' },
      create: {
        key: 'hcm-notification-settings-v1',
        data: JSON.stringify(data),
      },
      update: {
        data: JSON.stringify(data),
      },
    })
  } catch (e) {
    console.error('[EmailService] Gagal mencatat log email:', e)
  }
}

/**
 * Mengirimkan email tes untuk verifikasi konfigurasi SMTP
 */
export async function sendTestEmail({ to, smtpConfig }) {
  if (!to) throw new Error('Alamat email penerima wajib diisi.')

  const config = smtpConfig || (await getSmtpConfig())
  const transporter = createTransporter(config)

  const testTitle = 'Uji Koneksi Server Email (SMTP PeopleHub)'
  const testBody = `Halo,\n\nIni adalah email tes konfirmasi dari **${config.fromName || 'PeopleHub'}**.\n\nJika Anda menerima email ini, berarti konfigurasi SMTP server Anda telah **berhasil terhubung** dengan baik dan siap digunakan untuk pengiriman notifikasi otomatis.\n\nDetail Koneksi:\n- **SMTP Host:** ${config.host}\n- **Port:** ${config.port}\n- **Protokol:** ${config.secure ? 'SSL/TLS' : 'STARTTLS'}\n- **Akun Pengirim:** ${config.fromEmail}\n- **Waktu Uji:** ${new Date().toLocaleString('id-ID')}`

  const html = buildHtmlEmail({
    title: testTitle,
    body: testBody,
    ctaText: 'Buka Portal PeopleHub',
    ctaUrl: '/sysadmin/settings/notification-setup',
    accentColor: '#10b981', // Hijau Sukses
    companyName: config.fromName || 'PeopleHub HRMS',
  })

  const info = await transporter.sendMail({
    from: config.from,
    to,
    replyTo: config.replyTo,
    subject: `[Uji Berhasil] Konfigurasi Email SMTP PeopleHub`,
    text: testBody,
    html,
  })

  await appendEmailLog({
    to,
    subject: `[Uji Berhasil] Konfigurasi Email SMTP PeopleHub`,
    eventKey: 'smtp_test',
    status: 'sent',
    messageId: info.messageId,
  })

  return { success: true, messageId: info.messageId }
}

/**
 * Fungsi serbaguna untuk mengirim email notifikasi PeopleHub berdasarkan template atau custom data
 */
export async function sendNotificationEmail({
  to,
  subject,
  body,
  ctaText = '',
  ctaUrl = '',
  accentColor = '#2563eb',
  eventKey = 'custom',
  variables = {},
  recipientName = '',
  customHtml = null,
}) {
  const config = await getSmtpConfig()

  if (!config.active) {
    console.log(`[EmailService] Pengiriman email dinonaktifkan di pengaturan sistem. Event: ${eventKey}`)
    await appendEmailLog({
      to,
      subject,
      eventKey,
      status: 'skipped',
      error: 'Pengiriman email dinonaktifkan di pengaturan sistem.',
    })
    return { success: true, skipped: true, message: 'Email delivery is paused in settings.' }
  }

  const resolvedSubject = resolveTemplate(subject, variables)
  const resolvedBody = resolveTemplate(body, variables)
  const resolvedCtaUrl = resolveTemplate(ctaUrl, variables)

  const html = customHtml || buildHtmlEmail({
    title: resolvedSubject,
    body: resolvedBody,
    ctaText,
    ctaUrl: resolvedCtaUrl,
    accentColor,
    companyName: config.fromName || 'PeopleHub HRMS',
    recipientName: recipientName || variables.employee_name || '',
  })

  try {
    const transporter = createTransporter(config)
    const info = await transporter.sendMail({
      from: config.from,
      to,
      replyTo: config.replyTo,
      subject: resolvedSubject,
      text: resolvedBody,
      html,
    })

    await appendEmailLog({
      to,
      subject: resolvedSubject,
      eventKey,
      status: 'sent',
      messageId: info.messageId,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[EmailService] Gagal mengirim email (${eventKey}) ke ${to}:`, error)
    await appendEmailLog({
      to,
      subject: resolvedSubject,
      eventKey,
      status: 'failed',
      error: error.message || 'Gagal mengirim email.',
    })
    return { success: false, error: error.message }
  }
}
