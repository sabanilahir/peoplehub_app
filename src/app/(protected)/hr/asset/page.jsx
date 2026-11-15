// src/app/(protected)/hr/asset/page.jsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  Laptop,
  Car,
  KeyRound,
  Wrench,
  Package,
  Plus,
  Search,
  Filter,
  FileDown,
  FileText,
  UserCheck,
  RotateCcw,
  History,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronRight,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useBrandingStore } from '@/store/brandingStore'
import { generateHandoverBastPdf, generateReturnBastPdf } from '@/lib/assetBastDocs'

const CATEGORY_MAP = {
  IT_EQUIPMENT: { label: 'IT Equipment', icon: Laptop, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  VEHICLE: { label: 'Kendaraan Dinas', icon: Car, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  FACILITY: { label: 'Fasilitas & Akses', icon: KeyRound, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  TOOLS: { label: 'Alat Kerja / Gudang', icon: Wrench, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  OTHERS: { label: 'Lainnya', icon: Package, color: 'text-gray-600 bg-gray-50 border-gray-200' },
}

const STATUS_MAP = {
  AVAILABLE: { label: 'Tersedia di Inventaris', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  IN_USE: { label: 'Sedang Dipinjam', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
  UNDER_MAINTENANCE: { label: 'Dalam Servis / Perbaikan', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
  LOST: { label: 'Hilang', bg: 'bg-rose-100 text-rose-800 border-rose-200' },
  DISPOSED: { label: 'Dihapus / Pensiun', bg: 'bg-gray-100 text-gray-700 border-gray-200' },
}

export default function HRAssetPage() {
  const { currentUser } = useAuthStore()
  const { employees, fetchEmployees } = useEmployeeStore()
  const { companyName } = useBrandingStore()

  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals State
  const [addEditModalOpen, setAddEditModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [formData, setFormData] = useState({
    assetCode: '',
    name: '',
    category: 'IT_EQUIPMENT',
    brand: '',
    model: '',
    serialNumber: '',
    plateNumber: '',
    specifications: '',
    purchaseDate: '',
    purchaseCost: '',
    warrantyExpiry: '',
    condition: 'Baik',
    status: 'AVAILABLE',
    notes: '',
  })

  // Handover Modal
  const [handoverModalOpen, setHandoverModalOpen] = useState(false)
  const [selectedAssetForHandover, setSelectedAssetForHandover] = useState(null)
  const [handoverForm, setHandoverForm] = useState({
    employeeId: '',
    actionDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    condition: 'Baik',
    accessories: 'Charger Original, Box & Dokumen',
    picName: '',
    notes: '',
    autoDownloadBast: true,
  })

  // Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState(null)
  const [returnForm, setReturnForm] = useState({
    actionDate: new Date().toISOString().split('T')[0],
    condition: 'Baik',
    nextStatus: 'AVAILABLE',
    accessories: 'Lengkap Sesuai BAST Penyerahan',
    picName: '',
    notes: '',
    autoDownloadBast: true,
  })

  // History / Audit Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch all assets from API
  const fetchAssets = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/assets')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setAssets(json.data)
      } else {
        setErrorMsg(json.error || 'Gagal memuat daftar aset')
      }
    } catch (err) {
      console.error('Fetch assets error:', err)
      setErrorMsg('Gagal terhubung ke server untuk memuat aset')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
    if (fetchEmployees && (!employees || employees.length === 0)) {
      fetchEmployees()
    }
  }, [])

  // Auto-dismiss alert
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCode = item.assetCode?.toLowerCase().includes(q)
        const matchName = item.name?.toLowerCase().includes(q)
        const matchBrand = item.brand?.toLowerCase().includes(q)
        const matchModel = item.model?.toLowerCase().includes(q)
        const matchSN = item.serialNumber?.toLowerCase().includes(q)
        const matchPlate = item.plateNumber?.toLowerCase().includes(q)
        const matchEmpName = item.currentEmployee?.name?.toLowerCase().includes(q)
        const matchEmpNik = item.currentEmployee?.nik?.toLowerCase().includes(q)
        if (!matchCode && !matchName && !matchBrand && !matchModel && !matchSN && !matchPlate && !matchEmpName && !matchEmpNik) {
          return false
        }
      }
      return true
    })
  }, [assets, statusFilter, categoryFilter, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = assets.length
    const inUse = assets.filter((a) => a.status === 'IN_USE').length
    const available = assets.filter((a) => a.status === 'AVAILABLE').length
    const maintenance = assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length
    const totalValue = assets.reduce((acc, curr) => acc + (curr.purchaseCost || 0), 0)
    return { total, inUse, available, maintenance, totalValue }
  }, [assets])

  // Handlers for Add / Edit Asset
  const handleOpenAddModal = () => {
    setEditingAsset(null)
    const nextNum = String(assets.length + 1).padStart(3, '0')
    setFormData({
      assetCode: `AST-IT-2026-${nextNum}`,
      name: '',
      category: 'IT_EQUIPMENT',
      brand: '',
      model: '',
      serialNumber: '',
      plateNumber: '',
      specifications: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: '',
      warrantyExpiry: '',
      condition: 'Baik',
      status: 'AVAILABLE',
      notes: '',
    })
    setAddEditModalOpen(true)
  }

  const handleOpenEditModal = (asset) => {
    setEditingAsset(asset)
    setFormData({
      assetCode: asset.assetCode,
      name: asset.name || '',
      category: asset.category || 'IT_EQUIPMENT',
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      plateNumber: asset.plateNumber || '',
      specifications: asset.specifications || '',
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
      purchaseCost: asset.purchaseCost || '',
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '',
      condition: asset.condition || 'Baik',
      status: asset.status || 'AVAILABLE',
      notes: asset.notes || '',
    })
    setAddEditModalOpen(true)
  }

  const handleSaveAsset = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setErrorMsg(null)

    try {
      if (editingAsset) {
        // Update
        const res = await fetch(`/api/assets/${editingAsset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const json = await res.json()
        if (json.success) {
          setSuccessMsg(json.message)
          setAddEditModalOpen(false)
          fetchAssets()
        } else {
          setErrorMsg(json.error || 'Gagal memperbarui data aset')
        }
      } else {
        // Create
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const json = await res.json()
        if (json.success) {
          setSuccessMsg(json.message)
          setAddEditModalOpen(false)
          fetchAssets()
        } else {
          setErrorMsg(json.error || 'Gagal menambahkan aset baru')
        }
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menyimpan aset: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteAsset = async (asset) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data aset ${asset.assetCode} (${asset.name})?`)) {
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setSuccessMsg(json.message)
        fetchAssets()
      } else {
        setErrorMsg(json.error || 'Gagal menghapus aset')
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menghapus aset: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers for Handover (Peminjaman)
  const handleOpenHandoverModal = (asset) => {
    setSelectedAssetForHandover(asset)
    setHandoverForm({
      employeeId: '',
      actionDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      condition: asset.condition || 'Baik',
      accessories:
        asset.category === 'IT_EQUIPMENT'
          ? 'Charger Original, Box / Tas Laptop, Mouse'
          : asset.category === 'VEHICLE'
          ? 'Kunci Kontak + Cadangan, STNK Asli, Kartu E-Toll'
          : 'Lengkap',
      picName: currentUser?.name || 'HR / GA Department',
      notes: '',
      autoDownloadBast: true,
    })
    setHandoverModalOpen(true)
  }

  const handleExecuteHandover = async (e) => {
    e.preventDefault()
    if (!handoverForm.employeeId) {
      alert('Pilih karyawan penerima terlebih dahulu!')
      return
    }

    setActionLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/assets/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetForHandover.id,
          employeeId: handoverForm.employeeId,
          actionDate: handoverForm.actionDate,
          expectedReturnDate: handoverForm.expectedReturnDate || null,
          condition: handoverForm.condition,
          accessories: handoverForm.accessories,
          picName: handoverForm.picName,
          notes: handoverForm.notes,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setSuccessMsg(json.message)
        setHandoverModalOpen(false)

        // Generate PDF BAST Peminjaman
        if (handoverForm.autoDownloadBast && json.data?.asset && json.data?.handoverLog?.employee) {
          try {
            await generateHandoverBastPdf({
              company: companyName || 'San PeopleHub',
              asset: json.data.asset,
              employee: json.data.handoverLog.employee,
              picName: handoverForm.picName,
              accessories: handoverForm.accessories,
              notes: handoverForm.notes,
              bastNumber: json.data.bastNumber,
              handoverDate: handoverForm.actionDate,
            })
          } catch (pdfErr) {
            console.error('PDF generation error:', pdfErr)
          }
        }

        fetchAssets()
      } else {
        setErrorMsg(json.error || 'Gagal memproses penyerahan aset')
      }
    } catch (err) {
      setErrorMsg('Kesalahan saat penyerahan aset: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers for Return (Pengembalian)
  const handleOpenReturnModal = (asset) => {
    setSelectedAssetForReturn(asset)
    setReturnForm({
      actionDate: new Date().toISOString().split('T')[0],
      condition: 'Baik',
      nextStatus: 'AVAILABLE',
      accessories: 'Lengkap sesuai kondisi serah terima',
      picName: currentUser?.name || 'HR / GA Department',
      notes: 'Pemeriksaan fisik normal, tidak ada kerusakan fisik.',
      autoDownloadBast: true,
    })
    setReturnModalOpen(true)
  }

  const handleExecuteReturn = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/assets/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetForReturn.id,
          actionDate: returnForm.actionDate,
          condition: returnForm.condition,
          nextStatus: returnForm.nextStatus,
          accessories: returnForm.accessories,
          picName: returnForm.picName,
          notes: returnForm.notes,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setSuccessMsg(json.message)
        setReturnModalOpen(false)

        // Generate PDF BAST Pengembalian
        if (returnForm.autoDownloadBast && json.data?.asset && json.data?.returnedEmployee) {
          try {
            await generateReturnBastPdf({
              company: companyName || 'San PeopleHub',
              asset: json.data.asset,
              employee: json.data.returnedEmployee,
              picName: returnForm.picName,
              accessories: returnForm.accessories,
              notes: returnForm.notes,
              bastNumber: json.data.bastNumber,
              returnDate: returnForm.actionDate,
              condition: returnForm.condition,
            })
          } catch (pdfErr) {
            console.error('PDF return error:', pdfErr)
          }
        }

        fetchAssets()
      } else {
        setErrorMsg(json.error || 'Gagal memproses pengembalian aset')
      }
    } catch (err) {
      setErrorMsg('Kesalahan saat pengembalian aset: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers for Export to Excel
  const handleExportExcel = () => {
    if (filteredAssets.length === 0) {
      alert('Tidak ada data aset untuk di-export.')
      return
    }

    const dataRows = filteredAssets.map((item, idx) => ({
      No: idx + 1,
      'Kode Tag Aset': item.assetCode,
      'Nama Aset': item.name,
      Kategori: CATEGORY_MAP[item.category]?.label || item.category,
      Merk: item.brand || '-',
      Model: item.model || '-',
      'Serial Number / IMEI': item.serialNumber || '-',
      'No. Polisi': item.plateNumber || '-',
      Status: STATUS_MAP[item.status]?.label || item.status,
      Kondisi: item.condition,
      'Nama Pemegang Saat Ini': item.currentEmployee?.name || 'Tersedia di Inventaris',
      'NIK Pemegang': item.currentEmployee?.nik || '-',
      'Departemen Pemegang': item.currentEmployee?.dept || '-',
      'Tanggal Serah Terima': item.assignedDate ? new Date(item.assignedDate).toLocaleDateString('id-ID') : '-',
      'Target Kembali': item.expectedReturnDate ? new Date(item.expectedReturnDate).toLocaleDateString('id-ID') : '-',
      'Harga Perolehan (Rp)': item.purchaseCost || 0,
      'Tanggal Beli': item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('id-ID') : '-',
      'Garansi Habis': item.warrantyExpiry ? new Date(item.warrantyExpiry).toLocaleDateString('id-ID') : '-',
      Spesifikasi: item.specifications || '-',
      Catatan: item.notes || '-',
    }))

    const ws = XLSX.utils.json_to_sheet(dataRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaris Aset')
    XLSX.writeFile(wb, `Inventaris_Aset_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-3 border border-teal-500/30">
              <ShieldCheck className="w-4 h-4" />
              <span>General Affair &amp; IT Asset Handover</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Manajemen Aset Perusahaan
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Pencatatan inventaris aset perusahaan, pengelolaan peminjaman fasilitas kerja ke karyawan, pelacakan nomor seri, serta penerbitan Berita Acara Serah Terima (BAST).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition border border-white/20 cursor-pointer shadow-sm"
            >
              <FileDown className="w-4 h-4 text-teal-300" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Aset Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Aset Terdata</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{metrics.total}</span>
            <span className="text-xs text-gray-500">Unit</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Nilai Perolehan: Rp {(metrics.totalValue / 1_000_000).toFixed(1)} Jt
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Sedang Dipinjam</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{metrics.inUse}</span>
            <span className="text-xs text-blue-600 font-semibold">Aktif di Karyawan</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {metrics.total ? Math.round((metrics.inUse / metrics.total) * 100) : 0}% dari seluruh inventaris
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tersedia di Inventaris</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{metrics.available}</span>
            <span className="text-xs text-emerald-600 font-semibold">Siap Dipinjam</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Tersedia di GA / Gudang IT</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Perbaikan / Servis</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{metrics.maintenance}</span>
            <span className="text-xs text-amber-600 font-semibold">Unit Bermasalah</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Under Maintenance</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'AVAILABLE', label: 'Tersedia' },
              { id: 'IN_USE', label: 'Dipinjam' },
              { id: 'UNDER_MAINTENANCE', label: 'Perbaikan' },
              { id: 'LOST', label: 'Hilang' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Tag, SN, Merk, atau Nama Karyawan..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto text-xs">
          <span className="text-gray-400 text-[11px] font-semibold shrink-0">Kategori:</span>
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
              categoryFilter === 'ALL'
                ? 'bg-teal-50 border border-teal-300 text-teal-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Semua
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, cat]) => {
            const IconComponent = cat.icon
            const isSelected = categoryFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  isSelected
                    ? 'bg-teal-100 text-teal-900 border border-teal-300 shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Aset &amp; Kategori</th>
                <th className="py-3.5 px-4">Merk / Serial Number</th>
                <th className="py-3.5 px-4">Kondisi &amp; Pembelian</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Pemegang Saat Ini</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Memuat inventaris aset...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Tidak ada aset yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const catConfig = CATEGORY_MAP[asset.category] || CATEGORY_MAP.OTHERS
                  const CatIcon = catConfig.icon
                  const statusConfig = STATUS_MAP[asset.status] || STATUS_MAP.AVAILABLE
                  const isLoaned = asset.status === 'IN_USE' && asset.currentEmployee

                  return (
                    <tr key={asset.id} className="hover:bg-gray-50/70 transition">
                      {/* Aset & Kategori */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${catConfig.color}`}>
                            <CatIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <span>{asset.name}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                                {asset.assetCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {catConfig.label}
                              {asset.specifications && (
                                <span className="text-gray-400 ml-1 truncate max-w-[200px] inline-block align-bottom">
                                  • {asset.specifications}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Merk & Serial Number */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800">
                          {asset.brand || '—'} {asset.model || ''}
                        </div>
                        <div className="text-[11px] font-mono text-teal-700 font-semibold mt-0.5">
                          {asset.serialNumber ? `SN: ${asset.serialNumber}` : asset.plateNumber ? `Nopol: ${asset.plateNumber}` : '—'}
                        </div>
                      </td>

                      {/* Kondisi & Nilai Beli */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              asset.condition === 'Baru' || asset.condition === 'Sangat Baik'
                                ? 'bg-emerald-500'
                                : asset.condition === 'Baik'
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-semibold text-gray-700">{asset.condition}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {asset.purchaseCost ? `Rp ${asset.purchaseCost.toLocaleString('id-ID')}` : '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusConfig.bg}`}>
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Pemegang Saat Ini */}
                      <td className="py-3.5 px-4">
                        {isLoaned ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {asset.currentEmployee.name?.charAt(0) || 'K'}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 leading-tight">
                                {asset.currentEmployee.name}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {asset.currentEmployee.nik} • {asset.currentEmployee.dept || 'Umum'}
                              </div>
                              <div className="text-[10px] text-blue-600 font-medium">
                                Sejak:{' '}
                                {asset.assignedDate
                                  ? new Date(asset.assignedDate).toLocaleDateString('id-ID')
                                  : '-'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">
                            — Tersedia di Inventaris —
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {asset.status === 'AVAILABLE' && (
                            <button
                              type="button"
                              onClick={() => handleOpenHandoverModal(asset)}
                              title="Pinjamkan / Serahkan ke Karyawan"
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Pinjamkan</span>
                            </button>
                          )}

                          {asset.status === 'IN_USE' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenReturnModal(asset)}
                                title="Terima Pengembalian Aset"
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Kembalikan</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await generateHandoverBastPdf({
                                      company: companyName || 'San PeopleHub',
                                      asset,
                                      employee: asset.currentEmployee,
                                      picName: currentUser?.name || 'HR/GA',
                                      accessories: 'Charger Original, Box & Dokumen',
                                      bastNumber: `BAST/AST/2026/${asset.assetCode.split('-').pop()}`,
                                      handoverDate: asset.assignedDate || new Date(),
                                    })
                                  } catch (e) {
                                    alert('Gagal cetak PDF: ' + e.message)
                                  }
                                }}
                                title="Cetak Berita Acara Serah Terima (BAST Peminjaman)"
                                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs transition cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-teal-600" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssetForHistory(asset)
                              setHistoryModalOpen(true)
                            }}
                            title="Riwayat Mutasi & BAST"
                            className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5 text-gray-500" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(asset)}
                            title="Edit Data Aset"
                            className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-500" />
                          </button>

                          {asset.status !== 'IN_USE' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(asset)}
                              title="Hapus Aset"
                              className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-700 hover:text-rose-600 border border-gray-200 rounded-lg text-xs transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Tambah / Edit Aset */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingAsset ? 'Ubah Informasi Aset' : 'Daftarkan Aset Baru'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Masukkan identitas spesifikasi fisik, nomor seri, dan nilai perolehan aset.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Kode / Tag Aset <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingAsset}
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                    placeholder="Contoh: AST-IT-2026-004"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Kategori Aset <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Nama Aset <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: MacBook Pro 14 M3 / Honda Vario 125"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Merk (Brand)</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Apple, Lenovo, Toyota, dll."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Model / Tipe</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="ThinkPad T14 / Avanza 1.5 G"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Serial Number (SN) / IMEI
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Nomor seri pabrikan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Nomor Polisi (Khusus Kendaraan)
                  </label>
                  <input
                    type="text"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    placeholder="Contoh: B 1234 ABC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono uppercase outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Spesifikasi Teknis</label>
                <textarea
                  rows={2}
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  placeholder="Contoh: RAM 16GB, SSD 512GB, Warna Space Grey, Charger Type-C 67W"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Kondisi Fisik</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="Baru">Baru</option>
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    placeholder="Nominal perolehan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Garansi Berakhir</label>
                  <input
                    type="date"
                    value={formData.warrantyExpiry}
                    onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Lokasi penyimpanan, vendor penyedia, dll."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Data Aset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Handover / Peminjaman Aset */}
      {handoverModalOpen && selectedAssetForHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-300">
                  Formulir Penyerahan Fasilitas
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  Serah Terima Aset ke Karyawan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHandoverModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Info Singkat Aset */}
            <div className="p-4 bg-teal-50/50 border-b border-teal-100 flex items-center gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{selectedAssetForHandover.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  Tag: {selectedAssetForHandover.assetCode} • SN: {selectedAssetForHandover.serialNumber || selectedAssetForHandover.plateNumber || '—'}
                </div>
              </div>
            </div>

            <form onSubmit={handleExecuteHandover} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Pilih Karyawan Penerima <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={handoverForm.employeeId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-xs"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees &&
                    employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.nik}) - {emp.dept || 'Umum'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Tanggal Serah Terima</label>
                  <input
                    type="date"
                    required
                    value={handoverForm.actionDate}
                    onChange={(e) => setHandoverForm({ ...handoverForm, actionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Target Pengembalian</label>
                  <input
                    type="date"
                    value={handoverForm.expectedReturnDate}
                    onChange={(e) => setHandoverForm({ ...handoverForm, expectedReturnDate: e.target.value })}
                    placeholder="Kosongkan jika fasilitas tetap"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                  <span className="text-[10px] text-gray-400">Kosongkan bila fasilitas kerja permanen</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Kelengkapan Aksesoris Diserahkan</label>
                <input
                  type="text"
                  value={handoverForm.accessories}
                  onChange={(e) => setHandoverForm({ ...handoverForm, accessories: e.target.value })}
                  placeholder="Contoh: Charger Original 67W, Tas Laptop, Dongle HDMI"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Kondisi Fisik Saat Serah</label>
                  <select
                    value={handoverForm.condition}
                    onChange={(e) => setHandoverForm({ ...handoverForm, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="Baru">Baru</option>
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Nama Petugas PIC (Pemberi)</label>
                  <input
                    type="text"
                    required
                    value={handoverForm.picName}
                    onChange={(e) => setHandoverForm({ ...handoverForm, picName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Catatan Peminjaman</label>
                <textarea
                  rows={2}
                  value={handoverForm.notes}
                  onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                  placeholder="Tujuan penggunaan aset, ketentuan khusus, dll."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-2 border border-gray-200">
                <input
                  type="checkbox"
                  id="autoDownloadBast"
                  checked={handoverForm.autoDownloadBast}
                  onChange={(e) => setHandoverForm({ ...handoverForm, autoDownloadBast: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <label htmlFor="autoDownloadBast" className="text-gray-700 font-medium cursor-pointer">
                  Otomatis cetak &amp; download <strong>Berita Acara Serah Terima (BAST PDF)</strong> resmi setelah disimpan
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setHandoverModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Memproses...' : 'Serahkan Aset & Terbitkan BAST'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Return / Pengembalian Aset */}
      {returnModalOpen && selectedAssetForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300">
                  Formulir Pengembalian Fasilitas
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  Terima Pengembalian Aset Perusahaan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Info Karyawan & Aset */}
            <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-gray-900">{selectedAssetForReturn.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">Tag: {selectedAssetForReturn.assetCode}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-900">
                  {selectedAssetForReturn.currentEmployee?.name || 'Karyawan'}
                </div>
                <div className="text-[11px] text-gray-500">{selectedAssetForReturn.currentEmployee?.nik}</div>
              </div>
            </div>

            <form onSubmit={handleExecuteReturn} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Tanggal Pengembalian</label>
                  <input
                    type="date"
                    required
                    value={returnForm.actionDate}
                    onChange={(e) => setReturnForm({ ...returnForm, actionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Status Pasca Kembali</label>
                  <select
                    value={returnForm.nextStatus}
                    onChange={(e) => setReturnForm({ ...returnForm, nextStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="AVAILABLE">Tersedia di Inventaris (Siap Pinjam)</option>
                    <option value="UNDER_MAINTENANCE">Perlu Servis / Perbaikan</option>
                    <option value="DISPOSED">Afkir / Dihapus dari Inventaris</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Kondisi Fisik Saat Diterima</label>
                  <select
                    value={returnForm.condition}
                    onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="Sangat Baik">Sangat Baik / Mulus</option>
                    <option value="Baik">Baik (Pemakaian Wajar)</option>
                    <option value="Rusak Ringan">Rusak Ringan (Ada Lecet / Baret)</option>
                    <option value="Rusak Berat">Rusak Berat (Tidak Berfungsi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Nama Petugas Pemeriksa</label>
                  <input
                    type="text"
                    required
                    value={returnForm.picName}
                    onChange={(e) => setReturnForm({ ...returnForm, picName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Kelengkapan Aksesoris Diterima</label>
                <input
                  type="text"
                  value={returnForm.accessories}
                  onChange={(e) => setReturnForm({ ...returnForm, accessories: e.target.value })}
                  placeholder="Contoh: Lengkap (Charger + Tas)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Catatan Pemeriksaan Fisik</label>
                <textarea
                  rows={2}
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="Catatan kondisi, kelengkapan, atau kerusakan jika ada..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-2 border border-gray-200">
                <input
                  type="checkbox"
                  id="autoDownloadBastReturn"
                  checked={returnForm.autoDownloadBast}
                  onChange={(e) => setReturnForm({ ...returnForm, autoDownloadBast: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="autoDownloadBastReturn" className="text-gray-700 font-medium cursor-pointer">
                  Otomatis cetak &amp; download <strong>BAST Pengembalian (Clearance PDF)</strong> resmi setelah disimpan
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Menyimpan...' : 'Konfirmasi Pengembalian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: History & Mutasi Aset */}
      {historyModalOpen && selectedAssetForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                  {selectedAssetForHistory.assetCode}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  Riwayat Mutasi &amp; Arsip BAST
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedAssetForHistory.name} • {selectedAssetForHistory.brand} {selectedAssetForHistory.model}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {selectedAssetForHistory.handoverLogs && selectedAssetForHistory.handoverLogs.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {selectedAssetForHistory.handoverLogs.map((log, idx) => {
                    const isHandover = log.type === 'HANDOVER'
                    return (
                      <div key={log.id || idx} className="relative group">
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white shadow-xs ${
                            isHandover ? 'bg-teal-500' : 'bg-blue-500'
                          }`}
                        >
                          {isHandover ? '→' : '←'}
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 hover:border-gray-300 transition">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isHandover
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {isHandover ? 'PENYERAHAN / PEMINJAMAN' : 'PENGEMBALIAN ASET'}
                            </span>
                            <span className="text-[11px] font-mono text-gray-500">
                              {new Date(log.actionDate).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-gray-800">
                            <strong>Karyawan:</strong> {log.employee?.name} ({log.employee?.nik}) • {log.employee?.dept || 'Umum'}
                          </div>

                          <div className="mt-1 text-[11px] text-gray-600 grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400">Kondisi:</span>{' '}
                              <strong>{log.condition}</strong>
                            </div>
                            <div>
                              <span className="text-gray-400">Pemeriksa PIC:</span>{' '}
                              {log.picName || 'HR/GA'}
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-400">Aksesoris:</span>{' '}
                              {log.accessories || 'Lengkap'}
                            </div>
                            {log.notes && (
                              <div className="col-span-2 text-gray-500 italic">
                                "{log.notes}"
                              </div>
                            )}
                          </div>

                          {/* Tombol Cetak Dokumen BAST */}
                          <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-gray-400">
                              {log.bastNumber || 'BAST-TERCATAT'}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  if (isHandover) {
                                    await generateHandoverBastPdf({
                                      company: companyName || 'San PeopleHub',
                                      asset: selectedAssetForHistory,
                                      employee: log.employee,
                                      picName: log.picName || 'HR/GA',
                                      accessories: log.accessories,
                                      notes: log.notes,
                                      bastNumber: log.bastNumber,
                                      handoverDate: log.actionDate,
                                    })
                                  } else {
                                    await generateReturnBastPdf({
                                      company: companyName || 'San PeopleHub',
                                      asset: selectedAssetForHistory,
                                      employee: log.employee,
                                      picName: log.picName || 'HR/GA',
                                      accessories: log.accessories,
                                      notes: log.notes,
                                      bastNumber: log.bastNumber,
                                      returnDate: log.actionDate,
                                      condition: log.condition,
                                    })
                                  }
                                } catch (e) {
                                  alert('Gagal cetak dokumen: ' + e.message)
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-gray-100 text-teal-800 border border-gray-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                              <span>Cetak Dokumen BAST (PDF)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">
                  Belum ada riwayat mutasi / peminjaman untuk aset ini.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold cursor-pointer"
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
