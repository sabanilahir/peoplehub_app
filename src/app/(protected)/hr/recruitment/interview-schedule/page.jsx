'use client'
import { useState } from 'react'
import { useRecruitmentStore, INTERVIEW_TYPES, INTERVIEW_RESULTS } from '@/store/recruitmentStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, FilterBar, FilterPill,
  ActionButton, StatusBadge, EmptyState, FormField, Input, Select, inputClass,
} from '@/components/ui'

const RESULT_TONE = { Scheduled: 'info', Passed: 'success', Failed: 'danger', 'No Show': 'neutral' }
const todayStr = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  candidateId: '', date: '', time: '09:00', type: 'Video', interviewerNames: '', location: '', notes: '',
}

export default function InterviewSchedulePage() {
  const t = useT()
  const { interviews, candidates, requisitions, addInterview, updateInterview, deleteInterview } = useRecruitmentStore()

  const [filter, setFilter] = useState('upcoming')   // upcoming | past | all
  const [modal, setModal] = useState(null)
  const [flash, setFlash] = useState('')

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  const candName = (id) => candidates.find(c => c.id === id)?.name || '—'
  const reqTitleOf = (candidateId) => {
    const c = candidates.find(x => x.id === candidateId)
    return c ? (requisitions.find(r => r.id === c.requisitionId)?.positionTitle || '—') : '—'
  }

  const today = todayStr()
  const rows = interviews
    .filter(i => filter === 'all' ? true : filter === 'upcoming' ? i.date >= today : i.date < today)
    .sort((a, b) => filter === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  const counts = {
    total: interviews.length,
    Scheduled: interviews.filter(i => i.result === 'Scheduled').length,
    Passed: interviews.filter(i => i.result === 'Passed').length,
    Failed: interviews.filter(i => i.result === 'Failed').length,
  }

  const openAdd = () => setModal({ mode: 'add', form: { ...EMPTY_FORM, date: today } })
  const close = () => setModal(null)
  const setField = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))

  const save = () => {
    const f = modal.form
    if (!f.candidateId || !f.date || !f.time) return
    const cand = candidates.find(c => c.id === Number(f.candidateId))
    addInterview({
      candidateId: Number(f.candidateId), requisitionId: cand?.requisitionId,
      date: f.date, time: f.time, type: f.type,
      interviewerNames: f.interviewerNames.trim(), location: f.location.trim(), notes: f.notes,
    })
    say(t('Interview dijadwalkan.', 'Interview scheduled.'))
    close()
  }

  const setResult = (iv, result) => {
    updateInterview(iv.id, { result })
    say(t(`Hasil diubah ke ${result}.`, `Result set to ${result}.`))
  }

  const del = (iv) => {
    if (!window.confirm(t('Hapus jadwal interview ini?', 'Delete this interview?'))) return
    deleteInterview(iv.id)
    say(t('Jadwal dihapus.', 'Interview deleted.'))
  }

  const candidateOptions = candidates.filter(c => c.stage !== 'Rejected' && c.stage !== 'Pending Employee')

  return (
    <div>
      <PageHeader
        icon='🎥'
        title='Interview Schedule'
        subtitle={t('Jadwal dan hasil wawancara kandidat.', 'Candidate interview schedule and results.')}
        actions={
          <div className='flex items-center gap-3'>
            {flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
            <ActionButton onClick={openAdd} icon='➕'>{t('Jadwalkan Interview', 'Schedule Interview')}</ActionButton>
          </div>
        }
      />

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <StatCard icon='🎥' tone='brand' label={t('Total Interview', 'Total Interviews')} value={String(counts.total)} />
        <StatCard icon='🗓️' tone='blue' label={t('Terjadwal', 'Scheduled')} value={String(counts.Scheduled)} />
        <StatCard icon='✅' tone='green' label={t('Lulus', 'Passed')} value={String(counts.Passed)} />
        <StatCard icon='❌' tone='red' label={t('Tidak Lulus', 'Failed')} value={String(counts.Failed)} />
      </div>

      <div className='mb-4'>
        <FilterBar>
          <FilterPill active={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>{t('Akan Datang', 'Upcoming')}</FilterPill>
          <FilterPill active={filter === 'past'} onClick={() => setFilter('past')}>{t('Sudah Lewat', 'Past')}</FilterPill>
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>{t('Semua', 'All')}</FilterPill>
        </FilterBar>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon='🎥' title={t('Tidak ada jadwal.', 'No interviews.')}
          action={<ActionButton onClick={openAdd} icon='➕'>{t('Jadwalkan Interview', 'Schedule Interview')}</ActionButton>} />
      ) : (
        <DataTable columns={[
          t('Kandidat', 'Candidate'), t('Lowongan', 'Position'),
          { label: t('Tanggal & Jam', 'Date & Time'), align: 'center' }, { label: t('Tipe', 'Type'), align: 'center' },
          t('Interviewer'), t('Lokasi/Link', 'Location/Link'), { label: t('Hasil', 'Result'), align: 'center' }, { label: '', align: 'right' },
        ]}>
          {rows.map(iv => (
            <Tr key={iv.id}>
              <Td className='font-semibold text-gray-800'>{candName(iv.candidateId)}</Td>
              <Td className='text-sm text-gray-600'>{reqTitleOf(iv.candidateId)}</Td>
              <Td align='center' className='text-xs tabular-nums text-gray-600'>{iv.date} · {iv.time}</Td>
              <Td align='center' className='text-xs text-gray-500'>{iv.type}</Td>
              <Td className='text-xs text-gray-500'>{iv.interviewerNames || '—'}</Td>
              <Td className='text-xs text-gray-500'>{iv.location || '—'}</Td>
              <Td align='center'>
                {iv.result === 'Scheduled' ? (
                  <div className='flex justify-center gap-1'>
                    <button onClick={() => setResult(iv, 'Passed')} className='rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100'>{t('Lulus', 'Pass')}</button>
                    <button onClick={() => setResult(iv, 'Failed')} className='rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100'>{t('Gagal', 'Fail')}</button>
                    <button onClick={() => setResult(iv, 'No Show')} className='rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-200'>{t('Absen', 'No Show')}</button>
                  </div>
                ) : (
                  <StatusBadge tone={RESULT_TONE[iv.result]}>{iv.result}</StatusBadge>
                )}
              </Td>
              <Td align='right'>
                <button onClick={() => del(iv)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>{t('Jadwalkan Interview', 'Schedule Interview')}</h3>
              <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-4'>
              <FormField label={t('Kandidat', 'Candidate')} required
                hint={candidateOptions.length === 0 ? t('Tidak ada kandidat aktif.', 'No active candidates.') : undefined}>
                <Select value={modal.form.candidateId} onChange={e => setField({ candidateId: e.target.value })}>
                  <option value=''>—</option>
                  {candidateOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {reqTitleOf(c.id)}</option>
                  ))}
                </Select>
              </FormField>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label={t('Tanggal', 'Date')} required>
                  <Input type='date' value={modal.form.date} onChange={e => setField({ date: e.target.value })} />
                </FormField>
                <FormField label={t('Jam', 'Time')} required>
                  <Input type='time' value={modal.form.time} onChange={e => setField({ time: e.target.value })} />
                </FormField>
              </div>
              <FormField label={t('Tipe', 'Type')}>
                <Select value={modal.form.type} onChange={e => setField({ type: e.target.value })}>
                  {INTERVIEW_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                </Select>
              </FormField>
              <FormField label={t('Interviewer', 'Interviewer(s)')} hint={t('Pisahkan dengan koma.', 'Comma-separated.')}>
                <Input value={modal.form.interviewerNames} onChange={e => setField({ interviewerNames: e.target.value })} />
              </FormField>
              <FormField label={t('Lokasi / Link', 'Location / Link')}>
                <Input value={modal.form.location} onChange={e => setField({ location: e.target.value })} placeholder='meet.google.com/… atau Kantor Lt 5' />
              </FormField>
              <FormField label={t('Catatan', 'Notes')}>
                <textarea rows={2} className={inputClass} value={modal.form.notes} onChange={e => setField({ notes: e.target.value })} />
              </FormField>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={close}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={save} icon='💾' disabled={!modal.form.candidateId || !modal.form.date || !modal.form.time}>
                {t('Simpan', 'Save')}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
