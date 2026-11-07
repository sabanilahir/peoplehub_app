'use client'
import { useState, useMemo, useEffect } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useAuthStore } from '@/store/authStore'
import {
  useKeyPositionStore, KEY_POSITION_QUESTIONS, isKeyPosition,
} from '@/store/keyPositionStore'
import {
  PageHeader, SectionCard, DataTable, Tr, Td,
  StatusBadge, ActionButton, EmptyState, Select, SearchBar,
} from '@/components/ui'

const PAGE_SIZES = [15, 25, 50, 100]

export default function KeyPositionPage() {
  const { positions, departments, grades } = useStructureStore()
  const { assessments, saveAssessment, clearAssessment } = useKeyPositionStore()
  const currentUser = useAuthStore(s => s.currentUser)

  const [query,        setQuery]        = useState('')
  const [filterDept,   setFilterDept]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [pageSize,     setPageSize]     = useState(15)
  const [page,         setPage]         = useState(1)
  const [showCriteria, setShowCriteria] = useState(false)
  const [modalPos,     setModalPos]     = useState(null)
  const [answers,      setAnswers]      = useState({ q1:null, q2:null, q3:null })
  const [confirm,      setConfirm]      = useState(null)   // { name, isKey } setelah simpan
  const [msg,          setMsg]          = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const deptName  = (id) => departments.find(d=>d.id===id)?.name || '—'
  const gradeCode = (id) => grades.find(g=>g.id===id)?.code       || '—'

  const statusOf = (posId) => {
    const a = assessments[posId]
    if (!a) return 'pending'
    return isKeyPosition(a) ? 'key' : 'not-key'
  }

  const stats = useMemo(() => {
    let assessed = 0, key = 0
    positions.forEach(p => {
      const a = assessments[p.id]
      if (a) { assessed++; if (isKeyPosition(a)) key++ }
    })
    const pct = positions.length ? Math.round((assessed / positions.length) * 100) : 0
    return { total: positions.length, assessed, key, pending: positions.length - assessed, pct }
  }, [positions, assessments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return positions.filter(p => {
      if (filterDept   && p.departmentId !== +filterDept) return false
      if (filterStatus && statusOf(p.id) !== filterStatus) return false
      if (q) {
        const hay = `${p.code} ${p.name} ${deptName(p.departmentId)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [positions, query, filterDept, filterStatus, assessments])

  // Reset ke halaman 1 saat filter/pencarian berubah.
  useEffect(() => { setPage(1) }, [query, filterDept, filterStatus, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const rangeFrom  = filtered.length ? (safePage - 1) * pageSize + 1 : 0
  const rangeTo    = Math.min(safePage * pageSize, filtered.length)

  // ── Assessment modal ─────────────────────────────────────────────────────
  const openAssess = (pos) => {
    const a = assessments[pos.id]
    setAnswers(a ? { q1:a.q1, q2:a.q2, q3:a.q3 } : { q1:null, q2:null, q3:null })
    setModalPos(pos)
  }
  const closeModal = () => { setModalPos(null); setAnswers({ q1:null, q2:null, q3:null }) }

  const allAnswered = ['q1','q2','q3'].every(k => answers[k] === true || answers[k] === false)
  const willBeKey   = allAnswered && isKeyPosition(answers)

  const handleSave = () => {
    if (!allAnswered) return flash('Seluruh pertanyaan wajib dijawab.', 'error')
    saveAssessment(modalPos.id, { ...answers, assessedBy: currentUser?.name || 'HR' })
    const result = { name: modalPos.name, isKey: isKeyPosition(answers) }
    closeModal()
    setConfirm(result)
  }

  const metrics = [
    { label: 'Total Posisi',   value: stats.total,    sub: 'terdaftar di sistem' },
    { label: 'Sudah Dinilai',  value: stats.assessed, sub: `${stats.pct}% selesai` },
    { label: 'Key Position',   value: stats.key,      sub: 'lolos seluruh kriteria', accent: true },
    { label: 'Belum Dinilai',  value: stats.pending,  sub: 'menunggu penilaian' },
  ]

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        title='Key Position Assessment'
        subtitle='Penetapan Key Position untuk seluruh posisi berdasarkan tiga kriteria strategis.'
        actions={
          <ActionButton variant='secondary' size='sm' onClick={()=>setShowCriteria(true)}>
            Lihat kriteria
          </ActionButton>
        }
      />

      {/* KPI strip */}
      <div className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x'>
          {metrics.map((m, i) => (
            <div key={i} className='px-5 py-4'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400'>{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent ? 'text-red-700' : 'text-gray-900'}`}>
                {m.value.toLocaleString('id-ID')}
              </div>
              <div className='mt-0.5 text-xs text-gray-400'>{m.sub}</div>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className='h-1 w-full bg-gray-100'>
          <div className='h-full rounded-r-full transition-all'
            style={{ width: `${stats.pct}%`, background: 'linear-gradient(90deg,#052B52,#039299)' }} />
        </div>
      </div>

      {/* Table */}
      <SectionCard title='Daftar Posisi' bodyClass='p-0'>
        {/* Toolbar */}
        <div className='flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between'>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder='Cari kode, nama posisi, atau department…'
            className='w-full lg:max-w-sm'
          />
          <div className='flex flex-wrap items-center gap-2'>
            <Select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className='py-2 text-xs'>
              <option value=''>Semua Department</option>
              {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className='py-2 text-xs'>
              <option value=''>Semua Status</option>
              <option value='key'>Key Position</option>
              <option value='not-key'>Non-Key</option>
              <option value='pending'>Belum Dinilai</option>
            </Select>
          </div>
        </div>

        {pageRows.length ? (
          <>
            <DataTable
              className='rounded-none shadow-none ring-0'
              columns={[
                'Posisi','Grade',{label:'Kriteria',align:'center'},'Status',{label:'Aksi',align:'right'},
              ]}
            >
              {pageRows.map(p => {
                const a  = assessments[p.id]
                const st = statusOf(p.id)
                const met = a ? [a.q1,a.q2,a.q3].filter(Boolean).length : null
                return (
                  <Tr key={p.id}>
                    <Td>
                      <div className='font-medium text-gray-800'>{p.name}</div>
                      <div className='mt-0.5 text-xs text-gray-400'><span className='font-mono'>{p.code}</span> · {deptName(p.departmentId)}</div>
                    </Td>
                    <Td>
                      <span className='rounded-md bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200'>
                        {gradeCode(p.gradeId)}
                      </span>
                    </Td>
                    <Td align='center'>
                      {a ? (
                        <span className='inline-flex items-center gap-1.5'>
                          <span className='flex gap-1'>
                            {[a.q1,a.q2,a.q3].map((v,i)=>(
                              <span key={i} className={`h-1.5 w-1.5 rounded-full ${v ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                            ))}
                          </span>
                          <span className='text-xs font-medium text-gray-500'>{met}/3</span>
                        </span>
                      ) : <span className='text-xs text-gray-300'>—</span>}
                    </Td>
                    <Td>
                      {st === 'key'
                        ? <StatusBadge tone='success'>Key Position</StatusBadge>
                        : st === 'not-key'
                        ? <StatusBadge tone='neutral'>Non-Key</StatusBadge>
                        : <StatusBadge tone='warning'>Belum Dinilai</StatusBadge>}
                      {a && <div className='mt-1 text-[10px] text-gray-400'>{a.assessedBy} · {a.assessedAt}</div>}
                    </Td>
                    <Td align='right'>
                      <div className='flex justify-end gap-1.5'>
                        <ActionButton size='sm' variant='secondary' onClick={()=>openAssess(p)}>
                          {a ? 'Edit' : 'Nilai'}
                        </ActionButton>
                        {a && (
                          <ActionButton size='sm' variant='ghost'
                            onClick={()=>{clearAssessment(p.id);flash(`Penilaian ${p.name} direset.`)}}>
                            Reset
                          </ActionButton>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </DataTable>

            {/* Pagination */}
            <div className='flex flex-col gap-3 border-t border-gray-100 p-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-2'>
                <span>Menampilkan <span className='font-semibold text-gray-700'>{rangeFrom.toLocaleString('id-ID')}–{rangeTo.toLocaleString('id-ID')}</span> dari <span className='font-semibold text-gray-700'>{filtered.length.toLocaleString('id-ID')}</span> posisi</span>
                <Select value={pageSize} onChange={e=>setPageSize(+e.target.value)} className='ml-2 w-auto py-1 text-xs'>
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / halaman</option>)}
                </Select>
              </div>
              <div className='flex items-center gap-1.5'>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage<=1}
                  className='rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40'>
                  Sebelumnya
                </button>
                <span className='px-2'>Halaman <span className='font-semibold text-gray-700'>{safePage}</span> / {totalPages}</span>
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage>=totalPages}
                  className='rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40'>
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className='p-6'>
            <EmptyState title='Tidak ada posisi yang cocok dengan filter.' />
          </div>
        )}
      </SectionCard>

      {/* Confirmation popup — data tersimpan */}
      {confirm && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4' onClick={()=>setConfirm(null)}>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50'>
              <svg width='30' height='30' viewBox='0 0 24 24' fill='none' stroke='#059669' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='20 6 9 17 4 12'/>
              </svg>
            </div>
            <h2 className='mt-4 text-base font-bold text-gray-800'>Penilaian Tersimpan</h2>
            <p className='mt-1.5 text-sm text-gray-500'>
              Hasil penilaian untuk <span className='font-semibold text-gray-700'>{confirm.name}</span> berhasil disimpan.
            </p>
            <div className={`mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ${
              confirm.isKey ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-50 text-gray-600 ring-gray-200'
            }`}>
              {confirm.isKey ? 'Ditetapkan sebagai Key Position' : 'Bukan Key Position'}
            </div>
            <button onClick={()=>setConfirm(null)}
              className='mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* Criteria modal */}
      {showCriteria && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={()=>setShowCriteria(false)}>
          <div className='w-full max-w-xl rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4'>
              <h2 className='text-base font-bold text-gray-800'>Kriteria Penetapan Key Position</h2>
              <button onClick={()=>setShowCriteria(false)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='px-6 py-5'>
              <ol className='space-y-3'>
                {KEY_POSITION_QUESTIONS.map((q, i) => (
                  <li key={i} className='flex gap-3 text-sm text-gray-700'>
                    <span className='flex h-6 w-6 flex-none items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-700'>{i+1}</span>
                    <span className='leading-snug'>{q}</span>
                  </li>
                ))}
              </ol>
              <div className='mt-4 rounded-lg bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600 ring-1 ring-gray-100'>
                Posisi ditetapkan sebagai <span className='font-bold text-red-700'>Key Position</span> hanya apabila seluruh jawaban bernilai “Ya”.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment modal */}
      {modalPos && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeModal}>
          <div className='max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='flex items-start justify-between border-b border-gray-100 px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>Penilaian Key Position</h2>
                <p className='mt-0.5 text-xs text-gray-500'>
                  <span className='font-mono'>{modalPos.code}</span> · {modalPos.name} · {deptName(modalPos.departmentId)}
                </p>
              </div>
              <button onClick={closeModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-3 px-6 py-5'>
              {KEY_POSITION_QUESTIONS.map((q, i) => {
                const key = `q${i+1}`
                return (
                  <div key={key} className='rounded-xl border border-gray-100 p-3.5'>
                    <div className='flex gap-3'>
                      <span className='flex h-6 w-6 flex-none items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-700'>{i+1}</span>
                      <span className='text-sm leading-snug text-gray-700'>{q}</span>
                    </div>
                    <div className='mt-3 flex gap-2 pl-9'>
                      {[['Ya',true],['Tidak',false]].map(([lbl,val]) => (
                        <button key={lbl} onClick={()=>setAnswers(a=>({...a,[key]:val}))}
                          className={`rounded-lg px-5 py-1.5 text-sm font-semibold ring-1 transition ${
                            answers[key] === val
                              ? (val ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-gray-700 text-white ring-gray-700')
                              : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
                          }`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${
                !allAnswered ? 'bg-gray-50 text-gray-500 ring-gray-200'
                : willBeKey  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                :              'bg-gray-50 text-gray-600 ring-gray-200'
              }`}>
                {!allAnswered
                  ? 'Jawab seluruh pertanyaan untuk melihat hasil.'
                  : willBeKey
                  ? 'Seluruh jawaban “Ya” — posisi akan ditetapkan sebagai Key Position.'
                  : 'Tidak seluruh jawaban “Ya” — posisi bukan Key Position.'}
              </div>
            </div>

            <div className='flex gap-3 px-6 pb-5'>
              <button onClick={handleSave} disabled={!allAnswered}
                className='flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50'
                style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                Simpan Penilaian
              </button>
              <button onClick={closeModal}
                className='flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
