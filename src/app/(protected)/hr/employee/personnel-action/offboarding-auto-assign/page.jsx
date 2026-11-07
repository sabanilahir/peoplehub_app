'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useEmployeeStore }             from '@/store/employeeStore'
import { useStructureStore }            from '@/store/structureStore'
import { usePersonnelActionStore }      from '@/store/personnelActionStore'
import { useOffboardingRulesStore }     from '@/store/offboardingRulesStore'
import { useOffboardingTemplateStore }  from '@/store/offboardingTemplateStore'
import { useOffboardingChecklistStore } from '@/store/offboardingChecklistStore'
import { offboardingRuleMatches }       from '@/lib/offboardingAutoAssign'
import { getTerminatePA, lwdOf }        from '@/lib/offboarding'
import { useT }                         from '@/store/languageStore'
import { PageHeader, BRAND_GRADIENT }   from '@/components/ui'
import { EMP_TYPES }                    from '@/utils/constants'
import OffboardingTemplateManager       from '@/components/offboarding/OffboardingTemplateManager'
import CriteriaMultiSelect              from '@/components/ui/CriteriaMultiSelect'

// ── Small reusables ───────────────────────────────────────────────────────────
function Toggle({ active, onChange }) {
  return (
    <button type='button' onClick={() => onChange(!active)}
      className={`w-10 h-6 rounded-full relative flex-shrink-0 transition-colors ${active ? 'bg-red-500' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${active ? 'left-5' : 'left-1'}`} />
    </button>
  )
}

