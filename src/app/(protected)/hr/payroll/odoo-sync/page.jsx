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
  const [filterPenalty, setFilterPenalty] = useState('all') // all | overtime_only | leave_ded_only | penalty_only | reward_only | transport_only | npa_only | prorate_only | draft_ready

  // Pagination States
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Sync Action States
  const [syncing, setSyncing] = useState(false)
  const [syncingRowId, setSyncingRowId] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [pendingOtCount, setPendingOtCount] = useState(0)

  // Cek pengajuan lembur yang masih Pending dalam periode ini
  useEffect(() => {
    if (range.dateFrom && range.dateTo) {
      fetch(`/api/overtime?startDate=${range.dateFrom}&endDate=${range.dateTo}&status=Pending`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setPendingOtCount(res.data.length)
          }
        })
        .catch(() => {})
    }
  }, [range.dateFrom, range.dateTo])

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
      if (filterPenalty === 'overtime_only' && (row.overtimeAmount || 0) <= 0) return false
      if (filterPenalty === 'leave_ded_only' && (row.totalLeaveDeductions || 0) <= 0) return false
      if (filterPenalty === 'penalty_only' && row.totalPenalty <= 0) return false
      if (filterPenalty === 'reward_only' && row.rewardAmount <= 0) return false
      if (filterPenalty === 'transport_only' && (!row.enableTransport || (row.transportAllowance || 0) <= 0)) return false
      const npAllowed = (row.enableNonPermanent ?? row.enableKpi) && (row.nonPermanentAllowance || row.kpiAllowance || 0) > 0
      if (filterPenalty === 'npa_only' && !npAllowed) return false
      if (filterPenalty === 'kpi_only' && !npAllowed) return false
      if (filterPenalty === 'prorate_only' && !row.isProrated) return false
      if (filterPenalty === 'draft_ready' && row.odooDraft?.state !== 'draft') return false
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
      'Non Permanent Allowance NPA (10%)',
      'Status NPA',
      'Gross Salary',
      'Jam Lembur',
      'Uang Lembur (+)',
      'Potong 1/2 Hari (Hari)',
      'Potongan 1/2 Hari (-)',
      'Cuti Sakit (Hari)',
      'Potongan Cuti Sakit (-)',
      'Unpaid Leave (Hari)',
      'Potongan Unpaid (-)',
      'Total Potongan Cuti/Absen (-)',
      'Hari Hadir',
      'Hari Telat',
      'Total Menit Telat',
      'Total Denda Telat (-)',
      'Reward Kehadiran (+)',
      'Status Prorata',
      'Gaji Prorata Dasar',
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
      r.nonPermanentAllowance ?? r.kpiAllowance ?? 0,
      (r.enableNonPermanent ?? r.enableKpi) ? 'Aktif' : 'Tidak Dapat',
      r.grossSalary || 0,
      r.overtimeHours || 0,
      r.overtimeAmount || 0,
      r.halfDayCount || 0,
      r.halfDayDeduction || 0,
      r.sickDays || 0,
      r.sickLeaveDeduction || 0,
      r.unpaidDays || 0,
      r.unpaidLeaveDeduction || 0,
      r.totalLeaveDeductions || 0,
      r.presentDays || 0,
      r.lateDays || 0,
      r.lateMinutes || 0,
      r.totalPenalty || 0,
      r.rewardAmount || 0,
      r.isProrated ? r.prorateReason : 'Penuh',
      r.proratedBaseGross || r.grossSalary || 0,
    ])

    const filename = `Rekap_Payroll_Lengkap_Odoo_${range.dateFrom}_to_${range.dateTo}`
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
            <Link
              href="/hr/payroll/ho-calculator"
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
            >
              <Icon e="🏢" size={14} />
              <span>Kalkulator Payroll HO</span>
            </Link>
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

      {/* Warning Banner: Pending Overtime Pre-check */}
      {pendingOtCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 shadow-xs mb-6">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold text-sm">
              ⚠️
            </div>
            <div>
              <p className="font-bold text-sm text-amber-900">
                Peringatan: Terdapat {pendingOtCount} Pengajuan Lembur Berstatus Pending
              </p>
              <p className="text-amber-700 mt-0.5">
                Hanya lembur yang sudah <strong>Approved</strong> yang akan disinkronkan ke Odoo. Pastikan atasan atau HR telah menyetujui pengajuan lembur tim sebelum melakukan sinkronisasi payroll.
              </p>
            </div>
          </div>
          <Link
            href="/hr/payroll/ho-calculator"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex-shrink-0 text-center shadow-xs"
          >
            Review di HO Calculator →
          </Link>
        </div>
      )}

      {/* Stat Cards - Ringkasan Operasional Sinkronisasi Odoo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
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
          title="Total Lembur (+)"
          value={`Rp ${(stats.totalOvertimeSum || 0).toLocaleString('id-ID')}`}
          subtitle={`${stats.withOvertimeCount || 0} Org (${stats.totalOvertimeHoursSum || 0} Jam)`}
          icon="⚡"
          tone="teal"
        />
        <StatCard
          title="Potongan Cuti/Absen (-)"
          value={`Rp ${(stats.totalLeaveDeductionSum || 0).toLocaleString('id-ID')}`}
          subtitle={`${stats.withLeaveDeductionCount || 0} Org · 1/2 Hari, Sakit, Unpaid`}
          icon="✂️"
          tone="red"
        />
        <StatCard
          title="Denda & Reward"
          value={`-Rp ${(stats.totalPenaltySum || 0).toLocaleString('id-ID')}`}
          subtitle={`+Rp ${(stats.totalRewardSum || 0).toLocaleString('id-ID')} (${stats.withRewardCount || 0} Org)`}
          icon="⚖️"
          tone="orange"
        />
        <StatCard
          title="Non Permanent (NPA)"
          value={`Rp ${(stats.totalNonPermanentSum || stats.totalKpiSum || 0).toLocaleString('id-ID')}`}
          subtitle={`${stats.withNonPermanentCount || stats.withKpiCount || 0} Org (10%) · Item: NPA`}
          icon="🎯"
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
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:bg-white focus:outline-teal-600 font-medium"
            >
              <option value="all">Semua Karyawan</option>
              <option value="overtime_only">⚡ Ada Lembur (+)</option>
              <option value="leave_ded_only">✂️ Ada Potongan Cuti/Absen (-)</option>
              <option value="penalty_only">⏰ Hanya Kena Denda Telat (-)</option>
              <option value="reward_only">🎁 Hanya Penerima Reward (+)</option>
              <option value="transport_only">🚗 Hanya Penerima Transport</option>
              <option value="npa_only">🎯 Hanya Penerima NPA (10%)</option>
              <option value="prorate_only">📅 Karyawan Prorata (Join/Resign)</option>
              <option value="draft_ready">📋 Draft Odoo Siap Sync</option>
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
                'Gaji Pokok & Tunjangan',
                'Lembur (+)',
                'Potongan Cuti/Absen (-)',
                'Denda (-) & Reward (+)',
                'Status Prorata',
                'Draft Odoo & Sync',
                'Rincian',
              ]}
            >
              {paginatedData.map((r) => {
                const badgeStyle = LOCATION_BADGE_STYLE[r.locationCode] || 'bg-gray-100 text-gray-600'
                const hasPenalty = r.totalPenalty > 0
                const hasReward = r.rewardAmount > 0
                const hasTransport = r.enableTransport && (r.transportAllowance || 0) > 0
                const npAllowance = r.nonPermanentAllowance ?? r.kpiAllowance ?? 0
                const isNpEnabled = r.enableNonPermanent ?? r.enableKpi ?? true
                const hasNpa = isNpEnabled && npAllowance > 0
                const hasOvertime = (r.overtimeAmount || 0) > 0
                const hasLeaveDed = (r.totalLeaveDeductions || 0) > 0

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

                    {/* Gaji Pokok & Tunjangan */}
                    <Td>
                      <div className="flex flex-col gap-1 text-[11px] font-mono">
                        <div>
                          <span className="text-gray-400 text-[10px] font-sans mr-1">Pokok:</span>
                          <span className="font-semibold text-slate-800">
                            Rp {(r.basicSalary || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={hasTransport ? 'text-amber-700 font-medium' : 'text-gray-400'}>
                            🚗 {hasTransport ? `Rp ${r.transportAllowance.toLocaleString('id-ID')}` : 'Rp 0'}
                          </span>
                          <span className={hasNpa ? 'text-teal-700 font-medium' : 'text-gray-400'}>
                            🎯 {hasNpa ? `Rp ${npAllowance.toLocaleString('id-ID')}` : 'Rp 0'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-sans">
                          Gross: <strong className="text-gray-900 font-mono font-bold">Rp {(r.grossSalary || 0).toLocaleString('id-ID')}</strong>
                        </div>
                      </div>
                    </Td>

                    {/* Lembur (+) */}
                    <Td>
                      {hasOvertime ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-emerald-700 font-mono">
                            +Rp {r.overtimeAmount.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            ⚡ {r.overtimeHours} jam
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-mono">-</span>
                      )}
                    </Td>

                    {/* Potongan Cuti/Absen (-) */}
                    <Td>
                      {hasLeaveDed ? (
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-bold text-rose-600 font-mono">
                            -Rp {r.totalLeaveDeductions.toLocaleString('id-ID')}
                          </span>
                          <div className="flex flex-wrap gap-1 text-[9px]">
                            {r.halfDayDeduction > 0 && (
                              <span className="px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                1/2 H: -Rp {r.halfDayDeduction.toLocaleString('id-ID')}
                              </span>
                            )}
                            {r.sickLeaveDeduction > 0 && (
                              <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Sakit: -Rp {r.sickLeaveDeduction.toLocaleString('id-ID')}
                              </span>
                            )}
                            {r.unpaidLeaveDeduction > 0 && (
                              <span className="px-1 py-0.2 rounded bg-red-50 text-red-700 border border-red-200">
                                Unpaid: -Rp {r.unpaidLeaveDeduction.toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-mono">Rp 0</span>
                      )}
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

                    {/* Status Prorata */}
                    <Td>
                      {r.isProrated ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                            Prorata ({r.activeWorkingDays}/{r.workingDays} hr)
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Dasar: Rp {(r.proratedBaseGross || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-500 font-medium">
                          1 Cut-off Penuh ({r.workingDays} hr)
                        </span>
                      )}
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
                                ? `Update kalkulasi ke Draft Slip #${r.odooDraft.id} di Odoo`
                                : `Cek dan sync ke Odoo untuk ${r.name}`
                            }
                          >
                            <Icon e={syncingRowId === r.empId ? '⏳' : r.odooDraft?.state === 'draft' ? '🚀' : '🔄'} size={11} />
                            <span>
                              {syncingRowId === r.empId
                                ? 'Proses...'
                                : r.odooDraft?.state === 'draft'
                                ? `Update #${r.odooDraft.id}`
                                : 'Sync Odoo'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No Odoo ID</span>
                        )}
                      </div>
                    </Td>

                    {/* Tombol Rincian */}
                    <Td>
                      <button
                        onClick={() => setSelectedDetail(r)}
                        className="px-2 py-1 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition cursor-pointer flex items-center gap-1"
                        title="Lihat rincian 6 aturan payroll & komponen Odoo"
                      >
                        <Icon e="🔍" size={11} />
                        <span>Rincian</span>
                      </button>
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

      {/* Employee Payroll Detail Modal (6 Aturan HO & Gudang) */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EmployeeAvatar name={selectedDetail.name} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedDetail.name}</h3>
                    {selectedDetail.odoo_id && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Odoo #{selectedDetail.odoo_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300">
                    {selectedDetail.nik} · {selectedDetail.dept} · {selectedDetail.location} ({selectedDetail.workingDays} Hari Kerja Cut-off)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white text-lg font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              {/* Komponen Gaji Pokok & Tunjangan */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Komponen Gaji Dasar</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-gray-500 font-medium">Gaji Pokok (75%)</span>
                    <p className="text-xs font-bold text-blue-900 font-mono mt-0.5">
                      Rp {(selectedDetail.basicSalary || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                    <span className="text-[10px] text-gray-500 font-medium">Transport (15%)</span>
                    <p className="text-xs font-bold text-amber-900 font-mono mt-0.5">
                      {selectedDetail.enableTransport ? `Rp ${(selectedDetail.transportAllowance || 0).toLocaleString('id-ID')}` : 'Rp 0'}
                    </p>
                    <span className="text-[9px] text-gray-400">
                      {selectedDetail.enableTransport ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                    <span className="text-[10px] text-gray-500 font-medium">NPA (10%)</span>
                    <p className="text-xs font-bold text-teal-900 font-mono mt-0.5">
                      {(selectedDetail.enableNonPermanent ?? selectedDetail.enableKpi) ? `Rp ${(selectedDetail.nonPermanentAllowance ?? selectedDetail.kpiAllowance ?? 0).toLocaleString('id-ID')}` : 'Rp 0'}
                    </p>
                    <span className="text-[9px] text-gray-400">
                      {(selectedDetail.enableNonPermanent ?? selectedDetail.enableKpi) ? 'Item Odoo: NPA' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-gray-500 font-medium">Total Gross</span>
                    <p className="text-xs font-bold text-purple-950 font-mono mt-0.5">
                      Rp {(selectedDetail.grossSalary || 0).toLocaleString('id-ID')}
                    </p>
                    <span className="text-[9px] text-gray-400">100% Utuh</span>
                  </div>
                </div>
              </div>

              {/* Rincian 6 Aturan Kalkulator Payroll */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Penyesuaian & Potongan Cut-Off</h4>
                <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/40 text-xs">
                  {/* Lembur */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">⚡ Lembur (Overtime)</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        ({selectedDetail.overtimeHours || 0} Jam · Item Odoo: Overtime)
                      </span>
                    </div>
                    <span className="font-bold text-emerald-700 font-mono">
                      {selectedDetail.overtimeAmount > 0 ? `+Rp ${selectedDetail.overtimeAmount.toLocaleString('id-ID')}` : 'Rp 0'}
                    </span>
                  </div>

                  {/* Setengah Hari */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-600 font-bold">🌓 Izin Setengah Hari</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        ({selectedDetail.halfDayCount || 0}x kejadian · Item Odoo: Half Leave)
                      </span>
                    </div>
                    <span className="font-bold text-rose-700 font-mono">
                      {selectedDetail.halfDayDeduction > 0 ? `-Rp ${selectedDetail.halfDayDeduction.toLocaleString('id-ID')}` : 'Rp 0'}
                    </span>
                  </div>

                  {/* Sick Leave */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-bold">🩺 Cuti Sakit (Sick Leave)</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          ({selectedDetail.sickDays || 0} hari · Item Odoo: Sick Leave)
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Hanya memotong prorata transport/hari (Gaji Pokok & NPA tetap dibayar penuh)
                      </p>
                    </div>
                    <span className="font-bold text-rose-700 font-mono">
                      {selectedDetail.sickLeaveDeduction > 0 ? `-Rp ${selectedDetail.sickLeaveDeduction.toLocaleString('id-ID')}` : 'Rp 0'}
                    </span>
                  </div>

                  {/* Unpaid Leave */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-600 font-bold">🚫 Unpaid Leave / Mangkir</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        ({selectedDetail.unpaidDays || 0} hari · Item Odoo: Leave)
                      </span>
                    </div>
                    <span className="font-bold text-rose-700 font-mono">
                      {selectedDetail.unpaidLeaveDeduction > 0 ? `-Rp ${selectedDetail.unpaidLeaveDeduction.toLocaleString('id-ID')}` : 'Rp 0'}
                    </span>
                  </div>

                  {/* Denda Keterlambatan */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-600 font-bold">⏰ Denda Telat Presensi</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        ({selectedDetail.lateDays || 0} hari / {selectedDetail.lateMinutes || 0} menit · Item Odoo: Late)
                      </span>
                    </div>
                    <span className="font-bold text-rose-700 font-mono">
                      {selectedDetail.totalPenalty > 0 ? `-Rp ${selectedDetail.totalPenalty.toLocaleString('id-ID')}` : 'Rp 0'}
                    </span>
                  </div>

                  {/* Reward Kehadiran */}
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-700 font-bold">🎁 Reward Kehadiran Penuh</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        (Item Odoo: Attendance Reward)
                      </span>
                    </div>
                    <span className="font-bold text-purple-700 font-mono">
                      {selectedDetail.rewardAmount > 0 ? `+Rp ${selectedDetail.rewardAmount.toLocaleString('id-ID')}` : 'Rp 0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Prorata */}
              {selectedDetail.isProrated && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <div className="font-bold">⚠️ Perhitungan Prorata Diterapkan:</div>
                  <p className="mt-0.5 text-amber-800">
                    {selectedDetail.prorateReason} ({selectedDetail.activeWorkingDays} hari aktif dari {selectedDetail.workingDays} hari kerja cut-off).
                    Gaji dasar disesuaikan dari Rp {selectedDetail.grossSalary.toLocaleString('id-ID')} menjadi <strong>Rp {selectedDetail.proratedBaseGross.toLocaleString('id-ID')}</strong>.
                  </p>
                </div>
              )}

              {/* Info Take Home Pay di Odoo ERP */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span>🏢</span>
                    <span>Kalkulasi Akhir Take Home Pay (THP) di Odoo ERP</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seluruh komponen Gaji Pokok, Tunjangan, Lembur, dan Potongan di atas disinkronkan ke Odoo. Perhitungan BPJS Kesehatan/Ketenagakerjaan, Pajak PPh 21, dan THP final dihitung otomatis di sistem Odoo.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-200 text-slate-700 whitespace-nowrap ml-3">
                  Diproses di Odoo
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div>
                {selectedDetail.odooDraft ? (
                  <span className="text-xs font-semibold text-emerald-700">
                    Draft Slip Gaji Terdeteksi (#{selectedDetail.odooDraft.id})
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {selectedDetail.odoo_id ? 'Draft slip gaji belum ada di Odoo' : 'Belum memiliki Odoo Employee ID'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition cursor-pointer"
                >
                  Tutup
                </button>
                {selectedDetail.odoo_id && (
                  <button
                    onClick={() => {
                      handleSyncSingle(selectedDetail.empId, selectedDetail.name)
                      setSelectedDetail(null)
                    }}
                    disabled={syncing}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                  >
                    Sync Sekarang ke Odoo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

