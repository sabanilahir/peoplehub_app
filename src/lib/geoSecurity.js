// src/lib/geoSecurity.js
/**
 * Utilitas Keamanan Geofencing & Deteksi Anti-Fake GPS untuk PeopleHub
 */

// Radius bumi rata-rata dalam meter
const EARTH_RADIUS_METERS = 6371000

/**
 * Menghitung jarak presisi antara dua titik koordinat GPS menggunakan Formula Haversine
 * @param {number} lat1 Latitude titik asal
 * @param {number} lon1 Longitude titik asal
 * @param {number} lat2 Latitude titik target
 * @param {number} lon2 Longitude titik target
 * @returns {number} Jarak dalam satuan meter (dibulatkan ke integer terdekat)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity

  const toRad = (angle) => (angle * Math.PI) / 180

  const dLat = toRad(Number(lat2) - Number(lat1))
  const dLon = toRad(Number(lon2) - Number(lon1))

  const lat1Rad = toRad(Number(lat1))
  const lat2Rad = toRad(Number(lat2))

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(EARTH_RADIUS_METERS * c)
}

/**
 * Memeriksa integritas API browser Geolocation untuk mendeteksi ekstensi/hook manipulasi
 * (Client-side check)
 * @returns {{ isTampered: boolean, reason: string | null }}
 */
export function validateGpsIntegrity() {
  if (typeof window === 'undefined') return { isTampered: false, reason: null }

  try {
    // 1. Cek keberadaan navigator.geolocation
    if (!navigator.geolocation) {
      return { isTampered: true, reason: 'geolocation_not_supported' }
    }

    // 2. Cek apakah navigator.webdriver aktif (Headless / Selenium / Puppeteer)
    if (navigator.webdriver) {
      return { isTampered: true, reason: 'headless_automation_detected' }
    }

    // 3. Cek native function string pada getCurrentPosition
    const fnStr = Function.prototype.toString.call(navigator.geolocation.getCurrentPosition)
    if (!fnStr.includes('[native code]') && !fnStr.includes('getCurrentPosition')) {
      return { isTampered: true, reason: 'browser_extension_hook_detected' }
    }

    // 4. Cek apakah properti getCurrentPosition sengaja ditimpa di instance (bukan di prototype)
    if (Object.prototype.hasOwnProperty.call(navigator.geolocation, 'getCurrentPosition')) {
      return { isTampered: true, reason: 'overridden_geolocation_instance' }
    }
  } catch (err) {
    return { isTampered: false, reason: null }
  }

  return { isTampered: false, reason: null }
}

/**
 * Memeriksa apakah browser berjalan di atas Emulator Android PC (Bluestacks, Nox, LDPlayer, dsb.)
 * melalui WebGL GPU Hardware Fingerprinting (Client-side check)
 * @returns {{ isEmulator: boolean, renderer: string }}
 */
export function detectEmulatorEnvironment() {
  if (typeof window === 'undefined') return { isEmulator: false, renderer: 'SSR' }

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return { isEmulator: false, renderer: 'NoWebGL' }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return { isEmulator: false, renderer: 'StandardWebGL' }

    const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase()
    const ua = navigator.userAgent.toLowerCase()

    // Indikasi emulator: User-agent mengaku Android/Mobile tapi GPU adalah Software Renderer atau CPU virtual
    const isVirtualGpu =
      renderer.includes('swiftshader') ||
      renderer.includes('llvmpipe') ||
      renderer.includes('virtualbox') ||
      renderer.includes('vmware') ||
      renderer.includes('mesa offscreen')

    const isPcEmulator =
      ua.includes('android') &&
      (renderer.includes('intel') ||
        renderer.includes('nvidia') ||
        renderer.includes('amd') ||
        renderer.includes('geforce') ||
        renderer.includes('radeon') ||
        isVirtualGpu)

    if (isVirtualGpu || isPcEmulator) {
      return { isEmulator: true, renderer }
    }

    return { isEmulator: false, renderer }
  } catch (e) {
    return { isEmulator: false, renderer: 'Error' }
  }
}

/**
 * Validasi telemetri GPS koordinat satelit dari hasil navigator.geolocation.getCurrentPosition
 * @param {GeolocationCoordinates} coords
 * @returns {{ isMock: boolean, isWarning: boolean, reason: string | null, accuracy: number }}
 */
export function validateGpsTelemetry(coords) {
  if (!coords) return { isMock: false, isWarning: false, reason: null, accuracy: 0 }

  const accuracy = Number(coords.accuracy) || 0

  // 1. Akurasi 0 atau negatif = 100% Mock Location / Fake GPS Android
  if (accuracy <= 0) {
    return {
      isMock: true,
      isWarning: true,
      reason: 'accuracy_zero_mock_location',
      accuracy: 0,
    }
  }

  // 2. Akurasi terlalu lemah (> 300 meter, misal hanya cell tower / IP kasar)
  if (accuracy > 300) {
    return {
      isMock: false,
      isWarning: true,
      reason: 'accuracy_too_low',
      accuracy,
    }
  }

  return {
    isMock: false,
    isWarning: false,
    reason: null,
    accuracy,
  }
}

/**
 * Menghitung kecepatan perpindahan antar dua waktu presensi untuk deteksi Impossible Travel
 * @param {number} distanceMeters Jarak perpindahan dalam meter
 * @param {number} timeDeltaMinutes Selisih waktu dalam menit
 * @returns {{ speedKmH: number, isImpossibleTravel: boolean }}
 */
export function checkImpossibleTravel(distanceMeters, timeDeltaMinutes) {
  if (distanceMeters <= 0 || timeDeltaMinutes <= 0) {
    return { speedKmH: 0, isImpossibleTravel: false }
  }

  const distanceKm = distanceMeters / 1000
  const timeHours = timeDeltaMinutes / 60
  const speedKmH = Math.round(distanceKm / timeHours)

  // Kecepatan di atas 200 km/jam dianggap tidak wajar untuk perpindahan reguler darat
  const isImpossibleTravel = speedKmH > 200

  return { speedKmH, isImpossibleTravel }
}
