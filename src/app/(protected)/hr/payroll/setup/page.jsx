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
    components: [],
    basicPercent: 75,
    transportPercent: 15,
    kpiPercent: 10,
    roundingStep: 1,
    locationRules: {},
  })
  const [poolCatalog, setPoolCatalog] = useState([])
  const [departments, setDepartments] = useState([])

  // Filter States
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedWageStatus, setSelectedWageStatus] = useState('all') // 'all', 'with_wage', 'zero_wage'

  // Loading & Notification States
  const [syncingOdoo, setSyncingOdoo] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  // Modals - Edit Karyawan Individu
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [inputWage, setInputWage] = useState('')
  const [componentOverridesInput, setComponentOverridesInput] = useState({})
  const [enableTransportInput, setEnableTransportInput] = useState(true)
  const [enableKpiInput, setEnableKpiInput] = useState(true)
  const [savingWage, setSavingWage] = useState(false)

  // Config Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [configTab, setConfigTab] = useState('locations') // 'locations' | 'global'
  const [tempConfig, setTempConfig] = useState({
    components: [],
    basicPercent: 75,
    transportPercent: 15,
    kpiPercent: 10,
    roundingStep: 1,
    locationRules: {},
  })
  const [savingConfig, setSavingConfig] = useState(false)

  // Modal Tambah Komponen dari Pool Odoo
  const [addComponentModalOpen, setAddComponentModalOpen] = useState(false)
  const [newCompPoolCode, setNewCompPoolCode] = useState('MEAL')
  const [newCompName, setNewCompName] = useState('')
  const [newCompPercent, setNewCompPercent] = useState(10)
  const [newCompSickDeductible, setNewCompSickDeductible] = useState(false)

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
        setPoolCatalog(json.poolCatalog || [])
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

    // Siapkan checklist hak tunjangan dinamis untuk seluruh komponen non-base
    const activeNonBase = (config.components || []).filter((c) => !c.isBase)
    const initialOverrides = {}
    activeNonBase.forEach((c) => {
      const item = emp.items?.[c.code]
      if (item) {
        initialOverrides[c.code] = item.enabled
      } else if (c.code === 'TRANS') {
        initialOverrides[c.code] = emp.enableTransport ?? true
      } else if (c.code === 'NPA') {
        initialOverrides[c.code] = emp.enableNonPermanent ?? emp.enableKpi ?? true
      } else {
        initialOverrides[c.code] = true
      }
    })
    setComponentOverridesInput(initialOverrides)
    setEnableTransportInput(initialOverrides['TRANS'] ?? true)
    setEnableKpiInput(initialOverrides['NPA'] ?? true)
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
          componentOverrides: componentOverridesInput,
          enableTransport: componentOverridesInput['TRANS'] ?? true,
          enableKpi: componentOverridesInput['NPA'] ?? true,
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
      components: JSON.parse(JSON.stringify(config.components || [])),
      locationRules: JSON.parse(JSON.stringify(config.locationRules || {})),
    })
    setConfigTab('global')
    setConfigModalOpen(true)
  }

  // Save Config
  const handleSaveConfig = async (e) => {
    e.preventDefault()
    const comps = tempConfig.components || []
    const sum = Math.round(comps.reduce((acc, c) => acc + (Number(c.percent) || 0), 0) * 100) / 100

    if (sum !== 100) {
      alert(`Total persentase komponen harus tepat 100%! (Saat ini: ${sum}%)`)
      return
    }

    const baseComp = comps.find((c) => c.isBase)
    if (!baseComp || Number(baseComp.percent) <= 0) {
      alert('Komponen dasar (Basic Salary) harus memiliki rasio persentase > 0%')
      return
    }

    try {
      setSavingConfig(true)
      const res = await fetch('/api/payroll/salary-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          components: comps,
          basicPercent: Number(baseComp.percent),
          roundingStep: Number(tempConfig.roundingStep) || 1,
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

  // Buka modal tambah komponen dari pool Odoo
  const handleOpenAddCompModal = () => {
    const existingCodes = (tempConfig.components || []).map((c) => c.code)
    const availablePool = poolCatalog.filter((p) => !existingCodes.includes(p.code))
    const firstPool = availablePool[0] || poolCatalog[0] || { code: 'OTHER_ALW', name: 'Other Allowance' }
    setNewCompPoolCode(firstPool.code)
    setNewCompName(firstPool.name)
    setNewCompPercent(5)
    setNewCompSickDeductible(Boolean(firstPool.isSickDeductible))
    setAddComponentModalOpen(true)
  }

  // Tambahkan komponen terpilih ke tempConfig.components
  const handleAddCompConfirm = (e) => {
    e.preventDefault()
    const poolItem = poolCatalog.find((p) => p.code === newCompPoolCode) || {
      code: newCompPoolCode,
      name: newCompName,
      odooRuleCode: newCompPoolCode,
      odooInputCode: newCompPoolCode.toLowerCase(),
    }

    const newComp = {
      id: `comp_${poolItem.code.toLowerCase()}_${Date.now()}`,
      code: poolItem.code,
      name: (newCompName || poolItem.name).trim(),
      percent: Math.max(0, Number(newCompPercent) || 0),
      isBase: false,
      isRemovable: true,
      isSickDeductible: newCompSickDeductible,
      odooRuleCode: poolItem.odooRuleCode || poolItem.code,
      odooInputCode: poolItem.odooInputCode || poolItem.code.toLowerCase(),
    }

    const updatedComps = [...(tempConfig.components || []), newComp]

    // Otomatis aktifkan di seluruh locationRules
    const updatedLocationRules = { ...(tempConfig.locationRules || {}) }
    for (const [locKey, locRule] of Object.entries(updatedLocationRules)) {
      const currentCodes = Array.isArray(locRule.enabledComponentCodes) ? [...locRule.enabledComponentCodes] : ['TRANS', 'NPA']
      if (!currentCodes.includes(poolItem.code)) {
        currentCodes.push(poolItem.code)
      }
      updatedLocationRules[locKey] = {
        ...locRule,
        enabledComponentCodes: currentCodes,
      }
    }

    setTempConfig({
      ...tempConfig,
      components: updatedComps,
      locationRules: updatedLocationRules,
    })

    setAddComponentModalOpen(false)
  }

  // Hapus komponen dari tempConfig.components (non-base only)
  const handleRemoveComp = (codeToRemove) => {
    const updatedComps = (tempConfig.components || []).filter((c) => c.code !== codeToRemove)
    const updatedLocationRules = { ...(tempConfig.locationRules || {}) }
    for (const [locKey, locRule] of Object.entries(updatedLocationRules)) {
      if (Array.isArray(locRule.enabledComponentCodes)) {
        updatedLocationRules[locKey] = {
          ...locRule,
          enabledComponentCodes: locRule.enabledComponentCodes.filter((c) => c !== codeToRemove),
        }
      }
    }
    setTempConfig({
      ...tempConfig,
      components: updatedComps,
      locationRules: updatedLocationRules,
    })
  }

  // Update persentase komponen
  const handleUpdateCompPercent = (code, newPercent) => {
    const num = Math.max(0, Math.min(100, Number(newPercent) || 0))
    const updatedComps = (tempConfig.components || []).map((c) => (c.code === code ? { ...c, percent: num } : c))
    setTempConfig({
      ...tempConfig,
      components: updatedComps,
    })
  }

  // Toggle sick deductible flag
  const handleToggleCompSick = (code) => {
    const updatedComps = (tempConfig.components || []).map((c) =>
      c.code === code ? { ...c, isSickDeductible: !c.isSickDeductible } : c
    )
    setTempConfig({
      ...tempConfig,
      components: updatedComps,
    })
  }

  // Active dynamic components
  const activeComponents = useMemo(() => {
    if (Array.isArray(config.components) && config.components.length > 0) {
      return config.components
    }
    return [
      { id: 'comp_basic', code: 'BASIC', name: 'Basic Salary (Gaji Pokok)', percent: config.basicPercent || 75, isBase: true },
      { id: 'comp_trans', code: 'TRANS', name: 'Transport Allowance', percent: config.transportPercent || 15, isBase: false, isSickDeductible: true },
      { id: 'comp_npa', code: 'NPA', name: 'Non Permanent Allowance', percent: config.kpiPercent || 10, isBase: false },
    ]
  }, [config.components, config.basicPercent, config.transportPercent, config.kpiPercent])

  const baseComponent = useMemo(() => activeComponents.find((c) => c.isBase) || activeComponents[0], [activeComponents])
  const nonBaseComponents = useMemo(() => activeComponents.filter((c) => !c.isBase), [activeComponents])

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
      `Basic Salary (${baseComponent?.percent || 75}%) (Rp)`,
      ...nonBaseComponents.map((c) => `"${c.name} (${c.percent}%) (Rp)"`),
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
      ...nonBaseComponents.map((c) => {
        const item = r.items?.[c.code]
        if (item) return item.enabled ? item.amount : 0
        if (c.code === 'TRANS') return r.enableTransport ? r.transportAllowance : 0
        if (c.code === 'NPA') return r.enableKpi ? r.kpiAllowance : 0
        return 0
      }),
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

  const liveBreakdown = useMemo(() => {
    const baseP = Number(baseComponent?.percent) || 75
    const liveItems = {}
    let totalGross = liveBasicNum

    nonBaseComponents.forEach((c) => {
      const isEnabled = componentOverridesInput[c.code] ?? true
      const raw = isEnabled && liveBasicNum > 0 && baseP > 0 ? (liveBasicNum * Number(c.percent)) / baseP : 0
      const amt = isEnabled && liveBasicNum > 0 ? roundStep(raw, config.roundingStep) : 0
      liveItems[c.code] = {
        name: c.name,
        percent: c.percent,
        amount: amt,
        enabled: isEnabled,
      }
      if (isEnabled) totalGross += amt
    })

    return { liveItems, totalGross }
  }, [liveBasicNum, baseComponent, nonBaseComponents, componentOverridesInput, config.roundingStep])

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
          title={`Basic (${baseComponent?.percent || 75}%)`}
          value={`Rp ${((stats.totalBasic || 0) / 1000000).toFixed(1)}M`}
          icon="🏛️"
          tone="blue"
        />
        {nonBaseComponents.slice(0, 3).map((c, i) => {
          const tot = stats.componentTotals?.[c.code] ?? (c.code === 'TRANS' ? stats.totalTransport : stats.totalNonPermanent || 0)
          const tones = ['orange', 'teal', 'amber']
          const icons = ['🚗', '🎯', '🍱']
          return (
            <StatCard
              key={c.code}
              title={`${c.name.split(' ')[0]} (${c.percent}%)`}
              value={`Rp ${((tot || 0) / 1000000).toFixed(1)}M`}
              icon={icons[i % icons.length]}
              tone={tones[i % tones.length]}
            />
          )
        })}
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
              { label: `${baseComponent?.name || 'Basic Salary'} (${baseComponent?.percent || 75}%)`, align: 'right' },
              ...nonBaseComponents.map((c) => ({
                label: `${c.name} (${c.percent}%)`,
                align: 'right',
              })),
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

                  {/* Basic Salary */}
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

                  {/* Dynamic Non-Base Allowances */}
                  {nonBaseComponents.map((c) => {
                    const compItem = r.items?.[c.code]
                    const isEnabled = compItem ? compItem.enabled : (c.code === 'TRANS' ? r.enableTransport : r.enableKpi)
                    const amount = compItem ? compItem.amount : (c.code === 'TRANS' ? r.transportAllowance : r.nonPermanentAllowance || 0)

                    return (
                      <Td key={c.code} align="right">
                        {isEnabled ? (
                          <span
                            className={`text-xs font-mono font-medium ${
                              amount > 0 ? 'text-amber-800 font-semibold' : 'text-gray-400'
                            }`}
                          >
                            Rp {amount.toLocaleString('id-ID')}
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
                    )
                  })}

                  {/* GROSS SALARY */}
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
                  Basic Salary (Wage Odoo Tab Payroll) ({baseComponent?.percent || 75}%) (Rp)
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

              {/* Checklist Hak Tunjangan Dinamis Karyawan Ini */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 space-y-2.5">
                <div className="text-xs font-bold text-gray-800">Hak Tunjangan Karyawan Ini:</div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {nonBaseComponents.map((c) => {
                    const isChecked = componentOverridesInput[c.code] ?? true
                    return (
                      <label key={c.code} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setComponentOverridesInput({
                              ...componentOverridesInput,
                              [c.code]: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span>
                          Dapat <strong>{c.name}</strong> ({c.percent}%)
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Live Preview Breakdown Dinamis */}
              <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 space-y-2">
                <div className="text-[11px] font-bold text-purple-900">Hasil Simulasi Gaji Karyawan Ini:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center mb-1">
                  <div className="p-2 bg-white rounded border border-gray-100">
                    <div className="text-[10px] text-gray-500 font-medium truncate">Basic ({baseComponent?.percent || 75}%)</div>
                    <div className="text-xs font-bold text-blue-700 font-mono mt-0.5">
                      Rp {liveBasicNum.toLocaleString('id-ID')}
                    </div>
                  </div>
                  {nonBaseComponents.map((c) => {
                    const item = liveBreakdown.liveItems[c.code]
                    return (
                      <div key={c.code} className="p-2 bg-white rounded border border-gray-100">
                        <div className="text-[10px] text-gray-500 font-medium truncate" title={c.name}>
                          {c.name} ({c.percent}%)
                        </div>
                        <div
                          className={`text-xs font-bold font-mono mt-0.5 ${
                            item?.enabled ? 'text-amber-800' : 'text-gray-400'
                          }`}
                        >
                          {item?.enabled ? `Rp ${item.amount.toLocaleString('id-ID')}` : 'Rp 0'}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="p-2 bg-purple-100/60 rounded flex items-center justify-between text-xs font-bold text-purple-950">
                  <span>GROSS SALARY:</span>
                  <span className="font-mono text-sm">Rp {liveBreakdown.totalGross.toLocaleString('id-ID')}</span>
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
                    {[
                      { key: 'ho', label: 'Head Office (HO)', tone: 'border-purple-200 bg-purple-50/30 text-purple-900 badge-purple' },
                      { key: 'gudang', label: 'Gudang (Warehouse)', tone: 'border-amber-200 bg-amber-50/30 text-amber-900 badge-amber' },
                      { key: 'sales', label: 'Area Sales (Others)', tone: 'border-blue-200 bg-blue-50/30 text-blue-900 badge-blue' },
                      { key: 'livestream', label: 'Livestream (Manhattan)', tone: 'border-teal-200 bg-teal-50/30 text-teal-900 badge-teal' },
                    ].map((loc) => {
                      const locRule = tempConfig.locationRules?.[loc.key] || {}
                      const enabledCodes = Array.isArray(locRule.enabledComponentCodes)
                        ? locRule.enabledComponentCodes
                        : [
                            ...(locRule.enableTransport !== false ? ['TRANS'] : []),
                            ...(locRule.enableNonPermanent !== false && locRule.enableKpi !== false ? ['NPA'] : []),
                          ]

                      const nonBaseComps = (tempConfig.components || []).filter((c) => !c.isBase)

                      return (
                        <div key={loc.key} className={`p-3.5 rounded-lg border space-y-2.5 ${loc.tone}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{loc.label}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white/80 border border-gray-200 text-gray-700">
                              {locationCounts[loc.key] || 0} Karyawan
                            </span>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-black/5">
                            {nonBaseComps.length === 0 ? (
                              <div className="text-[11px] text-gray-500 italic">Belum ada tunjangan dinamis aktif.</div>
                            ) : (
                              nonBaseComps.map((comp) => {
                                const isChecked = enabledCodes.includes(comp.code)
                                return (
                                  <label key={comp.code} className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newCodes = e.target.checked
                                          ? [...enabledCodes, comp.code]
                                          : enabledCodes.filter((c) => c !== comp.code)

                                        setTempConfig({
                                          ...tempConfig,
                                          locationRules: {
                                            ...tempConfig.locationRules,
                                            [loc.key]: {
                                              ...locRule,
                                              enabledComponentCodes: newCodes,
                                              enableTransport: newCodes.includes('TRANS'),
                                              enableNonPermanent: newCodes.includes('NPA'),
                                              enableKpi: newCodes.includes('NPA'),
                                            },
                                          },
                                        })
                                      }}
                                      className="w-4 h-4 text-teal-600 rounded"
                                    />
                                    <span>
                                      Dapat <strong>{comp.name}</strong> ({comp.percent}%)
                                    </span>
                                  </label>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-gray-600 leading-relaxed max-w-md">
                      Tentukan komponen gaji dan rasio alokasi persentase. Nilai Wage di tab Payroll Odoo diperlakukan sebagai <strong>Basic Salary (Base Anchor)</strong>. Total seluruh komponen wajib tepat <strong>100%</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddCompModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <span>➕ Tambah dari Pool Odoo</span>
                    </button>
                  </div>

                  {/* Daftar Komponen Gaji Dinamis */}
                  <div className="space-y-2.5">
                    {(tempConfig.components || []).map((comp) => {
                      return (
                        <div
                          key={comp.code}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                            comp.isBase
                              ? 'bg-blue-50/40 border-blue-200'
                              : 'bg-white border-gray-200 shadow-2xs hover:border-teal-300'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-900">{comp.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-semibold">
                                {comp.code}
                              </span>
                              {comp.isBase ? (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                  Base Wage (Odoo Contract)
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-100">
                                  Odoo Rule: {comp.odooRuleCode || comp.code} ({comp.odooInputCode || comp.code.toLowerCase()})
                                </span>
                              )}
                            </div>

                            {!comp.isBase && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(comp.isSickDeductible)}
                                    onChange={() => handleToggleCompSick(comp.code)}
                                    className="w-3.5 h-3.5 text-teal-600 rounded"
                                  />
                                  <span>Dipotong prorata jika izin sakit (Sick Leave Deduction)</span>
                                </label>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={comp.isBase ? '1' : '0'}
                                max="100"
                                step="1"
                                value={comp.percent}
                                onChange={(e) => handleUpdateCompPercent(comp.code, e.target.value)}
                                className="w-16 text-xs text-right font-bold font-mono border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-teal-600 bg-white"
                                required
                              />
                              <span className="text-xs font-bold text-gray-600">%</span>
                            </div>

                            {!comp.isBase && comp.isRemovable !== false && (
                              <button
                                type="button"
                                onClick={() => handleRemoveComp(comp.code)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={`Hapus komponen ${comp.name}`}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Total Verification Progress Bar */}
                  {(() => {
                    const comps = tempConfig.components || []
                    const total = Math.round(comps.reduce((acc, c) => acc + (Number(c.percent) || 0), 0) * 100) / 100
                    const isValid = total === 100
                    const baseComp = comps.find((c) => c.isBase)
                    const isBaseValid = baseComp && Number(baseComp.percent) > 0

                    return (
                      <div
                        className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                          isValid && isBaseValid
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{isValid && isBaseValid ? '✅' : '⚠️'}</span>
                          <div>
                            <div>Total Alokasi Rasio: <strong>{total}%</strong> dari 100%</div>
                            {!isValid && (
                              <div className="text-[11px] font-normal text-rose-700 mt-0.5">
                                {total < 100
                                  ? `Rasio kurang ${100 - total}%. Tambahkan pada komponen yang ada.`
                                  : `Rasio berlebih ${total - 100}%. Kurangi persentase komponen.`}
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                            isValid && isBaseValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isValid && isBaseValid ? 'Valid (100%)' : 'Belum 100%'}
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
                    Math.round(
                      (tempConfig.components || []).reduce((acc, c) => acc + (Number(c.percent) || 0), 0) * 100
                    ) /
                      100 !==
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

      {/* Modal Tambah Komponen dari Pool Odoo */}
      {addComponentModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">➕</span>
                <h3 className="font-bold text-sm">Tambah Komponen dari Pool Odoo</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddComponentModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCompConfirm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pilih Master Rule dari Pool Odoo:
                </label>
                <select
                  value={newCompPoolCode}
                  onChange={(e) => {
                    const code = e.target.value
                    setNewCompPoolCode(code)
                    const poolItem = poolCatalog.find((p) => p.code === code)
                    if (poolItem) {
                      setNewCompName(poolItem.name)
                      setNewCompSickDeductible(Boolean(poolItem.isSickDeductible))
                    }
                  }}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-teal-600 bg-white"
                  required
                >
                  {poolCatalog.map((p) => {
                    const isAlreadyAdded = (tempConfig.components || []).some((c) => c.code === p.code)
                    return (
                      <option key={p.code} value={p.code} disabled={isAlreadyAdded}>
                        {p.name} ({p.code}) {isAlreadyAdded ? '— [Sudah Ada]' : ''}
                      </option>
                    )
                  })}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Master rule ini sudah dikonfigurasi pada Structure ID 6 di Odoo ERP.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Tampilan Komponen:</label>
                <input
                  type="text"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="Contoh: Meal Allowance (Uang Makan)"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rasio Alokasi Persentase (%):</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={newCompPercent}
                    onChange={(e) => setNewCompPercent(e.target.value)}
                    className="w-full text-xs font-bold font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-teal-600"
                    required
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-gray-400">
                    %
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCompSickDeductible}
                    onChange={(e) => setNewCompSickDeductible(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded mt-0.5"
                  />
                  <span>
                    <strong>Dipotong Prorata Saat Cuti Sakit:</strong> Jika dicentang, tunjangan ini akan dipotong prorata per hari saat karyawan mengambil cuti sakit berbayar (seperti Tunjangan Transport).
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddComponentModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs hover:opacity-95 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                >
                  Tambahkan ke Komponen Gaji
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
