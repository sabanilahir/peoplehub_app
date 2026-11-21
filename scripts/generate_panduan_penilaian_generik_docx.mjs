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

async function generateDocx() {
  console.log('Generating Panduan Penilaian Karyawan Generik & SP (.docx)...')

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
          text: 'PANDUAN & SPESIFIKASI SISTEM',
          bold: true,
          size: 32,
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
          text: 'Tata Kelola Penilaian Karyawan Generik (Bulanan) & Korelasinya dengan Surat Peringatan (SP) serta Payroll',
          bold: true,
          size: 22,
          color: COLOR_NAVY,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 280 },
      children: [
        new TextRun({
          text: 'Pedoman Standar Operasional, Kepatuhan PP 35/2021, Framework 5 Dimensi Universal, dan Integrasi Modul HRMS',
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
                  new TextRun({ text: '1.0 (Enterprise Release)', size: 19, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: 'Tanggal Terbit: ', bold: true, size: 19, font: 'Calibri' }),
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
                  new TextRun({ text: 'Internal Policy & Functional Design', size: 19, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: 'Sistem Terkait: ', bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: 'PeopleHub Performance, Disciplinary & Payroll', size: 19, font: 'Calibri' }),
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

  // Executive Summary Callout
  children.push(
    makeCallout(
      'Dokumen ini memberikan jawaban tuntas atas dua pertanyaan mendasar tata kelola human capital: (1) Bagaimana menerapkan penilaian karyawan secara bulanan (Monthly Appraisal) yang mudah, cepat, dan terukur tanpa memberatkan birokrasi?; dan (2) Bagaimana menghubungkan hasil penilaian bulanan tersebut secara timbal balik dengan Surat Peringatan (SP) dan kompensasi Payroll sesuai regulasi ketenagakerjaan Indonesia (PP No. 35/2021).',
      'RINGKASAN EKSEKUTIF:'
    )
  )

  // ── BAB I ──
  children.push(h1('BAB I. Urgensi & Filosofi Penilaian Karyawan Bulanan'))
  children.push(
    p(
      'Selama puluhan tahun, mayoritas perusahaan hanya melakukan evaluasi kinerja setahun sekali (Annual Review). Namun, dalam dinamika bisnis modern yang bergerak cepat, siklus tahunan terbukti memiliki kelemahan fatal: keterlambatan deteksi kinerja buruk (kinerja buruk di bulan Februari baru diketahui dan dievaluasi di bulan Desember), bias resensi (atasan hanya mengingat 2 bulan terakhir), serta hilangnya kesempatan pembinaan yang tepat waktu.'
    )
  )
  children.push(
    p(
      'Penilaian Karyawan Bulanan (Monthly Appraisal) hadir untuk menjawab tantangan tersebut, khususnya bagi tenaga kerja operasional, lapangan, staf pendukung, tim penjualan, serta karyawan yang berada dalam masa kontrak (PKWT) dan masa percobaan (Probation).'
    )
  )

  children.push(h2('1.1. Perbandingan Karakteristik: Penilaian Bulanan vs Tahunan'))

  const compTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Parameter', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 37, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Penilaian Bulanan (Monthly)', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Penilaian Tahunan (Annual)', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Fokus Utama', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Kedisiplinan harian, konsistensi output, dan penyelesaian tugas rutin.', { before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Pencapaian strategi besar, kompetensi kepemimpinan, dan target jangka panjang.', { before: 0, after: 0 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Korelasi Finansial', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Insentif Kinerja Bulanan (KPI Allowance) & bonus bulanan slip gaji.', { before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Kenaikan gaji pokok tahunan (Merit Increase) dan Bonus Tahunan (Tantiem).', { before: 0, after: 0 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Deteksi Masalah', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Seketika di bulan berjalan (Real-time Early Detection).', { before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Terlambat; masalah sering baru dibahas setelah berbulan-bulan terjadi.', { before: 0, after: 0 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Beban Administrasi', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Sangat ringan jika menggunakan template generik (3-5 menit per karyawan).', { before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [p('Sangat berat; kompilasi berkas tahunan sering menyita waktu berhari-hari.', { before: 0, after: 0 })],
          }),
        ],
      }),
    ],
  })
  children.push(compTable)

  // ── BAB II ──
  children.push(h1('BAB II. Framework Penilaian Karyawan Secara Generik'))
  children.push(
    p(
      'Tantangan terbesar dalam menjalankan penilaian bulanan adalah resistensi dari para atasan langsung (Manager/Supervisor). Jika form penilaian bulanan mengharuskan mereka menyusun indikator KPI matematis yang rumit untuk setiap bawahan, proses penilaian akan terlambat atau bahkan diabaikan. Solusi terbaik yang terbukti efektif adalah menerapkan Penilaian Karyawan Secara Generik (Universal Performance Appraisal).'
    )
  )
  children.push(
    p(
      'Penilaian generik adalah metode evaluasi kinerja menggunakan satu set dimensi perilaku dan kompetensi standar yang relevan bagi seluruh karyawan lintas divisi (baik staf gudang, logistik, administrasi, sales, maupun IT). Standar ini dibangun di atas 5 Dimensi Universal.'
    )
  )

  children.push(h2('2.1. Tabel 5 Dimensi Inti Universal (Standar Bobot 100%)'))

  const dimTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_TEAL },
            margins: { top: 100, bottom: 100, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 27, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_TEAL },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Dimensi Penilaian', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_TEAL },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Bobot', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 53, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_TEAL },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Indikator Perilaku & Cara Pengukuran', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [p('1', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Kedisiplinan & Presensi (Discipline & Compliance)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('25%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Ketepatan jam hadir, tidak ada mangkir, kepatuhan atribut seragam/ID card, serta ketaatan pada SOP K3 dan Peraturan Perusahaan. Otomatis disinkronkan dari log mesin Fingerspot dan status SP aktif.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [p('2', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Kualitas & Akurasi Kerja (Quality of Work)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('25%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Ketelitian hasil kerja, minim kesalahan (error rate rendah), kerapian dokumentasi tugas, dan tidak memerlukan revisi/rework berulang.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [p('3', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Produktivitas & Ketepatan Waktu (Timeliness & Output)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('20%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Kecepatan menuntaskan tugas bulanan sesuai tenggat waktu (deadline), ketahanan menangani beban kerja rutin, dan keteraturan laporan progres.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [p('4', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Kerjasama & Komunikasi (Teamwork & Communication)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('15%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Kemampuan berkoordinasi dengan rekan sekerja dan atasan, respon cepat saat dihubungi, etika berkomunikasi, dan kesediaan membantu tim saat terjadi lonjakan tugas.', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [p('5', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Inisiatif & Nilai Inti (Initiative & Core Values)', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('15%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p('Proaktif mencari solusi mandiri sebelum bertanya pada atasan, kepedulian terhadap kebersihan/aset kantor, kejujuran (integritas), dan penerapan nilai budaya perusahaan.', { before: 0, after: 0 })] }),
        ],
      }),
    ],
  })
  children.push(dimTable)

  children.push(h2('2.2. Standar Skala BARS (Behaviorally Anchored Rating Scale 1–5)'))
  children.push(
    p(
      'Untuk menghilangkan bias subjektif ("suka atau tidak suka"), setiap nilai 1 sampai 5 harus memiliki acuan perilaku konkret yang dipahami oleh seluruh manajer penilai:'
    )
  )

  children.push(bullet('Kinerja jauh di bawah standar minimum, sering melakukan kecerobohan fatal, presensi buruk (sering terlambat/mangkir), menolak arahan atasan, dan memicu komplain internal. (Wajib direkomendasikan masuk PIP atau diterbitkan Surat Peringatan).', '• Nilai 1 — Sangat Kurang (Far Below Expectation / Bobot Skor 20):'))
  children.push(bullet('Pekerjaan sering terlambat selesai, memerlukan teguran dan pengawasan ekstra, hasil kerja sering membutuhkan revisi dari atasan atau rekan kerja.', '• Nilai 2 — Kurang / Butuh Bimbingan (Needs Improvement / Bobot Skor 40):'))
  children.push(bullet('Memenuhi seluruh standar kerja normal secara konsisten. Datang tepat waktu, menyelesaikan tugas rutin tanpa masalah, mematuhi SOP dan tata tertib. (Ini adalah tolak ukur standar karyawan yang sehat).', '• Nilai 3 — Standar / Sesuai Harapan (Meets Expectation / Bobot Skor 70):'))
  children.push(bullet('Hasil kerja cepat, rapi, dan tuntas sebelum tenggat waktu. Menunjukkan inisiatif tinggi, jarang melakukan kesalahan, dan aktif membantu rekan tim yang kesulitan.', '• Nilai 4 — Baik / Melebihi Harapan (Exceeds Expectation / Bobot Skor 85):'))
  children.push(bullet('Kinerja luar biasa yang menjadi teladan (role model) di departemen. Mampu memecahkan masalah rumit secara mandiri, memberikan ide efisiensi yang berdampak nyata, dan memiliki kepemimpinan alami.', '• Nilai 5 — Istimewa / Sangat Unggul (Outstanding / Bobot Skor 100):'))

  // ── BAB III ──
  children.push(h1('BAB III. Rekomendasi Solusi Terbaik: Model Hibrida'))
  children.push(
    p(
      'Kelemahan utama dari penilaian 100% generik murni adalah tidak adanya pencatatan angka target bisnis riil (seperti target penjualan sales Rp 100 juta atau target pengiriman 500 paket gudang). Untuk mengatasi hal tersebut tanpa memperumit sistem, PeopleHub merekomendasikan penerapan Model Hibrida (Hybrid Generic Model).'
    )
  )

  children.push(
    makeCallout(
      'Formula Model Hibrida: [70% Aspek Generik Universal] + [30% Target / Action Plan Bebas Bulanan]. Model ini memberikan keseimbangan sempurna antara standardisasi perilaku organisasi dan fleksibilitas pencapaian target dinamis.',
      'FORMULA MODEL HIBRIDA:'
    )
  )

  children.push(
    p(
      'Mekanisme Pelaksanaan di Lapangan:',
      { bold: true, before: 120, after: 60 }
    )
  )
  children.push(bullet('Bagian ini bersifat baku di sistem. Atasan cukup memilih skala 1-5 untuk kualitas, produktivitas, kerjasama, dan inisiatif, sementara presensi ditarik otomatis dari mesin absensi.', '1. Bagian Generik (Bobot 70%):'))
  children.push(bullet('Di awal bulan, atasan menuliskan 1 sampai 3 fokus utama bulan tersebut pada form sistem (contoh: "Tutup 5 akun klien baru", "Selesaikan rekonsiliasi stok gudang fisik", atau "Selesaikan migrasi database"). Di akhir bulan, atasan cukup mencentang tingkat pencapaiannya: Tercapai Penuh (100%), Tercapai Sebagian (50%), atau Tidak Tercapai (0%).', '2. Bagian Target Bebas (Bobot 30%):'))

  // ── BAB IV ──
  children.push(h1('BAB IV. Korelasi Timbal Balik Penilaian Bulanan & Surat Peringatan (SP)'))
  children.push(
    p(
      'Salah satu pertanyaan kunci manajemen adalah: "Apakah penilaian bulanan dan Surat Peringatan (SP) saling berhubungan?" Jawabannya adalah SANGAT BERHUBUNGAN ERAT (Memiliki Korelasi Timbal Balik / Dua Arah) secara hukum ketenagakerjaan dan praktik HRD modern.'
    )
  )

  children.push(h2('4.1. Landasan Hukum Ketenagakerjaan (PP No. 35 Tahun 2021)'))
  children.push(
    p(
      'Berdasarkan ketentuan Pasal 52 ayat (1) Peraturan Pemerintah No. 35 Tahun 2021 tentang Perjanjian Kerja Waktu Tertentu, Alih Daya, Waktu Kerja dan Waktu Istirahat, dan Pemutusan Hubungan Kerja: Pengusaha dapat melakukan pemutusan hubungan kerja terhadap pekerja/buruh karena alasan pekerja/buruh melakukan pelanggaran ketentuan yang diatur dalam Perjanjian Kerja, Peraturan Perusahaan (PP), atau Perjanjian Kerja Bersama (PKB) dan sebelumnya telah diberikan Surat Peringatan Pertama, Kedua, dan Ketiga secara berturut-turut.'
    )
  )
  children.push(
    p(
      'Masing-masing Surat Peringatan berlaku untuk jangka waktu paling lama 6 (enam) bulan, kecuali ditetapkan lain dalam Perjanjian Kerja atau Peraturan Perusahaan.'
    )
  )

  children.push(h2('4.2. Arah 1: Penilaian Kinerja Buruk Memicu Penerbitan SP'))
  children.push(
    p(
      'Dalam hukum ketenagakerjaan, perusahaan dilarang keras menerbitkan SP atau melakukan PHK sepihak atas dasar "kinerja buruk" tanpa bukti tertulis yang objektif dan proses pembinaan yang sah. Apabila digugat ke Pengadilan Hubungan Industrial (PHI), perusahaan wajib membuktikan bahwa karyawan telah dievaluasi secara adil.'
    )
  )
  children.push(bullet('Nilai bulanan karyawan yang tercatat secara historis di PeopleHub (contoh: Bulan Juli = 50, Agustus = 52, September = 48) menjadi dokumen bukti autentik di mata hukum bahwa karyawan berada di bawah standar minimum.', '1. Bukti Tertulis yang Sah (Objective Evidence):'))
  children.push(bullet('Sebelum menerbitkan SP, atasan mengaktifkan modul PIP (Performance Improvement Plan) di PeopleHub selama 1 sampai 3 bulan dengan sasaran perbaikan yang disepakati bersama.', '2. Masa Pembinaan Terstruktur (PIP):'))
  children.push(bullet('Jika setelah masa PIP karyawan tetap tidak mencapai target minimal (misal skor < 60), barulah HR bersama Atasan menerbitkan Surat Peringatan (SP 1, SP 2, atau SP 3) atas dasar kelalaian/kegagalan memenuhi kewajiban kerja.', '3. Eskalasi Resmi ke Surat Peringatan:'))

  children.push(h2('4.3. Arah 2: Karyawan dengan SP Aktif Berdampak pada Penilaian & Hak'))
  children.push(
    p(
      'Ketika seorang karyawan sedang menjalani sanksi SP yang masih aktif (dalam kurun waktu 6 bulan masa berlaku), sanksi tersebut berdampak langsung pada 3 aspek di sistem:'
    )
  )
  children.push(bullet('Form penilaian bulanan memuat dimensi Kedisiplinan. Jika sistem mendeteksi karyawan memiliki SP aktif, sistem otomatis memberikan pemotongan penalti: SP 1 memotong nilai kedisiplinan 15% (atau mengunci nilai maksimal di grade B); SP 2 memotong 30% (maksimal grade C); SP 3 memotong 50% (maksimal grade D/E).', '1. Pemotongan Nilai Kedisiplinan (Auto-Penalty):'))
  children.push(bullet('Di modul Payroll, insentif performa bulanan (KPI allowance) otomatis dipotong atau ditiadakan bagi karyawan yang memiliki SP aktif pada bulan bersangkutan.', '2. Penahanan / Pemotongan Insentif Bulanan (Payroll Impact):'))
  children.push(bullet('Di modul Personnel Action, opsi Promosi Jabatan (Promote) dan kenaikan golongan otomatis dikunci oleh sistem selama status SP masih "Active". Bagi karyawan kontrak (PKWT), catatan SP menjadi pertimbangan utama untuk tidak diperpanjang kontraknya.', '3. Pembekuan Promosi & Evaluasi Kontrak (Career Freeze):'))

  children.push(h2('4.4. Perbedaan Esensial: SP Kedisiplinan vs SP Kinerja'))

  const spTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Kategori Sanksi', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 37, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'SP Kedisiplinan / Perilaku (Misconduct)', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'SP Kinerja / Kompetensi (Poor Performance)', bold: true, color: 'FFFFFF', size: 19, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Pemicu Terjadinya', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Mangkir kerja berturut-turut, perkelahian, merokok di area gudang/B3, pelecehan, pelanggaran SOP K3 berat, pencurian/fraud.', { before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Target output tidak tercapai, tingkat kesalahan tinggi, sering meleset dari tenggat waktu, hasil kerja tidak sesuai instruksi.', { before: 0, after: 0 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Waktu Penerbitan', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Seketika saat pelanggaran terjadi. Tidak perlu menunggu akhir bulan penilaian.', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Wajib melalui evaluasi bulanan berkala (2-3 bulan) + pembinaan PIP terlebih dahulu.', { bold: true, before: 0, after: 0 })],
          }),
        ],
      }),
    ],
  })
  children.push(spTable)

  // ── BAB V ──
  children.push(h1('BAB V. Arsitektur Integrasi Sistem di PeopleHub HCM'))
  children.push(
    p(
      'Di PeopleHub HCM, proses penilaian bulanan tidak berdiri sendiri sebagai pulau terisolasi, melainkan terhubung erat secara otomatis dalam sebuah ekosistem data yang terpadu:'
    )
  )

  children.push(bullet('Sistem secara otomatis menghitung jumlah jam keterlambatan, pulang awal, dan mangkir selama 1 bulan kalender penggajian. Angka ini langsung mengunci skor dimensi Kedisiplinan tanpa perlu diinput manual oleh atasan.', '1. Modul Presensi & Fingerspot ➔ Penilaian Bulanan:'))
  children.push(bullet('Form penilaian memeriksa tanggal penerbitan SP dan tanggal kedaluwarsa (masa berlaku 6 bulan). Jika masih aktif, sistem menampilkan badge peringatan sanksi dan otomatis memotong poin penalti kedisiplinan.', '2. Modul Surat Peringatan (SP) ➔ Penilaian Bulanan:'))
  children.push(bullet('Setelah form disetujui oleh atasan (MSS) dan diverifikasi HR, skor total (0-100) langsung disalurkan ke mesin Payroll untuk menghitung nominal tunjangan performa/insentif pada slip gaji.', '3. Penilaian Bulanan ➔ Modul Payroll (Insentif & Bonus):'))
  children.push(bullet('Riwayat nilai bulanan dan catatan SP menjadi acuan mutlak saat HR menjalankan proses perpanjangan kontrak kerja (Extend Contract), promosi jabatan (Promote), demosi, atau terminasi kerja.', '4. Penilaian Bulanan ➔ Modul Personnel Action:'))

  // ── BAB VI ──
  children.push(h1('BAB VI. Lampiran Formulir & Skema Skor Siap Pakai'))

  children.push(h2('6.1. Formulir Penilaian Karyawan Bulanan (Model Standar Siap Cetak)'))

  const formTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Nama Karyawan / NIK', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Budi Santoso / EMP-042', { before: 0, after: 0 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Departemen / Posisi', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Gudang & Logistik / Staff Inbound', { before: 0, after: 0 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Periode Penilaian', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Bulan Oktober 2026', { before: 0, after: 0 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Status Disiplin / SP', { bold: true, before: 0, after: 0 })],
          }),
          new TableCell({
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('Bersih (Tidak Ada SP Aktif)', { color: COLOR_SUCCESS_TEXT, bold: true, before: 0, after: 0 })],
          }),
        ],
      }),
    ],
  })
  children.push(formTable)

  children.push(
    p('Rincian Skor Per Dimensi:', { bold: true, before: 140, after: 60 })
  )

  const scoreTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Dimensi Penilaian', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Bobot', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Nilai (1-5)', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Skor Akhir', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p('1', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Kedisiplinan & Presensi (Auto-Fingerspot)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('25%', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('4 (Terlambat 0x)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('21.25', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p('2', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Kualitas & Akurasi Hasil Kerja', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('25%', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('4 (Rapi & teliti)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('21.25', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p('3', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Produktivitas & Ketepatan Waktu', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('20%', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('4 (Selesai sebelum cut-off)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('17.00', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p('4', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Kerjasama & Komunikasi Tim', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('15%', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('5 (Sangat kooperatif)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('15.00', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [p('5', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Inisiatif & Nilai Perusahaan', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('15%', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('4 (Proaktif)', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('12.75', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            colSpan: 4,
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('TOTAL SKOR AKHIR & GRADE BULANAN', { bold: true, color: COLOR_NAVY, before: 0, after: 0 })],
          }),
          new TableCell({
            shading: { fill: COLOR_SUCCESS_BG },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [p('87.00 (Grade A)', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })],
          }),
        ],
      }),
    ],
  })
  children.push(scoreTable)

  children.push(h2('6.2. Tabel Konversi Skor ke Grade & Persentase Insentif Payroll'))

  const payrollTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Rentang Skor', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Grade', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Predikat Kinerja', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: '% Insentif Cair', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_NAVY },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Tindak Lanjut HR', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('85.00 – 100.00', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Grade A', { bold: true, color: COLOR_SUCCESS_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Istimewa / Sangat Baik', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('100% – 110%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Apresiasi / Kandidat Promosi', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('70.00 – 84.99', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Grade B', { bold: true, color: COLOR_INFO_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Baik / Standar Normal', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('100%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Pertahankan Kinerja', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('60.00 – 69.99', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Grade C', { bold: true, color: COLOR_WARN_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Cukup / Pas-pasan', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('50% – 75%', { bold: true, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Coaching & Pengawasan Atasan', { before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('45.00 – 59.99', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Grade D', { bold: true, color: COLOR_DANGER_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Kurang / Bawah Standar', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('0% (Hangus)', { bold: true, color: COLOR_DANGER_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Wajib Masuk Program PIP', { bold: true, before: 0, after: 0 })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('< 45.00', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Grade E', { bold: true, color: COLOR_DANGER_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Sangat Buruk / Kritis', { before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('0% (Hangus)', { bold: true, color: COLOR_DANGER_TEXT, before: 0, after: 0 })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p('Penerbitan Surat Peringatan (SP)', { bold: true, color: COLOR_DANGER_TEXT, before: 0, after: 0 })] }),
        ],
      }),
    ],
  })
  children.push(payrollTable)

  // Document Footer note
  children.push(
    new Paragraph({ spacing: { before: 300, after: 0 }, children: [] }),
    makeCallout(
      'Dokumen ini merupakan bagian tak terpisahkan dari standardisasi modul PeopleHub Human Capital Management. Seluruh formula perhitungan nilai dan parameter sanksi SP dapat dikonfigurasi melalui menu HR Settings sesuai Peraturan Perusahaan (PP) atau Perjanjian Kerja Bersama (PKB) yang berlaku.',
      'CATATAN PENUTUP:'
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
                    text: 'PeopleHub HCM — Panduan Tata Kelola Penilaian Generik & SP',
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
                    text: '  |  Dokumen Kebijakan & Spesifikasi Sistem',
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

  const targetPath = 'C:/Users/lahirs/.gemini/antigravity/brain/0150dd40-c12f-414d-a7be-64cae4a8de9d/Panduan_Penilaian_Karyawan_Generik_dan_Korelasi_SP_PeopleHub.docx'
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(targetPath, buffer)
  console.log(`Word document successfully generated at: ${targetPath} (${buffer.length} bytes)`)
}

generateDocx().catch((err) => {
  console.error('Error generating docx:', err)
  process.exit(1)
})
