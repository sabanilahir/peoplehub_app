import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _id = 500

// ── Seed data helpers ──────────────────────────────────────────────────────────
const cc = (p, i, aspect, keyBehaviors) => ({ id: p * 100 + 10 + i, no: i + 1, aspect, keyBehaviors })
const sl = (p, i, aspect, keyBehaviors) => ({ id: p * 100 + 20 + i, no: i + 1, aspect, keyBehaviors })
const tc = (p, i, aspect, keyBehaviors) => ({ id: p * 100 + 30 + i, no: i + 1, aspect, keyBehaviors })

const ENG_CC = (p) => [
  cc(p, 0, 'Problem Solving & Analysis', 'Mengidentifikasi, menganalisis, dan menyelesaikan masalah teknis secara sistematis dan efektif.'),
  cc(p, 1, 'Systems Thinking', 'Memahami interkoneksi antar komponen sistem dan dampak perubahan secara holistik.'),
  cc(p, 2, 'Collaboration & Teamwork', 'Bekerja sama secara efektif dalam tim lintas fungsi untuk mencapai tujuan bersama.'),
  cc(p, 3, 'Continuous Learning', 'Secara aktif memperbarui pengetahuan dan keterampilan teknis sesuai perkembangan industri.'),
]
const FIN_CC = (p) => [
  cc(p, 0, 'Financial Analysis', 'Menganalisis data keuangan untuk mendukung pengambilan keputusan bisnis yang tepat.'),
  cc(p, 1, 'Risk Management', 'Mengidentifikasi, menilai, dan memitigasi risiko keuangan secara proaktif.'),
  cc(p, 2, 'Regulatory Compliance', 'Memastikan seluruh aktivitas keuangan sesuai regulasi dan standar akuntansi yang berlaku.'),
  cc(p, 3, 'Business Acumen', 'Memahami model bisnis dan implikasi keuangan dari setiap keputusan operasional.'),
]
const HR_CC = (p) => [
  cc(p, 0, 'Talent Management', 'Mengidentifikasi, mengembangkan, dan mempertahankan talenta terbaik dalam organisasi.'),
  cc(p, 1, 'Employee Relations', 'Membangun hubungan kerja yang harmonis dan menangani isu ketenagakerjaan secara profesional.'),
  cc(p, 2, 'HR Process Excellence', 'Menjalankan proses HR secara efisien, akurat, dan sesuai kebijakan perusahaan.'),
  cc(p, 3, 'Data-Driven HR', 'Menggunakan data dan analitik untuk mendukung keputusan dan strategi HR.'),
]
const IT_CC = (p) => [
  cc(p, 0, 'Technical Infrastructure', 'Mengelola dan memelihara infrastruktur IT untuk memastikan ketersediaan dan keandalan sistem.'),
  cc(p, 1, 'Security & Compliance', 'Menerapkan standar keamanan IT dan memastikan kepatuhan terhadap regulasi.'),
  cc(p, 2, 'Service Management', 'Memberikan layanan IT yang responsif dan berkualitas tinggi kepada pengguna.'),
  cc(p, 3, 'Technology Evaluation', 'Mengevaluasi dan merekomendasikan teknologi baru yang relevan untuk kebutuhan bisnis.'),
]

const STRAT_SL = (p) => [
  sl(p, 0, 'Strategic Vision', 'Menetapkan arah strategis yang jelas dan menyelaraskan tim dengan tujuan organisasi jangka panjang.'),
  sl(p, 1, 'People Leadership', 'Memimpin, menginspirasi, dan mengembangkan tim untuk mencapai kinerja dan potensi optimal.'),
  sl(p, 2, 'Business Decision Making', 'Mengambil keputusan strategis yang berdampak positif bagi bisnis berdasarkan analisis mendalam.'),
  sl(p, 3, 'Organizational Influence', 'Membangun pengaruh dan kepercayaan lintas organisasi untuk mendorong kolaborasi dan transformasi.'),
]

