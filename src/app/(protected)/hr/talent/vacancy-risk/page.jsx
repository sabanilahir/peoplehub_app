'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useAuthStore } from '@/store/authStore'
import { useKeyPositionStore, isKeyPosition } from '@/store/keyPositionStore'
import {
  useVacancyRiskStore, TERM_OPTIONS, HEALTH_OPTIONS,
  RETIREMENT_HINT, CONTRACT_HINT, MOBILITY_HINT,
  readinessTerm, riskLevelOf,
} from '@/store/vacancyRiskStore'
import {
  PageHeader, SectionCard, DataTable, Tr, Td,
  StatusBadge, ActionButton, EmptyState, Select, SearchBar, FormField,
} from '@/components/ui'

const termLabel   = (v) => TERM_OPTIONS.find(t=>t.value===v)?.label || '—'
const healthLabel = (v) => HEALTH_OPTIONS.find(h=>h.value===v)?.label || '—'
const RISK_TONE   = { High:'danger', Medium:'warning', Low:'success' }
const TERM_TONE   = { Short:'danger', Medium:'warning', Long:'success' }

export default function VacancyRiskPage() {
  const { positions, departments } = useStructureStore()
  const employees = useEmployeeStore(s => s.employees)
  const currentUser = useAuthStore(s => s.currentUser)
  const keyAssessments = useKeyPositionStore(s => s.assessments)
  const { assessments, saveAssessment, clearAssessment } = useVacancyRiskStore()

  const [query,       setQuery]       = useState('')
  const [filterRisk,  setFilterRisk]  = useState('')
  const [showCriteria,setShowCriteria]= useState(false)
  const [modal,       setModal]       = useState(null)   // { position, incumbent }
  const [form,        setForm]        = useState({ retirement:'', contract:'', mobility:'', health:'', notes:'' })
  const [confirm,     setConfirm]     = useState(null)
  const [msg,         setMsg]         = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }
  const deptName = (id) => departments.find(d=>d.id===id)?.name || '—'
  const incumbentOf = (posId) => employees.find(e => e.positionId === posId && e.status === 'Active') || null

  // Hanya Key Position (yang lolos seluruh kriteria) yang perlu dinilai risikonya.
  const keyPositions = useMemo(() =>
    positions
      .filter(p => isKeyPosition(keyAssessments[p.id]))
      .map(p => ({ ...p, incumbent: incumbentOf(p.id) })),
    [positions, keyAssessments, employees])

  const stats = useMemo(() => {
    let assessed=0, high=0, ready=0
    keyPositions.forEach(p => {
      const a = assessments[p.id]
      if (a) { assessed++; if (riskLevelOf(a)==='High') high++; if (readinessTerm(a)==='Short') ready++ }
    })
    return { total: keyPositions.length, assessed, high, ready, pending: keyPositions.length-assessed }
  }, [keyPositions, assessments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return keyPositions.filter(p => {
      const a = assessments[p.id]
      if (filterRisk) {
        if (filterRisk==='pending' && a) return false
        if (filterRisk!=='pending' && riskLevelOf(a)!==filterRisk) return false
      }
      if (q) {
        const hay = `${p.code} ${p.name} ${deptName(p.departmentId)} ${p.incumbent?.name||''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [keyPositions, assessments, query, filterRisk])

  // ── Modal ────────────────────────────────────────────────────────────────
  const openAssess = (p) => {
    const a = assessments[p.id]
    setForm(a
      ? { retirement:a.retirement, contract:a.contract, mobility:a.mobility, health:a.health, notes:a.notes||'' }
      : { retirement:'', contract:'', mobility:'', health:'', notes:'' })
    setModal({ position:p, incumbent:p.incumbent })
  }
  const closeModal = () => setModal(null)

  const handleSave = () => {
    if (!form.retirement) return flash('Retirement Risk (main variable) wajib diisi.', 'error')
    saveAssessment(modal.position.id, { ...form, assessedBy: currentUser?.name || 'HR' })
    const term = form.retirement
    closeModal()
    setConfirm({ name: modal.position.name, term })
  }

  const previewRisk = riskLevelOf(form.retirement ? form : null)

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {msg.type==='error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        title='Vacancy Risk Assessment'
        subtitle='Penilaian risiko kekosongan incumbent pada Key Position — dasar penetapan Vacancy Urgency (kebutuhan successor).'
        actions={
          <ActionButton variant='secondary' size='sm' onClick={()=>setShowCriteria(true)}>
            Lihat kriteria
          </ActionButton>
        }
      />

      {/* KPI strip */}
      <div className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x'>
          {[
            { label:'Key Position',      value:stats.total,    sub:'perlu dinilai' },
            { label:'Sudah Dinilai',     value:stats.assessed, sub:`${stats.pending} belum` },
            { label:'Risiko Tinggi',     value:stats.high,     sub:'high risk', accent:true },
            { label:'Successor Mendesak',value:stats.ready,    sub:'short term retirement' },
          ].map((m,i)=>(
            <div key={i} className='px-5 py-4'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400'>{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent?'text-red-700':'text-gray-900'}`}>{m.value}</div>
              <div className='mt-0.5 text-xs text-gray-400'>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard title='Daftar Key Position & Incumbent' bodyClass='p-0'>
        <div className='flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between'>
          <SearchBar value={query} onChange={setQuery}
            placeholder='Cari posisi, kode, atau incumbent…' className='w-full lg:max-w-sm' />
          <Select value={filterRisk} onChange={e=>setFilterRisk(e.target.value)} className='py-2 text-xs lg:w-52'>
            <option value=''>Semua Tingkat Risiko</option>
            <option value='High'>High</option>
            <option value='Medium'>Medium</option>
            <option value='Low'>Low</option>
            <option value='pending'>Belum Dinilai</option>
          </Select>
        </div>

        {keyPositions.length === 0 ? (
          <div className='p-6'>
            <EmptyState title='Belum ada Key Position.'
              description='Tetapkan Key Position terlebih dahulu di menu Key Position Assessment sebelum menilai risiko vacancy.' />
          </div>
        ) : filtered.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada data yang cocok dengan filter.' /></div>
        ) : (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[
              'Posisi','Incumbent','Retirement (Main)','Contract','Mobility','Health',
              'Vacancy Urgency','Risiko',{label:'Aksi',align:'right'},
            ]}
          >
            {filtered.map(p => {
              const a = assessments[p.id]
              const term = readinessTerm(a)
              const risk = riskLevelOf(a)
              return (
                <Tr key={p.id}>
                  <Td>
                    <div className='font-medium text-gray-800'>{p.name}</div>
                    <div className='text-xs text-gray-400'>{p.code} · {deptName(p.departmentId)}</div>
                  </Td>
                  <Td className='text-xs text-gray-600'>{p.incumbent?.name || <span className='text-gray-300'>— kosong —</span>}</Td>
                  <Td className='text-xs'>{a ? <StatusBadge tone={TERM_TONE[a.retirement]}>{termLabel(a.retirement)}</StatusBadge> : <span className='text-gray-300'>–</span>}</Td>
                  <Td className='text-xs text-gray-600'>{a?.contract ? termLabel(a.contract) : <span className='text-gray-300'>–</span>}</Td>
                  <Td className='text-xs text-gray-600'>{a?.mobility ? termLabel(a.mobility) : <span className='text-gray-300'>–</span>}</Td>
                  <Td className='text-xs text-gray-600'>{a?.health ? healthLabel(a.health) : <span className='text-gray-300'>–</span>}</Td>
                  <Td>{term ? <StatusBadge tone={TERM_TONE[term]}>{termLabel(term)}</StatusBadge> : <StatusBadge tone='neutral'>Belum</StatusBadge>}</Td>
                  <Td>{risk ? <StatusBadge tone={RISK_TONE[risk]}>{risk}</StatusBadge> : <StatusBadge tone='warning'>Belum Dinilai</StatusBadge>}</Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-1.5'>
                      <ActionButton size='sm' variant='secondary' onClick={()=>openAssess(p)}>{a?'Edit':'Nilai'}</ActionButton>
                      {a && <ActionButton size='sm' variant='ghost' onClick={()=>{clearAssessment(p.id);flash(`Penilaian ${p.name} direset.`)}}>Reset</ActionButton>}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>

      {/* Confirmation popup */}
      {confirm && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4' onClick={()=>setConfirm(null)}>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50'>
              <svg width='30' height='30' viewBox='0 0 24 24' fill='none' stroke='#059669' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12'/></svg>
            </div>
            <h2 className='mt-4 text-base font-bold text-gray-800'>Penilaian Tersimpan</h2>
            <p className='mt-1.5 text-sm text-gray-500'>
              Risiko vacancy untuk <span className='font-semibold text-gray-700'>{confirm.name}</span> berhasil disimpan.
            </p>
            <div className='mt-4 rounded-lg bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-100'>
              Vacancy Urgency: <span className='text-red-700'>{termLabel(confirm.term)}</span>
            </div>
            <button onClick={()=>setConfirm(null)}
              className='mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
              style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>Selesai</button>
          </div>
        </div>
      )}

      {/* Criteria modal */}
      {showCriteria && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={()=>setShowCriteria(false)}>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4'>
              <h2 className='text-base font-bold text-gray-800'>Kriteria Vacancy Risk & Mitigation</h2>
              <button onClick={()=>setShowCriteria(false)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-5 px-6 py-5 text-sm'>
              <div>
                <div className='mb-1 font-bold text-gray-800'>Vacancy Risk <span className='font-normal text-gray-400'><Icon e='→' size={14} className='inline align-[-2px]' /> Vacancy Urgency (kapan posisi berpotensi kosong)</span></div>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li><b>Retirement Risk</b> (Incumbent Age, <i>main variable</i>) — {RETIREMENT_HINT.Short} / {RETIREMENT_HINT.Medium} / {RETIREMENT_HINT.Long}.</li>
                </ul>
              </div>
              <div>
                <div className='mb-1 font-bold text-gray-800'>Vacancy Mitigation <span className='font-normal text-gray-400'><Icon e='→' size={14} className='inline align-[-2px]' /> mitigasi persiapan suksesor</span></div>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li><b>Contract Period</b> (akhir kontrak) — {CONTRACT_HINT.Short} / {CONTRACT_HINT.Medium} / {CONTRACT_HINT.Long}.</li>
                  <li><b>Mobility Risk</b> (Career/Promotion Plan) — {MOBILITY_HINT.Short} / {MOBILITY_HINT.Medium} / {MOBILITY_HINT.Long}.</li>
                  <li><b>Health Risk</b> (MCU) — Sakit / Sehat dengan catatan / Sehat.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment modal */}
      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeModal}>
          <div className='max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='flex items-start justify-between border-b border-gray-100 px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>Penilaian Vacancy Risk</h2>
                <p className='mt-0.5 text-xs text-gray-500'>
                  <span className='font-mono'>{modal.position.code}</span> · {modal.position.name}
                  {modal.incumbent ? <> · Incumbent: <b>{modal.incumbent.name}</b></> : <> · <span className='text-gray-400'>tanpa incumbent</span></>}
                </p>
              </div>
              <button onClick={closeModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-4 px-6 py-5'>
              <div className='rounded-lg bg-red-50/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-700'>Vacancy Risk (Main)</div>
              <FormField label='Retirement Risk — Incumbent Age' required hint={form.retirement ? RETIREMENT_HINT[form.retirement] : 'Estimasi waktu menuju masa pensiun'}>
                <Select value={form.retirement} onChange={e=>setForm(f=>({...f,retirement:e.target.value}))}>
                  <option value=''>— Pilih —</option>
                  {TERM_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label} ({t.band})</option>)}
                </Select>
              </FormField>

              <div className='rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600'>Vacancy Mitigation (Complementary)</div>
              <FormField label='Contract Period — akhir kontrak' hint={form.contract ? CONTRACT_HINT[form.contract] : undefined}>
                <Select value={form.contract} onChange={e=>setForm(f=>({...f,contract:e.target.value}))}>
                  <option value=''>— Pilih —</option>
                  {TERM_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label} ({t.band})</option>)}
                </Select>
              </FormField>
              <FormField label='Mobility Risk — Career/Promotion Plan' hint={form.mobility ? MOBILITY_HINT[form.mobility] : undefined}>
                <Select value={form.mobility} onChange={e=>setForm(f=>({...f,mobility:e.target.value}))}>
                  <option value=''>— Pilih —</option>
                  {TERM_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label} ({t.band})</option>)}
                </Select>
              </FormField>
              <FormField label='Health Risk — MCU'>
                <Select value={form.health} onChange={e=>setForm(f=>({...f,health:e.target.value}))}>
                  <option value=''>— Pilih —</option>
                  {HEALTH_OPTIONS.map(h=><option key={h.value} value={h.value}>{h.label}</option>)}
                </Select>
              </FormField>
              <FormField label='Catatan'>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2}
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100'
                  placeholder='Catatan tambahan (opsional)…' />
              </FormField>

              {previewRisk && (
                <div className='flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200'>
                  <span className='font-semibold text-gray-600'>Estimasi Level Risiko</span>
                  <StatusBadge tone={RISK_TONE[previewRisk]}>{previewRisk}</StatusBadge>
                </div>
              )}
            </div>

            <div className='flex gap-3 px-6 pb-5'>
              <button onClick={handleSave} disabled={!form.retirement}
                className='flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50'
                style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>Simpan Penilaian</button>
              <button onClick={closeModal}
                className='flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
