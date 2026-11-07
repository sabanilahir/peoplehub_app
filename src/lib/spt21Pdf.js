// Fills the official DJP 1721-A1 form by drawing values onto the real PDF
// template (public/templates/1721-a1.pdf), so the output keeps the Garuda
// masthead, boxes and staple marks exactly as issued.
//
// Coordinates below were read off the template itself: every field on the form
// carries a printed code (H.01, A.01 … C.03), and each amount row has a label,
// so the anchors are measured rather than guessed. Origin is bottom-left,
// page is 612 × 936 pt.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const TEMPLATE_URL = '/templates/1721-a1.pdf'

const INK = rgb(0.05, 0.05, 0.05)
const SIZE = 8          // body text
const SIZE_SM = 7       // long values (address)

// Amount column: "JUMLAH (Rp)" header centres on x≈506 within a 436–576 column.
const AMOUNT_RIGHT = 570

// Baselines of the 20 numbered rows in section B, in order.
const ROW_Y = [
  496.9, 479.8, 462.6, 445.4, 428.3, 411.4, 394.0, 376.8,   // 1–8  bruto
  342.5, 325.3, 308.2,                                       // 9–11 pengurangan
  273.8, 256.7, 239.5, 222.4, 205.2, 188.0, 170.9, 153.7, 136.6, // 12–20
]

const idNum = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0))
const pad2 = (n) => String(n).padStart(2, '0')

// Helvetica is WinAnsi-only; drop anything it cannot encode rather than
// letting pdf-lib throw mid-render on an unexpected character.
const safe = (v) => String(v ?? '').replace(/[^\x20-\xFF]/g, '')

/** Wrap `text` to at most `maxLines` lines that each fit `maxWidth`. */
function wrap(text, font, size, maxWidth, maxLines) {
  const words = safe(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(next, size) <= maxWidth) { line = next; continue }
    if (line) lines.push(line)
    line = w
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  return lines.slice(0, maxLines)
}

export async function buildBuktiPotongPdf({ b, no, pemotong = {}, signDate = new Date() }) {
  const bytes = await fetch(TEMPLATE_URL).then(r => {
    if (!r.ok) throw new Error(`Template 1721-A1 tidak ditemukan (${r.status})`)
    return r.arrayBuffer()
  })

  const pdf = await PDFDocument.load(bytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.getPages()[0]

  const put = (text, x, y, { size = SIZE, f = font } = {}) =>
    page.drawText(safe(text), { x, y, size, font: f, color: INK })

  const putRight = (text, xRight, y, { size = SIZE, f = font } = {}) => {
    const s = safe(text)
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y, size, font: f, color: INK })
  }

  // A tick inside a pre-printed checkbox.
  const tick = (x, y) => page.drawText('X', { x, y, size: 8, font: bold, color: INK })

  /* ── Header: nomor, masa, pemotong ─────────────────────────────────────── */
  // Pre-printed on the form: "1 . 1 -  ___ . ___ -  _______"
  const m = String(no).match(/^1\.1-(\d{2})\.(\d{2})-(\d+)$/)
  if (m) {
    put(m[1], 298, 804)        // MM  (between the "-" at 289 and the "." at 322.4)
    put(m[2], 332, 804)        // YY  (between the "." and the "-" at 358.1)
    put(m[3], 366, 804)        // serial
  } else {
    put(no, 298, 804)
  }

  put(pad2(b.masaDari), 500, 804)     // H.02 — masa perolehan [mm - mm]
  put(pad2(b.masaSampai), 531, 804)

  put(pemotong.npwp, 132, 772)        // H.03
  put(pemotong.nama, 132, 747.5)      // H.04

  /* ── A. Identitas penerima ─────────────────────────────────────────────── */
  put(b.npwp, 116, 695)                                   // A.01
  put(b.nik, 116, 668.8)                                  // A.02
  put(b.nama, 116, 650.3)                                 // A.03

  // A.04 — wraps to 2 lines. Width is capped at 205pt because section A's
  // right-hand column ("8. KARYAWAN ASING") starts at x=337; a wider line
  // would run straight into it.
  wrap(b.alamat, font, SIZE_SM, 205, 2)
    .forEach((ln, i) => put(ln, 116, 631.8 - i * 9, { size: SIZE_SM }))

  const male = /^m|laki/i.test(b.gender || '')
  const female = /^f|perem|wanita/i.test(b.gender || '')
  if (male) tick(148, 594.5)                              // A.05
  if (female) tick(240, 594.5)                            // A.06

  // 6. PTKP — the digit goes on the "K / TK / HB" line above the code markers.
  const tanggungan = String(b.ptkpTanggungan ?? '')
  if (b.ptkpPrefix === 'K')  put(tanggungan, 375, 678)    // A.07
  if (b.ptkpPrefix === 'TK') put(tanggungan, 447, 678)    // A.08
  if (b.ptkpPrefix === 'HB') put(tanggungan, 516, 678)    // A.09

  put(b.jabatan, 434, 652.3, { size: SIZE_SM })           // A.10
  if (b.isAsing) tick(472, 631.6)                         // A.11
  put(b.kodeNegara, 469, 615.3)                           // A.12

  /* ── B. Kode objek pajak + 20 baris rincian ────────────────────────────── */
  // Pegawai tetap → 21-100-01. The box sits just left of each printed label.
  tick(141, 532.4)

  const amounts = [
    b.gajiPokok, b.tunjanganPph, b.tunjanganLain, b.honorarium,
    b.premiPemberiKerja, b.natura, b.bonus, b.bruto,
    b.biayaJabatan, b.iuranPensiun, b.totalPengurangan,
    b.neto, b.netoMasaSebelumnya, b.netoUntukPenghitungan, b.ptkp, b.pkp,
    b.pphAtasPkp, b.pphDipotongMasaSebelumnya, b.pphTerutang, b.pphDipotong,
  ]
  // Subtotal lines read as totals on the form, so they carry the bold weight.
  const BOLD_ROWS = new Set([8, 11, 14, 16, 19, 20])
  amounts.forEach((v, i) => {
    putRight(idNum(v), AMOUNT_RIGHT, ROW_Y[i], { f: BOLD_ROWS.has(i + 1) ? bold : font })
  })

  /* ── C. Identitas pemotong ─────────────────────────────────────────────── */
  put(pemotong.npwp, 106, 88.5)                           // C.01
  put(pemotong.nama, 106, 68.5)                           // C.02

  const d = signDate                                      // C.03 [dd - mm - yyyy]
  put(pad2(d.getDate()), 326, 69.5)
  put(pad2(d.getMonth() + 1), 366, 69.5)
  put(String(d.getFullYear()), 400, 69.5)

  if (pemotong.penandatanganNama) {
    put(pemotong.penandatanganNama, 430, 66, { size: SIZE_SM })
  }

  return pdf.save()
}

/**
 * Build the filled 1721-A1 and hand it to the browser. Opens in a new tab so
 * the user sees it straight away; if the popup is blocked, falls back to a
 * plain download so the action never silently does nothing.
 */
export async function openBuktiPotongPdf(args) {
  const bytes = await buildBuktiPotongPdf(args)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const name = `1721-A1-${args.b.year}-${safe(args.b.nama).replace(/\s+/g, '-')}.pdf`

  const win = window.open(url, '_blank')
  if (!win) {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }
  // Give the tab/download time to take the blob before revoking it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return name
}
