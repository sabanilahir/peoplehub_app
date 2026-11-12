// scripts/seed_work_location_targets.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const DEFAULT_TARGET_LOCATIONS = [
  // 1. Head Office (HO)
  {
    code: 'HO',
    name: 'Head Office (HO)',
    type: 'head_office',
    employeeId: null,
    employeeName: null,
    distributorName: 'Kantor Pusat Manusistem / Gemilang Nusantara',
    address: 'Jl. Terusan Bandengan Ruko Harmoni Mas Blok E No. 26, Pejagalan, Penjaringan, Jakarta Utara',
    city: 'Jakarta Utara',
    province: 'DKI Jakarta',
    latitude: -6.1373,
    longitude: 106.7840,
    radiusMeters: 300,
    active: true,
    notes: 'Pusat operasional Head Office untuk seluruh staf HO'
  },

  // 2. 22 Distributor Locations for 20 Area Sales Employees
  {
    code: 'DIST-01',
    name: 'PT Rezeki Kita (Banjarmasin)',
    type: 'sales_distributor',
    employeeId: 300137,
    employeeName: 'Rini Indriani',
    distributorName: 'PT Rezeki Kita',
    address: 'Jln. A Yani Km 14,5 Samping Bank BRI, Kel. Gambut, Kec. Gambut. Banjarmasin 70652',
    city: 'Banjarmasin / Gambut',
    province: 'Kalimantan Selatan',
    latitude: -3.4047,
    longitude: 114.6706,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Kalimantan Selatan'
  },
  {
    code: 'DIST-02',
    name: 'PT Anugrah Primakarsa (Pontianak)',
    type: 'sales_distributor',
    employeeId: 300062,
    employeeName: 'Dian Rosnawaty',
    distributorName: 'PT Anugrah Primakarsa',
    address: 'Komplek Sentra Bisnis Jl. Jend Ahmad Yani, E, 20. Parittokaya, Pontianak Selatan, Kota Pontianak, Kalimantan Barat, 78121',
    city: 'Kota Pontianak',
    province: 'Kalimantan Barat',
    latitude: -0.0501,
    longitude: 109.3351,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Kalimantan Barat'
  },
  {
    code: 'DIST-03',
    name: 'PT Sukses Karya Agung (Pekanbaru)',
    type: 'sales_distributor',
    employeeId: 300061,
    employeeName: 'Dian Novita',
    distributorName: 'PT Sukses Karya Agung',
    address: 'Jl.Baung no 168 Kec.marpoyan damai - PEKANBARU',
    city: 'Kota Pekanbaru',
    province: 'Riau',
    latitude: 0.4947,
    longitude: 101.4539,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Riau'
  },
  {
    code: 'DIST-04',
    name: 'PT Winada Anugerah (Palembang)',
    type: 'sales_distributor',
    employeeId: 300109,
    employeeName: 'Muhammad imam Suhandi',
    distributorName: 'PT Winada Anugerah',
    address: 'Jln Letjen Harun Sohar Komp Pergudangan Palembang Star Blok B22B, Palembang',
    city: 'Kota Palembang',
    province: 'Sumatera Selatan',
    latitude: -2.9038,
    longitude: 104.7175,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Sumatera Selatan'
  },
  {
    code: 'DIST-05',
    name: 'PT Artha Manunggal Sejahtera (Purbalingga)',
    type: 'sales_distributor',
    employeeId: 300081,
    employeeName: 'Indri Novianti',
    distributorName: 'PT Artha Manunggal Sejahtera',
    address: 'Jalan Sapta Prasetya Raya no. 8 Pedurungan Kidul. Purbalingga. Jawa Tengah. 53321',
    city: 'Kabupaten Purbalingga',
    province: 'Jawa Tengah',
    latitude: -7.3881,
    longitude: 109.3639,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Jawa Tengah'
  },
  {
    code: 'DIST-06',
    name: 'CV Mitra Pemenang Kupang (Kupang)',
    type: 'sales_distributor',
    employeeId: 300125,
    employeeName: 'RIANTY OCTAVIANA DJAMI',
    distributorName: 'CV Mitra Pemenang Kupang',
    address: 'Jl.Perintis Kemerdekaan No.27X Kayu Putih, Oebufu Kupang NTT 85111',
    city: 'Kota Kupang',
    province: 'Nusa Tenggara Timur',
    latitude: -10.1654,
    longitude: 123.6198,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales NTT'
  },
  {
    code: 'DIST-07',
    name: 'PT Damar Mitra Abadi (Purbalingga)',
    type: 'sales_distributor',
    employeeId: 300094,
    employeeName: 'Maryatun',
    distributorName: 'PT Damar Mitra Abadi',
    address: 'Jl. Belimbing No. 186 Kalikabong Kalimanah RT.02/RW.01, Purbalingga',
    city: 'Kabupaten Purbalingga',
    province: 'Jawa Tengah',
    latitude: -7.4015,
    longitude: 109.3550,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Jawa Tengah'
  },
  {
    code: 'DIST-08',
    name: 'PT Surya Utama Nusaraya (Surabaya)',
    type: 'sales_distributor',
    employeeId: 300130,
    employeeName: 'Rahayu prasetyaning Wulandari',
    distributorName: 'PT Surya Utama Nusaraya',
    address: 'PT Surya Utama Nusaraya B-6 No.11, Jl. Mulyosari Mas, Kalisari, Kec. Mulyorejo, Surabaya, Jawa Timur 60113',
    city: 'Kota Surabaya',
    province: 'Jawa Timur',
    latitude: -7.2599,
    longitude: 112.8182,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Surabaya'
  },
  {
    code: 'DIST-09A',
    name: 'PT Sutanto Group Makmur (Kediri)',
    type: 'sales_distributor',
    employeeId: 300070,
    employeeName: 'FETY SUSIANI',
    distributorName: 'PT Sutanto Group Makmur - Kediri',
    address: 'Perum Jl. Perumahan Permata Hijau Blok J 2, RT.43/RW.10, Singonegaran, Kec. Pesantren, Kota Kediri, Jawa Timur 64132',
    city: 'Kota Kediri',
    province: 'Jawa Timur',
    latitude: -7.8273,
    longitude: 112.0200,
    radiusMeters: 300,
    active: true,
    notes: 'Titik 1 dari Fety Susiani (Area Kediri)'
  },
  {
    code: 'DIST-09B',
    name: 'PT Sutanto Group Makmur (Madiun)',
    type: 'sales_distributor',
    employeeId: 300070,
    employeeName: 'FETY SUSIANI',
    distributorName: 'PT Sutanto Group Makmur - Madiun',
    address: 'Perum Royal Permata Regency No.C21, RT.011/RW.005, Kejamulya, SambirejoKec, Kec. Jiwan, Kabupaten Madiun, Jawa Timur 63161',
    city: 'Kabupaten Madiun',
    province: 'Jawa Timur',
    latitude: -7.6321,
    longitude: 111.4987,
    radiusMeters: 300,
    active: true,
    notes: 'Titik 2 dari Fety Susiani (Area Madiun)'
  },
  {
    code: 'DIST-10',
    name: 'CV Suli Sukses Abadi (Bandar Lampung)',
    type: 'sales_distributor',
    employeeId: 300177,
    employeeName: 'Yulian Agung Setia',
    distributorName: 'CV Suli Sukses Abadi',
    address: 'Jalan pramuka GG kartika no 77 rajabasa nyunyai bandar lampung',
    city: 'Kota Bandar Lampung',
    province: 'Lampung',
    latitude: -5.3721,
    longitude: 105.2341,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Lampung'
  },
  {
    code: 'DIST-11',
    name: 'CV Jayatama (Lombok Barat)',
    type: 'sales_distributor',
    employeeId: 300148,
    employeeName: 'SRI DEWI MANDALIKA',
    distributorName: 'CV Jayatama',
    address: 'Jl. Raya Bengkel-Merembu, Sembung, Kec. Narmada, Kabupaten Lombok Barat, Nusa Tenggara Bar. 83371',
    city: 'Kabupaten Lombok Barat',
    province: 'Nusa Tenggara Barat',
    latitude: -8.5982,
    longitude: 116.1983,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales NTB'
  },
  {
    code: 'DIST-12',
    name: 'PT Albacar Mekar Nusantara (Medan)',
    type: 'sales_distributor',
    employeeId: 300174,
    employeeName: 'Yani hardianti',
    distributorName: 'PT Albacar Mekar Nusantara',
    address: '(Depan L CO Coffee) Jl. Sunggal No. 202, Medan Sunggal, Sumatera Utara, 20128',
    city: 'Kota Medan',
    province: 'Sumatera Utara',
    latitude: 3.5834,
    longitude: 98.6321,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Sumatera Utara'
  },
  {
    code: 'DIST-13',
    name: 'PT Lentara Mitra Abadisukses (Bandung)',
    type: 'sales_distributor',
    employeeId: 300124,
    employeeName: 'RETI KISMARINI',
    distributorName: 'PT Lentara Mitra Abadisukses',
    address: 'Jl.Taman Kopo katapang Blok A1 No.54 ,Pangauban Katapang.Bandung Jawa barat 40921',
    city: 'Kabupaten Bandung',
    province: 'Jawa Barat',
    latitude: -6.9984,
    longitude: 107.5612,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Jawa Barat'
  },
  {
    code: 'DIST-14',
    name: 'CV Mitra Sekawan (Manado)',
    type: 'sales_distributor',
    employeeId: 300153,
    employeeName: 'Serly Dauhan',
    distributorName: 'CV Mitra Sekawan',
    address: 'Jl. Lengkong Wuaya No.19, Perkamil, Kec. Paal Dua, Kota Manado, Sulawesi Utara',
    city: 'Kota Manado',
    province: 'Sulawesi Utara',
    latitude: 1.4730,
    longitude: 124.8749,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Sulawesi Utara'
  },
  {
    code: 'DIST-15',
    name: 'PT Mitra Pharmasi Jaya (Malang)',
    type: 'sales_distributor',
    employeeId: 300029,
    employeeName: 'ADDIS INTAN AMALIA PUTRI',
    distributorName: 'PT Mitra Pharmasi Jaya - Malang',
    address: 'jl puncak dieng ii 2, no 29 kota malang jawa timur',
    city: 'Kota Malang',
    province: 'Jawa Timur',
    latitude: -7.9782,
    longitude: 112.6091,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Malang'
  },
  {
    code: 'DIST-16',
    name: 'CV Mega Makmur Sejahtera (Batam)',
    type: 'sales_distributor',
    employeeId: 300068,
    employeeName: 'Eni Setiyowati',
    distributorName: 'CV Mega Makmur Sejahtera',
    address: 'Ruko meisterstad blok c no 22 batam centre batam kepulauan riau',
    city: 'Kota Batam',
    province: 'Kepulauan Riau',
    latitude: 1.1175,
    longitude: 104.0574,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Kepulauan Riau'
  },
  {
    code: 'DIST-17',
    name: 'CV Anggitama Citra Filia (Sukoharjo)',
    type: 'sales_distributor',
    employeeId: 300093,
    employeeName: 'Marsela',
    distributorName: 'CV Anggitama Citra Filia',
    address: 'Jl griya yasa blok f66, songgolangit, Gentan, baki, Sukoharjo Jawa Tengah',
    city: 'Kabupaten Sukoharjo',
    province: 'Jawa Tengah',
    latitude: -7.5792,
    longitude: 110.7832,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Solo Raya'
  },
  {
    code: 'DIST-18',
    name: 'CV Tiga Sekawan Mandiri (Makassar)',
    type: 'sales_distributor',
    employeeId: 300052,
    employeeName: 'Aztrio Ridho Anugrah',
    distributorName: 'CV Tiga Sekawan Mandiri',
    address: 'Jl. Samalona No.13, Pattunuang, Kec. Wajo, Kota Makassar, Sulawesi Selatan 90171',
    city: 'Kota Makassar',
    province: 'Sulawesi Selatan',
    latitude: -5.1303,
    longitude: 119.4096,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Sulawesi Selatan'
  },
  {
    code: 'DIST-19',
    name: 'PT Kurnia Maju Perkasa (Padang)',
    type: 'sales_distributor',
    employeeId: 300173,
    employeeName: 'YOLANDA DWI PUTRI',
    distributorName: 'PT Kurnia Maju Perkasa',
    address: 'Jl. Koto Marapak No. 17, RT 004, RW 005, Kelurahan Olo, Kecamatan Padang Barat, Kota Padang, Sumatera Barat 25117',
    city: 'Kota Padang',
    province: 'Sumatera Barat',
    latitude: -0.9467,
    longitude: 100.3529,
    radiusMeters: 300,
    active: true,
    notes: 'Distributor Area Sales Sumatera Barat'
  },
  {
    code: 'DIST-20A',
    name: 'PT Gracia Distribusi Indonesia (Tangerang)',
    type: 'sales_distributor',
    employeeId: 300123,
    employeeName: 'Putry Rinjani',
    distributorName: 'PT Gracia Distribusi Indonesia',
    address: 'Ruko metropolis town square Blok GM6 no. 2-3. Tangerang',
    city: 'Kota Tangerang',
    province: 'Banten',
    latitude: -6.1975,
    longitude: 106.6366,
    radiusMeters: 300,
    active: true,
    notes: 'Titik 1 dari Putry Rinjani (Area Tangerang)'
  },
  {
    code: 'DIST-20B',
    name: 'PT Albacar Nusantara Sejahtera (Jakarta Utara)',
    type: 'sales_distributor',
    employeeId: 300123,
    employeeName: 'Putry Rinjani',
    distributorName: 'PT Albacar Nusantara Sejahtera',
    address: 'Jl. Terusan Bandengan Ruko Harmoni Mas Blok E No 26 Pejagalan, Penjaringan, Jakarta Utara',
    city: 'Jakarta Utara',
    province: 'DKI Jakarta',
    latitude: -6.1373,
    longitude: 106.7840,
    radiusMeters: 300,
    active: true,
    notes: 'Titik 2 dari Putry Rinjani (Area Jakarta Utara)'
  }
]

async function seed() {
  console.log(`Starting seed for ${DEFAULT_TARGET_LOCATIONS.length} work location targets...`)
  let createdCount = 0
  let updatedCount = 0

  for (const item of DEFAULT_TARGET_LOCATIONS) {
    // Upsert by code or by name
    const existing = await prisma.workLocationTarget.findFirst({
      where: {
        OR: [
          { code: item.code },
          { name: item.name },
          ...(item.employeeId ? [{ employeeId: item.employeeId, distributorName: item.distributorName }] : [])
        ]
      }
    })

    if (existing) {
      await prisma.workLocationTarget.update({
        where: { id: existing.id },
        data: item
      })
      updatedCount++
      console.log(`Updated: ${item.code} - ${item.name}`)
    } else {
      await prisma.workLocationTarget.create({
        data: item
      })
      createdCount++
      console.log(`Created: ${item.code} - ${item.name}`)
    }
  }

  console.log(`\nSeed completed! Created: ${createdCount}, Updated: ${updatedCount}`)
}

seed()
  .catch((err) => {
    console.error('Seed error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
