import { NextResponse } from 'next/server'

// GET: Test Odoo connection (server-side to avoid CORS)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const odooUrl = searchParams.get('odooUrl')
    const odooDb = searchParams.get('odooDb')
    const odooUser = searchParams.get('odooUser')
    const odooApiKey = searchParams.get('odooApiKey')

    if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
    }

    // Normalize URL
    const baseUrl = odooUrl.replace(/\/$/, '').replace(/\/odoo$/, '')
    const jsonRpcUrl = `${baseUrl}/jsonrpc`

    // Authenticate
    const authResponse = await fetch(jsonRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service: 'common', method: 'authenticate', args: [odooDb, odooUser, odooApiKey, {}] },
        id: 1
      })
    })

    if (!authResponse.ok) {
      return NextResponse.json({ success: false, error: `HTTP ${authResponse.status}` }, { status: 502 })
    }

    const authData = await authResponse.json()
    
    if (authData.result) {
      return NextResponse.json({ success: true, uid: authData.result })
    } else {
      return NextResponse.json({ success: false, error: 'Authentication failed - check credentials' }, { status: 401 })
    }

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
