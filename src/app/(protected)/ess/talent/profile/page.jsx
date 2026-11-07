'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTalentStore } from '@/store/talentStore'
import { useEmployeeStore } from '@/store/employeeStore'

const PERF_HISTORY = [
  { year: 2023, score: 82, grade: 'B', talentBox: 'Potential Gem' },
  { year: 2024, score: 88, grade: 'A', talentBox: 'High Potential' },
  { year: 2025, score: 91, grade: 'A+', talentBox: 'Star' },
]

const CAREER_HISTORY = [
  { period: '2018 – 2020', position: 'Staff HR', company: 'PT Dexa Group', type: 'internal' },
  { period: '2020 – 2022', position: 'Senior Staff HR', company: 'PT Dexa Group', type: 'internal' },
  { period: '2022 – Sekarang', position: 'HR Supervisor', company: 'PT Dexa Group', type: 'internal' },
]

const JOB_LEVEL_HISTORY = [
  { level: 'Staff', years: 2 },
  { level: 'Senior Staff', years: 2 },
  { level: 'Supervisor', years: 3 },
]

const BOX_LABEL = {
  '3-3': 'Star', '2-3': 'High Potential', '3-2': 'High Performer',
  '2-2': 'Core Employee', '1-3': 'Rough Diamond', '3-1': 'Solid Performer',
  '1-2': 'Potential Gem', '2-1': 'Consistent', '1-1': 'Underperformer',
}

const BOX_COLOR = {
  'Star': 'bg-green-100 text-green-800 border-green-300',
  'High Potential': 'bg-blue-100 text-blue-800 border-blue-300',
  'High Performer': 'bg-blue-100 text-blue-800 border-blue-300',
  'Core Employee': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Rough Diamond': 'bg-purple-100 text-purple-800 border-purple-300',
  'Potential Gem': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'Solid Performer': 'bg-teal-100 text-teal-800 border-teal-300',
  'Consistent': 'bg-gray-100 text-gray-700 border-gray-300',
  'Underperformer': 'bg-red-100 text-red-800 border-red-300',
}

