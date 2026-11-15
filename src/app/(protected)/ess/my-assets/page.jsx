// src/app/(protected)/ess/my-assets/page.jsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Laptop,
  Car,
  KeyRound,
  Wrench,
  Package,
  FileText,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  PhoneCall,
  Mail,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBrandingStore } from '@/store/brandingStore'
import { generateHandoverBastPdf } from '@/lib/assetBastDocs'

const CATEGORY_MAP = {
  IT_EQUIPMENT: { label: 'IT Equipment', icon: Laptop, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  VEHICLE: { label: 'Kendaraan Dinas', icon: Car, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  FACILITY: { label: 'Fasilitas & Akses', icon: KeyRound, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  TOOLS: { label: 'Alat Kerja / Lapangan', icon: Wrench, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  OTHERS: { label: 'Lainnya', icon: Package, color: 'text-gray-600 bg-gray-50 border-gray-200' },
}

export default function MyAssetsPage() {
  const { currentUser } = useAuthStore()
  const { companyName } = useBrandingStore()

  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  const empId = currentUser?.employeeId || currentUser?.id

  const fetchMyAssets = async () => {
    if (!empId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/assets?employeeId=${empId}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setAssets(json.data)
      } else {
        setErrorMsg(json.error || 'Gagal memuat data aset saya')
      }
    } catch (err) {
      console.error('Fetch my assets error:', err)
      setErrorMsg('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyAssets()
  }, [empId])

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-3 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4" />
            <span>Employee Self Service (ESS)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Aset &amp; Fasilitas Kerja Saya
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Daftar fasilitas dan aset perusahaan yang saat ini Anda gunakan sebagai sarana penunjang pekerjaan, beserta arsip dokumen Berita Acara Serah Terima (BAST).
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cards List of Assets */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm">
          <span className="inline-block animate-spin mr-2">⏳</span>
          Memuat fasilitas dan aset Anda...
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">
            Tidak Ada Aset yang Sedang Dipinjam
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Saat ini tidak ada unit komputer, kendaraan, atau fasilitas kerja inventaris perusahaan yang tercatat dipinjamkan atas nama Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assets.map((asset) => {
            const cat = CATEGORY_MAP[asset.category] || CATEGORY_MAP.OTHERS
            const CatIcon = cat.icon
            const assignedDateStr = asset.assignedDate
              ? new Date(asset.assignedDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : '-'

            return (
              <div
                key={asset.id}
                className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {asset.assetCode}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      Sedang Digunakan
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${cat.color}`}>
                      <CatIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">
                        {asset.name}
                      </h3>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {cat.label} • {asset.brand} {asset.model}
                      </div>
                    </div>
                  </div>

                  {/* Specifications and Details */}
                  <div className="mt-5 p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Nomor Seri / Nopol:</span>
                      <span className="font-mono font-bold text-teal-800">
                        {asset.serialNumber || asset.plateNumber || '—'}
                      </span>
                    </div>

                    {asset.specifications && (
                      <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-600">
                        <span className="font-semibold text-gray-700">Spesifikasi:</span> {asset.specifications}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Tanggal Serah Terima:</span>
                      <span className="font-medium text-gray-800">{assignedDateStr}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Kondisi Saat Diterima:</span>
                      <span className="font-semibold text-emerald-700">{asset.condition}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Arsip Resmi Perusahaan</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await generateHandoverBastPdf({
                          company: companyName || 'San PeopleHub',
                          asset,
                          employee: currentUser,
                          picName: 'HR / GA Department',
                          accessories: 'Lengkap Sesuai BAST Penyerahan',
                          bastNumber: `BAST/AST/2026/${asset.assetCode.split('-').pop()}`,
                          handoverDate: asset.assignedDate || new Date(),
                        })
                      } catch (err) {
                        alert('Gagal mengunduh dokumen: ' + err.message)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Unduh BAST (PDF)</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Guidelines Card */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 text-xs space-y-3">
        <h4 className="font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Panduan Penggunaan Fasilitas &amp; Aset Perusahaan</span>
        </h4>
        <ul className="list-disc list-inside space-y-1.5 text-slate-600 leading-relaxed">
          <li>Fasilitas yang dipinjamkan wajib dirawat kebersihan dan keamanannya untuk menunjang aktivitas kerja.</li>
          <li>Dilarang memindahtangankan aset perusahaan kepada pihak luar tanpa persetujuan tertulis manajemen HR/GA.</li>
          <li>
            Jika terjadi kendala teknis atau kerusakan, segera hubungi tim IT Helpdesk atau GA melalui email{' '}
            <strong className="text-teal-700">support@san-peoplehub.my.id</strong>.
          </li>
          <li>
            Saat mengakhiri masa kerja (offboarding), seluruh fasilitas harus diserahkan kembali lengkap beserta aksesoris aslinya sebagai syarat penerbitan <em>Clearance Certificate</em>.
          </li>
        </ul>
      </div>
    </div>
  )
}
