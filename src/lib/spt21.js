// Bukti Potong PPh Pasal 21 Tahunan — Formulir 1721-A1 (pegawai tetap).
//
// Rolls a year's worth of payslips up into the annual withholding certificate
// each permanent employee receives to file their own SPT Tahunan. Line numbers
// below follow the 1721-A1 form's "Rincian Penghasilan dan Penghitungan PPh
// Pasal 21" section so the report maps 1:1 onto the printed form.
//
// Note on method: monthly withholding since PP 58/2023 uses the TER (Tarif
// Efektif Rata-rata) tables, but the ANNUAL figure on 1721-A1 is always the
// full progressive calculation (UU HPP) — TER is only a monthly approximation
// that this form trues up. So this file deliberately computes the annual tax
// progressively via calcAnnualTax() and reports the difference against what
// was actually withheld month by month (line 21/22).

import { PTKP_TABLE, calcAnnualTax, DEFAULT_PAYROLL_SETTINGS } from './payrollCalc'

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// 'YYYY-MM' -> 1..12
const monthOf = (period) => Number(period.slice(5, 7))

export const availableTaxYears = (payslips) =>
  [...new Set(payslips.map(p => p.period.slice(0, 4)))].sort((a, b) => b.localeCompare(a))

/**
 * Build one employee's 1721-A1 for a tax year.
 * `rows` must be that employee's payslips for the year (any order).
 */
export function buildBuktiPotong({ rows, year, employee, settings = DEFAULT_PAYROLL_SETTINGS }) {
  const slips = [...rows].sort((a, b) => a.period.localeCompare(b.period))
  const sum = (f) => slips.reduce((s, p) => s + (Number(p[f]) || 0), 0)

  // Masa perolehan penghasilan — the span actually paid, not the whole year,
  // so mid-year joiners/leavers print the correct range.
  const months = slips.map(p => monthOf(p.period))
  const masaDari = months.length ? Math.min(...months) : 1
  const masaSampai = months.length ? Math.max(...months) : 12
  const jumlahBulan = slips.length

  /* ── Penghasilan bruto (lines 1–8) ─────────────────────────────────────── */
  const gajiPokok = sum('basic')                                   // 1
  const tunjanganPph = 0                                           // 2 — no gross-up scheme modelled
  // Line 3 on the form combines allowances and overtime.
  const tunjanganLain = sum('allowance') + sum('variableAllowance') + sum('overtime') // 3
  const honorarium = 0                                             // 4
  // 5 — Premi asuransi dibayar pemberi kerja: employer-side BPJS health and
  // JKK/JKM premiums are the employee's income under PPh 21. Employer JHT/JP
  // are deferred and deliberately excluded.
  const premiPemberiKerja = sum('bpjsKesehatanEmployer') + sum('jkkEmployer') + sum('jkmEmployer')
  const natura = 0                                                 // 6
  const bonus = 0                                                  // 7 — tantiem/bonus/THR not modelled yet
  const bruto = gajiPokok + tunjanganPph + tunjanganLain + honorarium + premiPemberiKerja + natura + bonus

  /* ── Pengurangan (lines 9–11) ──────────────────────────────────────────── */
  // Biaya jabatan: 5% of bruto, capped per month of employment (PMK 250/2008).
  const biayaJabatan = Math.min(
    bruto * settings.biayaJabatan.rate,
    settings.biayaJabatan.monthlyCap * (jumlahBulan || 12),
  )
  // Iuran pensiun/JHT — only the employee-borne portion is deductible.
  const iuranPensiun = sum('jhtEmployee') + sum('jpEmployee')
  const totalPengurangan = biayaJabatan + iuranPensiun

  /* ── Penghitungan PPh 21 (lines 12–20) ─────────────────────────────────── */
  const neto = Math.max(0, bruto - totalPengurangan)                 // 12
  // 13/18 — carried over from a previous employer's 1721-A1 when the employee
  // joined mid-year. Not tracked yet, so zero; the form still shows the line.
  const netoMasaSebelumnya = 0                                       // 13
  const pphDipotongMasaSebelumnya = 0                                // 18
  const netoUntukPenghitungan = neto + netoMasaSebelumnya            // 14

  const ptkpStatus = slips[slips.length - 1]?.ptkpStatus || 'TK/0'
  const ptkp = PTKP_TABLE[ptkpStatus] ?? PTKP_TABLE['TK/0']          // 15
  // PKP is rounded down to the nearest thousand rupiah.
  const pkp = Math.max(0, Math.floor((netoUntukPenghitungan - ptkp) / 1000) * 1000) // 16

  const hasNpwp = slips[slips.length - 1]?.npwp !== false
  // 17 — tax on PKP before the non-NPWP surcharge; 19 — amount actually owed.
  const pphAtasPkp = Math.round(calcAnnualTax(pkp))
  // Pasal 21(5a) UU PPh: 20% higher rate for a recipient without an NPWP.
  const pphTerutang = Math.round(hasNpwp ? pphAtasPkp : pphAtasPkp * (1 + settings.npwpSurcharge))

  const pphDipotong = Math.round(sum('pph21'))     // 20 — what payroll withheld
  const selisih = pphTerutang - pphDipotong        // + kurang potong, − lebih potong

  // The form splits PTKP into three boxes: K/ __, TK/ __, HB/ __.
  const [ptkpPrefix, ptkpTanggungan] = String(ptkpStatus).split('/')

  const nationality = employee?.nationality || ''
  const isAsing = Boolean(nationality) && !/indonesia|wni/i.test(nationality)

  return {
    empId: employee?.id ?? slips[0]?.empId,
    nama: employee?.name ?? slips[0]?.name ?? '',
    npwp: employee?.npwp || '',
    nik: employee?.nik || employee?.ktp || '',
    jabatan: employee?.position || '',
    alamat: employee?.address || '',
    gender: employee?.gender || '',
    isAsing, kodeNegara: isAsing ? (employee?.country || '') : '',
    year,
    masaDari, masaSampai, jumlahBulan,
    ptkpStatus, ptkpPrefix, ptkpTanggungan: ptkpTanggungan ?? '0', hasNpwp,
    // Form lines 1–20, in order.
    gajiPokok, tunjanganPph, tunjanganLain, honorarium, premiPemberiKerja, natura, bonus, bruto,
    biayaJabatan: Math.round(biayaJabatan), iuranPensiun,
    totalPengurangan: Math.round(totalPengurangan),
    neto: Math.round(neto), netoMasaSebelumnya,
    netoUntukPenghitungan: Math.round(netoUntukPenghitungan), ptkp, pkp,
    pphAtasPkp, pphDipotongMasaSebelumnya, pphTerutang, pphDipotong, selisih,
    slips,
  }
}

