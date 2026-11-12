'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import * as XLSX from 'xlsx'
import Icon from '@/components/ui/Icon'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import { OVERTIME_REQUEST_BPMN_XML } from '@/lib/flowable/definitions/overtimeRequestBpmn'

const BpmnViewerComponent = dynamic(() => import('@/components/workflow/BpmnViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
      <div className="animate-spin text-2xl">⏳</div>
      <p className="text-xs">Memuat visual diagram alur BPMN...</p>
    </div>
  ),
})

function fmtRp(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0)
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDateTime(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OvertimeManagementPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees } = useEmployeeStore()
  const { departments } = useStructureStore()

  // ── State Data ──
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [activeModalTab, setActiveModalTab] = useState('summary') // 'summary' | 'calc' | 'bpmn'
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // ── Form Action State ──
  const [hrNote, setHrNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  // ── State Filter ──
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [datePreset, setDatePreset] = useState('THIS_MONTH')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ── State Pagination ──
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── 1. Fetch Real Overtime Data ──
  const fetchOvertimeData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      if (filterDept !== 'ALL') params.set('dept', filterDept)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/overtime?${params.toString()}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data)
        setSummary(json.summary || null)
      } else {
        setRecords([])
      }
    } catch (err) {
      console.error('Failed to load overtime records:', err)
      showToast('Gagal memuat data lembur', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Set date ranges according to presets
  useEffect(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()

    if (datePreset === 'THIS_MONTH') {
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0]
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0]
      setStartDate(firstDay)
      setEndDate(lastDay)
    } else if (datePreset === 'LAST_MONTH') {
      const firstDay = new Date(y, m - 1, 1).toISOString().split('T')[0]
      const lastDay = new Date(y, m, 0).toISOString().split('T')[0]
      setStartDate(firstDay)
      setEndDate(lastDay)
    } else if (datePreset === 'THIS_YEAR') {
      const firstDay = `${y}-01-01`
      const lastDay = `${y}-12-31`
      setStartDate(firstDay)
      setEndDate(lastDay)
    } else if (datePreset === 'ALL') {
      setStartDate('')
      setEndDate('')
    }
  }, [datePreset])

  useEffect(() => {
    fetchOvertimeData()
    setPage(1)
  }, [filterStatus, filterDept, startDate, endDate])

  // ── 2. Unique Departments List ──
  const departmentOptions = useMemo(() => {
    const deptSet = new Set()
    if (Array.isArray(departments)) {
      departments.forEach((d) => d?.name && deptSet.add(d.name))
    }
    if (Array.isArray(employees)) {
      employees.forEach((e) => e?.dept && deptSet.add(e.dept))
    }
    records.forEach((r) => r?.employee?.dept && deptSet.add(r.employee.dept))
    return Array.from(deptSet).sort()
  }, [departments, employees, records])

  // ── 3. Filtered Records (Frontend search keyword) ──
  const filteredRecords = useMemo(() => {
    let list = records
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) => {
        const empName = (r.employee?.name || '').toLowerCase()
        const empNik = (r.employee?.nik || '').toLowerCase()
        const note = (r.taskNote || '').toLowerCase()
        const dept = (r.employee?.dept || '').toLowerCase()
        return (
          empName.includes(q) ||
          empNik.includes(q) ||
          note.includes(q) ||
          dept.includes(q)
        )
      })
    }
    return list
  }, [records, search])

  // ── 4. Metric Calculations ──
  const metrics = useMemo(() => {
    let totalCount = filteredRecords.length
    let totalHours = 0
    let totalFee = 0
    let pendingCount = 0
    let approvedCount = 0
    let rejectedCount = 0

    filteredRecords.forEach((r) => {
      totalHours += Number(r.totalHours) || 0
      totalFee += Number(r.totalFee) || 0
      if (r.status === 'Approved') approvedCount++
      else if (r.status === 'Pending') pendingCount++
      else if (r.status === 'Rejected') rejectedCount++
    })

    return {
      totalCount,
      totalHours: Math.round(totalHours * 10) / 10,
      totalFee,
      pendingCount,
      approvedCount,
      rejectedCount,
    }
  }, [filteredRecords])

  // ── 5. Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, page, pageSize])

  // ── 6. Export to Excel (.xlsx) ──
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data lembur untuk diekspor.')
      return
    }

    const exportRows = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      'NIK / ID': r.employee?.nik || r.empId || '—',
      'Nama Karyawan': r.employee?.name || '—',
      Departemen: r.employee?.dept || '—',
      Jabatan: r.employee?.jobTitle || '—',
      'Lokasi Kerja': r.employee?.workLocationCode || r.employee?.location || 'HO',
      'Tanggal Lembur': r.date,
      Hari: r.dayName || '—',
      'Jam Mulai': r.startTime,
      'Jam Selesai': r.endTime,
      'Total Jam': Number(r.totalHours) || 0,
      'Upah / Jam (Rp)': Number(r.hourlyRate) || 0,
      'Total Biaya Lembur (Rp)': Number(r.totalFee) || 0,
      'Status Approval': r.status,
      'Uraian Tugas / Alasan': r.taskNote || '—',
      'Tanggal Diajukan': r.createdAt ? fmtDateTime(r.createdAt) : r.date,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)

    const colWidths = [
      { wch: 5 },  // No
      { wch: 14 }, // NIK
      { wch: 26 }, // Nama
      { wch: 20 }, // Dept
      { wch: 20 }, // Jabatan
      { wch: 14 }, // Lokasi
      { wch: 14 }, // Tgl
      { wch: 10 }, // Hari
      { wch: 12 }, // Jam Mulai
      { wch: 12 }, // Jam Selesai
      { wch: 12 }, // Total Jam
      { wch: 16 }, // Upah/Jam
      { wch: 22 }, // Total Biaya
      { wch: 14 }, // Status
      { wch: 35 }, // Uraian
      { wch: 20 }, // Tgl Diajukan
    ]
    worksheet['!cols'] = colWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan_Lembur_HR')

    const fileDate = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Laporan_Lembur_HR_${fileDate}.xlsx`)
    showToast('Laporan lembur berhasil diunduh ke Excel (.xlsx)')
  }

  // ── 7. Handle HR Decision (Approve / Reject) ──
  const handleHrDecision = async (newStatus) => {
    if (!selectedRecord) return
    if (newStatus === 'Rejected' && !rejectReason.trim()) {
      alert('Mohon masukkan alasan penolakan.')
      return
    }

    setActionLoading(true)
    try {
      const payload = {
        id: selectedRecord.id,
        status: newStatus,
        approvedById: currentUser?.employeeId || currentUser?.id || 1,
        taskNote: hrNote ? `${selectedRecord.taskNote || ''} [Catatan HR: ${hrNote}]` : selectedRecord.taskNote,
        rejectReason: newStatus === 'Rejected' ? rejectReason : undefined,
      }

      const res = await fetch('/api/overtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (result.success) {
        showToast(
          newStatus === 'Approved'
            ? '✅ Pengajuan lembur berhasil disetujui & divalidasi HR!'
            : '❌ Pengajuan lembur ditolak.'
        )
        setSelectedRecord(null)
        setHrNote('')
        setRejectReason('')
        setShowRejectInput(false)
        fetchOvertimeData()
      } else {
        alert(result.error || 'Gagal memproses verifikasi lembur')
      }
    } catch (err) {
      alert('Terjadi kesalahan saat memproses approval.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Disetujui
          </span>
        )
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Menunggu Approval
          </span>
        )
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Ditolak
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-bounce ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-sm">
              <Icon name="clock" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Overtime Management
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitoring, audit verifikasi pengajuan lembur, analisa upah PP 35/2021, dan rekonsiliasi payroll.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/hr/payroll/ho-calculator"
            className="px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
          >
            <span>🧮</span> Kalkulator HO
          </Link>
          <Link
            href="/sysadmin/workflow/designer?id=4"
            className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
          >
            <span>🎨</span> BPMN Designer
          </Link>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
          >
            <span>📥</span> Ekspor Excel (.xlsx)
          </button>
          <button
            onClick={fetchOvertimeData}
            title="Refresh Data"
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
          >
            <Icon name="refresh" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pengajuan</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{metrics.totalCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Semua entri lembur</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Total Durasi</p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">{metrics.totalHours} <span className="text-xs font-semibold">Jam</span></p>
          <p className="text-[11px] text-gray-400 mt-0.5">Akumulasi lembur</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Estimasi Biaya</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1 truncate" title={fmtRp(metrics.totalFee)}>
            {fmtRp(metrics.totalFee)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Formula PP 35/2021</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Menunggu</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.pendingCount}</p>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Butuh approval</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Disetujui</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.approvedCount}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Siap masuk payroll</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Ditolak</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{metrics.rejectedCount}</p>
          <p className="text-[11px] text-rose-600/80 mt-0.5">Tidak dicairkan</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          {/* Keyword Search */}
          <div className="md:col-span-1 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari karyawan, NIK, tugas..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">🏢 Semua Departemen</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">⚡ Semua Status</option>
              <option value="Pending">🟡 Menunggu Approval</option>
              <option value="Approved">🟢 Disetujui</option>
              <option value="Rejected">🔴 Ditolak</option>
            </select>
          </div>

          {/* Date Preset */}
          <div>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            >
              <option value="THIS_MONTH">📅 Periode: Bulan Ini</option>
              <option value="LAST_MONTH">📅 Periode: Bulan Lalu</option>
              <option value="THIS_YEAR">📅 Periode: Tahun Ini</option>
              <option value="ALL">📅 Semua Waktu</option>
              <option value="CUSTOM">📅 Rentang Tanggal Khusus...</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {datePreset === 'CUSTOM' && (
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-gray-600 font-semibold">Mulai:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-gray-600 font-semibold">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline"
              >
                Reset Tanggal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-gray-500 gap-2">
            <div className="animate-spin text-3xl">⏳</div>
            <p className="text-sm font-medium">Memuat data lembur karyawan...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16 p-8 space-y-3">
            <div className="text-4xl">⏱️</div>
            <h3 className="text-base font-bold text-gray-900">Belum Ada Pengajuan Lembur</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Tidak ada data lembur yang cocok dengan kriteria pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5">Karyawan</th>
                  <th className="px-4 py-3.5">Departemen &amp; Jabatan</th>
                  <th className="px-4 py-3.5">Jadwal Lembur</th>
                  <th className="px-4 py-3.5">Durasi Jam</th>
                  <th className="px-4 py-3.5">Kalkulasi Upah PP 35</th>
                  <th className="px-4 py-3.5">Status Persetujuan</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedRecords.map((r, idx) => {
                  const emp = r.employee || {}
                  const initials = (emp.name || 'User')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition">
                      <td className="px-4 py-3.5 text-center text-gray-400 font-medium">
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      {/* Employee Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{emp.name || `Karyawan #${r.empId}`}</p>
                            <p className="text-[11px] text-gray-500 font-mono">
                              NIK: {emp.nik || r.empId}
                              {emp.workLocationCode && (
                                <span className="ml-1.5 px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                                  {emp.workLocationCode}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department & Job */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800">{emp.dept || '—'}</p>
                        <p className="text-[11px] text-gray-500 truncate max-w-[160px]">{emp.jobTitle || '—'}</p>
                      </td>

                      {/* Overtime Date & Time */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900">{fmtDate(r.date)}</p>
                        <p className="text-[11px] text-gray-500 font-mono">
                          {r.startTime} – {r.endTime} WIB
                        </p>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs bg-purple-50 text-purple-700 border border-purple-200">
                          ⏱️ {r.totalHours} Jam
                        </span>
                      </td>

                      {/* Fee Calculation */}
                      <td className="px-4 py-3.5">
                        <p className="font-extrabold text-emerald-700 text-sm">
                          {fmtRp(r.totalFee)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Rate: {fmtRp(r.hourlyRate)}/jam
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {getStatusBadge(r.status)}
                        {r.customData?.approverName && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Oleh: {r.customData.approverName}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedRecord(r)
                            setActiveModalTab('summary')
                            setHrNote('')
                            setRejectReason('')
                            setShowRejectInput(false)
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <span>🔍</span> Detail &amp; BPMN
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && filteredRecords.length > 0 && (
          <div className="p-4 bg-gray-50/60 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <span className="text-gray-500">
              Menampilkan <strong>{(page - 1) * pageSize + 1}</strong> –{' '}
              <strong>{Math.min(page * pageSize, filteredRecords.length)}</strong> dari{' '}
              <strong>{filteredRecords.length}</strong> entri lembur
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                ← Sebelumnya
              </button>
              <span className="px-2 font-semibold text-gray-700">
                Halaman {page} dari {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Detail & Flowable BPMN Viewer ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Detail Pengajuan Lembur &amp; Workflow</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  ID #{selectedRecord.id} • Karyawan: {selectedRecord.employee?.name} ({selectedRecord.employee?.nik})
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/70 text-xs font-semibold">
              <button
                onClick={() => setActiveModalTab('summary')}
                className={`flex-1 py-3 px-4 border-b-2 text-center transition ${
                  activeModalTab === 'summary'
                    ? 'border-blue-600 text-blue-700 bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Informasi &amp; Uraian
              </button>
              <button
                onClick={() => setActiveModalTab('calc')}
                className={`flex-1 py-3 px-4 border-b-2 text-center transition ${
                  activeModalTab === 'calc'
                    ? 'border-blue-600 text-blue-700 bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🧮 Analisa Upah PP 35/2021
              </button>
              <button
                onClick={() => setActiveModalTab('bpmn')}
                className={`flex-1 py-3 px-4 border-b-2 text-center transition ${
                  activeModalTab === 'bpmn'
                    ? 'border-blue-600 text-blue-700 bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🎨 Alur Flowable BPMN 2.0
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 text-xs space-y-4 max-h-[65vh] overflow-y-auto">
              {activeModalTab === 'summary' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                    <div>
                      <p className="text-gray-400 text-[11px]">Tanggal Lembur</p>
                      <p className="font-bold text-gray-900 text-sm">{fmtDate(selectedRecord.date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[11px]">Waktu Lembur</p>
                      <p className="font-bold text-gray-900 text-sm">
                        {selectedRecord.startTime} – {selectedRecord.endTime} WIB
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[11px]">Total Durasi</p>
                      <p className="font-extrabold text-purple-700 text-sm">
                        {selectedRecord.totalHours} Jam
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[11px]">Departemen</p>
                      <p className="font-semibold text-gray-800">{selectedRecord.employee?.dept || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[11px]">Jabatan</p>
                      <p className="font-semibold text-gray-800">{selectedRecord.employee?.jobTitle || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[11px]">Lokasi Kerja</p>
                      <p className="font-semibold text-gray-800">
                        {selectedRecord.employee?.workLocationCode || selectedRecord.employee?.location || 'HO'}
                      </p>
                    </div>
                  </div>

                  {/* Task Notes */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-1 text-xs">Uraian Tugas / Alasan Lembur:</h4>
                    <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedRecord.taskNote || 'Tidak ada uraian tugas yang dilampirkan.'}
                    </div>
                  </div>

                  {/* Flowable Instance Info */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 font-semibold">Process Instance ID:</p>
                      <p className="font-mono text-gray-800 text-[11px]">
                        {selectedRecord.customData?.flowableProcessInstanceId || 'N/A (Direct Local Mode)'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 font-semibold">Status Approval:</p>
                      <div className="mt-0.5">{getStatusBadge(selectedRecord.status)}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'calc' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-900 font-bold text-sm">Estimasi Total Upah Lembur</span>
                      <span className="text-emerald-700 font-extrabold text-xl">
                        {fmtRp(selectedRecord.totalFee)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Dihitung berdasarkan Peraturan Pemerintah No. 35 Tahun 2021 tentang Perjanjian Kerja Waktu Tertentu, Alih Daya, Waktu Kerja dan Istirahat.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <p className="text-gray-500">Upah Per Jam (Hourly Rate):</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">
                        {fmtRp(selectedRecord.hourlyRate)} / jam
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Rumus HO: (Gaji Pokok / Hari Kerja) / 8
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Faktor Pengali Jam Lembur:</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">
                        Jam 1: 1.5× • Jam 2 dst: 2×
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Standar Hari Kerja Reguler
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 flex items-center justify-between">
                    <div>
                      <p className="font-bold">Sinkronisasi Modul Payroll HO &amp; Odoo:</p>
                      <p className="text-[11px] text-purple-700">
                        Upah lembur ini otomatis diagregasikan ke baris tunjangan lembur pada Kalkulator Payroll HO saat cut-off bulanan.
                      </p>
                    </div>
                    <Link
                      href="/hr/payroll/ho-calculator"
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shrink-0 transition"
                    >
                      Buka Kalkulator HO
                    </Link>
                  </div>
                </div>
              )}

              {activeModalTab === 'bpmn' && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px]">
                    <strong>Flowable BPMN 2.0 Live Viewer:</strong> Diagram alur persetujuan proses lembur. Node aktif dan riwayat persetujuan direkam otomatis di BPMN Engine.
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <BpmnViewerComponent xml={OVERTIME_REQUEST_BPMN_XML} height="340px" />
                  </div>
                </div>
              )}

              {/* HR Verification Action Panel (Active when Pending or for review) */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <span>✍️</span> Tindakan Verifikasi HR Department:
                </h4>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">
                    Catatan Verifikasi HR (Opsional):
                  </label>
                  <input
                    type="text"
                    value={hrNote}
                    onChange={(e) => setHrNote(e.target.value)}
                    placeholder="Contoh: Terverifikasi, output pekerjaan lembur sesuai jadwal."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {showRejectInput && (
                  <div className="space-y-1.5 bg-rose-50 p-3 rounded-xl border border-rose-200 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-bold text-rose-800">
                      Alasan Penolakan Lembur *:
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="Jelaskan alasan pengajuan lembur ini ditolak oleh HR..."
                      className="w-full px-3 py-2 border border-rose-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                  >
                    Tutup
                  </button>

                  {!showRejectInput ? (
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 transition"
                    >
                      ✕ Tolak Pengajuan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleHrDecision('Rejected')}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Memproses...' : 'Konfirmasi Tolak'}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleHrDecision('Approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>✓</span> {actionLoading ? 'Memproses...' : 'Setujui & Validasi HR'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
