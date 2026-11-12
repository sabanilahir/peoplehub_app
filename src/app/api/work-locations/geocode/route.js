// src/app/api/work-locations/geocode/route.js
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const { address, query } = await req.json()
    const q = (query || address || '').trim()

    if (!q) {
      return Response.json({ success: false, error: 'Query alamat wajib diisi' }, { status: 400 })
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=id&format=json&limit=1`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PeopleHub-HCM-Geofence/1.0 (internal-hcm@manusistem.local)',
      },
    })

    if (!res.ok) {
      return Response.json({ success: false, error: 'Layanan geocoding tidak merespon' }, { status: 502 })
    }

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      return Response.json({ success: false, error: 'Lokasi tidak ditemukan pada peta' }, { status: 404 })
    }

    const result = data[0]
    return Response.json({
      success: true,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    })
  } catch (err) {
    console.error('Error in geocode API:', err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
