import fs from 'fs'
import path from 'path'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ImageRun,
} from 'docx'

const COLOR_NAVY = '052B52'
const COLOR_TEAL = '039299'
const COLOR_DARK_GRAY = '334155'
const COLOR_LIGHT_BG = 'F8FAFC'
const COLOR_BORDER = 'CBD5E1'
const COLOR_SUCCESS_BG = 'DCFCE7'
const COLOR_SUCCESS_TEXT = '166534'
const COLOR_INFO_BG = 'E0F2FE'
const COLOR_INFO_TEXT = '0369A1'
const COLOR_DANGER_BG = 'FEE2E2'
const COLOR_DANGER_TEXT = '991B1B'

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
}

const noBorders = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
}

const calloutBorders = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_TEAL },
  right: { style: BorderStyle.NONE },
}

function makeCallout(text, boldPrefix = '') {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: calloutBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_INFO_BG },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  ...(boldPrefix
                    ? [new TextRun({ text: boldPrefix + ' ', bold: true, color: COLOR_INFO_TEXT, size: 20, font: 'Calibri' })]
                    : []),
                  new TextRun({ text, color: COLOR_INFO_TEXT, size: 20, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function h1(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 340, after: 120 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 26,
        color: COLOR_NAVY,
        font: 'Calibri',
      }),
    ],
  })
}

function h2(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 100 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 22,
        color: COLOR_TEAL,
        font: 'Calibri',
      }),
    ],
  })
}

function p(text, options = {}) {
  const { bold = false, italics = false, color = COLOR_DARK_GRAY, before = 40, after = 80 } = options
  return new Paragraph({
    spacing: { before, after },
    children: [
      new TextRun({
        text,
        bold,
        italics,
        color,
        size: 20,
        font: 'Calibri',
      }),
    ],
  })
}

function bullet(text, boldPrefix = '') {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 30, after: 50 },
    children: [
      ...(boldPrefix ? [new TextRun({ text: boldPrefix + ' ', bold: true, color: COLOR_NAVY, size: 20, font: 'Calibri' })] : []),
      new TextRun({ text, color: COLOR_DARK_GRAY, size: 20, font: 'Calibri' }),
    ],
  })
}

function makeImageParagraph(imagePath, width = 580, height = 290, caption = '') {
  if (!fs.existsSync(imagePath)) {
    console.warn(`Warning: Image not found at ${imagePath}`)
    return [new Paragraph({ children: [new TextRun({ text: `[Image not found: ${imagePath}]`, color: 'DC2626' })] })]
  }
  const imgBuffer = fs.readFileSync(imagePath)
  const elements = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 50 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: { width, height },
        }),
      ],
    }),
  ]
  if (caption) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 160 },
        children: [
          new TextRun({
            text: caption,
            italics: true,
            size: 18,
            color: '64748B',
            font: 'Calibri',
          }),
        ],
      })
    )
  }
  return elements
}

