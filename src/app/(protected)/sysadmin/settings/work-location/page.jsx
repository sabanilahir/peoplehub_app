'use client'

import { useState, useEffect } from 'react'
import {
  PageHeader,
  StatCard,
} from '@/components/ui'
import {
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  Award,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  X,
  Building2,
  Warehouse,
  Briefcase,
  Video,
} from 'lucide-react'

export default function WorkLocationSettingsPage() {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal Create / Edit
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [locationCode, setLocationCode] = useState('')
  const [locationName, setLocationName] = useState('')
  const [workDays, setWorkDays] = useState('Senin - Jumat')
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(0) // Default 0 menit
  const [rewardAmount, setRewardAmount] = useState(200000)
  const [rewardCriteria, setRewardCriteria] = useState('Reward Kehadiran didapatkan jika dalam periode cut off tidak ada Telat, Casual Leave, Cuti, Sick Leave, izin setengah hari (full attandance)')
  const [active, setActive] = useState(true)

  // Dynamic schedules & penalties
  const [schedules, setSchedules] = useState([
    { day: 'Senin - Jumat', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isOff: false },
    { day: 'Sabtu', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isOff: true },
  ])
  const [latePenalties, setLatePenalties] = useState([
    { min: 1, max: 10, amount: 10000, deductionType: 'fixed', salaryFraction: 0, label: '1 - 10 Menit : 10.000' },
    { min: 11, max: 20, amount: 20000, deductionType: 'fixed', salaryFraction: 0, label: '11 - 20 Menit : 20.000' },
    { min: 21, max: 9999, amount: 0, deductionType: 'half_day_salary', salaryFraction: 0.5, label: 'Lebih dari 20 Menit tanpa pemberitahuan : Gaji Setengah Hari' },
  ])

  // Fetch all configs
  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings/work-location')
      const data = await res.json()
      if (data.success) {
        setConfigs(data.configs || [])
      }
    } catch (err) {
      console.error('Error fetching work location configs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null)
    setLocationCode('')
    setLocationName('')
    setWorkDays('Senin - Jumat')
    setGracePeriodMinutes(0)
    setRewardAmount(200000)
    setRewardCriteria('Reward Kehadiran didapatkan jika dalam periode cut off tidak ada Telat, Casual Leave, Cuti, Sick Leave, izin setengah hari (full attandance)')
    setActive(true)
    setSchedules([
      { day: 'Senin - Jumat', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isOff: false },
      { day: 'Sabtu', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isOff: true },
    ])
    setLatePenalties([
      { min: 1, max: 10, amount: 10000, deductionType: 'fixed', salaryFraction: 0, label: '1 - 10 Menit : 10.000' },
      { min: 11, max: 20, amount: 20000, deductionType: 'fixed', salaryFraction: 0, label: '11 - 20 Menit : 20.000' },
      { min: 21, max: 9999, amount: 0, deductionType: 'half_day_salary', salaryFraction: 0.5, label: 'Lebih dari 20 Menit tanpa pemberitahuan : Gaji Setengah Hari' },
    ])
    setShowModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (cfg) => {
    setEditingId(cfg.id)
    setLocationCode(cfg.locationCode)
    setLocationName(cfg.locationName)
    setWorkDays(cfg.workDays)
    setGracePeriodMinutes(cfg.gracePeriodMinutes || 0)
    setRewardAmount(cfg.rewardAmount || 0)
    setRewardCriteria(cfg.rewardCriteria || '')
    setActive(cfg.active)
    setSchedules(Array.isArray(cfg.schedules) ? cfg.schedules : [])
    setLatePenalties(Array.isArray(cfg.latePenalties) ? cfg.latePenalties : [])
    setShowModal(true)
  }

  // Save Config
  const handleSave = async (e) => {
    e.preventDefault()
    if (!locationCode || !locationName) {
      alert('Kode lokasi dan nama lokasi wajib diisi')
      return
    }

    try {
      setSaving(true)
      const payload = {
        locationCode,
        locationName,
        workDays,
        gracePeriodMinutes: Number(gracePeriodMinutes),
        schedules,
        latePenalties,
        rewardAmount: Number(rewardAmount),
        rewardCriteria,
        active,
      }

      const url = editingId
        ? `/api/settings/work-location/${editingId}`
        : '/api/settings/work-location'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        setShowModal(false)
        fetchConfigs()
      } else {
        alert(data.error || 'Gagal menyimpan konfigurasi')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan jaringan')
    } finally {
      setSaving(false)
    }
  }

  // Delete Config
  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus konfigurasi aturan untuk lokasi "${name}"?`)) return
    try {
      const res = await fetch(`/api/settings/work-location/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchConfigs()
      } else {
        alert(data.error || 'Gagal menghapus')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Dynamic Schedule Helpers
  const addScheduleRow = () => {
    setSchedules([
      ...schedules,
      { day: 'Sabtu', startTime: '09:00', endTime: '15:00', breakMinutes: 60, isOff: false },
    ])
  }

  const updateScheduleRow = (idx, field, val) => {
    const updated = [...schedules]
    updated[idx] = { ...updated[idx], [field]: val }
    setSchedules(updated)
  }

  const removeScheduleRow = (idx) => {
    setSchedules(schedules.filter((_, i) => i !== idx))
  }

  // Dynamic Penalty Helpers
  const addPenaltyRow = () => {
    const last = latePenalties[latePenalties.length - 1]
    const nextMin = last ? Number(last.max) + 1 : 1
    const nextMax = nextMin + 15
    setLatePenalties([
      ...latePenalties,
      { min: nextMin, max: nextMax, amount: 25000, deductionType: 'fixed', salaryFraction: 0, label: `${nextMin} - ${nextMax} Menit : 25.000` },
    ])
  }

  const updatePenaltyRow = (idx, field, val) => {
    const updated = [...latePenalties]
    updated[idx] = { ...updated[idx], [field]: val }
    if (field === 'deductionType' && val === 'half_day_salary') {
      updated[idx].amount = 0
      updated[idx].salaryFraction = 0.5
      updated[idx].label = `> ${updated[idx].min - 1 || 20} Menit : Gaji Setengah Hari`
    }
    setLatePenalties(updated)
  }

  const removePenaltyRow = (idx) => {
    setLatePenalties(latePenalties.filter((_, i) => i !== idx))
  }

  const getLocationIcon = (code) => {
    const c = code.toLowerCase()
    if (c.includes('gudang') || c.includes('warehouse')) return <Warehouse className='w-5 h-5 text-amber-600' />
    if (c.includes('sales')) return <Briefcase className='w-5 h-5 text-blue-600' />
    if (c.includes('live')) return <Video className='w-5 h-5 text-rose-600' />
    return <Building2 className='w-5 h-5 text-teal-600' />
  }

  const getLocationAliasBadge = (code) => {
    const c = code.toLowerCase()
    if (c === 'sales') return <span className='text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200'>Data Karyawan: Others</span>
    if (c === 'livestream') return <span className='text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-200'>Data Karyawan: Manhattan</span>
    if (c === 'ho') return <span className='text-[10px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded border border-teal-200'>Data Karyawan: Head Office</span>
    if (c === 'gudang') return <span className='text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200'>Data Karyawan: Gudang</span>
    return null
  }

  return (
    <div className='space-y-6 pb-12'>
      {/* Page Header */}
      <PageHeader
        icon='🏢'
        title='Konfigurasi Jam Kerja, Denda & Reward Kehadiran (Parameterize)'
        subtitle='Aturan kerja 100% parameter-driven untuk HO, Area Sales (Others), Gudang, dan Livestream (Manhattan).'
        actions={
          <button
            onClick={handleOpenCreate}
            className='inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition'
          >
            <Plus className='w-4 h-4' />
            Tambah Lokasi / Bagian
          </button>
        }
      />

      {/* Top StatCards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <StatCard
          icon='📍'
          label='Total Bagian / Lokasi'
          value={`${configs.length} Bagian`}
          hint='HO, Area Sales, Gudang, Livestream'
          tone='brand'
        />
        <StatCard
          icon='⏱️'
          label='Toleransi Keterlambatan'
          value='0 Menit'
          hint='Dihitung mulai menit ke-1'
          tone='red'
        />
        <StatCard
          icon='🏆'
          label='Reward Kehadiran'
          value='Rp 200.000 / bln'
          hint='Full attendance (HO, Sales, Gudang)'
          tone='green'
        />
        <StatCard
          icon='⚡'
          label='Sistem Kalkulasi'
          value='Parameter-Driven'
          hint='Zero Hardcode ke Presensi & Payroll'
          tone='blue'
        />
      </div>

      {/* Grid of Location Cards */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {loading ? (
          <div className='col-span-2 py-12 text-center text-sm text-gray-500'>
            Memuat konfigurasi lokasi...
          </div>
        ) : configs.length === 0 ? (
          <div className='col-span-2 py-12 text-center text-sm text-gray-500'>
            Belum ada konfigurasi lokasi kerja.
          </div>
        ) : (
          configs.map((cfg) => {
            const scheds = Array.isArray(cfg.schedules) ? cfg.schedules : []
            const penalties = Array.isArray(cfg.latePenalties) ? cfg.latePenalties : []

            return (
              <div
                key={cfg.id}
                className='flex flex-col justify-between rounded-3xl border border-gray-200/90 bg-white p-6 shadow-sm hover:shadow-md transition'
              >
                <div className='space-y-4'>
                  {/* Card Top */}
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 border border-gray-200/80 shadow-xs'>
                        {getLocationIcon(cfg.locationCode)}
                      </div>
                      <div>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <h3 className='text-base font-bold text-gray-900'>{cfg.locationName}</h3>
                          <span className='rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-600 uppercase'>
                            {cfg.locationCode}
                          </span>
                          {getLocationAliasBadge(cfg.locationCode)}
                        </div>
                        <p className='text-xs text-gray-500 mt-0.5 font-medium'>{cfg.workDays}</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          cfg.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cfg.active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </div>
                  </div>

                  {/* Toleransi & Jam Kerja */}
                  <div className='rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-2 text-xs'>
                    <div className='flex items-center justify-between text-gray-700'>
                      <span className='font-semibold flex items-center gap-1.5'>
                        <Clock className='w-3.5 h-3.5 text-teal-600' />
                        Jadwal Jam Kerja Terparameterisasi:
                      </span>
                      <span className='font-bold text-red-600'>
                        Toleransi: {cfg.gracePeriodMinutes || 0} Menit
                      </span>
                    </div>

                    <div className='space-y-1.5 pt-1'>
                      {scheds.map((s, idx) => (
                        <div
                          key={idx}
                          className='flex items-center justify-between font-mono text-gray-800 bg-white px-3 py-1.5 rounded-lg border border-gray-200/60'
                        >
                          <span className='font-sans font-semibold text-gray-700'>{s.day || s.dayLabel}</span>
                          {s.isOff ? (
                            <span className='font-sans font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded'>Libur / Off</span>
                          ) : s.scheduleType === 'flexible_duration' ? (
                            <span className='font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded'>{s.note || `${s.durationHours || 4} Jam Live (dalam 24 Jam)`}</span>
                          ) : (
                            <span className='font-bold text-teal-800'>
                              {s.startTime} - {s.endTime}
                              {s.breakMinutes ? ` (Istirahat ${s.breakMinutes}m)` : ''}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tiering Denda Keterlambatan */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-xs font-semibold text-gray-700'>
                      <span className='flex items-center gap-1.5 text-rose-700'>
                        <ShieldAlert className='w-3.5 h-3.5' />
                        Aturan Denda Keterlambatan Bertingkat:
                      </span>
                      <span className='text-[11px] text-gray-500 font-normal'>Dipotong Otomatis</span>
                    </div>

                    <div className='flex flex-wrap gap-1.5'>
                      {penalties.map((p, idx) => {
                        const isHalfDay = p.deductionType === 'half_day_salary'
                        let tone = isHalfDay ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold' : 'bg-amber-50 text-amber-800 border-amber-200'

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${tone}`}
                          >
                            <span>{p.label || `${p.min}-${p.max} mnt`}: </span>
                            {isHalfDay ? (
                              <span className='ml-1 text-rose-700 underline decoration-rose-400'>Gaji Setengah Hari</span>
                            ) : (
                              <strong className='font-bold ml-1'>Rp {Number(p.amount).toLocaleString('id-ID')}</strong>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Reward Kehadiran */}
                  {cfg.rewardAmount > 0 ? (
                    <div className='rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-xs'>
                      <div className='flex items-center justify-between text-emerald-900 font-bold'>
                        <span className='flex items-center gap-1.5'>
                          <Award className='w-4 h-4 text-emerald-600' />
                          Reward Kehadiran Penuh:
                        </span>
                        <span className='text-sm font-black text-emerald-700'>
                          Rp {cfg.rewardAmount.toLocaleString('id-ID')} / bln
                        </span>
                      </div>
                      {cfg.rewardCriteria && (
                        <p className='mt-1.5 text-[11px] text-emerald-800 leading-relaxed bg-white/60 p-2 rounded-lg border border-emerald-100'>
                          <strong>Catatan Syarat:</strong> {cfg.rewardCriteria}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className='rounded-2xl border border-gray-200/60 bg-gray-50 p-2.5 text-xs text-gray-500 flex items-center justify-between'>
                      <span>Reward Kehadiran:</span>
                      <span className='font-semibold text-gray-400'>Tidak ada</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className='flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-5'>
                  <button
                    onClick={() => handleOpenEdit(cfg)}
                    className='inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-300 transition'
                  >
                    <Edit2 className='w-3.5 h-3.5 text-teal-600' />
                    Edit Parameter
                  </button>
                  <button
                    onClick={() => handleDelete(cfg.id, cfg.locationName)}
                    className='inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-xs hover:bg-rose-50 hover:border-rose-300 transition'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    Hapus
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal Dialog: Tambah / Edit Konfigurasi ── */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto'>
          <div className='w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-8'>
            <div className='flex items-center justify-between border-b border-gray-100 pb-4'>
              <div>
                <h3 className='text-lg font-bold text-gray-900'>
                  {editingId ? 'Edit Parameter Lokasi / Bagian' : 'Tambah Parameter Lokasi / Bagian'}
                </h3>
                <p className='text-xs text-gray-500'>
                  Konfigurasi jadwal kerja, denda bertingkat, dan reward kehadiran secara parameter-driven.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className='rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSave} className='mt-4 space-y-4 text-xs'>
              {/* Kode & Nama */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='font-semibold text-gray-700'>Kode Bagian (ID Unik):</label>
                  <input
                    type='text'
                    value={locationCode}
                    onChange={(e) => setLocationCode(e.target.value.toLowerCase().trim())}
                    placeholder='Contoh: ho, sales, gudang, livestream'
                    disabled={Boolean(editingId)}
                    required
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono text-sm'
                  />
                </div>
                <div>
                  <label className='font-semibold text-gray-700'>Nama Bagian / Tampilan:</label>
                  <input
                    type='text'
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder='Contoh: Head Office (HO)'
                    required
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm font-semibold'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='font-semibold text-gray-700'>Hari Kerja Ringkas:</label>
                  <input
                    type='text'
                    value={workDays}
                    onChange={(e) => setWorkDays(e.target.value)}
                    placeholder='Senin - Jumat / Senin - Sabtu'
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm'
                  />
                </div>
                <div>
                  <label className='font-semibold text-gray-700'>Toleransi Keterlambatan (Menit):</label>
                  <input
                    type='number'
                    value={gracePeriodMinutes}
                    onChange={(e) => setGracePeriodMinutes(e.target.value)}
                    placeholder='0'
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono text-sm font-bold text-red-600'
                  />
                  <span className='text-[10px] text-gray-400'>
                    Toleransi 0 menit = keterlambatan dihitung mulai menit ke-1.
                  </span>
                </div>
              </div>

              {/* Dynamic Schedules */}
              <div className='rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-gray-900 flex items-center gap-1.5'>
                    <Clock className='w-4 h-4 text-teal-600' />
                    Jadwal Jam Kerja (Senin–Jumat vs Sabtu vs Fleksibel):
                  </span>
                  <button
                    type='button'
                    onClick={addScheduleRow}
                    className='inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800'
                  >
                    <Plus className='w-3 h-3' />
                    Tambah Baris Jadwal
                  </button>
                </div>

                <div className='space-y-2'>
                  {schedules.map((row, idx) => (
                    <div key={idx} className='flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200'>
                      <input
                        type='text'
                        value={row.day}
                        onChange={(e) => updateScheduleRow(idx, 'day', e.target.value)}
                        placeholder='Hari (Senin-Jumat / Sabtu)'
                        className='w-1/3 rounded-lg border border-gray-300 p-1.5 text-xs font-semibold'
                      />
                      
                      <label className='flex items-center gap-1 text-[11px] font-semibold text-gray-600 whitespace-nowrap cursor-pointer'>
                        <input
                          type='checkbox'
                          checked={Boolean(row.isOff)}
                          onChange={(e) => updateScheduleRow(idx, 'isOff', e.target.checked)}
                          className='rounded text-rose-600'
                        />
                        Libur/Off
                      </label>

                      {!row.isOff && (
                        <>
                          <input
                            type='text'
                            value={row.startTime}
                            onChange={(e) => updateScheduleRow(idx, 'startTime', e.target.value)}
                            placeholder='09:00'
                            className='w-20 rounded-lg border border-gray-300 p-1.5 font-mono text-xs text-center font-bold'
                          />
                          <span className='text-gray-400'>s/d</span>
                          <input
                            type='text'
                            value={row.endTime}
                            onChange={(e) => updateScheduleRow(idx, 'endTime', e.target.value)}
                            placeholder='18:00'
                            className='w-20 rounded-lg border border-gray-300 p-1.5 font-mono text-xs text-center font-bold'
                          />
                        </>
                      )}

                      <button
                        type='button'
                        onClick={() => removeScheduleRow(idx)}
                        className='text-gray-400 hover:text-rose-600 p-1 ml-auto'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Tiering Late Penalties */}
              <div className='rounded-2xl border border-rose-100 bg-rose-50/30 p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-rose-900 flex items-center gap-1.5'>
                    <ShieldAlert className='w-4 h-4 text-rose-600' />
                    Tingkatan Denda Keterlambatan (Tiering Penalty):
                  </span>
                  <button
                    type='button'
                    onClick={addPenaltyRow}
                    className='inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800'
                  >
                    <Plus className='w-3 h-3' />
                    Tambah Tingkatan
                  </button>
                </div>

                <div className='space-y-2'>
                  {latePenalties.map((row, idx) => (
                    <div key={idx} className='flex items-center gap-2 bg-white p-2.5 rounded-xl border border-rose-200/80 flex-wrap sm:flex-nowrap'>
                      {/* Range Menit */}
                      <div className='flex items-center gap-1'>
                        <input
                          type='number'
                          value={row.min}
                          onChange={(e) => updatePenaltyRow(idx, 'min', e.target.value)}
                          className='w-14 rounded-lg border border-gray-300 p-1.5 font-mono text-xs text-center'
                        />
                        <span className='text-gray-400'>-</span>
                        <input
                          type='number'
                          value={row.max}
                          onChange={(e) => updatePenaltyRow(idx, 'max', e.target.value)}
                          className='w-14 rounded-lg border border-gray-300 p-1.5 font-mono text-xs text-center'
                        />
                        <span className='text-gray-500 text-[10px]'>mnt</span>
                      </div>

                      {/* Dropdown Tipe Denda */}
                      <select
                        value={row.deductionType || 'fixed'}
                        onChange={(e) => updatePenaltyRow(idx, 'deductionType', e.target.value)}
                        className='rounded-lg border border-gray-300 p-1.5 text-xs font-semibold bg-white'
                      >
                        <option value='fixed'>Nominal Tetap (Rp)</option>
                        <option value='half_day_salary'>Gaji Setengah Hari (0.5x)</option>
                      </select>

                      {/* Input Amount jika Fixed */}
                      {row.deductionType !== 'half_day_salary' ? (
                        <div className='flex items-center gap-1 w-28'>
                          <span className='text-gray-500 font-bold'>Rp</span>
                          <input
                            type='number'
                            value={row.amount}
                            onChange={(e) => updatePenaltyRow(idx, 'amount', e.target.value)}
                            className='w-full rounded-lg border border-gray-300 p-1.5 font-mono text-xs font-bold text-rose-700'
                          />
                        </div>
                      ) : (
                        <span className='text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200'>
                          Potong 0.5 Gaji Pokok
                        </span>
                      )}

                      <input
                        type='text'
                        value={row.label || ''}
                        onChange={(e) => updatePenaltyRow(idx, 'label', e.target.value)}
                        placeholder='Label tampilan'
                        className='flex-1 rounded-lg border border-gray-300 p-1.5 text-xs min-w-[120px]'
                      />

                      <button
                        type='button'
                        onClick={() => removePenaltyRow(idx)}
                        className='text-gray-400 hover:text-rose-600 p-1'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reward Kehadiran */}
              <div className='rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-3'>
                <span className='font-bold text-emerald-900 flex items-center gap-1.5'>
                  <Award className='w-4 h-4 text-emerald-600' />
                  Reward & Insentif Kehadiran Penuh:
                </span>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='font-semibold text-gray-700'>Nominal Reward (Rp):</label>
                    <input
                      type='number'
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className='mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono text-sm font-bold text-emerald-700'
                    />
                  </div>
                  <div>
                    <label className='font-semibold text-gray-700'>Catatan / Kriteria Penerimaan:</label>
                    <textarea
                      rows={2}
                      value={rewardCriteria}
                      onChange={(e) => setRewardCriteria(e.target.value)}
                      placeholder='Reward Kehadiran didapatkan jika...'
                      className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs leading-relaxed'
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className='flex items-center justify-end gap-2 border-t border-gray-100 pt-3'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                >
                  Batal
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50'
                >
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
