// src/app/api/attendance/fingerspot/sync/route.js
import { NextResponse } from 'next/server'
import {
  getFingerspotSettings,
  updateFingerspotSettings,
  fetchAllDeviceAttLogs,
  processFingerspotLogs,
} from '@/lib/fingerspotSync'

export const dynamic = 'force-dynamic'

/**
 * POST: Menjalankan sinkronisasi penarikan data Fingerspot on-demand / manual dari SEMUA perangkat aktif
 * Body: { startDate, endDate, forceMock }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const todayStr = new Date().toISOString().split('T')[0]
    const startDate = body.startDate || todayStr
    const endDate = body.endDate || startDate
    const forceMock = Boolean(body.forceMock)

    // 1. Ambil log scan dari seluruh perangkat Fingerspot yang aktif
    const fetchResult = await fetchAllDeviceAttLogs({
      startDate,
      endDate,
      forceMock,
    })

    if (fetchResult.isStandby) {
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'STANDBY',
        lastSyncMessage: fetchResult.message,
        lastSyncCount: 0,
      })

      return NextResponse.json({
        success: true,
        status: 'STANDBY',
        totalFetched: 0,
        savedCount: 0,
        message: fetchResult.message,
        deviceResults: fetchResult.deviceResults,
      })
    }

    const rawLogs = fetchResult.allLogs || []

    if (rawLogs.length === 0) {
      const summaryMsg = `Tidak ada log scan baru pada periode ${startDate} s/d ${endDate} dari ${fetchResult.deviceResults.length} perangkat.`
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'NO_DATA',
        lastSyncMessage: summaryMsg,
        lastSyncCount: 0,
      })

      return NextResponse.json({
        success: true,
        status: 'NO_DATA',
        totalFetched: 0,
        savedCount: 0,
        message: summaryMsg,
        deviceResults: fetchResult.deviceResults,
      })
    }

    // 2. Proses dan simpan ke database Attendance (dengan conflict resolution multi-mesin)
    const processResult = await processFingerspotLogs(rawLogs, {
      sourceLabel: 'Mesin Fingerspot Cloud (Multi-Device)',
    })

    // 3. Update status sinkronisasi agregat di database
    const successMsg = `Berhasil sinkronisasi ${processResult.savedCount} presensi (${startDate} s/d ${endDate}) dari ${fetchResult.deviceResults.length} perangkat.`
    await updateFingerspotSettings({
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: successMsg,
      lastSyncCount: processResult.savedCount,
    })

    return NextResponse.json({
      success: true,
      status: 'SUCCESS',
      isMock: fetchResult.isMock,
      totalFetched: processResult.totalFetched,
      savedCount: processResult.savedCount,
      matchedCount: processResult.matchedCount,
      skippedCount: processResult.skippedCount,
      errors: processResult.errors,
      deviceResults: fetchResult.deviceResults,
      message: processResult.message,
    })
  } catch (error) {
    console.error('Error in Fingerspot sync API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem saat sinkronisasi multi-device' },
      { status: 500 }
    )
  }
}
