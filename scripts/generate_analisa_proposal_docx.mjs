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

// Helper cell border
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

// 13 points summary data
const summaryItems = [
  {
    no: '1',
    topic: 'Reminder & Form Penilaian Probation / Kontrak oleh Atasan',
    status: 'Ready (Bisa)',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Scanner H-60 s/d H-1 sudah aktif; form penilaian atasan diintegrasikan ke portal MSS & workflow approval.',
  },
  {
    no: '2',
    topic: 'Dokumen Digital (Foto, CV, Ijazah, Sertifikat, dll)',
    status: 'Sudah Ada',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Master Document Types dinamis; mendukung PDF, Word, Excel, Foto/Gambar + visualisasi kelengkapan berkas.',
  },
  {
    no: '3',
    topic: 'Mesin Absensi Gudang Ganti Merk di Masa Depan',
    status: 'Sudah Ada',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Arsitektur Multi-Device mandiri + parser universal Excel/CSV + API Webhook; tidak terikat pada satu merk mesin.',
  },
  {
    no: '4',
    topic: 'Checklist Onboarding & Offboarding',
    status: 'Sudah Ada',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Master checklist, auto-assign orientasi ESS, persetujuan atasan, pelacakan inventaris, BAST aset & Paklaring PDF.',
  },
  {
    no: '5',
    topic: 'Fleksibilitas Tanggal Transfer Gaji & Komisi saat Libur',
    status: 'Fleksibel',
    statusBg: COLOR_INFO_BG,
    statusColor: COLOR_INFO_TEXT,
    desc: 'Tanggal tgl 29 & tgl 15 tidak dikunci baku; terhubung ke kalender libur nasional dengan opsi auto-roll ke hari kerja sebelumnya.',
  },
  {
    no: '6',
    topic: 'Garansi 6 Bulan Sebelum/Setelah Go-Live',
    status: 'Bisa Disetujui',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Diberikan garansi 6 bulan mencakup bug fixing, konsultasi teknis, dan pendampingan 6 kali periode cut-off payroll.',
  },
  {
    no: '7',
    topic: 'Bonus 5 User License Tambahan',
    status: 'Bisa Diberikan',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Diberikan sebagai bonus penawaran (deal sweetener) kemitraan tanpa biaya tambahan.',
  },
  {
    no: '8',
    topic: 'Migrasi Data Eksisting HR (Excel & Odoo)',
    status: 'Termasuk',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Sudah termasuk dalam paket implementasi; tim PeopleHub memandu migrasi data karyawan, cuti, payroll, dan nomor rekening.',
  },
  {
    no: '9',
    topic: 'Pencatatan Surat Peringatan (SP Lisan & Tulisan)',
    status: 'Akan Ditambah',
    statusBg: COLOR_INFO_BG,
    statusColor: COLOR_INFO_TEXT,
    desc: 'Penambahan sub-modul Disiplin & SP (Teguran Lisan, SP 1, 2, 3, upload PDF, dan pelacakan masa berlaku 6 bulan).',
  },
  {
    no: '10',
    topic: 'Perhitungan THR Keagamaan',
    status: 'Akan Dicantumkan',
    statusBg: COLOR_INFO_BG,
    statusColor: COLOR_INFO_TEXT,
    desc: 'Kalkulator THR otomatis sesuai Permenaker No. 6/2016 (masa kerja penuh 1 bulan & proporsional) + PPh 21 TER.',
  },
  {
    no: '11',
    topic: 'Kustomisasi Komponen Gaji & Persentase Pembagian',
    status: 'Sudah Ada',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Sistem 100% modular; komponen penambah, pengurang denda keterlambatan, dan persentase BPJS/pajak dapat diatur bebas.',
  },
  {
    no: '12',
    topic: 'Rekomendasi Layanan Cloud Hosting',
    status: 'Rekomendasi Siap',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Alibaba Cloud / Tencent Cloud Jakarta (Rekomendasi Utama, latensi <10ms) atau Biznet Gio lokal (Rp 450rb - Rp 650rb/bln).',
  },
  {
    no: '13',
    topic: 'Penjelasan Diskon Harga Implementasi',
    status: 'Strategi Siap',
    statusBg: COLOR_SUCCESS_BG,
    statusColor: COLOR_SUCCESS_TEXT,
    desc: 'Pemberian Special Partnership Discount 10% - 15% dengan justifikasi bundling garansi 6 bulan, lisensi bonus, & migrasi tuntas.',
  },
]

