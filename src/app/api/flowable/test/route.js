import { NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request) {
  try {
    const body = await request.json()
    const { url, username, password } = body

    if (!url || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'URL, username, and password are required' },
        { status: 400 }
      )
    }

    let testUrl = url
    if (!testUrl.includes('/repository/process-definitions')) {
      testUrl = `${testUrl.replace(/\/$/, '')}/repository/process-definitions?size=1`
    }

    const token = Buffer.from(`${username}:${password}`).toString('base64')

    let response
    try {
      response = await axios.get(testUrl, {
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
    } catch (primaryErr) {
      const altUrl = testUrl.includes('flowable-rest')
        ? testUrl.replace('flowable-rest', 'flowable-ui/process-api')
        : testUrl.replace('flowable-ui/process-api', 'flowable-rest')
      response = await axios.get(altUrl, {
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      data: {
        version: response.headers['flowable-version'] || '6.8.0',
        totalDefinitions: response.data?.data?.length || 0,
      },
    })
  } catch (error) {
    let message = 'Connection failed'

    if (error.code === 'ECONNREFUSED') {
      message = 'Cannot connect to Flowable. Make sure the server is running.'
    } else if (error.response?.status === 401) {
      message = 'Authentication failed. Check username and password.'
    } else if (error.response?.status === 404) {
      message = 'Flowable REST API not found. Check the URL.'
    } else if (error.code === 'ETIMEDOUT') {
      message = 'Connection timeout. Check if Flowable server is accessible.'
    }

    return NextResponse.json({
      success: false,
      message,
      error: error.message,
    })
  }
}
