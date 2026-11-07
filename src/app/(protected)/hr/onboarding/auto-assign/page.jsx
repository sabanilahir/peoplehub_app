'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo }           from 'react'
import { useMasterOnboardingStore }     from '@/store/masterOnboardingStore'
import { useOnboardingStore }           from '@/store/onboardingStore'
import { useEmployeeStore }             from '@/store/employeeStore'
import { useStructureStore }            from '@/store/structureStore'
import { useOnboardingRulesStore }      from '@/store/onboardingRulesStore'
import { buildOnboardingFromRule, ruleMatchesEmployee } from '@/store/onboardingAutoAssign'
import { useT }                         from '@/store/languageStore'
import { PageHeader, BRAND_GRADIENT }   from '@/components/ui'
import { EMP_TYPES }                    from '@/utils/constants'
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
  name: '', active: true,
  tplGeneral: '', tplTeknis: '', tplReview: '',
  autoSubmit: false, skipExisting: true,
  criteria: { employmentTypes: [], companyIds: [], departmentIds: [], positionIds: [] },
}

function RuleModal({ rule, templates, companies, departments, positions, employees, t, onSave, onClose }) {
  const [form, setForm] = useState(() => rule ? JSON.parse(JSON.stringify(rule)) : JSON.parse(JSON.stringify(BLANK_RULE)))
  const liveMatchCount = useMemo(
    () => employees.filter(e => e.status === 'Active' && ruleMatchesEmployee(form, e)).length,
    [employees, form]
  )
  const setF  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setC  = (k, v) => setForm(f => ({ ...f, criteria: { ...f.criteria, [k]: v } }))
  const toggleC = (key, val) => {
    const cur = form.criteria?.[key] ?? []
    setC(key, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val])
  }
  const selectAll = (key, items, allSel) => setC(key, allSel ? [] : items.map(i => i.id))

  const active = templates.filter(t => t.active)
  const tplsG  = active.filter(t => (t.mainSections ?? []).some(ms => ms.type === 'Onboarding General') || (t.generalItems ?? []).length > 0)
  const tplsT  = active.filter(t => (t.mainSections ?? []).some(ms => ms.type === 'Onboarding Teknis')  || (t.technicalItems ?? []).length > 0)
  const tplsR  = active.filter(t => (t.reviewItems ?? []).length > 0)
  const hasT   = form.tplGeneral || form.tplTeknis || form.tplReview

  const criteriaGroups = [
    { key: 'employmentTypes', label: t('Tipe Kepegawaian', 'Employment Type'), items: EMP_TYPES.map(e => ({ id: e, name: e })) },
    { key: 'companyIds',      label: 'Company',    items: companies.map(c => ({ id: c.id, name: c.name || c.companyCode })) },
    { key: 'departmentIds',   label: 'Department', items: departments },
    { key: 'positionIds',     label: t('Posisi', 'Position'), items: positions },
  ]

  return (
    <div className='fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-10 px-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
          <h2 className='text-base font-bold text-gray-800'>{rule ? t('Edit Rule', 'Edit Rule') : t('Rule Baru', 'New Rule')}</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-xl'><Icon e='✕' size={15} /></button>
        </div>

        <div className='p-6 space-y-6'>
          {/* Nama + Status */}
          <div className='flex items-center gap-4'>
            <div className='flex-1'>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>{t('Nama Rule', 'Rule Name')} *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder={t('Contoh: New Hire - Engineering', 'E.g. New Hire - Engineering')}
                className='w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>Status</label>
              <button type='button' onClick={() => setF('active', !form.active)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition
                  ${form.active ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                {form.active ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>

          {/* Template per seksi */}
          <div>
            <p className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-3'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Template per Seksi', 'Template per Section')}</p>
            <div className='space-y-3 p-4 bg-gray-50 rounded-xl'>
              {[
                { label: 'Onboarding General', key: 'tplGeneral', opts: tplsG },
                { label: 'Onboarding Teknis',  key: 'tplTeknis',  opts: tplsT },
                { label: 'Evaluasi Berkala',   key: 'tplReview',  opts: tplsR },
              ].map(({ label, key, opts }) => (
                <div key={key} className='flex items-center gap-3'>
                  <span className='text-xs font-semibold text-gray-600 w-40 flex-shrink-0'>{label}</span>
                  <select value={form[key]} onChange={e => setF(key, e.target.value)}
                    className='flex-1 text-xs px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-red-400 bg-white'>
                    <option value=''>— {t('Tidak digunakan', 'Not used')} —</option>
                    {opts.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                  </select>
                  {form[key] && <span className='text-green-500 font-bold'><Icon e='✓' size={15} /></span>}
                </div>
              ))}
            </div>
            {!hasT && <p className='text-xs text-orange-600 mt-2'><Icon e='⚠️' size={14} className='inline align-[-2px]' /> {t('Pilih minimal satu template.', 'Select at least one template.')}</p>}
          </div>

          {/* Kriteria */}
          <div>
            <p className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-1'><Icon e='👥' size={14} className='inline align-[-2px]' /> {t('Kriteria Karyawan', 'Employee Criteria')}</p>
            <p className='text-xs text-gray-400 mb-3'>{t('Kosong = berlaku untuk semua. Rule aktif akan otomatis assign karyawan baru yang sesuai.', 'Empty = applies to all. Active rules auto-assign new matching employees.')}</p>
            <div className='space-y-4 p-4 bg-gray-50 rounded-xl'>
              <div className='flex items-center gap-3'>
                <Toggle active={form.skipExisting} onChange={v => setF('skipExisting', v)} />
                <p className='text-xs font-semibold text-gray-700'>{t('Lewati karyawan yang sudah punya onboarding', 'Skip employees who already have onboarding')}</p>
              </div>
              {criteriaGroups.map(({ key, label, items }) => (
                <CriteriaMultiSelect key={key} label={label} items={items} t={t}
                  selected={form.criteria?.[key] ?? []}
                  onToggle={(id) => toggleC(key, id)}
                  onSelectAll={(allSel) => selectAll(key, items, allSel)} />
              ))}
            </div>
          </div>

          {/* Approval note — every auto-assigned onboarding needs supervisor sign-off */}
          <div className='flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl'>
            <span className='text-base'>ℹ️</span>
            <p className='text-xs text-amber-700'>
              {t('Onboarding yang dibuat rule ini tetap perlu persetujuan atasan langsung sebelum karyawan dapat mengerjakannya.', 'Onboarding created by this rule still needs the direct supervisor’s approval before the employee can start.')}
            </p>
          </div>

          {/* Live match preview */}
          <div className='flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl'>
            <span className='text-base'><Icon e='👥' size={15} /></span>
            <p className='text-xs text-blue-700 font-semibold'>
              {t(
                `Rule ini akan cocok dengan ${liveMatchCount} karyawan aktif saat ini`,
                `This rule will match ${liveMatchCount} active employees currently`
              )}
            </p>
          </div>
        </div>

        <div className='flex gap-3 px-6 py-4 border-t border-gray-100'>
          <button onClick={() => { if (!form.name.trim() || !hasT) return; onSave(form) }}
            disabled={!form.name.trim() || !hasT}
            className='flex-1 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-40'
            style={{ background: BRAND_GRADIENT }}>
            {rule ? t('Simpan Perubahan', 'Save Changes') : t('Buat Rule', 'Create Rule')}
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
export default function AutoAssignOnboardingPage() {
  const t                                      = useT()
  const { templates }                          = useMasterOnboardingStore()
  const { onboardings, addOnboarding }         = useOnboardingStore()
  const { employees }                          = useEmployeeStore()
  const { positions, departments, companies }  = useStructureStore()
  const { rules, addRule, updateRule, deleteRule } = useOnboardingRulesStore()

  const [modalRule, setModalRule] = useState(null)   // null=closed | false=new | rule obj=edit
  const [delId,     setDelId]     = useState(null)
  const [runResult, setRunResult] = useState({})
  const [msg,       setMsg]       = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  const assignedEmpIds = useMemo(() => new Set(onboardings.map(o => Number(o.employeeId))), [onboardings])

  const getMatched = (rule) => employees.filter(emp => {
    if (emp.status !== 'Active') return false
    if (rule.skipExisting && assignedEmpIds.has(emp.id)) return false
    return ruleMatchesEmployee(rule, emp)
  })

  const handleRun = (rule) => {
    const matched = getMatched(rule)
    if (!matched.length) return flash(t('Tidak ada karyawan yang cocok dengan rule ini.', 'No employees match this rule.'), 'error')

    let count = 0
    matched.forEach(emp => {
      if (rule.skipExisting && assignedEmpIds.has(emp.id)) return
      addOnboarding(buildOnboardingFromRule(rule, emp, employees))
      count++
    })

    setRunResult(p => ({ ...p, [rule.id]: { count, at: new Date().toLocaleString('id-ID') } }))
    flash(t(`${count} onboarding dibuat dari rule "${rule.name}".`, `${count} records created from rule "${rule.name}".`))
  }

  const tplLabel = (id) => id ? (templates.find(t => String(t.id) === String(id))?.name ?? '—') : null

  const activeCount = rules.filter(r => r.active).length

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span><span>{msg.text}</span>
        </div>
      )}

      <PageHeader icon='⚡'
        title={t('Auto Assign Onboarding', 'Auto Assign Onboarding')}
        subtitle={t('Buat rule untuk assign template onboarding otomatis berdasarkan kriteria karyawan.', 'Create rules to auto-assign onboarding templates based on employee criteria.')}
        actions={
          <button onClick={() => setModalRule(false)}
            className='flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition'
            style={{ background: BRAND_GRADIENT }}>
            + {t('Rule Baru', 'New Rule')}
          </button>
        }
      />

      {/* Info banner */}
      <div className='mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3'>
        <span className='text-xl mt-0.5'>ℹ️</span>
        <div>
          <p className='text-sm font-bold text-blue-800'>{t('Cara kerja Auto Assign', 'How Auto Assign works')}</p>
          <p className='text-xs text-blue-700 mt-1 leading-relaxed'>
            {t(
              'Setiap karyawan baru yang ditambahkan akan otomatis dibuatkan onboarding jika cocok dengan rule aktif (urutan rule = prioritas, rule pertama yang cocok dipakai). Onboarding dibuat berstatus "Menunggu Persetujuan" atasan — sama seperti onboarding manual.',
              'Every new employee is automatically given an onboarding record if they match an active rule (rule order = priority; the first match is used). It is created as "Pending Approval" by the supervisor — exactly like a manual onboarding.'
            )}
          </p>
          {activeCount > 0 && (
            <p className='text-xs font-bold text-blue-800 mt-2'>
              <Icon e='●' size={14} className='inline align-[-2px]' /> {activeCount} {t('rule aktif saat ini', 'rules currently active')}
            </p>
          )}
        </div>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className='py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200'>
          <p className='text-4xl mb-3'><Icon e='⚡' size={15} /></p>
          <p className='text-sm font-semibold text-gray-600 mb-1'>{t('Belum ada rule', 'No rules yet')}</p>
          <p className='text-xs text-gray-400 mb-5'>
            {t('Buat rule pertama untuk mulai assign onboarding otomatis.', 'Create the first rule to start auto-assigning onboarding.')}
          </p>
          <button onClick={() => setModalRule(false)}
            className='px-5 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90'
            style={{ background: BRAND_GRADIENT }}>
            + {t('Rule Baru', 'New Rule')}
          </button>
        </div>
      ) : (
        <div className='space-y-3'>
          {rules.map((rule, idx) => {
            const matched = getMatched(rule)
            const result  = runResult[rule.id]
            const c = rule.criteria ?? {}

            const tplParts = [
              tplLabel(rule.tplGeneral) && `General: ${tplLabel(rule.tplGeneral)}`,
              tplLabel(rule.tplTeknis)  && `Teknis: ${tplLabel(rule.tplTeknis)}`,
              tplLabel(rule.tplReview)  && `Review: ${tplLabel(rule.tplReview)}`,
            ].filter(Boolean)

            const summ = (names, unitId, unitEn) => names.length <= 2
              ? names.join(', ')
              : `${names.slice(0, 2).join(', ')} +${names.length - 2} ${t(unitId, unitEn)}`
            const critParts = [
              c.employmentTypes?.length && summ(c.employmentTypes, 'tipe', 'types'),
              c.companyIds?.length      && `${c.companyIds.length} ${t('perusahaan', 'companies')}`,
              c.departmentIds?.length   && `${c.departmentIds.length} ${t('dept', 'depts')}`,
              c.positionIds?.length     && `${c.positionIds.length} ${t('posisi', 'positions')}`,
            ].filter(Boolean)

            return (
              <div key={rule.id}
                className={`bg-white rounded-2xl border-2 p-5 transition ${rule.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    {/* Header */}
                    <div className='flex items-center gap-2 flex-wrap mb-1'>
                      <span className='text-xs font-bold text-gray-400'>#{idx + 1}</span>
                      <span className='font-bold text-gray-800'>{rule.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                        ${rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {rule.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className='mb-3'>
                      <span className='text-xs text-blue-600 font-medium'><Icon e='👥' size={14} className='inline align-[-2px]' /> {matched.length} {t('karyawan cocok', 'employees match')}</span>
                    </div>

                    {/* Templates */}
                    <div className='flex flex-wrap gap-1.5 mb-3'>
                      {tplParts.length > 0
                        ? tplParts.map((l, i) => <span key={i} className='text-xs px-2 py-0.5 bg-red-50 text-red-700 font-semibold rounded-full'>{l}</span>)
                        : <span className='text-xs text-gray-400 italic'>{t('— Belum ada template dipilih —', '— No templates selected —')}</span>}
                    </div>

                    {/* Criteria */}
                    <div className='flex items-center gap-2 mb-3'>
                      <span className='text-xs text-gray-400'><Icon e='👥' size={15} /></span>
                      <span className='text-xs text-gray-500'>
                        {critParts.length > 0 ? critParts.join(' · ') : t('Semua karyawan aktif', 'All active employees')}
                      </span>
                    </div>

                    {/* Match count + last run */}
                    <div className='flex items-center gap-4 flex-wrap'>
                      <span className={`text-xs font-bold ${matched.length > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                        {matched.length} {t('karyawan cocok saat ini', 'employees currently match')}
                      </span>
                      {result && (
                        <span className='text-xs text-gray-400'>
                          <Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Terakhir dijalankan', 'Last run')}: {result.count} record — {result.at}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className='flex flex-col gap-2 flex-shrink-0'>
                    <button onClick={() => handleRun(rule)}
                      disabled={!rule.active || matched.length === 0}
                      className='flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-30 whitespace-nowrap'
                      style={{ background: BRAND_GRADIENT }}>
                      <Icon e='▶' size={14} className='inline align-[-2px]' /> {t('Jalankan Sekarang', 'Run Now')}
                    </button>
                    <div className='flex gap-1.5'>
                      <button onClick={() => setModalRule(rule)}
                        title={t('Edit', 'Edit')}
                        className='flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'><Icon e='✏️' size={15} /></button>
                      <button onClick={() => updateRule(rule.id, { active: !rule.active })}
                        title={rule.active ? t('Nonaktifkan', 'Deactivate') : t('Aktifkan', 'Activate')}
                        className='flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'>
                        {rule.active ? '⏸' : '▶'}
                      </button>
                      <button onClick={() => setDelId(rule.id)}
                        title={t('Hapus', 'Delete')}
                        className='flex-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 rounded-lg hover:bg-red-100'><Icon e='🗑' size={15} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rule Modal */}
      {modalRule !== null && (
        <RuleModal
          rule={modalRule || null}
          templates={templates}
          companies={companies}
          departments={departments}
          positions={positions}
          employees={employees}
          t={t}
          onSave={(data) => {
            if (modalRule?.id) {
              updateRule(modalRule.id, data)
              flash(t('Rule diperbarui.', 'Rule updated.'))
            } else {
              addRule(data)
              flash(t('Rule dibuat. Karyawan baru yang cocok akan otomatis mendapat onboarding.', 'Rule created. New matching employees will automatically receive onboarding.'))
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
            <h3 className='text-base font-bold text-gray-800 mb-2'>{t('Hapus Rule?', 'Delete Rule?')}</h3>
            <p className='text-sm text-gray-500 mb-5'>{t('Rule ini akan dihapus permanen. Karyawan yang sudah punya onboarding tidak terpengaruh.', 'This rule will be permanently deleted. Employees who already have onboarding are not affected.')}</p>
            <div className='flex gap-3'>
              <button onClick={() => { const id = delId; setDelId(null); deleteRule(id); flash(t('Rule dihapus.', 'Rule deleted.')) }}
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
  )
}
