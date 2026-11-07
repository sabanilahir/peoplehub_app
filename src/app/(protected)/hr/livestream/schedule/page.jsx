'use client'

import { useState, useEffect } from 'react'
import {
  PageHeader,
  StatCard,
  SectionCard,
  DataTable,
  Tr,
  Td,
  ActionButton,
  StatusBadge,
  EmptyState,
} from '@/components/ui'
import {
  Calendar,
  Clock,
  Radio,
  Users,
  Sparkles,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Tv,
} from 'lucide-react'

export default function LivestreamSchedulePage() {
  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(todayStr)
  const [channel, setChannel] = useState('TikTok Live')
  const [slots, setSlots] = useState([])
  const [hostsList, setHostsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Auto Generate Modal
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [pair1HostA, setPair1HostA] = useState('')
  const [pair1HostB, setPair1HostB] = useState('')
  const [pair2HostA, setPair2HostA] = useState('')
  const [pair2HostB, setPair2HostB] = useState('')
  const [pair3HostA, setPair3HostA] = useState('')
  const [pair3HostB, setPair3HostB] = useState('')

  // Edit Single Slot Modal
  const [editSlot, setEditSlot] = useState(null)
  const [editHostId, setEditHostId] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Fetch Schedule
  const fetchSchedule = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/livestream/schedule?date=${date}&channel=${encodeURIComponent(channel)}`)
      const data = await res.json()
      if (data.success) {
        setSlots(data.slots || [])
      }
    } catch (err) {
      console.error('Failed to load slots:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Available Hosts
  const fetchHosts = async () => {
    try {
      const res = await fetch('/api/livestream/payroll')
      const data = await res.json()
      if (data.success && data.summary) {
        const list = data.summary.map((s) => ({ id: s.hostId, name: s.hostName }))
        setHostsList(list)

        // Prepopulate auto-generate modal if available
        if (list.length >= 6) {
          const findHost = (n) => list.find((h) => h.name.toLowerCase().includes(n.toLowerCase()))?.id || ''
          setPair1HostA(findHost('Melly') || list[0]?.id)
          setPair1HostB(findHost('Sevia') || list[1]?.id)
          setPair2HostA(findHost('Romi') || list[2]?.id)
          setPair2HostB(findHost('Rizki') || list[3]?.id)
          setPair3HostA(findHost('Cecil') || list[4]?.id)
          setPair3HostB(findHost('Mella') || list[5]?.id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch hosts:', err)
    }
  }

  useEffect(() => {
    fetchSchedule()
  }, [date, channel])

  useEffect(() => {
    fetchHosts()
  }, [])

  // Auto-Generate Handler
  const handleAutoGenerate = async () => {
    const selectedHostIds = [
      pair1HostA,
      pair1HostB,
      pair2HostA,
      pair2HostB,
      pair3HostA,
      pair3HostB,
    ]

    const selectedHosts = selectedHostIds.map((id) => {
      const found = hostsList.find((h) => String(h.id) === String(id))
      return { id: Number(id), name: found ? found.name : `Host #${id}` }
    })

    try {
      setSaving(true)
      const res = await fetch('/api/livestream/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-generate',
          date,
          channel,
          hosts: selectedHosts,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSlots(data.slots || [])
        setShowAutoModal(false)
      } else {
        alert(data.error || 'Gagal membuat roster otomatis')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan jaringan')
    } finally {
      setSaving(false)
    }
  }

  // Update Single Slot Handler
  const handleSaveSlot = async () => {
    if (!editSlot) return
    const host = hostsList.find((h) => String(h.id) === String(editHostId))
    try {
      setSaving(true)
      const res = await fetch('/api/livestream/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-slot',
          slotId: editSlot.id,
          date,
          channel,
          hostId: host ? host.id : null,
          hostName: host ? host.name : null,
          notes: editNotes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditSlot(null)
        fetchSchedule()
      } else {
        alert(data.error || 'Gagal menyimpan slot')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Reset Schedule
  const handleResetDay = async () => {
    if (!confirm(`Reset jadwal tanggal ${date}? Semua host pada tanggal ini akan dikosongkan.`)) return
    try {
      setSaving(true)
      const res = await fetch('/api/livestream/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-day', date, channel }),
      })
      const data = await res.json()
      if (data.success) {
        setSlots(data.slots || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Stats
  const filledSlots = slots.filter((s) => s.hostId).length
  const onAirCount = slots.filter((s) => s.status === 'On-Air').length
  const uniqueHosts = new Set(slots.filter((s) => s.hostName).map((s) => s.hostName)).size

  return (
    <div className='space-y-6 pb-12'>
      {/* Header */}
      <PageHeader
        icon='📺'
        title='Jadwal Roster Livestream 24 Jam'
        subtitle='Manajemen 12 slot penyiaran 24 jam non-stop dengan pola pairing 2 jam live - 2 jam istirahat.'
        actions={
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setShowAutoModal(true)}
              className='inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-teal-700 hover:to-emerald-700 transition'
            >
              <Sparkles className='w-4 h-4' />
              ⚡ Auto-Generate Roster Pasangan
            </button>
            <button
              onClick={handleResetDay}
              className='inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
            >
              <RefreshCw className='w-3.5 h-3.5' />
              Reset Hari
            </button>
          </div>
        }
      />

      {/* Date & Channel Bar */}
      <div className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2 text-sm font-medium text-gray-700'>
            <Calendar className='w-4 h-4 text-teal-600' />
            <span>Pilih Tanggal:</span>
            <input
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className='rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'
            />
          </div>
          <div className='flex items-center gap-2 text-sm font-medium text-gray-700'>
            <Tv className='w-4 h-4 text-teal-600' />
            <span>Channel:</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className='rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'
            >
              <option value='TikTok Live'>TikTok Live</option>
              <option value='Shopee Live'>Shopee Live</option>
              <option value='Tokopedia Play'>Tokopedia Play</option>
            </select>
          </div>
        </div>

        <div className='flex items-center gap-2 text-xs text-gray-500'>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 border border-emerald-200'>
            <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
            24 Jam Non-Stop Active
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <StatCard
          icon='⏱️'
          label='Total Slot Terisi'
          value={`${filledSlots} / 12`}
          hint={filledSlots === 12 ? 'Lengkap 100%' : `${12 - filledSlots} slot kosong`}
          tone={filledSlots === 12 ? 'green' : 'orange'}
        />
        <StatCard
          icon='🔴'
          label='Sedang On-Air Sekarang'
          value={`${onAirCount} Sesi`}
          hint='Siaran langsung sedang berlangsung'
          tone={onAirCount > 0 ? 'red' : 'gray'}
        />
        <StatCard
          icon='👥'
          label='Host Bertugas Hari Ini'
          value={`${uniqueHosts} Host`}
          hint='Target ideal 6 host berpasangan'
          tone='blue'
        />
        <StatCard
          icon='⚡'
          label='Model Jam Kerja'
          value='4 Jam / Host'
          hint='Pola 2 Jam Live - 2 Rest - 2 Live'
          tone='purple'
        />
      </div>

      {/* Roster Table */}
      <SectionCard
        icon='📋'
        title={`Roster 12 Slot Penyiaran (${date})`}
        subtitle={`Channel: ${channel} • Terbagi dalam 3 Blok Pairing (8 Jam per Blok)`}
      >
        {loading ? (
          <div className='py-12 text-center text-sm text-gray-500'>Memuat jadwal livestream...</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='border-b border-gray-200 bg-gray-50/75 text-xs uppercase tracking-wider text-gray-600'>
                <tr>
                  <th className='py-3.5 px-4 font-semibold'>Slot</th>
                  <th className='py-3.5 px-4 font-semibold'>Rentang Jam</th>
                  <th className='py-3.5 px-4 font-semibold'>Blok & Pasangan</th>
                  <th className='py-3.5 px-4 font-semibold'>Host Bertugas</th>
                  <th className='py-3.5 px-4 font-semibold'>Status Siaran</th>
                  <th className='py-3.5 px-4 font-semibold'>Presensi Aktual</th>
                  <th className='py-3.5 px-4 text-right font-semibold'>Aksi</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {slots.map((slot) => {
                  const isOnAir = slot.status === 'On-Air'
                  const isScheduled = slot.status === 'Scheduled'
                  const isCompleted = slot.status === 'Completed'

                  // Pair grouping info
                  let pairLabel = 'Pasangan 1 (Dini Hari / Pagi)'
                  let pairBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  if (slot.slotNumber >= 5 && slot.slotNumber <= 8) {
                    pairLabel = 'Pasangan 2 (Pagi / Siang)'
                    pairBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200'
                  } else if (slot.slotNumber >= 9) {
                    pairLabel = 'Pasangan 3 (Sore / Malam)'
                    pairBadgeClass = 'bg-violet-50 text-violet-700 border-violet-200'
                  }

                  const latestLog = slot.sessionLogs?.[0]

                  return (
                    <tr
                      key={slot.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isOnAir ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className='py-3.5 px-4 font-mono font-bold text-gray-700'>
                        #{slot.slotNumber}
                      </td>
                      <td className='py-3.5 px-4 font-mono font-semibold text-gray-900'>
                        <span className='inline-flex items-center gap-1.5'>
                          <Clock className='w-4 h-4 text-gray-400' />
                          {slot.timeRange}
                        </span>
                      </td>
                      <td className='py-3.5 px-4'>
                        <span
                          className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${pairBadgeClass}`}
                        >
                          {pairLabel}
                        </span>
                      </td>
                      <td className='py-3.5 px-4'>
                        {slot.hostName ? (
                          <div className='flex items-center gap-2'>
                            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-cyan-600 text-xs font-bold text-white shadow-sm'>
                              {slot.hostName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className='font-semibold text-gray-900'>{slot.hostName}</div>
                              <div className='text-xs text-gray-500'>ID: {slot.hostId}</div>
                            </div>
                          </div>
                        ) : (
                          <span className='text-xs italic text-gray-400'>Belum ditentukan</span>
                        )}
                      </td>
                      <td className='py-3.5 px-4'>
                        {isOnAir ? (
                          <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300'>
                            <span className='relative flex h-2 w-2'>
                              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                              <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-600' />
                            </span>
                            🔴 ON-AIR SEKARANG
                          </span>
                        ) : isCompleted ? (
                          <span className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700'>
                            <CheckCircle2 className='w-3.5 h-3.5 text-gray-500' />
                            Selesai Siaran
                          </span>
                        ) : isScheduled ? (
                          <span className='inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200'>
                            Terjadwal
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200'>
                            Kosong
                          </span>
                        )}
                      </td>
                      <td className='py-3.5 px-4 text-xs text-gray-600'>
                        {latestLog ? (
                          <div>
                            <div>
                              Aktual: <span className='font-mono font-semibold'>{latestLog.actualStart || '--'}</span> -{' '}
                              <span className='font-mono font-semibold'>{latestLog.actualEnd || '--'}</span>
                            </div>
                            {latestLog.lateMinutes > 0 && (
                              <div className='text-red-600 font-semibold'>
                                Telat {latestLog.lateMinutes} mnt (Denda Rp {latestLog.penaltyAmount.toLocaleString()})
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className='text-gray-400'>-</span>
                        )}
                      </td>
                      <td className='py-3.5 px-4 text-right'>
                        <button
                          onClick={() => {
                            setEditSlot(slot)
                            setEditHostId(slot.hostId || '')
                            setEditNotes(slot.notes || '')
                          }}
                          className='inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50'
                        >
                          <Edit2 className='w-3 h-3 text-gray-500' />
                          Ubah
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Auto Generate Modal */}
      {showAutoModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl'>
            <div className='flex items-center justify-between border-b border-gray-100 pb-4'>
              <div className='flex items-center gap-2'>
                <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700'>
                  <Sparkles className='w-5 h-5' />
                </div>
                <div>
                  <h3 className='text-lg font-bold text-gray-900'>Auto-Generate Roster Pasangan 24 Jam</h3>
                  <p className='text-xs text-gray-500'>
                    Pilih 6 host untuk membentuk 3 pasangan kerja bergantian (2 jam live - 2 jam istirahat).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAutoModal(false)}
                className='text-gray-400 hover:text-gray-600 font-bold text-lg'
              >
                ✕
              </button>
            </div>

            <div className='space-y-4 py-4'>
              {/* Pair 1 */}
              <div className='rounded-xl border border-indigo-100 bg-indigo-50/50 p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-xs font-bold text-indigo-900 uppercase tracking-wide'>
                    Pasangan 1: Blok 00:00 - 08:00 (Dini Hari - Pagi)
                  </span>
                  <span className='text-xs text-indigo-700'>Slot #1, #2, #3, #4</span>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='text-xs font-medium text-gray-700'>Host A (Slot 1 & 3):</label>
                    <select
                      value={pair1HostA}
                      onChange={(e) => setPair1HostA(e.target.value)}
                      className='mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold'
                    >
                      <option value=''>-- Pilih Host --</option>
                      {hostsList.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-medium text-gray-700'>Host B (Slot 2 & 4):</label>
                    <select
                      value={pair1HostB}
                      onChange={(e) => setPair1HostB(e.target.value)}
                      className='mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold'
                    >
                      <option value=''>-- Pilih Host --</option>
                      {hostsList.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pair 2 */}
              <div className='rounded-xl border border-amber-100 bg-amber-50/50 p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-xs font-bold text-amber-900 uppercase tracking-wide'>
                    Pasangan 2: Blok 08:00 - 16:00 (Pagi - Siang)
                  </span>
                  <span className='text-xs text-amber-700'>Slot #5, #6, #7, #8</span>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='text-xs font-medium text-gray-700'>Host C (Slot 5 & 7):</label>
                    <select
                      value={pair2HostA}
                      onChange={(e) => setPair2HostA(e.target.value)}
                      className='mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold'
                    >
                      <option value=''>-- Pilih Host --</option>
                      {hostsList.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-medium text-gray-700'>Host D (Slot 6 & 8):</label>
                    <select
                      value={pair2HostB}
                      onChange={(e) => setPair2HostB(e.target.value)}
                      className='mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold'
                    >
                      <option value=''>-- Pilih Host --</option>
                      {hostsList.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pair 3 */}
              <div className='rounded-xl border border-violet-100 bg-violet-50/50 p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-xs font-bold text-violet-900 uppercase tracking-wide'>
                    Pasangan 3: Blok 16:00 - 24:00 (Sore - Malam)
                  </span>
                  <span className='text-xs text-violet-700'>Slot #9, #10, #11, #12</span>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='text-xs font-medium text-gray-700'>Host E (Slot 9 & 11):</label>
                    <select
                      value={pair3HostA}
                      onChange={(e) => setPair3HostA(e.target.value)}
                      className='mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold'
                    >
                      <option value=''>-- Pilih Host --</option>
                      {hostsList.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-medium text-gray-700'>Host F (Slot 10 & 12):</label>
                    <select
                      value={pair3HostB}
                      onChange={(e) => setPair3HostB(e.target.value)}
                      className='mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold'
                    >
                      <option value=''>-- Pilih Host --</option>
                      {hostsList.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex items-center justify-end gap-2 border-t border-gray-100 pt-4'>
              <button
                onClick={() => setShowAutoModal(false)}
                className='rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={handleAutoGenerate}
                className='rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50'
              >
                {saving ? 'Menyusun Roster...' : 'Terapkan Roster Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editSlot && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl'>
            <h3 className='text-base font-bold text-gray-900 mb-1'>
              Ubah Slot #{editSlot.slotNumber} ({editSlot.timeRange})
            </h3>
            <p className='text-xs text-gray-500 mb-4'>Tugaskan host atau catatan khusus untuk slot ini.</p>

            <div className='space-y-3'>
              <div>
                <label className='text-xs font-medium text-gray-700'>Host:</label>
                <select
                  value={editHostId}
                  onChange={(e) => setEditHostId(e.target.value)}
                  className='mt-1 w-full rounded-xl border border-gray-300 bg-white p-2 text-sm font-semibold'
                >
                  <option value=''>-- Kosongkan Slot --</option>
                  {hostsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='text-xs font-medium text-gray-700'>Catatan:</label>
                <input
                  type='text'
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder='Misal: Flash sale / promo khusus'
                  className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm'
                />
              </div>
            </div>

            <div className='flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-4'>
              <button
                onClick={() => setEditSlot(null)}
                className='rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={handleSaveSlot}
                className='rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50'
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

