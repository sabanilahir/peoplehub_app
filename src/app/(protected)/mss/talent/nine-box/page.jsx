'use client'
import Icon from '@/components/ui/Icon'
import { useAuthStore } from '@/store/authStore'
import { useTalentStore } from '@/store/talentStore'
import { useEmployeeStore } from '@/store/employeeStore'

const BOX_CONFIG = {
  '3-3': { label: 'Star',              color: 'bg-green-500',  text: 'text-white'      },
  '3-2': { label: 'High Potential',    color: 'bg-blue-400',   text: 'text-white'      },
  '3-1': { label: 'Latent Talent',     color: 'bg-teal-400',   text: 'text-white'      },
  '2-3': { label: 'High Performer',    color: 'bg-blue-500',   text: 'text-white'      },
  '2-2': { label: 'Core Player',       color: 'bg-yellow-400', text: 'text-gray-800'   },
  '2-1': { label: 'Solid Contributor', color: 'bg-amber-300',  text: 'text-gray-800'   },
  '1-3': { label: 'Inconsistent',      color: 'bg-orange-400', text: 'text-white'      },
  '1-2': { label: 'Under Achiever',    color: 'bg-red-400',    text: 'text-white'      },
  '1-1': { label: 'Underperformer',    color: 'bg-red-600',    text: 'text-white'      },
}

const BOX_LABEL_MAP = {
  'Star': '3-3', 'High Potential': '3-2', 'Latent Talent': '3-1',
  'High Performer': '2-3', 'Core Player': '2-2', 'Solid Contributor': '2-1',
  'Inconsistent': '1-3', 'Under Achiever': '1-2', 'Underperformer': '1-1',
}

export default function MSSNineBoxPage() {
  const { currentUser } = useAuthStore()
  const { talentBoxes } = useTalentStore()
  const { employees } = useEmployeeStore()

  // Find team members (employees whose managerId = current user's id)
  const teamMembers = employees.filter(
    e => e.managerId === currentUser?.id || e.supervisorId === currentUser?.id
  )
  const teamIds = new Set(teamMembers.map(e => String(e.id)))
  const teamNames = new Set(teamMembers.map(e => e.name))

  // Filter talentBoxes to only team members
  const teamBoxes = talentBoxes.filter(
    b => teamIds.has(String(b.employeeId)) || teamNames.has(b.employeeName)
  )

  // For each cell, collect team members
  const cellMap = {}
  teamBoxes.forEach(b => {
    const key = b.boxRow && b.boxCol ? `${b.boxRow}-${b.boxCol}` : BOX_LABEL_MAP[b.boxLabel]
    if (!key) return
    if (!cellMap[key]) cellMap[key] = []
    cellMap[key].push(b)
  })

  // Rows: 3 (top) to 1 (bottom), cols: 1 (left) to 3 (right)
  const grid = [3, 2, 1].map(row =>
    [1, 2, 3].map(col => ({ key: `${row}-${col}`, config: BOX_CONFIG[`${row}-${col}`], members: cellMap[`${row}-${col}`] || [] }))
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">9-Box Matrix Tim Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Posisi anggota tim Anda dalam 9-Box Talent Matrix</p>
      </div>

      {teamBoxes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-3"><Icon e='📊' size={15} /></div>
          <p className="text-gray-500 font-medium">Belum ada anggota tim dalam Talent Matrix</p>
          <p className="text-sm text-gray-400 mt-1">Data 9-Box akan muncul setelah HR melakukan assessment</p>
        </div>
      ) : (
        <>
          {/* 9-Box Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex gap-1 mb-2">
              <div className="w-16 shrink-0" />
              <div className="flex-1 grid grid-cols-3 gap-1">
                {['Low Potential','Med Potential','High Potential'].map(h => (
                  <div key={h} className="text-center text-xs text-gray-400 font-medium py-1">{h}</div>
                ))}
              </div>
            </div>
            <div className="flex gap-1">
              <div className="w-16 shrink-0 flex flex-col gap-1">
                {['High','Med','Low'].map(l => (
                  <div key={l} className="flex-1 flex items-center justify-end pr-2 text-xs text-gray-400 font-medium" style={{ minHeight: 90 }}>{l} Perf</div>
                ))}
              </div>
              <div className="flex-1 grid grid-rows-3 gap-1">
                {grid.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-1">
                    {row.map(cell => (
                      <div key={cell.key}
                        className={`rounded-lg p-2 min-h-[90px] ${cell.config.color} ${cell.config.text}`}>
                        <div className="text-xs font-bold mb-2">{cell.config.label}</div>
                        <div className="space-y-0.5">
                          {cell.members.map((m, i) => (
                            <div key={i} className="text-xs bg-white/20 rounded px-1.5 py-0.5 truncate">
                              {m.employeeName}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Members Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Daftar Anggota Tim dalam Talent Matrix</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nama', 'Talent Box', 'Tahun', 'Performance', 'Kompetensi', 'Catatan'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamBoxes.map(b => {
                  const key = b.boxRow && b.boxCol ? `${b.boxRow}-${b.boxCol}` : BOX_LABEL_MAP[b.boxLabel]
                  const cfg = BOX_CONFIG[key] || {}
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{b.employeeName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.color || 'bg-gray-100'} ${cfg.text || 'text-gray-700'}`}>
                          {b.boxLabel || cfg.label || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.year}</td>
                      <td className="px-4 py-3 text-gray-600">{b.performanceScore ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{b.competencyScore ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{b.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
