'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

export default function WorkflowAnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')
  const [error, setError] = useState(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/flowable/analytics?range=${range}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error || 'Failed to load analytics')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [range])

  const overview = data?.overview || {}
  const engine = data?.engine || {}
  const trend = data?.trend || []
  const statusDistribution = data?.statusDistribution || []
  const bottlenecks = data?.bottlenecks || []
  const approverWorkload = data?.approverWorkload || []
  const definitionStats = data?.definitionStats || []

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Analisa & Metrik Workflow</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                engine.connected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {engine.connected ? '🟢 Workflow Engine Online' : '🟡 Standalone / Fallback Mode'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Monitoring performa proses, analisis turnaround time, throughput, dan identifikasi bottleneck persetujuan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border rounded-lg p-1 flex shadow-sm">
            {[
              { id: '7d', label: '7 Hari' },
              { id: '30d', label: '30 Hari' },
              { id: '90d', label: '3 Bulan' },
              { id: 'all', label: 'Semua' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRange(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  range === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium shadow-sm flex items-center gap-1.5 transition"
          >
            🔄 Refresh
          </button>
          <Link
            href="/sysadmin/workflow/designer"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-1.5"
          >
            🎨 BPMN Designer
          </Link>
        </div>
      </div>

      {/* Engine Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm ${
          engine.connected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <span className="text-2xl">{engine.connected ? '⚡' : '⚙️'}</span>
          <div>
            <div className="font-semibold">
              {engine.connected
                ? 'Terhubung ke Workflow Engine Lokal'
                : 'Workflow Engine Lokal Belum Terdeteksi Aktif'}
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              Target endpoint: <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded">{engine.url || 'http://localhost:8080/flowable-rest'}</code>
              {' • '}
              {engine.connected
                ? 'Data historis dan aktivitas runtime disinkronkan secara real-time.'
                : 'Data analisa berjalan dengan cache database internal. Jalankan workflow engine lokal untuk sinkronisasi runtime.'}
            </div>
          </div>
        </div>
        <Link
          href="/sysadmin/workflow/flowable-settings"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border shadow-sm hover:bg-gray-50 transition shrink-0"
        >
          Konfigurasi Koneksi →
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
          <p className="text-gray-500 font-medium">Memuat data analitik workflow...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Gagal memuat analitik: {error}
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Eksekusi</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{overview.totalProcesses ?? 0}</div>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                ↑ +12% dari periode lalu
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sedang Aktif</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">{overview.activeProcesses ?? 0}</div>
              <span className="text-xs text-gray-500 mt-1 block">Dalam proses approval</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tingkat Sukses</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{overview.successRate ?? 0}%</div>
              <span className="text-xs text-gray-500 mt-1 block">{overview.completedProcesses ?? 0} berhasil disetujui</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata Siklus</span>
              <div className="text-2xl font-bold text-indigo-600 mt-1">{overview.avgCycleTimeDisplay || '-'}</div>
              <span className="text-xs text-gray-500 mt-1 block">Dari submit s/d approval akhir</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Tasks</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{overview.pendingTasks ?? 0}</div>
              <span className="text-xs text-gray-500 mt-1 block">Menunggu aksi user</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tahap Bottleneck</span>
              <div className="text-2xl font-bold text-red-600 mt-1">{overview.bottleneckCount ?? 0}</div>
              <span className="text-xs text-red-600 font-medium mt-1 block">&gt; 12 jam SLA average</span>
            </div>
          </div>

          {/* Charts Row 1: Throughput Trend & Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Tren Throughput Eksekusi Workflow</h2>
                  <p className="text-xs text-gray-500">Jumlah proses dimulai (Started) vs berhasil diselesaikan (Completed)</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="started"
                      name="Proses Diajukan"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorStarted)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Proses Disetujui"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-1">Distribusi Status Instance</h2>
              <p className="text-xs text-gray-500 mb-4">Rasio status proses dalam Workflow</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2 pt-2 border-t text-xs">
                {statusDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700">{item.name}</span>
                    </span>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Bottleneck Analysis & Approver Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bottlenecks */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Analisis Bottleneck Tiap Tahap (User Task)</h2>
                  <p className="text-xs text-gray-500">Rata-rata waktu tunggu hingga tugas diselesaikan (Jam)</p>
                </div>
                <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 font-medium">
                  SLA Target: &le; 12 Jam
                </span>
              </div>

              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={bottlenecks}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" unit="j" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="taskName" type="category" stroke="#64748b" fontSize={11} width={130} />
                    <Tooltip
                      formatter={(val) => [`${val} Jam`, 'Rata-rata Durasi']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="avgDurationHours"
                      name="Rata-rata Jam"
                      radius={[0, 4, 4, 0]}
                    >
                      {bottlenecks.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.avgDurationHours > 12 ? '#EF4444' : '#3B82F6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-gray-500 mt-2 flex items-center justify-between border-t pt-2">
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Melebihi SLA (&gt; 12 Jam)
                </span>
                <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Sesuai Standar (&le; 12 Jam)
                </span>
              </div>
            </div>

            {/* Approver Workload */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-1">Beban Tugas Berdasarkan Role Approver</h2>
              <p className="text-xs text-gray-500 mb-4">Jumlah task pending vs task yang sudah diselesaikan</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={approverWorkload} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="role" stroke="#94a3b8" fontSize={11} angle={-15} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                    <Bar dataKey="pending" name="Pending Tasks" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed Tasks" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Process Definitions Performance Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Performa Workflow Definitions</h2>
                <p className="text-xs text-gray-500">Statistik per definisi proses yang terdaftar di engine</p>
              </div>
              <Link
                href="/sysadmin/workflow/definitions"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Lihat Semua Definisi →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-5 py-3">Nama Proses</th>
                    <th className="px-4 py-3">Process Key</th>
                    <th className="px-4 py-3 text-center">Total Runs</th>
                    <th className="px-4 py-3 text-center">Aktif</th>
                    <th className="px-4 py-3 text-center">Selesai</th>
                    <th className="px-4 py-3 text-center">Rata-rata Waktu</th>
                    <th className="px-4 py-3 text-center">SLA Compliance</th>
                    <th className="px-5 py-3">Status Kesehatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {definitionStats.map((def) => (
                    <tr key={def.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{def.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{def.key}</td>
                      <td className="px-4 py-3.5 text-center font-medium">{def.totalRuns}</td>
                      <td className="px-4 py-3.5 text-center text-blue-600 font-medium">{def.active}</td>
                      <td className="px-4 py-3.5 text-center text-emerald-600 font-medium">{def.completed}</td>
                      <td className="px-4 py-3.5 text-center text-gray-700">{def.avgDuration}</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-gray-900">{def.slaCompliance}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
                            def.status.includes('Healthy')
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {def.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Link
          href="/sysadmin/workflow"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          ← Kembali ke Menu Workflow
        </Link>
        <div className="flex gap-3">
          <Link
            href="/sysadmin/workflow/designer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            🎨 Buka BPMN Designer
          </Link>
          <Link
            href="/workflow/tasks"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
          >
            📥 Task Inbox
          </Link>
        </div>
      </div>
    </div>
  )
}

