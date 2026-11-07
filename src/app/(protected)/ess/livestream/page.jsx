'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusBadge,
} from '@/components/ui'
import {
  Radio,
  Clock,
  PlayCircle,
  StopCircle,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Sparkles,
} from 'lucide-react'

export default function EssLivestreamPage() {
  const { currentUser } = useAuthStore()
  const todayStr = new Date().toISOString().split('T')[0]

  const [hostsList, setHostsList] = useState([])
  const [selectedHostId, setSelectedHostId] = useState('')
  const [hostData, setHostData] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [scheduledSlots, setScheduledSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [notes, setNotes] = useState('')

  // Live Timer & Stopwatch
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)

  // Fetch Hosts
  const fetchHosts = async () => {
    try {
      const res = await fetch('/api/livestream/payroll')
      const data = await res.json()
      if (data.success && data.summary) {
        setHostsList(data.summary)
        // Find if logged-in user matches any host
        const match = data.summary.find(
          (h) => h.hostId === currentUser?.id || h.hostName.toLowerCase() === currentUser?.name?.toLowerCase()
        )
        const initialId = match ? match.hostId : data.summary[0]?.hostId
        setSelectedHostId(initialId ? String(initialId) : '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Host Status & Today's Schedule
  const fetchHostStatus = async (id) => {
    if (!id) return
    try {
      // 1. Clock status
      const resClock = await fetch(`/api/livestream/clock?hostId=${id}&date=${todayStr}`)
      const dataClock = await resClock.json()
      if (dataClock.success) {
        setActiveSession(dataClock.activeSession)
        setScheduledSlots(dataClock.slots || [])

        // If currently on-air, calculate elapsed seconds
        if (dataClock.activeSession?.actualStart) {
          const [sh, sm] = dataClock.activeSession.actualStart.split(':').map(Number)
          const now = new Date()
          const start = new Date()
          start.setHours(sh, sm, 0, 0)
          const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
          setStopwatchSeconds(elapsed)
        } else {
          setStopwatchSeconds(0)
        }
      }

      // 2. Monthly Summary & Tier Progress
      const resPay = await fetch(`/api/livestream/payroll?hostId=${id}`)
      const dataPay = await resPay.json()
      if (dataPay.success && dataPay.summary?.[0]) {
        setHostData(dataPay.summary[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchHosts()
  }, [])

  useEffect(() => {
    if (selectedHostId) {
      fetchHostStatus(selectedHostId)
    }
  }, [selectedHostId])

  // Stopwatch interval when active session is On-Air
  useEffect(() => {
    if (!activeSession) return
    const interval = setInterval(() => {
      setStopwatchSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  const formatSeconds = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Clock In
  const handleClockIn = async () => {
    try {
      setProcessing(true)
      const res = await fetch('/api/livestream/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock-in',
          hostId: selectedHostId,
          notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setNotes('')
        fetchHostStatus(selectedHostId)
      } else {
        alert(data.error || 'Gagal memulai siaran')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  // Clock Out
  const handleClockOut = async () => {
    if (!confirm('Akhiri sesi live streaming ini sekarang?')) return
    try {
      setProcessing(true)
      const res = await fetch('/api/livestream/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock-out',
          hostId: selectedHostId,
          logId: activeSession?.id,
          notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setNotes('')
        fetchHostStatus(selectedHostId)
      } else {
        alert(data.error || 'Gagal menyelesaikan siaran')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const hours = hostData?.totalHours || 0
  const rate = hostData?.ratePerHour || 50000
  const netHonor = hostData?.netHonor || 0
  const tierName = hostData?.tierName || 'Base Rate'
  const hoursToNext = hostData?.hoursToNextTier || 0
  const nextRate = hostData?.nextTierRate

  // Progress Bar % (capped at 150 hours = 100%)
  const progressPercent = Math.min(100, Math.round((hours / 150) * 100))

  return (
    <div className='space-y-6 pb-12'>
      {/* Header */}
      <PageHeader
        icon='🎙️'
        title='Portal Host Live Streaming'
        subtitle='Presensi siaran langsung per sesi, live timer siaran, dan progres pencapaian tier honor bulanan.'
        actions={
          <div className='flex items-center gap-2'>
            <span className='text-xs font-semibold text-gray-500'>Profil Host:</span>
            <select
              value={selectedHostId}
              onChange={(e) => setSelectedHostId(e.target.value)}
              className='rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none'
            >
              {hostsList.map((h) => (
                <option key={h.hostId} value={h.hostId}>
                  {h.hostName} ({h.totalHours} Jam)
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Main Broadcast Control Hero */}
      <div className='relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl'>
        {/* Background glow effects */}
        <div className='absolute -top-24 -right-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl' />
        <div className='absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl' />

        <div className='relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center'>
          {/* Left info & status */}
          <div className='lg:col-span-7 space-y-4'>
            <div className='flex items-center gap-2'>
              {activeSession ? (
                <span className='inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3.5 py-1 text-xs font-bold text-rose-300 border border-rose-500/40 backdrop-blur-md'>
                  <span className='relative flex h-2.5 w-2.5'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75' />
                    <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500' />
                  </span>
                  🔴 ON-AIR BROADCASTING
                </span>
              ) : (
                <span className='inline-flex items-center gap-2 rounded-full bg-gray-800/80 px-3.5 py-1 text-xs font-semibold text-gray-300 border border-gray-700 backdrop-blur-md'>
                  <span className='h-2 w-2 rounded-full bg-gray-400' />
                  Standby / Menunggu Sesi
                </span>
              )}
              <span className='text-xs text-gray-400'>
                Channel: <strong className='text-white'>TikTok Live Studio 1</strong>
              </span>
            </div>

            <div>
              <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight'>
                Halo, {hostData?.hostName || 'Host'}!
              </h2>
              <p className='mt-1 text-sm text-gray-300'>
                {activeSession
                  ? `Sesi siaran dimulai pukul ${activeSession.actualStart}. Semangat menyapa para penonton dan followers!`
                  : scheduledSlots.length > 0
                  ? `Hari ini Anda memiliki ${scheduledSlots.length} jadwal sesi siaran (Total 4 Jam kerja).`
                  : 'Siap untuk memulai sesi siaran langsung berikutnya.'}
              </p>
            </div>

            {/* Scheduled slots today */}
            {scheduledSlots.length > 0 && (
              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <span className='text-xs text-gray-400'>Jadwal Anda Hari Ini:</span>
                {scheduledSlots.map((s) => (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                      s.status === 'On-Air'
                        ? 'bg-rose-500 text-white'
                        : s.status === 'Completed'
                        ? 'bg-gray-800 text-gray-400 line-through'
                        : 'bg-teal-900/60 text-teal-300 border border-teal-700/50'
                    }`}
                  >
                    <Clock className='w-3 h-3' />
                    Slot #{s.slotNumber} ({s.timeRange})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right action control & stopwatch */}
          <div className='lg:col-span-5 flex flex-col items-center justify-center rounded-2xl bg-white/5 p-6 backdrop-blur-md border border-white/10'>
            {activeSession ? (
              <div className='w-full text-center space-y-4'>
                <div className='text-xs font-semibold uppercase tracking-wider text-rose-300'>
                  Stopwatch Durasi Live Sesi Ini
                </div>
                <div className='font-mono text-4xl sm:text-5xl font-black text-rose-400 tracking-wider'>
                  {formatSeconds(stopwatchSeconds)}
                </div>
                <div className='text-xs text-gray-400'>
                  Mulai siaran: <span className='font-bold text-white'>{activeSession.actualStart}</span>
                  {activeSession.lateMinutes > 0 && (
                    <span className='ml-2 text-rose-400'>
                      (Telat {activeSession.lateMinutes} mnt)
                    </span>
                  )}
                </div>

                <div className='pt-2'>
                  <button
                    disabled={processing}
                    onClick={handleClockOut}
                    className='w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700 transition transform hover:-translate-y-0.5 disabled:opacity-50'
                  >
                    <StopCircle className='w-5 h-5' />
                    {processing ? 'Menyimpan...' : 'AKHIRI SIARAN (Clock Out)'}
                  </button>
                </div>
              </div>
            ) : (
              <div className='w-full text-center space-y-4'>
                <div className='text-xs font-semibold uppercase tracking-wider text-teal-300'>
                  Mulai Sesi Siaran Baru
                </div>
                <div className='text-sm text-gray-300'>
                  Pastikan kamera, lighting, dan microphone studio telah siap sebelum menekan tombol.
                </div>

                <div className='pt-2'>
                  <button
                    disabled={processing}
                    onClick={handleClockIn}
                    className='w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/30 hover:from-emerald-600 hover:to-teal-600 transition transform hover:-translate-y-0.5 disabled:opacity-50'
                  >
                    <PlayCircle className='w-5 h-5' />
                    {processing ? 'Memproses...' : 'MULAI SIARAN (Clock In)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tier Progress & Honor Summary */}
      <div className='rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700'>
                <Award className='w-4 h-4' />
              </span>
              <h3 className='text-lg font-bold text-gray-900'>Progres Tiering Tarif Honor Bulan Ini</h3>
            </div>
            <p className='mt-1 text-xs text-gray-500'>
              Tarif honor per jam meningkat otomatis seiring bertambahnya jam tayang siaran Anda dalam bulan ini.
            </p>
          </div>

          <div className='flex items-center gap-3 bg-teal-50 px-4 py-2 rounded-2xl border border-teal-200/80'>
            <div>
              <div className='text-[11px] font-semibold text-teal-700 uppercase'>Tarif Anda Saat Ini</div>
              <div className='text-xl font-black text-teal-900'>Rp {rate.toLocaleString()} / Jam</div>
            </div>
            <div className='border-l border-teal-200 pl-3'>
              <div className='text-[11px] font-semibold text-teal-700 uppercase'>Estimasi Honor</div>
              <div className='text-xl font-black text-emerald-700'>Rp {netHonor.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Multi-Step Visual Progress Bar */}
        <div className='space-y-2 pt-2'>
          <div className='flex justify-between text-xs font-semibold text-gray-600'>
            <span>0 Jam</span>
            <span>60 Jam (Rp 60k)</span>
            <span>90 Jam</span>
            <span>120 Jam (Rp 65k)</span>
            <span>150 Jam (Rp 70k)</span>
          </div>

          <div className='relative h-4 w-full rounded-full bg-gray-100 overflow-hidden shadow-inner'>
            {/* Background markers */}
            <div className='absolute left-[40%] top-0 bottom-0 w-0.5 bg-gray-300 z-10' />
            <div className='absolute left-[60%] top-0 bottom-0 w-0.5 bg-gray-300 z-10' />
            <div className='absolute left-[80%] top-0 bottom-0 w-0.5 bg-gray-300 z-10' />

            {/* Filled bar */}
            <div
              className='h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-500 transition-all duration-700 rounded-full'
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className='flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-1 pt-1'>
            <div>
              Akumulasi Jam Tayang:{' '}
              <strong className='text-gray-900 text-sm font-bold font-mono'>{hours} Jam</strong> (
              <span className='font-semibold text-teal-700'>{tierName}</span>)
            </div>
            {hoursToNext > 0 && nextRate && (
              <div className='inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200'>
                <Sparkles className='w-3.5 h-3.5' />
                Tinggal {hoursToNext} jam lagi untuk naik ke tarif Rp {nextRate.toLocaleString()} / Jam!
              </div>
            )}
          </div>
        </div>

        {/* 3 Tier Cards Breakdown */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2'>
          {/* Tier 1 */}
          <div
            className={`rounded-2xl border p-4 transition ${
              hours >= 60 && hours <= 90
                ? 'border-teal-500 bg-teal-50/60 shadow-sm'
                : hours > 90
                ? 'border-gray-200 bg-gray-50/50'
                : 'border-dashed border-gray-300 bg-white'
            }`}
          >
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wider text-teal-800'>Tier 1</span>
              {hours >= 60 && (
                <span className='text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full'>
                  Tercapai
                </span>
              )}
            </div>
            <div className='mt-2 text-2xl font-black text-gray-900'>Rp 60.000 <span className='text-xs font-normal text-gray-500'>/ jam</span></div>
            <p className='mt-1 text-xs text-gray-500'>Syarat akumulasi: 60 s/d 90 jam tayang / bulan</p>
          </div>

          {/* Tier 2 */}
          <div
            className={`rounded-2xl border p-4 transition ${
              hours > 90 && hours <= 120
                ? 'border-teal-500 bg-teal-50/60 shadow-sm'
                : hours > 120
                ? 'border-gray-200 bg-gray-50/50'
                : 'border-dashed border-gray-300 bg-white'
            }`}
          >
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wider text-teal-800'>Tier 2</span>
              {hours > 90 && (
                <span className='text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full'>
                  Tercapai
                </span>
              )}
            </div>
            <div className='mt-2 text-2xl font-black text-gray-900'>Rp 65.000 <span className='text-xs font-normal text-gray-500'>/ jam</span></div>
            <p className='mt-1 text-xs text-gray-500'>Syarat akumulasi: 91 s/d 120 jam tayang / bulan</p>
          </div>

          {/* Tier 3 */}
          <div
            className={`rounded-2xl border p-4 transition ${
              hours > 120
                ? 'border-teal-500 bg-teal-50/60 shadow-sm'
                : 'border-dashed border-gray-300 bg-white'
            }`}
          >
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wider text-teal-800'>Tier 3 (Max)</span>
              {hours > 120 && (
                <span className='text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full'>
                  Bintang ⭐
                </span>
              )}
            </div>
            <div className='mt-2 text-2xl font-black text-gray-900'>Rp 70.000 <span className='text-xs font-normal text-gray-500'>/ jam</span></div>
            <p className='mt-1 text-xs text-gray-500'>Syarat akumulasi: 121 s/d 150 jam tayang / bulan</p>
          </div>
        </div>
      </div>

      {/* Session History Table */}
      <SectionCard
        icon='📜'
        title={`Riwayat Sesi Live Siaran Bulan Ini (${hostData?.logs?.length || 0} Sesi)`}
        subtitle='Catatan durasi siaran aktual per sesi, potongan keterlambatan, dan status verifikasi.'
      >
        {hostData?.logs && hostData.logs.length > 0 ? (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='border-b border-gray-200 bg-gray-50/75 text-xs uppercase tracking-wider text-gray-600'>
                <tr>
                  <th className='py-3 px-4 font-semibold'>Tanggal</th>
                  <th className='py-3 px-4 font-semibold'>Jadwal</th>
                  <th className='py-3 px-4 font-semibold'>Mulai Aktual</th>
                  <th className='py-3 px-4 font-semibold'>Selesai Aktual</th>
                  <th className='py-3 px-4 font-semibold'>Durasi</th>
                  <th className='py-3 px-4 font-semibold'>Keterlambatan</th>
                  <th className='py-3 px-4 font-semibold'>Status</th>
                  <th className='py-3 px-4 font-semibold'>Catatan</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {hostData.logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className='hover:bg-gray-50/80'>
                    <td className='py-3 px-4 font-mono font-medium text-gray-900'>{log.date}</td>
                    <td className='py-3 px-4 text-xs text-gray-500 font-mono'>
                      {log.scheduledStart} - {log.scheduledEnd}
                    </td>
                    <td className='py-3 px-4 font-mono font-semibold text-gray-800'>{log.actualStart || '-'}</td>
                    <td className='py-3 px-4 font-mono font-semibold text-gray-800'>{log.actualEnd || '-'}</td>
                    <td className='py-3 px-4 font-mono font-bold text-teal-700'>
                      {log.durationHours} Jam ({log.durationMinutes} mnt)
                    </td>
                    <td className='py-3 px-4 text-xs'>
                      {log.lateMinutes > 0 ? (
                        <span className='font-semibold text-red-600'>
                          Telat {log.lateMinutes} mnt (-Rp {log.penaltyAmount.toLocaleString()})
                        </span>
                      ) : (
                        <span className='text-emerald-600 font-medium'>Tepat Waktu</span>
                      )}
                    </td>
                    <td className='py-3 px-4'>
                      {log.status === 'On-Air' ? (
                        <span className='inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700'>
                          🔴 On-Air
                        </span>
                      ) : log.lateMinutes > 0 ? (
                        <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200'>
                          Late
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200'>
                          Completed
                        </span>
                      )}
                    </td>
                    <td className='py-3 px-4 text-xs text-gray-500'>{log.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hostData.logs.length > 15 && (
              <div className='p-3 text-center text-xs text-gray-500 bg-gray-50/50 border-t border-gray-100'>
                Menampilkan 15 dari total {hostData.logs.length} sesi siaran bulan ini.
              </div>
            )}
          </div>
        ) : (
          <div className='py-8 text-center text-sm text-gray-500'>
            Belum ada riwayat sesi siaran untuk host ini pada bulan ini.
          </div>
        )}
      </SectionCard>
    </div>
  )
}

