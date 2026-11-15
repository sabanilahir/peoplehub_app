// src/app/api/attendance/fingerspot/sync/route.js
import { NextResponse } from 'next/server'
import {
  getFingerspotSettings,
  updateFingerspotSettings,
  fetchFingerspotAttLog,
  processFingerspotLogs,
} from '@/lib/fingerspotSync'

export const dynamic = 'force-dynamic'

/**
 * POST: Menjalankan sinkronisasi penarikan data Fingerspot on-demand / manual
 * Body: { startDate, endDate, forceMock }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const todayStr = new Date().toISOString().split('T')[0]
    const startDate = body.startDate || todayStr
    const endDate = body.endDate || startDate
    const forceMock = Boolean(body.forceMock)

    const settings = await getFingerspotSettings()

    // 1. Ambil log scan dari API Fingerspot
    const fetchResult = await fetchFingerspotAttLog({
      startDate,
      endDate,
      settings,
      forceMock,
    })

    if (!fetchResult.success && (!fetchResult.data || fetchResult.data.length === 0)) {
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'ERROR',
        lastSyncMessage: fetchResult.error || 'Gagal menarik data dari Fingerspot',
      })

      return NextResponse.json(
        {
          success: false,
          error: fetchResult.error || 'Gagal menarik data dari API Fingerspot.iO',
        },
        { status: 400 }
      )
    }

    const rawLogs = fetchResult.data || []

    if (rawLogs.length === 0) {
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'NO_DATA',
        lastSyncMessage: `Tidak ada log scan pada periode ${startDate} s/d ${endDate}`,
        lastSyncCount: 0,
      })

      return NextResponse.json({
        success: true,
        totalFetched: 0,
        savedCount: 0,
        message: `Tidak ditemukan log scan Fingerspot pada rentang tanggal ${startDate} s/d ${endDate}.`,
      })
    }

    // 2. Proses dan simpan ke database Attendance
    const processResult = await processFingerspotLogs(rawLogs, {
      sourceLabel: 'Mesin Fingerspot Gudang (API)',
    })

    // 3. Update status sinkronisasi di database
    await updateFingerspotSettings({
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: `Berhasil sinkronisasi ${processResult.savedCount} presensi (${startDate} s/d ${endDate})`,
      lastSyncCount: processResult.savedCount,
    })

    return NextResponse.json({
      success: true,
      isMock: fetchResult.isMock,
      totalFetched: processResult.totalFetched,
      savedCount: processResult.savedCount,
      matchedCount: processResult.matchedCount,
      skippedCount: processResult.skippedCount,
      errors: processResult.errors,
      message: processResult.message,
    })
  } catch (error) {
    console.error('Error in Fingerspot sync API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem saat sinkronisasi' },
      { status: 500 }
    )
  }
}