const SEED_PROFILES = [
  // POS001: Junior Software Engineer (grade 10)
  {
    id: 1, positionId: 1,
    coreCompetency: ENG_CC(1),
    strategicLeadership: [],
    technicalCompetency: [
      tc(1, 0, 'Programming Fundamentals', 'Menguasai dasar-dasar pemrograman, struktur data, dan algoritma yang relevan dengan stack teknologi yang digunakan.'),
      tc(1, 1, 'Version Control (Git)', 'Menggunakan Git secara efektif: branching, merging, pull request, dan code review dalam lingkungan tim.'),
      tc(1, 2, 'Code Quality', 'Menulis kode yang bersih, terdokumentasi, dan mengikuti standar coding serta best practice yang berlaku.'),
      tc(1, 3, 'Debugging & Testing', 'Melakukan debugging secara sistematis dan unit testing untuk memastikan kualitas dan kebenaran kode.'),
    ],
  },
  // POS002: Software Engineer (grade 20)
  {
    id: 2, positionId: 2,
    coreCompetency: ENG_CC(2),
    strategicLeadership: [],
    technicalCompetency: [
      tc(2, 0, 'Software Design Patterns', 'Menerapkan design patterns yang tepat untuk membangun perangkat lunak yang maintainable dan scalable.'),
      tc(2, 1, 'API Development', 'Merancang dan mengembangkan RESTful API yang handal, aman, dan terdokumentasi dengan baik.'),
      tc(2, 2, 'Database Proficiency', 'Mengelola dan mengoptimalkan query database relasional maupun non-relasional sesuai kebutuhan aplikasi.'),
      tc(2, 3, 'CI/CD & DevOps', 'Memahami dan berkontribusi pada proses continuous integration, automated testing, dan deployment.'),
    ],
  },
  // POS003: Senior Software Engineer (grade 30)
  {
    id: 3, positionId: 3,
    coreCompetency: ENG_CC(3),
    strategicLeadership: [],
    technicalCompetency: [
      tc(3, 0, 'System Architecture', 'Merancang arsitektur sistem yang skalabel, maintainable, dan sesuai dengan kebutuhan bisnis jangka panjang.'),
      tc(3, 1, 'Technical Mentoring', 'Membimbing dan meningkatkan kemampuan teknis engineer junior melalui code review, pair programming, dan knowledge sharing.'),
      tc(3, 2, 'Performance Optimization', 'Mengidentifikasi bottleneck performa dan mengimplementasikan optimasi yang terukur dan efektif.'),
      tc(3, 3, 'Cross-Team Collaboration', 'Berkolaborasi secara efektif dengan tim lain dalam perencanaan teknis dan implementasi solusi lintas sistem.'),
    ],
  },
  // POS004: Engineering Manager (grade 53) — PC >= 53
  {
    id: 4, positionId: 4,
    coreCompetency: ENG_CC(4),
    strategicLeadership: STRAT_SL(4),
    technicalCompetency: [
      tc(4, 0, 'Technical Roadmap Planning', 'Menyusun dan mengelola roadmap teknis yang selaras dengan strategi produk dan tujuan bisnis.'),
      tc(4, 1, 'Engineering Team Development', 'Mengembangkan kapabilitas teknis tim melalui coaching, mentoring, dan strategi rekrutmen yang tepat.'),
      tc(4, 2, 'Technical Risk Management', 'Mengidentifikasi, mengevaluasi, dan memitigasi risiko teknis dalam proyek dan operasional sistem.'),
      tc(4, 3, 'Cross-Functional Delivery', 'Memimpin koordinasi teknis lintas tim untuk memastikan delivery produk yang berkualitas dan tepat waktu.'),
    ],
  },
  // POS005: IT Support (grade 15)
  {
    id: 5, positionId: 5,
    coreCompetency: IT_CC(5),
    strategicLeadership: [],
    technicalCompetency: [
      tc(5, 0, 'Hardware & Software Troubleshooting', 'Mendiagnosis dan menyelesaikan masalah hardware dan software secara akurat dan efisien.'),
      tc(5, 1, 'Network Administration', 'Mengelola dan memelihara infrastruktur jaringan dasar termasuk LAN, WiFi, dan konektivitas internet.'),
      tc(5, 2, 'User Support & Service Desk', 'Memberikan dukungan teknis yang responsif, ramah, dan profesional kepada seluruh pengguna akhir.'),
      tc(5, 3, 'IT Documentation', 'Mendokumentasikan prosedur IT, konfigurasi sistem, dan panduan troubleshooting secara tertib dan akurat.'),
    ],
  },
  // POS006: Finance Analyst (grade 20)
  {
    id: 6, positionId: 6,
    coreCompetency: FIN_CC(6),
    strategicLeadership: [],
    technicalCompetency: [
      tc(6, 0, 'Financial Reporting', 'Menyusun laporan keuangan yang akurat, tepat waktu, dan sesuai standar akuntansi yang berlaku.'),
      tc(6, 1, 'Budget Management', 'Mendukung proses penyusunan anggaran dan melakukan monitoring realisasi vs anggaran secara berkala.'),
      tc(6, 2, 'Data Analysis & Modeling', 'Menggunakan tools analitik (Excel, ERP, BI) untuk mengolah data keuangan dan membuat model proyeksi.'),
      tc(6, 3, 'Tax & Regulatory Knowledge', 'Memahami peraturan perpajakan dan regulasi keuangan yang berlaku serta implikasinya terhadap bisnis.'),
    ],
  },
  // POS007: Finance Manager (grade 54) — PC >= 53
  {
    id: 7, positionId: 7,
    coreCompetency: FIN_CC(7),
    strategicLeadership: STRAT_SL(7),
    technicalCompetency: [
      tc(7, 0, 'Financial Strategy', 'Merancang dan mengimplementasikan strategi keuangan yang mendukung pertumbuhan dan keberlanjutan bisnis.'),
      tc(7, 1, 'Treasury Management', 'Mengelola likuiditas, arus kas, dan risiko keuangan perusahaan secara optimal dan terencana.'),
      tc(7, 2, 'Financial Governance', 'Memastikan tata kelola keuangan yang baik dan kepatuhan terhadap seluruh regulasi yang berlaku.'),
      tc(7, 3, 'Stakeholder Financial Communication', 'Mengomunikasikan kondisi dan strategi keuangan kepada pemangku kepentingan secara efektif dan transparan.'),
    ],
  },
  // POS008: Senior Manager Engineering (grade 58) — PC >= 53
  {
    id: 8, positionId: 8,
    coreCompetency: ENG_CC(8),
    strategicLeadership: STRAT_SL(8),
    technicalCompetency: [
      tc(8, 0, 'Engineering Strategy', 'Merumuskan strategi engineering jangka menengah yang selaras dengan arah teknologi dan bisnis perusahaan.'),
      tc(8, 1, 'Technology Architecture', 'Memimpin desain arsitektur teknologi tingkat organisasi yang skalabel, aman, dan future-proof.'),
      tc(8, 2, 'Multi-Team Coordination', 'Mengoordinasikan kerja lintas tim engineering untuk memastikan keselarasan teknis dan efisiensi delivery.'),
      tc(8, 3, 'Innovation & R&D Leadership', 'Mendorong budaya inovasi dan memimpin inisiatif R&D untuk memperkuat keunggulan teknologi perusahaan.'),
    ],
  },
  // POS009: General Manager Engineering (grade 61) — PC >= 53
  {
    id: 9, positionId: 9,
    coreCompetency: ENG_CC(9),
    strategicLeadership: STRAT_SL(9),
    technicalCompetency: [
      tc(9, 0, 'Engineering Excellence', 'Membangun dan menjaga standar engineering excellence di seluruh organisasi teknis.'),
      tc(9, 1, 'Technology Vision', 'Mendefinisikan visi teknologi perusahaan yang inovatif dan relevan dengan tren industri global.'),
      tc(9, 2, 'Organization Capability Building', 'Mengembangkan kapabilitas organisasi engineering secara sistematis untuk mendukung pertumbuhan bisnis.'),
      tc(9, 3, 'Technology Partnership', 'Membangun dan mengelola kemitraan strategis dengan vendor dan ekosistem teknologi eksternal.'),
    ],
  },
  // POS010: General Manager IT (grade 61) — PC >= 53
  {
    id: 10, positionId: 10,
    coreCompetency: IT_CC(10),
    strategicLeadership: STRAT_SL(10),
    technicalCompetency: [
      tc(10, 0, 'IT Strategy & Governance', 'Menyusun dan mengimplementasikan strategi IT yang mendukung tujuan bisnis dan tata kelola yang baik.'),
      tc(10, 1, 'Enterprise Architecture', 'Merancang dan mengelola arsitektur enterprise IT yang terintegrasi dan efisien di seluruh organisasi.'),
      tc(10, 2, 'Digital Transformation', 'Memimpin inisiatif transformasi digital yang meningkatkan efisiensi operasional dan pengalaman pengguna.'),
      tc(10, 3, 'IT Risk Management', 'Mengidentifikasi dan memitigasi risiko IT termasuk keamanan siber, ketersediaan sistem, dan pemulihan bencana.'),
    ],
  },
  // POS011: General Manager HR (grade 61) — PC >= 53
  {
    id: 11, positionId: 11,
    coreCompetency: HR_CC(11),
    strategicLeadership: STRAT_SL(11),
    technicalCompetency: [
      tc(11, 0, 'HR Strategy', 'Merumuskan dan mengimplementasikan strategi HR yang mendukung pertumbuhan dan tujuan strategis perusahaan.'),
      tc(11, 1, 'Organizational Development', 'Merancang dan memimpin program pengembangan organisasi untuk meningkatkan efektivitas dan efisiensi.'),
      tc(11, 2, 'Culture Transformation', 'Memimpin inisiatif transformasi budaya organisasi yang mendorong keterlibatan dan kinerja tinggi.'),
      tc(11, 3, 'HR Technology & Innovation', 'Mengadopsi dan memanfaatkan teknologi HR terkini untuk meningkatkan kualitas layanan dan pengambilan keputusan.'),
    ],
  },
  // POS012: General Manager Finance (grade 62) — PC >= 53
  {
    id: 12, positionId: 12,
    coreCompetency: FIN_CC(12),
    strategicLeadership: STRAT_SL(12),
    technicalCompetency: [
      tc(12, 0, 'Financial Planning & Analysis', 'Memimpin proses perencanaan keuangan, forecasting, dan analisis kinerja keuangan organisasi secara komprehensif.'),
      tc(12, 1, 'Corporate Finance', 'Mengelola struktur modal, pembiayaan, dan keputusan investasi strategis perusahaan.'),
      tc(12, 2, 'Financial Risk Control', 'Membangun dan mengawasi sistem pengendalian risiko keuangan yang efektif dan komprehensif.'),
      tc(12, 3, 'Regulatory & Tax Management', 'Memastikan kepatuhan penuh terhadap regulasi keuangan, perpajakan, dan pelaporan yang berlaku.'),
    ],
  },
  // POS013: Vice President Engineering (grade 64) — PC >= 53
  {
    id: 13, positionId: 13,
    coreCompetency: ENG_CC(13),
    strategicLeadership: STRAT_SL(13),
    technicalCompetency: [
      tc(13, 0, 'Technology Strategy', 'Mendefinisikan dan memimpin strategi teknologi jangka panjang yang mendukung visi dan misi perusahaan.'),
      tc(13, 1, 'Engineering Portfolio Management', 'Mengelola portofolio inisiatif engineering dengan mempertimbangkan prioritas bisnis dan alokasi sumber daya.'),
      tc(13, 2, 'Innovation Leadership', 'Memimpin dan mengkatalisis budaya inovasi yang menghasilkan terobosan teknologi dan keunggulan kompetitif.'),
      tc(13, 3, 'Technology Community', 'Membangun reputasi perusahaan di komunitas teknologi melalui open source, konferensi, dan thought leadership.'),
    ],
  },
  // POS014: Vice President HR (grade 64) — PC >= 53
  {
    id: 14, positionId: 14,
    coreCompetency: HR_CC(14),
    strategicLeadership: STRAT_SL(14),
    technicalCompetency: [
      tc(14, 0, 'People Strategy', 'Merumuskan strategi pengelolaan talenta dan SDM yang mendukung pertumbuhan jangka panjang perusahaan.'),
      tc(14, 1, 'Total Rewards Strategy', 'Merancang dan mengimplementasikan sistem kompensasi dan benefit yang kompetitif dan berkelanjutan.'),
      tc(14, 2, 'HR Transformation', 'Memimpin transformasi fungsi HR menuju model operasi yang lebih strategis, digital, dan berdampak tinggi.'),
      tc(14, 3, 'Organizational Effectiveness', 'Mengoptimalkan desain organisasi, proses kerja, dan kapabilitas SDM untuk meningkatkan efektivitas keseluruhan.'),
    ],
  },
  // POS015: Vice President Finance (grade 65) — PC >= 53
  {
    id: 15, positionId: 15,
    coreCompetency: FIN_CC(15),
    strategicLeadership: STRAT_SL(15),
    technicalCompetency: [
      tc(15, 0, 'Corporate Financial Strategy', 'Merumuskan dan mengeksekusi strategi keuangan korporat yang mendukung pertumbuhan nilai pemegang saham.'),
      tc(15, 1, 'Capital Management', 'Mengoptimalkan struktur modal dan alokasi kapital untuk memaksimalkan imbal hasil dan pertumbuhan berkelanjutan.'),
      tc(15, 2, 'Investor Relations', 'Memimpin komunikasi dengan investor, analis, dan pasar modal secara transparan dan strategis.'),
      tc(15, 3, 'Financial Performance Management', 'Membangun sistem manajemen kinerja keuangan yang terintegrasi untuk mendorong akuntabilitas dan pencapaian target.'),
    ],
  },
  // POS016: Senior Vice President Engineering (grade 67) — PC >= 53
  {
    id: 16, positionId: 16,
    coreCompetency: ENG_CC(16),
    strategicLeadership: STRAT_SL(16),
    technicalCompetency: [
      tc(16, 0, 'Engineering Vision', 'Mendefinisikan visi engineering perusahaan yang menginspirasi dan mengarahkan seluruh fungsi teknis.'),
      tc(16, 1, 'Technology Product Leadership', 'Memimpin sinergi antara teknologi dan produk untuk menghasilkan inovasi yang bernilai tinggi bagi pelanggan.'),
      tc(16, 2, 'Global Engineering Standards', 'Menetapkan dan memastikan standar engineering kelas dunia yang diterapkan secara konsisten di seluruh organisasi.'),
      tc(16, 3, 'Technology Ecosystem', 'Membangun ekosistem teknologi yang mendukung pertumbuhan, inovasi, dan keunggulan kompetitif berkelanjutan.'),
    ],
  },
  // POS017: Senior Vice President Finance (grade 67) — PC >= 53
  {
    id: 17, positionId: 17,
    coreCompetency: FIN_CC(17),
    strategicLeadership: STRAT_SL(17),
    technicalCompetency: [
      tc(17, 0, 'Group Financial Strategy', 'Merumuskan strategi keuangan grup yang menyelaraskan kepentingan seluruh entitas dan mendorong penciptaan nilai.'),
      tc(17, 1, 'M&A & Corporate Finance', 'Memimpin proses merger, akuisisi, dan transaksi korporat strategis dari aspek keuangan secara end-to-end.'),
      tc(17, 2, 'Financial Risk Governance', 'Membangun kerangka tata kelola risiko keuangan yang komprehensif dan memastikan penerapannya di seluruh organisasi.'),
      tc(17, 3, 'Capital Market Relations', 'Mengelola hubungan dengan pasar modal, lembaga keuangan, dan investor institusional secara strategis.'),
    ],
  },
  // POS018: Chief Technology Officer (grade 70) — PC >= 53
  {
    id: 18, positionId: 18,
    coreCompetency: IT_CC(18),
    strategicLeadership: STRAT_SL(18),
    technicalCompetency: [
      tc(18, 0, 'Technology & Innovation Leadership', 'Memimpin arah teknologi dan inovasi perusahaan untuk menciptakan keunggulan kompetitif yang berkelanjutan.'),
      tc(18, 1, 'Digital Transformation', 'Mendorong dan memimpin transformasi digital yang menyeluruh untuk meningkatkan efisiensi dan nilai bisnis.'),
      tc(18, 2, 'Technology Ecosystem & Partnership', 'Membangun ekosistem mitra teknologi yang mendukung visi dan strategi teknologi perusahaan.'),
      tc(18, 3, 'Technology Governance', 'Menetapkan kerangka tata kelola teknologi yang memastikan keamanan, kepatuhan, dan akuntabilitas di seluruh organisasi.'),
    ],
  },
  // POS019: Chief Financial Officer (grade 70) — PC >= 53
  {
    id: 19, positionId: 19,
    coreCompetency: FIN_CC(19),
    strategicLeadership: STRAT_SL(19),
    technicalCompetency: [
      tc(19, 0, 'Corporate Finance & Treasury', 'Memimpin pengelolaan keuangan korporat, treasury, dan struktur modal perusahaan secara strategis dan optimal.'),
      tc(19, 1, 'Financial Risk Governance', 'Menetapkan dan mengawasi kerangka manajemen risiko keuangan yang komprehensif di seluruh perusahaan.'),
      tc(19, 2, 'Investor Relations & Capital Market', 'Memimpin hubungan dengan investor dan pasar modal, memastikan kepercayaan dan keterbukaan informasi.'),
      tc(19, 3, 'M&A & Business Development Finance', 'Memberikan kepemimpinan keuangan dalam transaksi M&A dan pengembangan bisnis strategis perusahaan.'),
    ],
  },
  // POS020: Chief Human Resources Officer (grade 71) — PC >= 53
  {
    id: 20, positionId: 20,
    coreCompetency: HR_CC(20),
    strategicLeadership: STRAT_SL(20),
    technicalCompetency: [
      tc(20, 0, 'People & Culture Strategy', 'Merumuskan strategi people and culture yang menjadi fondasi pertumbuhan dan keunggulan organisasi.'),
      tc(20, 1, 'Executive Leadership Development', 'Memimpin pengembangan pemimpin eksekutif dan membangun pipeline kepemimpinan yang kuat untuk masa depan.'),
      tc(20, 2, 'Workforce Transformation', 'Mendorong transformasi angkatan kerja melalui reskilling, digitalisasi HR, dan desain organisasi masa depan.'),
      tc(20, 3, 'HR Governance & Compliance', 'Memastikan tata kelola SDM yang kuat, etis, dan patuh terhadap seluruh regulasi ketenagakerjaan yang berlaku.'),
    ],
  },
  // POS021: President Director / CEO (grade 72) — PC >= 53
  {
    id: 21, positionId: 21,
    coreCompetency: ENG_CC(21),
    strategicLeadership: STRAT_SL(21),
    technicalCompetency: [
      tc(21, 0, 'Corporate Strategy', 'Merumuskan dan mengeksekusi strategi korporat jangka panjang yang menciptakan nilai bagi seluruh pemangku kepentingan.'),
      tc(21, 1, 'Business Performance Management', 'Memimpin pencapaian kinerja bisnis secara holistik melalui penetapan target, monitoring, dan koreksi yang tepat waktu.'),
      tc(21, 2, 'Stakeholder & Board Relations', 'Membangun dan menjaga kepercayaan seluruh pemangku kepentingan termasuk dewan direksi, investor, dan regulator.'),
      tc(21, 3, 'Organizational Leadership', 'Memimpin transformasi organisasi secara menyeluruh dengan membangun budaya kinerja tinggi dan inovasi berkelanjutan.'),
    ],
  },
  // POS022: HR Manager — NTK (grade 53) — PC >= 53
  {
    id: 22, positionId: 22,
    coreCompetency: HR_CC(22),
    strategicLeadership: STRAT_SL(22),
    technicalCompetency: [
      tc(22, 0, 'HR Business Partnering', 'Berperan sebagai mitra strategis bisnis dalam merencanakan dan mengeksekusi inisiatif HR yang berdampak.'),
      tc(22, 1, 'Talent Acquisition & Development', 'Memimpin proses rekrutmen end-to-end dan merancang program pengembangan talenta yang efektif.'),
      tc(22, 2, 'Performance Management', 'Mengelola siklus performance management dan mendorong budaya feedback yang berkelanjutan dan konstruktif.'),
      tc(22, 3, 'Industrial Relations & Compliance', 'Mengelola hubungan industrial dan memastikan kepatuhan terhadap seluruh regulasi ketenagakerjaan yang berlaku.'),
    ],
  },
  // POS023: HR Officer — NTK (grade 20)
  {
    id: 23, positionId: 23,
    coreCompetency: HR_CC(23),
    strategicLeadership: [],
    technicalCompetency: [
      tc(23, 0, 'HRIS & Data Management', 'Mengelola sistem informasi HR (HRIS) dan memastikan data karyawan akurat, lengkap, dan terjaga kerahasiaannya.'),
      tc(23, 1, 'Payroll & Benefits Administration', 'Memproses penggajian dan administrasi benefit karyawan secara akurat dan tepat waktu sesuai ketentuan yang berlaku.'),
      tc(23, 2, 'Recruitment Administration', 'Mendukung proses rekrutmen mulai dari posting lowongan, penjadwalan interview, hingga onboarding karyawan baru.'),
      tc(23, 3, 'Employee Documentation & Reporting', 'Mengelola dokumen kepegawaian, kontrak kerja, dan laporan HR secara tertib, akurat, dan tepat waktu.'),
    ],
  },
  // POS024: HR Manager — NFC (grade 53) — PC >= 53
  {
    id: 24, positionId: 24,
    coreCompetency: HR_CC(24),
    strategicLeadership: STRAT_SL(24),
    technicalCompetency: [
      tc(24, 0, 'HR Business Partnering', 'Berperan sebagai mitra strategis bisnis dalam merencanakan dan mengeksekusi inisiatif HR yang berdampak.'),
      tc(24, 1, 'Talent Acquisition & Development', 'Memimpin proses rekrutmen end-to-end dan merancang program pengembangan talenta yang efektif.'),
      tc(24, 2, 'Performance Management', 'Mengelola siklus performance management dan mendorong budaya feedback yang berkelanjutan dan konstruktif.'),
      tc(24, 3, 'Industrial Relations & Compliance', 'Mengelola hubungan industrial dan memastikan kepatuhan terhadap seluruh regulasi ketenagakerjaan yang berlaku.'),
    ],
  },
  // POS025: HR Officer — NFC (grade 20)
  {
    id: 25, positionId: 25,
    coreCompetency: HR_CC(25),
    strategicLeadership: [],
    technicalCompetency: [
      tc(25, 0, 'HRIS & Data Management', 'Mengelola sistem informasi HR (HRIS) dan memastikan data karyawan akurat, lengkap, dan terjaga kerahasiaannya.'),
      tc(25, 1, 'Payroll & Benefits Administration', 'Memproses penggajian dan administrasi benefit karyawan secara akurat dan tepat waktu sesuai ketentuan yang berlaku.'),
      tc(25, 2, 'Recruitment Administration', 'Mendukung proses rekrutmen mulai dari posting lowongan, penjadwalan interview, hingga onboarding karyawan baru.'),
      tc(25, 3, 'Employee Documentation & Reporting', 'Mengelola dokumen kepegawaian, kontrak kerja, dan laporan HR secara tertib, akurat, dan tepat waktu.'),
    ],
  },
]

