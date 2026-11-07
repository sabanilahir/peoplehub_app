'use client'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOvertimeStore } from '@/store/overtimeStore'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, FormField, Input, Select, ActionButton } from '@/components/ui'
import CriteriaMultiSelect from '@/components/ui/CriteriaMultiSelect'
import { EMP_TYPES } from '@/utils/constants'

function Toggle({ active, onChange }) {
  return (
    <button type='button' onClick={() => onChange(!active)}
      className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${active ? 'bg-teal-500' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${active ? 'left-5' : 'left-1'}`} />
    </button>
  )
}

const BLANK = {
  name: '', active: true,
  companyIds: [], departmentIds: [], gradeFromId: '', gradeToId: '', location: '', employmentType: '',
  autoApprovePlan: false, autoApproveRealization: false,
  compensationType: 'Overtime Allowance', matrixId: '',
  notes: '',
}

export default function EligibilityGroupDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const t = useT()
  const isNew = id === 'new'
  const { eligibilityGroups, overtimeMatrices, addGroup, updateGroup } = useOvertimeStore()
  const { companies, departments, grades } = useStructureStore()

  const existing = !isNew ? eligibilityGroups.find(g => String(g.id) === String(id)) : null
  const sortedGrades = useMemo(() => [...grades].sort((a, b) => a.id - b.id), [grades])
  const companyItems = useMemo(() => companies.map(c => ({ id: c.id, name: c.name || c.companyCode })), [companies])
  const departmentItems = useMemo(() => departments.map(d => ({ id: d.id, name: d.name })), [departments])
  const activeMatrices = overtimeMatrices.filter(m => m.active)

  const [form, setForm] = useState(BLANK)
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name, active: existing.active,
        companyIds: existing.companyIds || [], departmentIds: existing.departmentIds || [],
        gradeFromId: existing.gradeFromId ? String(existing.gradeFromId) : '',
        gradeToId: existing.gradeToId ? String(existing.gradeToId) : '',
        location: existing.location || '', employmentType: existing.employmentType || '',
        autoApprovePlan: !!existing.autoApprovePlan, autoApproveRealization: !!existing.autoApproveRealization,
        compensationType: existing.compensationType || 'Overtime Allowance',
        matrixId: existing.matrixId ? String(existing.matrixId) : '',
        notes: existing.notes || '',
      })
    }
  }, [existing?.id])

  if (!isNew && !existing) {
    return (
      <div className='flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-400'>
        <span className='text-5xl'>🧩</span>
        <p className='text-sm font-semibold'>{t('Eligibility Group tidak ditemukan.', 'Eligibility Group not found.')}</p>
        <ActionButton onClick={() => router.push('/hr/time-labour/eligibility-group')}>{t('Kembali', 'Back')}</ActionButton>
      </div>
    )
  }

  const toggleIn = (key, val) => setForm(f => {
    const cur = f[key] ?? []
    return { ...f, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] }
  })
  const selectAllIn = (key, items, allSel) => setForm(f => ({ ...f, [key]: allSel ? [] : items.map(i => i.id) }))

  // Flow preview — an approval step is inserted after Plan / after
  // Realization unless that stage is set to auto-approve.
  const flowSteps = [
    { key: 'plan', label: t('Overtime Plan by Employee', 'Overtime Plan by Employee') },
    ...(!form.autoApprovePlan ? [{ key: 'planApproval', label: t('Overtime Plan Approval', 'Overtime Plan Approval'), approval: true }] : []),
    { key: 'realization', label: t('Overtime Realization by Employee', 'Overtime Realization by Employee') },
    ...(!form.autoApproveRealization ? [{ key: 'realizationApproval', label: t('Overtime Realization Approval', 'Overtime Realization Approval'), approval: true }] : []),
  ]

  const handleSave = () => {
    if (!form.name.trim())
      return flash(t('Nama group wajib diisi.', 'Group name is required.'), 'error')
    if (Boolean(form.gradeFromId) !== Boolean(form.gradeToId))
      return flash(t('Grade Dari dan Grade Sampai harus diisi berdua, atau kosongkan berdua untuk "Semua Grade".',
        'Fill in both Grade From and Grade To, or leave both blank for "All Grades".'), 'error')
    if (form.compensationType === 'Overtime Allowance' && !form.matrixId)
      return flash(t('Pilih Overtime Matrix untuk tipe kompensasi Overtime Allowance.', 'Select an Overtime Matrix for the Overtime Allowance compensation type.'), 'error')

    const payload = {
      name: form.name.trim(), active: form.active,
      companyIds: form.companyIds, departmentIds: form.departmentIds,
      gradeFromId: form.gradeFromId ? +form.gradeFromId : null,
      gradeToId: form.gradeToId ? +form.gradeToId : null,
      location: form.location.trim(), employmentType: form.employmentType,
      autoApprovePlan: form.autoApprovePlan, autoApproveRealization: form.autoApproveRealization,
      compensationType: form.compensationType,
      matrixId: form.compensationType === 'Overtime Allowance' ? +form.matrixId : null,
      notes: form.notes.trim(),
    }
    if (isNew) addGroup(payload)
    else updateGroup(existing.id, payload)
    router.push('/hr/time-labour/eligibility-group')
  }

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🧩'
        title={isNew ? t('Tambah Eligibility Group', 'Add Eligibility Group') : t('Edit Eligibility Group', 'Edit Eligibility Group')}
        subtitle={t('Atur parameter, alur proses, dan kompensasi untuk kebijakan lembur ini.',
                     'Configure the parameters, process flow, and compensation for this overtime policy.')}
        actions={
          <ActionButton variant='secondary' onClick={() => router.push('/hr/time-labour/eligibility-group')}>
            ← {t('Kembali ke Daftar', 'Back to List')}
          </ActionButton>
        }
      />

      <div className='space-y-6'>
        <SectionCard title={t('1. Setting Parameter', '1. Setting Parameter')} icon='🎯'
          subtitle={t('Siapa yang eligible untuk group ini.', 'Who is eligible for this group.')}>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField label={t('Nama Group', 'Group Name')} required>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('mis. Staff Jakarta — Semua PT', 'e.g. Jakarta Staff — All PTs')} />
              </FormField>
              <FormField label='Status'>
                <div className='flex h-9 items-center gap-2'>
                  <Toggle active={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} />
                  <span className='text-sm text-gray-600'>{form.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}</span>
                </div>
              </FormField>
            </div>

            <CriteriaMultiSelect label='PT (Company)' items={companyItems} t={t}
              selected={form.companyIds} onToggle={(id2) => toggleIn('companyIds', id2)}
              onSelectAll={(allSel) => selectAllIn('companyIds', companyItems, allSel)} />

            <div className='grid grid-cols-2 gap-4'>
              <FormField label={t('Grade Dari (PC)', 'Grade From (PC)')} hint={t('Kosongkan untuk semua grade.', 'Leave blank for all grades.')}>
                <Select value={form.gradeFromId} onChange={e => setForm(f => ({ ...f, gradeFromId: e.target.value }))}>
                  <option value=''>— {t('Semua', 'All')} —</option>
                  {sortedGrades.map(g => <option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}
                </Select>
              </FormField>
              <FormField label={t('Grade Sampai (PC)', 'Grade To (PC)')}>
                <Select value={form.gradeToId} onChange={e => setForm(f => ({ ...f, gradeToId: e.target.value }))}>
                  <option value=''>— {t('Semua', 'All')} —</option>
                  {sortedGrades.map(g => <option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}
                </Select>
              </FormField>
            </div>

            <CriteriaMultiSelect label={t('Departemen', 'Department')} items={departmentItems} t={t}
              selected={form.departmentIds} onToggle={(id2) => toggleIn('departmentIds', id2)}
              onSelectAll={(allSel) => selectAllIn('departmentIds', departmentItems, allSel)} />

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField label={t('Lokasi', 'Location')} hint={t('Bebas isi, kosongkan untuk semua lokasi.', 'Free text, leave blank for all locations.')}>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={t('mis. Jakarta HQ', 'e.g. Jakarta HQ')} />
              </FormField>
              <FormField label={t('Tipe Kepegawaian', 'Employment Type')} hint={t('Kosongkan untuk semua tipe.', 'Leave blank for all types.')}>
                <Select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}>
                  <option value=''>— {t('Semua Tipe', 'All Types')} —</option>
                  {EMP_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                </Select>
              </FormField>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('2. Setting Flow', '2. Setting Flow')} icon='🔀'
          subtitle={t('Urutan proses lembur untuk group ini.', "This group's overtime process sequence.")}>
          <div className='space-y-5'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-gray-700'>{t('Auto-Approve Overtime Plan', 'Auto-Approve Overtime Plan')}</p>
                  <p className='text-xs text-gray-400'>{t('Jika tidak, ada langkah persetujuan.', "If off, an approval step is added.")}</p>
                </div>
                <Toggle active={form.autoApprovePlan} onChange={v => setForm(f => ({ ...f, autoApprovePlan: v }))} />
              </div>
              <div className='flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-gray-700'>{t('Auto-Approve Overtime Realization', 'Auto-Approve Overtime Realization')}</p>
                  <p className='text-xs text-gray-400'>{t('Jika tidak, ada langkah persetujuan.', "If off, an approval step is added.")}</p>
                </div>
                <Toggle active={form.autoApproveRealization} onChange={v => setForm(f => ({ ...f, autoApproveRealization: v }))} />
              </div>
            </div>

            <div>
              <p className='mb-2 text-xs font-bold uppercase tracking-wide text-gray-400'>{t('Pratinjau Alur', 'Flow Preview')}</p>
              <div className='flex flex-wrap items-center gap-2'>
                {flowSteps.map((s, i) => (
                  <div key={s.key} className='flex items-center gap-2'>
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                      s.approval ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'}`}>
                      <span className='flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold'>{i + 1}</span>
                      {s.label}
                    </div>
                    {i < flowSteps.length - 1 && <span className='text-gray-300'>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('3. Setting Compensation', '3. Setting Compensation')} icon='💰'
          subtitle={t('Bagaimana jam lembur yang terealisasi dikompensasi.', 'How realized overtime hours get compensated.')}>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {[
                { key: 'Overtime Allowance', icon: '💵', title: t('Overtime Allowance', 'Overtime Allowance'),
                  desc: t('Dibayar tunai sesuai rate per jam dari Overtime Matrix.', 'Paid in cash per the hourly rate from an Overtime Matrix.') },
                { key: 'Compensatory Leave', icon: '🔄', title: t('Compensatory Leave', 'Compensatory Leave'),
                  desc: t('Dikonversi menjadi hak cuti pengganti, bukan uang.', 'Converted into compensatory leave entitlement instead of cash.') },
              ].map(opt => (
                <button key={opt.key} type='button' onClick={() => setForm(f => ({ ...f, compensationType: opt.key }))}
                  className={`rounded-2xl p-5 text-left shadow-sm ring-1 transition ${
                    form.compensationType === opt.key ? 'bg-white ring-2 ring-teal-500' : 'bg-white ring-gray-100 hover:ring-gray-200'}`}>
                  <div className='mb-2 flex items-center justify-between'>
                    <span className='text-2xl'>{opt.icon}</span>
                    {form.compensationType === opt.key && (
                      <span className='rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700'>
                        {t('DIPILIH', 'SELECTED')}
                      </span>
                    )}
                  </div>
                  <p className='text-sm font-bold text-gray-800'>{opt.title}</p>
                  <p className='mt-1 text-xs leading-relaxed text-gray-500'>{opt.desc}</p>
                </button>
              ))}
            </div>

            {form.compensationType === 'Overtime Allowance' && (
              <FormField label={t('Overtime Matrix', 'Overtime Matrix')} required
                hint={t('Kelola daftar matrix di menu Overtime Matrix.', 'Manage the matrix list under the Overtime Matrix menu.')}>
                <Select value={form.matrixId} onChange={e => setForm(f => ({ ...f, matrixId: e.target.value }))}>
                  <option value=''>— {t('Pilih Matrix', 'Select Matrix')} —</option>
                  {activeMatrices.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </FormField>
            )}

            <FormField label={t('Catatan', 'Notes')}>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </FormField>
          </div>
        </SectionCard>

        <div className='flex gap-3'>
          <ActionButton onClick={handleSave} icon='💾'>{t('Simpan', 'Save')}</ActionButton>
          <ActionButton variant='secondary' onClick={() => router.push('/hr/time-labour/eligibility-group')}>
            {t('Batal', 'Cancel')}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
