'use client'
import { useState, useMemo } from 'react'
import { useRecruitmentStore, REQ_STATUSES, REQ_PRIORITIES, EMPLOYMENT_TYPES, isPublished, publishStatus } from '@/store/recruitmentStore'
import { useStructureStore } from '@/store/structureStore'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, SearchBar, FilterBar, FilterPill,
  ActionButton, StatusBadge, EmptyState, FormField, Input, Select, inputClass,
} from '@/components/ui'
import SearchableSelect from '@/components/ui/SearchableSelect'

const STATUS_TONE = { Open: 'success', 'Posted External': 'info', 'On Hold': 'warning', Closed: 'neutral' }
const PRIORITY_TONE = { High: 'danger', Medium: 'warning', Low: 'neutral' }

const EMPTY_FORM = {
  positionId: '', headcountId: '', publicTitle: '', jobDescription: '', departmentId: '', companyId: '', employmentType: 'Permanent',
  headcount: 1, priority: 'Medium', status: 'Open', targetDate: '',
  publishStartDate: '', publishEndDate: '', notes: '',
}

export default function JobRequisitionPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const {
    requisitions, candidates, addRequisition, updateRequisition, deleteRequisition,
  } = useRecruitmentStore()
  const { departments, companies, positions, businessUnits, headcounts } = useStructureStore()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [modal, setModal] = useState(null)   // { mode: 'add'|'edit', id?, form }
  const [flash, setFlash] = useState('')
  const [onlyVacant, setOnlyVacant] = useState(true)

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  const filledOf = (reqId) => candidates.filter(c => c.requisitionId === reqId && c.stage === 'Pending Employee').length

  const needle = q.trim().toLowerCase()
  const rows = requisitions
    .filter(r => status === 'all' || r.status === status)
    .filter(r => !needle || r.positionTitle.toLowerCase().includes(needle))
    .sort((a, b) => b.requestedDate.localeCompare(a.requestedDate))

  const counts = { all: requisitions.length }
  REQ_STATUSES.forEach(s => { counts[s] = requisitions.filter(r => r.status === s).length })
  const totalHeadcount = requisitions.filter(r => r.status !== 'Closed').reduce((s, r) => s + r.headcount, 0)
  const totalFilled = requisitions.reduce((s, r) => s + filledOf(r.id), 0)
  const totalLive = requisitions.filter(r => isPublished(r)).length

  const deptName = (id) => departments.find(d => d.id === id)?.name || '—'
  const companyName = (id) => companies.find(c => c.id === id)?.companyCode || companies.find(c => c.id === id)?.name || '—'

  const openAdd = () => setModal({ mode: 'add', form: { ...EMPTY_FORM } })
  const openEdit = (r) => setModal({
    mode: 'edit', id: r.id,
    form: { // Legacy requisitions only ever had a free-text positionTitle (no FK) —
            // fall back to matching it by exact name against master data so editing
            // an old record doesn't land on a blank LOV.
            positionId: String(r.positionId ?? positions.find(p => p.name === r.positionTitle)?.id ?? ''),
            headcountId: r.headcountId ? String(r.headcountId) : '',
            publicTitle: r.publicTitle || '', jobDescription: r.jobDescription || '',
            departmentId: String(r.departmentId), companyId: String(r.companyId),
            employmentType: r.employmentType, headcount: r.headcount, priority: r.priority, status: r.status,
            targetDate: r.targetDate, publishStartDate: r.publishStartDate || '', publishEndDate: r.publishEndDate || '',
            notes: r.notes },
  })
  const close = () => setModal(null)
  const setField = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))

  const dateRangeInvalid = modal?.form.publishStartDate && modal?.form.publishEndDate
    && modal.form.publishEndDate < modal.form.publishStartDate

  // Cascading LOV: Company → Department → Position. Position has no direct
  // companyId (only departmentId), and Department only links to Company
  // transitively via businessUnitId, hence the join below.
  const companyDepartments = modal?.form.companyId
    ? departments.filter(d => businessUnits.find(bu => bu.id === d.businessUnitId)?.companyId === Number(modal.form.companyId))
    : []
  const departmentPositions = modal?.form.departmentId
    ? positions.filter(p => String(p.departmentId) === modal.form.departmentId)
    : []
  // Vacant seats for the selected Position — excludes any already filled
  // (employeeId set) and any already claimed by another still-open
  // requisition, so a seat can never be double-booked.
  const availableHeadcounts = modal?.form.positionId
    ? headcounts.filter(h => h.positionId === Number(modal.form.positionId) && h.status === 'Active' && !h.employeeId
        && !requisitions.some(r => r.id !== modal.id && r.headcountId === h.id && r.status !== 'Closed'))
    : []
  const vacantCountForPosition = (posId) =>
    headcounts.filter(h => h.positionId === posId && h.status === 'Active' && !h.employeeId
      && !requisitions.some(r => r.id !== modal?.id && r.headcountId === h.id && r.status !== 'Closed')).length
  const vacantCountForDepartment = (deptId) =>
    positions.filter(p => p.departmentId === deptId).reduce((sum, p) => sum + vacantCountForPosition(p.id), 0)
  const vacantCountForCompany = (companyId) =>
    departments.filter(d => businessUnits.find(bu => bu.id === d.businessUnitId)?.companyId === companyId)
      .reduce((sum, d) => sum + vacantCountForDepartment(d.id), 0)
  const positionHasVacancy = (posId) => vacantCountForPosition(posId) > 0
  // "Hanya kursi kosong" filters every LOV in the cascade (Company →
  // Department → Position) down to entries that actually have a seat
  // somewhere underneath them. The checkbox's own onChange clears any
  // selected value that fails its filter the moment it's switched on, so
  // the lists and the selected values can never disagree.
  const companyOptionsList = onlyVacant ? companies.filter(c => vacantCountForCompany(c.id) > 0) : companies
  const departmentOptions = onlyVacant
    ? companyDepartments.filter(d => vacantCountForDepartment(d.id) > 0)
    : companyDepartments
  const positionOptions = onlyVacant
    ? departmentPositions.filter(p => positionHasVacancy(p.id))
    : departmentPositions

  const handleOnlyVacantChange = (checked) => {
    setOnlyVacant(checked)
    if (!checked || !modal) return
    let { companyId, departmentId, positionId } = modal.form
    if (companyId && vacantCountForCompany(Number(companyId)) === 0) { companyId = ''; departmentId = ''; positionId = '' }
    if (departmentId && vacantCountForDepartment(Number(departmentId)) === 0) { departmentId = ''; positionId = '' }
    if (positionId && !positionHasVacancy(Number(positionId))) { positionId = '' }
    if (companyId !== modal.form.companyId || departmentId !== modal.form.departmentId || positionId !== modal.form.positionId) {
      const patch = { companyId, departmentId, positionId }
      if (positionId !== modal.form.positionId) { patch.headcountId = ''; patch.publicTitle = '' }
      setField(patch)
    }
  }

  const save = () => {
    const f = modal.form
    if (!f.positionId || !f.departmentId || !f.companyId || dateRangeInvalid) return
    const position = positions.find(p => p.id === Number(f.positionId))
    const payload = {
      positionId: Number(f.positionId), positionTitle: position?.name || '',
      headcountId: f.headcountId ? Number(f.headcountId) : null,
      publicTitle: f.publicTitle.trim(), jobDescription: f.jobDescription.trim(),
      departmentId: Number(f.departmentId), companyId: Number(f.companyId),
      employmentType: f.employmentType, headcount: Math.max(1, Number(f.headcount) || 1),
      priority: f.priority, status: f.status, targetDate: f.targetDate,
      publishStartDate: f.publishStartDate, publishEndDate: f.publishEndDate, notes: f.notes,
    }
    if (modal.mode === 'add') {
      addRequisition({
        ...payload,
        requestedBy: currentUser?.id, requestedByName: currentUser?.name || '',
        requestedDate: new Date().toISOString().slice(0, 10),
      })
      say(t('Job requisition ditambahkan.', 'Job requisition added.'))
    } else {
      updateRequisition(modal.id, payload)
      say(t('Job requisition diperbarui.', 'Job requisition updated.'))
    }
    close()
  }

  const setReqStatus = (r, next) => {
    updateRequisition(r.id, { status: next })
    say(t(`Status diubah ke ${next}.`, `Status changed to ${next}.`))
  }

  const del = (r) => {
    const n = candidates.filter(c => c.requisitionId === r.id).length
    if (n > 0 && !window.confirm(t(
      `Requisition "${r.positionTitle}" punya ${n} kandidat. Hapus tetap?`,
      `"${r.positionTitle}" has ${n} candidate(s). Delete anyway?`,
    ))) return
    deleteRequisition(r.id)
    say(t('Requisition dihapus.', 'Requisition deleted.'))
  }

  return (
    <div>
      <PageHeader
        icon='💼'
        title='Job Requisition'
        subtitle={t('Kelola permintaan lowongan dan kebutuhan headcount.', 'Manage open roles and headcount requests.')}
        actions={
          <div className='flex items-center gap-3'>
            {flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
            <ActionButton onClick={openAdd} icon='➕'>{t('Buat Requisition', 'New Requisition')}</ActionButton>
          </div>
        }
      />

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'>
        <StatCard icon='📋' tone='brand' label={t('Total Requisition', 'Total Requisitions')} value={String(counts.all)} />
        <StatCard icon='🟢' tone='green' label='Open' value={String(counts.Open)} />
        <StatCard icon='🌐' tone='blue' label={t('Live di Career Site', 'Live on Career Site')} value={String(totalLive)} />
        <StatCard icon='🎯' tone='purple' label={t('Kebutuhan Terbuka', 'Open Headcount')} value={String(totalHeadcount)} />
        <StatCard icon='✅' tone='orange' label={t('Pending Employee', 'Pending Employee')} value={String(totalFilled)} />
      </div>

      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex-1'><SearchBar value={q} onChange={setQ} placeholder={t('Cari posisi…', 'Search position…')} /></div>
        <FilterBar>
          <FilterPill active={status === 'all'} onClick={() => setStatus('all')}>{t('Semua', 'All')} ({counts.all})</FilterPill>
          {REQ_STATUSES.map(s => (
            <FilterPill key={s} active={status === s} onClick={() => setStatus(s)}>{s} ({counts[s]})</FilterPill>
          ))}
        </FilterBar>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon='💼' title={t('Belum ada requisition.', 'No requisitions yet.')}
          action={<ActionButton onClick={openAdd} icon='➕'>{t('Buat Requisition', 'New Requisition')}</ActionButton>} />
      ) : (
        <DataTable columns={[
          t('Posisi', 'Position'), t('Departemen', 'Department'), t('Perusahaan', 'Company'),
          { label: t('Kebutuhan', 'Headcount'), align: 'center' }, { label: t('Prioritas', 'Priority'), align: 'center' },
          { label: t('Target', 'Target Date'), align: 'center' }, { label: 'Status', align: 'center' },
          { label: '', align: 'right' },
        ]}>
          {rows.map(r => {
            const pubStatus = publishStatus(r)
            const statusBadge = <StatusBadge tone={STATUS_TONE[r.status]}>{r.status}</StatusBadge>
            const filled = filledOf(r.id)
            const isFulfilled = r.headcount > 0 && filled >= r.headcount
            return (
            <Tr key={r.id}>
              <Td>
                <p className='font-semibold text-gray-800'>
                  {r.positionTitle}
                  {r.headcountId && (
                    <span className='ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500'>
                      {headcounts.find(h => h.id === r.headcountId)?.code || '—'}
                    </span>
                  )}
                </p>
                <p className='text-xs text-gray-400'>{r.employmentType} · {t('diajukan oleh', 'requested by')} {r.requestedByName}</p>
                {r.publicTitle && r.publicTitle !== r.positionTitle && (
                  <p className='mt-0.5 text-xs text-blue-500'>🌐 {t('Publik', 'Public')}: {r.publicTitle}</p>
                )}
              </Td>
              <Td className='text-sm text-gray-600'>{deptName(r.departmentId)}</Td>
              <Td className='text-sm text-gray-600'>{companyName(r.companyId)}</Td>
              <Td align='center' className='font-mono text-sm'>
                {filled}/{r.headcount}
                {isFulfilled && (
                  <span className='ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 align-middle'>
                    ✓ {t('Terpenuhi', 'Fulfilled')}
                  </span>
                )}
              </Td>
              <Td align='center'><StatusBadge tone={PRIORITY_TONE[r.priority]}>{r.priority}</StatusBadge></Td>
              <Td align='center' className='text-xs tabular-nums text-gray-500'>{r.targetDate || '—'}</Td>
              <Td align='center'>
                {r.status === 'Posted External' ? (
                  <a href={`/careers?req=${r.id}`} target='_blank' rel='noreferrer'
                    title={pubStatus === 'Live'
                      ? t('Tayang di Career Site — klik untuk lihat', 'Live on Career Site — click to view')
                      : pubStatus === 'Terjadwal'
                        ? t(`Belum tayang, mulai ${r.publishStartDate}`, `Not live yet, starts ${r.publishStartDate}`)
                        : t(`Sudah tidak tayang sejak ${r.publishEndDate}`, `No longer live since ${r.publishEndDate}`)}
                    className='inline-flex items-center gap-1 hover:underline decoration-blue-400 underline-offset-2'>
                    {statusBadge}
                    {pubStatus !== 'Live' && <span className='text-[10px] text-gray-400'>({pubStatus})</span>}
                  </a>
                ) : statusBadge}
                {isFulfilled && r.status !== 'Closed' && (
                  <div className='mt-1 flex items-center justify-center gap-1 text-[10px] text-amber-600'>
                    <span>⚠️ {t('Sudah terpenuhi', 'Already filled')}</span>
                    <button onClick={() => setReqStatus(r, 'Closed')} className='font-bold underline hover:text-amber-800'>
                      {t('Tutup?', 'Close?')}
                    </button>
                  </div>
                )}
              </Td>
              <Td align='right'>
                <div className='flex justify-end gap-2'>
                  <a href={`/hr/recruitment/candidate-pipeline?requisitionId=${r.id}`}
                    className='text-xs font-semibold text-red-700 hover:underline'>{t('Kandidat', 'Candidates')}</a>
                  <button onClick={() => openEdit(r)} className='text-xs font-semibold text-gray-500 hover:text-gray-700'>{t('Ubah', 'Edit')}</button>
                  {r.status !== 'Closed' ? (
                    <button onClick={() => setReqStatus(r, 'Closed')} className='text-xs font-semibold text-gray-400 hover:text-gray-600'>{t('Tutup', 'Close')}</button>
                  ) : (
                    <button onClick={() => setReqStatus(r, 'Open')} className='text-xs font-semibold text-gray-400 hover:text-gray-600'>{t('Buka Lagi', 'Reopen')}</button>
                  )}
                  <button onClick={() => del(r)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
                </div>
              </Td>
            </Tr>
            )
          })}
        </DataTable>
      )}

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>
                {modal.mode === 'add' ? t('Buat Job Requisition', 'New Job Requisition') : t('Ubah Job Requisition', 'Edit Job Requisition')}
              </h3>
              <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-4'>
              <label className='flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 select-none'>
                <input type='checkbox' checked={onlyVacant} onChange={e => handleOnlyVacantChange(e.target.checked)}
                  className='h-3.5 w-3.5 accent-teal-600' />
                {t('Hanya tampilkan Perusahaan / Departemen / Posisi yang punya kursi kosong',
                   'Only show Company / Department / Position with a vacant seat')}
              </label>
              <FormField label={t('Perusahaan', 'Company')} required>
                <SearchableSelect
                  value={modal.form.companyId}
                  onChange={val => setField({ companyId: val, departmentId: '', positionId: '' })}
                  options={companyOptionsList.map(c => {
                    const count = vacantCountForCompany(c.id)
                    return {
                      value: String(c.id), name: `${c.companyCode} — ${c.name}`, label: `${c.companyCode} — ${c.name} (${count} kosong)`,
                      badgeText: `${count} kosong`, badgeTone: count > 0 ? 'good' : 'neutral',
                    }
                  })}
                />
              </FormField>
              <FormField label={t('Departemen', 'Department')} required
                hint={!modal.form.companyId
                  ? t('Pilih perusahaan dahulu.', 'Pick a company first.')
                  : onlyVacant && departmentOptions.length < companyDepartments.length
                    ? t(`Menampilkan ${departmentOptions.length} dari ${companyDepartments.length} departemen yang punya kursi kosong.`,
                        `Showing ${departmentOptions.length} of ${companyDepartments.length} departments with a vacant seat.`)
                    : ''}>
                <SearchableSelect
                  value={modal.form.departmentId} disabled={!modal.form.companyId}
                  onChange={val => setField({ departmentId: val, positionId: '' })}
                  options={departmentOptions.map(d => {
                    const count = vacantCountForDepartment(d.id)
                    return {
                      value: String(d.id), name: d.name, label: `${d.name} (${count} kosong)`,
                      badgeText: `${count} kosong`, badgeTone: count > 0 ? 'good' : 'neutral',
                    }
                  })}
                />
              </FormField>
              <div>
                <span className='mb-1.5 block text-xs font-semibold text-gray-600'>
                  {t('Judul Posisi', 'Position Title')} <span className='text-red-500'>*</span>
                </span>
                <SearchableSelect
                  value={modal.form.positionId} disabled={!modal.form.departmentId}
                  onChange={val => {
                    const pos = departmentPositions.find(p => p.id === Number(val))
                    // Default the public title to match — still just a starting
                    // point HR can override, not a locked mirror of the field above.
                    setModal(m => ({ ...m, form: { ...m.form, positionId: val, headcountId: '', publicTitle: pos?.name || '' } }))
                  }}
                  options={positionOptions.map(p => {
                    const count = vacantCountForPosition(p.id)
                    return {
                      value: String(p.id), name: p.name, label: `${p.name} (${count} kosong)`,
                      badgeText: `${count} kosong`, badgeTone: count > 0 ? 'good' : 'neutral',
                    }
                  })}
                />
                <span className='mt-1 block text-xs text-gray-400'>
                  {!modal.form.departmentId
                    ? t('Pilih departemen dahulu.', 'Pick a department first.')
                    : onlyVacant && positionOptions.length < departmentPositions.length
                      ? t(`Menampilkan ${positionOptions.length} dari ${departmentPositions.length} posisi yang punya kursi kosong.`,
                          `Showing ${positionOptions.length} of ${departmentPositions.length} positions with a vacant seat.`)
                      : ''}
                </span>
              </div>
              <FormField label={t('Headcount', 'Headcount')}
                hint={!modal.form.positionId
                  ? t('Pilih posisi dahulu.', 'Pick a position first.')
                  : availableHeadcounts.length === 0
                    ? t('Tidak ada kursi headcount kosong untuk posisi ini — atur di Structure > Headcount.', 'No vacant headcount seat for this position — set one up under Structure > Headcount.')
                    : t('Kursi headcount yang akan ditempati kandidat terpilih — tiap kursi hanya bisa dipakai satu requisition aktif.', 'The headcount seat the selected candidate will fill — each seat can only be claimed by one open requisition at a time.')}>
                <Select value={modal.form.headcountId} disabled={!modal.form.positionId || availableHeadcounts.length === 0}
                  onChange={e => setField({ headcountId: e.target.value })}>
                  <option value=''>—</option>
                  {availableHeadcounts.map(h => <option key={h.id} value={h.id}>{h.code} — {h.name}</option>)}
                </Select>
              </FormField>
              <FormField label={t('Judul Posisi (Publik / Career Site)', 'Position Title (Public / Career Site)')}
                hint={t('Otomatis sama dengan Judul Posisi di atas — ubah kalau nama jabatan internal beda dengan yang ingin ditampilkan ke pelamar.',
                        'Automatically matches the Position Title above — change it if the internal job title should differ from what candidates see.')}>
                <Input value={modal.form.publicTitle} onChange={e => setField({ publicTitle: e.target.value })} />
              </FormField>
              <FormField label={t('Deskripsi Pekerjaan (Publik / Career Site)', 'Job Description (Public / Career Site)')}
                hint={t('Ditampilkan di halaman Career Site — tanggung jawab, kualifikasi, dsb. Baris baru akan tetap terlihat.',
                        'Shown on the Career Site — responsibilities, qualifications, etc. Line breaks are preserved.')}>
                <textarea rows={6} className={inputClass} value={modal.form.jobDescription}
                  onChange={e => setField({ jobDescription: e.target.value })}
                  placeholder={t('Contoh:\nTanggung Jawab:\n- ...\n\nKualifikasi:\n- ...', 'e.g.:\nResponsibilities:\n- ...\n\nQualifications:\n- ...')} />
              </FormField>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label={t('Tipe Kepegawaian', 'Employment Type')}>
                  <Select value={modal.form.employmentType} onChange={e => setField({ employmentType: e.target.value })}>
                    {EMPLOYMENT_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Jumlah Kebutuhan', 'Headcount')}>
                  <Input type='number' min={1} value={modal.form.headcount} onChange={e => setField({ headcount: e.target.value })} />
                </FormField>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label={t('Prioritas', 'Priority')}>
                  <Select value={modal.form.priority} onChange={e => setField({ priority: e.target.value })}>
                    {REQ_PRIORITIES.map(x => <option key={x} value={x}>{x}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Target Tanggal', 'Target Date')}>
                  <Input type='date' value={modal.form.targetDate} onChange={e => setField({ targetDate: e.target.value })} />
                </FormField>
              </div>
              <FormField label='Status' hint={t(
                "Pilih \"Posted External\" untuk mempublikasikan ke Career Site.",
                'Choose "Posted External" to publish this to the Career Site.',
              )}>
                <Select value={modal.form.status} onChange={e => setField({ status: e.target.value })}>
                  {REQ_STATUSES.map(x => <option key={x} value={x}>{x}</option>)}
                </Select>
              </FormField>
              {modal.form.status === 'Posted External' && (
                <div className='grid grid-cols-2 gap-4 rounded-xl bg-blue-50/60 p-3'>
                  <FormField label={t('Publish Start Date', 'Publish Start Date')} hint={t('Kosong = langsung tampil', 'Empty = immediately')}>
                    <Input type='date' value={modal.form.publishStartDate} onChange={e => setField({ publishStartDate: e.target.value })} />
                  </FormField>
                  <FormField label={t('Publish End Date', 'Publish End Date')} hint={t('Kosong = tanpa batas', 'Empty = open-ended')}
                    error={dateRangeInvalid ? t('Harus setelah tanggal mulai.', 'Must be after the start date.') : ''}>
                    <Input type='date' value={modal.form.publishEndDate} onChange={e => setField({ publishEndDate: e.target.value })} />
                  </FormField>
                </div>
              )}
              <FormField label={t('Catatan', 'Notes')}>
                <textarea rows={3} className={inputClass} value={modal.form.notes} onChange={e => setField({ notes: e.target.value })} />
              </FormField>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={close}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={save} icon='💾'
                disabled={!modal.form.positionId || !modal.form.departmentId || !modal.form.companyId || dateRangeInvalid}>
                {t('Simpan', 'Save')}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
