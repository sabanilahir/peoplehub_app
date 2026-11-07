'use client'
import Icon from '@/components/ui/Icon'
import { useState, useRef } from 'react'
import { useAuthStore }      from '@/store/authStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useT }              from '@/store/languageStore'
import { ACTION_COLOR }      from '@/store/employeeStore'
import { useEmployeeDocumentStore, DOCUMENT_MAX_BYTES } from '@/store/employeeDocumentStore'
import { useDocumentTypeStore } from '@/store/documentTypeStore'
import { RELS, GENDERS } from '@/utils/constants'
import { FormField, Input, Select, ActionButton, StatusBadge, DocCompletionDonut } from '@/components/ui'

const TABS = ['Employment', 'Bio', 'Dependent', 'Profile', 'History', 'Personal Document']

const DOC_ICON = (fileType) => {
  if (fileType?.includes('pdf')) return '📄'
  if (fileType?.startsWith('image/')) return '🖼️'
  if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
  if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📊'
  return '📎'
}

const formatBytes = (n) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`

const todayStr = () => new Date().toISOString().slice(0, 10)

const LEVEL_COLOR = {
  Expert:       'bg-purple-100 text-purple-700',
  Advanced:     'bg-blue-100 text-blue-700',
  Intermediate: 'bg-green-100 text-green-700',
  Beginner:     'bg-gray-100 text-gray-500',
}

function Section({ title, children }) {
  return (
    <div className='mb-6'>
      <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3'>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-xs text-gray-400'>{label}</span>
      <span className='text-sm font-medium text-gray-800'>{value || '—'}</span>
    </div>
  )
}

export default function MyProfilePage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees, addDependent, updateDependent, deleteDependent } = useEmployeeStore()
  const { companies, divisions, businessUnits, departments, positions } = useStructureStore()
  const { documents, addDocument, deleteDocument } = useEmployeeDocumentStore()
  const { types: docTypes } = useDocumentTypeStore()
  const activeDocTypes = docTypes.filter(x => x.active)
  const docFileRef = useRef(null)
  const [docModal, setDocModal] = useState(null) // { documentTypeId, issuedDate, effectiveStartDate, effectiveEndDate, note, customFieldValue, file, error }
  const [depModal, setDepModal] = useState(null) // { mode: 'add'|'edit', id?, name, relationship, birthDate, gender, phone, isEmergencyContact }

  const [tab, setTab] = useState('Employment')

  const emp = employees.find(e =>
    (currentUser?.employeeId && (e.id === currentUser.employeeId || e.id === Number(currentUser.employeeId))) ||
    (currentUser?.id && e.id === currentUser.id) ||
    (currentUser?.username && (e.nik === currentUser.username || e.email === currentUser.username || String(e.id) === String(currentUser.username).replace(/\D/g, ''))) ||
    (currentUser?.email && e.email === currentUser.email) ||
    (currentUser?.name && e.name?.toLowerCase() === currentUser.name?.toLowerCase())
  )

  if (!emp) return (
    <div className='flex items-center justify-center min-h-[60vh] text-gray-400 text-sm'>
      {t('Data profil tidak ditemukan.', 'Profile data not found.')}
    </div>
  )

  // Same effective-dated Bio (Correct/Update) resolution as the HR
  // Administration employee page — falls back to the employee's static
  // fields until the first bio record is saved, so both pages always agree.
  const today = todayStr()
  const bioHistoryRecords = [...(emp.bioHistory || [])]
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.effectiveSeq - a.effectiveSeq)
  const activeBio = bioHistoryRecords.find(r =>
    r.effectiveDate <= today && (!r.effectiveEndDate || r.effectiveEndDate >= today))
  const displayBio = activeBio || {
    gender: emp.gender, birthDate: emp.birthDate, birthPlace: emp.birthPlace, nationality: emp.nationality,
    religion: emp.religion, maritalStatus: emp.maritalStatus,
    phone: emp.phone, email: emp.email, personalEmail: emp.personalEmail,
    address: emp.address, city: emp.city, country: emp.country,
    ktp: emp.ktp, npwp: emp.npwp, bpjs: emp.bpjs,
  }

  const myDocuments = documents
    .filter(d => d.employeeId === emp.id)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  const mandatoryDocTypes = activeDocTypes.filter(dt => dt.mandatory)
  const missingMandatory = mandatoryDocTypes.filter(dt => !myDocuments.some(d => d.category === dt.name))
  const completedMandatoryCount = mandatoryDocTypes.length - missingMandatory.length

  const openDocModal = () => setDocModal({
    documentTypeId: activeDocTypes[0]?.id ?? '', issuedDate: '', effectiveStartDate: '', effectiveEndDate: '',
    note: '', customFieldValue: '', file: null, error: null,
  })
  const closeDocModal = () => setDocModal(null)
  const selectedDocType = docModal ? docTypes.find(x => x.id === Number(docModal.documentTypeId)) : null
  const pickDocFile = (file) => {
    if (!file) return
    if (file.size > DOCUMENT_MAX_BYTES) {
      setDocModal(m => ({ ...m, file: null, error: t(`Ukuran file maksimal ${formatBytes(DOCUMENT_MAX_BYTES)}.`, `File must be under ${formatBytes(DOCUMENT_MAX_BYTES)}.`) }))
      return
    }
    setDocModal(m => ({ ...m, file, error: null }))
  }
  const saveDocument = () => {
    if (!docModal.file || !selectedDocType) return
    const f = selectedDocType.fields
    const reader = new FileReader()
    reader.onload = (e) => {
      addDocument({
        employeeId: emp.id, category: selectedDocType.name,
        issuedDate: f.issuedDate ? docModal.issuedDate : '',
        effectiveStartDate: f.effectiveStartDate ? docModal.effectiveStartDate : '',
        effectiveEndDate: f.effectiveEndDate ? docModal.effectiveEndDate : '',
        note: f.note ? docModal.note.trim() : '',
        customFieldLabel: f.customField ? selectedDocType.customFieldLabel : '',
        customFieldValue: f.customField ? docModal.customFieldValue.trim() : '',
        fileName: docModal.file.name, fileType: docModal.file.type, fileSize: docModal.file.size,
        dataUrl: e.target.result,
        uploadedAt: new Date().toISOString(), uploadedBy: currentUser?.id, uploadedByName: currentUser?.name || '',
      })
      closeDocModal()
    }
    reader.readAsDataURL(docModal.file)
  }
  const removeDocument = (doc) => {
    if (!window.confirm(t(`Hapus dokumen "${doc.fileName}"?`, `Delete "${doc.fileName}"?`))) return
    deleteDocument(doc.id)
  }

  const openAddDependent = () => setDepModal({
    mode: 'add', name: '', relationship: RELS[0], birthDate: '', gender: GENDERS[0], phone: '', isEmergencyContact: false,
  })
  const openEditDependent = (d) => setDepModal({
    mode: 'edit', id: d.id, name: d.name, relationship: d.relationship, birthDate: d.birthDate || '',
    gender: d.gender, phone: d.phone || '', isEmergencyContact: !!d.isEmergencyContact,
  })
  const closeDepModal = () => setDepModal(null)
  const saveDependent = () => {
    if (!depModal.name.trim()) return
    const payload = {
      name: depModal.name.trim(), relationship: depModal.relationship, birthDate: depModal.birthDate,
      gender: depModal.gender, phone: depModal.phone.trim(), isEmergencyContact: depModal.isEmergencyContact,
    }
    if (depModal.mode === 'add') addDependent(emp.id, payload)
    else updateDependent(emp.id, depModal.id, payload)
    closeDepModal()
  }
  const removeDependent = (d) => {
    if (!window.confirm(t(`Hapus tanggungan "${d.name}"?`, `Delete dependent "${d.name}"?`))) return
    deleteDependent(emp.id, d.id)
  }

  const company  = companies.find(c => c.id === emp.companyId)
  const division = divisions.find(d => d.id === emp.divisionId)
  const bunit    = businessUnits.find(b => b.id === emp.businessUnitId)
  const dept     = departments.find(d => d.id === emp.departmentId)
  const pos      = positions.find(p => p.id === emp.positionId)
  const mgr      = employees.find(e => e.id === emp.managerId)
  const mgrPos   = positions.find(p => p.id === mgr?.positionId)
  const companyName = company?.name || (emp.address ? emp.address.split('\n')[0].trim() : 'PT Gemilang Nusantara')

  const initials = emp.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const sortedHistory = [...(emp.history || [])].sort(
    (a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)
  )

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Profil Saya', 'My Profile')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Informasi data diri dan kepegawaian Anda.', 'Your personal and employment information.')}</p>

      {/* Header card */}
      <div className='rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100 mb-6'>
        <div className='h-24' style={{ background: 'linear-gradient(135deg,#052B52 0%,#039299 50%,#4FD1D9 100%)' }} />
        <div className='bg-white px-6 pb-5'>
          <div className='flex items-end gap-4 -mt-10 mb-4'>
            <div className='w-20 h-20 rounded-2xl border-4 border-white shadow flex items-center justify-center text-2xl font-bold text-white flex-shrink-0'
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
              {emp.photo
                ? <img src={emp.photo} alt='' className='w-full h-full object-cover rounded-xl' />
                : initials}
            </div>
            <div className='pb-1'>
              <h2 className='text-xl font-bold text-gray-900'>{emp.name}</h2>
              <p className='text-sm text-gray-500'>{emp.jobTitle || emp.position || pos?.name || '—'} · {emp.dept || dept?.name || '—'}</p>
              <p className='text-xs text-gray-400 mt-0.5'>{emp.nik} · {companyName}</p>
            </div>
          </div>
          <div className='flex gap-2 flex-wrap items-center'>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {emp.status}
            </span>
            <span className='text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700'>
              {emp.employmentType || 'Permanent'}
            </span>
            {emp.location && (
              <span className='text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 text-indigo-700'>
                📍 {emp.location}
              </span>
            )}
            {emp.workLocationCode && (
              <span className='text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase'>
                {emp.workLocationCode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex gap-1 mb-5 flex-wrap'>
        {TABS.map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === tb ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={tab === tb ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
            {t(tb, tb)}
          </button>
        ))}
      </div>

      <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6'>

        {/* Employment */}
        {tab === 'Employment' && (
          <div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-8'>
              <Field label={t('Nomor Karyawan', 'Employee Number')} value={emp.nik} />
              <Field label={t('Perusahaan', 'Company')} value={companyName} />
              <Field label={t('Divisi', 'Division')} value={division?.name || '—'} />
              <Field label={t('Business Unit', 'Business Unit')} value={bunit?.name || '—'} />
              <Field label={t('Departemen', 'Department')} value={emp.dept || dept?.name || '—'} />
              <Field label={t('Job Title', 'Job Title')} value={emp.jobTitle || emp.position || pos?.name || '—'} />
              <Field label={t('Job Position', 'Job Position')} value={emp.jobPosition || '—'} />
              <Field label={t('Grade', 'Grade')} value={emp.gradeId ? `PC ${emp.gradeId}` : '—'} />
              {emp.individualClassId && <Field label='IC' value={`IC ${emp.individualClassId}`} />}
              <Field label={t('Tipe Kepegawaian', 'Employment Type')} value={emp.employmentType || '—'} />
              <Field label={t('Tanggal Bergabung', 'Join Date')} value={emp.joinDate || '—'} />
              {emp.endDate && <Field label={t('Tanggal Berakhir', 'End Date')} value={emp.endDate} />}
              <Field
                label={t('Atasan Langsung', 'Direct Manager')}
                value={mgr ? `${mgr.name} — ${mgr.jobTitle || mgr.jobPosition || mgrPos?.name || ''}` : '—'}
              />
            </div>

            {/* ── LOCATION (Sesuai Odoo) ────────────────────────── */}
            <div className='border-t border-gray-100 pt-6'>
              <h3 className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5'>
                <span>🏢</span> {t('Lokasi & Aturan Kerja', 'Work Location & Rules')}
              </h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 bg-gray-50/70 p-5 rounded-2xl border border-gray-100'>
                <div>
                  <span className='text-xs text-gray-400 font-medium block mb-1'>{t('Work Address', 'Alamat Kerja')}</span>
                  <div className='text-sm text-gray-800 whitespace-pre-line leading-relaxed font-medium'>
                    {emp.address || 'PT Gemilang Nusantara\nPantai Indah Kapuk\nJakarta Utara JK\nIndonesia'}
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <span className='text-xs text-gray-400 font-medium'>{t('Work Location', 'Lokasi Kerja')}</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-bold text-gray-900'>{emp.location || 'Head Office'}</span>
                    {emp.workLocationCode && (
                      <span className='text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase'>
                        {emp.workLocationCode}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className='text-xs text-gray-400 font-medium block mb-1'>{t('Aturan Jam Kerja & Presensi', 'Work Schedule Rule')}</span>
                  <span className='text-sm font-semibold text-gray-800'>
                    {emp.workLocationCode === 'ho' ? '09:00 - 18:00 (Sabtu Libur)' :
                     emp.workLocationCode === 'sales' ? '09:00 - 17:00 (Sabtu 09:00 - 15:00)' :
                     emp.workLocationCode === 'gudang' ? '08:00 - 17:00 (Sabtu 08:00 - 15:00)' :
                     emp.workLocationCode === 'livestream' ? '4 Jam Live (dalam 24 Jam)' : 'Standar HO (09:00 - 18:00)'}
                  </span>
                </div>
                <div>
                  <span className='text-xs text-gray-400 font-medium block mb-1'>{t('Status Mapping Odoo', 'Odoo Mapping Status')}</span>
                  <div className='flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-emerald-500'></span>
                    <span className='text-sm font-semibold text-emerald-700'>
                      {emp.odoo_id ? `Terhubung Odoo HR (ID: ${emp.odoo_id})` : 'Terhubung Sistem HR'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bio */}
        {tab === 'Bio' && (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-8'>
            <Section title={t('Data Pribadi', 'Personal Data')}>
              <div className='grid grid-cols-1 gap-4'>
                <Field label={t('Jenis Kelamin', 'Gender')}       value={displayBio.gender && t(displayBio.gender === 'Male' ? 'Laki-laki' : 'Perempuan', displayBio.gender)} />
                <Field label={t('Tempat Lahir', 'Birth Place')}   value={displayBio.birthPlace} />
                <Field label={t('Tanggal Lahir', 'Birth Date')}   value={displayBio.birthDate} />
                <Field label={t('Kewarganegaraan', 'Nationality')} value={displayBio.nationality} />
                <Field label={t('Agama', 'Religion')}             value={displayBio.religion} />
                <Field label={t('Status Pernikahan', 'Marital Status')} value={displayBio.maritalStatus} />
              </div>
            </Section>
            <div>
              <Section title={t('Kontak', 'Contact')}>
                <div className='grid grid-cols-1 gap-4'>
                  <Field label={t('Telepon', 'Phone')}           value={displayBio.phone} />
                  <Field label={t('Email Kerja', 'Work Email')}  value={displayBio.email} />
                  <Field label={t('Email Pribadi', 'Personal Email')} value={displayBio.personalEmail} />
                  <Field label={t('Alamat', 'Address')}          value={displayBio.address} />
                  <Field label={t('Kota', 'City')}               value={displayBio.city} />
                  <Field label={t('Negara', 'Country')}          value={displayBio.country} />
                </div>
              </Section>
              <Section title={t('Nomor Identitas', 'ID Numbers')}>
                <div className='grid grid-cols-1 gap-4'>
                  <Field label='KTP'  value={displayBio.ktp} />
                  <Field label='NPWP' value={displayBio.npwp} />
                  <Field label='BPJS' value={displayBio.bpjs} />
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* Dependent */}
        {tab === 'Dependent' && (
          <div>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-sm font-bold text-gray-800'>{t('Tanggungan', 'Dependents')}</h3>
              <ActionButton size='sm' icon='➕' onClick={openAddDependent}>{t('Tambah Tanggungan', 'Add Dependent')}</ActionButton>
            </div>
            {emp.dependents?.length === 0
              ? <p className='text-sm text-gray-400 text-center py-10'>{t('Tidak ada data tanggungan.', 'No dependent data.')}</p>
              : <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b border-gray-100'>
                        <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Nama', 'Name')}</th>
                        <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Hubungan', 'Relationship')}</th>
                        <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Tanggal Lahir', 'Birth Date')}</th>
                        <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Jenis Kelamin', 'Gender')}</th>
                        <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Telepon', 'Phone')}</th>
                        <th className='text-center py-2 px-3 text-xs font-bold text-gray-500'>{t('Kontak Darurat', 'Emergency Contact')}</th>
                        <th className='text-right py-2 px-3 text-xs font-bold text-gray-500'></th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.dependents.map(d => (
                        <tr key={d.id} className='border-b border-gray-50 hover:bg-gray-50'>
                          <td className='py-2.5 px-3 font-medium text-gray-800'>{d.name}</td>
                          <td className='py-2.5 px-3 text-gray-600'>{d.relationship}</td>
                          <td className='py-2.5 px-3 text-gray-600'>{d.birthDate || '—'}</td>
                          <td className='py-2.5 px-3 text-gray-600'>{d.gender}</td>
                          <td className='py-2.5 px-3 text-gray-600'>{d.phone || '—'}</td>
                          <td className='py-2.5 px-3 text-center'>
                            {d.isEmergencyContact
                              ? <StatusBadge tone='danger'>{t('Kontak Darurat', 'Emergency')}</StatusBadge>
                              : <span className='text-gray-300'>—</span>}
                          </td>
                          <td className='py-2.5 px-3 text-right'>
                            <div className='flex justify-end gap-3'>
                              <button onClick={() => openEditDependent(d)} className='text-xs font-semibold text-teal-700 hover:underline'>{t('Ubah', 'Edit')}</button>
                              <button onClick={() => removeDependent(d)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {/* Dependent add/edit modal */}
        {depModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeDepModal}>
            <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
              <div className='mb-4 flex items-start justify-between'>
                <h3 className='text-base font-bold text-gray-800'>
                  {depModal.mode === 'add' ? t('Tambah Tanggungan', 'Add Dependent') : t('Ubah Tanggungan', 'Edit Dependent')}
                </h3>
                <button onClick={closeDepModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
              </div>
              <div className='space-y-4'>
                <FormField label={t('Nama', 'Name')} required>
                  <Input value={depModal.name} onChange={e => setDepModal(m => ({ ...m, name: e.target.value }))} autoFocus />
                </FormField>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField label={t('Hubungan', 'Relationship')}>
                    <Select value={depModal.relationship} onChange={e => setDepModal(m => ({ ...m, relationship: e.target.value }))}>
                      {RELS.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </FormField>
                  <FormField label={t('Jenis Kelamin', 'Gender')}>
                    <Select value={depModal.gender} onChange={e => setDepModal(m => ({ ...m, gender: e.target.value }))}>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </Select>
                  </FormField>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField label={t('Tanggal Lahir', 'Birth Date')}>
                    <Input type='date' value={depModal.birthDate} onChange={e => setDepModal(m => ({ ...m, birthDate: e.target.value }))} />
                  </FormField>
                  <FormField label={t('Telepon', 'Phone')}>
                    <Input value={depModal.phone} onChange={e => setDepModal(m => ({ ...m, phone: e.target.value }))} />
                  </FormField>
                </div>
                <label className='flex cursor-pointer items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700'>
                  <input type='checkbox' checked={depModal.isEmergencyContact}
                    onChange={e => setDepModal(m => ({ ...m, isEmergencyContact: e.target.checked }))} className='h-4 w-4 accent-red-700' />
                  {t('Jadikan sebagai kontak darurat', 'Set as emergency contact')}
                </label>
              </div>
              <div className='mt-6 flex justify-end gap-2'>
                <ActionButton variant='secondary' onClick={closeDepModal}>{t('Batal', 'Cancel')}</ActionButton>
                <ActionButton icon='💾' onClick={saveDependent} disabled={!depModal.name.trim()}>{t('Simpan', 'Save')}</ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* Profile */}
        {tab === 'Profile' && (
          <div className='space-y-8'>
            <Section title={t('Pendidikan', 'Education')}>
              {emp.education?.length === 0
                ? <p className='text-sm text-gray-400'>{t('Tidak ada data.', 'No data.')}</p>
                : <div className='space-y-3'>
                    {emp.education.map(e => (
                      <div key={e.id} className='bg-gray-50 rounded-xl p-4'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-sm font-bold text-gray-800'>{e.institution}</span>
                          <span className='text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold'>{e.level}</span>
                        </div>
                        <p className='text-xs text-gray-500'>{e.major} · {t('Lulus', 'Graduated')} {e.graduationYear}</p>
                      </div>
                    ))}
                  </div>
              }
            </Section>
            <Section title={t('Sertifikasi', 'Certifications')}>
              {emp.certifications?.length === 0
                ? <p className='text-sm text-gray-400'>{t('Tidak ada data.', 'No data.')}</p>
                : <div className='space-y-3'>
                    {emp.certifications.map(c => (
                      <div key={c.id} className='bg-gray-50 rounded-xl p-4'>
                        <p className='text-sm font-bold text-gray-800'>{c.name}</p>
                        <p className='text-xs text-gray-500 mt-0.5'>{c.issuer} · {c.issueYear}{c.expiryYear ? ` – ${c.expiryYear}` : ''}</p>
                      </div>
                    ))}
                  </div>
              }
            </Section>
            <Section title={t('Keahlian', 'Skills')}>
              {emp.skills?.length === 0
                ? <p className='text-sm text-gray-400'>{t('Tidak ada data.', 'No data.')}</p>
                : <div className='flex flex-wrap gap-2'>
                    {emp.skills.map(s => (
                      <span key={s.id} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${LEVEL_COLOR[s.level] || 'bg-gray-100 text-gray-600'}`}>
                        {s.name}
                        <span className='opacity-60 text-[10px]'>· {s.level}</span>
                      </span>
                    ))}
                  </div>
              }
            </Section>
          </div>
        )}

        {/* History */}
        {tab === 'History' && (
          sortedHistory.length === 0
            ? <p className='text-sm text-gray-400 text-center py-10'>{t('Tidak ada riwayat kepegawaian.', 'No employment history.')}</p>
            : <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-gray-100'>
                      <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Tanggal Efektif', 'Effective Date')}</th>
                      <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>Action</th>
                      <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Alasan', 'Reason')}</th>
                      <th className='text-left py-2 px-3 text-xs font-bold text-gray-500'>{t('Catatan', 'Note')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map(h => (
                      <tr key={h.id} className='border-b border-gray-50 hover:bg-gray-50'>
                        <td className='py-2.5 px-3 text-gray-600 whitespace-nowrap'>{h.effectiveDate}</td>
                        <td className='py-2.5 px-3'>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ACTION_COLOR[h.action] || 'bg-gray-100 text-gray-600'}`}>
                            {h.action}
                          </span>
                        </td>
                        <td className='py-2.5 px-3 text-gray-600'>{h.reason}</td>
                        <td className='py-2.5 px-3 text-gray-400 text-xs'>{h.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}

        {/* Personal Document */}
        {tab === 'Personal Document' && (
          <div>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='text-sm font-bold text-gray-800'>{t('Dokumen Pribadi','Personal Document')}</h3>
                <p className='text-xs text-gray-400'>
                  {t(`Maks. ${formatBytes(DOCUMENT_MAX_BYTES)} per file — KTP, NPWP, ijazah, kontrak kerja, dll.`,
                     `Max ${formatBytes(DOCUMENT_MAX_BYTES)} per file — ID card, tax card, diploma, employment contract, etc.`)}
                </p>
              </div>
              <ActionButton size='sm' icon='➕' onClick={openDocModal}>{t('Upload Dokumen','Upload Document')}</ActionButton>
            </div>

            {mandatoryDocTypes.length > 0 && (
              <div className='mb-4 flex items-center gap-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100'>
                <DocCompletionDonut completed={completedMandatoryCount} total={mandatoryDocTypes.length} />
                <div>
                  <p className='text-sm font-bold text-gray-800'>{t('Kelengkapan Dokumen Wajib','Mandatory Document Completeness')}</p>
                  <p className='mt-0.5 text-xs text-gray-500'>
                    {completedMandatoryCount} / {mandatoryDocTypes.length} {t('dokumen wajib sudah diunggah','mandatory documents uploaded')}
                  </p>
                </div>
              </div>
            )}

            {missingMandatory.length > 0 && (
              <div className='mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-100'>
                <span className='font-semibold'>⚠️ {t('Dokumen wajib belum lengkap:', 'Missing mandatory documents:')}</span>{' '}
                {missingMandatory.map(dt => dt.title).join(', ')}
              </div>
            )}

            {myDocuments.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-gray-400 gap-2'>
                <span className='text-4xl'><Icon e='📁' size={15} /></span>
                <p className='text-sm'>{t('Belum ada dokumen.','No documents yet.')}</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-100'>
                {myDocuments.map(doc => (
                  <div key={doc.id} className='flex items-center gap-3 py-3'>
                    <span className='text-2xl shrink-0'>{DOC_ICON(doc.fileType)}</span>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <a href={doc.dataUrl} download={doc.fileName} target='_blank' rel='noreferrer'
                          className='text-sm font-semibold text-gray-800 hover:text-red-700 hover:underline truncate'>
                          {doc.fileName}
                        </a>
                        <span className='shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600'>{doc.category}</span>
                      </div>
                      <p className='text-xs text-gray-400 mt-0.5'>
                        {formatBytes(doc.fileSize)} · {t('diunggah oleh','uploaded by')} {doc.uploadedByName || '—'} · {new Date(doc.uploadedAt).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                      </p>
                      {(doc.issuedDate || doc.effectiveStartDate || doc.effectiveEndDate || doc.customFieldValue) && (
                        <p className='text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3'>
                          {doc.issuedDate && <span>{t('Diterbitkan','Issued')}: {doc.issuedDate}</span>}
                          {(doc.effectiveStartDate || doc.effectiveEndDate) && (
                            <span>{t('Berlaku','Valid')}: {doc.effectiveStartDate || '—'} → {doc.effectiveEndDate || '—'}</span>
                          )}
                          {doc.customFieldValue && <span>{doc.customFieldLabel || t('Custom Field','Custom Field')}: {doc.customFieldValue}</span>}
                        </p>
                      )}
                      {doc.note && <p className='text-xs text-gray-500 mt-1'>{doc.note}</p>}
                    </div>
                    <button onClick={() => removeDocument(doc)} className='shrink-0 text-gray-400 hover:text-red-600' aria-label={t('Hapus','Delete')}>
                      <Icon e='🗑️' size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Personal Document upload modal */}
      {docModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeDocModal}>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='flex justify-between items-start mb-4'>
              <h3 className='text-base font-bold text-gray-800'>{t('Upload Dokumen','Upload Document')}</h3>
              <button onClick={closeDocModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>

            {activeDocTypes.length === 0 ? (
              <p className='text-sm text-gray-500'>
                {t('Belum ada document type aktif. Hubungi HR/Admin.', 'No active document types yet. Contact HR/Admin.')}
              </p>
            ) : (
            <div className='space-y-4'>
              <FormField label={t('Kategori','Category')} required>
                <Select value={docModal.documentTypeId} onChange={e => setDocModal(m => ({ ...m, documentTypeId: e.target.value }))}>
                  {activeDocTypes.map(x => <option key={x.id} value={x.id}>{x.title}{x.mandatory ? ' *' : ''}</option>)}
                </Select>
              </FormField>

              <div>
                <span className='mb-1.5 block text-xs font-semibold text-gray-600'>
                  {t('File','File')}<span className='text-red-500'> *</span>
                </span>
                <input ref={docFileRef} type='file' className='hidden'
                  accept='.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
                  onChange={e => { pickDocFile(e.target.files?.[0]); e.target.value = '' }} />
                <button type='button' onClick={() => docFileRef.current?.click()}
                  className='w-full rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 hover:border-red-300 hover:bg-red-50/40 transition'>
                  {docModal.file ? (
                    <span className='font-semibold text-gray-700'>{DOC_ICON(docModal.file.type)} {docModal.file.name} ({formatBytes(docModal.file.size)})</span>
                  ) : (
                    <span>{t('Klik untuk pilih file','Click to choose a file')}</span>
                  )}
                </button>
                {docModal.error && <span className='mt-1 block text-xs text-red-500'>{docModal.error}</span>}
              </div>

              {selectedDocType?.fields.issuedDate && (
                <FormField label={t('Issued Date','Issued Date')}>
                  <Input type='date' value={docModal.issuedDate} onChange={e => setDocModal(m => ({ ...m, issuedDate: e.target.value }))} />
                </FormField>
              )}
              {(selectedDocType?.fields.effectiveStartDate || selectedDocType?.fields.effectiveEndDate) && (
                <div className='grid grid-cols-2 gap-4'>
                  {selectedDocType.fields.effectiveStartDate && (
                    <FormField label={t('Effective Start Date','Effective Start Date')}>
                      <Input type='date' value={docModal.effectiveStartDate} onChange={e => setDocModal(m => ({ ...m, effectiveStartDate: e.target.value }))} />
                    </FormField>
                  )}
                  {selectedDocType.fields.effectiveEndDate && (
                    <FormField label={t('Effective End Date','Effective End Date')}>
                      <Input type='date' value={docModal.effectiveEndDate} onChange={e => setDocModal(m => ({ ...m, effectiveEndDate: e.target.value }))} />
                    </FormField>
                  )}
                </div>
              )}
              {selectedDocType?.fields.customField && (
                <FormField label={selectedDocType.customFieldLabel || t('Custom Field','Custom Field')}>
                  <Input value={docModal.customFieldValue} onChange={e => setDocModal(m => ({ ...m, customFieldValue: e.target.value }))} />
                </FormField>
              )}
              {selectedDocType?.fields.note && (
                <FormField label={t('Catatan (opsional)','Note (optional)')}>
                  <Input value={docModal.note} onChange={e => setDocModal(m => ({ ...m, note: e.target.value }))} />
                </FormField>
              )}
            </div>
            )}

            <div className='flex justify-end gap-2 mt-6'>
              <button onClick={closeDocModal} className='px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700'>{t('Batal','Cancel')}</button>
              <ActionButton icon='💾' onClick={saveDocument} disabled={!docModal.file || !selectedDocType}>{t('Simpan','Save')}</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