export default function MyTalentProfile() {
  const { user } = useAuthStore()
  const { talentBoxes, idpList, careerPaths } = useTalentStore()
  const { employees } = useEmployeeStore()
  const [activeTab, setActiveTab] = useState('overview')

  // Find current user's employee record
  const empRecord = employees.find(e =>
    e.id === user?.id || e.email === user?.email || e.name === user?.name
  )

  // Talent boxes: match by employeeId (numeric or string) or by name
  const myBoxes = talentBoxes.filter(b =>
    b.employeeId === (user?.id || '1') ||
    String(b.employeeId) === String(user?.id) ||
    b.employeeName === user?.name
  )
  const latestBox = [...myBoxes].sort((a, b) => b.year - a.year)[0]

  // IDP: match by employeeId or name
  const myIdp = idpList.filter(i =>
    i.employeeId === (user?.id || '1') ||
    String(i.employeeId) === String(user?.id) ||
    i.employeeName === user?.name
  )
  const latestIdp = [...myIdp].sort((a, b) => b.year - a.year)[0]

  // Career paths for current user
  const myCareerPath = careerPaths.find(cp =>
    cp.employeeId === (user?.id || '1') ||
    String(cp.employeeId) === String(user?.id) ||
    cp.employeeName === user?.name
  )

  // Build career history from employee record's history or fallback
  const internalHistory = empRecord?.history?.length
    ? empRecord.history.map((h, i, arr) => ({
        period: i < arr.length - 1
          ? `${h.effectiveDate?.slice(0,4)} – ${arr[i+1].effectiveDate?.slice(0,4)}`
          : `${h.effectiveDate?.slice(0,4)} – Sekarang`,
        position: h.positionId ? `Position #${h.positionId}` : 'Staff',
        company: 'PT Dexa Group',
        type: 'internal',
      }))
    : CAREER_HISTORY

  // Derived employee info from record
  const empPosition = empRecord?.position || user?.position || 'Staff'
  const empDept = empRecord?.dept || user?.dept || '—'
  const empGrade = empRecord?.gradeId || '—'

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'career', label: 'Riwayat Karir' },
    { key: 'performance', label: 'Riwayat Performa' },
    { key: 'talent', label: 'Talent Box' },
    { key: 'aspiration', label: 'Career Aspiration' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-3xl font-bold shrink-0">
            {(user?.name || 'E').charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Employee Name'}</h1>
            <p className="text-gray-500 mt-0.5">HR Supervisor · PC 54</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {latestBox && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${BOX_COLOR[latestBox.boxLabel] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {latestBox.boxLabel || 'Talent Box —'} ({latestBox.year})
                </span>
              )}
              {!latestBox && PERF_HISTORY[2] && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${BOX_COLOR[PERF_HISTORY[2].talentBox]}`}>
                  {PERF_HISTORY[2].talentBox} (2025)
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200">
                Tahun di Posisi: 3 Tahun
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-red-600">91</div>
            <div className="text-xs text-gray-400">Performance Score 2025</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Informasi Saat Ini</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Posisi', empPosition],
                  ['Departemen', empDept],
                  ['Atasan Langsung', empRecord?.managerId ? `Manager #${empRecord.managerId}` : '—'],
                  ['PC Level', empGrade],
                  ['Join Date', empRecord?.joinDate || '—'],
                  ['Status', empRecord?.employmentType || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-gray-400 text-xs">{k}</div>
                    <div className="font-medium text-gray-800">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Performance Terkini</h3>
              <div className="space-y-2">
                {PERF_HISTORY.map(h => (
                  <div key={h.year} className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-10">{h.year}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${h.score}%` }} />
                    </div>
                    <span className="font-bold text-gray-800 w-8 text-right">{h.score}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 w-6 text-center">{h.grade}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Talent Box History</h3>
              <div className="space-y-2">
                {myBoxes.length > 0
                  ? [...myBoxes].sort((a,b) => b.year - a.year).map(b => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{b.year}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${BOX_COLOR[b.boxLabel] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                        {b.boxLabel}
                      </span>
                    </div>
                  ))
                  : PERF_HISTORY.map(h => (
                    <div key={h.year} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{h.year}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${BOX_COLOR[h.talentBox]}`}>
                        {h.talentBox}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-2">IDP Aktif</h3>
              {latestIdp ? (
                <div>
                  <div className="text-sm text-gray-600">{latestIdp.year}</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">{latestIdp.items?.length || 0} item kompetensi</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                    latestIdp.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    latestIdp.status === 'Submitted' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                  }`}>{latestIdp.status}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Belum ada IDP</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'career' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Riwayat Internal</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {internalHistory.map((c, i) => (
                  <div key={i} className="flex gap-4 items-start pl-10 relative">
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-800">{c.position}</div>
                      <div className="text-sm text-gray-500">{c.company}</div>
                      <div className="text-xs text-gray-400 mt-1">{c.period}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Tahun di Job Level</h3>
            <div className="space-y-3">
              {JOB_LEVEL_HISTORY.map((j, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32">{j.level}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className="bg-red-400 h-3 rounded-full" style={{ width: `${Math.min(j.years / 10 * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-16 text-right">{j.years} tahun</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Riwayat Performance Score</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 text-gray-500 font-medium">Tahun</th>
                <th className="pb-2 text-gray-500 font-medium">Score</th>
                <th className="pb-2 text-gray-500 font-medium">Grade</th>
                <th className="pb-2 text-gray-500 font-medium">Talent Box</th>
              </tr>
            </thead>
            <tbody>
              {PERF_HISTORY.map(h => (
                <tr key={h.year} className="border-b border-gray-50">
                  <td className="py-3 font-medium">{h.year}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${h.score}%` }} />
                      </div>
                      <span className="font-bold text-gray-800">{h.score}</span>
                    </div>
                  </td>
                  <td className="py-3"><span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-bold">{h.grade}</span></td>
                  <td className="py-3"><span className={`text-xs px-2 py-1 rounded-full border ${BOX_COLOR[h.talentBox]}`}>{h.talentBox}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'talent' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">9-Box Talent Matrix</h3>
          <p className="text-sm text-gray-500 mb-5">Posisi kamu dalam 9-Box Talent Matrix berdasarkan performance dan kompetensi</p>
          <div className="grid grid-cols-3 gap-2 max-w-lg">
            {[
              ['Rough Diamond','High Potential','Star'],
              ['Potential Gem','Core Employee','High Performer'],
              ['Underperformer','Consistent','Solid Performer'],
            ].map((row, ri) => row.map((cell, ci) => {
              const current = cell === 'Star'
              return (
                <div key={`${ri}-${ci}`}
                  className={`p-3 rounded-lg border-2 text-center text-xs font-medium ${
                    current ? 'border-red-500 bg-red-50 text-red-800 shadow-md' : `${BOX_COLOR[cell] || 'bg-gray-50 text-gray-600 border-gray-200'}`
                  }`}>
                  {cell}
                  {current && <div className="text-red-500 text-lg mt-1"><Icon e='★' size={15} /></div>}
                </div>
              )
            }))}
          </div>
          <div className="flex gap-4 text-xs text-gray-500 mt-3">
            <span><Icon e='←' size={14} className='inline align-[-2px]' /> Low Performance · High Performance →</span>
          </div>
        </div>
      )}

      {activeTab === 'talent' && myCareerPath && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Career Path Saya</h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-800 whitespace-nowrap">
              {myCareerPath.currentPosition}
            </div>
            {myCareerPath.steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 whitespace-nowrap">
                  {step.targetPosition}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'aspiration' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Career Aspiration</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Aspirasi Posisi</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" defaultValue="HR Manager" />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Timeline</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" defaultValue="2-3 tahun" />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Catatan / Motivasi</label>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-24" defaultValue="Saya ingin berkontribusi lebih besar dalam pengembangan SDM perusahaan." />
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
              Simpan Aspirasi
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-6 text-center">
        Data performance diambil dari modul Evaluasi. Data kompetensi diambil dari Competency Assessment.
      </p>
    </div>
  )
}
