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
const COLOR_WARN_BG = 'FEF3C7'
const COLOR_WARN_TEXT = '92400E'
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

const warningCalloutBorders = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.SINGLE, size: 24, color: 'DC2626' },
  right: { style: BorderStyle.NONE },
}

function makeCallout(text, boldPrefix = '', isWarning = false) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: isWarning ? warningCalloutBorders : calloutBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: isWarning ? COLOR_DANGER_BG : COLOR_INFO_BG },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  ...(boldPrefix
                    ? [new TextRun({ text: boldPrefix + ' ', bold: true, color: isWarning ? COLOR_DANGER_TEXT : COLOR_INFO_TEXT, size: 21, font: 'Calibri' })]
                    : []),
                  new TextRun({ text, color: isWarning ? COLOR_DANGER_TEXT : COLOR_INFO_TEXT, size: 21, font: 'Calibri' }),
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
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28,
        color: COLOR_NAVY,
        font: 'Calibri',
      }),
    ],
  })
}

function h2(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 23,
        color: COLOR_TEAL,
        font: 'Calibri',
      }),
    ],
  })
}

function p(text, options = {}) {
  const { bold = false, italics = false, color = COLOR_DARK_GRAY, before = 60, after = 100 } = options
  return new Paragraph({
    spacing: { before, after },
    children: [
      new TextRun({
        text,
        bold,
        italics,
        color,
        size: 21,
        font: 'Calibri',
      }),
    ],
  })
}

function bullet(text, boldPrefix = '') {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60 },
    children: [
      ...(boldPrefix ? [new TextRun({ text: boldPrefix + ' ', bold: true, color: COLOR_NAVY, size: 21, font: 'Calibri' })] : []),
      new TextRun({ text, color: COLOR_DARK_GRAY, size: 21, font: 'Calibri' }),
    ],
  })
}

