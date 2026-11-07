import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEED_TYPES = [
  {
    name: 'Cuti Tahunan',
    maxDays: 12,
    requireDoc: false,
    levels: JSON.stringify(['supervisor']),
    autoApprove: false,
    active: true,
    formFields: [
      {
        id: 'f_handover',
        label: 'Karyawan Pengganti (Handover)',
        type: 'text',
        required: true,
        placeholder: 'Nama rekan kerja yang menghandle tugas Anda',
      },
      {
        id: 'f_emergency',
        label: 'Nomor Kontak Darurat',
        type: 'text',
        required: true,
        placeholder: 'Contoh: 0812-3456-7890',
      },
      {
        id: 'f_location',
        label: 'Rencana Lokasi Selama Cuti',
        type: 'dropdown',
        required: false,
        options: 'Dalam Kota, Luar Kota, Luar Negeri',
      },
    ],
  },
  {
    name: 'Cuti Sakit',
    maxDays: 14,
    requireDoc: true,
    levels: JSON.stringify(['supervisor', 'hr_manager']),
    autoApprove: false,
    active: true,
    formFields: [
      {
        id: 'f_hospital',
        label: 'Fasilitas Kesehatan / Klinik',
        type: 'text',
        required: false,
        placeholder: 'Contoh: RS Siloam / Puskesmas Kebon Jeruk',
      },
      {
        id: 'f_diagnosis',
        label: 'Keluhan / Diagnosa Singkat',
        type: 'text',
        required: false,
        placeholder: 'Contoh: Sakit Kepala & Demam Tinggi',
      },
      {
        id: 'f_doctor_note',
        label: 'Unggah Surat Keterangan Dokter',
        type: 'file',
        required: true,
        placeholder: 'Pilih file scan / foto surat dokter (PDF, PNG, JPG)',
      },
    ],
  },
  {
    name: 'Cuti Menikah',
    maxDays: 3,
    requireDoc: false,
    levels: JSON.stringify(['supervisor']),
    autoApprove: false,
    active: true,
    formFields: [
      {
        id: 'f_wedding_date',
        label: 'Tanggal Akad / Resepsi',
        type: 'date',
        required: true,
      },
      {
        id: 'f_emergency',
        label: 'Nomor Kontak Darurat',
        type: 'text',
        required: false,
        placeholder: 'Nomor telepon yang dapat dihubungi jika mendesak',
      },
    ],
  },
  {
    name: 'Cuti Melahirkan',
    maxDays: 90,
    requireDoc: true,
    levels: JSON.stringify(['supervisor', 'hr_manager']),
    autoApprove: false,
    active: true,
    formFields: [
      {
        id: 'f_hpl',
        label: 'Hari Perkiraan Lahir (HPL)',
        type: 'date',
        required: true,
      },
      {
        id: 'f_maternity_cert',
        label: 'Unggah Surat HPL / Keterangan Bidan',
        type: 'file',
        required: true,
        placeholder: 'Pilih file surat keterangan (PDF, PNG, JPG)',
      },
    ],
  },
]

async function main() {
  console.log('Seeding LeaveTypes to PostgreSQL...')
  for (const item of SEED_TYPES) {
    const existing = await prisma.leaveType.findUnique({
      where: { name: item.name },
    })

    if (!existing) {
      await prisma.leaveType.create({
        data: item,
      })
      console.log(`Created: ${item.name}`)
    } else {
      await prisma.leaveType.update({
        where: { id: existing.id },
        data: {
          maxDays: item.maxDays,
          requireDoc: item.requireDoc,
          levels: item.levels,
          formFields: item.formFields,
          active: true,
        },
      })
      console.log(`Updated: ${item.name}`)
    }
  }

  const all = await prisma.leaveType.findMany()
  console.log(`Success! Total LeaveTypes in DB: ${all.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

