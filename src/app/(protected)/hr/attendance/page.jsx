'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAttendanceStore, todayStr } from '@/store/attendanceStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import { exportCsv } from '@/utils/exportCsv'
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
import { resolveLocationCode } from '@/lib/attendanceCalculator'

const STATUS_TONES = {
  Present: 'success',
  Late: 'warning',
  Absent: 'danger',
  Leave: 'info',
}

const LOCATION_LABELS = {
  ho: 'Head Office (HO)',
  gudang: 'Gudang',
  sales: 'Area Sales (Others)',
  livestream: 'Livestream (Manhattan)',
}

const LOCATION_BADGE_STYLE = {
  ho: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  gudang: 'bg-amber-50 text-amber-700 border-amber-200',
  sales: 'bg-teal-50 text-teal-700 border-teal-200',
  livestream: 'bg-purple-50 text-purple-700 border-purple-200',
}

const OFFICIAL_DEPARTMENTS = [
  'Administration',
  'Brand Marketing',
  'Ecommerce & Ads',
  'Engineering',
  'FAT',
  'Fullfilment',
  'HR/GA',
  'IT',
  'Live Streaming',
  'Product Development',
  'Purchasing',
  'Sales Offline',
  'Supplychain',
  'Support',
]

/**
 * Menghitung rentang tanggal cut-off presensi (26 bulan lalu s/d 25 bulan berjalan)
 */
function calculateCutoffRange(dateRef) {
  const d = dateRef ? new Date(dateRef) : new Date()
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()

  let startYear, startMonth, endYear, endMonth

  if (day >= 26) {
    startYear = year
    startMonth = month
    const nextDate = new Date(year, month + 1, 1)
    endYear = nextDate.getFullYear()
    endMonth = nextDate.getMonth()
  } else {
    const prevDate = new Date(year, month - 1, 1)
    startYear = prevDate.getFullYear()
    startMonth = prevDate.getMonth()
    endYear = year
    endMonth = month
  }

  const pad = (n) => String(n).padStart(2, '0')
  const dateFrom = `${startYear}-${pad(startMonth + 1)}-26`
  const dateTo = `${endYear}-${pad(endMonth + 1)}-25`

  return { dateFrom, dateTo }
}

