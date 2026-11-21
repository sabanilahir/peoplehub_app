// src/app/api/payroll/overtime-config/route.js
import { getOvertimeConfig, saveOvertimeConfig } from '@/lib/overtimeConfigService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payroll/overtime-config
 * Mengambil konfigurasi tarif lembur saat ini
 */
export async function GET() {
  try {
    const config = await getOvertimeConfig()
    return Response.json({ success: true, config })
  } catch (error) {
    console.error('[API /api/payroll/overtime-config GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/payroll/overtime-config
 * Menyimpan pembaruan aturan/tarif lembur
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const config = await saveOvertimeConfig(body)
    return Response.json({
      success: true,
      message: 'Konfigurasi aturan dan tarif lembur berhasil disimpan.',
      config,
    })
  } catch (error) {
    console.error('[API /api/payroll/overtime-config POST] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
