// src/lib/assetBastDocs.js
// Client-side PDF generation for Asset Handover & Return BAST (Berita Acara Serah Terima)

const A4 = { unit: 'pt', format: 'a4' }
const MARGIN = 50

const fmtDate = (val) => {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return String(val)
  }
}

const fmtDayDate = (val) => {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return String(val)
  }
}

async function newDoc() {
  const { jsPDF } = await import('jspdf')
  return new jsPDF(A4)
}

function drawHeader(doc, companyName, title, subTitle, docNumber) {
  const w = doc.internal.pageSize.getWidth()
  
  // Kop Perusahaan
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(20, 30, 45)
  doc.text((companyName || 'SAN PEOPLEHUB').toUpperCase(), w / 2, MARGIN, { align: 'center' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 110, 120)
  doc.text('General Affair & Information Technology Department', w / 2, MARGIN + 16, { align: 'center' })
  
  // Garis Pembatas Kop
  doc.setDrawColor(200, 210, 220)
  doc.setLineWidth(1.5)
  doc.line(MARGIN, MARGIN + 28, w - MARGIN, MARGIN + 28)
  
  // Judul Dokumen
  let y = MARGIN + 60
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(title.toUpperCase(), w / 2, y, { align: 'center' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(subTitle, w / 2, y + 16, { align: 'center' })
  
  if (docNumber) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text(`Nomor: ${docNumber}`, w / 2, y + 32, { align: 'center' })
  }

  return y + 50
}

/**
 * Generate Berita Acara Serah Terima (BAST) Peminjaman Aset
 */
export async function generateHandoverBastPdf({
  company = 'San PeopleHub',
  asset,
  employee,
  picName = 'HR / GA Department',
  accessories = '',
  notes = '',
  bastNumber = '',
  handoverDate = new Date(),
}) {
  const doc = await newDoc()
  const w = doc.internal.pageSize.getWidth()

  let y = drawHeader(
    doc,
    company,
    'BERITA ACARA SERAH TERIMA PEMINJAMAN ASET',
    '(Company Asset Handover Certificate)',
    bastNumber || `BAST/AST/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${asset?.assetCode || '001'}`
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)

  const openingText = `Pada hari ini, ${fmtDayDate(handoverDate)}, telah dilakukan penyerahan fasilitas kerja / aset milik perusahaan antara pihak-pihak sebagai berikut:`
  const splitOpening = doc.splitTextToSize(openingText, w - MARGIN * 2)
  doc.text(splitOpening, MARGIN, y)
  y += splitOpening.length * 14 + 10

  // 1. PIHAK PERTAMA (Pemberi)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('I. PIHAK PERTAMA (Yang Menyerahkan):', MARGIN, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.text('Nama PIC', MARGIN + 15, y)
  doc.text(`:  ${picName}`, MARGIN + 120, y)
  y += 14
  doc.text('Departemen', MARGIN + 15, y)
  doc.text(`:  General Affair / HR / IT Department`, MARGIN + 120, y)
  y += 14
  doc.text('Keterangan', MARGIN + 15, y)
  doc.text(`:  Mewakili Manajemen Perusahaan (${company})`, MARGIN + 120, y)
  y += 20

  // 2. PIHAK KEDUA (Penerima)
  doc.setFont('helvetica', 'bold')
  doc.text('II. PIHAK KEDUA (Yang Menerima):', MARGIN, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.text('Nama Karyawan', MARGIN + 15, y)
  doc.text(`:  ${employee?.name || '-'}`, MARGIN + 120, y)
  y += 14
  doc.text('NIK', MARGIN + 15, y)
  doc.text(`:  ${employee?.nik || '-'}`, MARGIN + 120, y)
  y += 14
  doc.text('Jabatan / Posisi', MARGIN + 15, y)
  doc.text(`:  ${employee?.position || employee?.jobPosition || '-'}`, MARGIN + 120, y)
  y += 14
  doc.text('Departemen', MARGIN + 15, y)
  doc.text(`:  ${employee?.dept || '-'}`, MARGIN + 120, y)
  y += 24

  // 3. TABEL DETAIL ASET
  doc.setFont('helvetica', 'bold')
  doc.text('III. RINCIAN FASILITAS / ASET YANG DISERAHKAN:', MARGIN, y)
  y += 14

  // Table background & border
  const tableX = MARGIN
  const tableW = w - MARGIN * 2
  const rows = [
    ['Kode / Tag Aset', asset?.assetCode || '-'],
    ['Nama Aset', asset?.name || '-'],
    ['Kategori', asset?.category?.replace(/_/g, ' ') || '-'],
    ['Merk & Model', `${asset?.brand || ''} ${asset?.model || ''}`.trim() || '-'],
    ['Nomor Seri / IMEI / Nopol', asset?.serialNumber || asset?.plateNumber || '-'],
    ['Spesifikasi Teknis', asset?.specifications || '-'],
    ['Kondisi Fisik Saat Serah', asset?.condition || 'Baik'],
    ['Kelengkapan Aksesoris', accessories || '- (Unit Saja)'],
  ]

  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.rect(tableX, y, tableW, rows.length * 18, 'F')
  doc.rect(tableX, y, tableW, rows.length * 18, 'S')

  rows.forEach(([label, value], idx) => {
    const rowY = y + idx * 18 + 13
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(label, tableX + 12, rowY)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(`:  ${String(value).substring(0, 75)}`, tableX + 140, rowY)

    if (idx < rows.length - 1) {
      doc.setDrawColor(226, 232, 240)
      doc.line(tableX, y + (idx + 1) * 18, tableX + tableW, y + (idx + 1) * 18)
    }
  })

  y += rows.length * 18 + 20

  // 4. KETENTUAN DAN TANGGUNG JAWAB
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text('IV. KETENTUAN PENGGUNAAN & TANGGUNG JAWAB:', MARGIN, y)
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  const clauses = [
    '1. Fasilitas/Aset di atas diserahkan dalam keadaan berfungsi baik dan semata-mata digunakan untuk kepentingan pekerjaan kedinasan.',
    '2. PIHAK KEDUA berkewajiban merawat, menjaga kebersihan, keamanan, dan keutuhan aset dari risiko kerusakan atau kehilangan.',
    '3. Dilarang memindahtangankan, meminjamkan ke pihak luar, atau merubah spesifikasi teknis aset tanpa izin tertulis dari manajemen.',
    '4. Apabila terjadi kehilangan atau kerusakan akibat kelalaian, PIHAK KEDUA bersedia bertanggung jawab sesuai regulasi perusahaan.',
    '5. PIHAK KEDUA wajib mengembalikan aset dalam kondisi lengkap saat mutasi, demosi, atau mengakhiri hubungan kerja (offboarding).',
  ]

  clauses.forEach((c) => {
    doc.text(c, MARGIN, y)
    y += 12
  })

  y += 15

  // 5. BLOK TANDA TANGAN
  const col1 = MARGIN + 20
  const col2 = w / 2 - 40
  const col3 = w - MARGIN - 120

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)

  doc.text('PIHAK PERTAMA', col1, y)
  doc.text('(Yang Menyerahkan)', col1 - 5, y + 12)

  doc.text('PIHAK KEDUA', col2 + 20, y)
  doc.text('(Yang Menerima)', col2 + 15, y + 12)

  doc.text('MENGETAHUI', col3 + 15, y)
  doc.text('(Atasan / HR Head)', col3 + 5, y + 12)

  y += 60

  doc.setFont('helvetica', 'bold')
  doc.text(`( ${picName} )`, col1 - 10, y)
  doc.text(`( ${employee?.name || 'Karyawan'} )`, col2, y)
  doc.text(`( Management )`, col3 + 10, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(`Dicetak otomatis dari San PeopleHub pada ${new Date().toLocaleString('id-ID')}`, w / 2, doc.internal.pageSize.getHeight() - 25, { align: 'center' })

  const safeFilename = `BAST_Pinjam_${(asset?.assetCode || 'AST').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(employee?.name || 'Karyawan').replace(/\s+/g, '_')}.pdf`
  doc.save(safeFilename)
  return safeFilename
}

/**
 * Generate Berita Acara Serah Terima (BAST) Pengembalian Aset
 */
export async function generateReturnBastPdf({
  company = 'San PeopleHub',
  asset,
  employee,
  picName = 'HR / GA Department',
  accessories = '',
  notes = '',
  bastNumber = '',
  returnDate = new Date(),
  condition = 'Baik',
}) {
  const doc = await newDoc()
  const w = doc.internal.pageSize.getWidth()

  let y = drawHeader(
    doc,
    company,
    'BERITA ACARA PENGEMBALIAN ASET PERUSAHAAN',
    '(Company Asset Return / Clearance Certificate)',
    bastNumber || `BAST/RET/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${asset?.assetCode || '001'}`
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)

  const openingText = `Pada hari ini, ${fmtDayDate(returnDate)}, telah diserahkan kembali aset / fasilitas kerja milik perusahaan dari PIHAK KEDUA (Karyawan) kepada PIHAK PERTAMA (Manajemen Perusahaan) dengan rincian sebagai berikut:`
  const splitOpening = doc.splitTextToSize(openingText, w - MARGIN * 2)
  doc.text(splitOpening, MARGIN, y)
  y += splitOpening.length * 14 + 10

  // DATA KARYAWAN PENGEMBALI
  doc.setFont('helvetica', 'bold')
  doc.text('I. DATA KARYAWAN (Yang Mengembalikan):', MARGIN, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.text('Nama Karyawan', MARGIN + 15, y)
  doc.text(`:  ${employee?.name || '-'}`, MARGIN + 120, y)
  y += 14
  doc.text('NIK', MARGIN + 15, y)
  doc.text(`:  ${employee?.nik || '-'}`, MARGIN + 120, y)
  y += 14
  doc.text('Jabatan / Dept', MARGIN + 15, y)
  doc.text(`:  ${employee?.position || '-'} / ${employee?.dept || '-'}`, MARGIN + 120, y)
  y += 20

  // DETAIL ASET
  doc.setFont('helvetica', 'bold')
  doc.text('II. RINCIAN ASET YANG DIKEMBALIKAN:', MARGIN, y)
  y += 14

  const tableX = MARGIN
  const tableW = w - MARGIN * 2
  const rows = [
    ['Kode / Tag Aset', asset?.assetCode || '-'],
    ['Nama Aset', asset?.name || '-'],
    ['Kategori', asset?.category?.replace(/_/g, ' ') || '-'],
    ['Merk & Model', `${asset?.brand || ''} ${asset?.model || ''}`.trim() || '-'],
    ['Nomor Seri / IMEI / Nopol', asset?.serialNumber || asset?.plateNumber || '-'],
    ['Kondisi Saat Dikembalikan', condition || 'Baik'],
    ['Kelengkapan Aksesoris', accessories || '- (Lengkap)'],
    ['Catatan / Pemeriksaan Fisik', notes || '- (Tidak ada kerusakan)'],
  ]

  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.rect(tableX, y, tableW, rows.length * 18, 'F')
  doc.rect(tableX, y, tableW, rows.length * 18, 'S')

  rows.forEach(([label, value], idx) => {
    const rowY = y + idx * 18 + 13
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(label, tableX + 12, rowY)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(`:  ${String(value).substring(0, 75)}`, tableX + 150, rowY)

    if (idx < rows.length - 1) {
      doc.setDrawColor(226, 232, 240)
      doc.line(tableX, y + (idx + 1) * 18, tableX + tableW, y + (idx + 1) * 18)
    }
  })

  y += rows.length * 18 + 24

  // PERNYATAAN BEBAS TANGGUNG JAWAB (CLEARANCE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text('III. PERNYATAAN PELEPASAN TANGGUNG JAWAB (ASSET CLEARANCE):', MARGIN, y)
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const clearanceText =
    'Dengan ditandatanganinya Berita Acara ini dan telah diverifikasinya kondisi fisik aset oleh pihak pemeriksa, maka PIHAK KEDUA dinyatakan TELAH MENYELESAIKAN kewajiban pengembalian aset tersebut di atas dan DIBEBASKAN dari tanggung jawab pemegang fasilitas tersebut.'
  const splitClearance = doc.splitTextToSize(clearanceText, w - MARGIN * 2)
  doc.text(splitClearance, MARGIN, y)
  y += splitClearance.length * 13 + 30

  // TANDA TANGAN
  const col1 = MARGIN + 25
  const col2 = w / 2 - 35
  const col3 = w - MARGIN - 120

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)

  doc.text('YANG MENGEMBALIKAN', col1 - 10, y)
  doc.text('(Karyawan)', col1 + 10, y + 12)

  doc.text('YANG MENERIMA', col2 + 10, y)
  doc.text('(Petugas HR / GA / IT)', col2, y + 12)

  doc.text('MENGETAHUI', col3 + 15, y)
  doc.text('(Management)', col3 + 10, y + 12)

  y += 65

  doc.setFont('helvetica', 'bold')
  doc.text(`( ${employee?.name || 'Karyawan'} )`, col1 - 10, y)
  doc.text(`( ${picName} )`, col2, y)
  doc.text(`( HR / GA Manager )`, col3 - 5, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(`Dicetak otomatis dari San PeopleHub pada ${new Date().toLocaleString('id-ID')}`, w / 2, doc.internal.pageSize.getHeight() - 25, { align: 'center' })

  const safeFilename = `BAST_Kembali_${(asset?.assetCode || 'AST').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(employee?.name || 'Karyawan').replace(/\s+/g, '_')}.pdf`
  doc.save(safeFilename)
  return safeFilename
}
