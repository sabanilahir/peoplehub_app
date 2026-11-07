'use client'
import { useT } from '@/store/languageStore'
import { Field, Input, Select, Section, GradeSelect, CascadingOrgSelects } from './EmployeeShared'
import { GENDERS, EMP_TYPES } from '@/utils/constants'

export default function NewEmployeeForm({ form, setForm, S }) {
  const t = useT()
  return (
    <div className='space-y-6'>
      <Section title={t('Informasi Dasar', 'Basic Information')}>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <Field label='NIK *'>
            <Input value={form.nik} onChange={e => setForm(p => ({ ...p, nik: e.target.value }))} />
          </Field>
          <div className='col-span-2'>
            <Field label={t('Nama Lengkap *', 'Full Name *')}>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </Field>
          </div>
          <Field label='Gender'>
            <Select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} options={GENDERS} />
          </Field>
          <Field label='Email'>
            <Input type='email' value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </Field>
          <Field label={t('No. HP', 'Phone No.')}>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </Field>
        </div>
      </Section>

      <Section title={t('Penempatan', 'Placement')}>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <CascadingOrgSelects form={form} setForm={setForm} S={S} />
          <Field label={t('Lokasi Kerja', 'Work Location')}>
            <Select
              value={form.location || 'Head Office'}
              onChange={e => {
                const loc = e.target.value
                const code = loc === 'Gudang' ? 'gudang' : loc === 'Manhattan' ? 'livestream' : loc === 'Others' ? 'sales' : 'ho'
                setForm(p => ({ ...p, location: loc, workLocationCode: code }))
              }}
              options={['Head Office', 'Gudang', 'Manhattan', 'Others']}
            />
          </Field>
          <Field label='Grade / PC'>
            <GradeSelect value={form.gradeId} onChange={e => setForm(p => ({ ...p, gradeId: +e.target.value }))} grades={S.grades} placeholder={t('-- Pilih PC --', '-- Select --')} />
          </Field>
          <Field label='IC (Individual Class)'>
            <GradeSelect value={form.individualClassId} onChange={e => setForm(p => ({ ...p, individualClassId: +e.target.value }))} grades={S.grades} placeholder={t('-- Pilih IC --', '-- Select --')} />
          </Field>
        </div>
      </Section>

      <Section title='Employment'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <Field label={t('Tipe Kepegawaian', 'Employment Type')}>
            <Select value={form.employmentType} onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))} options={EMP_TYPES} />
          </Field>
          <Field label={t('Join Date *', 'Join Date *')}>
            <Input type='date' value={form.joinDate} onChange={e => setForm(p => ({ ...p, joinDate: e.target.value }))} />
          </Field>
          <Field label='Status'>
            <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} options={['Active','Inactive']} />
          </Field>
        </div>
      </Section>
    </div>
  )
}
