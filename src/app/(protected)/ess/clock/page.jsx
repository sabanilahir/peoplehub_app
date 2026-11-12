'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useShiftStore } from '@/store/shiftStore'
import { useAttendanceStore, todayStr } from '@/store/attendanceStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader,
  SectionCard,
  DataTable,
  Tr,
  Td,
  ActionButton,
  StatusBadge,
  EmptyState,
} from '@/components/ui'
import { shiftFor, gradeTime, TONE_CLASS, toneLabel, GRACE_MINUTES } from '@/lib/workSchedule'
import {
  calculateHaversineDistance,
  validateGpsIntegrity,
  detectEmulatorEnvironment,
  validateGpsTelemetry,
} from '@/lib/geoSecurity'
import {
  MapPin,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Loader2,
  RefreshCw,
  ExternalLink,
  X,
  ShieldAlert,
} from 'lucide-react'

const nowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** A clock time coloured by how far it sits from the schedule. */
function ClockValue({ time, scheduled, kind, size = 'text-3xl', t }) {
  if (!time || time === '-') return <span className={`${size} font-bold font-mono text-gray-300`}>--:--</span>
  const { deviation, tone } = gradeTime(time, scheduled, kind)
  return (
    <span className='inline-flex flex-col items-center'>
      <span className={`${size} font-bold font-mono ${TONE_CLASS[tone]}`}>{time}</span>
      {tone !== 'none' && (
        <span className={`text-[11px] font-semibold ${TONE_CLASS[tone]}`}>
          {toneLabel(tone, kind, deviation, t)}
        </span>
      )}
    </span>
  )
}

