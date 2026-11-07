'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useTalentStore } from '@/store/talentStore'

const STATUS_COLOR = {
  'In Progress': 'bg-yellow-100 text-yellow-700',
  'Planned':     'bg-gray-100 text-gray-600',
  'Completed':   'bg-green-100 text-green-700',
}

export default function MSSCareerPathPage() {
  const { careerPaths } = useTalentStore()
  const [expandedId, setExpandedId] = useState(null)
  const [comments, setComments] = useState({}) // { [stepId]: string }

  const toggleExpand = (id) => setExpandedId(p => p === id ? null : id)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Career Path Tim Saya</h1>
        <p className="text-sm text-gray-500 mt-1">
          Menampilkan career path yang relevan dengan tim Anda
        </p>
      </div>

      {careerPaths.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-3"><Icon e='🗺️' size={15} /></div>
          <p className="text-gray-500 font-medium">Belum ada Career Path yang tersedia</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nama Karyawan', 'Posisi Saat Ini', 'Jumlah Step', 'Progress', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {careerPaths.map(cp => {
                const doneSteps = cp.steps.filter(s => s.status === 'Completed').length
                const pct = cp.steps.length > 0 ? Math.round((doneSteps / cp.steps.length) * 100) : 0
                const isExpanded = expandedId === cp.id
                return (
                  <>
                    <tr key={cp.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(cp.id)}>
                      <td className="px-4 py-3 font-medium text-gray-800">{cp.employeeName}</td>
                      <td className="px-4 py-3 text-gray-600">{cp.currentPosition}</td>
                      <td className="px-4 py-3 text-gray-600">{cp.steps.length} step</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-24">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', color: '#9ca3af' }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${cp.id}-detail`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={5} className="px-6 py-4">
                          {/* Career path visualization */}
                          <div className="flex items-start gap-2 overflow-x-auto pb-3 mb-4">
                            <div className="flex flex-col items-center shrink-0">
                              <div className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold whitespace-nowrap">
                                {cp.currentPosition}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">PC {cp.currentPCLevel}</div>
                            </div>
                            {cp.steps.map((step, i) => (
                              <div key={step.id} className="flex items-start gap-2 shrink-0">
                                <div className="flex flex-col items-center pt-2">
                                  <svg width="20" height="16" viewBox="0 0 24 16" fill="none" stroke="#d1d5db" strokeWidth="2">
                                    <line x1="0" y1="8" x2="18" y2="8"/>
                                    <polyline points="12 2 18 8 12 14"/>
                                  </svg>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap border-2 ${
                                    step.status === 'Completed' ? 'border-green-400 bg-green-50 text-green-800' :
                                    step.status === 'In Progress' ? 'border-yellow-400 bg-yellow-50 text-yellow-800' :
                                    'border-gray-200 bg-white text-gray-700'
                                  }`}>
                                    {step.targetPosition}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">PC {step.targetPCLevel} · {step.estimatedYears}yr</div>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full mt-1 ${STATUS_COLOR[step.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {step.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Step details & manager comments */}
                          <div className="space-y-3">
                            {cp.steps.map(step => (
                              <div key={step.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div>
                                    <div className="font-medium text-gray-800 text-sm">{step.targetPosition}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{step.requirements}</div>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[step.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {step.status}
                                  </span>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Catatan Manager (lokal):</label>
                                  <textarea
                                    value={comments[step.id] || ''}
                                    onChange={e => setComments(c => ({ ...c, [step.id]: e.target.value }))}
                                    placeholder="Tambahkan catatan atau arahan untuk step ini..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none h-14 focus:outline-none focus:border-red-300"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
