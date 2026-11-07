'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo, useEffect } from 'react'
import { useAuthStore }      from '@/store/authStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore } from '@/store/personnelActionStore'
import { useOffboardingChecklistStore, OFFBOARDING_CATEGORIES } from '@/store/offboardingChecklistStore'
import { useOffboardingTemplateStore } from '@/store/offboardingTemplateStore'
import { getTerminatePA, lwdOf, addDays, clearanceProgress, daysBetween, todayStr } from '@/lib/offboarding'
import { useT } from '@/store/languageStore'

// ─── Inline line icons (Feather/Lucide style) ──────────────────────────────
const svg = (children, size = 16) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcList  = svg(<><line x1='8' y1='6' x2='21' y2='6' /><line x1='8' y1='12' x2='21' y2='12' /><line x1='8' y1='18' x2='21' y2='18' /><line x1='3' y1='6' x2='3.01' y2='6' /><line x1='3' y1='12' x2='3.01' y2='12' /><line x1='3' y1='18' x2='3.01' y2='18' /></>)
const IcUsers = svg(<><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' /><circle cx='9' cy='7' r='4' /><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' /></>)
const IcUser  = svg(<><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' /><circle cx='12' cy='7' r='4' /></>)
const IcPlus  = svg(<><line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' /></>)
const IcEdit  = svg(<><path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' /><path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' /></>)
const IcTrash = svg(<><polyline points='3 6 5 6 21 6' /><path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' /></>)
const IcLayers = svg(<><polygon points='12 2 2 7 12 12 22 7 12 2' /><polyline points='2 17 12 22 22 17' /><polyline points='2 12 12 17 22 12' /></>)
const IcSend  = svg(<><line x1='22' y1='2' x2='11' y2='13' /><polygon points='22 2 15 22 11 13 2 9 22 2' /></>)
const IcCopy  = svg(<><rect x='9' y='9' width='13' height='13' rx='2' /><path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' /></>)
const IcBack  = svg(<><line x1='19' y1='12' x2='5' y2='12' /><polyline points='12 19 5 12 12 5' /></>)
const IcEye   = svg(<><path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z' /><circle cx='12' cy='12' r='3' /></>)
const IcCheck = svg(<><polyline points='20 6 9 17 4 12' /></>)
const IcClip  = svg(<><path d='M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48' /></>)

const EMPTY_ACT = { category: 'HR', title: '', description: '', picName: '', deadline: '', remark: '' }
const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const initials = (name) => asText(name).trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white'
const TINT = {
  indigo: { text: 'text-red-600', bg: 'bg-red-50', chip: 'bg-red-100 text-red-700' },
  blue:   { text: 'text-rose-600',   bg: 'bg-rose-50',   chip: 'bg-rose-100 text-rose-700' },
}

/**
 * variant:
 *   'hr'     — HR view: both HR + Atasan Langsung checklists, employee = any HR-approved resignation.
 *   'atasan' — Direct-manager view: only the Atasan Langsung checklist, employee = own direct reports
 *              whose resignation has been approved by HR.
 */
export default function OffboardingChecklist({ variant = 'hr' }) {
  const t = useT()
  const isAtasan = variant === 'atasan'

  const { currentUser } = useAuthStore()
  const { employees = [] } = useEmployeeStore()
  const { departments = [], positions = [] } = useStructureStore()
  const { pas = [] } = usePersonnelActionStore()
  const { items = [], addActivity, updateActivity, deleteActivity, applyTemplateToEmployee } = useOffboardingChecklistStore()
  const { templates = [] } = useOffboardingTemplateStore()

  const [empId, setEmpId]   = useState('')
  const [modal, setModal]   = useState(null)   // { mode, act } | null
  const [form, setForm]     = useState({ ...EMPTY_ACT })
  const [confirmDel, setConfirmDel] = useState(null)
  const [msg, setMsg]       = useState(null)
  const [tplId, setTplId]   = useState('')       // selected template to distribute
  const [preview, setPreview] = useState(null)   // { tpl, mode: 'view' | 'distribute' } | null
  const [drafts, setDrafts] = useState([])       // manually-added activities pending apply
  const [evidenceFor, setEvidenceFor] = useState(null)  // activity whose evidence is being edited
  const [confirmToggle, setConfirmToggle] = useState(null)  // activity pending done/undone confirmation
  useEffect(() => { setDrafts([]) }, [empId])    // reset draft when switching employee

  useEffect(() => {
    if (!tplId && templates.length) setTplId(String(templates[0].id))
  }, [templates, tplId])

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const posName = id => positions.find(x => x.id === Number(id))?.name || ''

  // Employees whose resignation (Terminate PA) has been approved by HR.
  // For the atasan variant, restrict to the manager's own direct reports.
  const eligible = useMemo(() => {
    const approved = (employees || []).filter(e =>
      (pas || []).some(p =>
        p && p.action === 'Terminate' &&
        String(p.employeeId) === String(e.id) &&
        ['Approved', 'Applied'].includes(p.status)))
    const scoped = isAtasan && currentUser?.role !== 'superadmin'
      ? approved.filter(e => String(e.managerId) === String(currentUser?.id))
      : approved
    return [...scoped].sort((a, b) => asText(a.name).localeCompare(asText(b.name)))
  }, [employees, pas, isAtasan, currentUser])

  // Intentionally no auto-select: the master view opens on the resign roster
  // (list of employees) and only enters an individual checklist when HR/atasan
  // clicks a card. Clearing empId returns to the roster.

  // Roster rows for the landing list: one card per eligible (approved-resign)
  // employee with LWD, PA status and clearance progress.
  const roster = useMemo(() => eligible.map(e => {
    const pa  = getTerminatePA(pas, e.id, ['Approved', 'Applied'])
    const lwd = lwdOf(pa)
    const clr = clearanceProgress(items, e.id)
    return {
      emp: e, pa, lwd,
      paComplete: pa?.status === 'Applied',
      days: daysBetween(todayStr(), lwd),
      pct: clr.pct, total: clr.total, complete: clr.complete, overdue: clr.overdue,
      dept: dpName(e.departmentId) || e.department || '—',
      position: posName(e.positionId) || e.position || '—',
    }
  }).sort((a, b) => (a.lwd || '').localeCompare(b.lwd || '')), [eligible, pas, items])

  const summary = useMemo(() => {
    const nextLwd = roster.map(r => r.lwd).filter(Boolean).sort()[0] || ''
    return {
      total: roster.length,
      complete: roster.filter(r => r.paComplete).length,
      pending: roster.filter(r => !r.paComplete).length,
      nextLwd,
    }
  }, [roster])

  // No auto-seed: the checklist is populated by the rule-based auto-assign engine
  // when the resignation is approved (see lib/offboardingAutoAssign). Employees
  // who match no rule keep an empty checklist until HR distributes a template.

  const emp = (employees || []).find(e => String(e.id) === String(empId))
  const list = useMemo(
    () => (items || []).filter(i => String(i.employeeId) === String(empId)),
    [items, empId]
  )
  const hrList     = list.filter(i => i.category === 'HR')
  const atasanList = list.filter(i => i.category === 'Atasan Langsung')

  // Committed rows + unsaved manual additions (flagged _draft) rendered inline.
  const draftRow = (d) => ({ ...d, _draft: true, id: d._key })
  const hrRows     = [...hrList, ...drafts.filter(d => d.category === 'HR').map(draftRow)]
  const atasanRows = [...atasanList, ...drafts.filter(d => d.category !== 'HR').map(draftRow)]

  const forcedCategory = isAtasan ? 'Atasan Langsung' : 'HR'
  const openAdd  = (category) => { setForm({ ...EMPTY_ACT, category: category || forcedCategory }); setModal({ mode: 'add' }) }
  const openEdit = (act) => { setForm({ ...EMPTY_ACT, ...act }); setModal({ mode: 'edit', act }) }
  const openEditDraft = (d) => { setForm({ ...EMPTY_ACT, ...d }); setModal({ mode: 'edit', act: d, draft: true }) }

  const draftKey = () => (globalThis.crypto?.randomUUID?.() || `d-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  const handleSave = () => {
    if (!empId) return flash(t('Pilih karyawan terlebih dahulu.', 'Select an employee first.'), 'error')
    if (!asText(form.title).trim()) return flash(t('Nama aktivitas wajib diisi.', 'Activity name is required.'), 'error')
    const category = isAtasan ? 'Atasan Langsung' : form.category
    if (modal.mode === 'add') {
      // New manual activities go to the draft, not straight to the employee.
      setDrafts(d => [...d, { ...form, category, _key: draftKey() }])
      flash(t('Ditambahkan ke list. Klik Simpan untuk submit.', 'Added to the list. Click Save to submit.'))
    } else if (modal.draft) {
      setDrafts(d => d.map(x => x._key === modal.act._key ? { ...x, ...form, category } : x))
      flash(t('Aktivitas diperbarui.', 'Activity updated.'))
    } else {
      updateActivity(modal.act.id, { ...form, category })
      flash(t('Aktivitas diperbarui.', 'Activity updated.'))
    }
    setModal(null)
  }

  // Two-way completion: HR ticks HR tasks, the direct manager ticks theirs —
  // both write to the same store so the Monitor/Tracker stay in sync.
  const toggleDone = (row) => updateActivity(row.id, { status: row.status === 'Complete' ? 'Not Started' : 'Complete' })

  const removeDraft = (key) => setDrafts(d => d.filter(x => x._key !== key))
  const discardDrafts = () => { setDrafts([]); flash(t('Draft dibuang.', 'Draft discarded.')) }
  const applyDrafts = () => {
    if (!drafts.length) return
    drafts.forEach(d => addActivity({
      category: d.category, title: d.title, description: d.description,
      picName: d.picName, deadline: d.deadline, remark: d.remark, employeeId: empId,
    }))
    const n = drafts.length
    setDrafts([])
    flash(t(`${n} aktivitas diterapkan ke checklist ${emp?.name || 'karyawan'}.`, `${n} activities applied to ${emp?.name || 'employee'}'s checklist.`))
  }

  const selectedTpl = templates.find(tp => String(tp.id) === String(tplId)) || null
  const doApplyTemplate = (tpl) => {
    if (!tpl) return
    const lwd = lwdOf(getTerminatePA(pas, empId, ['Approved', 'Applied']))
    applyTemplateToEmployee(empId, tpl.activities, lwd, { replace: true, templateId: tpl.id, templateName: tpl.name, preserveProgress: true })
    setPreview(null)
    flash(t(`Template "${tpl.name}" disebarkan ke ${emp?.name || 'karyawan'}.`, `Template "${tpl.name}" distributed to ${emp?.name || 'employee'}.`))
  }

  // Which template (if any) the employee's current checklist came from
  const appliedTemplateName = useMemo(
    () => list.find(i => i.templateName)?.templateName || '',
    [list]
  )

  const subtitle = isAtasan
    ? t('Aktivitas offboarding yang diisi oleh Atasan Langsung untuk karyawan yang resign-nya telah disetujui HR.', 'Offboarding activities filled by the direct manager for employees whose resignation has been approved by HR.')
    : t('Daftar aktivitas offboarding untuk karyawan yang resign-nya telah disetujui HR.', 'Offboarding activities for employees whose resignation has been approved by HR.')

  const portalLabel = isAtasan ? t('Atasan Langsung', 'Direct Manager') : t('Master Data', 'Master Data')

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-6xl mx-auto px-6 py-8'>

        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isAtasan ? 'text-rose-600 bg-rose-50' : 'text-red-600 bg-red-50'}`}>
              {isAtasan ? <IcUsers /> : <IcList />} {portalLabel}
            </span>
            <h1 className='text-2xl font-bold text-gray-900 mt-2'>Master Employee Offboarding Checklist</h1>
            <p className='text-gray-500 mt-1'>{subtitle}</p>
          </div>
          <div className='flex items-center gap-2 flex-shrink-0'>
            {emp && (
              <button onClick={() => openAdd(forcedCategory)}
                className='flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow hover:shadow-md transition text-sm'>
                <IcPlus /> {t('Tambah Aktivitas', 'Add Activity')}
              </button>
            )}
          </div>
        </div>

        {/* Resign roster — landing list; clicking a card opens that employee's checklist */}
        {!emp && (
          <RosterList
            t={t} roster={roster} summary={summary} isAtasan={isAtasan}
            onOpen={(id) => setEmpId(String(id))} />
        )}

        {/* Detail header — shows the selected employee with a Back to roster button */}
        {emp && (
          <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-4'>
            <button onClick={() => setEmpId('')}
              className='flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-red-600 flex-shrink-0'>
              <IcBack /> {t('Daftar Karyawan', 'Employee List')}
            </button>
            <div className='w-px h-8 bg-gray-100 hidden sm:block' />
            <div className='flex items-center gap-3 min-w-0'>
              <div className='w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white' style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)' }}>
                {initials(emp?.name)}
              </div>
              <div className='min-w-0'>
                <p className='font-bold text-gray-900 truncate'>{emp?.name}</p>
                <p className='text-xs text-gray-500 truncate'>
                  {`${asText(emp.nik)} · ${posName(emp.positionId) || emp.position || '—'} · ${dpName(emp.departmentId) || emp.department || '—'}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Template distribution toolbar — only for employees who have no checklist
            yet (auto-assign already covers everyone matched by a rule). */}
        {!isAtasan && emp && list.length === 0 && (
          <div className='mt-4 bg-gradient-to-r from-rose-50 to-red-50/40 border border-rose-100 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center flex-shrink-0 shadow-sm'><IcLayers /></div>
              <div className='min-w-0'>
                <p className='font-bold text-gray-900 text-sm'>{t('Sebarkan dari Template', 'Distribute from Template')}</p>
                <p className='text-xs text-gray-500'>{t('Terapkan satu set aktivitas siap pakai ke karyawan ini.', 'Apply a ready-made set of activities to this employee.')}</p>
              </div>
            </div>
            <div className='ml-auto flex flex-col items-stretch sm:items-end gap-1.5'>
              <div className='flex items-center gap-2'>
                <select value={tplId} onChange={e => setTplId(e.target.value)}
                  className='min-w-[220px] px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white'>
                  {templates.length === 0
                    ? <option value=''>{t('Belum ada template', 'No templates yet')}</option>
                    : templates.map(tp => <option key={tp.id} value={tp.id}>{tp.name} · {tp.activities.length} {t('tugas', 'tasks')}</option>)}
                </select>
                <button onClick={() => selectedTpl && setPreview({ tpl: selectedTpl, mode: 'view' })} disabled={!selectedTpl}
                  className='flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 font-semibold px-3.5 py-2.5 rounded-xl hover:border-red-300 hover:text-red-600 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed'>
                  <IcEye /> {t('Lihat isi', 'View')}
                </button>
                <button onClick={() => selectedTpl && setPreview({ tpl: selectedTpl, mode: 'distribute' })} disabled={!selectedTpl}
                  className='flex items-center gap-2 bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow hover:bg-red-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed'>
                  <IcSend /> {t('Sebarkan', 'Distribute')}
                </button>
              </div>
              {selectedTpl && (
                <p className='text-xs text-gray-500 sm:text-right max-w-md'>
                  {selectedTpl.description || t('Tanpa deskripsi', 'No description')}
                  <span className='text-gray-400'> · {selectedTpl.activities.filter(a => a.category === 'HR').length} HR · {selectedTpl.activities.filter(a => a.category !== 'HR').length} {t('Atasan', 'Manager')}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {eligible.length === 0 && (
          <div className='mt-4 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700'>
            {isAtasan
              ? t('Belum ada anggota tim dengan pengajuan resign yang disetujui HR.', 'No team members with an HR-approved resignation yet.')
              : t('Belum ada karyawan dengan pengajuan resign yang disetujui HR. Setujui PA Terminate terlebih dahulu.', 'No employees with an HR-approved resignation yet. Approve a PA Terminate first.')}
          </div>
        )}

        {/* No checklist yet — no auto-assign rule matched, HR distributes manually */}
        {emp && list.length === 0 && (
          <div className='mt-4 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700 flex items-start gap-2'>
            <span className='mt-0.5'>ℹ️</span>
            <span>{isAtasan
              ? t('Checklist untuk karyawan ini belum didistribusikan oleh HR.', 'HR has not distributed a checklist for this employee yet.')
              : t('Karyawan ini belum menerima checklist (tidak ada rule auto-assign yang cocok). Pilih template di atas lalu klik "Sebarkan", atau atur rule di menu Auto Assign Offboarding.', 'This employee has no checklist yet (no auto-assign rule matched). Pick a template above and click "Distribute", or set up a rule under Auto Assign Offboarding.')}</span>
          </div>
        )}

        {/* Stat cards */}
        {emp && (
          <div className={`mt-4 grid grid-cols-1 gap-4 ${isAtasan ? '' : 'sm:grid-cols-2'}`}>
            {!isAtasan && <StatCard label={t('Total Aktivitas HR', 'Total HR Activities')} value={hrList.length} icon={<IcList />} tint='indigo' />}
            <StatCard
              label={isAtasan ? t('Total Aktivitas', 'Total Activities') : t('Total Aktivitas Atasan Langsung', 'Total Direct-Manager Activities')}
              value={atasanList.length} icon={<IcUsers />} tint='blue' />
          </div>
        )}

        {/* Template provenance badge */}
        {emp && appliedTemplateName && (
          <div className='mt-4 flex items-center gap-2 text-sm'>
            <span className='inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-red-600 bg-red-50'>
              <IcLayers /> {t('Checklist dari template', 'Checklist from template')}: {appliedTemplateName}
            </span>
          </div>
        )}

        {/* Checklists — committed rows plus unsaved manual additions inline */}
        {emp && (
          <>
            {!isAtasan && (
              <ChecklistSection
                title={t('Checklist HR', 'HR Checklist')} icon={<IcList />} tint='indigo'
                rows={hrRows} t={t} onAdd={() => openAdd('HR')} onEdit={openEdit} onDelete={setConfirmDel}
                onEditDraft={openEditDraft} onRemoveDraft={removeDraft} onToggleStatus={setConfirmToggle} onEvidence={setEvidenceFor} />
            )}
            <ChecklistSection
              title={t('Checklist Atasan Langsung', 'Direct-Manager Checklist')} icon={<IcUsers />} tint='blue'
              rows={atasanRows} t={t} onAdd={() => openAdd('Atasan Langsung')} onEdit={openEdit} onDelete={setConfirmDel}
              onEditDraft={openEditDraft} onRemoveDraft={removeDraft} onToggleStatus={setConfirmToggle} onEvidence={setEvidenceFor} />
          </>
        )}

        {/* Bottom submit bar — appears when there are unsaved manual additions */}
        {emp && drafts.length > 0 && (
          <div className='mt-6 sticky bottom-4 z-10 bg-white rounded-2xl shadow-lg border border-amber-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3'>
            <p className='text-sm text-gray-600 flex items-center gap-2'>
              <span className='w-2 h-2 rounded-full bg-amber-400 animate-pulse' />
              <span><span className='font-bold text-gray-900'>{drafts.length}</span> {t('aktivitas baru belum disimpan.', 'new activities not yet saved.')}</span>
            </p>
            <div className='flex items-center gap-2'>
              <button onClick={discardDrafts} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batalkan', 'Discard')}</button>
              <button onClick={applyDrafts} className='flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-xl shadow hover:shadow-md transition'>
                <IcCheck /> {t('Simpan & Submit ke Karyawan', 'Save & Submit to Employee')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b'>
              <h2 className='font-bold text-gray-900'>{modal.mode === 'add' ? t('Tambah Aktivitas', 'Add Activity') : t('Edit Aktivitas', 'Edit Activity')}</h2>
              <button onClick={() => setModal(null)} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              {!isAtasan && (
                <F label={t('Kategori', 'Category')}>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {OFFBOARDING_CATEGORIES.map(c => <option key={c} value={c}>{c === 'HR' ? 'HR' : t('Atasan Langsung', 'Direct Manager')}</option>)}
                  </select>
                </F>
              )}
              <F label={t('Aktivitas', 'Activity')}>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('Nama aktivitas', 'Activity name')} className={inputCls} />
              </F>
              <F label={t('Deskripsi', 'Description')}>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('Keterangan singkat', 'Short description')} className={inputCls} />
              </F>
              <div className='grid grid-cols-2 gap-4'>
                <F label='PIC Name'>
                  <input value={form.picName} onChange={e => setForm(f => ({ ...f, picName: e.target.value }))}
                    placeholder='PIC' className={inputCls} />
                </F>
                <F label='Deadline'>
                  <input type='date' value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={inputCls} />
                </F>
              </div>
              <F label='Remark'>
                <textarea rows={2} value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                  placeholder={t('Catatan tambahan', 'Additional notes')} className={`${inputCls} resize-none`} />
              </F>
            </div>
            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50'>
              <button onClick={() => setModal(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
              <button onClick={handleSave} className='px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow'>{modal.mode === 'add' ? t('Tambah ke List', 'Add to List') : t('Simpan', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl p-6 shadow-2xl w-80'>
            <p className='font-bold text-gray-900 mb-2'>{t('Hapus aktivitas ini?', 'Delete this activity?')}</p>
            <p className='text-sm text-gray-500 mb-5'>{t('Tindakan ini tidak bisa dibatalkan.', 'This action cannot be undone.')}</p>
            <div className='flex gap-2 justify-end'>
              <button onClick={() => setConfirmDel(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
              <button onClick={() => { deleteActivity(confirmDel); setConfirmDel(null); flash(t('Aktivitas dihapus.', 'Activity deleted.')) }}
                className='px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Template preview — read-only ('view') or distribution ('distribute') */}
      {preview && (
        <TemplatePreview
          t={t}
          tpl={preview.tpl}
          mode={preview.mode}
          empName={emp?.name}
          existing={list}
          lwd={lwdOf(getTerminatePA(pas, empId, ['Approved', 'Applied']))}
          onClose={() => setPreview(null)}
          onSwitchToDistribute={() => setPreview(p => ({ ...p, mode: 'distribute' }))}
          onDistribute={() => doApplyTemplate(preview.tpl)}
        />
      )}

      {/* Evidence attach (two-way: HR or the direct manager) */}
      {evidenceFor && (
        <EvidenceModal
          activity={evidenceFor} t={t}
          onClose={() => setEvidenceFor(null)}
          onSave={(value) => { updateActivity(evidenceFor.id, { evidence: value }); setEvidenceFor(null); flash(t('Evidence disimpan.', 'Evidence saved.')) }}
        />
      )}

      {/* Confirm mark done / not done */}
      {confirmToggle && (() => {
        const done = confirmToggle.status === 'Complete'
        return (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm' onClick={() => setConfirmToggle(null)}>
            <div className='bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm' onClick={e => e.stopPropagation()}>
              <p className='font-bold text-gray-900 mb-2'>{done ? t('Tandai belum selesai?', 'Mark as not done?') : t('Tandai tugas ini selesai?', 'Mark this task as done?')}</p>
              <p className='text-sm text-gray-500 mb-1'><span className='font-semibold text-gray-700'>{asText(confirmToggle.title)}</span></p>
              <p className='text-sm text-gray-500 mb-5'>
                {done
                  ? t('Status akan dikembalikan ke belum selesai.', 'The status will be set back to not done.')
                  : t('Pastikan aktivitas ini benar-benar sudah dilakukan.', 'Make sure this activity has genuinely been completed.')}
              </p>
              <div className='flex gap-2 justify-end'>
                <button onClick={() => setConfirmToggle(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
                <button onClick={() => { toggleDone(confirmToggle); setConfirmToggle(null); flash(done ? t('Ditandai belum selesai.', 'Marked as not done.') : t('Ditandai selesai.', 'Marked as done.')) }}
                  className={`flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-xl shadow ${done ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}`}>
                  <IcCheck /> {done ? t('Ya, belum selesai', 'Yes, not done') : t('Ya, selesai', 'Yes, done')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {msg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

function F({ label, children }) {
  return <div><p className='text-sm font-semibold text-gray-800 mb-1.5'>{label}</p>{children}</div>
}

const fmtLong = (d) => {
  const s = asText(d)
  if (!s) return '—'
  const dt = new Date(s)
  if (isNaN(dt.getTime())) return s
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Resign roster (landing) ──────────────────────────────────────────────────
// Opens on a list of resigned employees so HR/atasan pick a person before
// seeing any checklist detail. Clicking a card enters that employee's checklist.
function RosterList({ t, roster, summary, isAtasan, onOpen }) {
  const tiles = [
    { label: t('Total Resign', 'Total Resign'), value: summary.total, icon: <IcUsers />, tint: 'text-red-600 bg-red-50' },
    { label: t('PA Terminate Complete', 'PA Terminate Complete'), value: summary.complete, icon: <IcCheck />, tint: 'text-green-600 bg-green-50' },
    { label: t('PA Terminate Pending', 'PA Terminate Pending'), value: summary.pending, icon: <IcClip />, tint: 'text-amber-600 bg-amber-50' },
    { label: t('LWD Terdekat', 'Nearest LWD'), value: fmtLong(summary.nextLwd), icon: <IcList />, tint: 'text-rose-600 bg-rose-50', small: true },
  ]

  return (
    <div className='mt-6 space-y-6'>
      {/* Summary panel */}
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-50'>
          <p className='font-bold text-gray-900 text-sm'>{t('Ringkasan karyawan resign', 'Resigned-employee summary')}</p>
          <p className='text-xs text-gray-500 mt-0.5'>{t('Klik karyawan untuk membuka checklist offboarding.', 'Click an employee to open their offboarding checklist.')}</p>
        </div>
        <div className='px-5 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {tiles.map(x => (
            <div key={x.label} className='rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-2'>
              <div className='min-w-0'>
                <p className='text-xs text-gray-500 truncate'>{x.label}</p>
                <p className={`font-bold text-gray-900 mt-0.5 ${x.small ? 'text-base' : 'text-2xl'}`}>{x.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${x.tint}`}>{x.icon}</div>
            </div>
          ))}
        </div>
        {/* Compact table */}
        <div className='overflow-x-auto border-t border-gray-50'>
          <table className='w-full text-sm min-w-[640px]'>
            <thead>
              <tr className='bg-gray-50 border-b'>
                {[t('Karyawan', 'Employee'), t('Departemen', 'Department'), 'LWD', t('Progres', 'Progress'), 'PA Terminate'].map(h => (
                  <th key={h} className='text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                ))}
                <th className='px-5 py-2.5' />
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {roster.length === 0 ? (
                <tr><td colSpan={6} className='text-center py-8 text-gray-400 text-sm'>{t('Belum ada karyawan resign.', 'No resigned employees yet.')}</td></tr>
              ) : roster.map(r => (
                <tr key={r.emp.id} onClick={() => onOpen(r.emp.id)} className='cursor-pointer hover:bg-red-50/40 transition group'>
                  <td className='px-5 py-2.5 font-semibold text-gray-800 group-hover:text-red-600'>{asText(r.emp.name)}</td>
                  <td className='px-5 py-2.5 text-gray-600'>{r.dept}</td>
                  <td className='px-5 py-2.5 text-gray-600 whitespace-nowrap'>{fmtLong(r.lwd)}</td>
                  <td className='px-5 py-2.5'>
                    <span className='inline-flex items-center gap-2'>
                      <span className='w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden'><span className='block h-full bg-green-500' style={{ width: `${r.pct}%` }} /></span>
                      <span className='text-xs text-gray-500'>{r.pct}%</span>
                    </span>
                  </td>
                  <td className='px-5 py-2.5'>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${r.paComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.paComplete ? 'Complete' : 'Pending'}
                    </span>
                  </td>
                  <td className='px-5 py-2.5 text-right text-gray-300 group-hover:text-red-500'>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EvidenceModal({ activity, t, onClose, onSave }) {
  const [link, setLink] = useState(activity.evidence || '')
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm' onClick={onClose}>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden' onClick={e => e.stopPropagation()}>
        <div className='flex items-center justify-between px-6 py-4 border-b'>
          <h2 className='font-bold text-gray-900'>{t('Lampirkan Evidence', 'Attach Evidence')}</h2>
          <button onClick={onClose} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
        </div>
        <div className='px-6 py-5 space-y-4'>
          <p className='text-xs text-gray-500'>{t('Aktivitas', 'Activity')}: <span className='font-semibold text-gray-700'>{asText(activity.title)}</span></p>
          <div>
            <p className='text-sm font-semibold text-gray-800 mb-1.5'>{t('Link Evidence', 'Evidence Link')}</p>
            <input value={link} onChange={e => setLink(e.target.value)} placeholder='https://…'
              className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500' />
          </div>
          <div>
            <p className='text-sm font-semibold text-gray-800 mb-1.5'>{t('atau Upload File', 'or Upload File')}</p>
            <input type='file' onChange={e => { const f = e.target.files?.[0]; if (f) setLink(f.name) }}
              className='w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-red-50 file:text-red-700 file:text-sm file:font-semibold' />
            <p className='text-[11px] text-gray-400 mt-1'>{t('Nama file dicatat sebagai bukti (prototype, file tidak diunggah).', 'The file name is recorded as proof (prototype — file is not uploaded).')}</p>
          </div>
        </div>
        <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50'>
          {activity.evidence && (
            <button onClick={() => onSave('')} className='mr-auto px-3 py-2 text-sm text-red-500 rounded-xl hover:bg-red-50'>{t('Hapus', 'Remove')}</button>
          )}
          <button onClick={onClose} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
          <button onClick={() => onSave(link.trim())} className='px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700'>{t('Simpan', 'Save')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Template preview: read-only browsing or the distribution step ───────────
function TemplatePreview({ t, tpl, mode, empName, existing = [], lwd, onClose, onSwitchToDistribute, onDistribute }) {
  const isDistribute = mode === 'distribute'
  const acts = tpl.activities
  const groups = [
    { key: 'HR', label: t('Checklist HR', 'HR Checklist'), rows: acts.filter(a => a.category === 'HR') },
    { key: 'AL', label: t('Checklist Atasan Langsung', 'Direct-Manager Checklist'), rows: acts.filter(a => a.category !== 'HR') },
  ].filter(g => g.rows.length)

  // What happens to the employee's current checklist when this template is
  // distributed: tasks with a matching category+title keep their progress; the
  // rest are removed. Surface completed-task losses before HR confirms.
  const keyOf = (a) => `${a.category || 'HR'}||${asText(a.title).trim().toLowerCase()}`
  const tplKeys = new Set(acts.map(keyOf))
  const carriedOver = existing.filter(i => tplKeys.has(keyOf(i)))
  const dropped     = existing.filter(i => !tplKeys.has(keyOf(i)))
  const keptDone    = carriedOver.filter(i => i.status === 'Complete').length
  const droppedDone = dropped.filter(i => i.status === 'Complete').length
  const hasExisting = existing.length > 0

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm' onClick={onClose}>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden' onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className='px-6 py-4 border-b flex items-start justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-red-600'>{isDistribute ? <IcSend /> : <IcEye />}</span>
              <h2 className='font-bold text-gray-900'>{isDistribute ? t('Pratinjau Sebelum Menyebarkan', 'Preview Before Distributing') : t('Isi Template', 'Template Contents')}</h2>
            </div>
            <p className='text-sm text-gray-500 mt-1'>
              <span className='font-semibold text-gray-700'>{tpl.name}</span> · {acts.length} {t('tugas', 'tasks')}
              {isDistribute && empName && <> → <span className='font-semibold text-gray-700'>{empName}</span></>}
              {isDistribute && lwd && <span className='text-gray-400'> · LWD {fmtDate(lwd)}</span>}
            </p>
            {!isDistribute && tpl.description && <p className='text-xs text-gray-400 mt-1'>{tpl.description}</p>}
          </div>
          <button onClick={onClose} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0'><Icon e='✕' size={15} /></button>
        </div>

        {/* Task list */}
        <div className='px-6 py-4 overflow-y-auto flex-1 space-y-5'>
          {groups.map(g => (
            <div key={g.key}>
              <p className='text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2'>{g.label} ({g.rows.length})</p>
              <div className='border border-gray-100 rounded-xl overflow-x-auto'>
                <table className='w-full text-sm min-w-[560px]'>
                  <thead>
                    <tr className='bg-gray-50 border-b'>
                      {['#', t('Aktivitas', 'Activity'), 'PIC', 'Deadline', 'Remark'].map(h => (
                        <th key={h} className='text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-50'>
                    {g.rows.map((a, i) => (
                      <tr key={i} className='align-top'>
                        <td className='px-3 py-2 text-gray-400 text-xs'>{i + 1}</td>
                        <td className='px-3 py-2'>
                          <p className='font-semibold text-gray-800'>{asText(a.title)}</p>
                          {a.description && <p className='text-xs text-gray-400'>{asText(a.description)}</p>}
                        </td>
                        <td className='px-3 py-2 text-gray-700 text-xs whitespace-nowrap'>{a.picName ? asText(a.picName) : <span className='text-gray-300'>—</span>}</td>
                        <td className='px-3 py-2 whitespace-nowrap'>
                          {isDistribute && lwd
                            ? <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600'>{fmtDate(addDays(lwd, -(Number(a.dueOffset) || 0)))}</span>
                            : <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500'>{dueLabel(a.dueOffset, t)}</span>}
                          {isDistribute && lwd && <span className='block text-[10px] text-gray-400 mt-0.5'>{dueLabel(a.dueOffset, t)}</span>}
                        </td>
                        <td className='px-3 py-2 text-gray-500 text-xs'>{a.remark ? asText(a.remark) : <span className='text-gray-300'>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {acts.length === 0 && (
            <p className='text-center py-10 text-gray-400 text-sm'>{t('Template ini belum memiliki aktivitas.', 'This template has no activities yet.')}</p>
          )}
          {isDistribute && !hasExisting && (
            <p className='text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2'>
              {t('Karyawan ini belum punya checklist. Template ini akan menjadi checklist pertamanya.', 'This employee has no checklist yet. This template will become their first one.')}
            </p>
          )}
          {isDistribute && hasExisting && (
            <div className='text-xs rounded-lg px-3 py-2.5 space-y-1.5 bg-amber-50 border border-amber-100 text-amber-700'>
              <p className='font-semibold'>{t('Karyawan ini sudah punya checklist. Saat disebarkan:', 'This employee already has a checklist. On distribute:')}</p>
              <p className='flex items-start gap-1.5 text-green-700'>
                <span>✓</span>
                <span>{t(`${carriedOver.length} tugas dengan judul sama dipertahankan progres-nya${keptDone ? ` (${keptDone} sudah selesai)` : ''}.`, `${carriedOver.length} task(s) with a matching title keep their progress${keptDone ? ` (${keptDone} already done)` : ''}.`)}</span>
              </p>
              {dropped.length > 0 && (
                <p className='flex items-start gap-1.5 text-red-600'>
                  <span>✕</span>
                  <span>{t(`${dropped.length} tugas lama di luar template ini akan dihapus${droppedDone ? ` — termasuk ${droppedDone} yang sudah selesai` : ''}.`, `${dropped.length} existing task(s) not in this template will be removed${droppedDone ? ` — including ${droppedDone} already done` : ''}.`)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50'>
          {isDistribute ? (
            <>
              <button onClick={onClose} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
              <button onClick={onDistribute} disabled={acts.length === 0}
                className='flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow disabled:opacity-50 disabled:cursor-not-allowed'>
                <IcSend /> {t('Sebarkan Sekarang', 'Distribute Now')}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Tutup', 'Close')}</button>
              <button onClick={onSwitchToDistribute} disabled={acts.length === 0}
                className='flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow disabled:opacity-50 disabled:cursor-not-allowed'>
                <IcSend /> {t('Sebarkan Template Ini', 'Distribute This Template')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


function dueLabel(offset, t) {
  const n = Number(offset) || 0
  if (n === 0) return t('Pada LWD', 'On LWD')
  if (n > 0) return `H-${n}`
  return `H+${Math.abs(n)}`
}

function StatCard({ label, value, icon, tint }) {
  const c = TINT[tint] || TINT.indigo
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 flex items-center justify-between'>
      <div>
        <p className='text-sm text-gray-500'>{label}</p>
        <p className='text-3xl font-bold text-gray-900 mt-1'>{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>{icon}</div>
    </div>
  )
}

function fmtDate(d) {
  const s = asText(d)
  if (!s) return '—'
  const dt = new Date(s)
  if (isNaN(dt.getTime())) return s
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function ChecklistSection({ title, icon, tint, rows, t, onAdd, onEdit, onDelete, onEditDraft, onRemoveDraft, onToggleStatus, onEvidence }) {
  const c = TINT[tint] || TINT.indigo
  const draftCount = rows.filter(r => r._draft).length
  const saved = rows.filter(r => !r._draft)
  const doneCount = saved.filter(r => r.status === 'Complete').length
  const pct = saved.length ? Math.round((doneCount / saved.length) * 100) : 0
  return (
    <div className='mt-6'>
      <div className='flex items-center justify-between mb-3'>
        <p className={`flex items-center gap-2 font-bold ${c.text}`}>
          {icon} {title} ({rows.length})
          {draftCount > 0 && <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'>{draftCount} {t('belum disimpan', 'unsaved')}</span>}
        </p>
        <div className='flex items-center gap-3'>
          {saved.length > 0 && (
            <span className='flex items-center gap-1.5 text-xs text-gray-500'>
              <span className='w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden'><span className='block h-full bg-green-500' style={{ width: `${pct}%` }} /></span>
              {doneCount}/{saved.length} {t('selesai', 'done')}
            </span>
          )}
          <button onClick={onAdd} className='flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800'>
            <IcPlus /> {t('Tambah', 'Add')}
          </button>
        </div>
      </div>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto'>
        <table className='w-full text-sm min-w-[760px]'>
          <thead>
            <tr className='bg-gray-50 border-b'>
              {[t('Selesai', 'Done'), '#', t('Aktivitas', 'Activity'), 'PIC Name', 'Deadline', 'Remark', t('Aksi', 'Action')].map(h => (
                <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-50'>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className='text-center py-10 text-gray-400 text-sm'>{t('Belum ada aktivitas', 'No activities yet')}</td></tr>
            ) : rows.map((r, i) => {
              const done = r.status === 'Complete'
              return (
              <tr key={r.id ?? i} className={r._draft ? 'bg-amber-50/50 hover:bg-amber-50' : done ? 'bg-green-50/40 hover:bg-green-50/60' : 'hover:bg-gray-50/50'}>
                <td className='px-4 py-3'>
                  <button
                    onClick={() => !r._draft && onToggleStatus?.(r)}
                    disabled={r._draft}
                    title={r._draft ? t('Simpan dulu', 'Save first') : done ? t('Tandai belum selesai', 'Mark as not done') : t('Tandai selesai', 'Mark as done')}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition ${r._draft ? 'border-gray-200 text-gray-300 cursor-not-allowed' : done ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' : 'border-gray-300 text-transparent hover:border-green-500 hover:text-green-400'}`}>
                    <IcCheck />
                  </button>
                </td>
                <td className='px-4 py-3 text-gray-400 text-xs'>{i + 1}</td>
                <td className='px-4 py-3'>
                  <p className={`font-semibold flex items-center gap-2 ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {asText(r.title)}
                    {r._draft && <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 no-underline'>{t('Belum disimpan', 'Unsaved')}</span>}
                    {done && r.completedAt && <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 no-underline'>{t('selesai', 'done')} {fmtDate(r.completedAt)}</span>}
                  </p>
                  {r.description && <p className='text-xs text-gray-400'>{asText(r.description)}</p>}
                </td>
                <td className='px-4 py-3 text-gray-700'>{r.picName ? asText(r.picName) : <span className='text-gray-300'>—</span>}</td>
                <td className='px-4 py-3'>
                  {r.deadline
                    ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r._draft ? 'bg-amber-100 text-amber-700' : c.chip}`}>{fmtDate(r.deadline)}</span>
                    : <span className='text-gray-300 text-xs'>—</span>}
                </td>
                <td className='px-4 py-3 text-gray-600 text-xs'>{r.remark ? asText(r.remark) : <span className='text-gray-300'>—</span>}</td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-1'>
                    {!r._draft && (
                      <button onClick={() => onEvidence?.(r)} title={r.evidence ? asText(r.evidence) : t('Lampirkan evidence', 'Attach evidence')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${r.evidence ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}><IcClip /></button>
                    )}
                    <button onClick={() => r._draft ? onEditDraft(r) : onEdit(r)} title={t('Edit', 'Edit')}
                      className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50'><IcEdit /></button>
                    <button onClick={() => r._draft ? onRemoveDraft(r._key) : onDelete(r.id)} title={t('Hapus', 'Delete')}
                      className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50'><IcTrash /></button>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