function makeImageParagraph(imagePath, width = 600, height = 300, caption = '') {
  if (!fs.existsSync(imagePath)) {
    console.warn(`Warning: Image not found at ${imagePath}`)
    return new Paragraph({ children: [new TextRun({ text: `[Image not found: ${imagePath}]`, color: 'DC2626' })] })
  }
  const imgBuffer = fs.readFileSync(imagePath)
  const elements = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 60 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: {
            width,
            height,
          },
        }),
      ],
    }),
  ]
  if (caption) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 180 },
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
  console.log('Generating Perbandingan Scope & Justifikasi On-Time Delivery (.docx)...')

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
          text: 'ANALISIS KOMPARATIF RUANG LINGKUP & JUSTIFIKASI TIMELINE',
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
          text: 'Perbandingan Baseline Scope 4.1 - 4.5 vs Nilai Tambah PeopleHub & Rasionalisasi On-Time Delivery',
          bold: true,
          size: 22,
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
          text: 'Dokumen Strategi Manajemen Proyek, Mitigasi Risiko Ketergantungan Odoo ERP, dan Phased Rollout Roadmap',
          italics: true,
          size: 20,
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
                  new TextRun({ text: '1.0 (Official Strategic Delivery Plan)', size: 19, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: 'Tanggal: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: 'November 2026', size: 19, font: 'Calibri' }),
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
                  new TextRun({ text: 'Klasifikasi: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: 'Project Management & Technical Justification', size: 19, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: 'Target Peluncuran: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: 'Go-Live Tepat Waktu (Zero-Delay Commitment)', size: 19, font: 'Calibri' }),
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
    new Paragraph({ spacing: { before: 200, after: 120 }, children: [] })
  )

  // Executive Summary Box
  children.push(
    makeCallout(
      'Dokumen ini memberikan analisis komparatif antara Baseline Scope Proyek (Butir 4.1 s/d 4.5) dengan seluruh kapabilitas PeopleHub HCM. Dokumen ini juga memaparkan landasan metodologi manajemen proyek mengenai keputusan pengalokasian 3 fitur (Pencatatan Surat Peringatan, Perhitungan THR, dan Kustomisasi Gaji Dinamis) ke Fase 2 (Post Go-Live Enhancement) demi menjamin sistem utama Go-Live 100% tepat waktu (On-Time Delivery) tanpa risiko selisih data akuntansi dengan Odoo ERP.',
      'RINGKASAN EKSEKUTIF:'
    )
  )

  // ── BAB I ──
  children.push(h1('BAB I. Evaluasi Pemenuhan Baseline Scope Klien (Scope 4.1 s/d 4.5)'))
  children.push(
    p(
      'Berdasarkan dokumen Kerangka Acuan Kerja (KAK / TOR) yang diajukan oleh calon klien, terdapat 5 area kebutuhan pokok yang mencakup 25 butir spesifikasi teknis operasional. Tim Solusi PeopleHub HCM telah memetakan seluruh butir tersebut dan memastikan bahwa SELURUH kebutuhan dasar tersebut 100% TERPENUHI di dalam arsitektur PeopleHub.'
    )
  )

  const scopeCoverageTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Kode Scope', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Nama Area Kebutuhan', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Status PeopleHub', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Keterangan Pemenuhan', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('4.1', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Skalabilitas & Manajemen Data Karyawan', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ shading: { fill: COLOR_SUCCESS_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('100% Terpenuhi', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Dukungan 200+ user, portal onboarding ESS mandiri, 4 status kepegawaian, dokumen digital, reminder kontrak H-60 s/d H-1.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('4.2', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Manajemen Kehadiran & Penjadwalan Khusus', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ shading: { fill: COLOR_SUCCESS_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('100% Terpenuhi', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Presensi mobile Sales luar kota, mesin fingerprint gudang, jadwal & absensi livestreaming, pemotongan terlambat & pulang awal, reward presensi penuh.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('4.3', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Workflow Persetujuan Mandiri & Terpusat', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ shading: { fill: COLOR_SUCCESS_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('100% Terpenuhi', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Lembur tgl 25, reimbursement dinas, petty cash GA & sales, cuti/izin/pulang awal, cuti bersama owner, manpower request, surat dokter backdate, aset checklist.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('4.4', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Payroll & Komisi (Sinkronisasi & Pelaporan)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ shading: { fill: COLOR_SUCCESS_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('100% Terpenuhi', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Cut-off tgl 26-25, eksekusi transfer tgl 29, download slip gaji ESS, komisi marketing tgl 15, perhitungan livestream, laporan Excel konsultan pajak.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('4.5', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Integrasi REST API ke Odoo ERP & Infrastruktur', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ shading: { fill: COLOR_SUCCESS_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('100% Terpenuhi', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('REST API 2-arah Time Off, Expenses, Payslip, Dokumen. Cloud VPS (2 Core, 8GB RAM, 200GB SSD), UAT, pelatihan, dan garansi pemeliharaan 1 tahun.', { before: 0, after: 0 })] }),
        ],
      }),
    ],
  })
  children.push(scopeCoverageTable)

  children.push(h2('1.1. Prinsip Segitiga Manajemen Proyek (Project Iron Triangle)'))
  children.push(
    p(
      'Di dalam metodologi software delivery, menjaga kestabilan peluncuran sistem memerlukan kedisiplinan mengelola tiga sudut segitiga: Ruang Lingkup (Scope), Waktu (Timeline), dan Kualitas Data (Quality). Ketika tanggal Go-Live adalah komitmen mutlak yang tidak boleh bergeser, maka ruang lingkup pekerjaan harus difokuskan pada transaksi operasional inti harian.'
    )
  )

  // Embed Diagram 1
  children.push(
    ...makeImageParagraph(
      'scripts/diagrams/diagram1_iron_triangle.png',
      560,
      290,
      'Gambar 1: Prinsip Segitiga Manajemen Proyek — Mengunci Scope Inti demi Menjamin Tanggal Go-Live dan Integritas Finansial'
    )
  )

  // ── BAB II ──
  children.push(h1('BAB II. Matriks Fitur Nilai Tambah PeopleHub (Out-of-Scope Capabilities)'))
  children.push(
    p(
      'Selain memenuhi 100% Baseline Scope di atas, arsitektur PeopleHub HCM sesungguhnya memiliki kapabilitas yang jauh melampaui kebutuhan dasar tersebut. Fitur-fitur ini menjadi "bonus kompetitif" yang dapat diaktifkan secara bertahap untuk membawa perusahaan ke level kedewasaan pengelolaan SDM yang lebih tinggi.'
    )
  )

  const valueAddTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_TEAL },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Klaster Nilai Tambah', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_TEAL },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Rincian Fitur Ekstra PeopleHub', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_TEAL },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Manfaat Strategis bagi Perusahaan', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('1. Manajemen Kinerja & Disiplin', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Penilaian bulanan generik (5 dimensi BARS 1-5), Model Hibrida (70% generik + 30% target bebas), modul PIP 1-3 bulan, Talent Pool 9-Box Grid, dan pencatatan sanksi SP 1-3 berjenjang.', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Perusahaan memiliki dasar legalitas tertulis yang objektif dan sah saat menilai bonus, melakukan evaluasi kontrak, atau menerbitkan SP tanpa resiko sengketa PHI.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('2. Siklus Hidup Karyawan (Personnel Action)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Workflow formal Promosi (Promote), Demosi (Demote), Mutasi Divisi (Transfer), Mutasi Lintas Anak Perusahaan, Career Timeline historis, Exit Interview digital, auto-generate Paklaring & BAST Aset PDF.', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Pergerakan karyawan tercatat tertib dan transparan. Tidak ada kenaikan jabatan atau mutasi informal tanpa otorisasi manajemen puncak.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('3. Enterprise Onboarding & OJT', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Bukan sekadar form biodata mandiri, tapi kurikulum orientasi lengkap (video profil, e-sign peraturan perusahaan, tes pemahaman induksi, form lembar kerja OJT, Buddy program, dan cadence review H+30/60/90).', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Mempercepat adaptasi karyawan baru menjadi produktif mandiri dan menekan angka turnover pada 3 bulan pertama.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('4. Pembelajaran & LMS Internal', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Pengelolaan jadwal kelas pelatihan (Course Batches), katalog materi training, registrasi mandiri ESS, ujian pemahaman Pre-Test & Post-Test, dan sertifikat digital.', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Standardisasi kompetensi kerja dan pemenuhan syarat sertifikasi/audit kepatuhan mutu perusahaan.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('5. Visualisasi Struktur Organisasi Interaktif', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Diagram struktur organisasi dinamis yang dapat di-zoom dan dicari (Interactive Org Chart), hirarki pelaporan visual atasan-bawahan, dan standarisasi Job Grade.', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Manajemen dan owner dapat melihat bentang kendali (span of control) seluruh manajer secara real-time.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('6. Komunikasi & Keselamatan Lapangan', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Pengumuman dashboard terparameterisasi dengan filter audiens (divisi/role/cabang) & tombol wajib baca (Mandatory Read), serta tombol darurat Emergency SOS (GPS) untuk tim sales.', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Pesan operasional penting dipastikan sampai ke target karyawan dan memberikan proteksi K3 ekstra bagi karyawan bergerak (mobile).', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('7. Otomatisasi THR & Pajak TER PPh 21', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Kalkulator THR otomatis sesuai Permenaker No. 6/2016 (masa kerja penuh & proporsional), integrasi skema tarif pajak TER (PP 58/2023), dan tanggal transfer auto-roll saat hari libur.', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Menghilangkan hitungan manual Excel saat pembagian THR hari raya dan menjamin kepatuhan pajak penghasilan terbaru.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('8. Multi-Company & Dynamic RBAC', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Dukungan grup multi-perusahaan, menu builder dinamis, kontrol izin akses per menu (View/Create/Edit/Delete/Approve/Export), audit trail log, dan multi-bahasa ID/EN.', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Sistem siap mendukung ekspansi bisnis jika perusahaan mendirikan entitas baru dan aman dari kebocoran data sensitif.', { before: 0, after: 0 })] }),
        ],
      }),
    ],
  })
  children.push(valueAddTable)

  // ── BAB III ──
  children.push(h1('BAB III. Justifikasi Teknis & Alasan 3 Fitur Dialokasikan ke Fase 2'))
  children.push(
    p(
      'Meskipun PeopleHub memiliki kapabilitas luas, tim implementasi secara sadar dan bertanggung jawab merekomendasikan 3 fitur berikut untuk TIDAK DIPAKSAKAN masuk ke dalam Go-Live Fase 1, melainkan dijadwalkan pada Fase 2 (Post Go-Live Enhancement). Keputusan ini diambil murni demi melindungi kepastian tanggal peluncuran (On-Time Delivery).'
    )
  )

  // Embed Diagram 2
  children.push(
    ...makeImageParagraph(
      'scripts/diagrams/diagram2_risk_bottleneck.png',
      560,
      280,
      'Gambar 2: Analisis Potensi Bottleneck & Risiko Keterlambatan Tiga Fitur jika Dipaksakan Masuk Fase 1'
    )
  )

  children.push(h2('3.1. Fitur 1: Pencatatan Surat Peringatan (SP Lisan & Tulisan)'))
  children.push(
    p(
      'Pencatatan sanksi disiplin bukan sekadar pembuatan formulir input di sistem, melainkan sangat terikat pada harmonisasi Peraturan Perusahaan (PP / PKB) dan hukum ketenagakerjaan. Untuk mengaktifkan modul ini, manajemen klien harus menyepakati terlebih dahulu: (1) Matriks klasifikasi jenis pelanggaran mana yang masuk kategori Teguran Lisan, SP 1, SP 2, atau SP 3; (2) Alur hirarki pejabat yang berhak merekomendasikan, memverifikasi HR, dan menandatangani SK; serta (3) Format resmi surat peringatan dinas.'
    )
  )
  children.push(
    p(
      'Berdasarkan rekam jejak implementasi, proses harmonisasi draf SOP sanksi antar departemen biasanya memakan waktu 3 hingga 6 minggu. Jika modul ini dipaksakan masuk di Fase 1, ketidaksiapan kebijakan internal klien akan menjadi bottleneck yang menahan pengujian (UAT) modul presensi dan payroll inti. Oleh karena itu, modul ini sangat tepat dialokasikan ke Fase 2 setelah operasional harian stabil.'
    )
  )

  children.push(h2('3.2. Fitur 2: Perhitungan THR Keagamaan'))
  children.push(
    p(
      'Tunjangan Hari Raya (THR) memiliki karakteristik sebagai transaksi musiman tahunan yang hanya diproses satu kali dalam setahun (menjelang Hari Raya Idul Fitri atau Natal). Transaksi ini bukan transaksi harian maupun bulanan.'
    )
  )
  children.push(
    p(
      'Prioritas kritis Fase 1 adalah memastikan siklus penggajian rutin bulanan (Cut-off 26–25 dan Transfer tgl 29) bagi 200+ karyawan berjalan 100% mulus dan akurat. Menguji skenario THR saat go-live (yang melibatkan rumus proporsional masa kerja dan tabel tarif pajak TER PPh 21 tidak teratur) hanya akan menyita energi tim HR dan Finance untuk hal yang belum akan digunakan dalam waktu dekat. Modul THR dijadwalkan rilis sebagai pembaruan khusus 1 bulan sebelum masa pembayaran THR tiba.'
    )
  )

  children.push(h2('3.3. Fitur 3: Kustomisasi Komponen Gaji Dinamis & Integrasi Odoo ERP'))
  children.push(
    p(
      'Ini adalah faktor risiko teknis tertinggi. Modul penggajian PeopleHub terhubung secara dua arah (REST API) dengan modul Akuntansi Odoo ERP untuk menghasilkan Journal Entries otomatis. Setiap komponen gaji penambah maupun pengurang di PeopleHub wajib dipetakan ke pasangan Chart of Accounts (COA) / Jurnal Debit-Kredit di Odoo.'
    )
  )
  children.push(
    p(
      'Jika komponen gaji dibuat dinamis dan bebas diubah-ubah di PeopleHub pada Fase 1, maka konfigurasi modul payroll dan jurnal akuntansi di sisi Odoo juga harus diubah dan diuji ulang oleh konsultan implementor Odoo pihak ketiga. Ketergantungan pada tim luar yang jadwalnya berada di luar kendali proyek ini merupakan penyebab nomor satu keterlambatan proyek (project delay) dan berisiko memicu selisih saldo jurnal keuangan.'
    )
  )

  // Embed Diagram 3
  children.push(
    ...makeImageParagraph(
      'scripts/diagrams/diagram3_odoo_integration.png',
      560,
      270,
      'Gambar 3: Arsitektur Integrasi Dua Arah — Keunggulan Skema Baku di Fase 1 Dibandingkan Risiko Kustomisasi Dinamis'
    )
  )

  children.push(
    p(
      'Solusi Terbaik: Pada Fase 1, gunakan Skema Komponen Gaji Baku (Fixed Component Mapping) yang telah disepakati bersama Finance & Accounting. Ini menjamin integrasi API ke Odoo selesai cepat, lolos UAT seketika, dan saldo jurnal langsung balance. Kustomisasi fleksibel tanpa batas dapat dibuka pada Fase 2 setelah jurnal transaksi Odoo terbukti konsisten selama beberapa periode gajian.'
    )
  )

  // ── BAB IV ──
  children.push(h1('BAB IV. Roadmap Peluncuran Bertahap (Phased Rollout Strategy)'))
  children.push(
    p(
      'Untuk memberikan kepastian kepada manajemen bahwa seluruh kebutuhan operasional terpenuhi tanpa mengorbankan jadwal, implementasi dibagi ke dalam dua fase terencana:'
    )
  )

  // Embed Diagram 4
  children.push(
    ...makeImageParagraph(
      'scripts/diagrams/diagram4_phased_rollout.png',
      560,
      270,
      'Gambar 4: Visual Gantt Chart Roadmap Peluncuran Bertahap — Menjamin Core Go-Live On-Time di Akhir Bulan ke-2'
    )
  )

  const rolloutTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Tahapan Rilis', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Target Waktu', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Ruang Lingkup Fitur', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Deliverables & Status', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Fase 1: Core Go-Live (100% In-Scope)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Bulan ke-1 s/d Akhir Bulan ke-2 (On-Time)', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('• Seluruh Scope 4.1 s/d 4.5 tuntas.\n• Migrasi data 200 karyawan.\n• Absensi HO, Gudang, Sales & Livestream.\n• Workflow Lembur, Cuti, Petty Cash.\n• Payroll Cut-off 26-25 & Transfer tgl 29.\n• REST API Connector Odoo ERP (Fixed Mapping).', { before: 0, after: 0 })] }),
          new TableCell({ shading: { fill: COLOR_SUCCESS_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('SISTEM GO-LIVE BERJALAN PENUH (Operasional Rutin Terselamatkan)', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Fase 2: Enhancement (Fitur Lanjutan)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Bulan ke-3 s/d Bulan ke-4 (Post Go-Live)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('• Sub-modul Pencatatan SP Lisan & Tulisan (setelah draf sanksi disahkan).\n• Kalkulator THR Otomatis Permenaker 6/2016 (menjelang Hari Raya).\n• Kustomisasi lanjutan komponen gaji dinamis ke Odoo.', { before: 0, after: 0 })] }),
          new TableCell({ shading: { fill: COLOR_INFO_BG }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Pembaruan Terjadwal (Zero Risk terhadap Sistem Inti)', { bold: true, color: COLOR_INFO_TEXT, before: 0, after: 0 })] }),
        ],
      }),
    ],
  })
  children.push(rolloutTable)

  // ── BAB V ──
  children.push(h1('BAB V. Draf Narasi Komunikasi Resmi ke Manajemen / Klien'))
  children.push(
    p(
      'Berikut adalah naskah komunikasi resmi yang telah dirancang secara diplomatis, profesional, dan menenangkan, siap untuk disampaikan langsung dalam rapat komite proyek atau dilampirkan ke surat penawaran resmi:'
    )
  )

  const narrativeText = [
    'Yth. Bapak/Ibu Tim Manajemen dan Stakeholder Proyek,',
    '',
    'Terima kasih atas kepercayaan dan kolaborasi yang terjalin erat dalam persiapan implementasi PeopleHub Human Capital Management. Sebagai mitra strategis teknologi Anda, komitmen tertinggi kami adalah memastikan bahwa sistem dapat GO-LIVE TEPAT WAKTU (On-Time Delivery) tanpa risiko kegagalan operasional maupun selisih transaksi penggajian karyawan.',
    '',
    'Menindaklanjuti ruang lingkup pekerjaan pada Butir 4.1 s/d 4.5, kami ingin menyampaikan bahwa 100% dari seluruh kebutuhan dasar operasional harian perusahaan telah siap diakomodasi penuh oleh PeopleHub.',
    '',
    'Terkait tiga poin kebutuhan tambahan yang didiskusikan:',
    '1. Pencatatan Surat Peringatan (SP Lisan & Tulisan): Kami menyarankan modul ini dialokasikan ke Fase 2 (Post Go-Live Enhancement). Penerbitan SP sangat menyangkut harmonisasi regulasi Peraturan Perusahaan (PP/PKB) dan penetapan matriks sanksi internal yang membutuhkan waktu perumusan tersendiri. Mengalokasikannya ke Fase 2 menjaga agar pengujian modul absensi dan payroll inti tidak tertahan.',
    '',
    '2. Perhitungan THR Keagamaan: Mengingat THR adalah transaksi tahunan yang hanya diproses 1 kali dalam setahun menjelang Hari Raya, prioritas kritis saat ini adalah menstabilkan siklus penggajian rutin bulanan (Cut-off tgl 26-25 dan Transfer tgl 29). Modul kalkulator THR otomatis akan kami siapkan dan aktifkan pada pembaruan terjadwal menjelang periode hari raya mendatang.',
    '',
    '3. Kustomisasi Komponen Gaji Dinamis: Modul payroll PeopleHub terhubung langsung (2-arah) ke Chart of Accounts (COA) dan Jurnal Akuntansi di Odoo ERP. Demi menghindari risiko selisih jurnal dan ketergantungan pengujian tim pihak ketiga yang dapat memundurkan jadwal Go-Live, pada Fase 1 kita akan menggunakan Mapping Komponen Terstandarisasi yang sudah disepakati bersama tim Finance. Kustomisasi fleksibilitas tambahan dapat dilanjutkan pada Fase 2 setelah jurnal transaksi Odoo terbukti konsisten.',
    '',
    'Dengan strategi peluncuran bertahap (Phased Rollout) ini, manajemen mendapatkan kepastian bahwa seluruh operasional mendesak dijamin berjalan tepat waktu, sementara kebutuhan pelengkap tetap terakomodasi sempurna pada fase berikutnya.',
    '',
    'Hormat kami,',
    'Tim Solusi & Implementasi PeopleHub HCM',
  ]

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: COLOR_LIGHT_BG },
              margins: { top: 140, bottom: 140, left: 180, right: 180 },
              children: narrativeText.map(line =>
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({
                      text: line,
                      size: 20,
                      color: COLOR_DARK_GRAY,
                      font: 'Calibri',
                      italics: line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.'),
                      bold: line.startsWith('Yth.') || line.startsWith('Hormat kami,'),
                    }),
                  ],
                })
              ),
            }),
          ],
        }),
      ],
    })
  )

  // ── BAB VI ──
  children.push(h1('BAB VI. Kesimpulan & Komitmen Pelaksanaan'))
  children.push(
    p(
      'Keputusan untuk mengalokasikan 3 fitur tersebut ke Fase 2 bukanlah pembatasan kapabilitas sistem, melainkan penerapan tata kelola manajemen proyek yang matang (Mature Project Governance) untuk melindungi kepentingan klien.'
    )
  )
  children.push(bullet('Sistem inti (Presensi, Lembur, Cuti, Payroll Cut-Off 26-25, dan REST API Odoo) dapat beroperasi tepat waktu tanpa penundaan satu hari pun.', '1. Kepastian Jadwal (Schedule Certainty):'))
  children.push(bullet('Menjamin bahwa data absensi dan angka penggajian yang ter-posting ke jurnal akuntansi Odoo ERP 100% klop dan bebas selisih.', '2. Akurasi & Kepatuhan Finansial (Financial Integrity):'))
  children.push(bullet('Memberikan waktu yang cukup bagi manajemen internal untuk merumuskan SOP sanksi SP secara matang tanpa tergesa-gesa.', '3. Ketenangan Operasional (Operational Calm):'))
  children.push(bullet('Klien tetap mendapatkan seluruh fitur pelengkap (SP, THR, dan Gaji Dinamis) di Fase 2 sebagai bagian utuh dari paket implementasi PeopleHub.', '4. Keberlanjutan Nilai (Sustained Value):'))

  // Document Footer Callout
  children.push(
    new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }),
    makeCallout(
      'PeopleHub HCM berkomitmen penuh mendampingi organisasi Anda melalui penerapan standar implementasi kelas enterprise, menjamin sistem Go-Live tepat waktu, dan memberikan dampak efisiensi nyata bagi pertumbuhan bisnis perusahaan.',
      'KOMITMEN IMPLEMENTASI:'
    )
  )

  // Assemble document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'PeopleHub HCM — Analisis Ruang Lingkup & Justifikasi On-Time Delivery',
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
                  new TextRun({
                    text: 'Halaman ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: ' dari ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: '  |  Dokumen Strategi Proyek & Spesifikasi Sistem',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const targetPath = 'C:/Users/lahirs/.gemini/antigravity/brain/0150dd40-c12f-414d-a7be-64cae4a8de9d/Perbandingan_Scope_dan_Justifikasi_OnTime_Delivery_PeopleHub.docx'
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(targetPath, buffer)
  console.log(`Word document successfully generated at: ${targetPath} (${buffer.length} bytes)`)
}

generateDocx().catch((err) => {
  console.error('Error generating docx:', err)
  process.exit(1)
})
