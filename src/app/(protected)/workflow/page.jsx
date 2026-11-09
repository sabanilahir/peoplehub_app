'use client'

import Link from 'next/link'

export default function WorkflowPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal Workflow &amp; Task</h1>
        <p className="text-gray-600 text-sm mt-1">
          Pusat pengelolaan tugas persetujuan (Cuti &amp; Lembur), tracking permohonan mandiri, audit trail, dan integrasi otomatis ke HO Payroll Calculator.
        </p>
      </div>

      {/* Core Workflow Hub Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/workflow/tasks"
          className="group block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl p-3 bg-amber-50 rounded-2xl group-hover:scale-105 transition">📥</div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
              Persetujuan Aktif
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition mb-1">
            Task Inbox
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Daftar tugas persetujuan (Cuti, Izin, Lembur) yang menunggu review Anda sebelum masuk ke perhitungan payroll.
          </p>
        </Link>

        <Link
          href="/workflow/my-requests"
          className="group block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-blue-400 transition"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl p-3 bg-blue-50 rounded-2xl group-hover:scale-105 transition">📤</div>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Pengajuan Saya
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-1">
            My Requests
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Status real-time, stepper progress approval bertingkat, dan tracking seluruh permohonan yang Anda ajukan.
          </p>
        </Link>

        <Link
          href="/workflow/history"
          className="group block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-indigo-400 transition"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl p-3 bg-indigo-50 rounded-2xl group-hover:scale-105 transition">📜</div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
              Audit Trail
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition mb-1">
            Riwayat (History)
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Arsip riwayat jejak audit seluruh tugas cuti &amp; lembur yang telah selesai diputuskan (Disetujui / Ditolak).
          </p>
        </Link>
      </div>

      {/* Quick Links & Shortcuts Section */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50/40 border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🚀</span> Pintasan Terkait (Quick Shortcuts)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href="/mss/approve-leave"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition"
          >
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-xs font-bold text-gray-900">Approve Leave (MSS)</div>
              <div className="text-[11px] text-gray-500">Persetujuan cuti khusus bawahan &amp; tim</div>
            </div>
          </Link>

          <Link
            href="/mss/apply-leave-team"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition"
          >
            <span className="text-2xl">👥</span>
            <div>
              <div className="text-xs font-bold text-gray-900">Apply Leave (Team)</div>
              <div className="text-[11px] text-gray-500">Ajukan cuti atas nama anggota tim</div>
            </div>
          </Link>

          <Link
            href="/hr/payroll/ho-calculator"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-400 hover:shadow-sm transition"
          >
            <span className="text-2xl">🧮</span>
            <div>
              <div className="text-xs font-bold text-gray-900">HO Payroll Calculator</div>
              <div className="text-[11px] text-gray-500">Perhitungan gaji &amp; potongan cuti otomatis</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
