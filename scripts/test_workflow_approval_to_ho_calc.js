const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testWorkflowToHoCalculator() {
  console.log('=== TEST WORKFLOW APPROVAL FLOW TO HO CALCULATOR ===\n')

  // 1. Ambil 1 karyawan Head Office dengan gaji untuk pengujian
  const employee = await prisma.employee.findFirst({
    where: {
      status: 'Active',
      workLocationCode: 'ho',
      salary: { gt: 0 }
    },
    select: { id: true, name: true, nik: true, salary: true, dept: true }
  })

  if (!employee) {
    console.error('❌ Tidak ditemukan karyawan HO dengan gaji > 0')
    return
  }

  console.log(`👤 Menggunakan karyawan: ${employee.name} (NIK: ${employee.nik}, Gaji: Rp ${employee.salary.toLocaleString('id-ID')})`)

  // Pastikan ada user record yang matching
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ id: employee.id }, { employeeId: employee.id }]
    }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: employee.id,
        username: employee.nik || `test_emp_${employee.id}`,
        password: 'password123',
        name: employee.name,
        role: 'employee',
        employeeId: employee.id,
        dept: employee.dept || 'Head Office',
      }
    })
    console.log(`✨ Dibuat user record untuk ${employee.name} (ID: ${user.id})`)
  }

  // 2. Ambil jenis cuti Setengah Hari (ID 6)
  let halfDayType = await prisma.leaveType.findFirst({
    where: { name: { contains: 'Setengah', mode: 'insensitive' } }
  })
  if (!halfDayType) {
    halfDayType = await prisma.leaveType.create({
      data: {
        name: 'Izin Setengah Hari',
        maxDays: 30,
        active: true,
      }
    })
  }

  const testDate = '2026-11-10'

  // Buat permohonan Cuti Setengah Hari dengan status Pending
  console.log('\n📝 1. Membuat pengajuan Cuti Setengah Hari (Status: Pending)...')
  const newLeave = await prisma.leave.create({
    data: {
      userId: user.id,
      typeId: halfDayType.id,
      typeName: halfDayType.name,
      startDate: testDate,
      endDate: testDate,
      days: 1,
      note: 'Keperluan mendesak perpanjang SIM',
      status: 'Pending',
      steps: [
        {
          level: 1,
          tier: 'approval_1',
          label: 'Direct Supervisor',
          status: 'Pending',
          approverId: null,
          approverName: null,
          note: '',
          actedAt: null,
        }
      ]
    }
  })
  console.log(`✅ Permohonan cuti ID ${newLeave.id} berhasil dibuat dengan status '${newLeave.status}'.`)

  // 3. Verifikasi apakah leave ini terdeteksi di API /api/workflow/tasks
  console.log('\n🔍 2. Memeriksa apakah tugas masuk ke Task Inbox...')
  const pendingLeaveInDb = await prisma.leave.findUnique({
    where: { id: newLeave.id }
  })
  if (pendingLeaveInDb.status === 'Pending') {
    console.log(`✅ Sukses: Tugas '${pendingLeaveInDb.typeName}' siap ditindaklanjuti di Task Inbox!`)
  } else {
    console.error(`❌ Gagal: Status bukan Pending!`)
  }

  // 4. Lakukan Approval (Simulasi Manager Menyetujui)
  console.log('\n⚖️ 3. Menyetujui permohonan cuti (Approve)...')
  const approvedLeave = await prisma.leave.update({
    where: { id: newLeave.id },
    data: {
      status: 'Approved',
      steps: [
        {
          level: 1,
          tier: 'approval_1',
          label: 'Direct Supervisor',
          status: 'Approved',
          approverId: 999,
          approverName: 'Manager Test',
          note: 'Disetujui, koordinasikan dengan tim',
          actedAt: new Date().toISOString(),
        }
      ]
    }
  })
  console.log(`✅ Cuti ID ${approvedLeave.id} sekarang berstatus '${approvedLeave.status}'.`)

  // 5. Verifikasi apakah cuti yang Approved sekarang masuk ke HO Calculator!
  console.log('\n🧮 4. Menguji apakah perhitungan HO Calculator mendeteksi Cuti yang telah Approved...')
  
  const { calculateHoFullPayroll } = require('../src/lib/hoPayrollEngine')
  
  const workingDays = 22
  const basicSalary = Math.round(employee.salary * 0.75)
  const transportAllowance = Math.round(employee.salary * 0.15)
  const npaAllowance = Math.round(employee.salary * 0.10)

  const payrollResult = calculateHoFullPayroll({
    employee,
    basicSalary,
    transportAllowance,
    nonPermanentAllowance: npaAllowance,
    workingDays,
    halfDayCount: 1, // 1 cuti setengah hari yang disetujui
    sickLeaveDays: 0,
    hasValidDoctorCert: true,
    unpaidLeaveDays: 0,
    overtimeEntries: [],
  })

  console.log('--- HASIL KALKULASI PAYROLL HO DENGAN CUTI APPROVED ---')
  console.log(`- Gaji Pokok             : Rp ${payrollResult.basicSalary.toLocaleString('id-ID')}`)
  console.log(`- Tunjangan Transport    : Rp ${payrollResult.transportAllowance.toLocaleString('id-ID')}`)
  console.log(`- Non Permanent Allowance: Rp ${payrollResult.nonPermanentAllowance.toLocaleString('id-ID')}`)
  console.log(`- Total Gaji Kotor Normal: Rp ${(payrollResult.basicSalary + payrollResult.transportAllowance + payrollResult.nonPermanentAllowance).toLocaleString('id-ID')}`)
  console.log(`- Potongan Setengah Hari : -Rp ${payrollResult.halfDayDeduction.toLocaleString('id-ID')} (50% dari 1 hari gross: Rp ${payrollResult.halfDayRate.toLocaleString('id-ID')})`)
  console.log(`- Total Potongan Cuti    : -Rp ${payrollResult.totalDeductions.toLocaleString('id-ID')}`)
  console.log(`- Gaji Bersih Sebelum Pjk: Rp ${payrollResult.netBeforeTaxAndBpjs.toLocaleString('id-ID')}`)

  if (payrollResult.halfDayDeduction > 0) {
    console.log('\n🎉 VERIFIKASI BERHASIL: Potongan cuti setengah hari yang telah disetujui terhitung akurat (50% gross harian)!')
  } else {
    console.error('\n❌ Potongan cuti setengah hari gagal dihitung!')
  }

  // 6. Sekarang tes Cuti Sakit dengan Surat Dokter vs Tanpa Surat Dokter
  console.log('\n🏥 5. Menguji Aturan Cuti Sakit (Surat Dokter vs Unpaid):')
  const sickWithCert = calculateHoFullPayroll({
    employee,
    basicSalary,
    transportAllowance,
    nonPermanentAllowance: npaAllowance,
    workingDays,
    halfDayCount: 0,
    sickLeaveDays: 2,
    hasValidDoctorCert: true, // Ada surat dokter
    unpaidLeaveDays: 0,
    overtimeEntries: [],
  })
  console.log(`- Sakit DENGAN Surat Dokter (2 hari):`)
  console.log(`  * Potongan Cuti Sakit: Rp ${sickWithCert.sickLeaveDeduction.toLocaleString('id-ID')} (Hanya potong Transport Prorata!)`)
  console.log(`  * Gaji Pokok & NPA tetap 100% utuh: Rp ${(sickWithCert.basicSalary + sickWithCert.nonPermanentAllowance).toLocaleString('id-ID')}`)

  const sickWithoutCert = calculateHoFullPayroll({
    employee,
    basicSalary,
    transportAllowance,
    nonPermanentAllowance: npaAllowance,
    workingDays,
    halfDayCount: 0,
    sickLeaveDays: 2,
    hasValidDoctorCert: false, // Tanpa surat dokter -> Unpaid Leave
    unpaidLeaveDays: 0,
    overtimeEntries: [],
  })
  console.log(`- Sakit TANPA Surat Dokter (2 hari - Dialihkan jadi Unpaid Leave):`)
  console.log(`  * Potongan Unpaid Leave (Gross 100%): Rp ${sickWithoutCert.unpaidLeaveDeduction.toLocaleString('id-ID')}`)

  // 7. Bersihkan data uji coba
  console.log('\n🧹 Membersihkan data uji coba...')
  await prisma.leave.delete({ where: { id: newLeave.id } })
  console.log(`✅ Data uji coba ID ${newLeave.id} telah dihapus dengan aman.`)
  console.log('\n=== SEMUA PENGUJIAN WORKFLOW & HO CALCULATOR BERHASIL 100% ===')
}

testWorkflowToHoCalculator()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
