import { NextResponse } from 'next/server'
import { getHistoricProcessInstances } from '@/lib/flowable/client'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const size = searchParams.get('size') || 50
    const finished = searchParams.get('finished')

    const params = { size }
    if (finished === 'true') {
      params.finished = true
    }

    const result = await getHistoricProcessInstances(params)

    if (!result.success) {
      return NextResponse.json({
        success: true,
        data: { data: [], total: 0 },
        warning: result.error,
      })
    }

    return NextResponse.json({
      success: true,
      data: result.data || { data: [], total: 0 },
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { data: [], total: 0 },
      error: error.message,
    })
  }
}
