import { NextResponse } from 'next/server'
import { getProcessDefinitions, testConnection } from '@/lib/flowable/client'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const latest = searchParams.get('latest') === 'true'
    const size = searchParams.get('size') || 50

    const params = { size }
    if (key) params.key = key
    if (latest) params.latest = true

    const result = await getProcessDefinitions(params)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch process definitions', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}