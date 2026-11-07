'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useStructureStore }       from '@/store/structureStore'
import { usePositionProfileStore } from '@/store/positionProfileStore'
import { useT }                    from '@/store/languageStore'

const GRAD = { background: 'linear-gradient(135deg,#052B52,#039299)' }

const SECTIONS = [
  { key: 'coreCompetency',      label: 'A. Core Competency',      note: '' },
  { key: 'strategicLeadership', label: 'B. Strategic Leadership',  note: '*hanya diisi PC >= 53' },
  { key: 'technicalCompetency', label: 'C. Technical Competency',  note: '*Target TC sesuai level posisi' },
]

// ── Inline-editable competency table ──────────────────────────────────────────
function CompetencyTable({ sectionKey, label, note, items, onChange, onAdd, onDelete, canEdit }) {
  return (
    <div className='mb-6'>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-bold text-gray-700'>{label}</span>
          {note && <span className='text-[10px] text-gray-400 italic'>{note}</span>}
        </div>
        {canEdit && (
          <button
            onClick={onAdd}
            className='flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition'
            style={GRAD}
          >
            + Tambah Baris
          </button>
        )}
      </div>

      <div className='overflow-x-auto rounded-lg ring-1 ring-gray-100'>
        <table className='w-full text-xs'>
          <thead>
            <tr style={GRAD}>
              <th className='px-3 py-2 text-left text-white font-semibold w-10'>No</th>
              <th className='px-3 py-2 text-left text-white font-semibold w-48'>Nama Kompetensi</th>
              <th className='px-3 py-2 text-left text-white font-semibold'>Key Behaviors / Deskripsi</th>
              {canEdit && <th className='px-3 py-2 w-10'></th>}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {items.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3}
                  className='px-4 py-6 text-center text-gray-400 italic'>
                  Belum ada item — klik "+ Tambah Baris" untuk mulai mengisi.
                </td>
              </tr>
            ) : items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                <td className='px-3 py-1.5 text-center text-gray-500 font-mono'>{item.no}</td>
                <td className='px-2 py-1.5'>
                  {canEdit ? (
                    <input
                      value={item.aspect}
                      onChange={e => onChange(item.id, 'aspect', e.target.value)}
                      placeholder='Nama kompetensi...'
                      className='w-full px-2 py-1 border border-gray-200 rounded focus:border-red-400 outline-none text-xs bg-white'
                    />
                  ) : (
                    <span className='font-medium text-gray-800'>{item.aspect || '—'}</span>
                  )}
                </td>
                <td className='px-2 py-1.5'>
                  {canEdit ? (
                    <textarea
                      value={item.keyBehaviors}
                      onChange={e => onChange(item.id, 'keyBehaviors', e.target.value)}
                      placeholder='Deskripsi key behaviors...'
                      rows={2}
                      className='w-full px-2 py-1 border border-gray-200 rounded focus:border-red-400 outline-none text-xs bg-white resize-none'
                    />
                  ) : (
                    <span className='text-gray-600 leading-relaxed'>{item.keyBehaviors || '—'}</span>
                  )}
                </td>
                {canEdit && (
                  <td className='px-2 py-1.5 text-center'>
                    <button
                      onClick={() => onDelete(item.id)}
                      className='w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-xs font-bold mx-auto'
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PositionProfilePage() {
  const t = useT()
  const { positions, departments } = useStructureStore()
  const {
    profiles,
    seed,
    ensureProfile,
    addItem,
    updateItem,
    deleteItem,
    saveSection,
  } = usePositionProfileStore()

  useEffect(() => { seed() }, []) // eslint-disable-line

  const [search,     setSearch    ] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [saved,      setSaved     ] = useState(false)

  // Local working copies of the 3 sections
  const [localSections, setLocalSections] = useState({
    coreCompetency:      [],
    strategicLeadership: [],
    technicalCompetency: [],
  })

  // Filtered positions list
  const filteredPositions = positions.filter(p => {
    const q = search.toLowerCase()
    return !q ||
      String(p.id).includes(q) ||
      p.name.toLowerCase().includes(q)
  })

  // Selected position & its profile
  const selectedPosition = positions.find(p => p.id === selectedId) ?? null
  const storedProfile    = selectedPosition
    ? profiles.find(pr => pr.positionId === selectedPosition.id) ?? ensureProfile(selectedPosition)
    : null

  // Sync local state when position changes
  useEffect(() => {
    if (storedProfile) {
      setLocalSections({
        coreCompetency:      JSON.parse(JSON.stringify(storedProfile.coreCompetency      ?? [])),
        strategicLeadership: JSON.parse(JSON.stringify(storedProfile.strategicLeadership ?? [])),
        technicalCompetency: JSON.parse(JSON.stringify(storedProfile.technicalCompetency ?? [])),
      })
    }
  }, [selectedId])

  const handleItemChange = (section, itemId, field, value) => {
    setLocalSections(s => ({
      ...s,
      [section]: s[section].map(i => i.id === itemId ? { ...i, [field]: value } : i)
    }))
  }

  const handleAddItem = (section) => {
    // Add to local state
    const existing = localSections[section]
    const newItem = {
      id: Date.now() + Math.random(),
      no: existing.length + 1,
      aspect: '',
      keyBehaviors: '',
    }
    setLocalSections(s => ({ ...s, [section]: [...s[section], newItem] }))
  }

  const handleDeleteItem = (section, itemId) => {
    setLocalSections(s => ({
      ...s,
      [section]: s[section]
        .filter(i => i.id !== itemId)
        .map((it, idx) => ({ ...it, no: idx + 1 }))
    }))
  }

  const handleSave = () => {
    if (!selectedPosition) return
    // Persist all 3 sections at once
    SECTIONS.forEach(({ key }) => {
      saveSection(selectedPosition.id, key, localSections[key])
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSelectPosition = (posId) => {
    setSelectedId(posId)
    setSaved(false)
  }

  // Department lookup for position display
  const deptOf = (pos) => departments?.find(d => d.id === pos.departmentId)?.name ?? '—'

  return (
    <div className='flex h-[calc(100vh-5rem)] bg-gray-100 gap-4 p-0'>

      {/* ── LEFT: Position List ──────────────────────────────────────── */}
      <aside className='w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden flex flex-col'>
        <div className='px-4 py-3 border-b border-gray-200 flex-shrink-0' style={GRAD}>
          <h2 className='text-sm font-bold text-white'>Position Profile</h2>
          <p className='text-[11px] text-red-200 mt-0.5'>{positions.length} posisi tersedia</p>
        </div>

        {/* Search */}
        <div className='p-3 border-b border-gray-100 flex-shrink-0'>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Cari ID atau nama posisi...'
            className='w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-red-400'
          />
        </div>

        {/* List */}
        <div className='flex-1 overflow-y-auto'>
          {filteredPositions.length === 0 ? (
            <div className='px-4 py-8 text-center text-xs text-gray-400'>
              Tidak ada posisi yang cocok.
            </div>
          ) : filteredPositions.map(pos => {
            const profile   = profiles.find(pr => pr.positionId === pos.id)
            const itemCount = profile
              ? (profile.coreCompetency?.length ?? 0) +
                (profile.strategicLeadership?.length ?? 0) +
                (profile.technicalCompetency?.length ?? 0)
              : 0
            const active = selectedId === pos.id

            return (
              <button
                key={pos.id}
                onClick={() => handleSelectPosition(pos.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors
                  ${active
                    ? 'bg-red-50 border-l-4 border-l-red-500'
                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 min-w-0'>
                    <p className={`text-xs font-semibold truncate ${active ? 'text-red-800' : 'text-gray-800'}`}>
                      {pos.name}
                    </p>
                    <p className='text-[10px] text-gray-400 mt-0.5 font-mono'>ID: {pos.id}</p>
                    <p className='text-[10px] text-gray-400'>{deptOf(pos)}</p>
                  </div>
                  {itemCount > 0 && (
                    <span className='flex-shrink-0 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold'>
                      {itemCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── RIGHT: Configuration Panel ───────────────────────────────── */}
      <main className='flex-1 overflow-y-auto'>
        {!selectedPosition ? (
          <div className='h-full flex items-center justify-center'>
            <div className='text-center'>
              <div className='text-5xl mb-3 opacity-30'><Icon e='📌' size={15} /></div>
              <p className='text-gray-500 text-sm'>{t('Pilih posisi dari daftar untuk mengonfigurasi kompetensi.', 'Select a position from the list to configure competencies.')}</p>
            </div>
          </div>
        ) : (
          <div className='pb-8'>

            {/* Header */}
            <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 mb-4 overflow-hidden'>
              <div className='px-5 py-4 flex items-center justify-between' style={GRAD}>
                <div>
                  <h1 className='text-base font-bold text-white'>{selectedPosition.name}</h1>
                  <p className='text-xs text-red-200 mt-0.5 font-mono'>Position ID: {selectedPosition.id}</p>
                </div>
                <button
                  onClick={handleSave}
                  className='px-5 py-2 bg-white text-red-800 text-xs font-bold rounded-lg hover:bg-red-50 transition shadow'
                ><Icon e='💾' size={14} className='inline align-[-2px]' /> Simpan Profile
                </button>
              </div>

              {saved && (
                <div className='px-5 py-2.5 bg-green-50 border-t border-green-200 text-green-700 text-xs font-medium'><Icon e='✅' size={14} className='inline align-[-2px]' /> Profile kompetensi berhasil disimpan.
                </div>
              )}

              <div className='px-5 py-3 bg-blue-50 border-t border-blue-100'>
                <p className='text-xs text-blue-700'><Icon e='💡' size={14} className='inline align-[-2px]' /> Kompetensi yang dikonfigurasi di sini akan otomatis muncul di Form Evaluasi untuk karyawan dengan posisi ini.
                  Tiap posisi dapat memiliki konfigurasi yang berbeda.
                </p>
              </div>
            </div>

            {/* Competency Configuration */}
            <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
              <div className='flex items-center gap-2 mb-5'>
                <div className='w-1 h-5 rounded-full' style={GRAD} />
                <h2 className='text-sm font-bold text-gray-800'>
                  {t('Konfigurasi Kompetensi', 'Competency Configuration')}
                </h2>
              </div>

              {SECTIONS.map(({ key, label, note }) => (
                <CompetencyTable
                  key={key}
                  sectionKey={key}
                  label={label}
                  note={note}
                  items={localSections[key]}
                  canEdit={true}
                  onChange={(itemId, field, value) => handleItemChange(key, itemId, field, value)}
                  onAdd={() => handleAddItem(key)}
                  onDelete={(itemId) => handleDeleteItem(key, itemId)}
                />
              ))}

              <div className='flex justify-end pt-2 border-t border-gray-100'>
                <button
                  onClick={handleSave}
                  className='px-6 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition shadow'
                  style={GRAD}
                >
                  <Icon e='💾' size={14} className='inline align-[-2px]' /> {t('Simpan Profile', 'Save Profile')}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

    </div>
  )
}