// Detailed 13 points content
const detailedPoints = [
  {
    num: '1',
    title: 'Reminder & Form Penilaian Probation / Perpanjangan Kontrak',
    subpoints: [
      {
        subtitle: 'Kondisi Sistem Saat Ini:',
        body: 'PeopleHub telah memiliki background scanner (cron) otomatis di modul personnel action yang secara berkala memeriksa masa berlaku kontrak seluruh karyawan. Notifikasi email bertahap dikirimkan pada H-60, H-30, H-14, H-7, dan H-1 kepada Manager/Atasan Langsung, HR, dan Karyawan bersangkutan. Modul perpanjangan kontrak (Personnel Action) sudah siap untuk memproses penerbitan Surat Keputusan (SK) perpanjangan.',
      },
      {
        subtitle: 'Penyempurnaan yang Ditawarkan:',
        body: 'Pada email notifikasi H-60 dan H-30 yang diterima atasan, akan disematkan tautan digital langsung menuju Form Penilaian Probation / Kontrak (Appraisal Form) di portal Manager (MSS). Atasan mengisi parameter penilaian: Kualitas Kerja, Disiplin/Kehadiran, Kerjasama Tim, serta memberikan Rekomendasi Resmi (Lulus Karyawan Tetap, Perpanjang PKWT, atau Akhiri Kontrak). Hasil evaluasi ini otomatis masuk ke antrean persetujuan HR untuk difinalisasi.',
      },
    ],
  },
  {
    num: '2',
    title: 'Dokumen Digital (Foto Formal, CV, Ijazah, KTP, NPWP, Sertifikat)',
    subpoints: [
      {
        subtitle: 'Kondisi Sistem Saat Ini:',
        body: 'PeopleHub memiliki modul fleksibel Master Document Types di mana HR dapat mendefinisikan kategori dokumen apa pun tanpa batas batasan: Foto Formal Karyawan (langsung tampil pada kartu profil, ID card, dan avatar), CV / Resume & Portofolio, KTP, NPWP, Kartu Keluarga, Ijazah & Transkrip Akademik, Dokumen Kontrak PKWT, Sertifikat Pelatihan, hingga Surat Pengalaman Kerja (Paklaring).',
      },
      {
        subtitle: 'Dukungan File & Fitur Monitoring:',
        body: 'Sistem mendukung format berkas: PDF, Word (DOCX), Excel (XLSX), serta Gambar/Foto (JPG, PNG) dengan batas ukuran file yang dapat ditentukan. Setiap profil karyawan dilengkapi widget visual "Doc Completion Donut" yang memperlihatkan persentase kelengkapan berkas wajib secara seketika.',
      },
    ],
  },
  {
    num: '3',
    title: 'Kemandirian Mesin Absensi Gudang (Bisa Ganti Merk di Masa Depan)',
    subpoints: [
      {
        subtitle: 'Arsitektur Multi-Device & Brand-Agnostic:',
        body: 'Sistem presensi PeopleHub tidak terikat pada merk perangkat keras (hardware-agnostic). Arsitektur dirancang dengan 3 pilar mandiri: (1) Koneksi Cloud API yang terhubung langsung ke mesin Fingerspot gudang via Cloud ID C263889803072930; (2) Jalur Cadangan Upload Excel/CSV untuk mengantisipasi jaringan mati atau penarikan data via flashdisk; (3) Algoritma Matching 4-Tier yang memetakan nomor PIN mesin ke data karyawan independen dari nomor seri perangkat.',
      },
      {
        subtitle: 'Jaminan Fleksibilitas Masa Depan:',
        body: 'Apabila di kemudian hari perusahaan memutuskan untuk mengganti mesin gudang ke merk lain (seperti ZKTeco, Solution, Hikvision, atau teknologi Face Recognition & RFID), PeopleHub tetap dapat mengolah data absensi tersebut secara mulus melalui parser data terpadu atau webhook API tanpa merombak struktur sistem.',
      },
    ],
  },
  {
    num: '4',
    title: 'Modul Checklist Onboarding & Offboarding Karyawan',
    subpoints: [
      {
        subtitle: 'Onboarding (Orientasi Karyawan Baru):',
        body: 'PeopleHub menyediakan template onboarding terstruktur per departemen dan jabatan. Saat karyawan baru diinput, sistem otomatis menugaskan checklist tugas orientasi (auto-assign) antar departemen (HR, IT, GA, User). Karyawan baru dapat mengakses portal ESS mandiri untuk mengunggah dokumen administrasi dan memantau tugas pengenalan lingkungan kerja.',
      },
      {
        subtitle: 'Offboarding & Exit Clearance:',
        body: 'Modul Offboarding Overview mencakup proses pemberhentian/pengunduran diri terkoordinasi: serah terima tugas (handover), pengembalian fasilitas/inventaris kantor (laptop, seragam, access card, kendaraan) yang menghasilkan Berita Acara Serah Terima (BAST) Aset berformat PDF resmi, hingga penerbitan otomatis Surat Pengalaman Kerja (Paklaring).',
      },
    ],
  },
  {
    num: '5',
    title: 'Fleksibilitas Tanggal Transfer Gaji (Tgl 29) & Komisi (Tgl 15) saat Libur',
    subpoints: [
      {
        subtitle: 'Fleksibilitas Tanpa Penguncian Kaku:',
        body: 'Di PeopleHub, tanggal pembayaran gaji maupun komisi tidak pernah dikunci secara kaku (*hardcoded*). HR memiliki kendali penuh menentukan tanggal eksekusi transfer sebelum file batch disbursement bank (BCA Payroll format / Excel Transfer Bank) diekspor.',
      },
      {
        subtitle: 'Integrasi Kalender Libur Nasional & Kebijakan Operasional:',
        body: 'Sistem terintegrasi dengan kalender libur nasional dan cuti bersama. Apabila tanggal 29 atau tanggal 15 jatuh pada hari Sabtu, Minggu, atau hari libur nasional, HR dapat memilih: Opsi Auto-Roll (sistem otomatis menyarankan memajukan tanggal pembayaran ke hari kerja efektif sebelumnya) atau Opsi Manual Override (HR menentukan tanggal sesuai instruksi pimpinan bulan bersangkutan).',
      },
    ],
  },
  {
    num: '6',
    title: 'Masa Garansi (Guarantee) 6 Bulan Pasca Go-Live',
    subpoints: [
      {
        subtitle: 'Komitmen Kemitraan & Stabilisasi Sistem:',
        body: 'Permintaan masa garansi 6 bulan kami terima dan kami setujui penuh. Periode ini menjadi fase stabilisasi (*hypercare*) untuk memastikan seluruh pengguna beradaptasi sempurna dengan sistem.',
      },
      {
        subtitle: 'Ruang Lingkup Garansi 6 Bulan:',
        body: 'Mencakup: (1) Penanganan bug fixing dan perbaikan teknis tanpa biaya tambahan; (2) Pendampingan langsung tim konsultan selama 6 kali periode cut-off penggajian bulanan; (3) Penyesuaian minor formula absensi, denda, atau template laporan; (4) Layanan bantuan teknis melalui dedicated WhatsApp Group dan remote desktop dengan SLA respon <= 2 jam pada jam kerja operasional.',
      },
    ],
  },
  {
    num: '7',
    title: 'Bonus 5 User License Tambahan',
    subpoints: [
      {
        subtitle: 'Pemberian Bonus Lisensi:',
        body: 'Permintaan penambahan bonus 5 user license disetujui tanpa kendala. PeopleHub menggunakan sistem otorisasi berbasis peran (Role-Based Access Control) yang sangat fleksibel.',
      },
      {
        subtitle: 'Pemanfaatan Lisensi:',
        body: '5 lisensi tambahan ini dapat dialokasikan untuk level Branch Manager, Supervisor Gudang, Finance Approver, atau Board of Directors tanpa dikenakan biaya lisensi tambahan.',
      },
    ],
  },
  {
    num: '8',
    title: 'Layanan Migrasi Data Eksisting HR (Excel & Odoo)',
    subpoints: [
      {
        subtitle: 'Termasuk dalam Paket Layanan Implementasi:',
        body: 'Seluruh migrasi data awal telah termasuk ke dalam paket pekerjaan (*included*), tanpa biaya migrasi terpisah. Tim implementasi PeopleHub akan mendampingi dan mengeksekusi pemindahan data hingga siap beroperasi.',
      },
      {
        subtitle: 'Data yang Dimigrasikan:',
        body: 'Meliputi: Master data lengkap seluruh karyawan aktif beserta anggota keluarga, struktur organisasi (departemen, jabatan, job level), saldo cuti tahunan berjalan, serta nomor rekening bank dan nama pemilik rekening. Bagi modul yang terhubung ke Odoo, sinkronisasi otomatis dijalankan untuk menyamakan data Odoo Contact & Employee.',
      },
    ],
  },
  {
    num: '9',
    title: 'Pencatatan Surat Peringatan (SP Lisan & Tulisan)',
    subpoints: [
      {
        subtitle: 'Penambahan Sub-Modul Disiplin Karyawan:',
        body: 'Modul ini dimasukkan secara eksplisit ke dalam ruang lingkup implementasi. Modul menyediakan pencatatan sanksi berjenjang: Teguran Lisan, SP 1, SP 2, dan SP 3 (Peringatan Terakhir).',
      },
      {
        subtitle: 'Parameter & Keterhubungan Data:',
        body: 'Mencakup: Nomor Surat Resmi, Tanggal Kejadian, Jenis Pelanggaran, Bukti Pendukung, Kronologi, dan Upload Berkas PDF bertanda tangan. Sistem menghitung masa berlaku sanksi (default 6 bulan) dan memberikan notifikasi sebelum SP kedaluwarsa. Data SP terhubung otomatis ke riwayat karyawan sebagai pertimbangan penilaian performa dan perpanjangan kontrak.',
      },
    ],
  },
  {
    num: '10',
    title: 'Perhitungan Tunjangan Hari Raya (THR Keagamaan)',
    subpoints: [
      {
        subtitle: 'Kalkulator THR Otomatis Berdasarkan Regulasi:',
        body: 'Fitur kalkulasi THR dimasukkan ke dalam proposal resmi. Kalkulator PeopleHub mengacu pada Permenaker No. 6 Tahun 2016: Karyawan dengan masa kerja 12 bulan atau lebih berhak menerima 1 bulan upah penuh (Gaji Pokok + Tunjangan Tetap); Karyawan dengan masa kerja 1 bulan s/d kurang dari 12 bulan dihitung secara proporsional otomatis: (Masa Kerja dalam Bulan / 12) x 1 Bulan Upah.',
      },
      {
        subtitle: 'Integrasi Pajak PPh 21:',
        body: 'Perhitungan pemotongan pajak atas THR secara otomatis menggunakan skema Tarif Efektif Rata-Rata (TER) PPh 21 sesuai PP 58/2023, sehingga nilai bersih yang diterima karyawan akurat dan sah secara regulasi perpajakan.',
      },
    ],
  },
  {
    num: '11',
    title: 'Kustomisasi Komponen Gaji & Persentase Pembagian',
    subpoints: [
      {
        subtitle: 'Fleksibilitas Komponen Penggajian:',
        body: 'Arsitektur penggajian PeopleHub dirancang 100% modular dan dinamis. HR dapat menambah, mengubah, atau menonaktifkan komponen penambah (Tunjangan Jabatan, Uang Makan, Insentif Penjualan/Livestream, Uang Lembur, Tunjangan Transportasi) maupun komponen pengurang (Denda Keterlambatan Fingerspot, Potongan Alpha, Angsuran Pinjaman/Kasbon).',
      },
      {
        subtitle: 'Pengaturan Rasio & Iuran BPJS/Pajak:',
        body: 'Persentase pembagian iuran BPJS Kesehatan (4% perusahaan vs 1% karyawan) dan BPJS Ketenagakerjaan (JHT, JP, JKK, JKM) dapat disesuaikan sewaktu-waktu melalui menu Payroll Settings tanpa perlu melakukan pembaruan kode program (*no code changes*).',
      },
    ],
  },
  {
    num: '12',
    title: 'Rekomendasi Layanan Cloud Hosting',
    subpoints: [
      {
        subtitle: 'Pertimbangan Teknis Infrastruktur:',
        body: 'Agar PeopleHub beroperasi dengan latensi minimal, sinkronisasi mesin presensi gudang berjalan mulus, dan data karyawan aman, kami menyarankan server Virtual Private Server (VPS) berlokasi di dalam negeri (Region Jakarta).',
      },
      {
        subtitle: 'Opsi Rekomendasi Provider:',
        body: '1. Alibaba Cloud / Tencent Cloud (Region Jakarta) - Rekomendasi Utama: Paket 2 vCPU, 4 GB RAM, 60 GB NVMe SSD dengan estimasi biaya Rp 450.000 – Rp 650.000/bulan (latensi sangat rendah <10ms, peering lokal IIX handal).\n2. Biznet Gio / IDCloudHost (Lokal Indonesia): Kepatuhan 100% terhadap UU Perlindungan Data Pribadi (UU PDP No. 27/2022) dengan pembayaran resmi Rupiah & Faktur Pajak.\n3. DigitalOcean (Singapore Region): Basic Droplet 2 vCPU, 4 GB RAM, estimasi $28/bulan (~Rp 450.000) dengan SLA uptime 99.99%.',
      },
    ],
  },
  {
    num: '13',
    title: 'Penjelasan & Justifikasi Diskon Harga Implementasi',
    subpoints: [
      {
        subtitle: 'Pemberian Diskon Kemitraan Strategis:',
        body: 'Kami siap memberikan Special Partnership Discount sebesar 10% - 15% dari total nilai jasa implementasi.',
      },
      {
        subtitle: 'Justifikasi Nilai Investasi untuk Manajemen:',
        body: 'Dengan nilai investasi setelah diskon, klien telah memperoleh fasilitas nilai tambah tanpa biaya tersembunyi: (a) Gratis Masa Garansi Penuh 6 Bulan pasca go-live senilai belasan juta rupiah; (b) Gratis Bonus 5 User License; (c) Gratis Layanan Pembersihan & Migrasi Data Awal; (d) Hak Milik Sistem Tanpa Biaya Berlangganan Per-Kepala Karyawan (Self-Hosted / No Recurring Per-User Fee).',
      },
    ],
  },
]

