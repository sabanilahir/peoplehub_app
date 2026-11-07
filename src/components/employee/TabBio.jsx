'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useT } from '@/store/languageStore'
import { Field, Input, Select, Section } from './EmployeeShared'
import { GENDERS, MARITAL, BLOOD_TYPES, TAX_STATUS, RELIGIONS, CITIES, COUNTRIES } from '@/utils/constants'

export default function TabBio({ emp, update, flash }) {
  const [form, setForm] = useState({ ...emp })
  const t = useT()

  useEffect(() => { setForm({ ...emp }) }, [emp.id])

  const save = () => {
    update(emp.id, {
      name: form.name, gender: form.gender, birthPlace: form.birthPlace, birthDate: form.birthDate,
      nationality: form.nationality, religion: form.religion, maritalStatus: form.maritalStatus,
      bloodType: form.bloodType, taxStatus: form.taxStatus, ktp: form.ktp, npwp: form.npwp,
      bpjs: form.bpjs, phone: form.phone, email: form.email, personalEmail: form.personalEmail,
      address: form.address, city: form.city, country: form.country,
    })
    flash(t('Bio data disimpan.', 'Bio data saved.'))
  }

  return (
    <div className='space-y-6'>
      <Section title='Personal Info'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <Field label={t('Nama Lengkap', 'Full Name')}>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label='Gender'>
            <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} options={GENDERS} />
          </Field>
          <Field label={t('Tempat Lahir', 'Place of Birth')}>
            <Input value={form.birthPlace} onChange={e => setForm(f => ({ ...f, birthPlace: e.target.value }))} />
          </Field>
          <Field label={t('Tanggal Lahir', 'Date of Birth')}>
            <Input type='date' value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
          </Field>
          <Field label={t('Kewarganegaraan', 'Nationality')}>
            <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
          </Field>
          <Field label={t('Agama', 'Religion')}>
            <Select value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} options={RELIGIONS} />
          </Field>
          <Field label={t('Status Perkawinan', 'Marital Status')}>
            <Select value={form.maritalStatus} onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))} options={MARITAL} />
          </Field>
          <Field label={t('Golongan Darah', 'Blood Type')}>
            <Select value={form.bloodType} onChange={e => setForm(f => ({ ...f, bloodType: e.target.value }))} options={BLOOD_TYPES} />
          </Field>
        </div>
      </Section>

      <Section title={t('Identitas', 'Identity')}>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <Field label={t('No. KTP', 'ID Card No.')}>
            <Input value={form.ktp} onChange={e => setForm(f => ({ ...f, ktp: e.target.value }))} placeholder='16 digit' />
          </Field>
          <Field label={t('No. NPWP', 'Tax ID (NPWP)')}>
            <Input value={form.npwp} onChange={e => setForm(f => ({ ...f, npwp: e.target.value }))} placeholder='XX.XXX.XXX.X-XXX.XXX' />
          </Field>
          <Field label='No. BPJS'>
            <input type='number' value={form.bpjs ?? ''} onChange={e => setForm(f => ({ ...f, bpjs: e.target.value }))}
              placeholder='13 digit'
              className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' />
          </Field>
          <Field label={t('Status Pajak', 'Tax Status')}>
            <Select value={form.taxStatus} onChange={e => setForm(f => ({ ...f, taxStatus: e.target.value }))} options={TAX_STATUS} />
          </Field>
        </div>
      </Section>

      <Section title={t('Kontak', 'Contact')}>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <Field label={t('No. HP', 'Phone No.')}>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label={t('Email Perusahaan', 'Work Email')}>
            <Input type='email' value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label={t('Email Pribadi', 'Personal Email')}>
            <Input type='email' value={form.personalEmail} onChange={e => setForm(f => ({ ...f, personalEmail: e.target.value }))} />
          </Field>
          <Field label='City'>
            <Select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} options={CITIES} />
          </Field>
          <Field label='Country'>
            <Select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} options={COUNTRIES} />
          </Field>
          <div className='col-span-full'>
            <Field label={t('Alamat', 'Address')}>
              <textarea value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={2} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none' />
            </Field>
          </div>
        </div>
      </Section>

      <button onClick={save}
        className='px-6 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90'
        style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
        <Icon e='💾' size={14} className='inline align-[-2px]' /> {t('Simpan Bio', 'Save Bio')}
      </button>
    </div>
  )
}
