// Client-side PDF generation for offboarding documents (jspdf loaded lazily).
import { fmtDate } from '@/lib/offboarding'

const A4 = { unit: 'pt', format: 'a4' }
const MARGIN = 56
const todayLong = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

async function newDoc() {
  const { jsPDF } = await import('jspdf')
  return new jsPDF(A4)
}

function header(doc, company) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text((company || 'PERUSAHAAN').toUpperCase(), w / 2, MARGIN, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120)
  doc.text('Human Resources Department', w / 2, MARGIN + 15, { align: 'center' })
  doc.setDrawColor(180); doc.setLineWidth(1)
  doc.line(MARGIN, MARGIN + 26, w - MARGIN, MARGIN + 26)
  doc.setTextColor(20)
}

// Surat Keterangan Kerja (Paklaring)
export async function generatePaklaring({ company, name, nik, position, dept, joinDate, lwd, hrName }) {
  const doc = await newDoc()
  const w = doc.internal.pageSize.getWidth()
  header(doc, company)
  let y = MARGIN + 60

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text('SURAT KETERANGAN KERJA', w / 2, y, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120)
  doc.text('(Reference Letter)', w / 2, y + 14, { align: 'center' })
  doc.setTextColor(20); y += 44

  doc.setFontSize(11)
  doc.text('Yang bertanda tangan di bawah ini, manajemen HR menerangkan bahwa:', MARGIN, y); y += 26

  const rows = [
    ['Nama', name], ['NIK', nik || '-'], ['Jabatan', position || '-'],
    ['Departemen', dept || '-'], ['Masa Kerja', `${fmtDate(joinDate)} s/d ${fmtDate(lwd)}`],
  ]
  doc.setFontSize(11)
  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, MARGIN + 12, y)
    doc.setFont('helvetica', 'normal'); doc.text(`:  ${v}`, MARGIN + 130, y); y += 20
  })
  y += 14

  const body = `Adalah benar merupakan karyawan pada perusahaan kami dan telah menyelesaikan masa kerjanya dengan baik. Selama bekerja, yang bersangkutan menunjukkan dedikasi, integritas, dan tanggung jawab yang baik terhadap tugas dan kewajibannya.\n\nSurat keterangan ini diberikan untuk dapat dipergunakan sebagaimana mestinya. Kami mengucapkan terima kasih atas kontribusi yang telah diberikan dan mendoakan kesuksesan di masa mendatang.`
  doc.setFontSize(11)
  doc.text(doc.splitTextToSize(body, w - 2 * MARGIN), MARGIN, y, { lineHeightFactor: 1.5 })
  y += 150

  const sx = w - MARGIN - 180
  doc.text(`${company ? '' : ''}${todayLong()}`, sx, y); y += 16
  doc.text('Hormat kami,', sx, y); y += 60
  doc.setFont('helvetica', 'bold'); doc.text(hrName || 'HR Department', sx, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120)
  doc.text('Human Resources', sx, y + 14)

  doc.save(`Paklaring-${(name || 'karyawan').replace(/\s+/g, '_')}.pdf`)
}

// Clearance Certificate — asset/access clearance summary
export async function generateClearanceCertificate({ company, name, nik, position, dept, lwd, items = [], hrName }) {
  const doc = await newDoc()
  const w = doc.internal.pageSize.getWidth()
  header(doc, company)
  let y = MARGIN + 60

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text('SURAT KETERANGAN CLEARANCE', w / 2, y, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120)
  doc.text('(Employee Clearance Certificate)', w / 2, y + 14, { align: 'center' })
  doc.setTextColor(20); y += 40

  doc.setFontSize(10)
  const info = [['Nama', name], ['NIK', nik || '-'], ['Jabatan / Dept', `${position || '-'} / ${dept || '-'}`], ['Last Working Day', fmtDate(lwd)]]
  info.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, MARGIN, y)
    doc.setFont('helvetica', 'normal'); doc.text(`:  ${v}`, MARGIN + 110, y); y += 16
  })
  y += 10

  // Table
  const cols = [MARGIN, MARGIN + 24, MARGIN + 250, MARGIN + 360]
  const right = w - MARGIN
  doc.setFillColor(243, 244, 246); doc.rect(MARGIN, y - 12, right - MARGIN, 20, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text('#', cols[0] + 4, y); doc.text('Aktivitas', cols[1], y); doc.text('PIC', cols[2], y); doc.text('Status', cols[3], y)
  y += 16
  doc.setFont('helvetica', 'normal')
  const done = items.filter(i => i.status === 'Complete').length
  items.forEach((it, i) => {
    if (y > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); y = MARGIN }
    doc.setTextColor(120); doc.text(String(i + 1), cols[0] + 4, y)
    doc.setTextColor(20); doc.text(doc.splitTextToSize(String(it.title || '-'), 215), cols[1], y)
    doc.setTextColor(90); doc.text(String(it.picName || '-').slice(0, 22), cols[2], y)
    const ok = it.status === 'Complete'
    doc.setTextColor(ok ? 22 : 180, ok ? 130 : 100, ok ? 60 : 20)
    doc.text(ok ? 'CLEARED' : (it.status || 'Pending'), cols[3], y)
    doc.setTextColor(20)
    y += 16
    doc.setDrawColor(235); doc.line(MARGIN, y - 6, right, y - 6)
  })
  y += 10
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  const pct = items.length ? Math.round((done / items.length) * 100) : 0
  doc.text(`Progress Clearance: ${done}/${items.length} (${pct}%)`, MARGIN, y); y += 30

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  const note = pct === 100
    ? 'Seluruh proses clearance telah diselesaikan. Karyawan dinyatakan bebas dari kewajiban dan tanggungan terhadap perusahaan.'
    : 'Dokumen ini menerangkan status clearance karyawan per tanggal cetak. Item yang belum selesai masih dalam proses.'
  doc.text(doc.splitTextToSize(note, w - 2 * MARGIN), MARGIN, y, { lineHeightFactor: 1.5 }); y += 46

  const sx = w - MARGIN - 180
  doc.text(todayLong(), sx, y); y += 46
  doc.setFont('helvetica', 'bold'); doc.text(hrName || 'HR Department', sx, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120)
  doc.text('Human Resources', sx, y + 14)

  doc.save(`Clearance-${(name || 'karyawan').replace(/\s+/g, '_')}.pdf`)
}
