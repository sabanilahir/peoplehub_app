// src/app/api/workdays/calculate/route.js
import { getWorkingDaysFromDb } from '@/lib/workdayCalculator.js'

export const dynamic = 'force-dynamic'

// GET / POST: Menghitung jumlah hari kerja efektif dalam periode tertentu
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const workLocationCode = searchParams.get('workLocationCode') || 'ho'
    const country = searchParams.get('country') || 'ID'

    if (!startDate || !endDate) {
      return Response.json(
        { error: 'Parameter startDate dan endDate wajib diisi (format YYYY-MM-DD).' },
        { status: 400 }
      )
    }

    const result = await getWorkingDaysFromDb({
      startDate,
      endDate,
      workLocationCode,
      country,
    })

    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error('Error in GET /api/workdays/calculate:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const { startDate, endDate, workLocationCode = 'ho', country = 'ID' } = body

    if (!startDate || !endDate) {
      return Response.json(
        { error: 'startDate dan endDate wajib diisi (format YYYY-MM-DD).' },
        { status: 400 }
      )
    }

    const result = await getWorkingDaysFromDb({
      startDate,
      endDate,
      workLocationCode,
      country,
    })

    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error('Error in POST /api/workdays/calculate:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