// ── Store ──────────────────────────────────────────────────────────────────────
export const usePositionProfileStore = create(persist(
  (set, get) => ({
    profiles: [],
    _seeded:  false,

    // Seed all 25 positions on first load; skip positions that already have a profile
    seed() {
      if (get()._seeded) return
      const existing = get().profiles
      const toAdd = SEED_PROFILES.filter(sp => !existing.find(ep => ep.positionId === sp.positionId))
      set({ profiles: [...existing, ...toAdd], _seeded: true })
    },

    ensureProfile(position) {
      const exists = get().profiles.find(p => p.positionId === position.id)
      if (exists) return exists
      const profile = {
        id:           _id++,
        positionId:   position.id,
        positionName: position.name,
        coreCompetency:      [],
        strategicLeadership: [],
        technicalCompetency: [],
      }
      set(s => ({ profiles: [...s.profiles, profile] }))
      return profile
    },

    saveSection(positionId, section, items) {
      set(s => ({
        profiles: s.profiles.map(p =>
          p.positionId === positionId ? { ...p, [section]: items } : p
        )
      }))
    },

    addItem(positionId, section) {
      const profile  = get().profiles.find(p => p.positionId === positionId)
      const existing = profile?.[section] ?? []
      const item = { id: _id++, no: existing.length + 1, aspect: '', keyBehaviors: '' }
      set(s => ({
        profiles: s.profiles.map(p =>
          p.positionId === positionId
            ? { ...p, [section]: [...p[section], item] }
            : p
        )
      }))
      return item.id
    },

    updateItem(positionId, section, itemId, field, value) {
      set(s => ({
        profiles: s.profiles.map(p =>
          p.positionId === positionId
            ? { ...p, [section]: p[section].map(i => i.id === itemId ? { ...i, [field]: value } : i) }
            : p
        )
      }))
    },

    deleteItem(positionId, section, itemId) {
      set(s => ({
        profiles: s.profiles.map(p => {
          if (p.positionId !== positionId) return p
          const items = p[section].filter(i => i.id !== itemId).map((it, idx) => ({ ...it, no: idx + 1 }))
          return { ...p, [section]: items }
        })
      }))
    },
  }),
  { name: 'position-profile-store', storage: createJSONStorage(() => dbStorage) }
))