export default function ClockInOutPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { assignments, schedules, patterns, shifts } = useShiftStore()
  const { records, clockIn, clockOut } = useAttendanceStore()

  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const uid = currentUser?.id
  const date = todayStr()
  const sched = uid ? shiftFor(uid, date, { assignments, schedules, patterns, shifts }) : null
  const today = records.find((r) => r.userId === uid && r.date === date) || null

  const hasIn = today?.checkIn && today.checkIn !== '-'
  const hasOut = today?.checkOut && today.checkOut !== '-'

  // ─── GEOFENCING & TARGET LOKASI STATE ──────────────────────────
  const [userTargets, setUserTargets] = useState([])
  const [loadingTargets, setLoadingTargets] = useState(true)
  const [gpsStatus, setGpsStatus] = useState('locating') // 'locating' | 'ready' | 'denied' | 'unavailable'
  const [gpsCoords, setGpsCoords] = useState(null) // { lat, lng, accuracy }
  const [gpsError, setGpsError] = useState('')
  const [isMockGps, setIsMockGps] = useState(false)
  const [mockGpsReason, setMockGpsReason] = useState(null)

  // ─── MODE B WARNING MODAL STATE ───────────────────────────────
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningAction, setWarningAction] = useState('in') // 'in' | 'out'
  const [warningReason, setWarningReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Ambil target lokasi yang relevan untuk user aktif (HO vs Distributor Sales)
  useEffect(() => {
    if (!uid) return
    let isMounted = true
    setLoadingTargets(true)

    fetch(`/api/work-locations/targets?employeeId=${uid}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return
        if (data?.success && Array.isArray(data.targets)) {
          setUserTargets(data.targets)
        }
      })
      .catch((err) => console.warn('Gagal memuat target lokasi:', err))
      .finally(() => {
        if (isMounted) setLoadingTargets(false)
      })

    return () => {
      isMounted = false
    }
  }, [uid])

  // Deteksi Geolocation Browser & Anti-Fake GPS
  const detectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unavailable')
      setGpsError('Browser Anda tidak mendukung akses lokasi GPS.')
      return
    }

    setGpsStatus('locating')
    setGpsError('')
    setIsMockGps(false)
    setMockGpsReason(null)

    // 1. Cek integritas native prototype
    const integrity = validateGpsIntegrity()
    if (integrity.isTampered) {
      setIsMockGps(true)
      setMockGpsReason(`Deteksi modifikasi browser (${integrity.reason})`)
    }

    // 2. Cek lingkungan emulator PC
    const emu = detectEmulatorEnvironment()
    if (emu.isEmulator) {
      setIsMockGps(true)
      setMockGpsReason(`Perangkat emulator terdeteksi (${emu.renderer})`)
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords

        // 3. Validasi telemetri GPS
        const tel = validateGpsTelemetry(pos.coords)
        if (tel.isMock) {
          setIsMockGps(true)
          setMockGpsReason('Akurasi 0m (Mock location)')
        }

        setGpsCoords({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
        })
        setGpsStatus('ready')
      },
      (err) => {
        setGpsStatus(err.code === 1 ? 'denied' : 'unavailable')
        setGpsError(
          err.code === 1
            ? 'Izin akses lokasi GPS ditolak oleh browser. Mohon izinkan lokasi untuk presensi geofencing.'
            : 'Gagal mendeteksi lokasi GPS perangkat. Pastikan GPS HP/Laptop dalam keadaan aktif.'
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    )
  }

  // Jalankan deteksi GPS saat pertama mount
  useEffect(() => {
    detectLocation()
  }, [])

  // Hitung target lokasi terdekat dan jarak ke lokasi
  const { nearestTarget, distanceMeters, isWithinRadius } = useMemo(() => {
    if (!gpsCoords || !userTargets || userTargets.length === 0) {
      return { nearestTarget: null, distanceMeters: null, isWithinRadius: false }
    }

    let nearest = null
    let minDistance = Infinity

    userTargets.forEach((target) => {
      const dist = calculateHaversineDistance(
        gpsCoords.lat,
        gpsCoords.lng,
        target.latitude,
        target.longitude
      )
      if (dist < minDistance) {
        minDistance = dist
        nearest = { ...target, distance: dist }
      }
    })

    const allowedRadius = nearest?.radiusMeters || 300
    const inRadius = minDistance <= allowedRadius

    return {
      nearestTarget: nearest,
      distanceMeters: minDistance,
      isWithinRadius: inRadius,
    }
  }, [gpsCoords, userTargets])

  // Eksekusi Absen Masuk (Clock In)
  const executeClockIn = (extraNote = '') => {
    const time = nowHHMM()
    const late = sched ? gradeTime(time, sched.shift.startTime, 'in').deviation > 0 : false

    const geoPayload = {
      date,
      status: late ? 'Late' : 'Present',
      checkInLat: gpsCoords?.lat || null,
      checkInLng: gpsCoords?.lng || null,
      checkInDistance: distanceMeters,
      checkInLocation: nearestTarget ? (nearestTarget.distributorName || nearestTarget.name) : 'Lokasi Terdeteksi',
      isWithinRadius: Boolean(isWithinRadius),
      accuracyMeters: gpsCoords?.accuracy || null,
      isMockGps: Boolean(isMockGps),
      mockGpsReason: mockGpsReason || null,
      note: extraNote || null,
    }

    clockIn(uid, currentUser?.name || '', time, geoPayload)
  }

  // Eksekusi Absen Pulang (Clock Out)
  const executeClockOut = (extraNote = '') => {
    const time = nowHHMM()

    const geoPayload = {
      date,
      checkOutLat: gpsCoords?.lat || null,
      checkOutLng: gpsCoords?.lng || null,
      checkOutDistance: distanceMeters,
      checkOutLocation: nearestTarget ? (nearestTarget.distributorName || nearestTarget.name) : 'Lokasi Terdeteksi',
      isWithinRadius: Boolean(isWithinRadius),
      accuracyMeters: gpsCoords?.accuracy || null,
      isMockGps: Boolean(isMockGps),
      mockGpsReason: mockGpsReason || null,
      note: extraNote || null,
    }

    clockOut(uid, time, geoPayload)
  }

  // Handle Klik Clock In (Mode B: Jika di luar radius / mock GPS, buka modal peringatan)
  const handleClockInClick = () => {
    if (!uid) return
    if (!isWithinRadius || isMockGps) {
      setWarningAction('in')
      setWarningReason('')
      setShowWarningModal(true)
    } else {
      executeClockIn()
    }
  }

  // Handle Klik Clock Out (Mode B: Jika di luar radius / mock GPS, buka modal peringatan)
  const handleClockOutClick = () => {
    if (!uid) return
    if (!isWithinRadius || isMockGps) {
      setWarningAction('out')
      setWarningReason('')
      setShowWarningModal(true)
    } else {
      executeClockOut()
    }
  }

  // Submit Modal Peringatan Mode B
  const handleConfirmWarningSubmit = (e) => {
    e.preventDefault()
    if (!warningReason.trim() || warningReason.trim().length < 4) {
      alert('Harap masukkan alasan atau keterangan dinas luar minimal 4 karakter.')
      return
    }

    setSubmitting(true)
    const formattedNote = `[Di Luar Radius: ${distanceMeters || '0'}m] ${warningReason.trim()}`

    if (warningAction === 'in') {
      executeClockIn(formattedNote)
    } else {
      executeClockOut(formattedNote)
    }

    setShowWarningModal(false)
    setSubmitting(false)
  }

  const mine = [
    ...new Map(
      records
        .filter((r) => r.userId === uid)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => [`${r.userId}-${r.date}`, r])
    ).values(),
  ].slice(0, 14)

  const dateLabel = now
    ? now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div>
      <PageHeader
        icon='⏱️'
        title='Clock In/Out'
        subtitle={t(
          'Catat jam masuk dan pulang kamu secara online dengan validasi geofencing lokasi kerja.',
          'Record your start and end of day online with geofencing validation.'
        )}
      />

      <SectionCard className='mb-6'>
        {/* Jam & Tanggal Real-Time */}
        <div className='flex flex-col items-center gap-1 py-2'>
          <p className='text-sm text-gray-400'>{dateLabel}</p>
          <p className='text-5xl font-bold font-mono tracking-tight text-gray-900'>
            {now ? now.toLocaleTimeString('id-ID', { hour12: false }) : '--:--:--'}
          </p>
          {sched ? (
            <p className='mt-1 text-sm text-gray-500'>
              {t('Jadwal', 'Schedule')}: <span className='font-semibold text-gray-700'>{sched.shift.name}</span>
              {' · '}
              {sched.shift.startTime}–{sched.shift.endTime}
              <span className='text-gray-400'> ({sched.scheduleName})</span>
            </p>
          ) : (
            <p className='mt-1 text-sm text-amber-600'>
              {t(
                'Tidak ada jadwal kerja hari ini — jam kamu tidak dinilai terlambat/pulang cepat.',
                'No work schedule today — your times are not graded.'
              )}
            </p>
          )}
        </div>

        {/* ─── KARTU STATUS GEOFENCING & GPS ─── */}
        <div className='mt-4 rounded-2xl border p-4 transition-all bg-gray-50/70 border-gray-200'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div className='flex items-start gap-3'>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  gpsStatus === 'locating' || loadingTargets
                    ? 'bg-blue-100 text-blue-700'
                    : isWithinRadius && !isMockGps
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {gpsStatus === 'locating' || loadingTargets ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : isWithinRadius && !isMockGps ? (
                  <CheckCircle2 className='w-5 h-5' />
                ) : (
                  <AlertTriangle className='w-5 h-5' />
                )}
              </div>

              <div>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-bold text-gray-900 text-sm'>
                    {nearestTarget
                      ? nearestTarget.distributorName || nearestTarget.name
                      : 'Mencari Lokasi Target...'}
                  </span>

                  {gpsStatus === 'ready' && !loadingTargets && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isWithinRadius && !isMockGps
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isWithinRadius && !isMockGps ? '🟢 Dalam Radius 300m' : '⚠️ Di Luar Radius 300m'}
                    </span>
                  )}

                  {isMockGps && (
                    <span className='text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200'>
                      ⚠️ Indikasi Mock GPS
                    </span>
                  )}
                </div>

                {nearestTarget && (
                  <p className='text-xs text-gray-500 mt-0.5 line-clamp-1'>
                    <MapPin className='w-3 h-3 inline mr-1 text-gray-400' />
                    {nearestTarget.address || 'Alamat lokasi kantor'}
                  </p>
                )}

                {/* Status Jarak */}
                <div className='mt-2 text-xs flex items-center gap-3 font-mono'>
                  {gpsStatus === 'ready' && distanceMeters != null ? (
                    <>
                      <span className='text-gray-600'>
                        Jarak ke target:{' '}
                        <strong
                          className={isWithinRadius ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}
                        >
                          {distanceMeters > 1000
                            ? `${(distanceMeters / 1000).toFixed(2)} km`
                            : `${distanceMeters} meter`}
                        </strong>
                      </span>
                      <span className='text-gray-400'>·</span>
                      <span className='text-gray-500'>Akurasi: ±{gpsCoords?.accuracy || 0}m</span>
                    </>
                  ) : gpsStatus === 'locating' ? (
                    <span className='text-blue-600 flex items-center gap-1 font-sans'>
                      <Loader2 className='w-3.5 h-3.5 animate-spin' /> Mendeteksi satelit GPS...
                    </span>
                  ) : (
                    <span className='text-rose-600 font-sans'>{gpsError || 'Lokasi belum siap.'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2 self-end sm:self-center flex-shrink-0'>
              <button
                onClick={detectLocation}
                disabled={gpsStatus === 'locating'}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-2xs'
                title='Pindai Ulang Posisi GPS'
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
                Perbarui GPS
              </button>

              {nearestTarget && (
                <a
                  href={`https://www.google.com/maps?q=${nearestTarget.latitude},${nearestTarget.longitude}`}
                  target='_blank'
                  rel='noreferrer'
                  className='p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition'
                  title='Lihat Titik Kantor di Google Maps'
                >
                  <ExternalLink className='w-4 h-4' />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ─── TOMBOL CLOCK IN & CLOCK OUT (MODE B) ─── */}
        <div className='mt-4 grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 pt-5'>
          {/* Jam Masuk */}
          <div className='flex flex-col items-center gap-3 px-4'>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
              {t('Jam Masuk', 'Clock In')}
            </span>
            <ClockValue time={today?.checkIn} scheduled={sched?.shift.startTime} kind='in' t={t} />

            <button
              onClick={handleClockInClick}
              disabled={!!hasIn || !uid || gpsStatus === 'locating'}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
                hasIn
                  ? 'bg-gray-400'
                  : isWithinRadius && !isMockGps
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {hasIn ? (
                t('Sudah Clock In', 'Clocked In')
              ) : isWithinRadius && !isMockGps ? (
                <>🟢 Clock In</>
              ) : (
                <>⚠️ Clock In (Luar Radius)</>
              )}
            </button>
          </div>

          {/* Jam Pulang */}
          <div className='flex flex-col items-center gap-3 px-4'>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
              {t('Jam Pulang', 'Clock Out')}
            </span>
            <ClockValue time={today?.checkOut} scheduled={sched?.shift.endTime} kind='out' t={t} />

            <button
              onClick={handleClockOutClick}
              disabled={!hasIn || !!hasOut || gpsStatus === 'locating'}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                hasOut || !hasIn
                  ? 'border border-gray-200 bg-gray-100 text-gray-400'
                  : isWithinRadius && !isMockGps
                  ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              {hasOut ? (
                t('Sudah Clock Out', 'Clocked Out')
              ) : isWithinRadius && !isMockGps ? (
                <>🔴 Clock Out</>
              ) : (
                <>⚠️ Clock Out (Luar Radius)</>
              )}
            </button>
          </div>
        </div>

        <p className='mt-5 border-t border-gray-100 pt-3 text-center text-xs text-gray-400'>
          <span className='font-semibold text-emerald-600'>{t('Hijau', 'Green')}</span> {t('tepat waktu', 'on time')}
          {' · '}
          <span className='font-semibold text-amber-600'>{t('Kuning', 'Amber')}</span>{' '}
          {t(`telat/pulang cepat < ${GRACE_MINUTES} menit`, `< ${GRACE_MINUTES} min late/early`)}
          {' · '}
          <span className='font-semibold text-red-600'>{t('Merah', 'Red')}</span>{' '}
          {t(`≥ ${GRACE_MINUTES} menit`, `≥ ${GRACE_MINUTES} min`)}
        </p>
      </SectionCard>

      {/* ─── MODAL PERINGATAN MODE B (JIKA DI LUAR 300M / MOCK GPS) ─── */}
      {showWarningModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs'>
          <div className='w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95'>
            <div className='flex items-start justify-between border-b border-gray-100 pb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0'>
                  <AlertTriangle className='w-6 h-6' />
                </div>
                <div>
                  <h3 className='text-base font-bold text-gray-900'>
                    Peringatan Presensi di Luar Radius
                  </h3>
                  <p className='text-xs text-gray-500'>
                    {warningAction === 'in' ? 'Clock In' : 'Clock Out'} di luar batas toleransi 300 meter.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWarningModal(false)}
                className='rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleConfirmWarningSubmit} className='mt-4 space-y-4 text-xs'>
              {/* Alert Box Info */}
              <div className='rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2 text-amber-900'>
                <div className='flex items-center justify-between font-bold text-xs'>
                  <span>Lokasi Target:</span>
                  <span className='font-mono text-gray-800'>
                    {nearestTarget?.distributorName || nearestTarget?.name || 'Kantor'}
                  </span>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span>Jarak Terdeteksi:</span>
                  <span className='font-bold font-mono text-amber-700'>
                    {distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(2)} km` : `${distanceMeters} meter`}
                    <span className='text-[10px] text-gray-500 font-normal ml-1'>(Maks: 300m)</span>
                  </span>
                </div>
                {isMockGps && (
                  <div className='text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 flex items-center gap-1.5'>
                    <ShieldAlert className='w-4 h-4 flex-shrink-0' />
                    <span>Perhatian: Sensor GPS terindikasi anomali ({mockGpsReason}).</span>
                  </div>
                )}
                <p className='text-[11px] text-amber-700 leading-relaxed border-t border-amber-200/60 pt-2'>
                  Presensi ini tetap akan dicatat, namun ditandai berstatus <strong>"Di Luar Radius"</strong> dan dilaporkan ke HR/Atasan.
                </p>
              </div>

              {/* Form Input Alasan Wajib */}
              <div>
                <label className='font-bold text-gray-800 block mb-1'>
                  Alasan / Keterangan Dinas Luar <span className='text-rose-500'>*</span>
                </label>
                <textarea
                  rows={3}
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder='Contoh: Kunjungan toko customer, meeting luar kantor, atau kendala sinyal GPS gedung...'
                  required
                  className='w-full rounded-2xl border border-gray-300 p-3 text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-500'
                />
                <p className='text-[10px] text-gray-400 mt-1'>
                  Keterangan ini akan langsung tampil di laporan presensi HR & atasan.
                </p>
              </div>

              {/* Buttons */}
              <div className='flex items-center justify-end gap-2 border-t border-gray-100 pt-3'>
                <button
                  type='button'
                  onClick={() => setShowWarningModal(false)}
                  className='rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                >
                  Batal (Cek Ulang GPS)
                </button>
                <button
                  type='submit'
                  disabled={submitting || !warningReason.trim()}
                  className='rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition'
                >
                  {submitting ? 'Mengirim...' : 'Konfirmasi & Kirim Absen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RIWAYAT 14 HARI TERAKHIR ─── */}
      <SectionCard
        icon='📋'
        title={t('Riwayat 14 Hari Terakhir', 'Last 14 Days')}
        subtitle={t('Warna mengikuti jadwal kerja pada tanggal tersebut.', 'Colours follow the schedule for that date.')}
        bodyClass='p-0'
      >
        {mine.length === 0 ? (
          <EmptyState
            icon='⏱️'
            title={t('Belum ada catatan', 'No records yet')}
            description={t('Clock In pertama kamu akan muncul di sini.', 'Your first clock-in will show up here.')}
          />
        ) : (
          <DataTable
            columns={[
              { label: t('Tanggal', 'Date') },
              { label: t('Jadwal', 'Schedule') },
              { label: t('Masuk', 'In'), align: 'center' },
              { label: t('Pulang', 'Out'), align: 'center' },
              { label: 'Status & Lokasi', align: 'center' },
            ]}
          >
            {mine.map((r) => {
              const s = shiftFor(uid, r.date, { assignments, schedules, patterns, shifts })
              const gin = gradeTime(r.checkIn, s?.shift.startTime, 'in')
              const gout = gradeTime(r.checkOut, s?.shift.endTime, 'out')
              return (
                <Tr key={`${r.userId}-${r.date}`}>
                  <Td className='tabular-nums font-medium'>{r.date}</Td>
                  <Td className='text-xs text-gray-500'>
                    {s ? `${s.shift.name} · ${s.shift.startTime}–${s.shift.endTime}` : t('Libur', 'Day off')}
                  </Td>
                  <Td align='center' className={`font-mono font-semibold tabular-nums ${TONE_CLASS[gin.tone]}`}>
                    {r.checkIn || '-'}
                  </Td>
                  <Td align='center' className={`font-mono font-semibold tabular-nums ${TONE_CLASS[gout.tone]}`}>
                    {r.checkOut || '-'}
                  </Td>
                  <Td align='center'>
                    <div className='flex flex-col items-center gap-1'>
                      <StatusBadge tone={r.status === 'Present' ? 'success' : r.status === 'Late' ? 'warning' : 'danger'}>
                        {r.status}
                      </StatusBadge>
                      {r.isWithinRadius === false && (
                        <span className='text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded'>
                          ⚠️ Luar Radius
                        </span>
                      )}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>
    </div>
  )
}
