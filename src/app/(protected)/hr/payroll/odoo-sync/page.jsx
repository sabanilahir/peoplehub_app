'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { exportCsv } from '@/utils/exportCsv'
import { useT } from '@/store/languageStore'
import {
  PageHeader,
  StatCard,
  SectionCard,
  DataTable,
  Tr,
  Td,
  StatusBadge,
  ActionButton,
  EmptyState,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'

const LOCATION_BADGE_STYLE = {
  ho: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  gudang: 'bg-amber-50 text-amber-700 border-amber-200',
  sales: 'bg-teal-50 text-teal-700 border-teal-200',
  livestream: 'bg-purple-50 text-purple-700 border-purple-200',
}

function EmployeeAvatar({ name }) {
  const initials = (name || '?')
    .trim()
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 text-white font-bold text-xs"
      style={{
        background: 'linear-gradient(135deg, #052B52, #039299)',
      }}
    >
      {initials}
    </div>
  )
}

export default function OdooPayrollSyncPage() {
  const t = useT()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [range, setRange] = useState({ dateFrom: '', dateTo: '', label: '' })
  const [stats, setStats] = useState({
    totalEmployees: 0,
    withOdooCount: 0,
    withDraftInOdooCount: 0,
    withPenaltyCount: 0,
    withRewardCount: 0,
    totalPenaltySum: 0,
    totalRewardSum: 0,
  })

  // Mode: Update ke Draft yang sudah ada di Odoo (default: true)
  const [onlyDraftMode, setOnlyDraftMode] = useState(true)

  // Filter States
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterPenalty, setFilterPenalty] = useState('all') // all | penalty_only | reward_only | transport_only | kpi_only

  // Pagination States
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Sync Action States
  const [syncing, setSyncing] = useState(false)
  const [syncingRowId, setSyncingRowId] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)

  // Fetch Cut-off Preview
  const fetchPreview = async (dateFrom, dateTo) => {
    try {
      setLoading(true)
      let url = '/api/odoo/payroll/sync'
      if (dateFrom && dateTo) {
        url += `?dateFrom=${dateFrom}&dateTo=${dateTo}`
      }
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setData(json.data || [])
        setRange(json.range || {})
        setStats(json.stats || {})
      } else {
        setActionMsg({ type: 'error', text: json.error || 'Gagal memuat pratinjau cut-off.' })
      }
    } catch (err) {
      console.error(err)
      setActionMsg({ type: 'error', text: 'Terjadi kendala jaringan saat memuat data.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPreview()
  }, [])

  // Eksekusi Sinkronisasi ke Odoo
  const handleExecuteSync = async () => {
    if (!confirm(`Konfirmasi kirim data denda presensi, reward kehadiran, tunjangan transport, dan tunjangan KPI periode (${range.dateFrom} s/d ${range.dateTo}) ke Items Payroll Odoo untuk seluruh karyawan?`)) {
      return
    }

    try {
      setSyncing(true)
      setSyncResult(null)
      const res = await fetch('/api/odoo/payroll/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          dryRun: false,
          onlyUpdateExistingDraft: onlyDraftMode,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSyncResult(json)
        setActionMsg({
          type: json.successCount > 0 ? 'success' : 'info',
          text: `Hasil Sinkronisasi Odoo: ${json.successCount} berhasil diupdate, ${json.skippedCount || 0} dilewati (belum ada draft / terkunci), ${json.failedCount || 0} gagal.`,
        })
        fetchPreview(range.dateFrom, range.dateTo)
      } else {
        setActionMsg({ type: 'error', text: json.error || 'Gagal melakukan sinkronisasi ke Odoo.' })
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: 'Gagal menghubungi server Odoo.' })
    } finally {
      setSyncing(false)
    }
  }

  // Eksekusi Sinkronisasi untuk SATU Karyawan Tertentu
  const handleSyncSingle = async (empId, empName) => {
    try {
      setSyncingRowId(empId)
      const res = await fetch('/api/odoo/payroll/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          employeeIds: [empId],
          dryRun: false,
          onlyUpdateExistingDraft: onlyDraftMode,
        }),
      })
      const json = await res.json()
      if (json.success && json.results && json.results.length > 0) {
        const itemResult = json.results[0]
        if (itemResult.status === 'synced') {
          setActionMsg({
            type: 'success',
            text: `✅ ${empName}: ${itemResult.message}`,
          })
        } else if (itemResult.status === 'pending_draft') {
          setActionMsg({
            type: 'info',
            text: `ℹ️ ${empName}: ${itemResult.message}`,
          })
        } else if (itemResult.status === 'locked') {
          setActionMsg({
            type: 'warning',
            text: `🔒 ${empName}: ${itemResult.message}`,
          })
        } else {
          setActionMsg({
            type: 'error',
            text: `⚠️ ${empName}: ${itemResult.message}`,
          })
        }
        fetchPreview(range.dateFrom, range.dateTo)
      } else {
        setActionMsg({
          type: 'error',
          text: json.error || `Gagal menyinkronkan slip gaji ${empName} ke Odoo.`,
        })
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: `Gagal menghubungi server Odoo: ${err.message}` })
    } finally {
      setSyncingRowId(null)
    }
  }

  // Filter List
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (filterDept !== 'all' && row.dept !== filterDept) return false
      if (filterPenalty === 'penalty_only' && row.totalPenalty <= 0) return false
      if (filterPenalty === 'reward_only' && row.rewardAmount <= 0) return false
      if (filterPenalty === 'transport_only' && (!row.enableTransport || (row.transportAllowance || 0) <= 0)) return false
      if (filterPenalty === 'kpi_only' && (!row.enableKpi || (row.kpiAllowance || 0) <= 0)) return false
      if (search) {
        const q = search.toLowerCase()
        const matchName = row.name?.toLowerCase().includes(q)
        const matchNik = row.nik?.toLowerCase().includes(q)
        if (!matchName && !matchNik) return false
      }
      return true
    })
  }, [data, filterDept, filterPenalty, search])

  // Reset page ke 1 setiap kali filter atau pageSize berubah
  useEffect(() => {
    setPage(1)
  }, [filterDept, filterPenalty, search, pageSize])

  // Perhitungan Pagination
  const totalItems = filteredData.length
  const actualPageSize = pageSize === 'all' ? (totalItems || 1) : Number(pageSize) || 15
  const pageCount = Math.max(1, Math.ceil(totalItems / actualPageSize))
  const startIndex = (page - 1) * actualPageSize
  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return filteredData
    return filteredData.slice(startIndex, startIndex + actualPageSize)
  }, [filteredData, pageSize, startIndex, actualPageSize])

  // Unique Depts
  const deptList = useMemo(() => {
    const set = new Set()
    data.forEach((d) => {
      if (d.dept) set.add(d.dept)
    })
    return Array.from(set).sort()
  }, [data])

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'NIK',
      'Nama Karyawan',
      'Odoo ID',
      'Departemen',
      'Lokasi',
      'Gaji Pokok / Wage Odoo (75%)',
      'Tunjangan Transport (15%)',
      'Status Transport',
      'Tunjangan KPI (10%)',
      'Status KPI',
      'Gross Salary',
      'Hari Hadir',
      'Hari Telat',
      'Total Menit Telat',
      'Potong Setengah Hari (Hari)',
      'Total Denda Presensi (Rp)',
      'Reward Kehadiran (Rp)',
      'Kriteria Reward',
    ]

    const rows = filteredData.map((r) => [
      r.nik,
      r.name,
      r.odoo_id || '-',
      r.dept,
      r.location,
      r.basicSalary || 0,
      r.transportAllowance || 0,
      r.enableTransport ? 'Aktif' : 'Tidak Dapat',
      r.kpiAllowance || 0,
      r.enableKpi ? 'Aktif' : 'Tidak Dapat',
      r.grossSalary || 0,
      r.presentDays,
      r.lateDays,
      r.lateMinutes,
      r.halfDayCutCount,
      r.totalPenalty,
      r.rewardAmount,
      r.isEligibleReward ? 'Eligible' : 'Not Eligible',
    ])

    const filename = `Rekap_Payroll_Cutoff_Odoo_${range.dateFrom}_to_${range.dateTo}`
    exportCsv(filename, headers, rows)
  }

  return (
    <div className="pb-12">
      {/* Back Link */}
      <div className="mb-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-700 transition font-medium"
        >
          <span>← Kembali ke Dashboard</span>
        </Link>
      </div>

      <PageHeader
        icon="💼"
        title="Integrasi Odoo Payroll (Cut-Off 26 - 25)"
        subtitle="Otomatisasi pengiriman denda keterlambatan presensi dan reward kehadiran ke Items Payroll Odoo (hr.payslip.input)."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              <Icon e="📥" size={14} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => fetchPreview(range.dateFrom, range.dateTo)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              <Icon e="🔄" size={14} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExecuteSync}
              disabled={syncing || loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
            >
              <Icon e="🚀" size={14} />
              <span>{syncing ? 'Mengirim ke Odoo...' : 'Kirim ke Items Payroll Odoo'}</span>
            </button>
          </div>
        }
      />

      {/* Alert Notification */}
      {actionMsg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-xs font-medium flex items-center justify-between shadow-xs ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Periode Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-teal-800/80 text-teal-200 font-medium font-mono">
              Siklus Cut-Off
            </span>
            <span className="text-xs text-gray-300">Eksekusi Rutin: Tanggal 25 Pukul 23:00 WIB</span>
          </div>
          <h2 className="text-lg font-bold mt-1 text-white">{range.label || 'Memuat periode cut-off...'}</h2>
          <p className="text-xs text-gray-300 mt-0.5">
            Rentang Tanggal: <span className="font-mono font-semibold text-teal-300">{range.dateFrom}</span> s/d{' '}
            <span className="font-mono font-semibold text-teal-300">{range.dateTo}</span>
          </p>
        </div>

        {/* Custom Period Input */}
        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/10">
          <div>
            <label className="block text-[10px] text-gray-300">Dari (26)</label>
            <input
              type="date"
              value={range.dateFrom}
              onChange={(e) => setRange({ ...range, dateFrom: e.target.value })}
              className="text-xs bg-white text-gray-900 rounded px-2 py-1 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-300">Sampai (25)</label>
            <input
              type="date"
              value={range.dateTo}
              onChange={(e) => setRange({ ...range, dateTo: e.target.value })}
              className="text-xs bg-white text-gray-900 rounded px-2 py-1 font-mono"
            />
          </div>
          <button
            onClick={() => fetchPreview(range.dateFrom, range.dateTo)}
            className="self-end px-3 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded transition"
          >
            Terapkan
          </button>
        </div>
      </div>

      {/* Stat Cards - Ringkasan Operasional Sinkronisasi Odoo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          title="Total Karyawan"
          value={`${stats.totalEmployees || 0} Orang`}
          subtitle={`${stats.withOdooCount || 0} Terhubung Odoo`}
          icon="👥"
          tone="brand"
        />
        <StatCard
          title="Draft Slip di Odoo"
          value={`${stats.withDraftInOdooCount || 0} Siap Update`}
          subtitle="Status: Draft di Odoo"
          icon="📋"
          tone="green"
        />
        <StatCard
          title="Karyawan Kena Denda"
          value={`${stats.withPenaltyCount || 0} Orang`}
          subtitle="Keterlambatan cut-off"
          icon="⏰"
          tone="orange"
        />
        <StatCard
          title="Total Denda Presensi"
          value={`Rp ${(stats.totalPenaltySum || 0).toLocaleString('id-ID')}`}
          subtitle="Item Odoo: Late"
          icon="💰"
          tone="red"
        />
        <StatCard
          title="Reward Kehadiran"
          value={`Rp ${(stats.totalRewardSum || 0).toLocaleString('id-ID')}`}
          subtitle={`${stats.withRewardCount || 0} Orang (Item: Reward)`}
          icon="🎁"
          tone="purple"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Departemen */}
          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:bg-white focus:outline-teal-600"
            >
              <option value="all">Semua Departemen</option>
              {deptList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori Denda / Reward / Komponen */}
          <div>
            <select
              value={filterPenalty}
              onChange={(e) => setFilterPenalty(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:bg-white focus:outline-teal-600"
            >
              <option value="all">Semua Karyawan</option>
              <option value="penalty_only">Hanya yang Kena Denda</option>
              <option value="reward_only">Hanya Penerima Reward</option>
              <option value="transport_only">Hanya Penerima Transport</option>
              <option value="kpi_only">Hanya Penerima KPI</option>
            </select>
          </div>

          {/* Mode Switch: Hanya Update ke Draft Odoo */}
          <label className="flex items-center gap-2 cursor-pointer bg-emerald-50/80 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold select-none">
            <input
              type="checkbox"
              checked={onlyDraftMode}
              onChange={(e) => setOnlyDraftMode(e.target.checked)}
              className="accent-emerald-600 rounded cursor-pointer"
            />
            <span>Hanya update ke Draft Slip Gaji yang ada di Odoo</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari NIK atau Nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-teal-600 transition"
          />
          <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Menghitung akumulasi presensi cut-off 26 - 25...
          </div>
        ) : filteredData.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Karyawan"
            description="Tidak ditemukan data presensi karyawan pada kriteria filter yang dipilih."
          />
        ) : (
          <div>
            <DataTable
              columns={[
                'Karyawan & Odoo ID',
                'Dept & Lokasi',
                'Gaji Pokok (75%)',
                'Tunjangan (Transport & KPI)',
                'Gross Salary',
                'Presensi Cut-off',
                'Denda & Reward',
                'Draft Odoo & Sync',
              ]}
            >
              {paginatedData.map((r) => {
                const badgeStyle = LOCATION_BADGE_STYLE[r.locationCode] || 'bg-gray-100 text-gray-600'
                const hasPenalty = r.totalPenalty > 0
                const hasReward = r.rewardAmount > 0
                const hasTransport = r.enableTransport && (r.transportAllowance || 0) > 0
                const hasKpi = r.enableKpi && (r.kpiAllowance || 0) > 0
                const hasItemsToSync = hasPenalty || hasReward || hasTransport || hasKpi

                return (
                  <Tr key={r.empId}>
                    {/* Karyawan & Odoo ID */}
                    <Td>
                      <div className="flex items-center gap-2">
                        <EmployeeAvatar name={r.name} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[170px]" title={r.name}>
                            {r.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-mono">{r.nik}</span>
                            {r.odoo_id ? (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                #{r.odoo_id}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono px-1 rounded bg-gray-100 text-gray-400">
                                No ID
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Td>

                    {/* Dept & Lokasi */}
                    <Td>
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs text-gray-800 font-medium leading-tight">{r.dept}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeStyle}`}>
                          {r.location}
                        </span>
                      </div>
                    </Td>

                    {/* Gaji Pokok (75%) */}
                    <Td>
                      <span className="text-xs font-semibold text-slate-800 font-mono">
                        Rp {(r.basicSalary || 0).toLocaleString('id-ID')}
                      </span>
                    </Td>

                    {/* Tunjangan (Transport & KPI) */}
                    <Td>
                      <div className="flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-gray-500 font-sans text-[10px]">🚗</span>
                          {hasTransport ? (
                            <span className="font-semibold text-emerald-700">
                              Rp {r.transportAllowance.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Tidak Dapat</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-gray-500 font-sans text-[10px]">🎯</span>
                          {hasKpi ? (
                            <span className="font-semibold text-blue-700">
                              Rp {r.kpiAllowance.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Tidak Dapat</span>
                          )}
                        </div>
                      </div>
                    </Td>

                    {/* Gross Salary */}
                    <Td>
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        Rp {(r.grossSalary || 0).toLocaleString('id-ID')}
                      </span>
                    </Td>

                    {/* Presensi Cut-off */}
                    <Td>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-700">{r.presentDays} hr hadir</span>
                          {r.lateDays > 0 ? (
                            <span className="font-semibold text-amber-700">
                              {r.lateDays} hr ({r.lateMinutes}m)
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px]">0 telat</span>
                          )}
                        </div>
                        {r.halfDayCutCount > 0 && (
                          <div className="mt-0.5">
                            <span className="inline-block text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                              {r.halfDayCutCount}x Potong 0.5 Hari
                            </span>
                          </div>
                        )}
                      </div>
                    </Td>

                    {/* Denda & Reward */}
                    <Td>
                      <div className="flex flex-col gap-1">
                        <div>
                          {hasPenalty ? (
                            <span className="text-xs font-bold text-rose-600 font-mono">
                              -Rp {r.totalPenalty.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 font-mono">Rp 0</span>
                          )}
                        </div>
                        {hasReward && (
                          <div>
                            <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono">
                              +Rp {r.rewardAmount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                    </Td>

                    {/* Draft Odoo & Aksi Sync */}
                    <Td>
                      <div className="flex flex-col gap-1.5 items-start">
                        {r.odooDraft ? (
                          r.odooDraft.state === 'draft' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Draft #{r.odooDraft.id}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              🔒 {r.odooDraft.state} (#{r.odooDraft.id})
                            </span>
                          )
                        ) : r.odoo_id ? (
                          <span className="text-[10px] text-gray-400 italic bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            Belum Ada Draft
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}

                        {r.odoo_id ? (
                          <button
                            onClick={() => handleSyncSingle(r.empId, r.name)}
                            disabled={syncingRowId === r.empId || syncing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md text-white shadow-xs transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                            style={{
                              background: r.odooDraft?.state === 'draft'
                                ? 'linear-gradient(135deg, #052B52, #039299)'
                                : '#64748b',
                            }}
                            title={
                              r.odooDraft?.state === 'draft'
                                ? `Update denda/reward/tunjangan ke Draft Slip #${r.odooDraft.id} di Odoo`
                                : `Cek dan sync ke Odoo untuk ${r.name}`
                            }
                          >
                            <Icon e={syncingRowId === r.empId ? '⏳' : r.odooDraft?.state === 'draft' ? '🚀' : '🔄'} size={11} />
                            <span>
                              {syncingRowId === r.empId
                                ? 'Proses...'
                                : r.odooDraft?.state === 'draft'
                                ? `Update Draft #${r.odooDraft.id}`
                                : 'Sync Odoo'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No Odoo ID</span>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </DataTable>

            {/* Pagination Controls Footer */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gray-50/70 border-t border-gray-100 text-xs text-gray-600">
                {/* Rows per page selector and range counter */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value === 'all' ? 'all' : Number(e.target.value)
                      setPageSize(val)
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 focus:outline-teal-600 cursor-pointer"
                  >
                    {[10, 15, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value="all">Semua ({totalItems})</option>
                  </select>
                  <span className="text-gray-500 ml-1">
                    Menampilkan{' '}
                    <strong className="text-gray-800">
                      {totalItems === 0
                        ? 0
                        : `${(startIndex + 1).toLocaleString('id-ID')}–${Math.min(startIndex + actualPageSize, totalItems).toLocaleString('id-ID')}`}
                    </strong>{' '}
                    dari <strong className="text-gray-800">{totalItems.toLocaleString('id-ID')}</strong> karyawan
                  </span>
                </div>

                {/* Page navigation buttons */}
                {pageSize !== 'all' && pageCount > 1 && (
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="px-2 py-1 text-xs font-semibold text-gray-600 rounded hover:bg-gray-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      title="Halaman Pertama"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-600 rounded hover:bg-gray-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      ‹ Prev
                    </button>

                    {/* Page number buttons */}
                    <div className="flex items-center gap-1 mx-1">
                      {Array.from({ length: pageCount }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) {
                            acc.push('...')
                          }
                          acc.push(p)
                          return acc
                        }, [])
                        .map((item, idx) =>
                          item === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 select-none">
                              …
                            </span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setPage(item)}
                              className={`w-7 h-7 flex items-center justify-center rounded text-xs font-semibold transition cursor-pointer ${
                                page === item
                                  ? 'text-white shadow-xs'
                                  : 'text-gray-700 hover:bg-gray-200/70'
                              }`}
                              style={
                                page === item
                                  ? { background: 'linear-gradient(135deg, #052B52, #039299)' }
                                  : undefined
                              }
                            >
                              {item}
                            </button>
                          )
                        )}
                    </div>

                    <button
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={page >= pageCount}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-600 rounded hover:bg-gray-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setPage(pageCount)}
                      disabled={page >= pageCount}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-600 rounded hover:bg-gray-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      title="Halaman Terakhir"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync Result Details Modal */}
      {syncResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-950 text-white">
              <div>
                <h3 className="text-sm font-bold">Hasil Sinkronisasi Odoo Payroll</h3>
                <p className="text-[11px] text-teal-300">
                  Batch: {syncResult.runName} (ID: #{syncResult.runId})
                </p>
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className="text-gray-300 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-[10px] text-gray-500">Total Karyawan</p>
                  <p className="text-base font-bold text-gray-900">{syncResult.totalSyncable}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-semibold">Sukses Input</p>
                  <p className="text-base font-bold text-emerald-700">{syncResult.successCount}</p>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                  <p className="text-[10px] text-rose-600 font-semibold">Gagal</p>
                  <p className="text-base font-bold text-rose-700">{syncResult.failedCount}</p>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                <h4 className="text-xs font-bold text-gray-700">Rincian Per Karyawan:</h4>
                {syncResult.results?.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                      res.status === 'synced'
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-gray-900">{res.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono ml-1.5">
                        (Odoo #{res.odoo_id})
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">{res.message}</p>
                    </div>
                    {res.status === 'synced' ? (
                      <span className="text-emerald-600 font-bold text-xs">✓ Synced</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-xs">✗ Error</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSyncResult(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

