// src/app/api/attendance/fingerspot/upload/route.js
import { NextResponse } from 'next/server'
import {
  processFingerspotLogs,
  normalizeFingerspotRows,
  updateFingerspotSettings,
} from '@/lib/fingerspotSync'

export const dynamic = 'force-dynamic'

/**
 * POST: Menerima dan memproses log scan hasil upload file Excel / CSV Fingerspot
 * Body: { logs: Array, fileName: String }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawInput = body.logs || body.rows || body.data || []
    const fileName = body.fileName || 'File Export'

    if (!Array.isArray(rawInput) || rawInput.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File Excel/CSV tidak memiliki baris data presensi yang valid.' },
        { status: 400 }
      )
    }

    // 1. Normalisasi baris data menjadi standard scan logs (jika belum dinormalisasi)
    let logsToProcess = rawInput
    const sample = rawInput[0]
    // Cek apakah data mentah memerlukan normalisasi kolom
    if (!sample.scan_date && (sample.Tanggal || sample.tanggal || sample['Waktu Scan'] || sample['Waktu'] || sample.Jam)) {
      logsToProcess = normalizeFingerspotRows(rawInput)
    }

    if (logsToProcess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Format kolom tidak dikenali. Pastikan file memiliki kolom PIN / NIK dan Tanggal/Waktu scan.',
        },
        { status: 400 }
      )
    }

    // 2. Proses dan hitung presensi gudang (denda & toleransi)
    const label = `Upload Fingerspot (${fileName.length > 25 ? fileName.slice(0, 22) + '...' : fileName})`
    const processResult = await processFingerspotLogs(logsToProcess, {
      sourceLabel: label,
    })

    // 3. Update status sinkronisasi Fingerspot di database
    await updateFingerspotSettings({
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: `Upload File (${fileName}): ${processResult.savedCount} presensi diproses`,
      lastSyncCount: processResult.savedCount,
    })

    return NextResponse.json({
      success: true,
      totalParsed: logsToProcess.length,
      savedCount: processResult.savedCount,
      matchedCount: processResult.matchedCount,
      skippedCount: processResult.skippedCount,
      errors: processResult.errors,
      message: processResult.message,
    })
  } catch (error) {
    console.error('Error in Fingerspot upload API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem saat memproses upload' },
      { status: 500 }
    )
  }
}