/** Build the 1721-A1 for every employee that has payslips in `year`. */
export function buildAllBuktiPotong({ payslips, year, employees = [], settings }) {
  const inYear = payslips.filter(p => p.period.startsWith(year))
  const byEmp = new Map()
  inYear.forEach(p => {
    if (!byEmp.has(p.empId)) byEmp.set(p.empId, [])
    byEmp.get(p.empId).push(p)
  })
  return [...byEmp.entries()]
    .map(([empId, rows]) => buildBuktiPotong({
      rows, year, employee: employees.find(e => e.id === empId), settings,
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama))
}

// Nomor bukti potong — 1721-A1 uses a running number per employer per year.
// Format: 1.1-MM.YY-NNNNNNN (the shape DJP's e-Bupot/Coretax expects).
export const nomorBuktiPotong = (year, index) =>
  `1.1-12.${String(year).slice(2)}-${String(index + 1).padStart(7, '0')}`

/* ── CSV export ─────────────────────────────────────────────────────────── */
// Columns follow the 1721-A1 line numbering so the export can be reconciled
// against the printed form line by line.
const CSV_HEADERS = [
  'No Bukti Potong', 'NPWP', 'NIK', 'Nama', 'Jabatan', 'Jenis Kelamin',
  'Status PTKP', 'Masa Dari', 'Masa Sampai',
  '1 Gaji', '2 Tunjangan PPh', '3 Tunjangan Lainnya & Lembur', '4 Honorarium',
  '5 Premi Asuransi Pemberi Kerja', '6 Natura', '7 Tantiem/Bonus/THR',
  '8 Jumlah Bruto', '9 Biaya Jabatan', '10 Iuran Pensiun/THT/JHT',
  '11 Jumlah Pengurangan', '12 Neto', '13 Neto Masa Sebelumnya',
  '14 Neto Penghitungan', '15 PTKP', '16 PKP', '17 PPh 21 atas PKP',
  '18 PPh 21 Dipotong Masa Sebelumnya', '19 PPh 21 Terutang',
  '20 PPh 21 Dipotong & Dilunasi', 'Selisih',
]

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buktiPotongToCsv(list, year) {
  const lines = [CSV_HEADERS.join(';')]
  list.forEach((b, i) => {
    lines.push([
      nomorBuktiPotong(year, i), b.npwp, b.nik, b.nama, b.jabatan, b.gender,
      b.ptkpStatus, `${b.masaDari}`.padStart(2, '0'), `${b.masaSampai}`.padStart(2, '0'),
      b.gajiPokok, b.tunjanganPph, b.tunjanganLain, b.honorarium,
      b.premiPemberiKerja, b.natura, b.bonus,
      b.bruto, b.biayaJabatan, b.iuranPensiun,
      b.totalPengurangan, b.neto, b.netoMasaSebelumnya,
      b.netoUntukPenghitungan, b.ptkp, b.pkp, b.pphAtasPkp,
      b.pphDipotongMasaSebelumnya, b.pphTerutang, b.pphDipotong, b.selisih,
    ].map(csvCell).join(';'))
  })
  // BOM so Excel (id-ID) opens the semicolon-separated file correctly.
  return '﻿' + lines.join('\r\n')
}
