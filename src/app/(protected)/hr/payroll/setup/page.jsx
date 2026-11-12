'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  PageHeader,
  StatCard,
  DataTable,
  Tr,
  Td,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'

const LOCATION_LABELS = {
  ho: { label: 'Head Office (HO)', tone: 'bg-purple-50 text-purple-700 border-purple-200' },
  sales: { label: 'Area Sales (Others)', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  gudang: { label: 'Gudang', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  livestream: { label: 'Livestream (Manhattan)', tone: 'bg-teal-50 text-teal-700 border-teal-200' },
}

export default function PayrollSetupPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [stats, setStats] = useState({})
  const [config, setConfig] = useState({
    basicPercent: 75,
    transportPercent: 15,
    kpiPercent: 10,
    roundingStep: 1,
    locationRules: {},
  })
  const [departments, setDepartments] = useState([])

  // Filter States
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedWageStatus, setSelectedWageStatus] = useState('all') // 'all', 'with_wage', 'zero_wage'

  // Loading & Notification States
  const [syncingOdoo, setSyncingOdoo] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [inputWage, setInputWage] = useState('')
  const [enableTransportInput, setEnableTransportInput] = useState(true)
  const [enableKpiInput, setEnableKpiInput] = useState(true)
  const [savingWage, setSavingWage] = useState(false)

  // Config Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [configTab, setConfigTab] = useState('locations') // 'locations' | 'global'
  const [tempConfig, setTempConfig] = useState({
    basicPercent: 75,
    transportPercent: 15,
    kpiPercent: 10,
    roundingStep: 1,
    locationRules: {},
  })
  const [savingConfig, setSavingConfig] = useState(false)

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/payroll/salary-breakdown')
      const json = await res.json()
      if (json.success) {
        setData(json.data || [])
        setStats(json.stats || {})
        setConfig(json.config || {})
        setDepartments(json.departments || [])
      } else {
        setActionMsg({ type: 'error', text: json.error || 'Gagal memuat data komponen gaji.' })
      }
    } catch (err) {
      console.error(err)
      setActionMsg({ type: 'error', text: 'Gagal terhubung ke server.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Sync Wages from Odoo
  const handleSyncOdoo = async () => {
    try {
      setSyncingOdoo(true)
      setActionMsg(null)
      const res = await fetch('/api/payroll/salary-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_odoo' }),
      })
      const json = await res.json()
      if (json.success) {
        setActionMsg({
          type: 'success',
          text: json.message || 'Sinkronisasi Basic Salary dari Odoo Wage berhasil!',
        })
        fetchData()
      } else {
        setActionMsg({ type: 'error', text: json.error || 'Gagal sinkronisasi wage dari Odoo.' })
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: 'Terjadi kesalahan jaringan saat sync Odoo.' })
    } finally {
      setSyncingOdoo(false)
    }
  }

  // Open Edit Wage Modal for Single Employee
  const handleOpenEdit = (emp) => {
    setEditingEmp(emp)
    setInputWage(emp.basicSalary ? String(emp.basicSalary) : '')
    setEnableTransportInput(emp.enableTransport ?? true)
    setEnableKpiInput(emp.enableKpi ?? true)
    setEditModalOpen(true)
  }

  // Save Edit Wage & Employee Allowance Overrides
  const handleSaveWage = async (e) => {
    e.preventDefault()
    if (!editingEmp) return
    try {
      setSavingWage(true)
      const wageNum = Math.max(0, Number(inputWage.replace(/\D/g, '')) || 0)
      const res = await fetch('/api/payroll/salary-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_wage',
          empId: editingEmp.id,
          wage: wageNum,
          enableTransport: enableTransportInput,
          enableKpi: enableKpiInput,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setActionMsg({ type: 'success', text: json.message })
        setEditModalOpen(false)
        fetchData()
      } else {
        alert(json.error || 'Gagal menyimpan data karyawan')
      }
    } catch (err) {
      alert('Gagal menghubungi server')
    } finally {
      setSavingWage(false)
    }
  }

  // Open Config Modal
  const handleOpenConfig = () => {
    setTempConfig({
      ...config,
      locationRules: JSON.parse(JSON.stringify(config.locationRules || {})),
    })
    setConfigTab('locations')
    setConfigModalOpen(true)
  }

  // Save Config
  const handleSaveConfig = async (e) => {
    e.preventDefault()
    const b = Number(tempConfig.basicPercent) || 0
    const t = Number(tempConfig.transportPercent) || 0
    const k = Number(tempConfig.kpiPercent) || 0
    const step = Number(tempConfig.roundingStep) || 1
    const sum = Math.round((b + t + k) * 100) / 100

    if (sum !== 100) {
      alert(`Total persentase harus tepat 100%! (Saat ini: ${sum}%)`)
      return
    }

    try {
      setSavingConfig(true)
      const res = await fetch('/api/payroll/salary-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          basicPercent: b,
          transportPercent: t,
          kpiPercent: k,
          roundingStep: step,
          locationRules: tempConfig.locationRules,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setActionMsg({ type: 'success', text: json.message })
        setConfigModalOpen(false)
        fetchData()
      } else {
        alert(json.error || 'Gagal menyimpan konfigurasi')
      }
    } catch (err) {
      alert('Gagal menghubungi server')
    } finally {
      setSavingConfig(false)
    }
  }

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return data.filter((row) => {
      // Search
      if (search) {
        const q = search.toLowerCase()
        const matchesName = row.name.toLowerCase().includes(q)
        const matchesNik = row.nik.toLowerCase().includes(q)
        const matchesDept = (row.dept || '').toLowerCase().includes(q)
        if (!matchesName && !matchesNik && !matchesDept) return false
      }
      // Dept
      if (selectedDept !== 'all' && row.dept !== selectedDept) return false
      // Location
      if (selectedLocation !== 'all' && row.workLocationCode !== selectedLocation) return false
      // Wage Status
      if (selectedWageStatus === 'with_wage' && !row.hasOdooWage) return false
      if (selectedWageStatus === 'zero_wage' && row.hasOdooWage) return false

      return true
    })
  }, [data, search, selectedDept, selectedLocation, selectedWageStatus])

  // Count employees per location for badges in config modal
  const locationCounts = useMemo(() => {
    const counts = { ho: 0, sales: 0, gudang: 0, livestream: 0 }
    data.forEach((r) => {
      const loc = r.workLocationCode || 'ho'
      if (counts[loc] !== undefined) counts[loc]++
    })
    return counts
  }, [data])

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      alert('Tidak ada data untuk diekspor.')
      return
    }

    const headers = [
      'No',
      'NIK',
      'Nama Karyawan',
      'Odoo ID',
      'Departemen / Divisi',
      'Lokasi Kerja',
      `Basic Salary (${config.basicPercent}%) (Rp)`,
      `Transportation Allowance (${config.transportPercent}%) (Rp)`,
      `Non Permanent Allowance (${config.kpiPercent}%) (Rp)`,
      'GROSS SALARY (Rp)',
    ]

    const csvRows = filteredRows.map((r, i) => [
      i + 1,
      `"${r.nik}"`,
      `"${r.name}"`,
      r.odoo_id || '-',
      `"${r.dept || 'General'}"`,
      `"${r.location || 'Head Office'}"`,
      r.basicSalary,
      r.enableTransport ? r.transportAllowance : 0,
      r.enableKpi ? r.kpiAllowance : 0,
      r.grossSalary,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Salary_Breakdown_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Live calculation helper for edit modal
  const liveBasicNum = Math.max(0, Number(inputWage.replace(/\D/g, '')) || 0)
  const roundStep = (val, s = config.roundingStep || 1) => {
    if (!s || s <= 1) return Math.round(val)
    return Math.round(val / s) * s
  }
  const liveTransport = enableTransportInput
    ? roundStep(
        config.basicPercent > 0 ? (liveBasicNum * config.transportPercent) / config.basicPercent : 0,
        config.roundingStep
      )
    : 0
  const liveKpi = enableKpiInput
    ? roundStep(
        config.basicPercent > 0 ? (liveBasicNum * config.kpiPercent) / config.basicPercent : 0,
        config.roundingStep
      )
    : 0
  const liveGross = liveBasicNum + liveTransport + liveKpi

  return (
    <div className="space-y-5 pb-16">
      {/* Page Header */}
      <PageHeader
        icon="🧾"
        title="Payroll Setup: Komponen Gaji Karyawan"
        subtitle={`Basic Salary (${config.basicPercent}%) bersumber dari Wage Odoo. Tunjangan Transportasi & Non Permanent Allowance (NPA) dapat diatur per Work Location dan per Karyawan Tertentu.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncOdoo}
              disabled={syncingOdoo || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
              title="Tarik data Wage (Basic Salary 75%) dari tab Payroll hr.version di Odoo"
            >
              <Icon e={syncingOdoo ? '⏳' : '🔄'} size={14} />
              <span>{syncingOdoo ? 'Sinkronisasi Wage...' : 'Sync Wage dari Odoo'}</span>
            </button>

            <button
              onClick={handleOpenConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              title="Atur hak tunjangan per lokasi kerja dan rasio persentase komponen gaji"
            >
              <Icon e="⚙️" size={14} />
              <span>Aturan Lokasi & Rasio Gaji</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer disabled:opacity-50"
              title="Unduh data dalam format CSV / Excel"
            >
              <Icon e="📥" size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* Action Notification Alert */}
      {actionMsg && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg text-xs font-medium ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMsg.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Karyawan"
          value={stats.totalEmployees || 0}
          icon="👥"
          tone="brand"
        />
        <StatCard
          title="Ada Wage Odoo"
          value={stats.withWageCount || 0}
          icon="💼"
          tone="green"
        />
        <StatCard
          title={`Basic (${config.basicPercent}%)`}
          value={`Rp ${((stats.totalBasic || 0) / 1000000).toFixed(1)}M`}
          icon="🏛️"
          tone="blue"
        />
        <StatCard
          title={`Transport (${config.transportPercent}%)`}
          value={`Rp ${((stats.totalTransport || 0) / 1000000).toFixed(1)}M`}
          icon="🚗"
          tone="orange"
        />
        <StatCard
          title={`NPA (${config.kpiPercent}%)`}
          value={`Rp ${((stats.totalKpi || 0) / 1000000).toFixed(1)}M`}
          icon="🎯"
          tone="teal"
        />
        <StatCard
          title="Total Gross Salary"
          value={`Rp ${((stats.totalGross || 0) / 1000000).toFixed(1)}M`}
          icon="💰"
          tone="purple"
        />
      </div>

      {/* Search & Filters Card */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[320px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <Icon e="🔍" size={13} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIK, atau divisi..."
              className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-teal-600"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-gray-500">Divisi:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 bg-white"
            >
              <option value="all">Semua Divisi ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Work Location Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-gray-500">Lokasi:</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 bg-white"
            >
              <option value="all">Semua Lokasi</option>
              <option value="ho">Head Office (HO)</option>
              <option value="gudang">Gudang</option>
              <option value="sales">Area Sales</option>
              <option value="livestream">Livestream (Manhattan)</option>
            </select>
          </div>

          {/* Wage Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-gray-500">Status Wage:</label>
            <select
              value={selectedWageStatus}
              onChange={(e) => setSelectedWageStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="with_wage">Memiliki Wage Odoo (&gt; 0)</option>
              <option value="zero_wage">Belum Diatur (Rp 0)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Menampilkan <strong className="text-gray-900">{filteredRows.length}</strong> dari {data.length} karyawan
        </div>
      </div>

      {/* Main Breakdown Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
            <div>Memuat data komponen gaji karyawan...</div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            <div className="text-3xl mb-2">🔍</div>
            <div>Tidak ada karyawan yang sesuai kriteria pencarian / filter.</div>
          </div>
        ) : (
          <DataTable
            columns={[
              { label: 'No', width: '45px' },
              { label: 'Karyawan (NIK / Odoo ID)' },
              { label: 'Divisi & Lokasi Kerja' },
              { label: `Basic Salary (${config.basicPercent}%)`, align: 'right' },
              { label: `Transportation Allowance (${config.transportPercent}%)`, align: 'right' },
              { label: `Non Permanent / NPA (${config.kpiPercent}%)`, align: 'right' },
              { label: 'GROSS SALARY', align: 'right' },
              { label: 'Aksi', align: 'center', width: '70px' },
            ]}
          >
            {filteredRows.map((r, idx) => {
              const initials = r.name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()

              const locMeta = LOCATION_LABELS[r.workLocationCode] || {
                label: r.location || 'Head Office',
                tone: 'bg-gray-50 text-gray-600 border-gray-200',
              }

              return (
                <Tr key={r.id}>
                  {/* No */}
                  <Td className="text-xs text-gray-400 font-mono">{idx + 1}</Td>

                  {/* Karyawan */}
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                          <span>{r.name}</span>
                          {r.odoo_id ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 font-mono font-medium">
                              #{r.odoo_id}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-gray-100 text-gray-400">
                              Non-Odoo
                            </span>
                          )}
                          {r.isOverridden && (
                            <span
                              className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold"
                              title="Tunjangan karyawan ini memiliki pengaturan khusus (override)"
                            >
                              Khusus
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">{r.nik}</div>
                      </div>
                    </div>
                  </Td>

                  {/* Divisi & Lokasi Kerja */}
                  <Td>
                    <div className="text-xs font-medium text-gray-800">{r.dept}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${locMeta.tone}`}>
                        {locMeta.label}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{r.position}</span>
                    </div>
                  </Td>

                  {/* Basic Salary (75%) - Odoo Wage */}
                  <Td align="right">
                    {r.hasOdooWage ? (
                      <div>
                        <div className="text-xs font-bold text-blue-900 font-mono">
                          Rp {r.basicSalary.toLocaleString('id-ID')}
                        </div>
                        <span className="inline-block text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                          Wage Odoo
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-gray-400 font-mono">Rp 0</div>
                        <span className="inline-block text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.2 rounded">
                          Belum Diatur
                        </span>
                      </div>
                    )}
                  </Td>

                  {/* Transportation Allowance (15%) */}
                  <Td align="right">
                    {r.enableTransport ? (
                      <span
                        className={`text-xs font-mono font-medium ${
                          r.transportAllowance > 0 ? 'text-amber-700 font-semibold' : 'text-gray-400'
                        }`}
                      >
                        Rp {r.transportAllowance.toLocaleString('id-ID')}
                      </span>
                    ) : (
                      <div>
                        <span className="text-xs text-gray-400 font-mono">Rp 0</span>
                        <div>
                          <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                            Nonaktif
                          </span>
                        </div>
                      </div>
                    )}
                  </Td>

                  {/* KPI Allowance (10%) */}
                  <Td align="right">
                    {r.enableKpi ? (
                      <span
                        className={`text-xs font-mono font-medium ${
                          r.kpiAllowance > 0 ? 'text-teal-700 font-semibold' : 'text-gray-400'
                        }`}
                      >
                        Rp {r.kpiAllowance.toLocaleString('id-ID')}
                      </span>
                    ) : (
                      <div>
                        <span className="text-xs text-gray-400 font-mono">Rp 0</span>
                        <div>
                          <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                            Nonaktif
                          </span>
                        </div>
                      </div>
                    )}
                  </Td>

                  {/* GROSS SALARY (Total 100%) */}
                  <Td align="right">
                    {r.hasOdooWage ? (
                      <div>
                        <div className="text-xs font-bold text-gray-900 font-mono">
                          Rp {r.grossSalary.toLocaleString('id-ID')}
                        </div>
                        <span className="inline-block text-[9px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                          Total
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-mono">Rp 0</span>
                    )}
                  </Td>

                  {/* Aksi */}
                  <Td align="center">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-teal-700 hover:bg-teal-50 transition cursor-pointer"
                      title="Koreksi Wage & Hak Tunjangan"
                    >
                      <Icon e="✏️" size={13} />
                    </button>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </div>

      {/* Modal Edit Basic Wage & Hak Tunjangan Karyawan */}
      {editModalOpen && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
            >
              <div className="flex items-center gap-2">
                <Icon e="✏️" size={16} />
                <h3 className="font-bold text-sm">Koreksi Basic Salary & Hak Tunjangan</h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWage} className="p-5 space-y-4">
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <span>{editingEmp.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-mono">
                    {LOCATION_LABELS[editingEmp.workLocationCode]?.label || editingEmp.location}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {editingEmp.nik} • {editingEmp.dept}
                </div>
              </div>

              {/* Input Basic Salary */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Basic Salary (Wage Odoo Tab Payroll) ({config.basicPercent}%) (Rp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-xs font-semibold">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={inputWage ? Number(inputWage.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                    onChange={(e) => setInputWage(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 9.337.500"
                    className="w-full text-sm font-bold border border-gray-200 rounded-lg pl-9 pr-3 py-2 font-mono focus:outline-teal-600"
                    required
                  />
                </div>
              </div>

              {/* Checklist Hak Tunjangan Karyawan Ini */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 space-y-2.5">
                <div className="text-xs font-bold text-gray-800">Hak Tunjangan Karyawan Ini:</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTransportInput}
                      onChange={(e) => setEnableTransportInput(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span>
                      Dapat <strong>Transportation Allowance</strong> ({config.transportPercent}%)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableKpiInput}
                      onChange={(e) => setEnableKpiInput(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span>
                      Dapat <strong>Non Permanent Allowance (NPA)</strong> ({config.kpiPercent}%)
                    </span>
                  </label>
                </div>
              </div>

              {/* Live Preview Breakdown */}
              <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 space-y-2">
                <div className="text-[11px] font-bold text-purple-900">Hasil Simulasi Gaji Karyawan Ini:</div>
                <div className="grid grid-cols-3 gap-2 text-center mb-1">
                  <div className="p-2 bg-white rounded border border-gray-100">
                    <div className="text-[10px] text-gray-500 font-medium">Basic ({config.basicPercent}%)</div>
                    <div className="text-xs font-bold text-blue-700 font-mono mt-0.5">
                      Rp {liveBasicNum.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-100">
                    <div className="text-[10px] text-gray-500 font-medium">Transport</div>
                    <div className={`text-xs font-bold font-mono mt-0.5 ${enableTransportInput ? 'text-amber-700' : 'text-gray-400'}`}>
                      {enableTransportInput ? `Rp ${liveTransport.toLocaleString('id-ID')}` : 'Rp 0'}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-100">
                    <div className="text-[10px] text-gray-500 font-medium">NPA (10%)</div>
                    <div className={`text-xs font-bold font-mono mt-0.5 ${enableKpiInput ? 'text-teal-700' : 'text-gray-400'}`}>
                      {enableKpiInput ? `Rp ${liveKpi.toLocaleString('id-ID')}` : 'Rp 0'}
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-purple-100/60 rounded flex items-center justify-between text-xs font-bold text-purple-950">
                  <span>GROSS SALARY:</span>
                  <span className="font-mono text-sm">Rp {liveGross.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingWage}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                >
                  {savingWage ? 'Menyimpan...' : 'Simpan Data Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfigurasi Rasio, Aturan Lokasi Kerja, & Pembulatan */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
            >
              <div className="flex items-center gap-2">
                <Icon e="⚙️" size={16} />
                <h3 className="font-bold text-sm">Pengaturan Komponen Gaji & Aturan Lokasi</h3>
              </div>
              <button onClick={() => setConfigModalOpen(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setConfigTab('locations')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
                  configTab === 'locations'
                    ? 'border-teal-600 text-teal-800 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>📍 Aturan Per Lokasi Kerja (Work Location)</span>
              </button>
              <button
                type="button"
                onClick={() => setConfigTab('global')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
                  configTab === 'global'
                    ? 'border-teal-600 text-teal-800 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>⚙️ Default Global (Perhitungan Riil)</span>
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {configTab === 'locations' ? (
                <div className="space-y-3.5">
                  <p className="text-xs text-gray-600">
                    Atur hak tunjangan default untuk masing-masing lokasi kerja. Karyawan yang ditempatkan pada lokasi tersebut akan mengikuti aturan ini kecuali di-override secara individu.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* HO */}
                    <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900">Head Office (HO)</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                          {locationCounts.ho || 0} Karyawan
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.ho?.enableTransport ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  ho: { ...tempConfig.locationRules?.ho, enableTransport: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Transport Allowance</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.ho?.enableKpi ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  ho: { ...tempConfig.locationRules?.ho, enableKpi: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Non Permanent Allowance (NPA)</span>
                        </label>
                      </div>
                    </div>

                    {/* Gudang */}
                    <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900">Gudang (Warehouse)</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          {locationCounts.gudang || 0} Karyawan
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.gudang?.enableTransport ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  gudang: { ...tempConfig.locationRules?.gudang, enableTransport: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Transport Allowance</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.gudang?.enableKpi ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  gudang: { ...tempConfig.locationRules?.gudang, enableKpi: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Non Permanent Allowance (NPA)</span>
                        </label>
                      </div>
                    </div>

                    {/* Sales */}
                    <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">Area Sales (Others)</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                          {locationCounts.sales || 0} Karyawan
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.sales?.enableTransport ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  sales: { ...tempConfig.locationRules?.sales, enableTransport: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Transport Allowance</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.sales?.enableKpi ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  sales: { ...tempConfig.locationRules?.sales, enableKpi: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Non Permanent Allowance (NPA)</span>
                        </label>
                      </div>
                    </div>

                    {/* Livestream */}
                    <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-900">Livestream (Manhattan)</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                          {locationCounts.livestream || 0} Karyawan
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.livestream?.enableTransport ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  livestream: { ...tempConfig.locationRules?.livestream, enableTransport: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Transport Allowance</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempConfig.locationRules?.livestream?.enableKpi ?? true}
                            onChange={(e) =>
                              setTempConfig({
                                ...tempConfig,
                                locationRules: {
                                  ...tempConfig.locationRules,
                                  livestream: { ...tempConfig.locationRules?.livestream, enableKpi: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span>Dapat Non Permanent Allowance (NPA)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Tentukan rasio persentase standar komponen gaji. Nilai dari tab Payroll di Odoo diperlakukan sebagai <strong>Basic Salary ({tempConfig.basicPercent}%)</strong>. Seluruh tunjangan dihitung secara riil (eksak) tanpa pembulatan ratusan/ribuan.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Basic Salary */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Basic Salary (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={tempConfig.basicPercent}
                        onChange={(e) => setTempConfig({ ...tempConfig, basicPercent: Number(e.target.value) })}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-teal-600 font-mono"
                        required
                      />
                    </div>

                    {/* Transportation Allowance */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Transport Allowance (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={tempConfig.transportPercent}
                        onChange={(e) => setTempConfig({ ...tempConfig, transportPercent: Number(e.target.value) })}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-teal-600 font-mono"
                        required
                      />
                    </div>

                    {/* Non Permanent Allowance */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        NPA / Non Permanent (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={tempConfig.kpiPercent}
                        onChange={(e) => setTempConfig({ ...tempConfig, kpiPercent: Number(e.target.value) })}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-teal-600 font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Metode Perhitungan Riil (Tanpa Pembulatan) */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-emerald-950 block">Metode Perhitungan Nominal:</span>
                      <span className="text-emerald-800 text-[11px]">
                        Dihitung secara riil (eksak) per Rupiah tanpa pembulatan kelipatan ratusan/ribuan.
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-[11px] shrink-0 self-start sm:self-auto">
                      ✅ Perhitungan Riil (Aktif)
                    </span>
                  </div>

                  {/* Total Verification */}
                  {(() => {
                    const total =
                      (Number(tempConfig.basicPercent) || 0) +
                      (Number(tempConfig.transportPercent) || 0) +
                      (Number(tempConfig.kpiPercent) || 0)
                    const isValid = total === 100
                    return (
                      <div
                        className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                          isValid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        <span>Total Alokasi Rasio:</span>
                        <span>
                          {total}% {isValid ? '✅ (Valid 100%)' : `❌ (Kurang/Lebih ${total - 100}%)`}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    savingConfig ||
                    (Number(tempConfig.basicPercent) || 0) +
                      (Number(tempConfig.transportPercent) || 0) +
                      (Number(tempConfig.kpiPercent) || 0) !==
                      100
                  }
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                >
                  {savingConfig ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
