'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  PageHeader,
  StatCard,
  SectionCard,
  DataTable,
  Tr,
  Td,
  StatusBadge,
  ActionButton,
  FormField,
  Input,
  Select,
  EmptyState,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { exportCsv } from '@/utils/exportCsv'
import { parseOvertimeDuration, calcHoOvertimeFee } from '@/lib/hoPayrollEngine'

const fmtRp = (num) => {
  const n = Math.round(Number(num) || 0)
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function HoPayrollCalculatorPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    range: { dateFrom: '', dateTo: '', label: '', workingDays: 22 },
    stats: {},
    employees: [],
    tables: {
      rekapPayroll: [],
      overtimes: [],
      halfDays: [],
      sickLeaves: [],
      unpaidLeaves: [],
      prorates: [],
    },
  })

  // Date filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [overrideWorkingDays, setOverrideWorkingDays] = useState('')
  const [activeTab, setActiveTab] = useState('rekap') // 'rekap' | 'lembur' | 'setengah' | 'sakit' | 'unpaid' | 'prorata'
  const [searchQuery, setSearchQuery] = useState('')
  const [actionMsg, setActionMsg] = useState(null)

  // Modal Overtime
  const [otModalOpen, setOtModalOpen] = useState(false)
  const [otSubmitting, setOtSubmitting] = useState(false)
  const [otForm, setOtForm] = useState({
    empId: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '18:00',
    endTime: '21:00',
    taskNote: '',
  })

  // Flash message
  const flash = (text, type = 'success') => {
    setActionMsg({ text, type })
    setTimeout(() => setActionMsg(null), 4000)
  }

  // Fetch Data
  const fetchData = async (from = dateFrom, to = dateTo, days = overrideWorkingDays) => {
    try {
      setLoading(true)
      let url = '/api/payroll/ho-calculator'
      const params = new URLSearchParams()
      if (from) params.set('dateFrom', from)
      if (to) params.set('dateTo', to)
      if (days) params.set('workingDays', days)

      const qs = params.toString()
      if (qs) url += `?${qs}`

      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setData(json)
        if (!dateFrom && json.range?.dateFrom) setDateFrom(json.range.dateFrom)
        if (!dateTo && json.range?.dateTo) setDateTo(json.range.dateTo)
        if (!overrideWorkingDays && json.range?.workingDays) {
          setOverrideWorkingDays(String(json.range.workingDays))
        }
      } else {
        flash(json.error || 'Gagal memuat kalkulator payroll HO', 'error')
      }
    } catch (err) {
      console.error(err)
      flash('Terjadi kesalahan jaringan.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handle Submit New Overtime
  const handleSubmitOvertime = async (e) => {
    e.preventDefault()
    if (!otForm.empId || !otForm.date || !otForm.startTime || !otForm.endTime) {
      flash('Karyawan, Tanggal, Jam Mulai, dan Selesai wajib diisi.', 'error')
      return
    }

    try {
      setOtSubmitting(true)
      const res = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...otForm,
          workingDays: Number(overrideWorkingDays) || data.range?.workingDays || 22,
        }),
      })
      const json = await res.json()
      if (json.success) {
        flash('Entri lembur berhasil disimpan!')
        setOtModalOpen(false)
        setOtForm({
          empId: '',
          date: new Date().toISOString().slice(0, 10),
          startTime: '18:00',
          endTime: '21:00',
          taskNote: '',
        })
        await fetchData(dateFrom, dateTo, overrideWorkingDays)
      } else {
        flash(json.error || 'Gagal menyimpan lembur.', 'error')
      }
    } catch (err) {
      flash('Terjadi kesalahan saat menyimpan lembur.', 'error')
    } finally {
      setOtSubmitting(false)
    }
  }

  // Handle Delete Overtime
  const handleDeleteOvertime = async (id) => {
    if (!confirm('Yakin ingin menghapus entri lembur ini?')) return
    try {
      const res = await fetch(`/api/overtime?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        flash('Entri lembur berhasil dihapus.')
        await fetchData(dateFrom, dateTo, overrideWorkingDays)
      } else {
        flash(json.error || 'Gagal menghapus entri.', 'error')
      }
    } catch (err) {
      flash('Gagal menghapus entri lembur.', 'error')
    }
  }

  // Live calculation preview in overtime modal
  const liveOtCalc = useMemo(() => {
    if (!otForm.empId || !otForm.startTime || !otForm.endTime) return null
    const empList = data.allEmployees?.length ? data.allEmployees : data.employees
    const emp = empList.find((e) => String(e.id || e.empId) === String(otForm.empId))
    if (!emp) return null
    const dur = parseOvertimeDuration(otForm.startTime, otForm.endTime)
    const loc = (emp.workLocationCode || emp.location || '').toLowerCase()
    const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')

    if (isGudang) {
      const d = new Date(otForm.date + 'T00:00:00')
      const isSunday = d.getDay() === 0
      const hourlyRate = isSunday ? 25000 : 15000
      const fee = Math.round(hourlyRate * dur.hours)
      return {
        isGudang: true,
        hours: dur.formattedHours,
        hourlyRate,
        fee,
        empName: emp.name,
        basicSalary: Math.round(Number(emp.salary || 0) * 0.75),
        dayTypeLabel: isSunday ? 'Minggu / Tanggal Merah (Rp 25.000/jam)' : 'Senin - Sabtu (Hari Kerja, Rp 15.000/jam)',
        ruleDesc: 'Aturan Gudang: Flat Rp 15.000/jam hari kerja, Rp 25.000/jam Minggu & Libur Nasional',
      }
    }

    const basicSalary = Number(emp.basicSalary || Math.round(Number(emp.salary || 0) * 0.75))
    const days = Number(overrideWorkingDays) || data.range?.workingDays || 22
    const fee = calcHoOvertimeFee(basicSalary, days, dur.hours)
    return {
      isGudang: false,
      hours: dur.formattedHours,
      hourlyRate: fee.hourlyRate,
      fee: fee.fee,
      empName: emp.name,
      basicSalary,
      dayTypeLabel: `Head Office (Gaji Pokok / ${days} hr / 8 jam)`,
      ruleDesc: 'Aturan HO: (Gaji Pokok / Hari Kerja / 8 Jam)',
    }
  }, [otForm, data.employees, data.allEmployees, overrideWorkingDays, data.range])

  // Filtered employees for table
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return data.employees
    const q = searchQuery.toLowerCase()
    return data.employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.nik && e.nik.toLowerCase().includes(q)) ||
        (e.dept && e.dept.toLowerCase().includes(q))
    )
  }, [data.employees, searchQuery])

  // Export CSV
  const handleExport = () => {
    if (activeTab === 'rekap') {
      const rows = data.employees.map((e, idx) => ({
        No: idx + 1,
        NIK: e.nik || '',
        Nama: e.name,
        Departemen: e.dept,
        'Gaji Gross': e.grossSalary,
        'Gaji Pokok (75%)': e.basicSalary,
        'Transport (15%)': e.transportAllowance,
        'Non Permanent Allowance (NPA - 10%)': e.nonPermanentAllowance ?? e.kpiAllowance,
        'Jam Lembur': e.totalOvertimeHours,
        'Uang Lembur (+)': e.totalOvertimeFee,
        'Potongan 1/2 Hari (-)': e.halfDayDeduction,
        'Potongan Sakit (-)': e.sickLeaveDeduction,
        'Potongan Unpaid (-)': e.unpaidLeaveDeduction,
        'Prorata Status': e.isProrated ? e.prorateReason : 'Penuh',
        'Gaji Prorata Dasar': e.proratedBaseGross,
        'Total Potongan': e.totalDeductions,
      }))
      exportCsv(rows, `HO_Payroll_Rekap_${data.range?.dateFrom}_${data.range?.dateTo}.csv`)
    } else if (activeTab === 'lembur') {
      const rows = (data.tables?.overtimes || []).map((o, idx) => ({
        No: idx + 1,
        Nama: o.employee?.name || '',
        Hari: o.dayName || '',
        Tanggal: o.date,
        'Jam Mulai': o.startTime,
        'Jam Selesai': o.endTime,
        'Total Jam': o.totalHours,
        'Rate / Jam': o.hourlyRate,
        'Total Fee': o.totalFee,
        Tugas: o.taskNote || '',
        Status: o.status,
      }))
      exportCsv(rows, `HO_Overtime_Rekap_${data.range?.dateFrom}_${data.range?.dateTo}.csv`)
    } else {
      flash('Gunakan tab Rekapitulasi atau Lembur untuk ekspor CSV.', 'info')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        icon="🏢"
        title="Kalkulator Payroll Head Office (HO)"
        subtitle="Eksekusi penuh 6 aturan payroll HO: Lembur, Setengah Hari, Cuti Sakit Prorata Transport, Unpaid Leave, dan Prorata Masuk/Keluar secara mandiri di PeopleHub."
      >
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            icon="⏱️"
            variant="primary"
            onClick={() => setOtModalOpen(true)}
          >
            + Input Lembur (HO & Gudang)
          </ActionButton>
          <ActionButton
            icon="📥"
            variant="secondary"
            onClick={handleExport}
          >
            Ekspor Spreadsheet
          </ActionButton>
        </div>
      </PageHeader>

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm border ${
            actionMsg.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : actionMsg.type === 'info'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-gray-500 hover:text-gray-700 ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Cut-Off Period & Working Days Selector Card */}
      <SectionCard className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Cut-Off Mulai" className="w-40">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </FormField>
            <FormField label="Cut-Off Selesai" className="w-40">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </FormField>
            <FormField label="Hari Kerja Cut-Off (Divisor)" className="w-36">
              <Input
                type="number"
                min="1"
                max="31"
                value={overrideWorkingDays}
                onChange={(e) => setOverrideWorkingDays(e.target.value)}
              />
            </FormField>
            <ActionButton
              icon="🔄"
              variant="secondary"
              onClick={() => fetchData(dateFrom, dateTo, overrideWorkingDays)}
              disabled={loading}
            >
              Hitung Ulang
            </ActionButton>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-gray-500">Periode: </span>
              <strong className="text-gray-800">{data.range?.label || '-'}</strong>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              <span className="text-gray-500">Hari Kerja HO: </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800">
                {data.range?.workingDays || 22} Hari
              </span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              <span className="text-gray-500">Libur Nasional: </span>
              <strong className="text-gray-800">{data.range?.totalHolidayDays || 0} Hari</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon="👥"
          tone="brand"
          label="Karyawan HO"
          value={data.stats?.totalEmployees || 0}
        />
        <StatCard
          icon="📅"
          tone="blue"
          label="Hari Kerja Efektif"
          value={`${data.stats?.workingDays || 22} Hari`}
        />
        <StatCard
          icon="⏱️"
          tone="green"
          label="Total Uang Lembur"
          value={fmtRp(data.stats?.totalOvertimeSum)}
        />
        <StatCard
          icon="🔻"
          tone="orange"
          label="Total Potongan HO"
          value={fmtRp(
            (data.stats?.totalHalfDayDeductionSum || 0) +
              (data.stats?.totalSickDeductionSum || 0) +
              (data.stats?.totalUnpaidDeductionSum || 0)
          )}
        />
        <StatCard
          icon="💰"
          tone="purple"
          label="Total Gross Salary HO"
          value={fmtRp(data.stats?.totalGrossSum)}
        />
      </div>

      {/* Tabs Navigation corresponding to Excel sheets */}
      <div className="flex border-b border-gray-200 space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'rekap'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📊</span> Rekapitulasi Payroll HO
        </button>
        <button
          onClick={() => setActiveTab('lembur')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'lembur'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>⏱️</span> 1. Perhitungan Lembur
        </button>
        <button
          onClick={() => setActiveTab('setengah')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'setengah'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🌓</span> 2. Setengah Hari
        </button>
        <button
          onClick={() => setActiveTab('sakit')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'sakit'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🩺</span> 3. Cuti Sakit (Sick Leave)
        </button>
        <button
          onClick={() => setActiveTab('unpaid')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'unpaid'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🚫</span> 4. Unpaid Leave / Potong Gaji
        </button>
        <button
          onClick={() => setActiveTab('prorata')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'prorata'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📅</span> 5 & 6. Join & Resign Tengah Bulan
        </button>
      </div>

      {/* TAB 1: REKAPITULASI PAYROLL HO */}
      {activeTab === 'rekap' && (
        <SectionCard
          title="Tabel Rekapitulasi Payroll Head Office"
          subtitle="Rincian komprehensif seluruh komponen gaji, lembur, dan potongan sesuai 6 aturan HO."
        >
          <div className="mb-4 max-w-sm">
            <Input
              placeholder="Cari nama karyawan / NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <DataTable
            columns={[
              { label: 'No', width: '50px' },
              { label: 'Karyawan' },
              { label: 'Total Gross', align: 'right' },
              { label: 'Gaji Pokok (75%)', align: 'right' },
              { label: 'Transport (15%)', align: 'right' },
              { label: 'NPA (10%)', align: 'right' },
              { label: 'Lembur (+)', align: 'right' },
              { label: '1/2 Hari (-)', align: 'right' },
              { label: 'Sakit (-)', align: 'right' },
              { label: 'Unpaid (-)', align: 'right' },
              { label: 'Prorata Status' },
            ]}
          >
            {filteredEmployees.map((e, idx) => (
              <Tr key={e.empId} className={e.name === 'Rama' ? 'bg-amber-50/50' : ''}>
                <Td className="text-gray-400 font-mono text-xs">{idx + 1}</Td>
                <Td>
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    {e.name}
                    {e.name === 'Rama' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                        Sampel Excel
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{e.nik || `ID: ${e.empId}`} · {e.position}</div>
                </Td>
                <Td align="right" className="font-semibold text-gray-900">{fmtRp(e.grossSalary)}</Td>
                <Td align="right" className="text-gray-600">{fmtRp(e.basicSalary)}</Td>
                <Td align="right" className="text-gray-600">{fmtRp(e.transportAllowance)}</Td>
                <Td align="right" className="text-gray-600">{fmtRp(e.nonPermanentAllowance ?? e.kpiAllowance)}</Td>
                <Td align="right" className="font-semibold text-emerald-600">
                  {e.totalOvertimeFee > 0 ? `+${fmtRp(e.totalOvertimeFee)}` : '-'}
                  {e.totalOvertimeHours > 0 && (
                    <div className="text-[10px] text-gray-400">{e.totalOvertimeHours} jam</div>
                  )}
                </Td>
                <Td align="right" className="text-red-600">
                  {e.halfDayDeduction > 0 ? `-${fmtRp(e.halfDayDeduction)}` : '-'}
                </Td>
                <Td align="right" className="text-red-600">
                  {e.sickLeaveDeduction > 0 ? `-${fmtRp(e.sickLeaveDeduction)}` : '-'}
                </Td>
                <Td align="right" className="text-red-600">
                  {e.unpaidLeaveDeduction > 0 ? `-${fmtRp(e.unpaidLeaveDeduction)}` : '-'}
                </Td>
                <Td>
                  {e.isProrated ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                      {e.prorateReason} ({e.activeDays}/{e.workingDays} hr)
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Penuh (100%)</span>
                  )}
                </Td>
              </Tr>
            ))}
          </DataTable>
        </SectionCard>
      )}

      {/* TAB 2: PERHITUNGAN LEMBUR (OVERTIME) */}
      {activeTab === 'lembur' && (
        <div className="space-y-6">
          <SectionCard
            title="PERHITUNGAN LEMBUR KARYAWAN (HO & GUDANG)"
            subtitle="Mendukung aturan lembur Head Office (berbasis proporsional gaji pokok) dan aturan lembur Gudang (flat rate hari kerja Rp 15.000/jam & Minggu/Libur Rp 25.000/jam)."
          >
            {/* Header Comparison Policy Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                  <span>🏢</span> Aturan Lembur Head Office (HO)
                </div>
                <div className="text-gray-700">Formula: <strong className="font-mono text-indigo-800">(Gaji Pokok / Hari Kerja Cut-off) / 8 Jam</strong></div>
                <div className="text-gray-600">Tarif per jam dihitung proporsional berbasis gaji pokok dan pembagi hari kerja cut-off.</div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                  <span>📦</span> Aturan Lembur Gudang (Warehouse)
                </div>
                <div className="text-gray-700">
                  Hari Kerja (Senin - Sabtu): <strong className="font-mono text-amber-900">Rp 15.000 / Jam</strong> (Flat)
                </div>
                <div className="text-gray-700">
                  Minggu & Tanggal Merah: <strong className="font-mono text-red-700">Rp 25.000 / Jam</strong> (Flat)
                </div>
                <div className="text-gray-600">Tarif flat berlaku untuk staf operasional gudang dan logistik.</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-amber-100 text-amber-900 font-bold border-b border-amber-200">
                    <th className="py-2.5 px-3">KARYAWAN</th>
                    <th className="py-2.5 px-3">LOKASI</th>
                    <th className="py-2.5 px-3">DAY</th>
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">START</th>
                    <th className="py-2.5 px-3">END</th>
                    <th className="py-2.5 px-3 text-right">TOTAL HOURS</th>
                    <th className="py-2.5 px-3 text-right">FEE PER HOUR</th>
                    <th className="py-2.5 px-3 text-right">TOTAL FEE</th>
                    <th className="py-2.5 px-3">TUGAS / CATATAN</th>
                    <th className="py-2.5 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.tables?.overtimes || []).map((ot) => {
                    const loc = (ot.employee?.workLocationCode || ot.employee?.location || '').toLowerCase()
                    const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')
                    return (
                      <tr key={ot.id} className="hover:bg-amber-50/40">
                        <td className="py-2.5 px-3 font-semibold text-gray-800">
                          {ot.employee?.name}
                        </td>
                        <td className="py-2.5 px-3">
                          {isGudang ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              📦 Gudang
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                              🏢 HO
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-medium">{ot.dayName || '-'}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700">{ot.date}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{ot.startTime}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{ot.endTime}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">
                          {ot.totalHours?.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-700">
                          {fmtRp(ot.hourlyRate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {fmtRp(ot.totalFee)}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 max-w-xs truncate">
                          {ot.taskNote || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDeleteOvertime(ot.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {(!data.tables?.overtimes || data.tables.overtimes.length === 0) && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-gray-400">
                        Belum ada entri lembur. Klik tombol <strong>+ Input Lembur (HO & Gudang)</strong> di atas untuk menambahkan data lembur karyawan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* TAB 3: PERHITUNGAN SETENGAH HARI */}
      {activeTab === 'setengah' && (
        <SectionCard
          title="PERHITUNGAN SETENGAH HARI"
          subtitle="Formula: Gaji Satu Hari = Total Salary Gross / Hari Kerja. Gaji Setengah Hari = Gaji Satu Hari / 2."
        >
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 font-medium">
            <span>ℹ️</span> Catatan Kebijakan: <strong>Seluruh komponen kena potongan</strong> (berbasis Total Salary Gross, bukan hanya gaji pokok).
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">NO</th>
                  <th className="py-2.5 px-3">NAMA</th>
                  <th className="py-2.5 px-3 text-right">TOTAL SALARY GROSS</th>
                  <th className="py-2.5 px-3 text-right">GAJI POKOK</th>
                  <th className="py-2.5 px-3 text-right">TUNJANGAN TRANSPORT</th>
                  <th className="py-2.5 px-3 text-right">TUNJANGAN TIDAK TETAP</th>
                  <th className="py-2.5 px-3 text-right">GAJI SATU HARI</th>
                  <th className="py-2.5 px-3 text-right bg-blue-50 text-blue-900">GAJI SETENGAH HARI</th>
                  <th className="py-2.5 px-3">KETERANGAN / KEBIJAKAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.tables?.halfDays || []).map((h, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30">
                    <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{h.name}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{fmtRp(h.salaryGross)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(h.basicSalary)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(h.transportAllowance)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(h.nonPermanentAllowance ?? h.kpiAllowance)}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-800">{fmtRp(h.fullDayRate)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600 bg-blue-50/50">
                      {fmtRp(h.halfDayRate)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-600">
                      {h.note} · <em>Seluruh komponen kena potongan</em>
                    </td>
                  </tr>
                ))}
                {(!data.tables?.halfDays || data.tables.halfDays.length === 0) && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      Tidak ada rekaman izin setengah hari pada periode cut-off ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* TAB 4: PERHITUNGAN SICK LEAVE */}
      {activeTab === 'sakit' && (
        <SectionCard
          title="PERHITUNGAN SICK LEAVE (CUTI SAKIT)"
          subtitle="Formula: HANYA Tunjangan Transport yang dipotong prorata per hari sakit. Gaji Pokok & Non Permanent Allowance (NPA) tetap dibayar penuh."
        >
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
            <div className="font-bold text-sm mb-1 text-emerald-900">📌 Ketentuan Mutlak Sick Leave:</div>
            <div>1. Wajib melampirkan Surat Sakit dari minimal <strong>HaloDoc, Puskesmas, dan Rumah Sakit</strong>.</div>
            <div>2. Wajib melampirkan di <strong>hari H</strong> ybs sakit.</div>
            <div>3. <strong>Tidak ada surat sakit akan otomatis dianggap Unpaid Leave</strong> (seluruh komponen kena potongan).</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">NO</th>
                  <th className="py-2.5 px-3">NAMA</th>
                  <th className="py-2.5 px-3 text-right">TOTAL SALARY GROSS</th>
                  <th className="py-2.5 px-3 text-right">GAJI POKOK (UTUH)</th>
                  <th className="py-2.5 px-3 text-right">TUNJANGAN TRANSPORT</th>
                  <th className="py-2.5 px-3 text-right">NON PERMANENT ALLOWANCE (NPA)</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-900">PRORATA TRANSPORT / HARI</th>
                  <th className="py-2.5 px-3 text-right text-red-600 font-bold">POTONGAN</th>
                  <th className="py-2.5 px-3">STATUS SURAT SAKIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.tables?.sickLeaves || []).map((s, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/30">
                    <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{fmtRp(s.salaryGross)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{fmtRp(s.basicSalary)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(s.transportAllowance)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(s.nonPermanentAllowance ?? s.kpiAllowance)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 bg-emerald-50/50">
                      {fmtRp(s.transportPerDay)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      -{fmtRp(s.deduction)}
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                        ✅ Sah di Hari H
                      </span>
                    </td>
                  </tr>
                ))}
                {(!data.tables?.sickLeaves || data.tables.sickLeaves.length === 0) && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      Tidak ada rekaman cuti sakit pada periode cut-off ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* TAB 5: PERHITUNGAN UNPAID LEAVE */}
      {activeTab === 'unpaid' && (
        <SectionCard
          title="PERHITUNGAN IZIN POTONG GAJI / UNPAID LEAVE"
          subtitle="Formula: Potongan Unpaid Leave 1 Hari = Total Salary Gross / Hari Kerja Cut-off. Seluruh komponen kena potongan."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">NO</th>
                  <th className="py-2.5 px-3">NAMA</th>
                  <th className="py-2.5 px-3 text-right">TOTAL SALARY GROSS</th>
                  <th className="py-2.5 px-3 text-right">GAJI POKOK</th>
                  <th className="py-2.5 px-3 text-right">TUNJANGAN TRANSPORT</th>
                  <th className="py-2.5 px-3 text-right">TUNJANGAN TIDAK TETAP</th>
                  <th className="py-2.5 px-3 text-right bg-red-50 text-red-900">POTONGAN UNPAID 1 HARI</th>
                  <th className="py-2.5 px-3 text-right font-bold text-red-600">TOTAL POTONGAN</th>
                  <th className="py-2.5 px-3">ALASAN / STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.tables?.unpaidLeaves || []).map((u, idx) => (
                  <tr key={idx} className="hover:bg-red-50/30">
                    <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{u.name}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{fmtRp(u.salaryGross)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(Math.round(u.salaryGross * 0.75))}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(Math.round(u.salaryGross * 0.15))}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{fmtRp(Math.round(u.salaryGross * 0.10))}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-700 bg-red-50/50">
                      {fmtRp(u.fullDayRate)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      -{fmtRp(u.deduction)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-600">
                      {u.reason} · <em>Seluruh komponen kena potongan</em>
                    </td>
                  </tr>
                ))}
                {(!data.tables?.unpaidLeaves || data.tables.unpaidLeaves.length === 0) && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      Tidak ada rekaman unpaid leave pada periode cut-off ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* TAB 6: JOIN & RESIGN PERTENGAHAN BULAN */}
      {activeTab === 'prorata' && (
        <SectionCard
          title="PERHITUNGAN KARYAWAN JOIN & RESIGN PERTENGAHAN BULAN"
          subtitle="Formula: Gaji Prorata = (Total Salary Gross / Hari Kerja Cut-Off) x Hari Kerja Aktif yang Dijalani."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">NO</th>
                  <th className="py-2.5 px-3">NAMA</th>
                  <th className="py-2.5 px-3">JENIS KASUS</th>
                  <th className="py-2.5 px-3 text-right">TOTAL SALARY GROSS</th>
                  <th className="py-2.5 px-3 text-center">HARI KERJA CUT-OFF</th>
                  <th className="py-2.5 px-3 text-center bg-amber-50 text-amber-900">HARI KERJA DIJALANI</th>
                  <th className="py-2.5 px-3">FORMULA PERHITUNGAN</th>
                  <th className="py-2.5 px-3 text-right font-bold text-indigo-700">TOTAL GAJI PRORATA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.tables?.prorates || []).map((p, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30">
                    <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">{fmtRp(p.salaryGross)}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-gray-700">{p.workingDays} Hari</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-900 bg-amber-50/50">
                      {p.activeWorkingDays} Hari
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-gray-600">
                      ({fmtRp(p.salaryGross)} / {p.workingDays}) × {p.activeWorkingDays}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-700 text-base">
                      {fmtRp(p.proratedGross)}
                    </td>
                  </tr>
                ))}
                {(!data.tables?.prorates || data.tables.prorates.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      Tidak ada karyawan join atau resign pertengahan bulan dalam periode cut-off ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* MODAL INPUT LEMBUR HO & GUDANG */}
      {otModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>⏱️</span> Input Entri Lembur Karyawan (HO & Gudang)
              </h3>
              <button
                onClick={() => setOtModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOvertime} className="space-y-4">
              <FormField label="Pilih Karyawan">
                <Select
                  value={otForm.empId}
                  onChange={(e) => setOtForm({ ...otForm, empId: e.target.value })}
                  required
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {(data.allEmployees?.length ? data.allEmployees : data.employees).map((e) => {
                    const loc = (e.workLocationCode || e.location || '').toLowerCase()
                    const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')
                    return (
                      <option key={e.id || e.empId} value={e.id || e.empId}>
                        {e.name} ({isGudang ? '📦 Gudang' : '🏢 HO'} · Gross: {fmtRp(e.salary || e.grossSalary)})
                      </option>
                    )
                  })}
                </Select>
              </FormField>

              <FormField label="Tanggal Lembur">
                <Input
                  type="date"
                  value={otForm.date}
                  onChange={(e) => setOtForm({ ...otForm, date: e.target.value })}
                  required
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Jam Mulai (HH:mm)">
                  <Input
                    type="time"
                    value={otForm.startTime}
                    onChange={(e) => setOtForm({ ...otForm, startTime: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Jam Selesai (HH:mm)">
                  <Input
                    type="time"
                    value={otForm.endTime}
                    onChange={(e) => setOtForm({ ...otForm, endTime: e.target.value })}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Uraian Tugas Lembur">
                <Input
                  placeholder="Misal: Bongkar muatan kontainer / Packing flash sale / Closing bulanan..."
                  value={otForm.taskNote}
                  onChange={(e) => setOtForm({ ...otForm, taskNote: e.target.value })}
                  required
                />
              </FormField>

              {/* Live Preview Calculation */}
              {liveOtCalc && (
                <div className={`p-4 rounded-xl space-y-1.5 text-xs border ${
                  liveOtCalc.isGudang
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                }`}>
                  <div className="font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      {liveOtCalc.isGudang ? '📦 Kalkulasi Lembur Gudang:' : '🏢 Kalkulasi Lembur HO:'}
                    </span>
                    <span className="font-mono font-bold">{liveOtCalc.hours} Jam</span>
                  </div>

                  {liveOtCalc.isGudang ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jenis Hari:</span>
                        <strong className="text-amber-900">{liveOtCalc.dayTypeLabel}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tarif Satuan:</span>
                        <strong className="text-indigo-700">{fmtRp(liveOtCalc.hourlyRate)}/jam</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gaji Pokok:</span>
                        <strong>{fmtRp(liveOtCalc.basicSalary)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rate / Jam ({data.range?.workingDays || 22} hr, 8 jam):</span>
                        <strong className="text-indigo-700">{fmtRp(liveOtCalc.hourlyRate)}/jam</strong>
                      </div>
                    </>
                  )}

                  <div className={`flex justify-between border-t pt-1 text-sm font-bold ${
                    liveOtCalc.isGudang ? 'border-amber-200' : 'border-indigo-200'
                  }`}>
                    <span>Total Uang Lembur:</span>
                    <span className="text-emerald-700">{fmtRp(liveOtCalc.fee)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => setOtModalOpen(false)}
                >
                  Batal
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={otSubmitting}
                >
                  {otSubmitting ? 'Menyimpan...' : 'Simpan Entri Lembur'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
