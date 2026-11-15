// src/app/api/attendance/fingerspot/settings/route.js
import { NextResponse } from 'next/server'
import { getFingerspotSettings, updateFingerspotSettings } from '@/lib/fingerspotSync'

export const dynamic = 'force-dynamic'

/**
 * GET: Mengambil pengaturan Fingerspot
 */
export async function GET() {
  try {
    const settings = await getFingerspotSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Error fetching Fingerspot settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat pengaturan Fingerspot' },
      { status: 500 }
    )
  }
}

/**
 * POST: Menyimpan pengaturan Fingerspot atau menjalankan tes koneksi
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { action = 'save', ...formData } = body

    if (action === 'test_connection') {
      const { apiUrl, apiToken, cloudId } = formData
      if (!apiToken || !cloudId) {
        return NextResponse.json({
          success: false,
          error: 'API Token dan Cloud ID harus diisi untuk menguji koneksi',
        })
      }

      try {
        const testUrl = `${(apiUrl || 'https://developer.fingerspot.io/api').replace(/\/+$/, '')}/get_attlog`
        const todayStr = new Date().toISOString().split('T')[0]
        const res = await fetch(testUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cloud_id: cloudId,
            start_date: todayStr,
            end_date: todayStr,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          return NextResponse.json({
            success: false,
            error: `Koneksi ditolak oleh Fingerspot (HTTP ${res.status}): ${errText}`,
          })
        }

        const data = await res.json()
        return NextResponse.json({
          success: true,
          message: '✅ Berhasil terhubung ke API Cloud Fingerspot.iO!',
          details: data,
        })
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `Gagal menghubungi server Fingerspot: ${err.message}`,
        })
      }
    }

    // Action: save settings
    const updated = await updateFingerspotSettings({
      apiUrl: formData.apiUrl,
      apiToken: formData.apiToken,
      cloudId: formData.cloudId,
      deviceSn: formData.deviceSn,
      deviceName: formData.deviceName,
      syncEnabled: formData.syncEnabled !== undefined ? Boolean(formData.syncEnabled) : true,
      simulationMode: formData.simulationMode !== undefined ? Boolean(formData.simulationMode) : true,
      autoSyncInterval: Number(formData.autoSyncInterval) || 30,
      cronSecret: formData.cronSecret || 'san_fingerspot_cron_key_2026',
    })

    return NextResponse.json({
      success: true,
      message: 'Pengaturan Fingerspot berhasil disimpan',
      data: updated,
    })
  } catch (error) {
    console.error('Error saving Fingerspot settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan pengaturan' },
      { status: 500 }
    )
  }
}