async function generateDocx() {
  console.log('Generating UAT Test Scenarios Word Document (.docx)...')

  const children = []

  // Document Title Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 100 },
      children: [
        new TextRun({
          text: 'PEOPLEHUB HUMAN CAPITAL MANAGEMENT',
          bold: true,
          size: 26,
          color: COLOR_NAVY,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: 'DOKUMEN PROTOKOL PENGUJIAN USER ACCEPTANCE TESTING (UAT)',
          bold: true,
          size: 30,
          color: COLOR_TEAL,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 140 },
      children: [
        new TextRun({
          text: 'Skenario Uji Coba Komprehensif: Keterlambatan, Izin Setengah Hari, Cuti Sakit, Lembur, dan Kalkulator Payroll',
          bold: true,
          size: 21,
          color: COLOR_NAVY,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 260 },
      children: [
        new TextRun({
          text: 'Panduan Eksekusi Pengujian 25 Kasus Uji, Data Personas, Formula Matematis, dan Lembar Pengesahan Resmi',
          italics: true,
          size: 19,
          color: COLOR_DARK_GRAY,
          font: 'Calibri',
        }),
      ],
    }),
  )

  // Metadata Table
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({ text: 'Versi Dokumen: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: '1.0 (Final UAT Ready)', size: 19, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: 'Total Kasus Uji: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: '25 Skenario Terverifikasi', size: 19, font: 'Calibri' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({ text: 'Target Pengujian: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: 'HR Operations, Finance & Payroll, User Reps', size: 19, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: 'Siklus Payroll: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: 'Cut-Off Tgl 26-25, Transfer Tgl 29, Komisi Tgl 15', size: 19, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
  children.push(metaTable)

  children.push(
    new Paragraph({ spacing: { before: 180, after: 100 }, children: [] })
  )

  children.push(
    makeCallout(
      'Dokumen ini dirancang khusus untuk memandu pelaksanaan User Acceptance Testing (UAT) sebelum sistem PeopleHub HCM dinyatakan Go-Live. Seluruh skenario pengujian mencakup verifikasi matematis terhadap aturan pemotongan keterlambatan, denda berjenjang, izin setengah hari, pemotongan cuti sakit khusus (hanya memotong transport), lembur HO vs Gudang, pengajuan surat dokter backdate, reward kehadiran penuh, dan simulasi rekapitulasi gaji bulanan.',
      'TUJUAN UAT:'
    )
  )

  // ── BAB I ──
  children.push(h1('BAB I. Standar Parameter & Data Profil Karyawan Uji (Test Personas)'))
  children.push(
    p(
      'Agar proses pengujian angka berjalan secara objektif, dapat diulang (repeatable), dan bebas dari kerancuan, pengujian menggunakan 3 profil karyawan uji coba yang mencakup variasi lokasi kerja (Head Office, Gudang, dan Livestreaming):'
    )
  )

  const personaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Parameter Uji', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Persona 1: Staf HO', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Persona 2: Staf Gudang', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Persona 3: Host Live', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Nama / NIK', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Budi Santoso / EMP-HO-001', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Joko Wahyudi / EMP-GD-002', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Siti Rahma / EMP-LS-003', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Lokasi Kerja', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Head Office (HO)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Gudang (Warehouse)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Studio Livestream', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Total Gaji Gross', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 8.000.000', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 4.500.000', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 5.000.000', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Komposisi Gaji', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('• Basic (75%): Rp 6.000.000\n• Transport (15%): Rp 1.200.000\n• NPA (10%): Rp 800.000', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('• Basic: Rp 3.375.000\n• Tunj. Tetap: Rp 675.000\n• Tunj. Hadir: Rp 450.000', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('• Basic: Rp 3.750.000\n• Operasional: Rp 750.000\n• Sesi: Rp 500.000 + Komisi', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Hari Kerja Cut-Off (HKE)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('22 Hari Kerja (Senin-Jumat)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('25 Hari Kerja (Senin-Sabtu)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('20 Sesi Terjadwal', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Nilai 1 Hari (Gross/HKE)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 363.636 / hari', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 180.000 / hari', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 250.000 / sesi', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Nilai 1/2 Hari Kerja', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 181.818', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 90.000', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 125.000', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Nilai Transport Harian', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 54.545 / hari', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rp 18.000 / hari', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Sesuai Sesi', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Rate Lembur / Jam', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Basic/22/8 = Rp 34.091/jam', { bold: true, color: COLOR_INFO_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('• Senin-Sabtu: Flat Rp 15.000\n• Minggu/Merah: Flat Rp 25.000', { bold: true, color: COLOR_INFO_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Fee Jam Tambahan Sesi', { before: 0, after: 0 })] }),
        ],
      }),
    ],
  })
  children.push(personaTable)

  children.push(h2('1.1. Alur Arsitektur Pengujian UAT'))
  children.push(
    p(
      'Gambar berikut memperlihatkan alur keterhubungan pengujian mulai dari input absensi berbagai perangkat, engine evaluasi aturan, kalkulator formula payroll, hingga output disbursement transfer bank:'
    )
  )

  // Embed Diagram
  children.push(
    ...makeImageParagraph(
      'scripts/diagrams/diagram_uat_architecture.png',
      560,
      280,
      'Gambar 1: Alur Pemrosesan UAT — Dari Data Input Presensi, Mesin Aturan, HO Payroll Engine, hingga Output Transfer Bank'
    )
  )

  // ── BAB II ──
  children.push(h1('BAB II. Matriks Pengujian Lengkap: 25 Kasus Uji UAT (11 Klaster)'))

  const testCases = [
    {
      cluster: 'Klaster 1: Keterlambatan (Late Arrival / Late In)',
      cases: [
        { id: 'UAT-LAT-01', title: 'Presensi Masuk Tepat Waktu (Dalam Grace Period)', input: 'Jam kerja 09:00, toleransi 10 mnt, clock-in 09:07.', expected: 'Status: Present, Menit Telat: 0 mnt, Denda: Rp 0.' },
        { id: 'UAT-LAT-02', title: 'Keterlambatan Ringan (Tier 1: 1–15 Menit)', input: 'Jam 09:00, toleransi 0 mnt, clock-in 09:12 (telat 12 mnt).', expected: 'Status: Late, Menit Telat: 12 mnt, Denda Keterlambatan: Rp 10.000.' },
        { id: 'UAT-LAT-03', title: 'Keterlambatan Sedang (Tier 2: 16–30 Menit)', input: 'Jam 09:00, clock-in 09:25 (telat 25 mnt).', expected: 'Status: Late, Menit Telat: 25 mnt, Denda Keterlambatan: Rp 25.000.' },
        { id: 'UAT-LAT-04', title: 'Keterlambatan Berat (Tier 3: 31–60 Menit)', input: 'Jam 09:00, clock-in 09:45 (telat 45 mnt).', expected: 'Status: Late, Menit Telat: 45 mnt, Denda Keterlambatan: Rp 50.000.' },
        { id: 'UAT-LAT-05', title: 'Keterlambatan Parah (> 60 Menit — Potong 1/2 Hari)', input: 'Jam 09:00, clock-in 10:15 (telat 75 mnt), Gross Rp 8.000.000.', expected: 'Status: Late (Half-Day Cut), Potongan: Rp 181.818, Reward Hadir: HANGUS.' },
        { id: 'UAT-LAT-06', title: 'Keterlambatan Sesi Khusus Live Streaming', input: 'Sesi live 13:00, host check-in 13:03 (telat 3 mnt).', expected: 'Status: Late Sesi Live, Denda Flat: Rp 50.000 memotong komisi sesi.' },
      ],
    },
    {
      cluster: 'Klaster 2: Pulang Lebih Cepat (Early Departure / Early Out)',
      cases: [
        { id: 'UAT-EAR-01', title: 'Pulang Awal dengan Izin Disetujui Atasan', input: 'Jam pulang 18:00, pulang 16:00 dengan form izin approved di MSS.', expected: 'Status: Early Out Approved, tidak kena denda alpa, jam tercatat resmi.' },
        { id: 'UAT-EAR-02', title: 'Pulang Awal Tanpa Izin (> 60 Menit Sebelum Waktunya)', input: 'Jam pulang 18:00, clock-out 16:30 (90 mnt awal) tanpa pengajuan form.', expected: 'Status: Early Out Unapproved, potongan denda / potong setengah hari Rp 181.818.' },
      ],
    },
    {
      cluster: 'Klaster 3: Izin Setengah Hari (Half-Day Leave)',
      cases: [
        { id: 'UAT-HLF-01', title: 'Izin Setengah Hari Pagi (Masuk Jam 13:00)', input: 'Jam normal 09:00-18:00, izin pagi disetujui, masuk 13:00, Gross Rp 8jt.', expected: 'Potongan Setengah Hari: (8.000.000/22)/2 = Rp 181.818, kuota cuti tahunan utuh.' },
        { id: 'UAT-HLF-02', title: 'Izin Setengah Hari Siang (Pulang Jam 13:00)', input: 'Karyawan Gudang masuk 09:00, pulang 13:00, Gross Rp 4.5jt / 25 HKE.', expected: 'Nilai 1 Hari Gudang Rp 180.000. Potongan Setengah Hari: 180.000/2 = Rp 90.000.' },
      ],
    },
    {
      cluster: 'Klaster 4: Cuti Sakit (Sick Leave) & Aturan Backdate Surat Dokter',
      cases: [
        { id: 'UAT-SCK-01', title: 'Sakit dengan Surat Dokter Resmi (Tepat Waktu)', input: 'Sakit 2 hari, upload surat dokter approved, Transport Rp 1.200.000 / 22 HKE.', expected: 'Gaji Pokok & NPA UTUH 100%. Hanya Transport dipotong: (1.200.000/22)*2 = Rp 109.091.' },
        { id: 'UAT-SCK-02', title: 'Sakit Tanpa Surat Dokter (Ditolak HRD)', input: 'Sakit 1 hari tanpa bukti surat dokter, HR reject status sakit.', expected: 'Dikonversi otomatis ke Mangkir/Unpaid, potong 1 hari gross Rp 363.636, reward hangus.' },
        { id: 'UAT-SCK-03', title: 'Pengajuan Surat Dokter Backdate (Dalam Batas H+2)', input: 'Sakit tgl 10 Okt, masuk kembali tgl 12 Okt (H+2) ajukan backdate surat dokter.', expected: 'Diterima sistem, status tanggal 10 Okt berubah ke Sick Leave, hanya potong transport Rp 54.545.' },
        { id: 'UAT-SCK-04', title: 'Pengajuan Surat Dokter Backdate Kedaluwarsa (> H+2)', input: 'Sakit tgl 01 Okt, baru diajukan tanggal 10 Okt (H+9).', expected: 'Sistem tolak dengan alert melebihi H+2, terkunci butuh approval HR Head atau tetap Alpa.' },
      ],
    },
    {
      cluster: 'Klaster 5: Perhitungan Lembur (Overtime HO, Gudang, & Depnaker)',
      cases: [
        { id: 'UAT-OVT-01', title: 'Lembur Karyawan HO Hari Kerja Biasa', input: 'Basic Rp 6jt / 22 HKE, lembur 18:00 s/d 21:00 (3 jam), approved sblm tgl 25.', expected: 'Rate HO: (6.000.000/22)/8 = Rp 34.091/jam. Uang Lembur: 34.091 * 3 = Rp 102.273.' },
        { id: 'UAT-OVT-02', title: 'Lembur Karyawan HO Lintas Tengah Malam (Overnight)', input: 'Mulai 20:00 s/d 02:20 besok (durasi 6.33 jam), Rate HO Rp 34.091/jam.', expected: 'Durasi terhitung akurat 6.33 jam tanpa error negatif. Uang Lembur: Rp 215.910.' },
        { id: 'UAT-OVT-03', title: 'Lembur Gudang Hari Kerja (Senin s/d Sabtu)', input: 'Karyawan Gudang lembur Selasa 4 jam, aturan gudang flat Rp 15.000/jam.', expected: 'Rate Gudang Flat Rp 15.000/jam. Total Uang Lembur: 4 * 15.000 = Rp 60.000.' },
        { id: 'UAT-OVT-04', title: 'Lembur Gudang Hari Minggu / Tanggal Merah', input: 'Karyawan Gudang lembur Minggu 6 jam, aturan gudang libur Rp 25.000/jam.', expected: 'Rate Gudang Khusus Flat Rp 25.000/jam. Total Uang Lembur: 6 * 25.000 = Rp 150.000.' },
        { id: 'UAT-OVT-05', title: 'Batas Waktu Approval Lembur (Cut-Off Tgl 25)', input: 'Lembur diajukan 20 Okt, status s/d 25 Okt pending, baru diapprove 27 Okt.', expected: 'Tidak masuk ke payroll cut-off tgl 29 bulan ini, otomatis di-carry over ke payroll bulan depan.' },
      ],
    },
    {
      cluster: 'Klaster 6: Mangkir / Unpaid Leave (Alpa)',
      cases: [
        { id: 'UAT-ABS-01', title: 'Mangkir 1 Hari Kerja (Tanpa Keterangan)', input: 'Karyawan HO alpa 1 hari, Gross Rp 8.000.000 / 22 HKE.', expected: 'Potongan Mangkir: (8.000.000/22)*1 = Rp 363.636, Reward Kehadiran Penuh: HANGUS.' },
        { id: 'UAT-ABS-02', title: 'Mangkir 3 Hari Berturut-turut (Pemicu Alert SP)', input: 'Karyawan tidak hadir 3 hari berturut-turut tanpa izin.', expected: 'Potongan Gaji: 3 * 363.636 = Rp 1.090.908. Alert HRD: Rekomendasi Surat Panggilan / SP.' },
      ],
    },
    {
      cluster: 'Klaster 7: Cuti Tahunan, Cuti Bersama, & Cuti Khusus',
      cases: [
        { id: 'UAT-LVE-01', title: 'Cuti Tahunan (Gaji Dibayar Utuh 100%)', input: 'Ambil cuti tahunan 3 hari approved, Gross Rp 8.000.000.', expected: 'Sisa kuota berkurang 3 hari, Gaji Gross & Transport tetap dibayar penuh 100% (potongan Rp 0).' },
        { id: 'UAT-LVE-02', title: 'Cuti Bersama Pemerintah (Tidak Memotong Cuti Tahunan)', input: 'Hari Libur Cuti Bersama 3 hari aktif di sistem (sesuai TOR 4.3).', expected: 'Karyawan libur, kuota cuti tahunan TETAP tidak berkurang, gaji dibayar penuh.' },
        { id: 'UAT-LVE-03', title: 'Aturan Carry Over Cuti Tahunan (Maksimal 3 Hari)', input: 'Sisa cuti akhir tahun ada 5 hari, aturan bawa maksimal 3 hari (sesuai TOR 4.3).', expected: 'Kuota terbawa ke tahun baru: 3 hari, 2 hari hangus otomatis. Kuota baru: 12 + 3 = 15 hari.' },
        { id: 'UAT-LVE-04', title: 'Cuti Khusus Berbayar (Pernikahan Karyawan: 3 Hari)', input: 'Karyawan ajukan cuti menikah 3 hari lampirkan bukti.', expected: 'Kuota tahunan tidak berkurang, gaji dibayar penuh 100% tanpa potongan apa pun.' },
      ],
    },
    {
      cluster: 'Klaster 8: Presensi Khusus Sales Luar Kota & Livestreaming',
      cases: [
        { id: 'UAT-SLS-01', title: 'Presensi Sales Luar Kota Dalam Radius Geofencing (300m)', input: 'Sales clock-in jarak 85 meter dari titik toko mitra yang terdaftar.', expected: 'Presensi Sukses, status Present Area Sales, tanpa modal peringatan.' },
        { id: 'UAT-SLS-02', title: 'Presensi Sales di Luar Radius / Mock GPS (Mode Peringatan)', input: 'Sales clock-in jarak 1.2 Km dari titik toko terdaftar.', expected: 'Muncul Modal Peringatan Mode B, wajib isi form alasan & foto selfie, flagged di rekap HR.' },
        { id: 'UAT-LIV-01', title: 'Perhitungan Jam Kerja Host Livestreaming Berbasis Sesi', input: 'Jadwal sesi sore 14:00 - 18:00 (4 jam), host check-in 13:58 & check-out 18:02.', expected: 'Sesi tervalidasi 1 sesi penuh (4 jam), berhak menerima fee sesi dasar + komisi GMV live.' },
      ],
    },
    {
      cluster: 'Klaster 9: Reward Kehadiran Penuh (Uang Kerajinan)',
      cases: [
        { id: 'UAT-REW-01', title: 'Karyawan Hadir Sempurna 100% Selama 1 Periode Cut-Off', input: 'Hadir 22 hari, 0 menit telat, 0 alpa, 0 pulang awal, reward Rp 300.000.', expected: 'Reward Kehadiran Penuh Cair Rp 300.000 pada slip gaji transfer tgl 29.' },
        { id: 'UAT-REW-02', title: 'Karyawan Terlambat 1 Kali (Walau Hanya 7 Menit)', input: 'Hadir 22 hari, tapi ada terlambat 1 kali 7 menit melebihi toleransi.', expected: 'Syarat kehadiran sempurna gugur, Reward Kehadiran Penuh HANGUS (Rp 0).' },
      ],
    },
    {
      cluster: 'Klaster 10: Prorata Gaji Karyawan Masuk / Keluar Tengah Bulan',
      cases: [
        { id: 'UAT-PRO-01', title: 'Karyawan Baru Masuk (Join) di Tengah Periode Cut-Off', input: 'Cut-off 26 Sep-25 Okt (22 HKE), Join Date 10 Okt, aktif 12 hari, Gross Rp 8jt.', expected: 'Nilai 1 hari Rp 363.636. Gaji Prorata Gross: 363.636 * 12 hari = Rp 4.363.636.' },
        { id: 'UAT-PRO-02', title: 'Karyawan Resign di Tengah Periode Cut-Off', input: 'Resign Date 15 Okt, menjalani 14 hari kerja aktif dari 22 HKE, Gross Rp 8jt.', expected: 'Gaji Prorata Gross: (8.000.000/22) * 14 hari = Rp 5.090.909 dibayar di slip terakhir.' },
      ],
    },
    {
      cluster: 'Klaster 11: Rekapitulasi Akhir Penggajian (Gross to Net)',
      cases: [
        { id: 'UAT-PAY-01', title: 'Kalkulasi Lengkap Penggajian Bulanan Budi Santoso', input: 'Gross Rp 8jt + Lembur Rp 102.273 - Telat Rp 25k - 1/2 Hari Rp 181.818 - Sakit Rp 54.545.', expected: 'Total Pendapatan Rp 8.102.273, Total Potongan Rp 261.363, Gross Penyesuaian Rp 7.840.910.' },
        { id: 'UAT-PAY-02', title: 'Verifikasi Siklus Tanggal Pembayaran & Slip Gaji ESS', input: 'Cut-off tgl 25 Okt, generate transfer BCA tgl 29 Okt, komisi marketing tgl 15 Nov.', expected: 'File bank transfer tgl 29 terbentuk presisi, slip gaji publish di ESS, komisi tgl 15 terpisah.' },
      ],
    },
  ]

  testCases.forEach((sec, sIdx) => {
    children.push(h2(sec.cluster))

    const rows = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_NAVY }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: 'ID Kasus', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_NAVY }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: 'Skenario & Data Uji', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_NAVY }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: 'Hasil yang Diharapkan (Expected Result)', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })] }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_NAVY }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: 'Status UAT', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })] }),
        ],
      }),
    ]

    sec.cases.forEach((tc) => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p(tc.id, { bold: true, color: COLOR_NAVY, before: 0, after: 0 })] }),
            new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p(tc.title, { bold: true, before: 0, after: 20 }), p(tc.input, { italics: true, color: '475569', before: 0, after: 0 })] }),
            new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p(tc.expected, { before: 0, after: 0 })] }),
            new TableCell({ shading: { fill: COLOR_LIGHT_BG }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p('[  ] PASS\n[  ] FAIL', { bold: true, color: '64748B', before: 0, after: 0 })] }),
          ],
        })
      )
    })

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: cellBorders, rows }))
    children.push(new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }))
  })

  // ── BAB III ──
  children.push(h1('BAB III. Lembar Pengesahan Resmi UAT (Sign-Off Protocol)'))
  children.push(
    p(
      'Setelah seluruh 25 kasus uji di atas dieksekusi dan diverifikasi bersama, lembar persetujuan berikut ditandatangani oleh seluruh perwakilan pemangku kepentingan sebagai tanda sah penerimaan sistem:'
    )
  )

  const signTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            colSpan: 4,
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'LEMBAR PENGESAHAN HASIL PENGUJIAN USER ACCEPTANCE TESTING (UAT)',
                    bold: true,
                    color: 'FFFFFF',
                    size: 19,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_LIGHT_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Perwakilan HR Operations', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_LIGHT_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Perwakilan Finance & Payroll', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_LIGHT_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Perwakilan Karyawan / User', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_LIGHT_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Lead Implementor PeopleHub', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 200, bottom: 60, left: 100, right: 100 }, children: [p('Nama: ____________________\nTgl:   ____________________\nTtd:   ____________________', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 200, bottom: 60, left: 100, right: 100 }, children: [p('Nama: ____________________\nTgl:   ____________________\nTtd:   ____________________', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 200, bottom: 60, left: 100, right: 100 }, children: [p('Nama: ____________________\nTgl:   ____________________\nTtd:   ____________________', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 200, bottom: 60, left: 100, right: 100 }, children: [p('Nama: ____________________\nTgl:   ____________________\nTtd:   ____________________', { before: 0, after: 0 })] }),
        ],
      }),
    ],
  })
  children.push(signTable)

  // Document Footer note
  children.push(
    new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }),
    makeCallout(
      'Dokumen protokol UAT ini menjadi acuan hukum dan operasional bersama. Keberhasilan pengujian seluruh skenario di atas menandakan bahwa sistem PeopleHub HCM telah siap dioperasikan secara penuh untuk penggajian bulan berjalan.',
      'KESIMPULAN UAT:'
    )
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'PeopleHub HCM — Protokol & Skenario Pengujian UAT Presensi & Payroll',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Halaman ', size: 16, color: '94A3B8', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8', font: 'Calibri' }),
                  new TextRun({ text: ' dari ', size: 16, color: '94A3B8', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8', font: 'Calibri' }),
                  new TextRun({ text: '  |  Dokumen Resmi Verifikasi UAT', size: 16, color: '94A3B8', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const targetPath = 'C:/Users/lahirs/.gemini/antigravity/brain/0150dd40-c12f-414d-a7be-64cae4a8de9d/Skenario_UAT_Perhitungan_Presensi_dan_Payroll_PeopleHub.docx'
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(targetPath, buffer)
  console.log(`UAT Word document generated at: ${targetPath} (${buffer.length} bytes)`)
}

generateDocx().catch((err) => {
  console.error('Error generating docx:', err)
  process.exit(1)
})
