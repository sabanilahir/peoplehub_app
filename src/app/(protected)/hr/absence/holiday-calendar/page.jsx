'use client'
import { useState, useEffect, useMemo } from 'react'
import { useT } from '@/store/languageStore'
import {
  PageHeader,
  SectionCard,
  DataTable,
  Tr,
  Td,
  FilterBar,
  FilterPill,
  StatusBadge,
  ActionButton,
  EmptyState,
  FormField,
  Input,
  Select,
  StatCard,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { calculateWorkingDays } from '@/lib/workdayCalculator.js'

const BRAND = 'linear-gradient(135deg, #052B52, #039299)'
const BLANK = { name: '', date: '', type: 'National', recurring: false }

export default function HolidayCalendarPage() {
  const t = useT()

  // State Data
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [country, setCountry] = useState('ID')
  const [year, setYear] = useState(2026)
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'calculator'

  // Modal State
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  // Calculator State
  const [calcLocation, setCalcLocation] = useState('ho')
  const [calcStartDate, setCalcStartDate] = useState('2026-10-26')
  const [calcEndDate, setCalcEndDate] = useState('2026-11-25')
  const [showBreakdown, setShowBreakdown] = useState(false)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  // Fetch data dari API PostgreSQL
  const fetchHolidays = async (targetYear = year, targetCountry = country) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/holidays?year=${targetYear}&country=${targetCountry}`)
      const json = await res.json()
      if (json.success) {
        setHolidays(json.data || [])
      } else {
        flash(json.error || 'Gagal memuat hari libur.', 'error')
      }
    } catch (err) {
      console.error(err)
      flash('Gagal menghubungi server database.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolidays(year, country)
  }, [year, country])

  // Seed / Muat Libur Resmi SKB 3 Menteri
  const handleSeedHolidays = async () => {
    try {
      setSeeding(true)
      const res = await fetch('/api/holidays/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, country }),
      })
      const json = await res.json()
      if (json.success) {
        flash(json.message, 'success')
        fetchHolidays(year, country)
      } else {
        flash(json.error || 'Gagal memuat dataset hari libur.', 'error')
      }
    } catch (err) {
      flash('Terjadi kendala saat melakukan generate hari libur.', 'error')
    } finally {
      setSeeding(false)
    }
  }

  // Modal Handlers
  const openNew = () => {
    setEditingId(null)
    setForm({ ...BLANK, date: `${year}-01-01` })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(BLANK)
  }

  const handleEdit = (h) => {
    setEditingId(h.id)
    setForm({ name: h.name, date: h.date, type: h.type, recurring: h.recurring })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.date) {
      return flash('Nama dan tanggal hari libur wajib diisi.', 'error')
    }

    try {
      setSaving(true)
      if (editingId) {
        const res = await fetch('/api/holidays', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form, country }),
        })
        const json = await res.json()
        if (json.success) {
          flash('Hari libur berhasil diperbarui.')
          fetchHolidays(year, country)
          closeModal()
        } else {
          flash(json.error || 'Gagal menyimpan.', 'error')
        }
      } else {
        const res = await fetch('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, country }),
        })
        const json = await res.json()
        if (json.success) {
          flash('Hari libur berhasil ditambahkan.')
          fetchHolidays(year, country)
          closeModal()
        } else {
          flash(json.error || 'Gagal menyimpan.', 'error')
        }
      }
    } catch (err) {
      flash('Terjadi kesalahan saat menyimpan data.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus hari libur "${name}"?`)) return

    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        flash('Hari libur berhasil dihapus.')
        fetchHolidays(year, country)
      } else {
        flash(json.error || 'Gagal menghapus.', 'error')
      }
    } catch (err) {
      flash('Gagal menghapus hari libur.', 'error')
    }
  }

  // Perhitungan Hari Kerja Interaktif (Simulasi)
  const calcResult = useMemo(() => {
    try {
      if (!calcStartDate || !calcEndDate) return null
      return calculateWorkingDays({
        startDate: calcStartDate,
        endDate: calcEndDate,
        workLocationCode: calcLocation,
        holidays,
      })
    } catch (e) {
      return null
    }
  }, [calcStartDate, calcEndDate, calcLocation, holidays])

  // Preset Periode Kalkulator
  const applyPreset = (presetKey) => {
    if (presetKey === 'cutoff-current') {
      setCalcStartDate('2026-10-26')
      setCalcEndDate('2026-11-25')
    } else if (presetKey === 'month-nov') {
      setCalcStartDate('2026-11-01')
      setCalcEndDate('2026-11-30')
    } else if (presetKey === 'month-may') {
      setCalcStartDate('2026-05-01')
      setCalcEndDate('2026-05-31')
    } else if (presetKey === 'month-mar') {
      setCalcStartDate('2026-03-01')
      setCalcEndDate('2026-03-31')
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Toast Alert */}
      {msg && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
            msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-2 font-bold text-white/80 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        icon="🗓️"
        title="Kalender Hari Libur & Hari Kerja"
        subtitle="Kelola master hari libur nasional (SKB 3 Menteri) dan libur perusahaan, serta simulasi perhitungan hari kerja efektif bulanan."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedHolidays}
              disabled={seeding || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-50 cursor-pointer"
              title={`Isi otomatis daftar Hari Libur Nasional & Cuti Bersama SKB 3 Menteri tahun ${year}`}
            >
              <Icon e={seeding ? '⏳' : '⚡'} size={14} />
              <span>{seeding ? 'Memuat...' : `Muat Libur SKB 3 Menteri (${year})`}</span>
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap cursor-pointer"
              style={{ background: BRAND }}
            >
              <Icon e="➕" size={13} />
              <span>Tambah Hari Libur</span>
            </button>
          </div>
        }
      />

      {/* Tab Switcher & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🗓️</span>
            <span>Daftar Hari Libur ({holidays.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🧮</span>
            <span>Kalkulator Hari Kerja Efektif</span>
          </button>
        </div>

        {/* Year & Country Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="font-medium">Tahun:</span>
            {[2025, 2026, 2027].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  year === y ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={year === y ? { background: BRAND } : undefined}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500 border-l border-gray-200 pl-3">
            <span className="font-medium">Negara:</span>
            {['ID', 'SG'].map((c) => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  country === c ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= TAB 1: DAFTAR HARI LIBUR ================= */}
      {activeTab === 'list' && (
        <SectionCard
          title={`Master Hari Libur Nasional & Perusahaan — ${country} ${year}`}
          icon="🗓️"
          subtitle={`${holidays.length} hari libur terdaftar di database`}
          bodyClass="p-0"
        >
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-400">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat master hari libur dari database...
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                icon="🗓️"
                title={`Belum ada hari libur untuk ${country} ${year}`}
                description="Klik tombol 'Muat Libur SKB 3 Menteri' di atas untuk mengimpor otomatis seluruh libur nasional resmi RI, atau klik 'Tambah Hari Libur' untuk mengisi manual."
              />
              <button
                onClick={handleSeedHolidays}
                disabled={seeding}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition cursor-pointer"
                style={{ background: BRAND }}
              >
                <Icon e="⚡" size={14} />
                <span>Muat Otomatis Libur Nasional {year} Sekarang</span>
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                { label: 'Tanggal', width: '15%' },
                { label: 'Nama Hari Libur', width: '38%' },
                { label: 'Kategori / Tipe', width: '20%' },
                { label: 'Berulang Tahunan', align: 'center', width: '12%' },
                { label: 'Aksi', align: 'right', width: '15%' },
              ]}
              className="ring-0 shadow-none rounded-none"
            >
              {holidays.map((h) => {
                const d = new Date(h.date + 'T00:00:00')
                const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()]
                const isCutiBersama = h.type === 'Cuti Bersama'
                const isCompany = h.type === 'Company'

                return (
                  <Tr key={h.id}>
                    <Td className="text-gray-800 font-mono text-xs">
                      <div>
                        <strong className="text-gray-900">{h.date}</strong>
                        <p className="text-[10px] text-gray-400 font-sans">{dayName}</p>
                      </div>
                    </Td>
                    <Td className="font-semibold text-gray-900 text-xs">{h.name}</Td>
                    <Td>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isCutiBersama
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : isCompany
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {h.type}
                      </span>
                    </Td>
                    <Td align="center" className="text-gray-500 text-xs">
                      {h.recurring ? '✅ Ya' : '—'}
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1.5">
                        <ActionButton size="sm" variant="secondary" onClick={() => handleEdit(h)}>
                          Edit
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          variant="secondary"
                          className="!bg-red-50 !text-red-600 !border-red-100 hover:!bg-red-100"
                          onClick={() => handleDelete(h.id, h.name)}
                        >
                          Hapus
                        </ActionButton>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </DataTable>
          )}
        </SectionCard>
      )}

      {/* ================= TAB 2: KALKULATOR SIMULASI HARI KERJA ================= */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          {/* Card Parameter Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>🧮</span>
                  <span>Simulasi Perhitungan Hari Kerja Efektif Bulanan</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Menghitung hari kerja kalender dikurangi libur mingguan (weekend) dan hari libur nasional/cuti bersama.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-400 mr-1">Preset:</span>
                <button
                  onClick={() => applyPreset('cutoff-current')}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-teal-50 text-teal-800 hover:bg-teal-100 transition border border-teal-200 cursor-pointer"
                >
                  Cut-Off (26 Okt - 25 Nov)
                </button>
                <button
                  onClick={() => applyPreset('month-nov')}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  November 2026
                </button>
                <button
                  onClick={() => applyPreset('month-may')}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  Mei 2026 (Banyak Libur)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Skema Kerja Lokasi
                </label>
                <select
                  value={calcLocation}
                  onChange={(e) => setCalcLocation(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:bg-white focus:outline-teal-600 cursor-pointer font-medium"
                >
                  <option value="ho">Head Office (HO) — 5 Hari Kerja (Sabtu & Minggu Libur)</option>
                  <option value="gudang">Gudang — 6 Hari Kerja (Hanya Minggu Libur)</option>
                  <option value="sales">Area Sales — 6 Hari Kerja (Hanya Minggu Libur)</option>
                  <option value="livestream">Livestream — 6 Hari Kerja (Hanya Minggu Libur)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={calcStartDate}
                  onChange={(e) => setCalcStartDate(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-800 focus:bg-white focus:outline-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={calcEndDate}
                  onChange={(e) => setCalcEndDate(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-800 focus:bg-white focus:outline-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Stat Cards Hasil Perhitungan */}
          {calcResult && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard
                  title="Total Hari Kalender"
                  value={`${calcResult.totalCalendarDays} Hari`}
                  subtitle={`${calcResult.startDate} s/d ${calcResult.endDate}`}
                  icon="📅"
                  tone="brand"
                />
                <StatCard
                  title="Libur Mingguan (Weekend)"
                  value={`${calcResult.totalWeekendDays} Hari`}
                  subtitle={calcResult.isFiveDayWorkWeek ? 'Sabtu & Minggu Off' : 'Hanya Minggu Off'}
                  icon="🛋️"
                  tone="orange"
                />
                <StatCard
                  title="Libur Nasional / Cuti"
                  value={`${calcResult.totalHolidayDays} Hari`}
                  subtitle="Pada hari kerja reguler"
                  icon="🎉"
                  tone="purple"
                />
                <StatCard
                  title="Hari Kerja Efektif"
                  value={`${calcResult.workingDays} Hari`}
                  subtitle={`Standar kerja ${calcResult.isFiveDayWorkWeek ? '5 hari/mgg' : '6 hari/mgg'}`}
                  icon="💼"
                  tone="green"
                />
              </div>

              {/* Formula Callout Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-800/80 text-teal-200 uppercase">
                      Formula Hari Kerja
                    </span>
                    <span className="text-xs text-gray-300">
                      Kalender ({calcResult.totalCalendarDays}) - Weekend ({calcResult.totalWeekendDays}) - Libur Nasional ({calcResult.totalHolidayDays})
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-teal-300 mt-1">
                    = {calcResult.workingDays} Hari Kerja Efektif ({calcLocation.toUpperCase()})
                  </h4>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {calcResult.isFiveDayWorkWeek
                      ? 'Skema 5 hari kerja: Karyawan HO masuk Senin s/d Jumat (Sabtu dan Minggu off).'
                      : 'Skema 6 hari kerja: Karyawan Operasional masuk Senin s/d Sabtu (Hanya Minggu off).'}
                  </p>
                </div>

                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-teal-200 border border-teal-500/30 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <Icon e={showBreakdown ? '🔼' : '🔽'} size={12} />
                  <span>{showBreakdown ? 'Tutup Rincian Harian' : 'Lihat Rincian Harian'}</span>
                </button>
              </div>

              {/* Rincian Kalender Harian Breakdown */}
              {showBreakdown && (
                <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h5 className="text-xs font-bold text-gray-800">
                      Rincian Status Setiap Tanggal ({calcResult.datesList.length} Hari)
                    </h5>
                    <span className="text-[11px] text-gray-500">
                      Hijau = Hari Kerja | Abu-abu = Weekend | Ungu = Libur Nasional
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 uppercase sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold">Tanggal</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Hari</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {calcResult.datesList.map((d) => (
                          <tr
                            key={d.date}
                            className={
                              d.status === 'WORK_DAY'
                                ? 'hover:bg-emerald-50/40'
                                : d.status === 'HOLIDAY'
                                ? 'bg-purple-50/50 hover:bg-purple-50'
                                : 'bg-gray-50/50 hover:bg-gray-100/50'
                            }
                          >
                            <td className="px-4 py-2 font-mono font-semibold text-gray-800">{d.date}</td>
                            <td className="px-4 py-2 font-medium text-gray-700">{d.dayName}</td>
                            <td className="px-4 py-2">
                              {d.status === 'WORK_DAY' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                                  ✓ Hari Kerja
                                </span>
                              ) : d.status === 'HOLIDAY' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                                  🎉 Libur Nasional
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded">
                                  🛋️ Weekend Off
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {d.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah / Edit Hari Libur */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold">
                  {editingId ? 'Edit Hari Libur' : 'Tambah Hari Libur Baru'}
                </h3>
                <p className="text-[11px] text-gray-300">Tersimpan permanen di database master libur.</p>
              </div>
              <button onClick={closeModal} className="text-gray-300 hover:text-white text-xl font-bold leading-none cursor-pointer">
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <FormField label="Nama Hari Libur" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: HUT Kemerdekaan RI / Cuti Bersama"
                />
              </FormField>

              <FormField label="Tanggal" required>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </FormField>

              <FormField label="Kategori Libur">
                <Select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="National">Hari Libur Nasional (Resmi Pemerintah)</option>
                  <option value="Cuti Bersama">Cuti Bersama (SKB 3 Menteri)</option>
                  <option value="Company">Libur Khusus Perusahaan (Company Holiday)</option>
                </Select>
              </FormField>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-200 accent-teal-600"
                />
                <span>Berulang setiap tahun (misal: 1 Jan, 17 Agu, 25 Des)</span>
              </label>
            </div>

            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                style={{ background: BRAND }}
              >
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
