// scripts/cron_payroll_cutoff_sync.mjs
import { getCutoffDateRange, syncCutoffToOdoo } from '../src/lib/odooPayrollService.js'

async function runCronPayrollCutoffSync() {
  console.log('='.repeat(80))
  console.log('  CRON AUTOMATION: SINKRONISASI PRESENSI KE ITEMS PAYROLL ODOO')
  console.log('='.repeat(80))
  const now = new Date()
  console.log(`Waktu Eksekusi: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`)

  const range = getCutoffDateRange(now)
  console.log(`Periode Cut-Off Dideteksi: ${range.label} (${range.dateFrom} s/d ${range.dateTo})`)

  console.log('\nMemulai proses sinkronisasi ke Odoo ERP (pt-gemilang.odoo.com)...')
  try {
    const result = await syncCutoffToOdoo({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      dryRun: false,
    })

    console.log('\nHASIL SINKRONISASI:')
    console.log(`- Pay Run Batch ID: ${result.runId} (${result.runName})`)
    console.log(`- Total Karyawan Tersinkron: ${result.totalSyncable}`)
    console.log(`- Berhasil: ${result.successCount} ✅`)
    console.log(`- Gagal   : ${result.failedCount} ❌`)

    if (result.results && result.results.length > 0) {
      console.log('\nRincian Karyawan dengan Denda / Input:')
      result.results
        .filter((r) => r.penaltyAmount > 0 || r.rewardAmount > 0)
        .forEach((r) => {
          console.log(`  [${r.odoo_id}] ${r.name.padEnd(25)} -> ${r.message}`)
        })
    }

    console.log('\nSTATUS: SINKRONISASI CUT-OFF 26-25 KE ODOO PAYROLL SELESAI DENGAN SUKSES!')
    console.log('='.repeat(80))
    process.exit(0)
  } catch (err) {
    console.error('\nERROR SINKRONISASI ODOO PAYROLL:', err.message)
    console.log('='.repeat(80))
    process.exit(1)
  }
}

runCronPayrollCutoffSync()

