'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import { useEmployeeStore } from '@/store/employeeStore'
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
  Search,
  Navigation,
  Compass,
  ExternalLink,
  ShieldCheck,
  Check,
  Loader2,
  RotateCcw,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react'

function WorkLocationSettingsContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam === 'geofencing' ? 'geofencing' : 'rules') // 'rules' | 'geofencing'

  useEffect(() => {
    if (tabParam === 'geofencing' || tabParam === 'rules') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Geofencing Target Locations State
  const storeEmployees = useEmployeeStore((s) => s.employees)
  const [targets, setTargets] = useState([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [targetSearch, setTargetSearch] = useState('')
  const [employees, setEmployees] = useState([])
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Merge API employees with Zustand store employees so dropdown is always populated
  const availableEmployees = (() => {
    const map = new Map()
    ;(storeEmployees || []).forEach((emp) => {
      if (emp?.id) map.set(String(emp.id), emp)
    })
    ;(employees || []).forEach((emp) => {
      if (emp?.id) map.set(String(emp.id), emp)
    })
    return Array.from(map.values()).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    )
  })()

  // Modal Target Create / Edit
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [savingTarget, setSavingTarget] = useState(false)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [targetForm, setTargetForm] = useState({
    id: null,
    code: '',
    name: '',
    type: 'sales_distributor',
    employeeId: '',
    employeeName: '',
    distributorName: '',
    address: '',
    city: '',
    province: '',
    latitude: '',
    longitude: '',
    radiusMeters: 300,
    active: true,
    notes: '',
  })

  // Bulk Upload / Import Modal State
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [importErrors, setImportErrors] = useState([])
  const [importMode, setImportMode] = useState('upsert') // 'upsert' | 'insert_only' | 'replace_all'
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)

  // Modal Rules Create / Edit
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

  // Fetch all targets (HO & Area Sales Distributors)
  const fetchTargets = async () => {
    try {
      setLoadingTargets(true)
      const res = await fetch('/api/work-locations/targets?active=false')
      const data = await res.json()
      if (data.success) {
        setTargets(data.targets || [])
      }
    } catch (err) {
      console.error('Error fetching targets:', err)
    } finally {
      setLoadingTargets(false)
    }
  }

  // Fetch all employees for dropdown
  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees?limit=500')
      const data = await res.json()
      if (Array.isArray(data)) {
        setEmployees(data)
      } else if (Array.isArray(data?.employees)) {
        setEmployees(data.employees)
      }
    } catch (err) {}
  }

  useEffect(() => {
    fetchConfigs()
    fetchTargets()
    fetchEmployees()
  }, [])

  // Geocoding handler
  const handleGeocode = async (addressQuery) => {
    if (!addressQuery) {
      alert('Silakan masukkan alamat atau kota distributor terlebih dahulu')
      return
    }
    try {
      setGeocodingLoading(true)
      const res = await fetch('/api/work-locations/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: addressQuery }),
      })
      const data = await res.json()
      if (data.success) {
        setTargetForm((prev) => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
        }))
        showToast(`✅ Koordinat ditemukan: ${data.latitude}, ${data.longitude}`)
      } else {
        alert(data.error || 'Lokasi tidak ditemukan. Coba tambahkan nama kota/kecamatan.')
      }
    } catch (err) {
      alert('Gagal menghubungi layanan geocoding peta')
    } finally {
      setGeocodingLoading(false)
    }
  }

  // Ambil koordinat GPS dari perangkat saat ini
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung fitur Geolocation GPS')
      return
    }
    setGeocodingLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTargetForm((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }))
        setGeocodingLoading(false)
        showToast(`📍 Koordinat GPS saat ini berhasil diambil (${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)})`)
      },
      (err) => {
        setGeocodingLoading(false)
        alert('Gagal mengambil lokasi GPS: ' + (err.message || 'Pastikan izin lokasi browser aktif'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Open Create Target Modal
  const handleOpenTargetCreate = (type = 'sales_distributor') => {
    setTargetForm({
      id: null,
      code: type === 'head_office' ? 'HO-MAIN' : `DIST-${String(targets.length + 1).padStart(2, '0')}`,
      name: type === 'head_office' ? 'Head Office (HO)' : '',
      type,
      employeeId: '',
      employeeName: '',
      distributorName: '',
      address: '',
      city: '',
      province: '',
      latitude: '',
      longitude: '',
      radiusMeters: 300,
      active: true,
      notes: '',
    })
    setShowTargetModal(true)
  }

  // Open Edit Target Modal
  const handleOpenTargetEdit = (target) => {
    const existingHo =
      target.type === 'head_office' && !target.id
        ? targets.find((t) => t.type === 'head_office')
        : null
    const resolvedId = target.id || existingHo?.id || null

    setTargetForm({
      id: resolvedId,
      code: target.code || existingHo?.code || (target.type === 'head_office' ? 'HO-MAIN' : ''),
      name: target.name || (target.type === 'head_office' ? 'Head Office (HO)' : ''),
      type: target.type || 'sales_distributor',
      employeeId: target.employeeId ? String(target.employeeId) : '',
      employeeName: target.employeeName || '',
      distributorName: target.distributorName || '',
      address: target.address || '',
      city: target.city || '',
      province: target.province || '',
      latitude: target.latitude !== undefined ? target.latitude : '',
      longitude: target.longitude !== undefined ? target.longitude : '',
      radiusMeters: target.radiusMeters || 300,
      active: target.active !== undefined ? target.active : true,
      notes: target.notes || '',
    })
    setShowTargetModal(true)
  }

  // Save Target Location
  const handleSaveTarget = async (e) => {
    e.preventDefault()

    const resolvedName = (
      targetForm.name ||
      targetForm.distributorName ||
      (targetForm.type === 'head_office' ? 'Head Office (HO)' : '')
    ).trim()

    const latNum = parseFloat(String(targetForm.latitude).replace(',', '.'))
    const lngNum = parseFloat(String(targetForm.longitude).replace(',', '.'))

    if (!resolvedName || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      alert('Nama lokasi/distributor, latitude, dan longitude wajib diisi dengan format angka yang benar')
      return
    }

    try {
      setSavingTarget(true)

      // Jika tipe head_office namun targetForm.id kosong, cek apakah sudah ada record head_office di database
      let targetId = targetForm.id
      if (!targetId && targetForm.type === 'head_office') {
        const existingHo = targets.find((t) => t.type === 'head_office')
        if (existingHo?.id) targetId = existingHo.id
      }

      const url = targetId
        ? `/api/work-locations/targets/${targetId}`
        : '/api/work-locations/targets'
      const method = targetId ? 'PUT' : 'POST'

      const payload = {
        ...targetForm,
        id: targetId,
        name: resolvedName,
        distributorName:
          targetForm.type === 'head_office'
            ? resolvedName
            : targetForm.distributorName || resolvedName,
        latitude: latNum,
        longitude: lngNum,
        radiusMeters: Number(targetForm.radiusMeters) || 300,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        setShowTargetModal(false)
        await fetchTargets()
        showToast(
          targetId
            ? `✅ Titik lokasi "${resolvedName}" berhasil diperbarui!`
            : `✅ Titik lokasi baru "${resolvedName}" berhasil ditambahkan!`
        )
      } else {
        alert(data.error || 'Gagal menyimpan target lokasi')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan jaringan saat menyimpan titik lokasi')
    } finally {
      setSavingTarget(false)
    }
  }

  // Delete Target Location
  const handleDeleteTarget = async (id, name) => {
    if (!confirm(`Hapus titik lokasi distributor "${name}"?`)) return
    try {
      const res = await fetch(`/api/work-locations/targets/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchTargets()
      } else {
        alert(data.error || 'Gagal menghapus lokasi')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── Bulk Upload & Export Titik Distributor Area Sales ──────────
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Kode Lokasi': 'DIST-01',
        'Nama Karyawan Sales': 'Rini Indriani',
        'Nama Distributor': 'PT Rezeki Kita',
        'Alamat Kantor': 'Jln. A Yani Km 14,5 Samping Bank BRI, Kel. Gambut, Kec. Gambut',
        'Kota': 'Banjarmasin / Gambut',
        'Provinsi': 'Kalimantan Selatan',
        'Latitude': -3.4047,
        'Longitude': 114.6706,
        'Radius (Meter)': 300,
        'Status Aktif': 'Ya',
        'Catatan': 'Distributor Area Sales Kalimantan Selatan',
      },
      {
        'Kode Lokasi': 'DIST-02',
        'Nama Karyawan Sales': 'Dedi Irawan',
        'Nama Distributor': 'CV Sinar Abadi',
        'Alamat Kantor': 'Jl. Raya Darmo No. 45',
        'Kota': 'Surabaya',
        'Provinsi': 'Jawa Timur',
        'Latitude': -7.2891,
        'Longitude': 112.7383,
        'Radius (Meter)': 300,
        'Status Aktif': 'Ya',
        'Catatan': 'Distributor Area Surabaya',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    ws['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 25 },
      { wch: 45 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 35 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Distributor')
    XLSX.writeFile(wb, 'Template_Titik_Distributor_Sales.xlsx')
  }

  const handleExportExcel = () => {
    const salesTargets = targets.filter((t) => t.type === 'sales_distributor')
    if (salesTargets.length === 0) {
      alert('Tidak ada data distributor sales untuk diexport.')
      return
    }

    const exportData = salesTargets.map((t, idx) => ({
      'Kode Lokasi': t.code || `DIST-${String(idx + 1).padStart(2, '0')}`,
      'Nama Karyawan Sales': t.employeeName || '',
      'Nama Distributor': t.distributorName || t.name || '',
      'Alamat Kantor': t.address || '',
      'Kota': t.city || '',
      'Provinsi': t.province || '',
      'Latitude': t.latitude,
      'Longitude': t.longitude,
      'Radius (Meter)': t.radiusMeters || 300,
      'Status Aktif': t.active ? 'Ya' : 'Tidak',
      'Catatan': t.notes || '',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 25 },
      { wch: 45 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 35 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Distributor Sales')
    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Data_Titik_Distributor_Area_Sales_${dateStr}.xlsx`)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportErrors([])
    setParsedRows([])

    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      const ws = wb.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (rows.length === 0) {
        setImportErrors(['File Excel/CSV kosong atau tidak memiliki baris data.'])
        return
      }

      const existingSales = targets.filter((t) => t.type === 'sales_distributor')
      const existingCodeSet = new Set(existingSales.map((t) => (t.code || '').toUpperCase()))
      const existingPairSet = new Set(
        existingSales.map((t) => `${t.employeeName || ''}___${t.distributorName || t.name}`.trim().toLowerCase())
      )

      const validationErrors = []
      const processed = rows.map((row, idx) => {
        const rowNum = idx + 2

        const code = String(row['Kode Lokasi'] || row['Kode'] || row['code'] || '').trim()
        const employeeName = String(row['Nama Karyawan Sales'] || row['Nama Karyawan'] || row['employeeName'] || '').trim()
        const distributorName = String(row['Nama Distributor'] || row['Distributor'] || row['distributorName'] || row['Nama Titik'] || row['name'] || '').trim()
        const address = String(row['Alamat Kantor'] || row['Alamat'] || row['address'] || '').trim()
        const city = String(row['Kota'] || row['Kota / Kabupaten'] || row['city'] || '').trim()
        const province = String(row['Provinsi'] || row['province'] || '').trim()
        const rawLat = String(row['Latitude'] || row['lat'] || '').replace(',', '.').trim()
        const rawLng = String(row['Longitude'] || row['lng'] || row['long'] || '').replace(',', '.').trim()
        const rawRadius = row['Radius (Meter)'] || row['Radius'] || row['radiusMeters'] || 300
        const rawActive = String(row['Status Aktif'] || row['Status'] || row['active'] || 'Ya').trim().toLowerCase()
        const notes = String(row['Catatan'] || row['notes'] || '').trim()

        const latNum = parseFloat(rawLat)
        const lngNum = parseFloat(rawLng)
        const radiusNum = parseInt(rawRadius, 10) || 300
        const isActive = rawActive === 'ya' || rawActive === 'true' || rawActive === '1' || rawActive === 'yes'

        const rowErrors = []
        if (!distributorName) rowErrors.push('Nama distributor kosong')
        if (isNaN(latNum) || latNum < -90 || latNum > 90) rowErrors.push(`Latitude tidak valid: ${rawLat}`)
        if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) rowErrors.push(`Longitude tidak valid: ${rawLng}`)

        if (rowErrors.length > 0) {
          validationErrors.push(`Baris ${rowNum}: ${rowErrors.join(', ')}`)
        }

        const isUpdate = (code && existingCodeSet.has(code.toUpperCase())) ||
          existingPairSet.has(`${employeeName}___${distributorName}`.trim().toLowerCase())

        return {
          _rowNum: rowNum,
          _isValid: rowErrors.length === 0,
          _errorMsg: rowErrors.join(', '),
          _actionType: isUpdate ? 'update' : 'new',
          code,
          employeeName,
          distributorName,
          name: distributorName,
          address,
          city,
          province,
          latitude: isNaN(latNum) ? 0 : latNum,
          longitude: isNaN(lngNum) ? 0 : lngNum,
          radiusMeters: radiusNum,
          active: isActive,
          notes,
        }
      })

      setParsedRows(processed)
      setImportErrors(validationErrors)
    } catch (err) {
      console.error(err)
      setImportErrors([`Gagal membaca file: ${err.message}`])
    }
  }

  const handleExecuteBulkImport = async () => {
    const validRows = parsedRows.filter((r) => r._isValid)
    if (validRows.length === 0) {
      alert('Tidak ada baris data valid yang dapat disimpan.')
      return
    }

    if (importMode === 'replace_all') {
      const confirmReplace = confirm(
        '⚠️ PERINGATAN: Mode "Ganti Seluruh Data" akan menghapus SELURUH titik distributor sales lama dan menggantinya dengan isi file ini. Lanjutkan?'
      )
      if (!confirmReplace) return
    }

    try {
      setIsImporting(true)
      const res = await fetch('/api/work-locations/targets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: validRows,
          mode: importMode,
        }),
      })

      const data = await res.json()
      if (data.success) {
        showToast(`✅ ${data.message}`)
        setShowImportModal(false)
        setParsedRows([])
        setImportFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        await fetchTargets()
      } else {
        alert(data.error || 'Gagal memproses upload massal.')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan jaringan saat upload.')
    } finally {
      setIsImporting(false)
    }
  }

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
        title='Konfigurasi Lokasi Kerja & Geofencing Presensi'
        subtitle='Manajemen aturan jam kerja, denda keterlambatan, koordinat Head Office, serta titik distributor Area Sales (Radius 300m).'
        actions={
          activeTab === 'rules' ? (
            <button
              onClick={handleOpenCreate}
              className='inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition'
            >
              <Plus className='w-4 h-4' />
              Tambah Aturan Lokasi
            </button>
          ) : (
            <button
              onClick={() => handleOpenTargetCreate('sales_distributor')}
              className='inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition'
            >
              <Plus className='w-4 h-4' />
              Tambah Titik Distributor
            </button>
          )
        }
      />

      {/* Tab Navigation */}
      <div className='flex items-center gap-3 border-b border-gray-200 pb-3'>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition ${
            activeTab === 'rules'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <Clock className='w-4 h-4' />
          Aturan Jam Kerja, Toleransi & Denda
        </button>
        <button
          onClick={() => setActiveTab('geofencing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition ${
            activeTab === 'geofencing'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <MapPin className='w-4 h-4' />
          Geofencing & Koordinat (HO & Area Sales)
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              activeTab === 'geofencing' ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {targets.length || 23}
          </span>
        </button>
      </div>

      {activeTab === 'rules' && (
        <>
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
      </>
      )}

      {/* ── Toast Notification Banner ── */}
      {toastMsg && (
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs'>
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className='text-emerald-600 hover:text-emerald-900'>
            <X className='w-4 h-4' />
          </button>
        </div>
      )}

      {/* ── TAB 2: GEOFENCING & TITIK LOKASI (HO & AREA SALES) ── */}
      {activeTab === 'geofencing' && (
        <div className='space-y-6'>
          {/* Top Geofencing StatCards */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
            <StatCard
              icon='📍'
              label='Total Titik Lokasi'
              value={`${targets.length} Titik`}
              hint={`1 Head Office + ${targets.filter((t) => t.type !== 'head_office').length} Distributor Sales`}
              tone='brand'
            />
            <StatCard
              icon='🎯'
              label='Radius Toleransi'
              value='300 Meter'
              hint='Batas maksimal geofencing absensi'
              tone='blue'
            />
            <StatCard
              icon='⚠️'
              label='Kebijakan Luar Radius'
              value='Mode B (Berperingatan)'
              hint='Wajib catatan dinas luar jika > 300m'
              tone='amber'
            />
            <StatCard
              icon='👥'
              label='Area Sales Terhubung'
              value={`${new Set(targets.filter(t => t.employeeId).map(t => t.employeeId)).size} Karyawan`}
              hint={`Dept: Sales Offline (${targets.filter((t) => t.type !== 'head_office').length} Titik)`}
              tone='green'
            />
          </div>

          {/* Head Office (HO) Static Target Card */}
          {(() => {
            const ho = targets.find((t) => t.type === 'head_office') || {
              type: 'head_office',
              code: 'HO-MAIN',
              name: 'Head Office (HO)',
              distributorName: 'Kantor Pusat Head Office',
              address: 'Jl. Terusan Bandengan Ruko Harmoni Mas Blok E No. 26, Pejagalan, Penjaringan, Jakarta Utara',
              city: 'Jakarta Utara',
              province: 'DKI Jakarta',
              latitude: -6.1373,
              longitude: 106.7840,
              radiusMeters: 300,
              active: true,
            }
            return (
              <div className='rounded-2xl border-2 border-teal-200 bg-gradient-to-r from-teal-50/80 via-white to-blue-50/50 p-5 shadow-xs'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                  <div className='flex items-start gap-3.5'>
                    <div className='w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs'>
                      <Building2 className='w-6 h-6' />
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h3 className='font-bold text-gray-900 text-base'>{ho.name}</h3>
                        <span className='text-[10px] bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full border border-teal-200'>
                          Pusat Head Office
                        </span>
                        <span className='text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full'>
                          Radius {ho.radiusMeters || 300}m
                        </span>
                      </div>
                      <p className='text-xs text-gray-600 mt-1 flex items-center gap-1.5'>
                        <MapPin className='w-3.5 h-3.5 text-gray-400 flex-shrink-0' />
                        {ho.address || 'Alamat kantor pusat HO belum diisi'}
                      </p>
                      <div className='flex items-center gap-4 mt-2 text-xs font-mono text-gray-500'>
                        <span>Latitude: <strong className='text-gray-800'>{ho.latitude}</strong></span>
                        <span>Longitude: <strong className='text-gray-800'>{ho.longitude}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2 flex-shrink-0'>
                    <a
                      href={`https://www.google.com/maps?q=${ho.latitude},${ho.longitude}`}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs'
                    >
                      <ExternalLink className='w-3.5 h-3.5 text-gray-500' />
                      Buka di Google Maps
                    </a>
                    <button
                      type='button'
                      onClick={() => handleOpenTargetEdit(ho)}
                      className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition shadow-2xs cursor-pointer'
                    >
                      <Edit2 className='w-3.5 h-3.5' />
                      Ubah Titik HO
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Area Sales Distributors Management Table */}
          <div className='rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden'>
            <div className='p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50'>
              <div>
                <h3 className='font-bold text-gray-900 flex items-center gap-2'>
                  <Briefcase className='w-4 h-4 text-blue-600' />
                  Titik Lokasi Distributor Area Sales (20 Karyawan / 22 Titik)
                </h3>
                <p className='text-xs text-gray-500 mt-0.5'>
                  Presensi sales divalidasi geofencing terhadap titik kantor distributor yang ditugaskan (Mendukung multi-distributor).
                </p>
              </div>

              <div className='flex items-center flex-wrap gap-2'>
                <div className='relative'>
                  <Search className='w-4 h-4 text-gray-400 absolute left-3 top-2.5' />
                  <input
                    type='text'
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    placeholder='Cari sales / distributor / kota...'
                    className='pl-9 pr-3.5 py-1.5 border border-gray-200 rounded-xl text-xs w-56 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white'
                  />
                </div>

                {/* Export Excel */}
                <button
                  type='button'
                  onClick={handleExportExcel}
                  title='Export data distributor sales ke file Excel'
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition shadow-2xs cursor-pointer'
                >
                  <Download className='w-3.5 h-3.5 text-gray-500' />
                  Export
                </button>

                {/* Import Excel */}
                <button
                  type='button'
                  onClick={() => {
                    setShowImportModal(true)
                    setImportFile(null)
                    setParsedRows([])
                    setImportErrors([])
                  }}
                  title='Upload massal titik lokasi distributor dari file Excel / CSV'
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition shadow-2xs cursor-pointer'
                >
                  <Upload className='w-3.5 h-3.5' />
                  Upload Excel
                </button>

                {/* Tambah Titik Manual */}
                <button
                  type='button'
                  onClick={() => handleOpenTargetCreate('sales_distributor')}
                  className='inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-2xs cursor-pointer'
                >
                  <Plus className='w-3.5 h-3.5' />
                  Tambah Titik
                </button>
              </div>
            </div>

            {/* Table */}
            <div className='overflow-x-auto'>
              <table className='w-full text-left border-collapse text-xs'>
                <thead>
                  <tr className='border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider'>
                    <th className='py-3 px-4 w-12 text-center'>No</th>
                    <th className='py-3 px-4'>Karyawan Sales</th>
                    <th className='py-3 px-4'>Distributor & Kota</th>
                    <th className='py-3 px-4'>Alamat Kantor Distributor</th>
                    <th className='py-3 px-4'>Koordinat (Lat, Lng)</th>
                    <th className='py-3 px-4 text-center'>Radius</th>
                    <th className='py-3 px-4 text-center'>Status</th>
                    <th className='py-3 px-4 text-right'>Aksi</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {loadingTargets ? (
                    <tr>
                      <td colSpan={8} className='py-12 text-center text-gray-400'>
                        Memuat data titik distributor...
                      </td>
                    </tr>
                  ) : (() => {
                    const salesTargets = targets.filter((t) => t.type === 'sales_distributor')
                    const filtered = salesTargets.filter((t) => {
                      if (!targetSearch) return true
                      const s = targetSearch.toLowerCase()
                      return (
                        (t.employeeName || '').toLowerCase().includes(s) ||
                        (t.distributorName || '').toLowerCase().includes(s) ||
                        (t.name || '').toLowerCase().includes(s) ||
                        (t.city || '').toLowerCase().includes(s) ||
                        (t.address || '').toLowerCase().includes(s)
                      )
                    })

                    // Hitung jumlah distributor per employee
                    const empCounts = {}
                    salesTargets.forEach((t) => {
                      if (t.employeeId) empCounts[t.employeeId] = (empCounts[t.employeeId] || 0) + 1
                    })

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className='py-12 text-center text-gray-400'>
                            Tidak ada titik distributor yang cocok dengan pencarian.
                          </td>
                        </tr>
                      )
                    }

                    return filtered.map((t, idx) => {
                      const isMulti = t.employeeId && empCounts[t.employeeId] > 1
                      return (
                        <tr key={t.id} className='hover:bg-teal-50/20 transition'>
                          <td className='py-3 px-4 text-center text-gray-400 font-mono'>{idx + 1}</td>
                          <td className='py-3 px-4'>
                            <div className='flex items-center gap-2'>
                              <div className='w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0'>
                                {(t.employeeName || 'S').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className='font-bold text-gray-900'>{t.employeeName || t.employee?.name || 'Belum Ditugaskan'}</p>
                                <div className='flex items-center gap-1.5 mt-0.5'>
                                  <span className='text-[10px] text-gray-400 font-mono'>ID: {t.employeeId || '-'}</span>
                                  {isMulti && (
                                    <span className='text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded'>
                                      2 Distributor
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='py-3 px-4'>
                            <p className='font-semibold text-gray-800'>{t.distributorName || t.name}</p>
                            <span className='inline-block text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium mt-0.5'>
                              {t.city || 'Nasional'}
                            </span>
                          </td>
                          <td className='py-3 px-4 max-w-xs'>
                            <p className='text-gray-600 line-clamp-2 leading-relaxed text-[11px]'>{t.address || '-'}</p>
                          </td>
                          <td className='py-3 px-4 font-mono text-[11px] text-gray-600'>
                            <div>Lat: <span className='text-gray-800'>{t.latitude}</span></div>
                            <div>Lng: <span className='text-gray-800'>{t.longitude}</span></div>
                          </td>
                          <td className='py-3 px-4 text-center'>
                            <span className='px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200 text-[10px]'>
                              {t.radiusMeters || 300}m
                            </span>
                          </td>
                          <td className='py-3 px-4 text-center'>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              t.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {t.active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className='py-3 px-4 text-right'>
                            <div className='flex items-center justify-end gap-1.5'>
                              <a
                                href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                                target='_blank'
                                rel='noreferrer'
                                className='p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition'
                                title='Lihat Titik di Google Maps'
                              >
                                <ExternalLink className='w-4 h-4' />
                              </a>
                              <button
                                onClick={() => handleOpenTargetEdit(t)}
                                className='p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition'
                                title='Edit Titik Distributor'
                              >
                                <Edit2 className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() => handleDeleteTarget(t.id, t.distributorName || t.name)}
                                className='p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition'
                                title='Hapus Titik'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Modal Dialog: Tambah / Edit Titik Lokasi & Distributor Geofencing ── */}
      {showTargetModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto'>
          <div className='w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-8'>
            <div className='flex items-center justify-between border-b border-gray-100 pb-4'>
              <div>
                <h3 className='text-lg font-bold text-gray-900'>
                  {targetForm.id ? 'Edit Titik Lokasi & Distributor' : 'Tambah Titik Lokasi & Distributor'}
                </h3>
                <p className='text-xs text-gray-500'>
                  Konfigurasi koordinat GPS dan radius geofencing presensi (Head Office & Area Sales).
                </p>
              </div>
              <button
                onClick={() => setShowTargetModal(false)}
                className='rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className='mt-4 space-y-4 text-xs'>
              {/* Tipe Lokasi */}
              <div>
                <label className='font-semibold text-gray-700'>Tipe Target Lokasi:</label>
                <div className='mt-1 flex items-center gap-4'>
                  <label className='flex items-center gap-2 cursor-pointer text-xs'>
                    <input
                      type='radio'
                      name='targetType'
                      value='sales_distributor'
                      checked={targetForm.type === 'sales_distributor'}
                      onChange={(e) => setTargetForm({ ...targetForm, type: e.target.value })}
                      className='text-teal-600 focus:ring-teal-500'
                    />
                    <span>Distributor Area Sales</span>
                  </label>
                  <label className='flex items-center gap-2 cursor-pointer text-xs'>
                    <input
                      type='radio'
                      name='targetType'
                      value='head_office'
                      checked={targetForm.type === 'head_office'}
                      onChange={(e) => setTargetForm({ ...targetForm, type: e.target.value, name: 'Head Office (HO)' })}
                      className='text-teal-600 focus:ring-teal-500'
                    />
                    <span>Kantor Pusat Head Office (HO)</span>
                  </label>
                </div>
              </div>

              {/* Nama Lokasi / Titik */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='font-semibold text-gray-700'>
                    {targetForm.type === 'head_office' ? 'Nama Kantor Pusat (HO):' : 'Nama Titik Lokasi / Label:'}
                  </label>
                  <input
                    type='text'
                    value={targetForm.name}
                    onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })}
                    placeholder={
                      targetForm.type === 'head_office'
                        ? 'Contoh: Head Office (HO)'
                        : 'Contoh: PT Rezeki Kita (Banjarmasin)'
                    }
                    required
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs'
                  />
                </div>
                {targetForm.type === 'sales_distributor' ? (
                  <div>
                    <label className='font-semibold text-gray-700'>Nama Distributor Resmi:</label>
                    <input
                      type='text'
                      value={targetForm.distributorName}
                      onChange={(e) => {
                        const val = e.target.value
                        setTargetForm((prev) => ({
                          ...prev,
                          distributorName: val,
                          name: !prev.id && (!prev.name || prev.name === prev.distributorName) ? val : prev.name,
                        }))
                      }}
                      placeholder='Contoh: PT Rezeki Kita'
                      className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs'
                    />
                  </div>
                ) : (
                  <div>
                    <label className='font-semibold text-gray-700'>Kode Lokasi HO:</label>
                    <input
                      type='text'
                      value={targetForm.code || 'HO-MAIN'}
                      onChange={(e) => setTargetForm({ ...targetForm, code: e.target.value })}
                      placeholder='HO-MAIN'
                      className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs font-mono bg-gray-50'
                    />
                  </div>
                )}
              </div>

              {/* Karyawan yang Ditugaskan (jika tipe sales) */}
              {targetForm.type === 'sales_distributor' && (
                <div>
                  <label className='font-semibold text-gray-700'>Karyawan Sales yang Ditugaskan:</label>
                  <select
                    value={targetForm.employeeId}
                    onChange={(e) => {
                      const empId = e.target.value
                      const selectedEmp = availableEmployees.find((emp) => String(emp.id) === String(empId))
                      setTargetForm({
                        ...targetForm,
                        employeeId: empId,
                        employeeName: selectedEmp ? selectedEmp.name : '',
                      })
                    }}
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs bg-white'
                  >
                    <option value=''>-- Pilih Karyawan Sales --</option>
                    {availableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} (ID: {emp.id}) — {emp.dept || 'Sales'} ({emp.location || 'Others'})
                      </option>
                    ))}
                  </select>
                  <p className='text-[10px] text-gray-400 mt-1'>
                    Karyawan dapat memiliki lebih dari 1 titik distributor (seperti Fety Susiani & Putry Rinjani).
                  </p>
                </div>
              )}

              {/* Kota & Provinsi */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='font-semibold text-gray-700'>Kota / Kabupaten:</label>
                  <input
                    type='text'
                    value={targetForm.city}
                    onChange={(e) => setTargetForm({ ...targetForm, city: e.target.value })}
                    placeholder={targetForm.type === 'head_office' ? 'Contoh: Jakarta Utara' : 'Contoh: Banjarmasin / Gambut'}
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs'
                  />
                </div>
                <div>
                  <label className='font-semibold text-gray-700'>Provinsi:</label>
                  <input
                    type='text'
                    value={targetForm.province}
                    onChange={(e) => setTargetForm({ ...targetForm, province: e.target.value })}
                    placeholder={targetForm.type === 'head_office' ? 'Contoh: DKI Jakarta' : 'Contoh: Kalimantan Selatan'}
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs'
                  />
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <label className='font-semibold text-gray-700'>
                    {targetForm.type === 'head_office' ? 'Alamat Kantor Pusat HO:' : 'Alamat Kantor Distributor:'}
                  </label>
                  <div className='flex items-center gap-3'>
                    <button
                      type='button'
                      onClick={handleUseCurrentGPS}
                      disabled={geocodingLoading}
                      className='text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer'
                    >
                      <Navigation className='w-3 h-3' />
                      Ambil GPS Saat Ini
                    </button>
                    <button
                      type='button'
                      onClick={() => handleGeocode(targetForm.address || `${targetForm.distributorName || targetForm.name} ${targetForm.city}`)}
                      disabled={geocodingLoading}
                      className='text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer'
                    >
                      {geocodingLoading ? <Loader2 className='w-3 h-3 animate-spin' /> : <Compass className='w-3 h-3' />}
                      Cari Koordinat dari Alamat
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={targetForm.address}
                  onChange={(e) => setTargetForm({ ...targetForm, address: e.target.value })}
                  placeholder='Masukkan alamat lengkap kantor...'
                  required
                  className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs'
                />
              </div>

              {/* Koordinat GPS & Radius */}
              <div className='grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200'>
                <div>
                  <label className='font-semibold text-gray-700'>Latitude:</label>
                  <input
                    type='number'
                    step='any'
                    value={targetForm.latitude}
                    onChange={(e) => setTargetForm({ ...targetForm, latitude: e.target.value })}
                    placeholder='Contoh: -3.4047'
                    required
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs font-mono bg-white'
                  />
                </div>
                <div>
                  <label className='font-semibold text-gray-700'>Longitude:</label>
                  <input
                    type='number'
                    step='any'
                    value={targetForm.longitude}
                    onChange={(e) => setTargetForm({ ...targetForm, longitude: e.target.value })}
                    placeholder='Contoh: 114.6706'
                    required
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs font-mono bg-white'
                  />
                </div>
                <div>
                  <label className='font-semibold text-gray-700'>Radius (Meter):</label>
                  <input
                    type='number'
                    value={targetForm.radiusMeters}
                    onChange={(e) => setTargetForm({ ...targetForm, radiusMeters: Number(e.target.value) })}
                    placeholder='300'
                    required
                    className='mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs font-mono bg-white'
                  />
                </div>
              </div>

              {/* Preview Map Link */}
              {targetForm.latitude && targetForm.longitude && (
                <div className='flex items-center justify-between text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-xl border border-teal-200'>
                  <span className='flex items-center gap-1.5'>
                    <MapPin className='w-3.5 h-3.5' />
                    Titik siap: {targetForm.latitude}, {targetForm.longitude} (Radius {targetForm.radiusMeters}m)
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${targetForm.latitude},${targetForm.longitude}`}
                    target='_blank'
                    rel='noreferrer'
                    className='font-bold flex items-center gap-1 underline hover:text-teal-900'
                  >
                    Buka Google Maps <ExternalLink className='w-3 h-3' />
                  </a>
                </div>
              )}

              {/* Checkbox Aktif & Notes */}
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='targetActive'
                  checked={targetForm.active}
                  onChange={(e) => setTargetForm({ ...targetForm, active: e.target.checked })}
                  className='rounded border-gray-300 text-teal-600 focus:ring-teal-500'
                />
                <label htmlFor='targetActive' className='text-xs font-semibold text-gray-700 cursor-pointer'>
                  Aktifkan titik geofencing ini untuk absensi karyawan
                </label>
              </div>

              {/* Submit Buttons */}
              <div className='flex items-center justify-end gap-2 border-t border-gray-100 pt-3'>
                <button
                  type='button'
                  onClick={() => setShowTargetModal(false)}
                  className='rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                >
                  Batal
                </button>
                <button
                  type='submit'
                  disabled={savingTarget}
                  className='rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50'
                >
                  {savingTarget ? 'Menyimpan...' : 'Simpan Titik Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Modal Bulk Upload Titik Lokasi Distributor ────────────────── */}
      {showImportModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs'>
          <div className='w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
            {/* Header */}
            <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50'>
              <div className='flex items-center gap-2.5'>
                <div className='p-2 bg-emerald-100 text-emerald-700 rounded-xl'>
                  <FileSpreadsheet className='w-5 h-5' />
                </div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>
                    Upload Massal Titik Lokasi Distributor Area Sales
                  </h3>
                  <p className='text-xs text-gray-500'>
                    Unggah file Excel (.xlsx, .xls) atau CSV untuk menambah dan memperbarui banyak titik sekaligus.
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setShowImportModal(false)}
                className='text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Content Body */}
            <div className='p-6 overflow-y-auto space-y-5 text-xs flex-1'>
              {/* Template Download & Instructions banner */}
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900'>
                <div className='flex items-start gap-2.5'>
                  <FileSpreadsheet className='w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0' />
                  <div>
                    <span className='font-bold'>Gunakan Format Spreadsheet Resmi</span>
                    <p className='text-[11px] text-blue-700 mt-0.5'>
                      Pastikan kolom nama karyawan sales, nama distributor, serta koordinat Latitude dan Longitude terisi dengan benar.
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2 flex-shrink-0'>
                  <button
                    type='button'
                    onClick={handleDownloadTemplate}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition shadow-2xs cursor-pointer'
                  >
                    <Download className='w-3.5 h-3.5' />
                    Download Template
                  </button>
                  <button
                    type='button'
                    onClick={handleExportExcel}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-2xs cursor-pointer'
                  >
                    <Download className='w-3.5 h-3.5' />
                    Export Data Saat Ini
                  </button>
                </div>
              </div>

              {/* File Upload Drop Area */}
              <div>
                <label className='block font-bold text-gray-700 mb-1.5'>
                  Pilih File Excel / CSV
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className='border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-gray-50/50 hover:bg-emerald-50/20'
                >
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.xlsx, .xls, .csv'
                    className='hidden'
                    onChange={handleFileSelect}
                  />
                  <Upload className='w-8 h-8 text-gray-400 mx-auto mb-2' />
                  {importFile ? (
                    <div>
                      <p className='font-bold text-gray-800 text-sm'>{importFile.name}</p>
                      <p className='text-[11px] text-gray-500 mt-0.5'>
                        {(importFile.size / 1024).toFixed(1)} KB · Klik untuk mengganti file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className='font-semibold text-gray-700'>
                        Klik untuk memilih file spreadsheet (.xlsx / .csv)
                      </p>
                      <p className='text-[11px] text-gray-400 mt-1'>
                        Atau seret dan lepas file ke area ini
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Import Mode Options */}
              <div className='bg-gray-50 p-3.5 rounded-xl border border-gray-200'>
                <label className='block font-bold text-gray-800 mb-2'>
                  Strategi Penyimpanan Data:
                </label>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-2.5'>
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      importMode === 'upsert'
                        ? 'bg-white border-emerald-500 shadow-2xs text-emerald-950 ring-1 ring-emerald-500'
                        : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type='radio'
                      name='importMode'
                      value='upsert'
                      checked={importMode === 'upsert'}
                      onChange={(e) => setImportMode(e.target.value)}
                      className='mt-0.5 text-emerald-600 focus:ring-emerald-500'
                    />
                    <div>
                      <div className='font-bold text-xs'>Perbarui & Tambah (Upsert)</div>
                      <div className='text-[11px] text-gray-500 leading-tight mt-0.5'>
                        Update titik jika sudah ada, buat baru jika belum terdaftar (Rekomendasi).
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      importMode === 'insert_only'
                        ? 'bg-white border-emerald-500 shadow-2xs text-emerald-950 ring-1 ring-emerald-500'
                        : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type='radio'
                      name='importMode'
                      value='insert_only'
                      checked={importMode === 'insert_only'}
                      onChange={(e) => setImportMode(e.target.value)}
                      className='mt-0.5 text-emerald-600 focus:ring-emerald-500'
                    />
                    <div>
                      <div className='font-bold text-xs'>Hanya Tambah Baru</div>
                      <div className='text-[11px] text-gray-500 leading-tight mt-0.5'>
                        Hanya memasukkan data baru dan melewati titik yang kodenya sudah ada.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      importMode === 'replace_all'
                        ? 'bg-white border-rose-500 shadow-2xs text-rose-950 ring-1 ring-rose-500'
                        : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type='radio'
                      name='importMode'
                      value='replace_all'
                      checked={importMode === 'replace_all'}
                      onChange={(e) => setImportMode(e.target.value)}
                      className='mt-0.5 text-rose-600 focus:ring-rose-500'
                    />
                    <div>
                      <div className='font-bold text-xs text-rose-700'>Ganti Seluruh Data</div>
                      <div className='text-[11px] text-gray-500 leading-tight mt-0.5'>
                        Hapus semua 22 titik sales lama dan gantikan penuh dengan isi file.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Error messages if any */}
              {importErrors.length > 0 && (
                <div className='p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1'>
                  <div className='flex items-center gap-1.5 font-bold'>
                    <AlertCircle className='w-4 h-4 text-rose-600' />
                    Ditemukan {importErrors.length} Peringatan / Kesalahan Format:
                  </div>
                  <ul className='list-disc list-inside text-[11px] max-h-28 overflow-y-auto space-y-0.5 text-rose-700'>
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='font-bold text-gray-800 text-xs flex items-center gap-2'>
                      Pratinjau Data ({parsedRows.length} Baris Terbaca)
                      <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800'>
                        {parsedRows.filter((r) => r._isValid).length} Valid
                      </span>
                      {parsedRows.filter((r) => !r._isValid).length > 0 && (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800'>
                          {parsedRows.filter((r) => !r._isValid).length} Error
                        </span>
                      )}
                    </div>
                    <span className='text-[11px] text-gray-400'>
                      Menampilkan maksimal 50 baris pertama
                    </span>
                  </div>

                  <div className='border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto'>
                    <table className='w-full text-left text-xs'>
                      <thead className='bg-gray-100 sticky top-0 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200'>
                        <tr>
                          <th className='py-2 px-3 w-10 text-center'>No</th>
                          <th className='py-2 px-3'>Status</th>
                          <th className='py-2 px-3'>Karyawan Sales</th>
                          <th className='py-2 px-3'>Distributor & Kota</th>
                          <th className='py-2 px-3'>Koordinat</th>
                          <th className='py-2 px-3 text-center'>Radius</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100'>
                        {parsedRows.slice(0, 50).map((row, idx) => (
                          <tr
                            key={idx}
                            className={row._isValid ? 'hover:bg-gray-50' : 'bg-rose-50/50'}
                          >
                            <td className='py-1.5 px-3 text-center text-gray-400 text-[11px]'>
                              {row._rowNum}
                            </td>
                            <td className='py-1.5 px-3'>
                              {!row._isValid ? (
                                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700'>
                                  Format Salah
                                </span>
                              ) : row._actionType === 'update' ? (
                                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700'>
                                  Perbarui (Update)
                                </span>
                              ) : (
                                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700'>
                                  Baru (Insert)
                                </span>
                              )}
                            </td>
                            <td className='py-1.5 px-3 font-semibold text-gray-900'>
                              {row.employeeName || <span className='text-gray-400 italic'>-</span>}
                            </td>
                            <td className='py-1.5 px-3'>
                              <div className='font-medium text-gray-800'>{row.distributorName}</div>
                              {row.city && (
                                <div className='text-[10px] text-gray-400'>{row.city}</div>
                              )}
                            </td>
                            <td className='py-1.5 px-3 font-mono text-[11px] text-gray-600'>
                              {row._isValid ? `${row.latitude}, ${row.longitude}` : (
                                <span className='text-rose-600 font-sans text-[11px]'>{row._errorMsg}</span>
                              )}
                            </td>
                            <td className='py-1.5 px-3 text-center text-gray-600'>
                              {row.radiusMeters}m
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className='border-t border-gray-100 px-6 py-3.5 bg-gray-50/50 flex items-center justify-between'>
              <button
                type='button'
                onClick={() => setShowImportModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer'
              >
                Batal
              </button>

              <button
                type='button'
                disabled={isImporting || parsedRows.filter((r) => r._isValid).length === 0}
                onClick={handleExecuteBulkImport}
                className='inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
              >
                {isImporting ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Menyimpan ke Database...
                  </>
                ) : (
                  <>
                    <Upload className='w-4 h-4' />
                    Simpan & Terapkan ({parsedRows.filter((r) => r._isValid).length} Titik)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkLocationSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Memuat pengaturan lokasi kerja & geofencing...</div>}>
      <WorkLocationSettingsContent />
    </Suspense>
  )
}