// Formal letter draft text
const clientDraftText = [
  'Yth. Bapak/Ibu Manajemen & Tim HR,',
  '',
  'Terima kasih atas evaluasi dan pertanyaan konstruktif yang disampaikan terkait proposal PeopleHub HCM. Berikut kami sampaikan penjelasan menyeluruh untuk setiap poin kebutuhan Bapak/Ibu:',
  '',
  '1. Reminder & Penilaian Kontrak/Probation: Sistem PeopleHub memiliki notifikasi otomatis berkala (H-60, H-30, H-14, H-7, H-1) ke atasan dan HR. Pada notifikasi H-30/H-60, atasan langsung disajikan formulir evaluasi penilaian probation/kontrak secara digital di portal atasan (MSS) sebelum surat perpanjangan diterbitkan.',
  '2. Dokumen Digital: Sangat bisa. Modul Master Document Types mendukung Foto formal, CV, KTP, NPWP, Ijazah, Kontrak Kerja, hingga sertifikat (format PDF, Word, Excel, JPG/PNG) dilengkapi widget persentase kelengkapan berkas karyawan.',
  '3. Fleksibilitas Mesin Absensi: Sangat bisa. PeopleHub dirancang multi-device dan tidak mengunci satu merk mesin. Apabila di masa depan berganti mesin merk lain, sistem kami siap menerima data melalui integrasi API maupun upload log Excel/CSV.',
  '4. Checklist Onboarding & Offboarding: Sudah tersedia lengkap di PeopleHub, mulai dari orientasi karyawan baru, checklist tugas lintas divisi, proses exit clearance, serah terima fasilitas (BAST Aset PDF), hingga penerbitan Paklaring otomatis.',
  '5. Tanggal Transfer Gaji (Tgl 29) & Komisi (Tgl 15): Tanggal tidak dikunci baku. HR memiliki kebebasan penuh menentukan tanggal pembayaran aktual, dan sistem terhubung dengan kalender libur nasional sehingga dapat otomatis diajukan jika bertepatan dengan akhir pekan/tanggal merah.',
  '6. Garansi 6 Bulan: Kami setujui penuh. Klien mendapatkan masa garansi 6 bulan pasca Go-Live mencakup penanganan error/bug, konsultasi teknis, dan pendampingan 6 kali periode cut-off payroll bulanan.',
  '7. Bonus 5 User License: Kami setujui dan kami berikan cuma-cuma sebagai bentuk apresiasi dan komitmen kemitraan.',
  '8. Migrasi Data HR Eksisting: Tim implementasi kami mendampingi dan mengeksekusi migrasi seluruh data master karyawan eksisting dari Excel maupun database Odoo Bapak/Ibu hingga tuntas siap pakai.',
  '9. Pencatatan Surat Peringatan (SP): Kami masukkan ke dalam scope implementasi, mencakup SP lisan, SP 1, 2, 3, upload dokumen PDF, riwayat pelanggaran, dan pelacakan masa berlaku sanksi 6 bulan.',
  '10. Perhitungan THR: Kami cantumkan resmi di proposal. Sistem menghitung otomatis THR 1 bulan upah penuh (masa kerja >= 12 bulan) maupun proporsional (< 12 bulan) beserta pemotongan pajak PPh 21 TER-nya.',
  '11. Kustomisasi Komponen Gaji: Sangat fleksibel. HR dapat menambah/mengurangi tunjangan tetap, tunjangan variabel, insentif, potongan denda absensi, serta mengatur persentase iuran BPJS dan pajak sesuai kebijakan perusahaan.',
  '12. Rekomendasi Cloud Hosting: Kami menyarankan VPS di Alibaba Cloud / Tencent Cloud (Region Jakarta) atau Biznet Gio dengan spesifikasi 2 vCPU, 4 GB RAM, 60-80 GB SSD (biaya sangat efisien, sekitar Rp 450.000 – Rp 650.000/bulan).',
  '13. Penyesuaian Harga Implementasi: Kami memberikan Special Partnership Discount sebesar 10% - 15% di mana nilai tersebut sudah mencakup bundling garansi 6 bulan, bonus 5 user lisensi, integrasi multi-mesin, dan migrasi data awal tanpa biaya tersembunyi.',
  '',
  'Draf dokumen proposal resmi yang telah diperbarui dengan mencantumkan poin-poin di atas siap kami kirimkan. Terima kasih atas kepercayaan dan kerjasama yang terjalin dengan baik.',
]

