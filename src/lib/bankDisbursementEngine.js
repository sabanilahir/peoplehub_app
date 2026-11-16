// src/lib/bankDisbursementEngine.js
import * as XLSX from 'xlsx'

/**
 * Standard Indonesian Bank SWIFT / Clearing Codes Dictionary
 */
export const BANK_DIRECTORY = {
  BCA: { name: 'Bank Central Asia (BCA)', code: 'BCA', swift: 'CENAIDJA', defaultType: 'BCA' },
  MANDIRI: { name: 'Bank Mandiri', code: 'MANDIRI', swift: 'BMRIIDJA', defaultType: 'MANDIRI' },
  BNI: { name: 'Bank Negara Indonesia (BNI)', code: 'BNI', swift: 'BNINIDJA', defaultType: 'BNI' },
  BRI: { name: 'Bank Rakyat Indonesia (BRI)', code: 'BRI', swift: 'BRINIDJA', defaultType: 'BRI' },
  PERMATA: { name: 'Bank Permata', code: 'PERMATA', swift: 'BBBAIDJA', defaultType: 'PERMATA' },
  CIMB: { name: 'CIMB Niaga', code: 'CIMB', swift: 'BNGAIDJA', defaultType: 'CIMB' },
  BSI: { name: 'Bank Syariah Indonesia (BSI)', code: 'BSI', swift: 'BSMDIDJA', defaultType: 'BSI' },
  DANAMON: { name: 'Bank Danamon', code: 'DANAMON', swift: 'BDINIDJA', defaultType: 'DANAMON' },
  PANIN: { name: 'Panin Bank', code: 'PANIN', swift: 'PANINIDJA', defaultType: 'PANIN' },
  MAYBANK: { name: 'Maybank Indonesia', code: 'MAYBANK', swift: 'MBBEIDJA', defaultType: 'MAYBANK' },
}

/**
 * Normalisasi 3 huruf nama bulan dalam bahasa Inggris untuk Transaction ID (e.g. OCT, APR, NOV)
 */
export function getMonthCode(dateStr) {
  if (!dateStr) return 'PAY'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'PAY'
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return months[date.getMonth()]
}

/**
 * Format nama bulan dalam bahasa Indonesia untuk Remark (e.g. OKTOBER 2026)
 */
export function getDefaultRemark(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const monthsId = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
  ]
  const monthName = monthsId[d.getMonth()]
  const year = d.getFullYear()
  return `GAJI ${monthName} ${year}`
}

/**
 * Menyusun data baris 13 kolom persis sesuai template transfer bank BCA
 *
 * Kolom Template:
 * 1. No
 * 2. Transaction ID (e.g. OCT081401)
 * 3. Transfer Type (e.g. BCA)
 * 4. Beneficiary ID (kosong)
 * 5. Credited Account (nomor rekening)
 * 6. Receiver Name (nama penerima)
 * 7. Amount (nominal integer tanpa desimal)
 * 8. NIP (NIK/ID karyawan)
 * 9. Remark (berita transfer, e.g. GAJI OKTOBER 2026)
 * 10. Beneficiary email address (email)
 * 11. Receiver Swift Code (SWIFT code jika non-BCA)
 * 12. Receiver Cust Type (1 = perorangan)
 * 13. Receiver Cust Residence (1 = penduduk)
 */