function Pill({ label, active, onClick }) {
  return (
    <button type='button' onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition
        ${active ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-red-300'}`}>
      {label}
    </button>
  )
}

// ── Rule Modal ────────────────────────────────────────────────────────────────
const BLANK_RULE = {
  name: '', active: true, templateId: '',
  criteria: { employmentTypes: [], departmentIds: [], positionIds: [] },
}

function RuleModal({ rule, templates, departments, positions, employees, t, onSave, onClose }) {
  const [form, setForm] = useState(() => rule ? JSON.parse(JSON.stringify(rule)) : JSON.parse(JSON.stringify(BLANK_RULE)))
  const liveMatchCount = useMemo(
    () => employees.filter(e => e.status === 'Active' && offboardingRuleMatches({ ...form, active: true }, e)).length,
    [employees, form]
  )
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setC = (k, v) => setForm(f => ({ ...f, criteria: { ...f.criteria, [k]: v } }))
  const toggleC = (key, val) => {
    const cur = form.criteria?.[key] ?? []
    setC(key, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val])
  }
  const selectAll = (key, items, allSel) => setC(key, allSel ? [] : items.map(i => i.id))

  const criteriaGroups = [
    { key: 'employmentTypes', label: t('Tipe Kepegawaian', 'Employment Type'), items: EMP_TYPES.map(e => ({ id: e, name: e })) },
    { key: 'departmentIds',   label: 'Department', items: departments },
    { key: 'positionIds',     label: t('Posisi', 'Position'), items: positions },
  ]
  const hasTemplate = !!form.templateId

  return (
    <div className='fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-10 px-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
          <h2 className='text-base font-bold text-gray-800'>{rule ? t('Edit Policy', 'Edit Policy') : t('Policy Baru', 'New Policy')}</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-xl'><Icon e='✕' size={15} /></button>
        </div>

        <div className='p-6 space-y-6'>
          {/* Nama + Status */}
          <div className='flex items-center gap-4'>
            <div className='flex-1'>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>{t('Nama Policy', 'Policy Name')} *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder={t('Contoh: Karyawan Tetap → Standar Offboarding', 'E.g. Permanent → Standard Offboarding')}
                className='w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>Status</label>
              <button type='button' onClick={() => setF('active', !form.active)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition
                  ${form.active ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                {form.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}
              </button>
            </div>
          </div>

          {/* Template */}
          <div>
            <p className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-2'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Template Checklist', 'Checklist Template')} *</p>
            <select value={form.templateId} onChange={e => setF('templateId', e.target.value)}
              className='w-full text-sm px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-red-400 bg-white'>
              <option value=''>— {t('Pilih template', 'Select a template')} —</option>
              {templates.map(tp => <option key={tp.id} value={tp.id}>{tp.name} · {tp.activities.length} {t('tugas', 'tasks')}</option>)}
            </select>
            {!hasTemplate && <p className='text-xs text-orange-600 mt-2'><Icon e='⚠️' size={14} className='inline align-[-2px]' /> {t('Pilih satu template.', 'Select one template.')}</p>}
          </div>

          {/* Kriteria */}
          <div>
            <p className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-1'><Icon e='👥' size={14} className='inline align-[-2px]' /> {t('Kriteria Karyawan', 'Employee Criteria')}</p>
            <p className='text-xs text-gray-400 mb-3'>{t('Kosong = berlaku untuk semua. Policy aktif otomatis mendistribusikan template saat resign disetujui.', 'Empty = applies to all. Active policies auto-distribute the template when a resignation is approved.')}</p>
            <div className='space-y-4 p-4 bg-gray-50 rounded-xl'>
              {criteriaGroups.map(({ key, label, items }) => (
                <CriteriaMultiSelect key={key} label={label} items={items} t={t}
                  selected={form.criteria?.[key] ?? []}
                  onToggle={(id) => toggleC(key, id)}
                  onSelectAll={(allSel) => selectAll(key, items, allSel)} />
              ))}
            </div>
          </div>

          {/* Live match preview */}
          <div className='flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl'>
            <span className='text-base'><Icon e='👥' size={15} /></span>
            <p className='text-xs text-blue-700 font-semibold'>
              {t(
                `Policy ini cocok dengan ${liveMatchCount} karyawan aktif saat ini`,
                `This policy matches ${liveMatchCount} active employees currently`
              )}
            </p>
          </div>
        </div>

        <div className='flex gap-3 px-6 py-4 border-t border-gray-100'>
          <button onClick={() => { if (!form.name.trim() || !hasTemplate) return; onSave({ ...form, templateId: Number(form.templateId) }) }}
            disabled={!form.name.trim() || !hasTemplate}
            className='flex-1 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-40'
            style={{ background: BRAND_GRADIENT }}>
            {rule ? t('Simpan Perubahan', 'Save Changes') : t('Buat Policy', 'Create Policy')}
          </button>
          <button onClick={onClose} className='px-6 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200'>
            {t('Batal', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AutoAssignOffboardingPage() {
  const t = useT()
  const { employees }                             = useEmployeeStore()
  const { positions, departments }                = useStructureStore()
  const { pas }                                   = usePersonnelActionStore()
  const { rules, addRule, updateRule, deleteRule } = useOffboardingRulesStore()
  const { templates }                             = useOffboardingTemplateStore()
  const { items, applyTemplateToEmployee }        = useOffboardingChecklistStore()

  const [tab,       setTab]       = useState('rules')  // 'rules' | 'templates'
  const [modalRule, setModalRule] = useState(null)   // null=closed | false=new | rule obj=edit
  const [delId,     setDelId]     = useState(null)
  const [runResult, setRunResult] = useState({})
  const [msg,       setMsg]       = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  // Employees whose resignation has been approved by HR (the offboarding pipeline).
  const eligible = useMemo(() =>
    (employees || []).filter(e =>
      (pas || []).some(p => p && p.action === 'Terminate' &&
        String(p.employeeId) === String(e.id) && ['Approved', 'Applied'].includes(p.status))),
    [employees, pas])

  const hasChecklist = (empId) => (items || []).some(i => String(i.employeeId) === String(empId))

  // For a rule: resigned employees who match and don't yet have a checklist.
  const getMatched = (rule) => eligible.filter(e => offboardingRuleMatches(rule, e) && !hasChecklist(e.id))

  const handleRun = (rule) => {
    const matched = getMatched(rule)
    if (!matched.length) return flash(t('Tidak ada karyawan resign yang cocok & belum punya checklist.', 'No resigned employees match and still need a checklist.'), 'error')
    const tpl = templates.find(tp => String(tp.id) === String(rule.templateId))
    if (!tpl) return flash(t('Template policy ini tidak ditemukan.', "This policy's template was not found."), 'error')

    let count = 0
    matched.forEach(e => {
      const lwd = lwdOf(getTerminatePA(pas, e.id, ['Approved', 'Applied']))
      applyTemplateToEmployee(e.id, tpl.activities, lwd, { replace: true, templateId: tpl.id, templateName: tpl.name })
      count++
    })
    setRunResult(p => ({ ...p, [rule.id]: { count, at: new Date().toLocaleString('id-ID') } }))
    flash(t(`${count} checklist didistribusikan dari policy "${rule.name}".`, `${count} checklists distributed from policy "${rule.name}".`))
  }

  const tplLabel = (id) => id ? (templates.find(tp => String(tp.id) === String(id))?.name ?? '—') : null
  const dpName   = (id) => departments.find(d => d.id === Number(id))?.name || id
  const posName  = (id) => positions.find(p => p.id === Number(id))?.name || id
  const activeCount = rules.filter(r => r.active).length

  return (
    <div className='min-h-screen bg-gray-50'>
     <div className='max-w-5xl mx-auto px-6 py-8'>
      {/* Toast */}
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span><span>{msg.text}</span>
        </div>
      )}

      <PageHeader icon='⚡'
        title={t('Template & Auto Assign Offboarding', 'Offboarding Templates & Auto Assign')}
        subtitle={t('Kelola template checklist offboarding sekaligus policy auto-assign yang mendistribusikannya otomatis saat resign disetujui.', 'Manage offboarding checklist templates and the auto-assign policies that distribute them automatically when a resignation is approved.')}
        actions={tab === 'rules' ? (
          <button onClick={() => setModalRule(false)}
            className='flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition'
            style={{ background: BRAND_GRADIENT }}>
            + {t('Policy Baru', 'New Policy')}
          </button>
        ) : null}
      />

      {/* Tabs */}
      <div className='mb-6 inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm'>
        {[
          { id: 'rules',     label: t('Policy Auto Assign', 'Auto Assign Policies') },
          { id: 'templates', label: t('Kelola Template', 'Manage Templates') },
        ].map(x => (
          <button key={x.id} onClick={() => setTab(x.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === x.id ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'templates' && <OffboardingTemplateManager />}

      {/* Info banner */}
      {tab === 'rules' && (
      <>
      <div className='mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3'>
        <span className='text-xl mt-0.5'>ℹ️</span>
        <div>
          <p className='text-sm font-bold text-blue-800'>{t('Cara kerja Auto Assign', 'How Auto Assign works')}</p>
          <p className='text-xs text-blue-700 mt-1 leading-relaxed'>
            {t(
              'Saat HR menyetujui pengajuan resign, sistem mencari policy aktif pertama yang cocok dengan karyawan (urutan = prioritas) lalu mendistribusikan template-nya otomatis. Jika tidak ada policy yang cocok, checklist dibiarkan kosong dan HR memilih template secara manual.',
              'When HR approves a resignation, the system finds the first active policy matching the employee (order = priority) and distributes its template automatically. If no policy matches, the checklist is left empty for HR to pick a template manually.'
            )}
          </p>
          {activeCount > 0 && (
            <p className='text-xs font-bold text-blue-800 mt-2'>
              <Icon e='●' size={14} className='inline align-[-2px]' /> {activeCount} {t('policy aktif saat ini', 'policies currently active')}
            </p>
          )}
        </div>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className='py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200'>
          <p className='text-4xl mb-3'><Icon e='⚡' size={15} /></p>
          <p className='text-sm font-semibold text-gray-600 mb-1'>{t('Belum ada policy', 'No policies yet')}</p>
          <p className='text-xs text-gray-400 mb-5'>
            {t('Buat policy pertama untuk mulai mendistribusikan checklist otomatis.', 'Create the first policy to start auto-distributing checklists.')}
          </p>
          <button onClick={() => setModalRule(false)}
            className='px-5 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90'
            style={{ background: BRAND_GRADIENT }}>
            + {t('Policy Baru', 'New Policy')}
          </button>
        </div>
      ) : (
        <div className='space-y-3'>
          {rules.map((rule, idx) => {
            const matched = getMatched(rule)
            const result  = runResult[rule.id]
            const c = rule.criteria ?? {}

            const summ = (names, unitId, unitEn) => names.length <= 2
              ? names.join(', ')
              : `${names.slice(0, 2).join(', ')} +${names.length - 2} ${t(unitId, unitEn)}`
            const critParts = [
              c.employmentTypes?.length && summ(c.employmentTypes, 'tipe', 'types'),
              c.departmentIds?.length   && summ(c.departmentIds.map(dpName), 'dept', 'depts'),
              c.positionIds?.length     && summ(c.positionIds.map(posName), 'posisi', 'positions'),
            ].filter(Boolean)

            return (
              <div key={rule.id}
                className={`bg-white rounded-2xl border-2 p-5 transition ${rule.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    {/* Header */}
                    <div className='flex items-center gap-2 flex-wrap mb-2'>
                      <span className='text-xs font-bold text-gray-400'>#{idx + 1}</span>
                      <span className='font-bold text-gray-800'>{rule.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                        ${rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {rule.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}
                      </span>
                    </div>

                    {/* Template */}
                    <div className='flex flex-wrap gap-1.5 mb-3'>
                      {tplLabel(rule.templateId)
                        ? <span className='text-xs px-2 py-0.5 bg-red-50 text-red-700 font-semibold rounded-full'><Icon e='📋' size={13} className='inline align-[-2px]' /> {tplLabel(rule.templateId)}</span>
                        : <span className='text-xs text-gray-400 italic'>{t('— Belum ada template —', '— No template —')}</span>}
                    </div>

                    {/* Criteria */}
                    <div className='flex items-start gap-2 mb-3'>
                      <span className='text-xs text-gray-400 mt-0.5'><Icon e='👥' size={15} /></span>
                      <span className='text-xs text-gray-500'>
                        {critParts.length > 0 ? critParts.join(' · ') : t('Semua karyawan resign', 'All resigned employees')}
                      </span>
                    </div>

                    {/* Match count + last run */}
                    <div className='flex items-center gap-4 flex-wrap'>
                      <span className={`text-xs font-bold ${matched.length > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                        {matched.length} {t('karyawan resign cocok & belum punya checklist', 'resigned employees match & still need a checklist')}
                      </span>
                      {result && (
                        <span className='text-xs text-gray-400'>
                          <Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Terakhir dijalankan', 'Last run')}: {result.count} — {result.at}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className='flex items-center gap-1.5 flex-shrink-0'>
                    <button onClick={() => setModalRule(rule)}
                      title={t('Edit', 'Edit')}
                      className='px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'><Icon e='✏️' size={15} /></button>
                    <button onClick={() => setDelId(rule.id)}
                      title={t('Hapus', 'Delete')}
                      className='px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 rounded-lg hover:bg-red-100'><Icon e='🗑' size={15} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}

      {/* Rule Modal */}
      {modalRule !== null && (
        <RuleModal
          rule={modalRule || null}
          templates={templates}
          departments={departments}
          positions={positions}
          employees={employees}
          t={t}
          onSave={(data) => {
            if (modalRule?.id) {
              updateRule(modalRule.id, data)
              flash(t('Policy diperbarui.', 'Policy updated.'))
            } else {
              addRule(data)
              flash(t('Policy dibuat. Resign yang cocok akan otomatis menerima checklist saat disetujui.', 'Policy created. Matching resignations will auto-receive a checklist on approval.'))
            }
            setModalRule(null)
          }}
          onClose={() => setModalRule(null)}
        />
      )}

      {/* Delete confirm */}
      {delId && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-80'>
            <h3 className='text-base font-bold text-gray-800 mb-2'>{t('Hapus Policy?', 'Delete Policy?')}</h3>
            <p className='text-sm text-gray-500 mb-5'>{t('Policy ini akan dihapus permanen. Karyawan yang sudah punya checklist tidak terpengaruh.', 'This policy will be permanently deleted. Employees who already have a checklist are not affected.')}</p>
            <div className='flex gap-3'>
              <button onClick={() => { const id = delId; setDelId(null); deleteRule(id); flash(t('Policy dihapus.', 'Policy deleted.')) }}
                className='flex-1 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600'>
                {t('Hapus', 'Delete')}
              </button>
              <button onClick={() => setDelId(null)} className='flex-1 py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200'>
                {t('Batal', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
     </div>
    </div>
  )
}
