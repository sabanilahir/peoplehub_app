'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'
import { Field, Input, Select, Section } from './EmployeeShared'
import { EDU_LEVELS, SKILL_LVLS } from '@/utils/constants'

const BLANK_EDU  = { level: 'S1', institution: '', major: '', graduationYear: '' }
const BLANK_CERT = { name: '', issuer: '', issueYear: '', expiryYear: '' }
const BLANK_SKILL = { name: '', level: 'Intermediate' }

export default function TabProfile({ emp, addEdu, updateEdu, delEdu, addCert, updateCert, delCert, addSkill, updateSkill, delSkill, flash }) {
  const [eduForm,    setEduForm   ] = useState(BLANK_EDU)
  const [editingEdu, setEditingEdu] = useState(null)

  const [certForm,    setCertForm   ] = useState(BLANK_CERT)
  const [editingCert, setEditingCert] = useState(null)

  const [skillForm,    setSkillForm   ] = useState(BLANK_SKILL)
  const [editingSkill, setEditingSkill] = useState(null)

  const t = useT()

  // Education handlers
  const saveEdu = () => {
    if (!eduForm.institution) return flash(t('Institusi wajib diisi.', 'Institution is required.'), 'error')
    if (editingEdu) { updateEdu(emp.id, editingEdu, eduForm); setEditingEdu(null) }
    else            { addEdu(emp.id, eduForm) }
    setEduForm(BLANK_EDU)
    flash(t('Pendidikan disimpan.', 'Education saved.'))
  }

  // Certification handlers
  const saveCert = () => {
    if (!certForm.name) return flash(t('Nama sertifikat wajib.', 'Certificate name is required.'), 'error')
    if (editingCert) { updateCert(emp.id, editingCert, certForm); setEditingCert(null) }
    else             { addCert(emp.id, certForm) }
    setCertForm(BLANK_CERT)
    flash(t('Sertifikasi disimpan.', 'Certification saved.'))
  }

  // Skill handlers
  const saveSkill = () => {
    if (!skillForm.name) return flash(t('Nama skill wajib.', 'Skill name is required.'), 'error')
    if (editingSkill) { updateSkill(emp.id, editingSkill, skillForm); setEditingSkill(null) }
    else              { addSkill(emp.id, skillForm) }
    setSkillForm(BLANK_SKILL)
    flash(t('Skill disimpan.', 'Skill saved.'))
  }

  return (
    <div className='space-y-6'>

      {/* Education */}
      <Section title={t('Pendidikan', 'Education')}>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-3'>
          <Field label={t('Jenjang', 'Level')}>
            <Select value={eduForm.level} onChange={e => setEduForm(f => ({ ...f, level: e.target.value }))} options={EDU_LEVELS} />
          </Field>
          <div className='col-span-2'>
            <Field label={t('Institusi', 'Institution')}>
              <Input value={eduForm.institution} onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))} />
            </Field>
          </div>
          <Field label={t('Jurusan', 'Major')}>
            <Input value={eduForm.major} onChange={e => setEduForm(f => ({ ...f, major: e.target.value }))} />
          </Field>
          <Field label={t('Tahun Lulus', 'Graduation Year')}>
            <Input value={eduForm.graduationYear} onChange={e => setEduForm(f => ({ ...f, graduationYear: e.target.value }))} placeholder='2020' />
          </Field>
        </div>
        <div className='flex gap-2 mb-4'>
          <button onClick={saveEdu}
            className='px-4 py-1.5 text-white text-xs font-semibold rounded-lg hover:opacity-90'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            {editingEdu ? t('Simpan', 'Save') : `+ ${t('Tambah', 'Add')}`}
          </button>
          {editingEdu && (
            <button onClick={() => { setEditingEdu(null); setEduForm(BLANK_EDU) }}
              className='px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200'>
              {t('Batal', 'Cancel')}
            </button>
          )}
        </div>
        <div className='space-y-2'>
          {emp.education.map(e => (
            <div key={e.id} className='flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3'>
              <span className='text-xl'><Icon e='🎓' size={15} /></span>
              <div className='flex-1'>
                <div className='text-sm font-semibold text-gray-800'>{e.institution}</div>
                <div className='text-xs text-gray-500'>{e.level} · {e.major} · {e.graduationYear}</div>
              </div>
              <div className='flex gap-1'>
                <button
                  onClick={() => { setEditingEdu(e.id); setEduForm({ level: e.level, institution: e.institution, major: e.major, graduationYear: e.graduationYear }) }}
                  className='px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100'>
                  {t('Edit', 'Edit')}
                </button>
                <button onClick={() => { delEdu(emp.id, e.id); flash(t('Pendidikan dihapus.', 'Education deleted.')) }}
                  className='px-2 py-1 bg-red-50 text-red-500 text-xs rounded-lg hover:bg-red-100'><Icon e='✕' size={15} /></button>
              </div>
            </div>
          ))}
          {!emp.education.length && <p className='text-xs text-gray-400'>{t('Belum ada data pendidikan.', 'No education data yet.')}</p>}
        </div>
      </Section>

      {/* Certifications */}
      <Section title={t('Sertifikasi', 'Certifications')}>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-3'>
          <div className='col-span-2'>
            <Field label={t('Nama Sertifikat', 'Certificate Name')}>
              <Input value={certForm.name} onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
          </div>
          <Field label='Issuer'>
            <Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} />
          </Field>
          <Field label={t('Tahun Terbit', 'Issue Year')}>
            <Input value={certForm.issueYear} onChange={e => setCertForm(f => ({ ...f, issueYear: e.target.value }))} placeholder='2022' />
          </Field>
          <Field label={t('Tahun Kedaluwarsa', 'Expiry Year')}>
            <Input value={certForm.expiryYear} onChange={e => setCertForm(f => ({ ...f, expiryYear: e.target.value }))} placeholder='2025 / —' />
          </Field>
        </div>
        <div className='flex gap-2 mb-4'>
          <button onClick={saveCert}
            className='px-4 py-1.5 text-white text-xs font-semibold rounded-lg hover:opacity-90'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            {editingCert ? t('Simpan', 'Save') : `+ ${t('Tambah', 'Add')}`}
          </button>
          {editingCert && (
            <button onClick={() => { setEditingCert(null); setCertForm(BLANK_CERT) }}
              className='px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200'>
              {t('Batal', 'Cancel')}
            </button>
          )}
        </div>
        <div className='space-y-2'>
          {emp.certifications.map(c => (
            <div key={c.id} className='flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3'>
              <span className='text-xl'><Icon e='📜' size={15} /></span>
              <div className='flex-1'>
                <div className='text-sm font-semibold text-gray-800'>{c.name}</div>
                <div className='text-xs text-gray-500'>{c.issuer} · {c.issueYear}{c.expiryYear ? ` → ${c.expiryYear}` : ''}</div>
              </div>
              <div className='flex gap-1'>
                <button
                  onClick={() => { setEditingCert(c.id); setCertForm({ name: c.name, issuer: c.issuer, issueYear: c.issueYear, expiryYear: c.expiryYear }) }}
                  className='px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100'>
                  {t('Edit', 'Edit')}
                </button>
                <button onClick={() => { delCert(emp.id, c.id); flash(t('Sertifikasi dihapus.', 'Certification deleted.')) }}
                  className='px-2 py-1 bg-red-50 text-red-500 text-xs rounded-lg hover:bg-red-100'><Icon e='✕' size={15} /></button>
              </div>
            </div>
          ))}
          {!emp.certifications.length && <p className='text-xs text-gray-400'>{t('Belum ada sertifikasi.', 'No certifications yet.')}</p>}
        </div>
      </Section>

      {/* Skills */}
      <Section title='Skills'>
        <div className='flex gap-3 mb-3 flex-wrap'>
          <div className='flex-1 min-w-[160px]'>
            <Input value={skillForm.name} onChange={e => setSkillForm(f => ({ ...f, name: e.target.value }))} placeholder={t('Nama skill', 'Skill name')} />
          </div>
          <div className='w-40'>
            <Select value={skillForm.level} onChange={e => setSkillForm(f => ({ ...f, level: e.target.value }))} options={SKILL_LVLS} />
          </div>
          <button onClick={saveSkill}
            className='px-4 py-2 text-white text-xs font-semibold rounded-lg hover:opacity-90 flex-shrink-0'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            {editingSkill ? t('Simpan', 'Save') : `+ ${t('Tambah', 'Add')}`}
          </button>
          {editingSkill && (
            <button onClick={() => { setEditingSkill(null); setSkillForm(BLANK_SKILL) }}
              className='px-4 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200'>
              {t('Batal', 'Cancel')}
            </button>
          )}
        </div>
        <div className='flex flex-wrap gap-2'>
          {emp.skills.map(sk => {
            const color = { Beginner: 'bg-gray-100 text-gray-600', Intermediate: 'bg-blue-100 text-blue-700', Advanced: 'bg-red-100 text-red-700', Expert: 'bg-orange-100 text-orange-700' }[sk.level] || ''
            return (
              <div key={sk.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
                {sk.name}
                <span className='opacity-60 text-xs'>· {sk.level}</span>
                <button
                  onClick={() => { setEditingSkill(sk.id); setSkillForm({ name: sk.name, level: sk.level }) }}
                  className='ml-0.5 opacity-60 hover:opacity-100 text-xs'><Icon e='✏️' size={15} /></button>
                <button onClick={() => { delSkill(emp.id, sk.id); flash(t('Skill dihapus.', 'Skill deleted.')) }}
                  className='opacity-50 hover:opacity-100'><Icon e='✕' size={15} /></button>
              </div>
            )
          })}
          {!emp.skills.length && <p className='text-xs text-gray-400'>{t('Belum ada skill.', 'No skills yet.')}</p>}
        </div>
      </Section>
    </div>
  )
}
