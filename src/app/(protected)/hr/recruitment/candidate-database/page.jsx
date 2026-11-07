'use client'
import { useState } from 'react'
import { useRecruitmentStore, STAGES, CANDIDATE_SOURCES } from '@/store/recruitmentStore'
import { useDocumentTypeStore } from '@/store/documentTypeStore'
import { useCandidateDocumentStore, CANDIDATE_DOCUMENT_MAX_BYTES } from '@/store/candidateDocumentStore'
import { usePsychotestStore } from '@/store/psychotestStore'
import { usePsychotestAttemptStore } from '@/store/psychotestAttemptStore'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, SearchBar, FilterBar, FilterPill,
  ActionButton, StatusBadge, EmptyState, FormField, Input, Select, inputClass,
} from '@/components/ui'

const STAGE_TONE = {
  Applied: 'neutral', Screening: 'info', Interview: 'purple', Offer: 'warning', 'Pending Employee': 'success', Rejected: 'danger',
}

const Stars = ({ n }) => (
  <span className='text-amber-400' title={`${n}/5`}>
    {'★'.repeat(n)}<span className='text-gray-200'>{'★'.repeat(5 - n)}</span>
  </span>
)

const formatBytes = (n) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`

const readAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const EMPTY_FORM = {
  name: '', email: '', phone: '', requisitionId: '', source: CANDIDATE_SOURCES[0], appliedDate: '', notes: '',
  docFiles: {}, docErrors: {},
}

const PAGE = 50

export default function CandidateDatabasePage() {
  const t = useT()
  const { candidates, requisitions, addCandidate, updateCandidate, deleteCandidate } = useRecruitmentStore()
  const { types: docTypes } = useDocumentTypeStore()
  const { documents: candidateDocs, addDocument: addCandidateDocument } = useCandidateDocumentStore()
  const { tests: psychoTests } = usePsychotestStore()
  const { attempts: psychoAttempts, assign: assignPsychotest } = usePsychotestAttemptStore()
  const { currentUser } = useAuthStore()
  const mandatoryDocTypes = docTypes.filter(x => x.active && x.mandatory)

  const [q, setQ] = useState('')
  const [stage, setStage] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [assignModal, setAssignModal] = useState(null) // { candidateId, candidateName, requisitionId, testId }
  const [flash, setFlash] = useState('')

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }
  const reqTitle = (id) => requisitions.find(r => r.id === id)?.positionTitle || '—'

  const needle = q.trim().toLowerCase()
  const rows = candidates
    .filter(c => stage === 'all' || c.stage === stage)
    .filter(c => !needle || c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle))
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate))
  const shown = rows.slice(0, limit)

  const counts = { all: candidates.length }
  STAGES.forEach(s => { counts[s] = candidates.filter(c => c.stage === s).length })

  const openAdd = () => setModal({ mode: 'add', form: { ...EMPTY_FORM, docFiles: {}, docErrors: {}, appliedDate: new Date().toISOString().slice(0, 10) } })
  const close = () => setModal(null)
  const setField = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))

  const setDocFile = (typeId, file) => {
    if (!file) return
    if (file.size > CANDIDATE_DOCUMENT_MAX_BYTES) {
      setModal(m => ({ ...m, form: { ...m.form, docErrors: { ...m.form.docErrors, [typeId]: t(`Maks. ${formatBytes(CANDIDATE_DOCUMENT_MAX_BYTES)}.`, `Max ${formatBytes(CANDIDATE_DOCUMENT_MAX_BYTES)}.`) } } }))
      return
    }
    setModal(m => ({ ...m, form: { ...m.form, docFiles: { ...m.form.docFiles, [typeId]: file }, docErrors: { ...m.form.docErrors, [typeId]: null } } }))
  }

  const missingMandatoryDocs = modal ? mandatoryDocTypes.filter(dt => !modal.form.docFiles[dt.id]) : []

  const save = async () => {
    const f = modal.form
    if (!f.name.trim() || !f.requisitionId) return
    if (missingMandatoryDocs.length > 0) return
    const newId = addCandidate({
      name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(),
      requisitionId: Number(f.requisitionId), source: f.source, appliedDate: f.appliedDate, notes: f.notes,
    })
    for (const dt of mandatoryDocTypes) {
      const file = f.docFiles[dt.id]
      if (!file) continue
      const dataUrl = await readAsDataURL(file)
      addCandidateDocument({
        candidateId: newId, category: dt.name,
        fileName: file.name, fileType: file.type, fileSize: file.size, dataUrl,
        uploadedAt: new Date().toISOString(),
      })
    }
    say(t('Kandidat ditambahkan.', 'Candidate added.'))
    close()
  }

  const del = (c) => {
    if (!window.confirm(t(`Hapus kandidat "${c.name}"?`, `Delete candidate "${c.name}"?`))) return
    deleteCandidate(c.id)
    say(t('Kandidat dihapus.', 'Candidate deleted.'))
    setDetail(null)
  }

  const activeTests = psychoTests.filter(x => x.active)
  const openAssign = (c) => setAssignModal({ candidateId: c.id, candidateName: c.name, requisitionId: c.requisitionId, testId: activeTests[0]?.id ?? '' })
  const closeAssign = () => setAssignModal(null)
  const confirmAssign = () => {
    const test = psychoTests.find(x => x.id === Number(assignModal.testId))
    if (!test) return
    assignPsychotest({
      candidateId: assignModal.candidateId, candidateName: assignModal.candidateName,
      testId: test.id, testName: test.name, requisitionId: assignModal.requisitionId,
      assignedAt: new Date().toISOString(), assignedBy: currentUser?.id, assignedByName: currentUser?.name || '',
    })
    say(t('Psikotes ditugaskan — salin link di halaman Hasil Psychotest.', 'Psychotest assigned — copy the link from the Psychotest Results page.'))
    closeAssign()
  }

  return (
    <div>
      <PageHeader
        icon='🗂️'
        title='Candidate Database'
        subtitle={t('Semua kandidat yang pernah melamar, lintas lowongan.', 'Every candidate who has ever applied, across all requisitions.')}
        actions={
          <div className='flex items-center gap-3'>
            {flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
            <ActionButton onClick={openAdd} icon='➕'>{t('Tambah Kandidat', 'Add Candidate')}</ActionButton>
          </div>
        }
      />

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6'>
        <StatCard icon='🗂️' tone='brand' label={t('Total', 'Total')} value={String(counts.all)} />
        {STAGES.map(s => (
          <StatCard key={s} icon={s === 'Pending Employee' ? '✅' : s === 'Rejected' ? '✕' : '●'}
            tone={s === 'Pending Employee' ? 'green' : s === 'Rejected' ? 'red' : 'gray'} label={s} value={String(counts[s])} />
        ))}
      </div>

      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex-1'>
          <SearchBar value={q} onChange={v => { setQ(v); setLimit(PAGE) }} placeholder={t('Cari nama atau email…', 'Search name or email…')} />
        </div>
        <FilterBar>
          <FilterPill active={stage === 'all'} onClick={() => { setStage('all'); setLimit(PAGE) }}>{t('Semua', 'All')}</FilterPill>
          {STAGES.map(s => (
            <FilterPill key={s} active={stage === s} onClick={() => { setStage(s); setLimit(PAGE) }}>{s}</FilterPill>
          ))}
        </FilterBar>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon='🗂️' title={t('Tidak ada kandidat cocok.', 'No matching candidates.')}
          action={<ActionButton onClick={openAdd} icon='➕'>{t('Tambah Kandidat', 'Add Candidate')}</ActionButton>} />
      ) : (
        <>
          <DataTable columns={[
            t('Kandidat', 'Candidate'), t('Lowongan', 'Applied For'), t('Sumber', 'Source'),
            { label: t('Tanggal Lamar', 'Applied Date'), align: 'center' }, { label: 'Rating', align: 'center' },
            { label: 'Stage', align: 'center' }, { label: '', align: 'right' },
          ]}>
            {shown.map(c => (
              <Tr key={c.id} onClick={() => setDetail(c)}>
                <Td>
                  <p className='font-semibold text-gray-800'>{c.name}</p>
                  <p className='text-xs text-gray-400'>{c.email}</p>
                </Td>
                <Td className='text-sm text-gray-600'>{reqTitle(c.requisitionId)}</Td>
                <Td className='text-xs text-gray-500'>{c.source}</Td>
                <Td align='center' className='text-xs tabular-nums text-gray-500'>{c.appliedDate}</Td>
                <Td align='center'>{c.rating > 0 ? <Stars n={c.rating} /> : <span className='text-gray-300'>—</span>}</Td>
                <Td align='center'><StatusBadge tone={STAGE_TONE[c.stage]}>{c.stage}</StatusBadge></Td>
                <Td align='right'>
                  <button onClick={(e) => { e.stopPropagation(); del(c) }} className='text-xs font-semibold text-gray-400 hover:text-red-600'>
                    {t('Hapus', 'Delete')}
                  </button>
                </Td>
              </Tr>
            ))}
          </DataTable>
          {rows.length > limit && (
            <div className='mt-4 text-center'>
              <ActionButton variant='secondary' size='sm' onClick={() => setLimit(l => l + PAGE)}>
                {t(`Tampilkan ${Math.min(PAGE, rows.length - limit)} lagi`, `Show ${Math.min(PAGE, rows.length - limit)} more`)}
                {' '}({limit}/{rows.length})
              </ActionButton>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={() => setDetail(null)}>
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-base font-bold text-gray-800'>{detail.name}</h3>
                <p className='text-xs text-gray-400'>{detail.email} · {detail.phone || '—'}</p>
              </div>
              <button onClick={() => setDetail(null)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-2 text-sm'>
              <p><span className='text-gray-400'>{t('Melamar untuk', 'Applied for')}:</span> <span className='font-semibold text-gray-700'>{reqTitle(detail.requisitionId)}</span></p>
              <p><span className='text-gray-400'>{t('Sumber', 'Source')}:</span> {detail.source}</p>
              <p><span className='text-gray-400'>{t('Tanggal Lamar', 'Applied Date')}:</span> {detail.appliedDate}</p>
              <p><span className='text-gray-400'>Stage:</span> <StatusBadge tone={STAGE_TONE[detail.stage]}>{detail.stage}</StatusBadge></p>
              {detail.rating > 0 && <p><span className='text-gray-400'>Rating:</span> <Stars n={detail.rating} /></p>}
              {detail.notes && <p className='rounded-xl bg-gray-50 p-3 text-xs text-gray-600'>{detail.notes}</p>}
              {candidateDocs.filter(d => d.candidateId === detail.id).length > 0 && (
                <div className='pt-2'>
                  <p className='mb-1.5 text-xs font-semibold text-gray-500'>{t('Dokumen', 'Documents')}</p>
                  <div className='space-y-1.5'>
                    {candidateDocs.filter(d => d.candidateId === detail.id).map(doc => (
                      <a key={doc.id} href={doc.dataUrl} download={doc.fileName} target='_blank' rel='noreferrer'
                        className='flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs hover:bg-gray-100'>
                        <span className='font-medium text-gray-700'>{doc.category}</span>
                        <span className='text-gray-400'>{doc.fileName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className='pt-2'>
                <div className='mb-1.5 flex items-center justify-between'>
                  <p className='text-xs font-semibold text-gray-500'>{t('Psikotes', 'Psychotest')}</p>
                  <button onClick={() => openAssign(detail)} className='text-xs font-semibold text-teal-700 hover:underline'>
                    + {t('Tugaskan Tes', 'Assign Test')}
                  </button>
                </div>
                {psychoAttempts.filter(a => a.candidateId === detail.id).length === 0 ? (
                  <p className='text-xs text-gray-400'>{t('Belum ada psikotes ditugaskan.', 'No psychotest assigned yet.')}</p>
                ) : (
                  <div className='space-y-1.5'>
                    {psychoAttempts.filter(a => a.candidateId === detail.id).map(a => (
                      <a key={a.id} href='/hr/recruitment/psychotest/results'
                        className='flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs hover:bg-gray-100'>
                        <span className='font-medium text-gray-700'>{a.testName}</span>
                        <span className='text-gray-400'>
                          {a.status === 'Completed' ? `${a.score}/${a.maxScore}` : a.status}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className='mt-5 flex justify-end gap-2'>
              <a href={`/hr/recruitment/candidate-pipeline?requisitionId=${detail.requisitionId}`}
                className='rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'>
                {t('Lihat di Pipeline', 'View in Pipeline')}
              </a>
              <button onClick={() => del(detail)} className='rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100'>
                {t('Hapus', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>{t('Tambah Kandidat', 'Add Candidate')}</h3>
              <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-4'>
              <FormField label={t('Nama Lengkap', 'Full Name')} required>
                <Input value={modal.form.name} onChange={e => setField({ name: e.target.value })} autoFocus />
              </FormField>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Email'>
                  <Input type='email' value={modal.form.email} onChange={e => setField({ email: e.target.value })} />
                </FormField>
                <FormField label={t('Telepon', 'Phone')}>
                  <Input value={modal.form.phone} onChange={e => setField({ phone: e.target.value })} />
                </FormField>
              </div>
              <FormField label={t('Melamar untuk (Requisition)', 'Applying For (Requisition)')} required>
                <Select value={modal.form.requisitionId} onChange={e => setField({ requisitionId: e.target.value })}>
                  <option value=''>—</option>
                  {requisitions.filter(r => r.status !== 'Closed').map(r => (
                    <option key={r.id} value={r.id}>{r.positionTitle}</option>
                  ))}
                </Select>
              </FormField>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label={t('Sumber', 'Source')}>
                  <Select value={modal.form.source} onChange={e => setField({ source: e.target.value })}>
                    {CANDIDATE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Tanggal Lamar', 'Applied Date')}>
                  <Input type='date' value={modal.form.appliedDate} onChange={e => setField({ appliedDate: e.target.value })} />
                </FormField>
              </div>
              <FormField label={t('Catatan', 'Notes')}>
                <textarea rows={3} className={inputClass} value={modal.form.notes} onChange={e => setField({ notes: e.target.value })} />
              </FormField>

              {mandatoryDocTypes.length > 0 && (
                <div className='rounded-xl bg-gray-50 p-3'>
                  <p className='mb-2 text-xs font-semibold text-gray-600'>{t('Dokumen Wajib', 'Mandatory Documents')}</p>
                  <div className='space-y-2'>
                    {mandatoryDocTypes.map(dt => (
                      <div key={dt.id}>
                        <input type='file' id={`cand-doc-${dt.id}`} className='hidden'
                          accept='.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
                          onChange={e => setDocFile(dt.id, e.target.files?.[0])} />
                        <label htmlFor={`cand-doc-${dt.id}`}
                          className='flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-xs hover:border-red-300 hover:bg-red-50/40'>
                          <span className='font-medium text-gray-700'>{dt.title} <span className='text-red-500'>*</span></span>
                          <span className='truncate text-gray-400'>
                            {modal.form.docFiles[dt.id] ? `📎 ${modal.form.docFiles[dt.id].name}` : t('Pilih file', 'Choose file')}
                          </span>
                        </label>
                        {modal.form.docErrors[dt.id] && <span className='mt-1 block text-[11px] text-red-500'>{modal.form.docErrors[dt.id]}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={close}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={save} icon='💾' disabled={!modal.form.name.trim() || !modal.form.requisitionId || missingMandatoryDocs.length > 0}>
                {t('Simpan', 'Save')}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeAssign}>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>{t('Tugaskan Psikotes', 'Assign Psychotest')}</h3>
              <button onClick={closeAssign} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <p className='mb-3 text-xs text-gray-400'>{assignModal.candidateName}</p>
            {activeTests.length === 0 ? (
              <p className='text-sm text-gray-500'>
                {t('Belum ada paket tes aktif. Atur dulu di ', 'No active test package yet. Set one up under ')}
                <a href='/hr/recruitment/psychotest' className='font-semibold text-teal-700 hover:underline'>
                  HR Administration → Recruitment → Psychotest
                </a>.
              </p>
            ) : (
              <FormField label={t('Paket Tes', 'Test Package')}>
                <Select value={assignModal.testId} onChange={e => setAssignModal(m => ({ ...m, testId: e.target.value }))}>
                  {activeTests.map(tst => <option key={tst.id} value={tst.id}>{tst.name} · {tst.durationMinutes} {t('menit', 'min')}</option>)}
                </Select>
              </FormField>
            )}
            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={closeAssign}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={confirmAssign} icon='🧠' disabled={activeTests.length === 0}>{t('Tugaskan', 'Assign')}</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
