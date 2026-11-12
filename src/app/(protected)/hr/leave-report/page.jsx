'use client'

import Icon from '@/components/ui/Icon'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import { daysBetween } from '@/utils/dateUtils'
import { LEAVE_STATUS_BADGE } from '@/utils/leaveUtils'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeaveReportPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees } = useEmployeeStore()
  const { departments, companies, positions } = useStructureStore()

  // ── State Data ──
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [leaveTypes, setLeaveTypes] = useState([])
  const [selectedLeave, setSelectedLeave] = useState(null)

  // ── State Filter ──
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [datePreset, setDatePreset] = useState('ALL') // 'THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'ALL', 'CUSTOM'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ── State Pagination ──
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // 1. Fetch Real Leaves dari PostgreSQL via API
  const loadLeaves = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leave/requests')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        const mapped = json.data.map((l) => ({
          id: l.id,
          userId: l.userId,
          name: l.user?.name || `Karyawan #${l.userId}`,
          nik: l.user?.employeeId || l.user?.id || '—',
          dept: l.user?.dept || '—',
          position: l.user?.position || '—',
          type: l.typeName || l.leaveType?.name || 'Cuti Tahunan',
          start: l.startDate,
          end: l.endDate,
          days: daysBetween(l.startDate, l.endDate),
          note: l.note || '',
          status: l.status,
          steps: Array.isArray(l.steps) ? l.steps : [],
          customData: l.customData || {},
          attachment: l.attachment || null,
          createdAt: l.createdAt,
          user: l.user,
        }))
        setLeaves(mapped)
      }
    } catch (err) {
      console.error('[LeaveReport] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // 2. Fetch Leave Types
  useEffect(() => {
    fetch('/api/leave/types')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setLeaveTypes(json.data)
        }
      })
      .catch(() => {})
    loadLeaves()
  }, [])

  // Listen for real-time leave status updates
  useEffect(() => {
    const handleUpdate = () => loadLeaves()
    if (typeof window !== 'undefined') {
      window.addEventListener('leave-status-updated', handleUpdate)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('leave-status-updated', handleUpdate)
      }
    }
  }, [])

  // 3. Handle Date Presets
  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    const now = new Date()
    if (preset === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(first.toISOString().split('T')[0])
      setEndDate(last.toISOString().split('T')[0])
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      setStartDate(first.toISOString().split('T')[0])
      setEndDate(last.toISOString().split('T')[0])
    } else if (preset === 'THIS_YEAR') {
      const first = new Date(now.getFullYear(), 0, 1)
      const last = new Date(now.getFullYear(), 11, 31)
      setStartDate(first.toISOString().split('T')[0])
      setEndDate(last.toISOString().split('T')[0])
    } else if (preset === 'ALL') {
      setStartDate('')
      setEndDate('')
    }
  }

  // 4. Filtering Data
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      // Search: Nama atau NIK
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = (l.name || '').toLowerCase().includes(q)
        const matchNik = String(l.nik || '').toLowerCase().includes(q)
        if (!matchName && !matchNik) return false
      }

      // Filter Departemen
      if (filterDept) {
        const emp = employees.find((e) => e.id === l.userId)
        const dName = emp?.dept || l.dept || ''
        const deptObj = departments.find((d) => String(d.id) === filterDept)
        if (deptObj && dName !== deptObj.name && emp?.departmentId !== Number(filterDept)) {
          return false
        }
      }

      // Filter Jenis Cuti
      if (filterType && l.type !== filterType) {
        return false
      }

      // Filter Status
      if (filterStatus !== 'ALL' && l.status !== filterStatus) {
        return false
      }

      // Filter Rentang Tanggal
      if (startDate && l.end < startDate) return false
      if (endDate && l.start > endDate) return false

      return true
    })
  }, [leaves, search, filterDept, filterType, filterStatus, startDate, endDate, employees, departments])

  // 5. KPI & Statistik
  const stats = useMemo(() => {
    const totalSubmissions = filteredLeaves.length
    const approvedList = filteredLeaves.filter((l) => l.status === 'Approved')
    const totalApprovedDays = approvedList.reduce((acc, curr) => acc + (curr.days || 1), 0)
    const totalPending = filteredLeaves.filter((l) => l.status === 'Pending').length
    const totalRejected = filteredLeaves.filter((l) => l.status === 'Rejected').length
    const totalWithdrawn = filteredLeaves.filter((l) => l.status === 'Withdrawn').length

    return {
      totalSubmissions,
      totalApprovedDays,
      totalPending,
      totalRejected,
      totalWithdrawn,
    }
  }, [filteredLeaves])

  // 6. Pagination
  const totalPages = Math.ceil(filteredLeaves.length / pageSize) || 1
  const paginatedLeaves = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredLeaves.slice(start, start + pageSize)
  }, [filteredLeaves, page, pageSize])

  // 7. Ekspor ke Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredLeaves.length === 0) {
      alert(t('Tidak ada data cuti untuk diekspor.', 'No leave data to export.'))
      return
    }

    const exportRows = filteredLeaves.map((l, idx) => {
      const emp = employees.find((e) => e.id === l.userId)
      // Temukan approver terakhir yang bertindak
      const lastActed = (l.steps || []).findLast?.((s) => s.actedAt)
      const currentPending = (l.steps || []).find?.((s) => s.status === 'Pending')

      return {
        No: idx + 1,
        'NIK / ID': l.nik || emp?.nik || '—',
        'Nama Karyawan': l.name,
        Departemen: l.dept || emp?.dept || '—',
        Jabatan: l.position || emp?.jobTitle || '—',
        'Jenis Cuti': l.type,
        'Tanggal Mulai': l.start,
        'Tanggal Selesai': l.end,
        'Durasi (Hari)': l.days,
        'Keterangan / Alasan': l.note || '—',
        Status: l.status,
        'Penyetuju Terakhir': lastActed ? `${lastActed.approverName || 'Approver'} (${lastActed.status})` : '—',
        'Tahap Menunggu': currentPending ? currentPending.label || `Step ${currentPending.level}` : '—',
        'Tanggal Pengajuan': l.createdAt ? fmtDateTime(l.createdAt) : fmtDate(l.start),
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)

    // Atur lebar kolom otomatis
    const colWidths = [
      { wch: 5 },  // No
      { wch: 14 }, // NIK
      { wch: 25 }, // Nama
      { wch: 18 }, // Dept
      { wch: 20 }, // Jabatan
      { wch: 18 }, // Jenis Cuti
      { wch: 14 }, // Mulai
      { wch: 14 }, // Selesai
      { wch: 12 }, // Durasi
      { wch: 30 }, // Keterangan
      { wch: 12 }, // Status
      { wch: 24 }, // Penyetuju
      { wch: 20 }, // Tahap Menunggu
      { wch: 20 }, // Tgl Pengajuan
    ]
    worksheet['!cols'] = colWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Cuti')

    const fileDate = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Laporan_Cuti_Karyawan_${fileDate}.xlsx`)
  }

  // 8. Cetak PDF / Print Friendly
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Print-only Title ── */}
      <div className="hidden print:block mb-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">LAPORAN REKAPITULASI CUTI KARYAWAN</h1>
        <p className="text-xs text-gray-500">
          Dicetak pada: {new Date().toLocaleString('id-ID')} | Total: {filteredLeaves.length} Pengajuan
        </p>
      </div>

      {/* ── Header & Quick Nav Tabs ── */}
      <div className="print:hidden flex flex-col gap-4">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
            >
              <Icon e="📊" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                {t('Laporan Cuti Karyawan', 'Employee Leave Report')}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {t(
                  'Rekapitulasi, monitoring persetujuan, dan analisis pengajuan cuti seluruh karyawan secara terpusat.',
                  'Centralized reporting, monitoring, and analytics of all employee leave requests.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-sm"
            >
              <Icon e="📥" size={14} />
              <span>{t('Ekspor Excel (.xlsx)', 'Export Excel')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-sm"
            >
              <Icon e="🖨️" size={14} />
              <span>{t('Cetak PDF', 'Print Report')}</span>
            </button>
            <button
              onClick={loadLeaves}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition shadow-sm"
            >
              <Icon e="🔄" size={14} />
              <span>{t('Refresh', 'Refresh')}</span>
            </button>
          </div>
        </div>

        {/* ── Tautan Cepat Navigasi Dua Arah Antar Modul Cuti HR ── */}
        <div className="flex items-center justify-between border-b border-gray-200 pt-1">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-teal-800 border-b-2 border-teal-600 bg-teal-50/50 rounded-t-lg">
              <Icon e="📊" size={14} />
              <span>{t('Laporan & Rekap Cuti (Report)', 'Leave Report & Analytics')}</span>
              <span className="ml-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-600 text-white">
                {filteredLeaves.length}
              </span>
            </div>
            <Link
              href="/hr/apply-leave"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-lg transition"
            >
              <Icon e="📝" size={14} />
              <span>{t('Ajukan Cuti Karyawan (Apply Leave)', 'Submit Leave on Behalf')}</span>
            </Link>
          </div>

          <Link
            href="/hr/apply-leave"
            className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 py-1 transition"
          >
            <Icon e="➕" size={12} />
            <span>{t('Ajukan Cuti Baru', 'New Leave Request')}</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pengajuan */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400">{t('Total Pengajuan', 'Total Submissions')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSubmissions}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {t('Seluruh tiket permohonan', 'All ticket requests')}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            <Icon e="📄" size={20} />
          </div>
        </div>

        {/* Total Hari Cuti Disetujui */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 font-semibold">
              {t('Hari Cuti Disetujui', 'Approved Leave Days')}
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {stats.totalApprovedDays} <span className="text-xs font-medium text-emerald-500">{t('Hari', 'Days')}</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {filteredLeaves.filter((l) => l.status === 'Approved').length} {t('pengajuan disetujui', 'approved')}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            <Icon e="✅" size={20} />
          </div>
        </div>

        {/* Menunggu Persetujuan */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600 font-semibold">
              {t('Menunggu Persetujuan', 'Pending Approval')}
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.totalPending}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {t('Dalam alur workflow atasan/HR', 'Active in approval workflow')}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            <Icon e="⏳" size={20} />
          </div>
        </div>

        {/* Ditolak */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-rose-600 font-semibold">{t('Ditolak', 'Rejected')}</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{stats.totalRejected}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {stats.totalWithdrawn > 0 ? `${stats.totalWithdrawn} ditarik pemohon` : t('Tidak disetujui', 'Not approved')}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
            <Icon e="❌" size={20} />
          </div>
        </div>
      </div>

      {/* ── Panel Filter Komprehensif ── */}
      <div className="print:hidden bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
        {/* Baris 1: Preset Rentang Tanggal Cepat */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">{t('Periode:', 'Period:')}</span>
            {[
              { id: 'ALL', label: t('Semua Waktu', 'All Time') },
              { id: 'THIS_MONTH', label: t('Bulan Ini', 'This Month') },
              { id: 'LAST_MONTH', label: t('Bulan Lalu', 'Last Month') },
              { id: 'THIS_YEAR', label: t('Tahun Ini', 'This Year') },
              { id: 'CUSTOM', label: t('Kustom', 'Custom') },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  datePreset === p.id
                    ? 'bg-teal-700 text-white font-semibold shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Pemilih Tanggal Kustom */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">{t('Mulai:', 'From:')}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setDatePreset('CUSTOM')
                }}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-teal-500 bg-white"
              />
            </div>
            <span className="text-gray-300">—</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">{t('Sampai:', 'To:')}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setDatePreset('CUSTOM')
                }}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-teal-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Baris 2: Filter Multikriteria & Pencarian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pencarian NIK / Nama */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Cari nama karyawan / NIK…', 'Search employee name or ID…')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 transition"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <Icon e="🔍" size={13} />
            </span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Departemen */}
          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 bg-white text-gray-700"
            >
              <option value="">{t('Semua Departemen', 'All Departments')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Jenis Cuti */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 bg-white text-gray-700"
            >
              <option value="">{t('Semua Jenis Cuti', 'All Leave Types')}</option>
              {(leaveTypes.length > 0 ? leaveTypes : [
                { id: 1, name: 'Cuti Tahunan' },
                { id: 2, name: 'Cuti Sakit' },
                { id: 3, name: 'Cuti Menikah' },
                { id: 4, name: 'Cuti Melahirkan' },
                { id: 5, name: 'Unpaid Leave (Izin Potong Gaji)' },
                { id: 6, name: 'Izin Setengah Hari' },
              ]).map((lt) => (
                <option key={lt.id} value={lt.name}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Persetujuan */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 bg-white text-gray-700"
            >
              <option value="ALL">{t('Semua Status', 'All Status')}</option>
              <option value="Approved">{t('Disetujui (Approved)', 'Approved')}</option>
              <option value="Pending">{t('Menunggu (Pending)', 'Pending')}</option>
              <option value="Rejected">{t('Ditolak (Rejected)', 'Rejected')}</option>
              <option value="Withdrawn">{t('Ditarik (Withdrawn)', 'Withdrawn')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Tabel Rekapitulasi Data Laporan Cuti ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-800">
              {t('Daftar Rekapitulasi Cuti', 'Leave Records')}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {filteredLeaves.length} {t('data ditemukan', 'records')}
            </span>
          </div>

          <div className="print:hidden flex items-center gap-2">
            <span className="text-xs text-gray-400">{t('Tampilkan:', 'Show:')}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg outline-none bg-white text-gray-600"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold">{t('Karyawan', 'Employee')}</th>
                <th className="py-3 px-4 font-semibold">{t('Departemen', 'Department')}</th>
                <th className="py-3 px-4 font-semibold">{t('Jenis Cuti', 'Leave Type')}</th>
                <th className="py-3 px-4 font-semibold">{t('Periode Cuti', 'Leave Period')}</th>
                <th className="py-3 px-4 font-semibold text-center">{t('Durasi', 'Duration')}</th>
                <th className="py-3 px-4 font-semibold">{t('Keterangan / Alasan', 'Note / Reason')}</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">{t('Penyetuju / Workflow', 'Approver / Workflow')}</th>
                <th className="py-3 px-4 font-semibold text-center print:hidden">{t('Aksi', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs">{t('Memuat data cuti dari database…', 'Loading leave data…')}</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <Icon e="📋" size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-600">{t('Tidak ada data pengajuan cuti', 'No leave records found')}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {t('Coba ubah filter periode atau kata kunci pencarian Anda.', 'Try adjusting your filters or search keywords.')}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLeaves.map((l, idx) => {
                  const emp = employees.find((e) => e.id === l.userId)
                  const rowNumber = (page - 1) * pageSize + idx + 1
                  const currentPending = (l.steps || []).find((s) => s.status === 'Pending')
                  const lastApproved = (l.steps || []).findLast?.((s) => s.status === 'Approved')
                  const rejectedStep = (l.steps || []).find((s) => s.status === 'Rejected')

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-teal-50/30 transition cursor-pointer"
                      onClick={() => setSelectedLeave(l)}
                    >
                      <td className="py-3 px-4 text-center text-gray-400 font-mono">{rowNumber}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
                          >
                            {(l.name || '?')
                              .trim()
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 leading-tight hover:text-teal-700 transition">
                              {l.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {l.nik || emp?.nik || `ID #${l.userId}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {l.dept || emp?.dept || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-700">
                        {l.type}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-800 font-medium">
                          {fmtDate(l.start)}
                          {l.start !== l.end && ` — ${fmtDate(l.end)}`}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Diajukan: {fmtDate(l.createdAt || l.start)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 font-bold rounded-lg bg-gray-100 text-gray-800">
                          {l.days} {t('hari', 'days')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={l.note}>
                        {l.note || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            LEAVE_STATUS_BADGE[l.status] ||
                            (l.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800')
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {l.status === 'Approved' && (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <Icon e="✓" size={12} />
                            <span className="font-medium truncate max-w-[150px]">
                              {lastApproved?.approverName || 'HR Disetujui'}
                            </span>
                          </div>
                        )}
                        {l.status === 'Rejected' && (
                          <div className="flex items-center gap-1.5 text-rose-700">
                            <Icon e="✗" size={12} />
                            <span className="font-medium truncate max-w-[150px]">
                              {rejectedStep?.approverName || 'Ditolak Atasan'}
                            </span>
                          </div>
                        )}
                        {l.status === 'Pending' && (
                          <div className="flex items-center gap-1.5 text-amber-700">
                            <Icon e="⏳" size={12} />
                            <span className="font-medium truncate max-w-[150px]">
                              {currentPending?.approverName || currentPending?.label || 'Menunggu Persetujuan'}
                            </span>
                          </div>
                        )}
                        {l.status === 'Withdrawn' && (
                          <span className="text-gray-400 italic">Dibatalkan pemohon</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLeave(l)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition"
                        >
                          {t('Detail', 'Detail')}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="print:hidden p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            {t('Menampilkan', 'Showing')} {paginatedLeaves.length > 0 ? (page - 1) * pageSize + 1 : 0} –{' '}
            {Math.min(page * pageSize, filteredLeaves.length)} {t('dari', 'of')} {filteredLeaves.length}{' '}
            {t('data', 'records')}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 font-medium"
            >
              {t('Sebelumnya', 'Prev')}
            </button>
            <span className="px-3 py-1.5 font-bold text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 font-medium"
            >
              {t('Berikutnya', 'Next')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Detail & Workflow Timeline ── */}
      {selectedLeave && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedLeave(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-5 py-4 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
            >
              <div className="flex items-center gap-2.5">
                <Icon e="📄" size={18} />
                <div>
                  <h3 className="text-sm font-bold">{t('Rincian Pengajuan Cuti', 'Leave Request Detail')}</h3>
                  <p className="text-[11px] text-teal-100 font-mono mt-0.5">
                    ID: #{selectedLeave.id} · {selectedLeave.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Info Karyawan & Status */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-gray-400 text-[11px]">{t('Karyawan', 'Employee')}</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">{selectedLeave.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{selectedLeave.nik || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Departemen / Jabatan</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedLeave.dept || '—'}</p>
                  <p className="text-[10px] text-gray-500">{selectedLeave.position || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">{t('Jenis Cuti', 'Leave Type')}</p>
                  <p className="font-bold text-teal-800 mt-0.5">{selectedLeave.type}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Status</p>
                  <div className="mt-0.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        selectedLeave.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedLeave.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedLeave.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tanggal & Durasi */}
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-3">
                <div>
                  <p className="text-gray-400 text-[11px]">{t('Mulai', 'Start Date')}</p>
                  <p className="font-bold text-gray-800 mt-0.5">{fmtDate(selectedLeave.start)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">{t('Selesai', 'End Date')}</p>
                  <p className="font-bold text-gray-800 mt-0.5">{fmtDate(selectedLeave.end)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">{t('Total Durasi', 'Total Duration')}</p>
                  <p className="font-bold text-teal-700 mt-0.5">
                    {selectedLeave.days} {t('Hari Kerja', 'Working Days')}
                  </p>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <p className="text-gray-400 text-[11px] mb-1">{t('Keterangan / Alasan Cuti', 'Reason')}</p>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-700 leading-relaxed">
                  {selectedLeave.note || <span className="text-gray-400 italic">Tidak ada catatan</span>}
                </div>
              </div>

              {/* Lampiran Dokumen jika ada */}
              {selectedLeave.attachment && (
                <div>
                  <p className="text-gray-400 text-[11px] mb-1">Dokumen Pendukung / Surat Sakit</p>
                  <a
                    href={selectedLeave.attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold transition"
                  >
                    <Icon e="📎" size={13} />
                    <span>Lihat Lampiran Dokumen</span>
                  </a>
                </div>
              )}

              {/* Workflow Persetujuan Bertingkat */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">
                  Alur Persetujuan Workflow
                </p>
                <div className="flex flex-col gap-2">
                  {(selectedLeave.steps || []).length === 0 ? (
                    <p className="text-gray-400 italic text-[11px]">Alur persetujuan default standar.</p>
                  ) : (
                    selectedLeave.steps.map((step) => {
                      const isApproved = step.status === 'Approved'
                      const isRejected = step.status === 'Rejected'
                      const isPending = step.status === 'Pending'

                      return (
                        <div
                          key={step.level}
                          className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${
                            isApproved
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                              : isRejected
                              ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                              : isPending
                              ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5">
                              {isApproved ? '✅' : isRejected ? '❌' : isPending ? '⏳' : '⚪'}
                            </span>
                            <div>
                              <p className="font-bold text-xs">
                                Step {step.level} — {step.label || `Level ${step.level}`}
                              </p>
                              <p className="text-[11px] opacity-80 mt-0.5">
                                Penyetuju: <span className="font-semibold">{step.approverName || '—'}</span>
                              </p>
                              {step.note && (
                                <p className="text-[10px] mt-1 italic opacity-90">
                                  "{step.note}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isApproved
                                  ? 'bg-emerald-200 text-emerald-800'
                                  : isRejected
                                  ? 'bg-rose-200 text-rose-800'
                                  : isPending
                                  ? 'bg-amber-200 text-amber-800'
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {step.status}
                            </span>
                            {step.actedAt && (
                              <p className="text-[9px] text-gray-500 mt-1">{fmtDate(step.actedAt)}</p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition"
              >
                {t('Tutup', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
