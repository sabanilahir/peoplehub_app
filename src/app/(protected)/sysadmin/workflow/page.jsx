'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function WorkflowPage() {
  const [engineStatus, setEngineStatus] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/flowable/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'http://localhost:8080/flowable-rest',
        username: 'admin',
        password: 'test',
      }),
    })
      .then((res) => res.json())
      .then((data) => setEngineStatus(data.success))
      .catch(() => setEngineStatus(false))
      .finally(() => setChecking(false))
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Workflow Engine</h1>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                checking
                  ? 'bg-gray-100 text-gray-600'
                  : engineStatus
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {checking
                ? 'Memeriksa status engine...'
                : engineStatus
                ? '🟢 Workflow Engine Aktif'
                : '🟡 Workflow Offline (Local Mock Mode)'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Integrasi Workflow Engine lokal dengan visual BPMN modeler dan dashboard analisa proses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/sysadmin/workflow/analytics"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
          >
            📊 Analisa Workflow
          </Link>
          <Link
            href="/sysadmin/workflow/designer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
          >
            🎨 BPMN Designer
          </Link>
        </div>
      </div>

      {/* Grid Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Analisa & Metrik */}
        <Link
          href="/sysadmin/workflow/analytics"
          className="group block bg-gradient-to-br from-purple-50 via-white to-white border-2 border-purple-200 hover:border-purple-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl p-3 bg-purple-100 text-purple-700 rounded-xl">📊</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Baru
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition">
            Analisa &amp; Metrik Workflow
          </h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Dashboard visual performa proses: waktu turnaround rata-rata, deteksi bottleneck persetujuan, tren throughput, dan workload approver.
          </p>
        </Link>

        {/* Card 2: BPMN Designer */}
        <Link
          href="/sysadmin/workflow/designer"
          className="group block bg-white border border-gray-200 hover:border-blue-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="text-4xl p-3 bg-blue-50 text-blue-700 rounded-xl w-fit mb-4">🎨</div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition">
            BPMN Visual Designer
          </h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Editor visual berbasis BPMN: buat alur persetujuan, user task, sequence flow, lalu deploy langsung ke Workflow Engine.
          </p>
        </Link>

        {/* Card 3: Daftar Workflows */}
        <Link
          href="/sysadmin/workflow/definitions"
          className="group block bg-white border border-gray-200 hover:border-emerald-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="text-4xl p-3 bg-emerald-50 text-emerald-700 rounded-xl w-fit mb-4">📋</div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition">
            Daftar Workflows
          </h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Daftar definisi proses BPMN yang terdaftar di engine, status aktif/nonaktif, dan opsi eksekusi serta inspeksi XML.
          </p>
        </Link>

        {/* Card 4: Workflow Engine Settings */}
        <Link
          href="/sysadmin/workflow/flowable-settings"
          className="group block bg-white border border-gray-200 hover:border-gray-400 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="text-4xl p-3 bg-gray-100 text-gray-700 rounded-xl w-fit mb-4">⚙️</div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition">
            Workflow Settings
          </h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Konfigurasi koneksi REST API engine lokal (http://localhost:8080/flowable-rest), username/password, dan tes status engine.
          </p>
        </Link>

        {/* Card 5: Task Inbox */}
        <Link
          href="/workflow/tasks"
          className="group block bg-white border border-gray-200 hover:border-amber-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="text-4xl p-3 bg-amber-50 text-amber-700 rounded-xl w-fit mb-4">📥</div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-amber-700 transition">
            Task Inbox
          </h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Kotak masuk tugas persetujuan yang menunggu tindakan pengguna (claim, approve, reject, feedback).
          </p>
        </Link>

        {/* Card 6: Workflow History */}
        <Link
          href="/workflow/history"
          className="group block bg-white border border-gray-200 hover:border-indigo-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="text-4xl p-3 bg-indigo-50 text-indigo-700 rounded-xl w-fit mb-4">📜</div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition">
            Riwayat Proses (History)
          </h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Log jejak audit eksekusi proses yang telah selesai atau dibatalkan, durasi pengerjaan, dan riwayat langkah.
          </p>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <span>💡 Arsitektur Engine &amp; Editor</span>
        </h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          Modul ini menggabungkan <strong>Workflow Engine</strong> di backend (REST API)
          dengan <strong>BPMN.js</strong> di frontend browser. Model BPMN 2.0 yang dirancang dapat langsung dideploy
          secara native ke Workflow REST endpoint <code className="bg-blue-100/80 px-1.5 py-0.5 rounded font-mono text-xs">/repository/deployments</code>,
          kemudian seluruh data riwayat eksekusi dianalisis secara otomatis di halaman <strong>Analisa Workflow</strong>.
        </p>
      </div>
    </div>
  )
}