function EmployeeAvatar({ name, photo, size = 'w-8 h-8' }) {
  const initials = (name || '?')
    .trim()
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 text-white font-bold text-xs`}
      style={{
        background: photo ? undefined : 'linear-gradient(135deg, #052B52, #039299)',
      }}
    >
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initials}
    </div>
  )
}

export default function HRAttendancePage() {
  const t = useT()
  const { records, updateRecord, addRecord } = useAttendanceStore()
  const { employees } = useEmployeeStore()
  const { departments } = useStructureStore()

  const defaultCutoff = useMemo(() => calculateCutoffRange(), [])
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'daily'
  const [dbRecords, setDbRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFilterApplied, setIsFilterApplied] = useState(false) // Default kosong saat dibuka

  // Filter States (Default awal belum ada filter aktif)
  const [dateFilterMode, setDateFilterMode] = useState(null) // 'cutoff' | 'month' | 'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all' | null
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [search, setSearch] = useState('')

  // Drill-down Modal State
  const [selectedEmpDetail, setSelectedEmpDetail] = useState(null)

  // Real-time Calculation States
  const [calculatingEdit, setCalculatingEdit] = useState(false)
  const [calcEditPreview, setCalcEditPreview] = useState(null)
  const [calcAddPreview, setCalcAddPreview] = useState(null)

  // Edit / Add Modal States
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({
    checkIn: '',
    checkOut: '',
    status: 'Present',
    penaltyAmount: 0,
    lateMinutes: 0,
    note: '',
  })

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    empId: '',
    date: todayStr(),
    checkIn: '09:00',
    checkOut: '18:00',
    status: 'Present',
    penaltyAmount: 0,
    note: '',
  })

  const [actionMsg, setActionMsg] = useState(null)

  // Fungsi Kalkulasi Otomatis Presensi Real-Time saat HR Edit Jam Masuk
  const handleRecalculateEdit = async (timeVal, dateVal, empIdVal) => {
    if (!timeVal) return
    try {
      setCalculatingEdit(true)
      const res = await fetch('/api/attendance/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: empIdVal || editingRecord?.empId,
          date: dateVal || editingRecord?.date,
          clockInTime: timeVal,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setCalcEditPreview(data)
          setEditForm((prev) => {
            let noteVal = prev.note || ''
            if (data.isHalfDayCut) {
              noteVal = 'Terlambat >20 menit (Potong Setengah Hari)'
            } else if (data.penaltyLabel && data.penaltyLabel !== '-' && data.penaltyLabel !== 'Tepat Waktu') {
              noteVal = data.penaltyLabel
            } else if (data.status === 'Present') {
              if (noteVal.includes('Setengah Hari') || noteVal.includes('Menit') || noteVal.includes('Terlambat')) {
                noteVal = ''
              }
            }
            return {
              ...prev,
              checkIn: timeVal,
              status: data.status,
              lateMinutes: data.lateMinutes,
              penaltyAmount: data.penaltyAmount,
              note: noteVal,
            }
          })
        }
      }
    } catch (err) {
      console.error('Failed to recalculate attendance:', err)
    } finally {
      setCalculatingEdit(false)
    }
  }

  // Fungsi Kalkulasi Otomatis Presensi Real-Time saat Tambah Presensi Manual
  const handleRecalculateAdd = async (empIdVal, timeVal, dateVal) => {
    if (!empIdVal || !timeVal) return
    try {
      const res = await fetch('/api/attendance/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: empIdVal,
          date: dateVal || todayStr(),
          clockInTime: timeVal,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setCalcAddPreview(data)
          setAddForm((prev) => {
            let noteVal = prev.note || ''
            if (data.isHalfDayCut) {
              noteVal = 'Terlambat >20 menit (Potong Setengah Hari)'
            } else if (data.penaltyLabel && data.penaltyLabel !== '-' && data.penaltyLabel !== 'Tepat Waktu') {
              noteVal = data.penaltyLabel
            } else if (data.status === 'Present') {
              if (noteVal.includes('Setengah Hari') || noteVal.includes('Menit') || noteVal.includes('Terlambat')) {
                noteVal = ''
              }
            }
            return {
              ...prev,
              status: data.status,
              penaltyAmount: data.penaltyAmount,
              note: noteVal,
            }
          })
        }
      }
    } catch (err) {
      console.error('Failed to recalculate manual add:', err)
    }
  }

  // Fetch presensi terfilter dari DB secara on-demand
  const fetchFilteredRecords = async (from = dateFrom, to = dateTo) => {
    try {
      setLoading(true)
      setIsFilterApplied(true)
      const params = new URLSearchParams()
      if (from) params.set('startDate', from)
      if (to) params.set('endDate', to)
      params.set('limit', '5000')

      const res = await fetch(`/api/attendance?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setDbRecords(data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance records:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Preset Tanggal: langsung memuat dan memunculkan data seketika
  const handleSelectPreset = (mode) => {
    setDateFilterMode(mode)
    const today = todayStr()
    const d = new Date()
    let from = ''
    let to = ''

    if (mode === 'cutoff') {
      const co = calculateCutoffRange()
      from = co.dateFrom
      to = co.dateTo
    } else if (mode === 'month') {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate()
      from = `${year}-${month}-01`
      to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    } else if (mode === 'today') {
      from = today
      to = today
    } else if (mode === 'yesterday') {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      const yStr = y.toISOString().split('T')[0]
      from = yStr
      to = yStr
    } else if (mode === '7days') {
      const p = new Date()
      p.setDate(p.getDate() - 7)
      from = p.toISOString().split('T')[0]
      to = today
    } else if (mode === '30days') {
      const p = new Date()
      p.setDate(p.getDate() - 30)
      from = p.toISOString().split('T')[0]
      to = today
    } else if (mode === 'all') {
      from = ''
      to = ''
    }

    setDateFrom(from)
    setDateTo(to)
    fetchFilteredRecords(from, to)
  }

  // Reset / Bersihkan Filter: mengembalikan tampilan ke default kosong
  const handleResetFilter = () => {
    setIsFilterApplied(false)
    setDateFilterMode(null)
    setDateFrom('')
    setDateTo('')
    setSelectedLocation('all')
    setSelectedDept('all')
    setSelectedStatus('all')
    setSearch('')
    setDbRecords([])
  }

  // Gabungkan dbRecords dan records dari attendanceStore (deduplikasi berdasarkan id atau empId_date)
  const combinedRecords = useMemo(() => {
    const map = new Map()

    // 1. Prioritaskan dbRecords
    for (const r of dbRecords) {
      const key = `${r.empId}_${r.date}`
      map.set(key, {
        id: r.id,
        empId: r.empId,
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status || 'Present',
        lateMinutes: r.lateMinutes || 0,
        penaltyAmount: r.penaltyAmount || 0,
        note: r.note || '',
        employeeName: r.employee?.name,
        employeeDept: r.employee?.dept,
        employeeLocation: r.employee?.location,
        checkInLat: r.checkInLat,
        checkInLng: r.checkInLng,
        checkInDistance: r.checkInDistance,
        checkInLocation: r.checkInLocation,
        checkOutLat: r.checkOutLat,
        checkOutLng: r.checkOutLng,
        checkOutDistance: r.checkOutDistance,
        checkOutLocation: r.checkOutLocation,
        isWithinRadius: r.isWithinRadius,
        accuracyMeters: r.accuracyMeters,
        isMockGps: r.isMockGps,
        mockGpsReason: r.mockGpsReason,
      })
    }

    // 2. Lengkapi dari attendanceStore
    for (const r of records) {
      const key = `${r.userId || r.empId}_${r.date}`
      if (!map.has(key)) {
        map.set(key, {
          id: r.id,
          empId: r.userId || r.empId,
          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status || 'Present',
          lateMinutes: r.lateMinutes || 0,
          penaltyAmount: r.penaltyAmount || 0,
          note: r.note || '',
          employeeName: r.name,
          checkInLat: r.checkInLat,
          checkInLng: r.checkInLng,
          checkInDistance: r.checkInDistance,
          checkInLocation: r.checkInLocation,
          checkOutLat: r.checkOutLat,
          checkOutLng: r.checkOutLng,
          checkOutDistance: r.checkOutDistance,
          checkOutLocation: r.checkOutLocation,
          isWithinRadius: r.isWithinRadius,
          accuracyMeters: r.accuracyMeters,
          isMockGps: r.isMockGps,
          mockGpsReason: r.mockGpsReason,
        })
      }
    }

    // Sambungkan data lengkap dari employeeStore
    const result = Array.from(map.values()).map((rec) => {
      const emp = employees.find((e) => e.id === Number(rec.empId))
      const locRaw = emp?.workLocationCode || emp?.location || rec.employeeLocation || 'HO'
      const locCode = resolveLocationCode(locRaw, emp?.dept || rec.employeeDept)
      return {
        ...rec,
        employeeName: emp?.name || rec.employeeName || `Employee #${rec.empId}`,
        nik: emp?.nik || `EMP${rec.empId}`,
        dept: emp?.dept || rec.employeeDept || 'General',
        locationCode: locCode,
        locationLabel: LOCATION_LABELS[locCode] || locRaw,
        photo: emp?.photo || null,
      }
    })

    return result.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [dbRecords, records, employees])

  // Filter Logika Data Harian (filteredRecords)
  const filteredRecords = useMemo(() => {
    if (!isFilterApplied) return []

    return combinedRecords.filter((rec) => {
      // 1. Date Range Filter
      if (dateFrom && rec.date < dateFrom) return false
      if (dateTo && rec.date > dateTo) return false

      // 2. Location Filter
      if (selectedLocation !== 'all' && rec.locationCode !== selectedLocation) return false

      // 3. Dept Filter
      if (selectedDept !== 'all' && rec.dept !== selectedDept) return false

      // 4. Status Filter
      if (selectedStatus !== 'all' && rec.status !== selectedStatus) return false

      // 5. Search Filter
      if (search) {
        const q = search.toLowerCase()
        const matchName = rec.employeeName?.toLowerCase().includes(q)
        const matchNik = rec.nik?.toLowerCase().includes(q)
        if (!matchName && !matchNik) return false
      }

      return true
    })
  }, [combinedRecords, isFilterApplied, dateFrom, dateTo, selectedLocation, selectedDept, selectedStatus, search])

  // Agregasi Ringkasan Per Karyawan (employeeSummaries)
  const employeeSummaries = useMemo(() => {
    if (!isFilterApplied) return []

    const map = new Map()

    // 1. Daftarkan seluruh karyawan aktif
    employees.forEach((emp) => {
      const locRaw = emp.workLocationCode || emp.location || 'HO'
      const locCode = resolveLocationCode(locRaw, emp.dept)

      if (selectedLocation !== 'all' && locCode !== selectedLocation) return
      if (selectedDept !== 'all' && emp.dept !== selectedDept) return
      if (search) {
        const q = search.toLowerCase()
        const matchName = emp.name?.toLowerCase().includes(q)
        const matchNik = emp.nik?.toLowerCase().includes(q)
        if (!matchName && !matchNik) return
      }

      map.set(emp.id, {
        empId: emp.id,
        employeeName: emp.name,
        nik: emp.nik || `EMP${emp.id}`,
        dept: emp.dept || 'General',
        locationCode: locCode,
        locationLabel: LOCATION_LABELS[locCode] || locRaw,
        photo: emp.photo || null,
        presentDays: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        totalPenalty: 0,
        halfDayCuts: 0,
        leaveDays: 0,
        absentDays: 0,
        totalRecords: 0,
        records: [],
      })
    })

    // 2. Akumulasikan data presensi sesuai rentang tanggal
    combinedRecords.forEach((rec) => {
      if (dateFrom && rec.date < dateFrom) return
      if (dateTo && rec.date > dateTo) return

      let summary = map.get(Number(rec.empId))
      if (!summary) {
        const locCode = rec.locationCode || 'ho'
        if (selectedLocation !== 'all' && locCode !== selectedLocation) return
        if (selectedDept !== 'all' && rec.dept !== selectedDept) return
        if (search) {
          const q = search.toLowerCase()
          const matchName = rec.employeeName?.toLowerCase().includes(q)
          const matchNik = rec.nik?.toLowerCase().includes(q)
          if (!matchName && !matchNik) return
        }

        summary = {
          empId: rec.empId,
          employeeName: rec.employeeName,
          nik: rec.nik || `EMP${rec.empId}`,
          dept: rec.dept || 'General',
          locationCode: locCode,
          locationLabel: LOCATION_LABELS[locCode] || locCode,
          photo: rec.photo || null,
          presentDays: 0,
          lateDays: 0,
          totalLateMinutes: 0,
          totalPenalty: 0,
          halfDayCuts: 0,
          leaveDays: 0,
          absentDays: 0,
          totalRecords: 0,
          records: [],
        }
        map.set(Number(rec.empId), summary)
      }

      summary.records.push(rec)
      summary.totalRecords++

      if (rec.status === 'Present') {
        summary.presentDays++
      } else if (rec.status === 'Late') {
        summary.lateDays++
        summary.totalLateMinutes += Number(rec.lateMinutes) || 0
        summary.totalPenalty += Number(rec.penaltyAmount) || 0
        if (rec.note && rec.note.includes('Setengah Hari')) {
          summary.halfDayCuts++
        }
      } else if (rec.status === 'Leave') {
        summary.leaveDays++
      } else if (rec.status === 'Absent') {
        summary.absentDays++
      }
    })

    // 3. Kalkulasi Reward & Filter Status
    let list = Array.from(map.values()).map((s) => {
      s.records.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      const isRewardEligible = s.presentDays > 0 && s.lateDays === 0 && s.absentDays === 0 && s.halfDayCuts === 0
      return {
        ...s,
        isRewardEligible,
        rewardAmount: isRewardEligible ? 200000 : 0,
      }
    })

    if (selectedStatus === 'Late') {
      list = list.filter((s) => s.lateDays > 0)
    } else if (selectedStatus === 'Present') {
      list = list.filter((s) => s.presentDays > 0 && s.lateDays === 0)
    } else if (selectedStatus === 'Absent') {
      list = list.filter((s) => s.absentDays > 0)
    } else if (selectedStatus === 'Leave') {
      list = list.filter((s) => s.leaveDays > 0)
    }

    return list.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }, [combinedRecords, employees, isFilterApplied, dateFrom, dateTo, selectedLocation, selectedDept, selectedStatus, search])

  // Metrik Stat Cards
  const summary = useMemo(() => {
    if (!isFilterApplied) {
      return {
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        totalPenalty: 0,
        eligibleRewardCount: 0,
      }
    }

    let present = 0
    let late = 0
    let absent = 0
    let leave = 0
    let totalPenalty = 0

    filteredRecords.forEach((r) => {
      if (r.status === 'Present') present++
      else if (r.status === 'Late') late++
      else if (r.status === 'Absent') absent++
      else if (r.status === 'Leave') leave++

      if (r.penaltyAmount) {
        totalPenalty += Number(r.penaltyAmount) || 0
      }
    })

    const eligibleRewardCount = employeeSummaries.filter((e) => e.isRewardEligible).length

    return {
      total: filteredRecords.length,
      present,
      late,
      absent,
      leave,
      totalPenalty,
      eligibleRewardCount,
    }
  }, [filteredRecords, employeeSummaries, isFilterApplied])

  // Export CSV
  const handleExportCsv = () => {
    const periodLabel = dateFrom && dateTo ? `${dateFrom}_sd_${dateTo}` : dateFilterMode

    if (activeTab === 'summary') {
      const headers = [
        'NIK',
        'Nama Karyawan',
        'Departemen',
        'Lokasi Kerja',
        'Hari Hadir',
        'Hari Telat',
        'Total Menit Telat',
        'Denda Telat (Rp)',
        'Potong 0.5 Hari',
        'Cuti / Sakit',
        'Alpha',
        'Reward Disiplin (Rp)',
        'Status Reward',
      ]
      const rows = employeeSummaries.map((s) => [
        s.nik,
        s.employeeName,
        s.dept,
        s.locationLabel,
        s.presentDays,
        s.lateDays,
        s.totalLateMinutes,
        s.totalPenalty,
        s.halfDayCuts,
        s.leaveDays,
        s.absentDays,
        s.rewardAmount,
        s.isRewardEligible ? 'Eligible (Rp 200.000)' : 'Gugur',
      ])
      const filename = `Rekap_Presensi_Karyawan_${periodLabel}_${new Date().toISOString().slice(0, 10)}`
      exportCsv(filename, headers, rows)
    } else {
      const headers = [
        'NIK',
        'Nama Karyawan',
        'Departemen',
        'Lokasi Kerja',
        'Tanggal',
        'Check In',
        'Check Out',
        'Status',
        'Terlambat (Menit)',
        'Denda Keterlambatan (Rp)',
        'Lokasi Target Presensi',
        'Jarak Check-In (Meter)',
        'Status Geofencing',
        'Mock/Fake GPS',
        'Catatan / Alasan',
      ]
      const rows = filteredRecords.map((r) => [
        r.nik,
        r.employeeName,
        r.dept,
        r.locationLabel,
        r.date,
        r.checkIn || '-',
        r.checkOut || '-',
        r.status,
        r.lateMinutes || 0,
        r.penaltyAmount || 0,
        r.checkInLocation || '-',
        r.checkInDistance != null ? Math.round(r.checkInDistance) : '-',
        r.isWithinRadius === true ? 'Dalam Radius (<=300m)' : r.isWithinRadius === false ? 'Luar Radius (>300m)' : '-',
        r.isMockGps ? `Ya (${r.mockGpsReason || 'Detected'})` : 'Tidak',
        r.note || '-',
      ])
      const filename = `Log_Presensi_Harian_${periodLabel}_${new Date().toISOString().slice(0, 10)}`
      exportCsv(filename, headers, rows)
    }
  }

  // Individual CSV Export
  const handleExportIndividualCsv = (empSummary) => {
    if (!empSummary) return
    const headers = [
      'NIK',
      'Nama Karyawan',
      'Departemen',
      'Lokasi Kerja',
      'Tanggal',
      'Hari',
      'Check In',
      'Check Out',
      'Status',
      'Terlambat (Menit)',
      'Denda Keterlambatan (Rp)',
      'Lokasi Target Presensi',
      'Jarak Check-In (Meter)',
      'Status Geofencing',
      'Mock/Fake GPS',
      'Catatan / Keterangan',
    ]

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const rows = empSummary.records.map((r) => {
      const d = r.date ? new Date(r.date) : null
      const dayName = d && !isNaN(d.getDay()) ? dayNames[d.getDay()] : '-'
      return [
        empSummary.nik,
        empSummary.employeeName,
        empSummary.dept,
        empSummary.locationLabel,
        r.date,
        dayName,
        r.checkIn || '-',
        r.checkOut || '-',
        r.status,
        r.lateMinutes || 0,
        r.penaltyAmount || 0,
        r.checkInLocation || '-',
        r.checkInDistance != null ? Math.round(r.checkInDistance) : '-',
        r.isWithinRadius === true ? 'Dalam Radius (<=300m)' : r.isWithinRadius === false ? 'Luar Radius (>300m)' : '-',
        r.isMockGps ? `Ya (${r.mockGpsReason || 'Detected'})` : 'Tidak',
        r.note || '-',
      ]
    })

    const periodLabel = dateFrom && dateTo ? `${dateFrom}_sd_${dateTo}` : 'all'
    const safeName = (empSummary.employeeName || 'karyawan').replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Presensi_${safeName}_${periodLabel}`
    exportCsv(filename, headers, rows)
  }

  // Open Edit Modal
  const handleEditClick = (rec) => {
    setEditingRecord(rec)
    setCalcEditPreview(null)
    setEditForm({
      checkIn: rec.checkIn || '',
      checkOut: rec.checkOut || '',
      status: rec.status || 'Present',
      penaltyAmount: rec.penaltyAmount || 0,
      lateMinutes: rec.lateMinutes || 0,
      note: rec.note || '',
    })
    setEditModalOpen(true)
    if (rec.checkIn) {
      handleRecalculateEdit(rec.checkIn, rec.date, rec.empId)
    }
  }

  // Save Edit Presensi
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingRecord) return

    try {
      const payload = {
        checkIn: editForm.checkIn || null,
        checkOut: editForm.checkOut || null,
        status: editForm.status,
        penaltyAmount: Number(editForm.penaltyAmount) || 0,
        lateMinutes: Number(editForm.lateMinutes) || 0,
        note: editForm.note || null,
      }

      const res = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        updateRecord(editingRecord.id, payload)
        setActionMsg({ type: 'success', text: `Presensi ${editingRecord.employeeName} (${editingRecord.date}) berhasil diperbarui.` })
        fetchFilteredRecords(dateFrom, dateTo)
        setEditModalOpen(false)

        // Perbarui data modal drill-down jika sedang dibuka
        if (selectedEmpDetail) {
          setSelectedEmpDetail((prev) => {
            if (!prev) return null
            const updatedRecords = prev.records.map((r) =>
              r.id === editingRecord.id ? { ...r, ...payload } : r
            )
            let presentDays = 0, lateDays = 0, totalLateMinutes = 0, totalPenalty = 0, halfDayCuts = 0
            updatedRecords.forEach((r) => {
              if (r.status === 'Present') presentDays++
              else if (r.status === 'Late') {
                lateDays++
                totalLateMinutes += Number(r.lateMinutes) || 0
                totalPenalty += Number(r.penaltyAmount) || 0
                if (r.note && r.note.includes('Setengah Hari')) halfDayCuts++
              }
            })
            const isRewardEligible = presentDays > 0 && lateDays === 0 && halfDayCuts === 0
            return {
              ...prev,
              records: updatedRecords,
              presentDays,
              lateDays,
              totalLateMinutes,
              totalPenalty,
              halfDayCuts,
              isRewardEligible,
              rewardAmount: isRewardEligible ? 200000 : 0,
            }
          })
        }
      } else {
        setActionMsg({ type: 'error', text: 'Gagal memperbarui presensi di server.' })
      }
    } catch (err) {
      console.error(err)
      setActionMsg({ type: 'error', text: 'Terjadi kendala jaringan saat menyimpan koreksi.' })
    }
  }

  // Delete Record
  const handleDeleteRecord = async (rec) => {
    if (!confirm(`Hapus data presensi ${rec.employeeName} pada tanggal ${rec.date}?`)) return

    try {
      const res = await fetch(`/api/attendance/${rec.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setActionMsg({ type: 'success', text: `Data presensi berhasil dihapus.` })
        fetchFilteredRecords(dateFrom, dateTo)
        if (selectedEmpDetail) {
          setSelectedEmpDetail((prev) => {
            if (!prev) return null
            const updatedRecords = prev.records.filter((r) => r.id !== rec.id)
            return {
              ...prev,
              records: updatedRecords,
            }
          })
        }
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: 'Gagal menghapus presensi.' })
    }
  }

  // Handle Tambah Presensi Manual
  const handleSaveAdd = async (e) => {
    e.preventDefault()
    if (!addForm.empId) {
      alert('Pilih karyawan terlebih dahulu.')
      return
    }

    try {
      const payload = {
        empId: Number(addForm.empId),
        date: addForm.date,
        checkIn: addForm.checkIn || null,
        checkOut: addForm.checkOut || null,
        status: addForm.status,
        penaltyAmount: Number(addForm.penaltyAmount) || 0,
        note: addForm.note || null,
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        addRecord(payload)
        setActionMsg({ type: 'success', text: 'Presensi manual berhasil dicatat.' })
        fetchFilteredRecords(dateFrom, dateTo)
        setAddModalOpen(false)
        setCalcAddPreview(null)
        setAddForm({
          empId: '',
          date: todayStr(),
          checkIn: '09:00',
          checkOut: '18:00',
          status: 'Present',
          penaltyAmount: 0,
          note: '',
        })
      } else {
        setActionMsg({ type: 'error', text: 'Gagal mencatat presensi di database.' })
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: 'Terjadi kesalahan sistem saat menyimpan.' })
    }
  }

  // List unique departments (14 departemen resmi)
  const allDepts = useMemo(() => {
    const set = new Set(OFFICIAL_DEPARTMENTS)
    employees.forEach((e) => {
      if (e.dept && !e.dept.startsWith('AG -') && !e.dept.startsWith('AM -') && !e.dept.startsWith('BP -')) {
        set.add(e.dept)
      }
    })
    if (Array.isArray(departments)) {
      departments.forEach((d) => {
        if (d.name && !d.name.startsWith('AG -') && !d.name.startsWith('AM -') && !d.name.startsWith('BP -')) {
          set.add(d.name)
        }
      })
    }
    return Array.from(set).sort()
  }, [employees, departments])

  return (
    <div className="pb-12">
      <PageHeader
        icon="🕒"
        title={t('Attendance Management', 'Attendance Management')}
        subtitle={t(
          'Kelola dan pantau seluruh data presensi, rekap periode cut-off, keterlambatan, serta denda karyawan se-perusahaan.',
          'Manage and monitor employee attendance, cutoff summaries, late penalties, and clock corrections company-wide.'
        )}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/sysadmin/settings/work-location"
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition shadow-sm"
              title="Buka pengaturan aturan jam kerja, toleransi, dan denda keterlambatan"
            >
              <Icon e="⚙️" size={14} />
              <span>Aturan Jam Kerja</span>
            </Link>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition shadow-sm"
              title={`Unduh ${activeTab === 'summary' ? 'Ringkasan Karyawan' : 'Log Harian'} ke file CSV`}
            >
              <Icon e="📥" size={14} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition"
              style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
            >
              <Icon e="➕" size={14} />
              <span>Tambah Presensi</span>
            </button>
          </div>
        }
      />

      {/* Alert Notifikasi */}
      {actionMsg && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
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

      {/* Ringkasan Metrik (Stat Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard title="Total Tercatat" value={isFilterApplied ? summary.total : '—'} icon="📋" tone="brand" />
        <StatCard title="Hadir Tepat" value={isFilterApplied ? summary.present : '—'} icon="✅" tone="green" />
        <StatCard title="Terlambat" value={isFilterApplied ? summary.late : '—'} icon="⏰" tone="orange" />
        <StatCard title="Alpha / Absen" value={isFilterApplied ? summary.absent : '—'} icon="🚫" tone="red" />
        <StatCard title="Cuti / Izin" value={isFilterApplied ? summary.leave : '—'} icon="🏖️" tone="blue" />
        <StatCard
          title="Total Denda"
          value={isFilterApplied ? `Rp ${summary.totalPenalty.toLocaleString('id-ID')}` : '—'}
          icon="💰"
          tone="purple"
        />
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-4 mb-6 shadow-sm">
        {/* Preset Periode & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 mr-1.5">Periode:</span>
            {[
              { id: 'cutoff', label: '⚡ Cut-Off (26-25)' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: '7days', label: '7 Hari' },
              { id: '30days', label: '30 Hari' },
              { id: 'all', label: 'Semua' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-2.5 py-1 text-xs rounded-md transition font-medium ${
                  dateFilterMode === p.id && isFilterApplied
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            {isFilterApplied && (
              <button
                onClick={handleResetFilter}
                className="ml-2 px-2.5 py-1 text-xs rounded-md transition font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1"
                title="Bersihkan filter dan kembalikan ke default kosong"
              >
                <Icon e="🔄" size={12} />
                <span>Bersihkan</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari NIK atau Nama..."
              value={search}
              onChange={(e) => {
                const val = e.target.value
                setSearch(val)
                if (val && !isFilterApplied) {
                  const co = calculateCutoffRange()
                  setDateFilterMode('cutoff')
                  setDateFrom(co.dateFrom)
                  setDateTo(co.dateTo)
                  fetchFilteredRecords(co.dateFrom, co.dateTo)
                }
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-teal-600 transition"
            />
            <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Input Rentang Tanggal Manual */}
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-100 text-xs text-gray-600">
          <span className="font-semibold text-gray-500">Rentang Tanggal:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-[11px]">Dari</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                const val = e.target.value
                setDateFrom(val)
                setDateFilterMode('custom')
                if (val && dateTo) {
                  fetchFilteredRecords(val, dateTo)
                }
              }}
              className="border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-700 font-mono bg-gray-50 focus:bg-white focus:outline-teal-600"
            />
          </div>
          <span className="text-gray-400 text-xs">—</span>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-[11px]">Sampai</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                const val = e.target.value
                setDateTo(val)
                setDateFilterMode('custom')
                if (dateFrom && val) {
                  fetchFilteredRecords(dateFrom, val)
                }
              }}
              className="border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-700 font-mono bg-gray-50 focus:bg-white focus:outline-teal-600"
            />
          </div>

          <button
            onClick={() => fetchFilteredRecords(dateFrom, dateTo)}
            className="px-3 py-1 text-xs font-semibold rounded-md bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition"
            title="Muat data sesuai rentang tanggal"
          >
            Terapkan
          </button>

          {(dateFrom || dateTo) && isFilterApplied && (
            <span className="text-[11px] text-teal-700 font-medium bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full sm:ml-auto">
              🗓️ Rentang Aktif: <strong className="font-mono">{dateFrom || 'Awal'}</strong> s/d <strong className="font-mono">{dateTo || 'Akhir'}</strong>
            </span>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Lokasi Kerja */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Lokasi Kerja</label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                const val = e.target.value
                setSelectedLocation(val)
                if (val !== 'all' && !isFilterApplied) {
                  const co = calculateCutoffRange()
                  setDateFilterMode('cutoff')
                  setDateFrom(co.dateFrom)
                  setDateTo(co.dateTo)
                  fetchFilteredRecords(co.dateFrom, co.dateTo)
                }
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:bg-white focus:outline-teal-600"
            >
              <option value="all">Semua Lokasi Kerja</option>
              <option value="ho">Head Office (HO)</option>
              <option value="gudang">Gudang (Warehouse)</option>
              <option value="sales">Area Sales (Others)</option>
              <option value="livestream">Livestream (Manhattan)</option>
            </select>
          </div>

          {/* Departemen */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Departemen</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                const val = e.target.value
                setSelectedDept(val)
                if (val !== 'all' && !isFilterApplied) {
                  const co = calculateCutoffRange()
                  setDateFilterMode('cutoff')
                  setDateFrom(co.dateFrom)
                  setDateTo(co.dateTo)
                  fetchFilteredRecords(co.dateFrom, co.dateTo)
                }
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:bg-white focus:outline-teal-600"
            >
              <option value="all">Semua Departemen</option>
              {allDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status Kehadiran</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                const val = e.target.value
                setSelectedStatus(val)
                if (val !== 'all' && !isFilterApplied) {
                  const co = calculateCutoffRange()
                  setDateFilterMode('cutoff')
                  setDateFrom(co.dateFrom)
                  setDateTo(co.dateTo)
                  fetchFilteredRecords(co.dateFrom, co.dateTo)
                }
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:bg-white focus:outline-teal-600"
            >
              <option value="all">Semua Status</option>
              <option value="Present">Hadir Tepat Waktu (Present)</option>
              <option value="Late">Terlambat (Late)</option>
              <option value="Absent">Alpha / Tidak Hadir (Absent)</option>
              <option value="Leave">Cuti / Izin (Leave)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Switcher View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'summary'
                ? 'bg-white text-teal-900 shadow-sm border border-gray-200/60'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon e="👥" size={14} />
            <span>Ringkasan Per Karyawan ({employeeSummaries.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'daily'
                ? 'bg-white text-teal-900 shadow-sm border border-gray-200/60'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon e="📋" size={14} />
            <span>Log Presensi Harian ({filteredRecords.length})</span>
          </button>
        </div>

        <div className="text-xs text-gray-500 font-medium">
          {activeTab === 'summary' ? (
            <span>Menampilkan rekapitulasi kehadiran per karyawan selama periode terpilih</span>
          ) : (
            <span>Menampilkan riwayat check-in/out harian seluruh karyawan</span>
          )}
        </div>
      </div>

      {/* Konten Tabel Sesuai Tab Aktif */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat data presensi dari database...
          </div>
        ) : !isFilterApplied ? (
          /* DEFAULT KOSONG: PANDUAN PILIH FILTER */
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs border border-teal-100">
              <Icon e="🗓️" size={28} />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Data Presensi Belum Difilter</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
              Silakan pilih periode cut-off atau rentang tanggal di atas untuk memuat ringkasan performa kehadiran dan riwayat harian karyawan.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handleSelectPreset('cutoff')}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-xs transition"
                style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
              >
                <span>⚡ Tampilkan Periode Cut-Off (26-25)</span>
              </button>
              <button
                onClick={() => handleSelectPreset('month')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs transition"
              >
                <span>Tampilkan Bulan Ini</span>
              </button>
              <button
                onClick={() => handleSelectPreset('today')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs transition"
              >
                <span>Tampilkan Hari Ini</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'summary' ? (
          /* TAB 1: RINGKASAN PER KARYAWAN */
          employeeSummaries.length === 0 ? (
            <EmptyState
              title="Tidak Ada Data Karyawan"
              description="Tidak ditemukan ringkasan karyawan yang sesuai dengan kriteria filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                headers={[
                  'Karyawan',
                  'Departemen & Lokasi',
                  'Hari Hadir',
                  'Keterlambatan',
                  'Total Denda',
                  'Potong 0.5 Hari',
                  'Cuti / Sakit',
                  'Reward Disiplin',
                  'Aksi',
                ]}
              >
                {employeeSummaries.map((s, idx) => {
                  const badgeStyle = LOCATION_BADGE_STYLE[s.locationCode] || 'bg-gray-100 text-gray-600'

                  return (
                    <Tr key={`summary-emp-${s.empId}-${idx}`}>
                      {/* Karyawan */}
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar name={s.employeeName} photo={s.photo} />
                          <div>
                            <p className="text-xs font-semibold text-gray-900 leading-tight">{s.employeeName}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{s.nik}</p>
                          </div>
                        </div>
                      </Td>

                      {/* Departemen & Lokasi */}
                      <Td>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs text-gray-800 font-medium">{s.dept}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeStyle}`}>
                            {s.locationLabel}
                          </span>
                        </div>
                      </Td>

                      {/* Hari Hadir */}
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">{s.presentDays}</span>
                          <span className="text-[11px] text-gray-400">hari</span>
                        </div>
                      </Td>

                      {/* Keterlambatan */}
                      <Td>
                        {s.lateDays > 0 ? (
                          <div>
                            <span className="text-xs font-bold text-amber-700">{s.lateDays} hari</span>
                            <span className="text-[11px] text-gray-500 ml-1">({s.totalLateMinutes} mnt)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">0 hari</span>
                        )}
                      </Td>

                      {/* Total Denda */}
                      <Td>
                        {s.totalPenalty > 0 ? (
                          <span className="text-xs font-bold text-rose-600">
                            Rp {s.totalPenalty.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Rp 0</span>
                        )}
                      </Td>

                      {/* Potong 0.5 Hari */}
                      <Td>
                        {s.halfDayCuts > 0 ? (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {s.halfDayCuts}x Potong
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </Td>

                      {/* Cuti / Izin */}
                      <Td>
                        {s.leaveDays > 0 ? (
                          <span className="text-xs font-semibold text-blue-700">{s.leaveDays} hari</span>
                        ) : (
                          <span className="text-xs text-gray-400">0 hari</span>
                        )}
                      </Td>

                      {/* Status Reward Disiplin */}
                      <Td>
                        {s.isRewardEligible ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <span>🏆 Rp 200.000</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            Gugur
                          </span>
                        )}
                      </Td>

                      {/* Aksi: Tombol Rincian */}
                      <Td>
                        <button
                          onClick={() => setSelectedEmpDetail(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition shadow-2xs"
                          title="Lihat rincian riwayat presensi harian karyawan ini"
                        >
                          <Icon e="👁️" size={12} />
                          <span>Rincian</span>
                        </button>
                      </Td>
                    </Tr>
                  )
                })}
              </DataTable>
            </div>
          )
        ) : (
          /* TAB 2: LOG PRESENSI HARIAN */
          filteredRecords.length === 0 ? (
            <EmptyState
              title="Tidak Ada Data Presensi Harian"
              description="Tidak ditemukan riwayat presensi yang sesuai dengan kriteria filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                headers={[
                  'Karyawan',
                  'Departemen & Lokasi',
                  'Tanggal',
                  'Masuk',
                  'Pulang',
                  'Status',
                  'Keterlambatan',
                  'Denda',
                  'Aksi',
                ]}
              >
                {filteredRecords.map((r, idx) => {
                  const badgeStyle = LOCATION_BADGE_STYLE[r.locationCode] || 'bg-gray-100 text-gray-600'
                  const isLate = r.status === 'Late'
                  const hasDenda = Number(r.penaltyAmount) > 0

                  return (
                    <Tr key={`att-${r.id ? `rec-${r.id}` : `emp-${r.empId}`}-${r.date}-${idx}`}>
                      {/* Karyawan */}
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar name={r.employeeName} photo={r.photo} />
                          <div>
                            <p className="text-xs font-semibold text-gray-900 leading-tight">{r.employeeName}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{r.nik}</p>
                          </div>
                        </div>
                      </Td>

                      {/* Dept & Lokasi */}
                      <Td>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs text-gray-800 font-medium">{r.dept}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeStyle}`}>
                            {r.locationLabel}
                          </span>
                        </div>
                      </Td>

                      {/* Tanggal */}
                      <Td>
                        <span className="text-xs font-medium text-gray-700">{r.date}</span>
                      </Td>

                      {/* Jam Masuk */}
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-xs font-mono font-semibold ${
                              isLate ? 'text-amber-600' : r.checkIn ? 'text-emerald-700' : 'text-gray-400'
                            }`}
                          >
                            {r.checkIn || '—'}
                          </span>
                          {r.checkInLocation && (
                            <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]" title={r.checkInLocation}>
                              📍 {r.checkInLocation}
                            </span>
                          )}
                          {r.isMockGps ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 w-fit" title={r.mockGpsReason || 'Terdeteksi indikasi mock/fake GPS'}>
                              🚨 Mock GPS
                            </span>
                          ) : r.isWithinRadius === false || (r.checkInDistance != null && r.checkInDistance > 300) ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 w-fit" title={`Jarak: ${Math.round(r.checkInDistance || 0)}m dari titik target (Batas: 300m)`}>
                              ⚠️ Luar Radius ({Math.round(r.checkInDistance || 0)}m)
                            </span>
                          ) : r.checkInDistance != null ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-700">
                              ✓ {Math.round(r.checkInDistance)}m
                            </span>
                          ) : null}
                        </div>
                      </Td>

                      {/* Jam Pulang */}
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono text-gray-600">{r.checkOut || '—'}</span>
                          {r.checkOutDistance != null && (
                            <span className={`text-[9px] font-medium ${r.checkOutDistance > 300 ? 'text-amber-700' : 'text-gray-400'}`}>
                              {r.checkOutDistance > 300 ? `⚠️ ${Math.round(r.checkOutDistance)}m` : `✓ ${Math.round(r.checkOutDistance)}m`}
                            </span>
                          )}
                        </div>
                      </Td>

                      {/* Status */}
                      <Td>
                        <StatusBadge tone={STATUS_TONES[r.status] || 'default'}>{r.status}</StatusBadge>
                      </Td>

                      {/* Keterlambatan */}
                      <Td>
                        {r.lateMinutes > 0 ? (
                          <div>
                            <span className="text-xs font-semibold text-amber-700">{r.lateMinutes} mnt</span>
                            {r.note && (
                              <p className="text-[10px] text-gray-500 max-w-[150px] truncate" title={r.note}>
                                {r.note}
                              </p>
                            )}
                          </div>
                        ) : r.note ? (
                          <p className="text-[10px] text-gray-500 max-w-[150px] truncate" title={r.note}>
                            {r.note}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </Td>

                      {/* Denda */}
                      <Td>
                        {hasDenda ? (
                          <span className="text-xs font-bold text-rose-600">
                            Rp {Number(r.penaltyAmount).toLocaleString('id-ID')}
                          </span>
                        ) : r.status === 'Late' && r.note && r.note.includes('Setengah Hari') ? (
                          <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            Potong 0.5 Hari
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Rp 0</span>
                        )}
                      </Td>

                      {/* Aksi HR */}
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(r)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-teal-700 hover:bg-teal-50 transition"
                            title="Koreksi Presensi HR"
                          >
                            <Icon e="✏️" size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Data Presensi"
                          >
                            <Icon e="🗑️" size={13} />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </DataTable>
            </div>
          )
        )}
      </div>

      {/* Modal Drill-Down Rincian Presensi Individual Karyawan */}
      {selectedEmpDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-950 text-white">
              <div className="flex items-center gap-3">
                <EmployeeAvatar name={selectedEmpDetail.employeeName} photo={selectedEmpDetail.photo} size="w-10 h-10" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedEmpDetail.employeeName}</span>
                    <span className="text-[10px] bg-white/20 text-teal-100 font-mono px-2 py-0.5 rounded">
                      {selectedEmpDetail.nik}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-300">
                    {selectedEmpDetail.dept} • {selectedEmpDetail.locationLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpDetail(null)}
                className="text-gray-300 hover:text-white text-xl font-bold p-1"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Periode Banner */}
              <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-teal-900 gap-2">
                <div className="flex items-center gap-2">
                  <Icon e="🗓️" size={16} />
                  <span className="font-semibold">
                    Periode Presensi: {dateFrom || 'Awal'} s/d {dateTo || 'Akhir'}
                  </span>
                  <span className="text-[11px] text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">
                    {selectedEmpDetail.records.length} hari tercatat
                  </span>
                </div>
                <button
                  onClick={() => handleExportIndividualCsv(selectedEmpDetail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-teal-100 border border-teal-200 rounded-lg text-teal-800 font-semibold text-xs shadow-2xs transition"
                >
                  <Icon e="📥" size={13} />
                  <span>Unduh CSV Karyawan</span>
                </button>
              </div>

              {/* KPI Mini Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-emerald-800">Hadir Tepat</p>
                  <p className="text-lg font-bold text-emerald-950 mt-0.5">
                    {selectedEmpDetail.presentDays}{' '}
                    <span className="text-xs font-normal text-emerald-700">hari</span>
                  </p>
                </div>
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-amber-800">Terlambat</p>
                  <p className="text-lg font-bold text-amber-950 mt-0.5">
                    {selectedEmpDetail.lateDays}{' '}
                    <span className="text-xs font-normal text-amber-700">
                      hari ({selectedEmpDetail.totalLateMinutes} mnt)
                    </span>
                  </p>
                </div>
                <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-rose-800">Total Denda</p>
                  <p className="text-lg font-bold text-rose-950 mt-0.5">
                    Rp {selectedEmpDetail.totalPenalty.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-indigo-800">Reward Disiplin</p>
                  <p className="text-sm font-bold text-indigo-950 mt-1">
                    {selectedEmpDetail.isRewardEligible ? '🏆 Rp 200.000' : '❌ Gugur'}
                  </p>
                </div>
              </div>

              {/* Tabel Riwayat Harian Karyawan */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center justify-between">
                  <span>Riwayat Presensi Harian ({selectedEmpDetail.records.length} Hari)</span>
                </h4>
                {selectedEmpDetail.records.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                    Tidak ada catatan presensi untuk karyawan ini pada periode yang dipilih.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-2">Masuk & Lokasi</th>
                          <th className="py-2.5 px-2">Pulang</th>
                          <th className="py-2.5 px-2">Status</th>
                          <th className="py-2.5 px-2">Keterlambatan</th>
                          <th className="py-2.5 px-2">Denda</th>
                          <th className="py-2.5 px-3">Catatan / Alasan</th>
                          <th className="py-2.5 px-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedEmpDetail.records.map((r, idx) => {
                          const isLate = r.status === 'Late'
                          const d = r.date ? new Date(r.date) : null
                          const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
                          const dayLabel = d && !isNaN(d.getDay()) ? dayNames[d.getDay()] : ''

                          return (
                            <tr key={`emp-detail-row-${r.id || r.date}-${idx}`} className="hover:bg-gray-50/80">
                              <td className="py-2 px-3 font-medium text-gray-900">
                                <span>{r.date}</span>
                                {dayLabel && (
                                  <span className="text-[10px] text-gray-400 ml-1.5 font-normal">({dayLabel})</span>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex flex-col gap-0.5">
                                  <span
                                    className={`font-mono font-semibold ${
                                      isLate ? 'text-amber-600' : r.checkIn ? 'text-emerald-700' : 'text-gray-400'
                                    }`}
                                  >
                                    {r.checkIn || '—'}
                                  </span>
                                  {r.checkInLocation && (
                                    <span className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]" title={r.checkInLocation}>
                                      📍 {r.checkInLocation}
                                    </span>
                                  )}
                                  {r.isMockGps ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 w-fit">
                                      🚨 Mock GPS
                                    </span>
                                  ) : r.isWithinRadius === false || (r.checkInDistance != null && r.checkInDistance > 300) ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 w-fit">
                                      ⚠️ Luar ({Math.round(r.checkInDistance || 0)}m)
                                    </span>
                                  ) : r.checkInDistance != null ? (
                                    <span className="text-[9px] text-emerald-700 font-medium">
                                      ✓ {Math.round(r.checkInDistance)}m
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="py-2 px-2 font-mono text-gray-600">
                                {r.checkOut || '—'}
                                {r.checkOutDistance != null && (
                                  <span className="block text-[9px] text-gray-400">
                                    {Math.round(r.checkOutDistance)}m
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <StatusBadge tone={STATUS_TONES[r.status] || 'default'}>{r.status}</StatusBadge>
                              </td>
                              <td className="py-2 px-2">
                                {r.lateMinutes > 0 ? (
                                  <span className="font-semibold text-amber-700">{r.lateMinutes} mnt</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                {Number(r.penaltyAmount) > 0 ? (
                                  <span className="font-bold text-rose-600">
                                    Rp {Number(r.penaltyAmount).toLocaleString('id-ID')}
                                  </span>
                                ) : r.status === 'Late' && r.note && r.note.includes('Setengah Hari') ? (
                                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                    0.5 Hari
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Rp 0</span>
                                )}
                              </td>
                              <td
                                className="py-2 px-3 text-[11px] text-gray-600 max-w-[160px] truncate"
                                title={r.note || ''}
                              >
                                {r.note || '—'}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <button
                                  onClick={() => handleEditClick(r)}
                                  className="p-1 rounded text-gray-500 hover:text-teal-700 hover:bg-teal-50"
                                  title="Koreksi Presensi"
                                >
                                  <Icon e="✏️" size={13} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => setSelectedEmpDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit / Koreksi Presensi HR */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-950 text-white">
              <div>
                <h3 className="text-sm font-bold">Koreksi Presensi HR</h3>
                <p className="text-[11px] text-gray-300">
                  {editingRecord.employeeName} ({editingRecord.nik}) • {editingRecord.date}
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-300 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Jam Masuk (Check-In)</label>
                    <button
                      type="button"
                      onClick={() => handleRecalculateEdit(editForm.checkIn, editingRecord?.date, editingRecord?.empId)}
                      className="text-[10px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-0.5"
                      title="Hitung ulang otomatis berdasarkan aturan lokasi kerja"
                    >
                      <span>🔄 Hitung</span>
                    </button>
                  </div>
                  <input
                    type="time"
                    value={editForm.checkIn}
                    onChange={(e) => {
                      const newTime = e.target.value
                      setEditForm({ ...editForm, checkIn: newTime })
                      if (newTime) {
                        handleRecalculateEdit(newTime, editingRecord?.date, editingRecord?.empId)
                      }
                    }}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Pulang (Check-Out)</label>
                  <input
                    type="time"
                    value={editForm.checkOut}
                    onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 font-mono"
                  />
                </div>
              </div>

              {/* Box Preview Hasil Kalkulasi Otomatis */}
              {calcEditPreview && (
                <div className="p-3 bg-gradient-to-r from-teal-50/80 to-blue-50/60 rounded-xl border border-teal-200/80 text-xs text-gray-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-950 flex items-center gap-1 text-[11px]">
                      <span>⚡ Kalkulasi Otomatis Hari Ini</span>
                      {calculatingEdit && <span className="text-[10px] text-teal-600 animate-pulse">(Menghitung...)</span>}
                    </span>
                    <span className="text-[10px] font-medium bg-white px-2 py-0.5 rounded-full border border-teal-200 text-teal-800">
                      {calcEditPreview.locationName} (Jadwal: {calcEditPreview.scheduledStart})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                    <div className="bg-white/80 p-1.5 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-gray-400">Status</p>
                      <p
                        className={`text-xs font-bold ${
                          calcEditPreview.status === 'Late' ? 'text-amber-600' : 'text-emerald-700'
                        }`}
                      >
                        {calcEditPreview.status === 'Late' ? '⏰ Terlambat' : '✅ Tepat'}
                      </p>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-gray-400">Keterlambatan</p>
                      <p className="text-xs font-bold text-gray-800">
                        {calcEditPreview.lateMinutes > 0 ? `${calcEditPreview.lateMinutes} mnt` : '0 mnt'}
                      </p>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-gray-400">Denda</p>
                      <p
                        className={`text-xs font-bold ${
                          calcEditPreview.penaltyAmount > 0
                            ? 'text-rose-600'
                            : calcEditPreview.isHalfDayCut
                            ? 'text-purple-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {calcEditPreview.penaltyAmount > 0
                          ? `Rp ${calcEditPreview.penaltyAmount.toLocaleString('id-ID')}`
                          : calcEditPreview.isHalfDayCut
                          ? 'Potong 0.5 Hari'
                          : 'Rp 0'}
                      </p>
                    </div>
                  </div>

                  {calcEditPreview.penaltyLabel && calcEditPreview.penaltyLabel !== 'Tepat Waktu' && (
                    <p className="text-[10px] text-teal-900 bg-white/70 px-2 py-0.5 rounded border border-teal-100/60 truncate">
                      Aturan: {calcEditPreview.penaltyLabel}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status Kehadiran</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600"
                  >
                    <option value="Present">Present (Hadir)</option>
                    <option value="Late">Late (Terlambat)</option>
                    <option value="Absent">Absent (Alpha)</option>
                    <option value="Leave">Leave (Cuti/Izin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Denda Terlambat (Rp)</label>
                  <input
                    type="number"
                    value={editForm.penaltyAmount}
                    onChange={(e) => setEditForm({ ...editForm, penaltyAmount: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Menit Terlambat</label>
                <input
                  type="number"
                  value={editForm.lateMinutes}
                  onChange={(e) => setEditForm({ ...editForm, lateMinutes: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catatan HR / Alasan Dispensasi
                </label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Contoh: Dispensasi dinas luar, kendala teknis sidik jari, dll."
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:outline-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Presensi Manual HR */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-950 text-white">
              <div>
                <h3 className="text-sm font-bold">Catat Presensi Manual HR</h3>
                <p className="text-[11px] text-gray-300">Input kehadiran karyawan secara langsung ke database</p>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-gray-300 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Karyawan *</label>
                <select
                  required
                  value={addForm.empId}
                  onChange={(e) => {
                    const id = e.target.value
                    setAddForm({ ...addForm, empId: id })
                    if (id && addForm.checkIn) {
                      handleRecalculateAdd(id, addForm.checkIn, addForm.date)
                    }
                  }}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.nik}) - {emp.dept || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Presensi *</label>
                <input
                  type="date"
                  required
                  value={addForm.date}
                  onChange={(e) => {
                    const d = e.target.value
                    setAddForm({ ...addForm, date: d })
                    if (addForm.empId && addForm.checkIn) {
                      handleRecalculateAdd(addForm.empId, addForm.checkIn, d)
                    }
                  }}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Jam Masuk (Check-In)</label>
                    <button
                      type="button"
                      onClick={() => handleRecalculateAdd(addForm.empId, addForm.checkIn, addForm.date)}
                      className="text-[10px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-0.5"
                    >
                      <span>🔄 Hitung</span>
                    </button>
                  </div>
                  <input
                    type="time"
                    value={addForm.checkIn}
                    onChange={(e) => {
                      const t = e.target.value
                      setAddForm({ ...addForm, checkIn: t })
                      if (addForm.empId && t) {
                        handleRecalculateAdd(addForm.empId, t, addForm.date)
                      }
                    }}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Pulang (Check-Out)</label>
                  <input
                    type="time"
                    value={addForm.checkOut}
                    onChange={(e) => setAddForm({ ...addForm, checkOut: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 font-mono"
                  />
                </div>
              </div>

              {/* Box Preview Hasil Kalkulasi Otomatis (Tambah Manual) */}
              {calcAddPreview && (
                <div className="p-3 bg-gradient-to-r from-teal-50/80 to-blue-50/60 rounded-xl border border-teal-200/80 text-xs text-gray-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-950 flex items-center gap-1 text-[11px]">
                      <span>⚡ Kalkulasi Otomatis Hari Ini</span>
                    </span>
                    <span className="text-[10px] font-medium bg-white px-2 py-0.5 rounded-full border border-teal-200 text-teal-800">
                      {calcAddPreview.locationName} (Jadwal: {calcAddPreview.scheduledStart})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                    <div className="bg-white/80 p-1.5 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-gray-400">Status</p>
                      <p
                        className={`text-xs font-bold ${
                          calcAddPreview.status === 'Late' ? 'text-amber-600' : 'text-emerald-700'
                        }`}
                      >
                        {calcAddPreview.status === 'Late' ? '⏰ Terlambat' : '✅ Tepat'}
                      </p>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-gray-400">Keterlambatan</p>
                      <p className="text-xs font-bold text-gray-800">
                        {calcAddPreview.lateMinutes > 0 ? `${calcAddPreview.lateMinutes} mnt` : '0 mnt'}
                      </p>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-gray-400">Denda</p>
                      <p
                        className={`text-xs font-bold ${
                          calcAddPreview.penaltyAmount > 0
                            ? 'text-rose-600'
                            : calcAddPreview.isHalfDayCut
                            ? 'text-purple-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {calcAddPreview.penaltyAmount > 0
                          ? `Rp ${calcAddPreview.penaltyAmount.toLocaleString('id-ID')}`
                          : calcAddPreview.isHalfDayCut
                          ? 'Potong 0.5 Hari'
                          : 'Rp 0'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status Kehadiran</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600"
                  >
                    <option value="Present">Present (Hadir)</option>
                    <option value="Late">Late (Terlambat)</option>
                    <option value="Absent">Absent (Alpha)</option>
                    <option value="Leave">Leave (Cuti/Izin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Denda Terlambat (Rp)</label>
                  <input
                    type="number"
                    value={addForm.penaltyAmount}
                    onChange={(e) => setAddForm({ ...addForm, penaltyAmount: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-teal-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Presensi Manual</label>
                <textarea
                  rows={2}
                  value={addForm.note}
                  onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:outline-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                >
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

