// src/app/api/cron/fingerspot/route.js
import { NextResponse } from 'next/server'
import {
  getFingerspotSettings,
  updateFingerspotSettings,
  fetchAllDeviceAttLogs,
  processFingerspotLogs,
} from '@/lib/fingerspotSync'

export const dynamic = 'force-dynamic'

/**
 * Helper untuk verifikasi Secret Key Cron
 */
async function verifyCronAuth(req, settings) {
  const authHeader = req.headers.get('authorization') || ''
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()

  const { searchParams } = new URL(req.url)
  const querySecret = searchParams.get('secret') || searchParams.get('key')

  const expectedSecret = settings.cronSecret || 'san_fingerspot_cron_key_2026'

  if (bearerToken === expectedSecret || querySecret === expectedSecret) {
    return true
  }

  // Jika env CRON_SECRET diset
  if (process.env.CRON_SECRET && (bearerToken === process.env.CRON_SECRET || querySecret === process.env.CRON_SECRET)) {
    return true
  }

  return false
}

/**
 * Handler penarikan terjadwal (Cron Execution) untuk SEMUA perangkat aktif
 */
async function handleScheduledSync(req) {
  try {
    const settings = await getFingerspotSettings()

    // 1. Cek otentikasi cron
    const isAuthorized = await verifyCronAuth(req, settings)
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized cron access: Secret key tidak valid' },
        { status: 401 }
      )
    }

    // 2. Cek apakah sinkronisasi aktif
    if (!settings.syncEnabled) {
      return NextResponse.json({
        success: true,
        message: 'Sync Fingerspot dinonaktifkan di pengaturan.',
        skipped: true,
      })
    }

    const { searchParams } = new URL(req.url)
    const isMock = searchParams.get('mock') === '1' || searchParams.get('simulate') === '1'

    // 3. Tentukan rentang penarikan: hari ini dan kemarin
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // 4. Tarik data dari seluruh perangkat Fingerspot yang aktif
    const fetchResult = await fetchAllDeviceAttLogs({
      startDate: yesterdayStr,
      endDate: todayStr,
      forceMock: isMock,
    })

    // Standby Mode (jika belum ada perangkat aktif/kredensial)
    if (fetchResult.isStandby) {
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'STANDBY',
        lastSyncMessage: `[Cron Siaga] ${fetchResult.message}`,
        lastSyncCount: 0,
      })

      return NextResponse.json({
        success: true,
        status: 'STANDBY',
        cronExecutedAt: new Date().toISOString(),
        message: fetchResult.message,
        deviceResults: fetchResult.deviceResults,
      })
    }

    const rawLogs = fetchResult.allLogs || []

    if (rawLogs.length === 0) {
      const emptyMsg = `[Cron] Tidak ada scan log baru pada ${yesterdayStr} s/d ${todayStr} dari ${fetchResult.deviceResults.length} perangkat.`
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'NO_DATA',
        lastSyncMessage: emptyMsg,
        lastSyncCount: 0,
      })

      return NextResponse.json({
        success: true,
        status: 'NO_DATA',
        totalFetched: 0,
        savedCount: 0,
        message: emptyMsg,
        deviceResults: fetchResult.deviceResults,
      })
    }

    // 5. Proses log dan simpan ke database Attendance
    const processResult = await processFingerspotLogs(rawLogs, {
      sourceLabel: 'Mesin Fingerspot Cloud (Multi-Device)',
    })

    // 6. Update status agregat berhasil
    const statusNote = fetchResult.isMock ? '[Simulasi] ' : ''
    const finishMsg = `[Cron] ${statusNote}Berhasil memproses ${processResult.savedCount} presensi (${yesterdayStr} s/d ${todayStr}) dari ${fetchResult.deviceResults.length} perangkat.`
    await updateFingerspotSettings({
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: finishMsg,
      lastSyncCount: processResult.savedCount,
    })

    return NextResponse.json({
      success: true,
      status: 'SUCCESS',
      isMock: Boolean(fetchResult.isMock),
      cronExecutedAt: new Date().toISOString(),
      totalFetched: processResult.totalFetched,
      savedCount: processResult.savedCount,
      matchedCount: processResult.matchedCount,
      skippedCount: processResult.skippedCount,
      errors: processResult.errors,
      deviceResults: fetchResult.deviceResults,
      message: `${statusNote}${processResult.message}`,
    })
  } catch (error) {
    console.error('Error executing Fingerspot cron sync:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem pada eksekusi cron' },
      { status: 500 }
    )
  }
}

export async function GET(req) {
  return handleScheduledSync(req)
}

export async function POST(req) {
  return handleScheduledSync(req)
}
