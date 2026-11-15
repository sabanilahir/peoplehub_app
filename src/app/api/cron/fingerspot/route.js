// src/app/api/cron/fingerspot/route.js
import { NextResponse } from 'next/server'
import {
  getFingerspotSettings,
  updateFingerspotSettings,
  fetchFingerspotAttLog,
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
 * Handler penarikan terjadwal (Cron Execution)
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

    // 3. Tentukan rentang penarikan: hari ini dan kemarin
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // 4. Tarik data dari API Fingerspot
    const fetchResult = await fetchFingerspotAttLog({
      startDate: yesterdayStr,
      endDate: todayStr,
      settings,
    })

    if (!fetchResult.success && (!fetchResult.data || fetchResult.data.length === 0)) {
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'ERROR',
        lastSyncMessage: `[Cron] ${fetchResult.error || 'Gagal menarik data dari Fingerspot.iO'}`,
      })

      return NextResponse.json(
        {
          success: false,
          error: fetchResult.error,
        },
        { status: 500 }
      )
    }

    const rawLogs = fetchResult.data || []

    if (rawLogs.length === 0) {
      await updateFingerspotSettings({
        lastSyncAt: new Date(),
        lastSyncStatus: 'NO_DATA',
        lastSyncMessage: `[Cron] Tidak ada scan log baru pada ${yesterdayStr} s/d ${todayStr}`,
        lastSyncCount: 0,
      })

      return NextResponse.json({
        success: true,
        totalFetched: 0,
        savedCount: 0,
        message: `Cron selesai: Tidak ada log scan baru pada periode ${yesterdayStr} s/d ${todayStr}`,
      })
    }

    // 5. Proses log dan simpan ke database Attendance
    const processResult = await processFingerspotLogs(rawLogs, {
      sourceLabel: 'Mesin Fingerspot Gudang (API)',
    })

    // 6. Update status berhasil
    await updateFingerspotSettings({
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: `[Cron] Berhasil memproses ${processResult.savedCount} presensi gudang (${yesterdayStr} s/d ${todayStr})`,
      lastSyncCount: processResult.savedCount,
    })

    return NextResponse.json({
      success: true,
      cronExecutedAt: new Date().toISOString(),
      totalFetched: processResult.totalFetched,
      savedCount: processResult.savedCount,
      matchedCount: processResult.matchedCount,
      skippedCount: processResult.skippedCount,
      errors: processResult.errors,
      message: processResult.message,
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
