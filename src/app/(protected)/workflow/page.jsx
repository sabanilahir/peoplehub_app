'use client'

import Link from 'next/link'

export default function WorkflowPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal Workflow &amp; Task</h1>
        <p className="text-gray-600 text-sm mt-1">
          Pusat pengelolaan tugas, peninjauan proses persetujuan, dan analisa alur kerja Flowable
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/workflow/tasks"
          className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-amber-400 transition"
        >
          <div className="text-4xl mb-4">📥</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Task Inbox</h2>
          <p className="text-xs text-gray-600">Daftar tugas persetujuan yang menunggu tindakan Anda</p>
        </Link>

        <Link
          href="/workflow/my-requests"
          className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-400 transition"
        >
          <div className="text-4xl mb-4">📤</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">My Requests</h2>
          <p className="text-xs text-gray-600">Status dan tracking permohonan yang Anda ajukan</p>
        </Link>

        <Link
          href="/workflow/history"
          className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-indigo-400 transition"
        >
          <div className="text-4xl mb-4">📜</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Riwayat (History)</h2>
          <p className="text-xs text-gray-600">Arsip jejak audit seluruh alur proses yang telah selesai</p>
        </Link>

        <Link
          href="/sysadmin/workflow/analytics"
          className="block bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl p-6 hover:shadow-lg hover:border-purple-400 transition"
        >
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-bold text-purple-900 mb-1">Analisa &amp; Metrik</h2>
          <p className="text-xs text-gray-600">Dashboard visual SLA, bottleneck approval, dan throughput</p>
        </Link>
      </div>
    </div>
  )
}
