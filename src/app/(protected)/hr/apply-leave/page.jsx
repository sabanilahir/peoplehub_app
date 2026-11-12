'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useLeaveStore } from '@/store/leaveStore'
import { useWorkflowStore } from '@/store/workflowStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { daysBetween } from '@/utils/dateUtils'
import { calcLeaveUsed, LEAVE_STATUS_BADGE, validateLeaveForm } from '@/utils/leaveUtils'
import WorkflowMonitor from '@/components/WorkflowMonitor'
import { useT } from '@/store/languageStore'

export default function ApplyLeaveHRPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { leaves, submitLeave } = useLeaveStore()
  const { getLevelsForPage } = useWorkflowStore()
  const { employees } = useEmployeeStore()
  const { positions, departments, companies } = useStructureStore()

  const [dbTypes, setDbTypes] = useState([])
  const [form, setForm] = useState({ empId: '', type: '', start: '', end: '', note: '', attachment: '' })
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterCo, setFilterCo] = useState('')
  const [msg, setMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedLeaveId, setSelectedLeaveId] = useState(() =>
    [...leaves].sort((a, b) => b.id - a.id)[0]?.id ?? null
  )

  // Load Leave Types from PostgreSQL DB
  useEffect(() => {
    fetch('/api/leave/types')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDbTypes(res.data)
        }
      })
      .catch((err) => console.error('Failed to load leave types:', err))
  }, [])

  const activeTypes = dbTypes.length > 0 ? dbTypes : [
    { id: 1, name: 'Cuti Tahunan', maxDays: 12 },
    { id: 2, name: 'Cuti Sakit', maxDays: 14 },
    { id: 3, name: 'Cuti Menikah', maxDays: 3 },
    { id: 4, name: 'Cuti Melahirkan', maxDays: 90 },
    { id: 5, name: 'Unpaid Leave (Izin Potong Gaji)', maxDays: 30 },
    { id: 6, name: 'Izin Setengah Hari', maxDays: 30 },
  ]

  const filteredEmps = useMemo(() => employees.filter((e) => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.nik.toLowerCase().includes(search.toLowerCase())
    const matchDept = !filterDept || e.departmentId === +filterDept || (e.dept && departments.find((d) => d.id === +filterDept)?.name === e.dept)
    const matchCo = !filterCo || e.companyId === +filterCo
    return matchSearch && matchDept && matchCo
  }), [employees, search, filterDept, filterCo, departments])

  const selectedEmp = employees.find((e) => e.id === +form.empId)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      setForm((f) => ({ ...f, attachment: uploadEvent.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    const err = validateLeaveForm(
      { empId: +form.empId || null, type: form.type, start: form.start, end: form.end },
      leaves,
      activeTypes,
      t,
      true
    )
    if (err) {
      setMsg({ type: 'error', text: err })
      return
    }

    setSubmitting(true)
    setMsg(null)

    const selectedTypeObj = activeTypes.find((lt) => lt.name === form.type) || activeTypes[0]

    try {
      // 1. Simpan ke database PostgreSQL via API
      const res = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(form.empId),
          typeId: Number(selectedTypeObj.id),
          startDate: form.start,
          endDate: form.end,
          note: form.note || '',
          attachment: form.attachment || null,
        }),
      })

      const resJson = await res.json()

      if (resJson.success) {
        // 2. Perbarui state client-side
        submitLeave(
          {
            id: resJson.data?.id,
            userId: +form.empId,
            name: selectedEmp?.name ?? '',
            submittedBy: currentUser.id,
            submittedByName: currentUser.name,
            workflowName: 'Apply Leave (HR)',
            attachment: form.attachment,
            ...form,
          },
          getLevelsForPage('Apply Leave (HR)')
        )

        setForm({ empId: '', type: '', start: '', end: '', note: '', attachment: '' })
        setMsg({
          type: 'success',
          text: t(
            `Cuti berhasil diajukan untuk ${selectedEmp?.name} dan masuk ke sistem workflow.`,
            `Leave submitted for ${selectedEmp?.name} and added to workflow system.`
          ),
        })
        setTimeout(() => setMsg(null), 4000)
        setTimeout(() => {
          const latest = useLeaveStore.getState().leaves.slice().sort((a, b) => b.id - a.id)[0]
          if (latest) setSelectedLeaveId(latest.id)
        }, 50)
      } else {
        setMsg({ type: 'error', text: resJson.error || 'Gagal menyimpan pengajuan ke database' })
      }
    } catch (apiErr) {
      console.error(apiErr)
      setMsg({ type: 'error', text: 'Terjadi kesalahan koneksi saat mengajukan cuti' })
    } finally {
      setSubmitting(false)
    }
  }

  const posName = (id) => positions.find((p) => p.id === +id)?.name || '—'
  const deptName = (id, fallback) => departments.find((d) => d.id === +id)?.name || fallback || '—'
  const coName = (id) => companies.find((c) => c.id === +id)?.name || '—'

  const allLeaves = [...leaves].sort((a, b) => b.id - a.id)

  return (
    <div>
      {/* ── Header & Quick Nav Tabs ── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('Apply Leave — HR', 'Apply Leave — HR')}</h1>
            <p className="text-gray-500 text-sm">{t('Ajukan cuti atas nama seluruh karyawan.', 'Submit leave on behalf of any employee.')}</p>
          </div>
          <Link
            href="/hr/leave-report"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition shadow-sm w-fit"
          >
            <Icon e="📊" size={14} />
            <span>{t('Buka Laporan Cuti Lengkap', 'Open Full Leave Report')}</span>
            <Icon e="→" size={12} />
          </Link>
        </div>

        {/* ── Tautan Cepat Antar Halaman Cuti HR ── */}
        <div className="flex items-center justify-between border-b border-gray-200 pt-1">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-teal-800 border-b-2 border-teal-600 bg-teal-50/50 rounded-t-lg">
              <Icon e="📝" size={14} />
              <span>{t('Ajukan Cuti (Formulir)', 'Submit Leave (Form)')}</span>
            </div>
            <Link
              href="/hr/leave-report"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-lg transition"
            >
              <Icon e="📊" size={14} />
              <span>{t('Laporan & Rekap Cuti', 'Leave Report & Analytics')}</span>
            </Link>
          </div>

          <Link
            href="/hr/leave-report"
            className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 py-1 transition"
          >
            <span>{t('Lihat Rekap Seluruh Karyawan', 'View All Employee Summary')}</span>
            <Icon e="→" size={12} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Employee picker */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">
            <Icon e="👤" size={14} className="inline align-[-2px]" /> {t('Pilih Karyawan', 'Select Employee')}
          </h2>
          <div className="space-y-2 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Cari nama / NIK…', 'Search name / ID…')}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400"
            />
            <select
              value={filterCo}
              onChange={(e) => setFilterCo(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400"
            >
              <option value="">{t('Semua Perusahaan', 'All Companies')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400"
            >
              <option value="">{t('Semua Departemen', 'All Departments')}</option>
              {departments
                .filter((d) => d.name && !d.name.startsWith('AG -') && !d.name.startsWith('AM -') && !d.name.startsWith('BP -'))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="text-xs text-gray-400 mb-2">
            {filteredEmps.length} {t('karyawan', 'employees')}
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {filteredEmps.map((e) => (
              <button
                key={e.id}
                onClick={() => setForm((f) => ({ ...f, empId: String(e.id) }))}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition ${
                  form.empId === String(e.id) ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
                >
                  {e.photo ? (
                    <img src={e.photo} className="w-full h-full object-cover" />
                  ) : (
                    (e.name || '?')
                      .trim()
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{e.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {e.nik} · {deptName(e.departmentId, e.dept)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">
            <Icon e="📝" size={14} className="inline align-[-2px]" /> {t('Ajukan Cuti', 'Submit Leave')}
          </h2>

          {msg && (
            <div
              className={`text-sm px-4 py-2.5 rounded-lg mb-4 ${
                msg.type === 'error'
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-green-50 text-green-600 border border-green-200'
              }`}
            >
              {msg.text}
            </div>
          )}

          {selectedEmp && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
              >
                {selectedEmp.photo ? (
                  <img src={selectedEmp.photo} className="w-full h-full object-cover" />
                ) : (
                  (selectedEmp.name || '?')
                    .trim()
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-blue-800">{selectedEmp.name}</div>
                <div className="text-xs text-blue-500">
                  {selectedEmp.nik} · {posName(selectedEmp.positionId)}
                </div>
                <div className="text-xs text-blue-400">
                  {deptName(selectedEmp.departmentId, selectedEmp.dept)} · {coName(selectedEmp.companyId)}
                </div>
              </div>
              {form.type && (
                <div className="ml-auto text-right flex-shrink-0">
                  <div className="text-xs text-gray-500">{t('Sisa saldo', 'Remaining balance')}</div>
                  <div className="text-xl font-bold text-blue-700">
                    {(() => {
                      const lt = activeTypes.find((x) => x.name === form.type)
                      const { approved, pending } = calcLeaveUsed(leaves, +form.empId, form.type)
                      return (lt?.maxDays ?? 0) - approved - pending
                    })()}{' '}
                    {t('hari', 'days')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leave balance mini-cards for selected employee */}
          {selectedEmp && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {activeTypes.map((lt) => {
                const { approved, pending } = calcLeaveUsed(leaves, +form.empId, lt.name)
                const sisa = lt.maxDays - approved - pending
                return (
                  <div key={lt.id} className="border border-gray-100 rounded-lg px-3 py-2 text-center">
                    <div className="text-xs text-gray-500 truncate">{lt.name}</div>
                    <div className="text-lg font-bold text-gray-700">
                      {sisa}
                      <span className="text-xs font-normal text-gray-400">/{lt.maxDays}</span>
                    </div>
                    {pending > 0 && <div className="text-xs text-amber-500">{pending}p</div>}
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {t('Jenis Cuti', 'Leave Type')}
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400"
              >
                <option value="">— {t('Pilih Jenis', 'Select Type')} —</option>
                {activeTypes.map((lt) => {
                  const { approved, pending } = form.empId
                    ? calcLeaveUsed(leaves, +form.empId, lt.name)
                    : { approved: 0, pending: 0 }
                  const sisa = lt.maxDays - approved - pending
                  return (
                    <option key={lt.id} value={lt.name}>
                      {lt.name} ({t('sisa', 'remaining')}: {sisa} {t('hari', 'days')})
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('Keterangan', 'Note')}</label>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={t('Opsional', 'Optional')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {t('Tanggal Mulai', 'Start Date')}
              </label>
              <input
                type="date"
                value={form.start}
                onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {t('Tanggal Selesai', 'End Date')}
              </label>
              <input
                type="date"
                value={form.end}
                onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400"
              />
            </div>

            {/* Lampiran Dokumen */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Lampiran Surat Dokter / Dokumen Pendukung
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                * Lampirkan Surat Sakit untuk Cuti Sakit agar Gaji Pokok &amp; NPA tidak dipotong di HO Calculator.
              </p>
            </div>
          </div>

          {form.start && form.end && form.end >= form.start && (
            <p className="text-xs text-blue-600 font-semibold mt-2">
              {t('Durasi', 'Duration')}: {daysBetween(form.start, form.end)} {t('hari kerja', 'working days')}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 px-6 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
          >
            {submitting ? 'Menyimpan...' : t('Ajukan Cuti', 'Submit Leave')}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700">
            <Icon e="📄" size={14} className="inline align-[-2px]" /> {t('Semua Riwayat Cuti', 'All Leave History')}
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({allLeaves.length} {t('pengajuan', 'submissions')})
            </span>
          </h2>
          <Link
            href="/hr/leave-report"
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition"
          >
            <Icon e="📊" size={13} />
            <span>{t('Buka Laporan Cuti Lengkap', 'Open Full Report')}</span>
            <Icon e="→" size={11} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {[
                  t('Karyawan', 'Employee'),
                  t('Departemen', 'Department'),
                  t('Jenis', 'Type'),
                  t('Mulai', 'Start'),
                  t('Selesai', 'End'),
                  t('Hari', 'Days'),
                  t('Keterangan', 'Note'),
                  'Status',
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLeaves.length ? (
                allLeaves.map((l) => {
                  const emp = employees.find((e) => e.id === l.userId)
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLeaveId(l.id)}
                      className={`border-t border-gray-100 cursor-pointer transition ${
                        selectedLeaveId === l.id ? 'bg-red-50 border-l-2 border-l-red-400' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium">{l.name}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{emp ? deptName(emp.departmentId, emp.dept) : '—'}</td>
                      <td className="px-4 py-2.5">{l.type}</td>
                      <td className="px-4 py-2.5">{l.start}</td>
                      <td className="px-4 py-2.5">{l.end}</td>
                      <td className="px-4 py-2.5">{daysBetween(l.start, l.end)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.note || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEAVE_STATUS_BADGE[l.status] || ''}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {t('Belum ada pengajuan.', 'No submissions yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLeaveId && (
        <div className="mt-6">
          <WorkflowMonitor
            leaves={allLeaves.filter((l) => l.id === selectedLeaveId)}
            title={t('Workflow Monitor', 'Workflow Monitor')}
            expandedId={selectedLeaveId}
          />
        </div>
      )}
    </div>
  )
}
