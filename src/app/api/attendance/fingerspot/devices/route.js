// src/app/api/attendance/fingerspot/devices/route.js
import { NextResponse } from 'next/server'
import {
  getFingerspotDevices,
  createFingerspotDevice,
  updateFingerspotDevice,
  deleteFingerspotDevice,
  fetchFingerspotAttLog,
} from '@/lib/fingerspotSync'

export const dynamic = 'force-dynamic'

/**
 * GET: Mengambil seluruh perangkat Fingerspot
 */
export async function GET() {
  try {
    const devices = await getFingerspotDevices()
    return NextResponse.json({ success: true, data: devices })
  } catch (error) {
    console.error('Error fetching Fingerspot devices:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat daftar perangkat Fingerspot' },
      { status: 500 }
    )
  }
}

/**
 * POST: Tambah perangkat baru ATAU tes koneksi ATAU toggle status aktif
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { action, ...payload } = body

    // 1. Action: Test Koneksi Perangkat
    if (action === 'test') {
      const { apiUrl, apiToken, cloudId, deviceSn, deviceName } = payload
      if (!apiToken || !cloudId) {
        return NextResponse.json({
          success: false,
          error: 'API Token (Bearer) dan Cloud ID harus diisi untuk menguji koneksi.',
        })
      }

      try {
        const testUrl = `${(apiUrl || 'https://developer.fingerspot.io/api').replace(/\/+$/, '')}/get_attlog`
        const todayStr = new Date().toISOString().split('T')[0]
        const reqBody = {
          cloud_id: cloudId,
          start_date: todayStr,
          end_date: todayStr,
        }
        if (deviceSn) {
          reqBody.device_sn = deviceSn
        }

        const res = await fetch(testUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        })

        if (!res.ok) {
          const errText = await res.text()
          return NextResponse.json({
            success: false,
            error: `Koneksi ditolak oleh Fingerspot Cloud (HTTP ${res.status}): ${errText}`,
          })
        }

        const data = await res.json()
        return NextResponse.json({
          success: true,
          message: `✅ Berhasil terhubung ke Fingerspot Cloud untuk perangkat "${deviceName || cloudId}"!`,
          details: data,
        })
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `Gagal menghubungi server Fingerspot Cloud: ${err.message}`,
        })
      }
    }

    // 2. Action: Toggle Status Aktif
    if (action === 'toggle') {
      const { id, isActive } = payload
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID perangkat diperlukan' }, { status: 400 })
      }
      const updated = await updateFingerspotDevice(id, { isActive: Boolean(isActive) })
      return NextResponse.json({
        success: true,
        message: `Status perangkat "${updated.deviceName}" berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
        data: updated,
      })
    }

    // 3. Action: Tambah Perangkat Baru
    if (!payload.cloudId || !payload.apiToken) {
      return NextResponse.json(
        { success: false, error: 'Cloud ID dan Bearer API Token wajib diisi.' },
        { status: 400 }
      )
    }

    const newDevice = await createFingerspotDevice(payload)
    return NextResponse.json({
      success: true,
      message: `Perangkat "${newDevice.deviceName}" berhasil ditambahkan!`,
      data: newDevice,
    })
  } catch (error) {
    console.error('Error in Fingerspot devices POST:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses data perangkat' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Memperbarui data perangkat
 */
export async function PUT(req) {
  try {
    const body = await req.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID perangkat diperlukan untuk update' }, { status: 400 })
    }

    const updated = await updateFingerspotDevice(id, data)
    return NextResponse.json({
      success: true,
      message: `Perangkat "${updated.deviceName}" berhasil diperbarui!`,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating Fingerspot device:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui perangkat' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Menghapus perangkat
 */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID perangkat diperlukan untuk menghapus' }, { status: 400 })
    }

    const deleted = await deleteFingerspotDevice(id)
    return NextResponse.json({
      success: true,
      message: `Perangkat "${deleted.deviceName}" berhasil dihapus.`,
      data: deleted,
    })
  } catch (error) {
    console.error('Error deleting Fingerspot device:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus perangkat' },
      { status: 500 }
    )
  }
}