export function buildBcaTransferRows(items = [], options = {}) {
  const {
    prefix = '', // jika kosong, otomatis dibuat misal: 'OCT0814'
    dateRef = '',
    customRemark = '',
  } = options

  const monthCode = getMonthCode(dateRef)
  const defaultBatchCode = '0814'
  const activePrefix = prefix ? prefix.trim().toUpperCase() : `${monthCode}${defaultBatchCode}`
  const remarkText = customRemark ? customRemark.trim().toUpperCase() : getDefaultRemark(dateRef)

  return items.map((item, idx) => {
    const seqStr = String(idx + 1).padStart(2, '0')
    const transactionId = `${activePrefix}${seqStr}`

    // Bank name / type
    const bankKey = (item.bankName || 'BCA').toUpperCase().trim()
    const bankMeta = BANK_DIRECTORY[bankKey] || { code: bankKey, swift: '' }
    const transferType = bankKey.includes('BCA') ? 'BCA' : bankMeta.code

    // Amount: Net Salary dari Odoo (integer murni)
    const rawAmount = item.netSalary ?? item.amount ?? 0
    const netAmount = Math.max(0, Math.round(Number(rawAmount) || 0))

    // Nomor Rekening (bersihkan spasi/tanda hubung, pastikan format string)
    const rawAccount = String(item.bankAccountNumber || item.accountNumber || '').replace(/[^0-9]/g, '')

    // Nama Penerima
    const receiverName = (item.bankAccountHolder || item.name || item.employeeName || '').trim()

    // NIP / NIK
    const nip = String(item.nik || item.identificationId || item.id || '').trim()

    // Email
    const email = (item.email || item.workEmail || '').trim()

    // SWIFT Code jika transfer non-BCA
    const swiftCode = transferType === 'BCA' ? '' : (item.swiftCode || bankMeta.swift || '')

    return {
      no: idx + 1,
      transactionId,
      transferType,
      beneficiaryId: '',
      creditedAccount: rawAccount,
      receiverName,
      amount: netAmount,
      nip,
      remark: remarkText,
      beneficiaryEmail: email,
      receiverSwiftCode: swiftCode,
      receiverCustType: 1, // 1 = Perorangan
      receiverCustResidence: 1, // 1 = Residen/Penduduk
    }
  })
}

/**
 * Ekspor data baris transfer ke file Excel (.xlsx) dengan 13 kolom berformat resmi
 */
export function exportBcaTransferExcel(formattedRows = [], filename = '') {
  if (typeof window === 'undefined') return

  const defaultFilename = `Setoran_Transfer_BCA_${new Date().toISOString().slice(0, 10)}.xlsx`
  const targetFilename = filename || defaultFilename

  // Header 13 kolom persis sesuai template gambar
  const headers = [
    'No',
    'Transaction ID',
    'Transfer Type',
    'Beneficiary ID',
    'Credited Account',
    'Receiver Name',
    'Amount',
    'NIP',
    'Remark',
    'Beneficiary email address',
    'Receiver Swift Code',
    'Receiver Cust Type',
    'Receiver Cust Residence',
  ]

  // Data baris dalam bentuk matriks array (aoa)
  const aoaData = [headers]

  formattedRows.forEach((row) => {
    aoaData.push([
      row.no,
      row.transactionId,
      row.transferType,
      row.beneficiaryId || '',
      row.creditedAccount ? String(row.creditedAccount) : '',
      row.receiverName,
      Number(row.amount) || 0,
      row.nip || '',
      row.remark,
      row.beneficiaryEmail || '',
      row.receiverSwiftCode || '',
      row.receiverCustType ?? 1,
      row.receiverCustResidence ?? 1,
    ])
  })

  // Buat sheet dari array of arrays
  const ws = XLSX.utils.aoa_to_sheet(aoaData)

  // Lebar kolom yang proporsional
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // Transaction ID
    { wch: 15 }, // Transfer Type
    { wch: 16 }, // Beneficiary ID
    { wch: 20 }, // Credited Account
    { wch: 28 }, // Receiver Name
    { wch: 16 }, // Amount
    { wch: 20 }, // NIP
    { wch: 24 }, // Remark
    { wch: 28 }, // Beneficiary email address
    { wch: 20 }, // Receiver Swift Code
    { wch: 18 }, // Receiver Cust Type
    { wch: 22 }, // Receiver Cust Residence
  ]

  // Format kolom nomor rekening sebagai TEXT (agar nol depan tidak terhapus)
  // dan format kolom Amount sebagai NUMBER dengan pemisah ribuan
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let R = 1; R <= range.e.r; ++R) {
    // Kolom Credited Account (index 4)
    const accCellRef = XLSX.utils.encode_cell({ r: R, c: 4 })
    if (ws[accCellRef]) {
      ws[accCellRef].t = 's' // string type
    }

    // Kolom Amount (index 6)
    const amountCellRef = XLSX.utils.encode_cell({ r: R, c: 6 })
    if (ws[amountCellRef]) {
      ws[amountCellRef].t = 'n' // numeric type
      ws[amountCellRef].z = '#,##0' // format ribuan
    }
  }

  // Buat workbook dan simpan
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transfer BCA')
  XLSX.writeFile(wb, targetFilename)
}
