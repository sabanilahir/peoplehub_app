'use client'
import { useState, useEffect } from 'react'
import { useOdooSettingsStore } from '@/store/odooSettingsStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { PageHeader, StatCard, SectionCard, FormField, Input } from '@/components/ui'
import {
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Building2,
  Warehouse,
  Briefcase,
  Video,
  Users,
} from 'lucide-react'

// Mapping label & styling badge untuk 4 target aturan lokasi
const TARGET_BADGES = {
  ho: { label: 'Head Office (HO)', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: Building2 },
  sales: { label: 'Area Sales (Others)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Briefcase },
  gudang: { label: 'Gudang', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: Warehouse },
  livestream: { label: 'Livestream (Manhattan)', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Video },
}

export default function OdooApiPage() {
  const store = useOdooSettingsStore()
  const empStore = useEmployeeStore()
  
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  // Work Location Mapping States
  const [workLocations, setWorkLocations] = useState([])
  const [targetConfigs, setTargetConfigs] = useState([])
  const [loadingLocs, setLoadingLocs] = useState(false)
  const [savingLocs, setSavingLocs] = useState(false)
  const [locMessage, setLocMessage] = useState(null)

  // Direct Database Employees for accurate work location display
  const [dbEmployees, setDbEmployees] = useState([])
  const [loadingEmps, setLoadingEmps] = useState(false)
  
  // Initialize and load data on mount
  useEffect(() => {
    store._init()
    fetchWorkLocations()
    reloadEmployees()
  }, [])
  
  // Fetch Work Locations dari API
  const fetchWorkLocations = async () => {
    try {
      setLoadingLocs(true)
      const res = await fetch('/api/odoo/work-locations')
      const data = await res.json()
      if (data.success) {
        setWorkLocations(data.locations || [])
        setTargetConfigs(data.targetConfigs || [])
      }
    } catch (e) {
      console.error('Failed to fetch work locations:', e)
    } finally {
      setLoadingLocs(false)
    }
  }

  // Reload employees from database
  const reloadEmployees = async () => {
    try {
      setLoadingEmps(true)
      const res = await fetch('/api/employees')
      if (res.ok) {
        const rows = await res.json()
        const odoos = rows.filter(e => e.imported_from === 'odoo')
        setDbEmployees(odoos)
      }
    } catch (e) {
      console.error('Failed to reload employees:', e)
    } finally {
      setLoadingEmps(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    const r = await store.testConnection()
    setTestResult(r)
    setTesting(false)
  }
  
  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/odoo/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: store.odooUrl,
          db: store.odooDb,
          user: store.odooUser,
          apiKey: store.odooApiKey,
          model: store.odooEmployeeModel,
          syncEnabled: store.syncEnabled,
          autoSyncInterval: store.autoSyncInterval,
        })
      })
      const result = await response.json()
      if (result.success) {
        setTestResult({ success: true, message: 'Pengaturan tersimpan ke database!' })
      } else {
        setTestResult({ success: false, message: result.error || 'Gagal menyimpan' })
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error: ' + error.message })
    }
  }
  
  const handleSyncEmployees = async () => {
    setSyncing(true)
    const r = await store.syncEmployees()
    setSyncResult(r)
    if (r.success) {
      await reloadEmployees()
      await fetchWorkLocations()
    }
    setSyncing(false)
  }

  // Update target mapping in local state
  const handleMappingChange = (odoo_id, mappedCode) => {
    setWorkLocations(prev =>
      prev.map(loc =>
        loc.odoo_id === odoo_id ? { ...loc, mappedLocationCode: mappedCode } : loc
      )
    )
  }

  // Save Mappings ke database dan terapkan ke seluruh data karyawan
  const handleSaveWorkLocationMappings = async () => {
    try {
      setSavingLocs(true)
      setLocMessage(null)

      const payload = {
        mappings: workLocations.map(l => ({
          odoo_id: l.odoo_id,
          mappedLocationCode: l.mappedLocationCode,
        })),
        applyToEmployees: true,
      }

      const res = await fetch('/api/odoo/work-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        setLocMessage({ success: true, text: data.message })
        await fetchWorkLocations()
        await reloadEmployees()
      } else {
        setLocMessage({ success: false, text: data.error || 'Gagal menyimpan pemetaan' })
      }
    } catch (err) {
      setLocMessage({ success: false, text: 'Terjadi kesalahan: ' + err.message })
    } finally {
      setSavingLocs(false)
    }
  }
  
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon="link"
        title="API Odoo & Pemetaan Work Location"
        subtitle="Konfigurasi koneksi Odoo, sinkronisasi karyawan, dan pemetaan 4 lokasi kerja resmi."
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Status Koneksi" value={store.syncEnabled ? 'Aktif' : 'Nonaktif'} icon="bell" tone={store.syncEnabled ? 'green' : 'gray'} />
        <StatCard label="URL Server" value={store.odooUrl ? 'Terhubung' : '-'} icon="globe" />
        <StatCard label="Sync Terakhir" value={store.lastSyncAt ? 'Tersinkron' : '-'} icon="refresh-cw" />
        <StatCard label="Karyawan Odoo" value={dbEmployees.length || '-'} icon="users" />
      </div>

      {/* 1. SECTION: PEMETAAN 4 WORK LOCATION ODOO */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Pemetaan Work Location Odoo (4 Lokasi Resmi)</h2>
              <p className="text-xs text-gray-500">
                Lokasi kerja operasional resmi: <span className="font-semibold text-gray-700">Gudang, Head Office, Manhattan, dan Others</span>.
              </p>
            </div>
          </div>
          <button
            onClick={fetchWorkLocations}
            disabled={loadingLocs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLocs ? 'animate-spin' : ''}`} />
            {loadingLocs ? 'Menarik...' : 'Sync 4 Work Locations'}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {locMessage && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              locMessage.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {locMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{locMessage.text}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-y border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-left">ID Odoo</th>
                  <th className="py-2.5 px-3 text-left">Nama Lokasi di Odoo</th>
                  <th className="py-2.5 px-3 text-center">Jumlah Karyawan</th>
                  <th className="py-2.5 px-3 text-left">Target Aturan Presensi (Internal)</th>
                  <th className="py-2.5 px-3 text-center">Status Mapping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workLocations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400 text-sm">
                      {loadingLocs ? 'Memuat lokasi kerja dari Odoo...' : 'Belum ada data work location. Klik tombol "Sync 4 Work Locations" di atas.'}
                    </td>
                  </tr>
                ) : (
                  workLocations.map((loc) => {
                    const badgeInfo = TARGET_BADGES[loc.mappedLocationCode] || null
                    const IconComponent = badgeInfo?.icon || MapPin

                    return (
                      <tr key={loc.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                            #{loc.odoo_id}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {loc.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            <Users className="w-3 h-3 text-gray-500" />
                            {loc.employeeCount || 0} orang
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={loc.mappedLocationCode || ''}
                            onChange={(e) => handleMappingChange(loc.odoo_id, e.target.value)}
                            className="w-full max-w-xs px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Pilih Target Aturan --</option>
                            {targetConfigs.map((cfg) => (
                              <option key={cfg.id} value={cfg.locationCode}>
                                {cfg.locationName} ({cfg.workDays})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {badgeInfo ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeInfo.bg}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                              {badgeInfo.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              Belum Terpetakan
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={handleSaveWorkLocationMappings}
              disabled={savingLocs || workLocations.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingLocs ? 'Menyimpan & Menerapkan...' : 'Simpan Pemetaan & Terapkan ke Karyawan'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECTION: KONFIGURASI SERVER ODOO */}
      <SectionCard title="Konfigurasi Koneksi Server Odoo" icon="settings">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="URL Server">
              <Input
                type="url"
                value={store.odooUrl}
                onChange={e => store.setOdooUrl(e.target.value.replace(/\/odoo$/, ''))}
                placeholder="https://pt-gemilang.odoo.com"
              />
              <p className="text-xs text-gray-400 mt-1">Contoh: https://pt-gemilang.odoo.com (tanpa /odoo di akhir)</p>
            </FormField>
            <FormField label="Database">
              <Input value={store.odooDb} onChange={e => store.setOdooDb(e.target.value)} placeholder="db_name" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Username">
              <Input type="email" value={store.odooUser} onChange={e => store.setOdooUser(e.target.value)} placeholder="admin@company.com" />
            </FormField>
            <FormField label="API Key">
              <Input type="password" value={store.odooApiKey} onChange={e => store.setOdooApiKey(e.target.value)} placeholder="***" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Employee Model">
              <Input value={store.odooEmployeeModel} onChange={e => store.setOdooEmployeeModel(e.target.value)} placeholder="hr.employee" />
            </FormField>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={store.syncEnabled} onChange={e => store.setSyncEnabled(e.target.checked)} />
              <span className="text-sm font-medium text-gray-700">Aktifkan Sync Otomatis</span>
            </label>
            <select
              value={store.autoSyncInterval}
              onChange={e => store.setAutoSyncInterval(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
            >
              <option value={0}>Manual</option>
              <option value={15}>15 menit</option>
              <option value={30}>30 menit</option>
              <option value={60}>1 jam</option>
            </select>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {testResult.message}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={handleSaveSettings} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors">
              Simpan Pengaturan
            </button>
            <button onClick={handleTest} disabled={testing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors">
              {testing ? 'Menguji...' : 'Test Koneksi'}
            </button>
            <button onClick={handleSyncEmployees} disabled={syncing} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors">
              {syncing ? 'Menyinkronkan Karyawan...' : 'Sync Karyawan Sekarang'}
            </button>
          </div>
        </div>
      </SectionCard>

      {syncResult && (
        <div className={`p-3 rounded-lg text-sm ${syncResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {syncResult.message}
        </div>
      )}

      {/* 3. SECTION: DAFTAR KARYAWAN ODOO DENGAN WORK LOCATION TERPETAKAN */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900 text-sm">
              Daftar Karyawan dari Odoo ({dbEmployees.length} orang)
            </h3>
          </div>
          <button
            onClick={reloadEmployees}
            disabled={loadingEmps}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingEmps ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase font-semibold sticky top-0 border-b border-gray-200 z-10">
              <tr>
                <th className="text-left py-2.5 px-3">NIK / ID</th>
                <th className="text-left py-2.5 px-3">Nama</th>
                <th className="text-left py-2.5 px-3">Departemen</th>
                <th className="text-left py-2.5 px-3">Job Position</th>
                <th className="text-left py-2.5 px-3">Job Title</th>
                <th className="text-left py-2.5 px-3">Work Location (Odoo)</th>
                <th className="text-left py-2.5 px-3">Aturan Presensi (Mapped)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dbEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    {loadingEmps ? 'Memuat data karyawan...' : 'Belum ada karyawan dari Odoo. Klik "Sync Karyawan Sekarang".'}
                  </td>
                </tr>
              ) : (
                dbEmployees.map(e => {
                  const badge = TARGET_BADGES[e.workLocationCode]
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-gray-500">{e.nik || `ODOO-${e.odoo_id}`}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{e.name}</td>
                      <td className="py-2.5 px-3 text-gray-600">{e.dept || '-'}</td>
                      <td className="py-2.5 px-3">
                        {e.jobPosition ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {e.jobPosition}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{e.jobTitle || e.position || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {e.location || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {badge ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium border text-[11px] ${badge.bg}`}>
                            {badge.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">
                            Default (HO)
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