async function generateDocx() {
  console.log('Generating Word document (.docx)...')

  // Document children array
  const children = []

  // Document Header Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: 'PEOPLEHUB HUMAN CAPITAL MANAGEMENT',
          bold: true,
          size: 28,
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
          text: 'DOKUMEN ANALISIS & TANGGAPAN RESMI PROPOSAL',
          bold: true,
          size: 36,
          color: COLOR_TEAL,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 360 },
      children: [
        new TextRun({
          text: 'Evaluasi Teknis & Tanggapan terhadap 13 Poin Kebutuhan Klien',
          size: 22,
          color: COLOR_DARK_GRAY,
          italics: true,
          font: 'Calibri',
        }),
      ],
    }),
  )

  // Metadata Table (Horizontal bar)
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            borders: {
              left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_NAVY },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Tanggal Evaluasi: ', bold: true, size: 18, font: 'Calibri' }),
                  new TextRun({ text: '19 November 2026', size: 18, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Status Dokumen: ', bold: true, size: 18, font: 'Calibri' }),
                  new TextRun({ text: 'Official Proposal Response', size: 18, font: 'Calibri' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            borders: {
              right: { style: BorderStyle.SINGLE, size: 24, color: COLOR_TEAL },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Disiapkan Oleh: ', bold: true, size: 18, font: 'Calibri' }),
                  new TextRun({ text: 'Solutions & Implementation Team', size: 18, font: 'Calibri' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Platform: ', bold: true, size: 18, font: 'Calibri' }),
                  new TextRun({ text: 'PeopleHub HCM v2.4 (Integrated with Odoo & Biometrics)', size: 18, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
  children.push(metaTable)

  children.push(new Paragraph({ spacing: { before: 240, after: 120 } }))

  // --- SECTION 1: MATRIKS KESIMPULAN CEPAT ---
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 140 },
      children: [
        new TextRun({
          text: '1. Ringkasan Eksekutif & Matriks Kesiapan Fitur (13 Poin)',
          bold: true,
          size: 26,
          color: COLOR_NAVY,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: 'Berdasarkan evaluasi terhadap 13 butir pertanyaan dan kebutuhan yang diajukan oleh pihak manajemen & tim HR klien, seluruh poin kebutuhan dapat diakomodasi dengan sangat baik oleh sistem PeopleHub HCM tanpa adanya hambatan teknis mendasar. Rangkuman status kesiapan disajikan pada tabel matriks di bawah ini:',
          size: 20,
          color: COLOR_DARK_GRAY,
          font: 'Calibri',
        }),
      ],
    }),
  )

  // Summary Table
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_NAVY },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '#', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 36, type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_NAVY },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Pertanyaan / Kebutuhan Klien', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_NAVY },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Status Kesiapan', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_NAVY },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Keterangan & Solusi PeopleHub', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
            }),
          ],
        }),
      ],
    }),
  ]

  summaryItems.forEach((item, index) => {
    const isEven = index % 2 === 1
    const rowBg = isEven ? COLOR_LIGHT_BG : 'FFFFFF'

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: item.no, size: 18, bold: true, font: 'Calibri' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 36, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.topic, size: 18, bold: true, font: 'Calibri', color: COLOR_NAVY })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { fill: item.statusBg },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: item.status, size: 17, bold: true, color: item.statusColor, font: 'Calibri' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.desc, size: 17, font: 'Calibri', color: COLOR_DARK_GRAY })],
              }),
            ],
          }),
        ],
      }),
    )
  })

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  })
  children.push(summaryTable)

  children.push(new Paragraph({ spacing: { before: 300, after: 120 } }))

  // --- SECTION 2: ANALISIS MENDALAM PER POIN ---
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 140 },
      children: [
        new TextRun({
          text: '2. Analisis Mendalam & Jawaban Teknis (13 Poin Kebutuhan)',
          bold: true,
          size: 26,
          color: COLOR_NAVY,
          font: 'Calibri',
        }),
      ],
    }),
  )

  detailedPoints.forEach((p) => {
    // Heading 2 per question
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({
            text: `Poin ${p.num}: ${p.title}`,
            bold: true,
            size: 22,
            color: COLOR_TEAL,
            font: 'Calibri',
          }),
        ],
      }),
    )

    p.subpoints.forEach((sp) => {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({
              text: `• ${sp.subtitle} `,
              bold: true,
              size: 20,
              color: COLOR_NAVY,
              font: 'Calibri',
            }),
            new TextRun({
              text: sp.body,
              size: 20,
              color: COLOR_DARK_GRAY,
              font: 'Calibri',
            }),
          ],
        }),
      )
    })
  })

  children.push(new Paragraph({ spacing: { before: 300, after: 120 } }))

  // --- SECTION 3: DRAF PESAN RESMI UNTUK KLIEN ---
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 140 },
      children: [
        new TextRun({
          text: '3. Draf Balasan Resmi untuk Pihak Manajemen & Klien',
          bold: true,
          size: 26,
          color: COLOR_NAVY,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 160 },
      children: [
        new TextRun({
          text: 'Teks berikut siap digunakan sebagai redaksi balasan surat resmi, email korporat, atau pesan resmi kemitraan kepada pimpinan dan tim HR klien:',
          size: 20,
          color: COLOR_DARK_GRAY,
          font: 'Calibri',
        }),
      ],
    }),
  )

  // Draft box as a shaded callout table
  const draftParagraphs = clientDraftText.map((t) => {
    if (!t) return new Paragraph({ spacing: { before: 60, after: 60 } })
    const isHeader = t.startsWith('Yth.') || t.startsWith('Terima kasih')
    return new Paragraph({
      spacing: { before: 40, after: 60 },
      children: [
        new TextRun({
          text: t,
          size: 19,
          bold: isHeader,
          color: COLOR_NAVY,
          font: 'Calibri',
        }),
      ],
    })
  })

  const draftTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            borders: {
              left: { style: BorderStyle.SINGLE, size: 36, color: COLOR_TEAL },
              top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
            },
            children: draftParagraphs,
          }),
        ],
      }),
    ],
  })
  children.push(draftTable)

  // Construct Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
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
                    text: 'PeopleHub HCM — Analisis Kebutuhan Klien & Proposal Response',
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
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  // Export buffer
  const buffer = await Packer.toBuffer(doc)

  // Target paths
  const outputPath1 = path.resolve('Analisis_Jawaban_Proposal_13_Kebutuhan_Klien_PeopleHub.docx')
  const outputPath2 = 'C:/Users/lahirs/.gemini/antigravity/brain/0150dd40-c12f-414d-a7be-64cae4a8de9d/Analisis_Jawaban_Proposal_13_Kebutuhan_Klien_PeopleHub.docx'

  fs.writeFileSync(outputPath1, buffer)
  console.log(`Saved to Workspace: ${outputPath1} (${buffer.length} bytes)`)

  fs.writeFileSync(outputPath2, buffer)
  console.log(`Saved to Brain Artifacts: ${outputPath2} (${buffer.length} bytes)`)
}

generateDocx().catch((err) => {
  console.error('Error generating docx:', err)
  process.exit(1)
})
