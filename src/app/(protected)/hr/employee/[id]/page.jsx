'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEmployeeStore, ACTION_COLOR, HISTORY_ACTIONS, HISTORY_REASONS } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useRecruitmentStore } from '@/store/recruitmentStore'
import { formatRp, sumVariableAllowances } from '@/store/payrollStore'
import { useMasterLookupStore } from '@/store/masterLookupStore'
import { useEmployeeDocumentStore, DOCUMENT_MAX_BYTES } from '@/store/employeeDocumentStore'
import { useDocumentTypeStore } from '@/store/documentTypeStore'
import { useAuthStore } from '@/store/authStore'
import { PTKP_STATUSES } from '@/lib/payrollCalc'
import { useT } from '@/store/languageStore'
import { RELS, GENDERS, RELIGIONS, MARITAL, COUNTRIES, CITIES, EDU_LEVELS, SKILL_LVLS } from '@/utils/constants'
import { FormField, Input, Select, ActionButton, StatusBadge, DocCompletionDonut } from '@/components/ui'

const TABS = ['Employment', 'Bio', 'Dependent', 'Profile', 'History', 'Salary', 'Personal Document']

const DOC_ICON = (fileType) => {
  if (fileType?.includes('pdf')) return '📄'
  if (fileType?.startsWith('image/')) return '🖼️'
  if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
  if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📊'
  return '📎'
}

const formatBytes = (n) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`

const skillLevelColor = (level) => {
  if (level === 'Expert')       return 'bg-purple-100 text-purple-700'
  if (level === 'Advanced')     return 'bg-blue-100 text-blue-700'
  if (level === 'Intermediate') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

const statusBg = (status) => {
  if (status === 'Active')     return 'bg-green-100 text-green-700'
  if (status === 'Inactive')   return 'bg-red-100 text-red-700'
  if (status === 'Terminated') return 'bg-gray-200 text-gray-600'
  if (status === 'Resigned')   return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-500'
}

const empTypeBg = (type) => {
  if (!type) return 'bg-gray-100 text-gray-600'
  const lower = type.toLowerCase()
  if (lower.includes('tetap') || lower.includes('permanent')) return 'bg-indigo-100 text-indigo-700'
  if (lower.includes('kontrak') || lower.includes('contract'))  return 'bg-amber-100 text-amber-700'
  if (lower.includes('harian') || lower.includes('lepas'))     return 'bg-purple-100 text-purple-700'
  if (lower.includes('free') || lower.includes('lance'))       return 'bg-teal-100 text-teal-700'
  if (lower.includes('intern') || lower.includes('magang'))    return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-700'
}

function KVRow({ label, value }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-xs text-gray-400 font-medium'>{label}</span>
      <span className='text-sm text-gray-800 font-semibold'>{value || '—'}</span>
    </div>
  )
}

function ManagerRow({ label, manager, headcount }) {
  if (!manager) return <KVRow label={label} value={null} />
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-xs text-gray-400 font-medium'>{label}</span>
      <a href={`/hr/employee/${manager.id}`} className='text-sm font-semibold text-red-700 hover:underline'>
        {manager.name}
      </a>
      <span className='text-xs text-gray-500'>{manager.nik} · Headcount: {headcount}</span>
    </div>
  )
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// Sentinel "no end date yet" value (instead of null/blank) — standard
// convention so an open-ended record can still sort/compare like a real date.
const NO_END_DATE = '9999-01-01'
const formatEndDate = (d) => (!d || d === NO_END_DATE) ? '—' : d

const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Intern']

const EMPTY_RECORD = {
  effectiveDate: todayStr(), effectiveEndDate: NO_END_DATE, effectiveSeq: 1,
  action: 'Salary Change', reason: '', note: '',
  companyId: '', departmentId: '', positionId: '', gradeId: '', employmentType: '',
  basic: '', allowance: '', variableAllowances: [], ptkpStatus: 'TK/0', npwp: true,
  bpjsKesehatan: true, bpjsTk: true,
}

const BIO_EMPTY_RECORD = {
  effectiveDate: todayStr(), effectiveEndDate: NO_END_DATE, effectiveSeq: 1, reason: 'Personal Data Update', note: '',
  gender: '', birthDate: '', birthPlace: '', nationality: '', religion: '', maritalStatus: '',
  phone: '', email: '', personalEmail: '', address: '', city: '', country: '',
  ktp: '', npwp: '', bpjs: '',
}

export default function EmployeeProfilePage() {
  const { id } = useParams()
  const router  = useRouter()
  const searchParams = useSearchParams()
  const t       = useT()
  const {
    employees, updateEmployee, addHistory, updateHistory, deleteHistory, setPhoto, addDependent, updateDependent, deleteDependent,
    addBioHistory, updateBioHistory, deleteBioHistory,
    addEducation, updateEducation, deleteEducation,
    addCertification, updateCertification, deleteCertification,
    addSkill, updateSkill, deleteSkill,
  } = useEmployeeStore()
  const photoInputRef = useRef(null)
  const [photoError, setPhotoError] = useState(null)
  const { companies, divisions, businessUnits, departments, positions, grades, headcounts, updateHeadcount } = useStructureStore()
  const { candidates, updateCandidate } = useRecruitmentStore()
  const { currentUser } = useAuthStore()
  const { documents, addDocument, deleteDocument } = useEmployeeDocumentStore()
  const { types: docTypes } = useDocumentTypeStore()
  const activeDocTypes = docTypes.filter(x => x.active)
  const docFileRef = useRef(null)
  const [docModal, setDocModal] = useState(null) // { documentTypeId, issuedDate, effectiveStartDate, effectiveEndDate, note, customFieldValue, file, error }
  const [depModal, setDepModal] = useState(null) // { mode: 'add'|'edit', id?, name, relationship, birthDate, gender, phone, isEmergencyContact }
  const [eduModal, setEduModal] = useState(null) // { mode: 'add'|'edit', id?, level, institution, major, graduationYear }
  const [certModal, setCertModal] = useState(null) // { mode: 'add'|'edit', id?, name, issuer, issueYear, expiryYear }
  const [skillModal, setSkillModal] = useState(null) // { mode: 'add'|'edit', id?, name, level }
  // Select the category object itself (a stable reference unless its items
  // actually change) and derive the active-only list in render — filtering
  // inside the selector would return a new array every call and trip
  // useSyncExternalStore's "getSnapshot should be cached" check.
  const allowanceCategory = useMasterLookupStore(s => s.categories.find(c => c.key === 'variable-allowance'))
  const allowanceOptions = (allowanceCategory?.items || []).filter(i => i.active)

  const [tab, setTab] = useState(() => TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'Employment')
  const [recordModal, setRecordModal] = useState(null) // { mode: 'add'|'edit', form: {...} }
  const [bioModal, setBioModal] = useState(null) // { intent: 'correct'|'update', form: {...} }
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalForm, setApprovalForm] = useState({
    managerId: '',
    approver1Id: '',
    approver2Id: '',
  })
  const [matrixRows, setMatrixRows] = useState([])

  const emp = employees.find(e => String(e.id) === String(id))

  useEffect(() => {
    if (emp) {
      setApprovalForm({
        managerId: emp.managerId || '',
        approver1Id: emp.approver1Id || '',
        approver2Id: emp.approver2Id || '',
      })

      if (Array.isArray(emp.approvalMatrix) && emp.approvalMatrix.length > 0) {
        setMatrixRows(emp.approvalMatrix.map((m, i) => ({
          level: i + 1,
          employeeId: m.employeeId || '',
          label: m.label || `Approval ${i + 1}`,
        })))
      } else {
        const rows = []
        const a1 = emp.approver1Id || emp.managerId || ''
        const a2 = emp.approver2Id || ''
        if (a1) rows.push({ level: 1, employeeId: a1, label: 'Approval 1 (Operasional)' })
        if (a2 && a2 !== a1) rows.push({ level: 2, employeeId: a2, label: 'Approval 2 (Manager)' })
        if (rows.length === 0) rows.push({ level: 1, employeeId: '', label: 'Approval 1 (Operasional)' })
        setMatrixRows(rows)
      }
    }
  }, [emp])

  if (!emp) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-3'>
        <span className='text-5xl'><Icon e='👤' size={15} /></span>
        <p className='text-sm font-semibold'>{t('Karyawan tidak ditemukan.', 'Employee not found.')}</p>
        <button onClick={() => router.push('/hr/employee')}
          className='px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition'
          style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
          {t('Kembali', 'Back')}
        </button>
      </div>
    )
  }

  const manager      = employees.find(e => e.id === emp.managerId)
  const managerHeadcount = manager ? employees.filter(e => e.managerId === manager.id && e.status === 'Active').length : 0
  const approver1    = employees.find(e => e.id === emp.approver1Id)
  const approver2    = employees.find(e => e.id === emp.approver2Id)

  const directSubordinates = employees
    .filter(e => e.managerId === emp.id && e.status === 'Active')
    .sort((a, b) => a.name.localeCompare(b.name))

  // The employee's unified History is the single source of truth for both
  // job assignment (company/department/position/grade/employment type) and
  // compensation, each entry effective-dated (Effective Start/End/Sequence) —
  // same list as Hire/Transfer/Promotion/etc. "Assignment" records are any
  // entry carrying a position; "salary" records are the subset that also
  // carry a basic salary. The Employment tab reads the assignment record in
  // effect today; falls back to the employee's static fields for employees
  // that don't have a dated record yet.
  const today = todayStr()
  const historyRecords = [...(emp.history || [])]
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.effectiveSeq - a.effectiveSeq)
  const assignmentRecords = historyRecords.filter(h => h.positionId)
  const activeAssignment = assignmentRecords.find(r =>
    r.effectiveDate <= today && (!r.effectiveEndDate || r.effectiveEndDate >= today))
  const salaryRecords = historyRecords.filter(h => h.basic != null)
  const activeRecordId = salaryRecords.find(r =>
    r.effectiveDate <= today && (!r.effectiveEndDate || r.effectiveEndDate >= today))?.id
  // The earliest Hire entry — "Cancel Employment" pins itself to this exact
  // date (next sequence) so it reads as "voided the same day it started",
  // never as a real separate employment event.
  const hireRecord = [...(emp.history || [])].filter(h => h.action === 'Hire')
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.effectiveSeq - b.effectiveSeq)[0]

  // Personal data (Bio) follows the same effective-dated Correct/Update
  // pattern as Employment/Salary above, but in its own array — falls back
  // to the employee's static fields until the first bio record is saved.
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

  // No dated record yet? Show a synthetic "Hire" baseline (from the
  // employee's join date + current static fields) instead of a blank
  // Effective Dates block, so there's always a first entry with an Action.
  const displayAssignment = activeAssignment || {
    action: 'Hire', reason: 'New Hire', effectiveDate: emp.joinDate || today, effectiveEndDate: NO_END_DATE, effectiveSeq: 1,
    companyId: emp.companyId, departmentId: emp.departmentId, positionId: emp.positionId, gradeId: emp.gradeId,
    employmentType: emp.employmentType,
  }

  const eff = activeAssignment || {}
  const company        = companies.find(c => c.id === (eff.companyId ?? emp.companyId))
  const division       = divisions.find(d => d.id === emp.divisionId)
  const businessUnit   = businessUnits.find(b => b.id === emp.businessUnitId)
  const department     = departments.find(d => d.id === (eff.departmentId ?? emp.departmentId))
  const positionIdEff   = eff.positionId ?? emp.positionId
  const position       = positions.find(p => p.id === positionIdEff)
  const gradeIdEff      = eff.gradeId ?? emp.gradeId
  // Individual Class isn't part of the dated History record (only set via
  // the Employment tab's Grade section) — always read straight off emp.
  const individualClassIdEff = emp.individualClassId
  const employmentTypeEff = eff.employmentType || emp.employmentType

  // Headcount Title: a unique seat label for this position — "Software
  // Engineer" (Position Title) becomes "Software Engineer A" for the first
  // active employee holding that position, "Software Engineer B" for the
  // second, and so on (spreadsheet-style lettering: ..., Y, Z, AA, AB, ...).
  const toSeatLetter = (n) => {
    let s = '', i = n + 1
    while (i > 0) { const rem = (i - 1) % 26; s = String.fromCharCode(65 + rem) + s; i = Math.floor((i - 1) / 26) }
    return s
  }
  const positionPeers = positionIdEff
    ? employees.filter(e => e.positionId === positionIdEff && e.status === 'Active').sort((a, b) => a.id - b.id)
    : []
  const seatIndex = positionPeers.findIndex(e => e.id === emp.id)
  const headcountTitle = position && seatIndex >= 0
    ? (positionPeers.length > 1 ? `${position.name} ${toSeatLetter(seatIndex)}` : position.name)
    : null

  const PHOTO_MAX_BYTES = 2 * 1024 * 1024 // 2 MB
  const handlePhotoFile = (file) => {
    setPhotoError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError(t('File harus berupa gambar.','File must be an image.')); return }
    if (file.size > PHOTO_MAX_BYTES) { setPhotoError(t('Ukuran gambar maksimal 2 MB.','Image must be under 2 MB.')); return }
    const reader = new FileReader()
    reader.onload = (e) => setPhoto(emp.id, e.target.result)
    reader.readAsDataURL(file)
  }

  const myDocuments = documents
    .filter(d => d.employeeId === emp.id)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  // Mandatory types with no uploaded document yet (matched by category name —
  // a type stays "satisfied" even if later renamed, since renaming updates
  // this same name every existing document already carries).
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

  const openAddEducation = () => setEduModal({ mode: 'add', level: EDU_LEVELS[0], institution: '', major: '', graduationYear: '' })
  const openEditEducation = (ed) => setEduModal({ mode: 'edit', id: ed.id, level: ed.level, institution: ed.institution, major: ed.major || '', graduationYear: ed.graduationYear || '' })
  const closeEduModal = () => setEduModal(null)
  const saveEducation = () => {
    if (!eduModal.institution.trim()) return
    const payload = { level: eduModal.level, institution: eduModal.institution.trim(), major: eduModal.major.trim(), graduationYear: eduModal.graduationYear }
    if (eduModal.mode === 'add') addEducation(emp.id, payload)
    else updateEducation(emp.id, eduModal.id, payload)
    closeEduModal()
  }
  const removeEducation = (ed) => {
    if (!window.confirm(t(`Hapus riwayat pendidikan "${ed.institution}"?`, `Delete education record "${ed.institution}"?`))) return
    deleteEducation(emp.id, ed.id)
  }

  const openAddCertification = () => setCertModal({ mode: 'add', name: '', issuer: '', issueYear: '', expiryYear: '' })
  const openEditCertification = (cert) => setCertModal({ mode: 'edit', id: cert.id, name: cert.name, issuer: cert.issuer || '', issueYear: cert.issueYear || '', expiryYear: cert.expiryYear || '' })
  const closeCertModal = () => setCertModal(null)
  const saveCertification = () => {
    if (!certModal.name.trim()) return
    const payload = { name: certModal.name.trim(), issuer: certModal.issuer.trim(), issueYear: certModal.issueYear, expiryYear: certModal.expiryYear }
    if (certModal.mode === 'add') addCertification(emp.id, payload)
    else updateCertification(emp.id, certModal.id, payload)
    closeCertModal()
  }
  const removeCertification = (cert) => {
    if (!window.confirm(t(`Hapus sertifikasi "${cert.name}"?`, `Delete certification "${cert.name}"?`))) return
    deleteCertification(emp.id, cert.id)
  }

  const openAddSkill = () => setSkillModal({ mode: 'add', name: '', level: SKILL_LVLS[0] })
  const openEditSkill = (sk) => setSkillModal({ mode: 'edit', id: sk.id, name: sk.name, level: sk.level })
  const closeSkillModal = () => setSkillModal(null)
  const saveSkill = () => {
    if (!skillModal.name.trim()) return
    const payload = { name: skillModal.name.trim(), level: skillModal.level }
    if (skillModal.mode === 'add') addSkill(emp.id, payload)
    else updateSkill(emp.id, skillModal.id, payload)
    closeSkillModal()
  }
  const removeSkill = (sk) => {
    if (!window.confirm(t(`Hapus keahlian "${sk.name}"?`, `Delete skill "${sk.name}"?`))) return
    deleteSkill(emp.id, sk.id)
  }

  const openAddRecord = () => setRecordModal({
    mode: 'add',
    form: {
      ...EMPTY_RECORD, effectiveDate: today,
      companyId: eff.companyId ?? emp.companyId ?? '', departmentId: eff.departmentId ?? emp.departmentId ?? '',
      positionId: eff.positionId ?? emp.positionId ?? '', gradeId: eff.gradeId ?? emp.gradeId ?? '',
      employmentType: employmentTypeEff || '',
    },
  })
  const openEditRecord = (record) => setRecordModal({ mode: 'edit', form: { ...record, effectiveEndDate: record.effectiveEndDate || NO_END_DATE } })
  const closeModal = () => setRecordModal(null)

  const deleteRecord = (record) => {
    if (window.confirm(t(`Hapus riwayat gaji efektif ${record.effectiveDate}?`, `Delete salary record effective ${record.effectiveDate}?`))) {
      deleteHistory(emp.id, record.id)
    }
  }

  const handlePositionChange = (posId) => {
    const p = positions.find(x => x.id === Number(posId))
    setRecordModal(m => ({ ...m, form: { ...m.form, positionId: posId, gradeId: p?.gradeId || m.form.gradeId } }))
  }

  const addVariableRow = () =>
    setRecordModal(m => ({ ...m, form: { ...m.form, variableAllowances: [...(m.form.variableAllowances||[]), { id: Date.now(), label: '', amount: '' }] } }))
  const updateVariableRow = (rowId, patch) =>
    setRecordModal(m => ({ ...m, form: { ...m.form, variableAllowances: m.form.variableAllowances.map(r => r.id === rowId ? { ...r, ...patch } : r) } }))
  const removeVariableRow = (rowId) =>
    setRecordModal(m => ({ ...m, form: { ...m.form, variableAllowances: m.form.variableAllowances.filter(r => r.id !== rowId) } }))

  const saveRecord = () => {
    const f = recordModal.form
    const payload = {
      effectiveDate: f.effectiveDate,
      effectiveEndDate: f.effectiveEndDate || NO_END_DATE,
      effectiveSeq: Number(f.effectiveSeq) || 1,
      action: f.action, reason: f.reason, note: f.note || '',
      companyId: f.companyId ? Number(f.companyId) : '',
      departmentId: f.departmentId ? Number(f.departmentId) : '',
      positionId: f.positionId ? Number(f.positionId) : '',
      gradeId: f.gradeId ? Number(f.gradeId) : '',
      employmentType: f.employmentType || '',
      basic: Number(f.basic) || 0,
      allowance: Number(f.allowance) || 0,
      variableAllowances: (f.variableAllowances || [])
        .filter(r => r.label.trim() || Number(r.amount))
        .map(r => ({ id: r.id, label: r.label.trim(), amount: Number(r.amount) || 0 })),
      ptkpStatus: f.ptkpStatus,
      npwp: f.npwp,
      bpjsKesehatan: f.bpjsKesehatan,
      bpjsTk: f.bpjsTk,
    }
    if (recordModal.mode === 'add') addHistory(emp.id, payload)
    else updateHistory(emp.id, f.id, payload)

    // "Cancel Employment" means this hire is voided — free the Headcount
    // seat it was claiming, and un-claim the recruitment candidate it came
    // from (back to Rejected) so Job Requisition's Kebutuhan/Terpenuhi count
    // and the seat's availability both reflect it immediately, without
    // requiring a second manual cleanup step.
    if (payload.action === 'Cancel Employment') {
      updateEmployee(emp.id, { status: 'Inactive' })
      const seat = headcounts.find(h => h.employeeId === emp.id)
      if (seat) updateHeadcount(seat.id, { employeeId: null })
      const candidate = candidates.find(c => c.employeeId === emp.id)
      if (candidate) {
        const cancelNote = `[${t('Employment dibatalkan', 'Employment cancelled')}: ${payload.reason}]`
        updateCandidate(candidate.id, {
          employeeId: null, stage: 'Rejected',
          notes: candidate.notes ? `${candidate.notes} ${cancelNote}` : cancelNote,
        })
      }
    }

    closeModal()
  }

  const canSave = recordModal && recordModal.form.effectiveDate && recordModal.form.reason
    && (recordModal.form.action === 'Cancel Employment' || Number(recordModal.form.basic) > 0)
  const reasonOptions = recordModal ? (HISTORY_REASONS[recordModal.form.action] || []) : []

  // "Correct" edits the currently-effective bio record in place (no new
  // history row) — or, the first time, seeds one from the employee's join
  // date. "Update" always adds a new dated row, preserving the old value.
  const openCorrectBio = () => setBioModal({
    intent: 'correct',
    form: activeBio
      ? { ...activeBio, effectiveEndDate: activeBio.effectiveEndDate || NO_END_DATE }
      : { ...BIO_EMPTY_RECORD, ...displayBio, effectiveDate: emp.joinDate || today },
  })
  const openUpdateBio = () => setBioModal({
    intent: 'update',
    form: { ...BIO_EMPTY_RECORD, ...displayBio, id: undefined, effectiveDate: today },
  })
  const openEditBioRecord = (record) => setBioModal({
    intent: 'correct',
    form: { ...record, effectiveEndDate: record.effectiveEndDate || NO_END_DATE },
  })
  const closeBioModal = () => setBioModal(null)

  const deleteBioRecord = (record) => {
    if (window.confirm(t(`Hapus riwayat data pribadi efektif ${record.effectiveDate}?`, `Delete personal data record effective ${record.effectiveDate}?`))) {
      deleteBioHistory(emp.id, record.id)
    }
  }

  const saveBio = () => {
    const f = bioModal.form
    const payload = {
      effectiveDate: f.effectiveDate,
      effectiveEndDate: f.effectiveEndDate || NO_END_DATE,
      effectiveSeq: Number(f.effectiveSeq) || 1,
      reason: f.reason, note: (f.note || '').trim(),
      gender: f.gender, birthDate: f.birthDate, birthPlace: f.birthPlace, nationality: f.nationality,
      religion: f.religion, maritalStatus: f.maritalStatus,
      phone: f.phone, email: f.email, personalEmail: f.personalEmail,
      address: f.address, city: f.city, country: f.country,
      ktp: f.ktp, npwp: f.npwp, bpjs: f.bpjs,
    }
    if (f.id) updateBioHistory(emp.id, f.id, payload)
    else addBioHistory(emp.id, payload)
    closeBioModal()
  }

  const bioDateLocked = bioModal?.intent === 'correct' && !!bioModal.form.id

  return (
    <div className='max-w-4xl mx-auto pb-10'>

      {/* Back button */}
      <button onClick={() => router.push('/hr/employee')}
        className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-700 font-semibold mb-5 transition'>
        <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali ke Daftar Karyawan', 'Back to Employee List')}
      </button>

      {/* Header card */}
      <div className='rounded-2xl overflow-hidden shadow-sm mb-5' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
        <div className='px-6 py-6 flex items-center gap-5'>
          <div className='relative w-20 h-20 flex-shrink-0 group'>
            <div className='w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30'>
              {emp.photo
                ? <img src={emp.photo} alt='' className='w-full h-full object-cover' />
                : <span className='text-4xl'>{displayBio.gender === 'Female' ? '👩' : '👨'}</span>}
            </div>
            <input ref={photoInputRef} type='file' accept='image/*' className='hidden'
              onChange={e => { handlePhotoFile(e.target.files?.[0]); e.target.value = '' }} />
            <button type='button' onClick={() => photoInputRef.current?.click()}
              title={t('Ubah foto','Change photo')}
              className='absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white text-red-700 shadow flex items-center justify-center hover:bg-red-50 transition opacity-0 group-hover:opacity-100 focus:opacity-100'>
              <Icon e='📷' size={13} />
            </button>
          </div>
          <div className='flex-1 min-w-0'>
            <h1 className='text-2xl font-bold text-white'>{emp.name}</h1>
            <p className='text-red-200 text-sm mt-0.5 flex items-center gap-1.5 flex-wrap'>
              <span className='font-semibold'>{emp.jobTitle || emp.position || position?.name || '—'}</span>
              {emp.jobPosition && (
                <span className='text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded'>
                  {emp.jobPosition}
                </span>
              )}
              <span className='opacity-70'>·</span>
              <span>{department?.name || emp.dept || '—'}</span>
            </p>
            <div className='flex items-center gap-2 mt-2 flex-wrap'>
              <span className='font-mono text-xs bg-white/20 text-white px-2 py-0.5 rounded'>{emp.nik}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusBg(emp.status)}`}>
                {emp.status}
              </span>
              {employmentTypeEff && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${empTypeBg(employmentTypeEff)}`}>
                  {employmentTypeEff}
                </span>
              )}
              {company?.companyCode && (
                <span className='font-mono font-bold text-xs bg-white/20 text-white px-2 py-0.5 rounded tracking-widest'>
                  {company.companyCode}
                </span>
              )}
              {emp.location && (
                <span className='inline-flex items-center gap-1 font-semibold text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full'>
                  📍 {emp.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {photoError && (
        <p className='text-xs text-red-600 font-semibold -mt-3 mb-4'>{photoError}</p>
      )}

      {/* Tabs */}
      <div className='flex gap-1 bg-white rounded-xl shadow-sm px-3 py-2 mb-5 overflow-x-auto'>
        {TABS.map(name => (
          <button key={name} onClick={() => setTab(name)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${tab === name ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={tab === name ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
            {name}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className='bg-white rounded-2xl shadow-sm p-6'>

        {/* ── Employment ─────────────────────────────────────────────── */}
        {tab === 'Employment' && (
          <div>
            {/* Effective Start/End/Sequence — the primary key of this record */}
            <div className='rounded-xl p-4 mb-6' style={{ background: 'linear-gradient(135deg,#fdecea,#fdf3ea)', border: '1px solid #f5d5d0' }}>
              <div className='flex items-center justify-end mb-3'>
                <ActionButton size='sm' icon='➕' onClick={openAddRecord}>{t('Tambah Riwayat','Add Record')}</ActionButton>
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4'>
                <KVRow label={t('Aksi','Action')}                          value={displayAssignment.action} />
                <KVRow label={t('Efektif Mulai','Effective Start Date')}   value={displayAssignment.effectiveDate} />
                <KVRow label={t('Efektif Sampai','Effective End Date')}    value={formatEndDate(displayAssignment.effectiveEndDate)} />
                <KVRow label={t('Sequence','Effective Sequence')}          value={displayAssignment.effectiveSeq} />
              </div>
              {!activeAssignment && (
                <p className='text-xs text-gray-500 mt-3'>
                  {t('Belum ada riwayat penempatan tersimpan — nilai di atas adalah default dari data Hire karyawan ini.','No assignment record saved yet — the values above default from this employee\'s Hire data.')}
                </p>
              )}
              <a href='#' onClick={(e)=>{e.preventDefault(); setTab('History')}} className='inline-block mt-3 text-xs font-semibold text-red-700 hover:underline'>
                {t('Lihat semua riwayat →','View full history →')}
              </a>
            </div>

            <p className='text-xs text-gray-400 mb-4'>
              {t('Data di bawah ini mengikuti record efektif di atas — sumbernya sama dengan tab History.', 'The data below follows the effective record above — same source as the History tab.')}
            </p>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5'>
              <KVRow label={t('Perusahaan', 'Company')}      value={company?.name || (emp.address ? emp.address.split('\n')[0].trim() : 'PT Gemilang Nusantara')} />
              <KVRow label={t('Divisi', 'Division')}         value={division?.name} />
              <KVRow label={t('Business Unit', 'Business Unit')} value={businessUnit?.name} />
              <KVRow label={t('Departemen', 'Department')}   value={emp.dept || department?.name} />
              <KVRow label={t('Job Title', 'Job Title')}     value={emp.jobTitle || emp.position || position?.name} />
              <KVRow label={t('Job Position', 'Job Position')} value={emp.jobPosition || '—'} />
              <KVRow label={t('Grade', 'Grade')}             value={gradeIdEff ? `PC ${gradeIdEff}` : null} />
              <KVRow label='IC'                              value={individualClassIdEff ? `IC ${individualClassIdEff}` : null} />
              <KVRow label={t('Tipe Kepegawaian', 'Employment Type')} value={employmentTypeEff} />
              <KVRow label={t('Tanggal Bergabung', 'Join Date')} value={emp.joinDate} />
              {emp.endDate && <KVRow label={t('Tanggal Akhir', 'End Date')} value={emp.endDate} />}
              <ManagerRow label={t('Atasan Langsung', 'Direct Manager')} manager={manager} headcount={managerHeadcount} />
            </div>

            {/* ── MATRIKS APPROVAL CUTI & WORKFLOW ────────────────────────── */}
            <div className='border-t border-gray-100 mt-6 pt-5'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5'>
                  <span>🔄</span> {t('Matriks Persetujuan Cuti & Workflow', 'Leave Approval Matrix & Workflow')}
                </h3>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className='text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#052B52]/20 text-[#052B52] hover:bg-[#052B52]/5 transition flex items-center gap-1'
                >
                  <Icon e='✏️' size={12} />
                  {t('Edit Matriks Approval', 'Edit Approval Matrix')}
                </button>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/80 p-4 rounded-xl border border-gray-200'>
                {/* 1. Atasan Langsung */}
                <div className='bg-white p-3 rounded-lg border border-gray-100 shadow-sm'>
                  <div className='text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1'>
                    <span>👤</span> Atasan Langsung
                  </div>
                  <div className='text-sm font-semibold text-gray-800 truncate'>
                    {manager ? manager.name : '— Belum Diset —'}
                  </div>
                  <div className='text-xs text-gray-500 truncate mt-0.5'>
                    {manager?.jobPosition || manager?.position || 'Manager / Leader'}
                  </div>
                </div>

                {/* 2. Tingkat Approval Dinamis (N-Tier) */}
                {matrixRows.filter(r => r.employeeId).map((row, idx) => {
                  const approverEmp = employees.find(e => e.id === row.employeeId)
                  const toneColors = [
                    { border: 'border-blue-100', text: 'text-blue-600', sub: 'text-blue-500' },
                    { border: 'border-amber-100', text: 'text-amber-600', sub: 'text-amber-500' },
                    { border: 'border-indigo-100', text: 'text-indigo-600', sub: 'text-indigo-500' },
                    { border: 'border-rose-100', text: 'text-rose-600', sub: 'text-rose-500' },
                  ]
                  const tone = toneColors[idx % toneColors.length]
                  return (
                    <div key={idx} className={`bg-white p-3 rounded-lg border ${tone.border} shadow-sm`}>
                      <div className={`text-[11px] font-semibold ${tone.text} uppercase tracking-wider mb-1 flex items-center gap-1`}>
                        <span>{idx === 0 ? '1️⃣' : idx === 1 ? '2️⃣' : idx === 2 ? '3️⃣' : `${idx + 1}️⃣`}</span>
                        {row.label || `Approval ${idx + 1}`}
                      </div>
                      <div className='text-sm font-semibold text-gray-800 truncate'>
                        {approverEmp ? approverEmp.name : '— Belum Diset —'}
                      </div>
                      <div className={`text-xs ${tone.sub} truncate mt-0.5`}>
                        {approverEmp?.jobPosition || approverEmp?.position || `Tingkat ${idx + 1}`}
                      </div>
                    </div>
                  )
                })}

                {/* 3. Persetujuan Akhir (HR) */}
                <div className='bg-white p-3 rounded-lg border border-purple-100 shadow-sm'>
                  <div className='text-[11px] font-semibold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1'>
                    <span>🏢</span> Persetujuan Akhir
                  </div>
                  <div className='text-sm font-semibold text-purple-900 truncate'>
                    HR Department
                  </div>
                  <div className='text-xs text-purple-500 truncate mt-0.5'>
                    Final Gate (Ubah Status Approved)
                  </div>
                </div>
              </div>
            </div>

            {/* ── LOCATION (Sesuai Odoo) ────────────────────────── */}
            <div className='border-t border-gray-100 mt-6 pt-5'>
              <h3 className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5'>
                <span>🏢</span> LOCATION
              </h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 bg-gray-50/70 p-4 rounded-xl border border-gray-100'>
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
                <KVRow
                  label={t('Aturan Jam Kerja & Presensi', 'Work Schedule Rule')}
                  value={
                    emp.workLocationCode === 'ho' ? '09:00 - 18:00 (Sabtu Libur)' :
                    emp.workLocationCode === 'sales' ? '09:00 - 17:00 (Sabtu 09:00 - 15:00)' :
                    emp.workLocationCode === 'gudang' ? '08:00 - 17:00 (Sabtu 08:00 - 15:00)' :
                    emp.workLocationCode === 'livestream' ? '4 Jam Live (dalam 24 Jam)' : 'Standar HO (09:00 - 18:00)'
                  }
                />
                <KVRow
                  label={t('Status Mapping Odoo', 'Odoo Mapping Status')}
                  value={emp.imported_from === 'odoo' ? `Tersinkron Odoo (ID #${emp.odooWorkLocationId || emp.odoo_id})` : 'Data Lokal'}
                />
              </div>
            </div>

            <div className='border-t border-gray-100 mt-6 pt-5'>
              <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-3'>
                {t('Bawahan Langsung', 'Direct Subordinates')} ({directSubordinates.length})
              </h3>
              {directSubordinates.length === 0 ? (
                <p className='text-sm text-gray-400'>{t('Tidak ada bawahan langsung.','No direct subordinates.')}</p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='bg-gray-50'>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Nama','Name')}</th>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Posisi','Position')}</th>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Employee Number','Employee Number')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {directSubordinates.map(sub => (
                        <tr key={sub.id} className='border-t border-gray-100 hover:bg-gray-50'>
                          <td className='px-3 py-2.5'>
                            <a href={`/hr/employee/${sub.id}`} className='font-semibold text-red-700 hover:underline'>{sub.name}</a>
                          </td>
                          <td className='px-3 py-2.5 text-gray-600'>{sub.position || positions.find(p => p.id === sub.positionId)?.name || '—'}</td>
                          <td className='px-3 py-2.5 text-gray-500 font-mono text-xs'>{sub.nik}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bio ────────────────────────────────────────────────────── */}
        {tab === 'Bio' && (
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <p className='text-xs text-gray-400'>
                {activeBio
                  ? t(`Berlaku efektif ${activeBio.effectiveDate}${activeBio.reason ? ` · ${activeBio.reason}` : ''}.`, `In effect since ${activeBio.effectiveDate}${activeBio.reason ? ` · ${activeBio.reason}` : ''}.`)
                  : t('Belum ada riwayat data pribadi — data di bawah masih dari data dasar karyawan.', 'No dated personal data record yet — the data below still comes from the employee\'s base fields.')}
              </p>
              <div className='flex gap-2 flex-shrink-0'>
                <ActionButton size='sm' variant='secondary' icon='✏️' onClick={openCorrectBio}>{t('Correct','Correct')}</ActionButton>
                <ActionButton size='sm' icon='📅' onClick={openUpdateBio}>{t('Update (Tgl Efektif Baru)','Update (New Effective Date)')}</ActionButton>
              </div>
            </div>

            <div>
              <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-3'>{t('Informasi Pribadi', 'Personal Information')}</h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4'>
                <KVRow label={t('Jenis Kelamin', 'Gender')}        value={displayBio.gender} />
                <KVRow label={t('Tanggal Lahir', 'Birth Date')}    value={displayBio.birthDate} />
                <KVRow label={t('Tempat Lahir', 'Birth Place')}    value={displayBio.birthPlace} />
                <KVRow label={t('Kewarganegaraan', 'Nationality')} value={displayBio.nationality} />
                <KVRow label={t('Agama', 'Religion')}              value={displayBio.religion} />
                <KVRow label={t('Status Pernikahan', 'Marital Status')} value={displayBio.maritalStatus} />
              </div>
            </div>
            <div className='border-t border-gray-100 pt-5'>
              <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-3'>{t('Kontak', 'Contact')}</h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4'>
                <KVRow label={t('Telepon', 'Phone')}               value={displayBio.phone} />
                <KVRow label={t('Email Kerja', 'Work Email')}      value={displayBio.email} />
                <KVRow label={t('Email Pribadi', 'Personal Email')} value={displayBio.personalEmail} />
                <KVRow label={t('Alamat', 'Address')}              value={displayBio.address} />
                <KVRow label={t('Kota', 'City')}                   value={displayBio.city} />
                <KVRow label={t('Negara', 'Country')}              value={displayBio.country} />
              </div>
            </div>
            <div className='border-t border-gray-100 pt-5'>
              <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-3'>{t('Nomor Identitas', 'ID Numbers')}</h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4'>
                <KVRow label='KTP'  value={displayBio.ktp} />
                <KVRow label='NPWP' value={displayBio.npwp} />
                <KVRow label='BPJS' value={displayBio.bpjs} />
              </div>
            </div>

            {bioHistoryRecords.length > 0 && (
              <div className='border-t border-gray-100 pt-5'>
                <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-3'>{t('Riwayat Data Pribadi', 'Personal Data History')}</h3>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='bg-gray-50'>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Efektif Mulai','Effective Start')}</th>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Efektif Sampai','Effective End')}</th>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Alasan','Reason')}</th>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Catatan','Notes')}</th>
                        <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'></th>
                        <th className='px-3 py-2.5 w-20'></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bioHistoryRecords.map(r => (
                        <tr key={r.id} className='border-t border-gray-100 hover:bg-gray-50'>
                          <td className='px-3 py-2.5 font-mono text-xs text-gray-700'>{r.effectiveDate}</td>
                          <td className='px-3 py-2.5 font-mono text-xs text-gray-500'>{formatEndDate(r.effectiveEndDate)}</td>
                          <td className='px-3 py-2.5 text-gray-600 text-xs'>{r.reason || '—'}</td>
                          <td className='px-3 py-2.5 text-gray-500 text-xs'>{r.note || '—'}</td>
                          <td className='px-3 py-2.5'>
                            {r.id === activeBio?.id && <StatusBadge tone='success'>{t('Aktif','Active')}</StatusBadge>}
                          </td>
                          <td className='px-3 py-2.5 text-right whitespace-nowrap'>
                            <button onClick={()=>openEditBioRecord(r)} className='text-xs font-semibold text-red-700 hover:underline mr-3'>{t('Edit','Edit')}</button>
                            <button onClick={()=>deleteBioRecord(r)} className='text-gray-400 hover:text-red-600' aria-label={t('Hapus','Delete')}>
                              <Icon e='🗑️' size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Dependent ──────────────────────────────────────────────── */}
        {tab === 'Dependent' && (
          <div>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm font-bold text-gray-800'>{t('Tanggungan', 'Dependents')}</h3>
              <ActionButton size='sm' icon='➕' onClick={openAddDependent}>{t('Tambah Tanggungan', 'Add Dependent')}</ActionButton>
            </div>

            {(!emp.dependents || emp.dependents.length === 0) ? (
              <div className='flex flex-col items-center justify-center py-16 text-gray-400 gap-2'>
                <span className='text-4xl'><Icon e='👨‍👩‍👧' size={15} /></span>
                <p className='text-sm'>{t('Tidak ada data tanggungan.', 'No dependents recorded.')}</p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Nama', 'Name')}</th>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Hubungan', 'Relationship')}</th>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Tanggal Lahir', 'Birth Date')}</th>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Jenis Kelamin', 'Gender')}</th>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Telepon', 'Phone')}</th>
                      <th className='px-4 py-2.5 text-center text-xs font-bold text-gray-500'>{t('Kontak Darurat', 'Emergency Contact')}</th>
                      <th className='px-4 py-2.5 text-right text-xs font-bold text-gray-500'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {emp.dependents.map((d, i) => (
                      <tr key={d.id ?? i} className='border-t border-gray-100 hover:bg-gray-50'>
                        <td className='px-4 py-3 font-semibold text-gray-800'>{d.name}</td>
                        <td className='px-4 py-3 text-gray-600'>{d.relationship}</td>
                        <td className='px-4 py-3 text-gray-600'>{d.birthDate || '—'}</td>
                        <td className='px-4 py-3 text-gray-600'>{d.gender}</td>
                        <td className='px-4 py-3 text-gray-600'>{d.phone || '—'}</td>
                        <td className='px-4 py-3 text-center'>
                          {d.isEmergencyContact
                            ? <StatusBadge tone='danger'>{t('Kontak Darurat', 'Emergency')}</StatusBadge>
                            : <span className='text-gray-300'>—</span>}
                        </td>
                        <td className='px-4 py-3 text-right'>
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
            )}
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

        {/* Education add/edit modal */}
        {eduModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeEduModal}>
            <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
              <div className='mb-4 flex items-start justify-between'>
                <h3 className='text-base font-bold text-gray-800'>
                  {eduModal.mode === 'add' ? t('Tambah Pendidikan', 'Add Education') : t('Ubah Pendidikan', 'Edit Education')}
                </h3>
                <button onClick={closeEduModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField label={t('Jenjang', 'Level')}>
                    <Select value={eduModal.level} onChange={e => setEduModal(m => ({ ...m, level: e.target.value }))}>
                      {EDU_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                    </Select>
                  </FormField>
                  <FormField label={t('Tahun Lulus', 'Graduation Year')}>
                    <Input type='number' value={eduModal.graduationYear} onChange={e => setEduModal(m => ({ ...m, graduationYear: e.target.value }))} />
                  </FormField>
                </div>
                <FormField label={t('Institusi', 'Institution')} required>
                  <Input value={eduModal.institution} onChange={e => setEduModal(m => ({ ...m, institution: e.target.value }))} autoFocus />
                </FormField>
                <FormField label={t('Jurusan', 'Major')}>
                  <Input value={eduModal.major} onChange={e => setEduModal(m => ({ ...m, major: e.target.value }))} />
                </FormField>
              </div>
              <div className='mt-6 flex justify-end gap-2'>
                <ActionButton variant='secondary' onClick={closeEduModal}>{t('Batal', 'Cancel')}</ActionButton>
                <ActionButton icon='💾' onClick={saveEducation} disabled={!eduModal.institution.trim()}>{t('Simpan', 'Save')}</ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* Certification add/edit modal */}
        {certModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeCertModal}>
            <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
              <div className='mb-4 flex items-start justify-between'>
                <h3 className='text-base font-bold text-gray-800'>
                  {certModal.mode === 'add' ? t('Tambah Sertifikasi', 'Add Certification') : t('Ubah Sertifikasi', 'Edit Certification')}
                </h3>
                <button onClick={closeCertModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
              </div>
              <div className='space-y-4'>
                <FormField label={t('Nama Sertifikasi', 'Certification Name')} required>
                  <Input value={certModal.name} onChange={e => setCertModal(m => ({ ...m, name: e.target.value }))} autoFocus />
                </FormField>
                <FormField label={t('Penerbit', 'Issuer')}>
                  <Input value={certModal.issuer} onChange={e => setCertModal(m => ({ ...m, issuer: e.target.value }))} />
                </FormField>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField label={t('Tahun Terbit', 'Issue Year')}>
                    <Input type='number' value={certModal.issueYear} onChange={e => setCertModal(m => ({ ...m, issueYear: e.target.value }))} />
                  </FormField>
                  <FormField label={t('Tahun Kedaluwarsa', 'Expiry Year')} hint={t('Opsional','Optional')}>
                    <Input type='number' value={certModal.expiryYear} onChange={e => setCertModal(m => ({ ...m, expiryYear: e.target.value }))} />
                  </FormField>
                </div>
              </div>
              <div className='mt-6 flex justify-end gap-2'>
                <ActionButton variant='secondary' onClick={closeCertModal}>{t('Batal', 'Cancel')}</ActionButton>
                <ActionButton icon='💾' onClick={saveCertification} disabled={!certModal.name.trim()}>{t('Simpan', 'Save')}</ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* Skill add/edit modal */}
        {skillModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeSkillModal}>
            <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
              <div className='mb-4 flex items-start justify-between'>
                <h3 className='text-base font-bold text-gray-800'>
                  {skillModal.mode === 'add' ? t('Tambah Keahlian', 'Add Skill') : t('Ubah Keahlian', 'Edit Skill')}
                </h3>
                <button onClick={closeSkillModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
              </div>
              <div className='space-y-4'>
                <FormField label={t('Nama Keahlian', 'Skill Name')} required>
                  <Input value={skillModal.name} onChange={e => setSkillModal(m => ({ ...m, name: e.target.value }))} autoFocus />
                </FormField>
                <FormField label={t('Level', 'Level')}>
                  <Select value={skillModal.level} onChange={e => setSkillModal(m => ({ ...m, level: e.target.value }))}>
                    {SKILL_LVLS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                  </Select>
                </FormField>
              </div>
              <div className='mt-6 flex justify-end gap-2'>
                <ActionButton variant='secondary' onClick={closeSkillModal}>{t('Batal', 'Cancel')}</ActionButton>
                <ActionButton icon='💾' onClick={saveSkill} disabled={!skillModal.name.trim()}>{t('Simpan', 'Save')}</ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* ── Profile (Education / Certs / Skills) ───────────────────── */}
        {tab === 'Profile' && (
          <div className='space-y-7'>

            {/* Education */}
            <div>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide'>{t('Pendidikan', 'Education')}</h3>
                <ActionButton size='sm' icon='➕' onClick={openAddEducation}>{t('Tambah','Add')}</ActionButton>
              </div>
              {(!emp.education || emp.education.length === 0) ? (
                <p className='text-sm text-gray-400'>{t('Tidak ada data.', 'No data.')}</p>
              ) : (
                <div className='space-y-3'>
                  {emp.education.map((ed, i) => (
                    <div key={ed.id ?? i} className='group flex items-start gap-3 p-3 border border-gray-100 rounded-xl'>
                      <div className='w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                        <span className='text-white text-xs font-bold'>{ed.level}</span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-semibold text-gray-800'>{ed.institution}</p>
                        <p className='text-xs text-gray-500'>{ed.major} · {ed.graduationYear}</p>
                      </div>
                      <div className='flex gap-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition'>
                        <button onClick={() => openEditEducation(ed)} className='text-xs font-semibold text-teal-700 hover:underline'>{t('Ubah', 'Edit')}</button>
                        <button onClick={() => removeEducation(ed)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className='border-t border-gray-100 pt-5'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide'>{t('Sertifikasi', 'Certifications')}</h3>
                <ActionButton size='sm' icon='➕' onClick={openAddCertification}>{t('Tambah','Add')}</ActionButton>
              </div>
              {(!emp.certifications || emp.certifications.length === 0) ? (
                <p className='text-sm text-gray-400'>{t('Tidak ada data.', 'No data.')}</p>
              ) : (
                <div className='space-y-3'>
                  {emp.certifications.map((cert, i) => (
                    <div key={cert.id ?? i} className='group flex items-start gap-3 p-3 border border-gray-100 rounded-xl'>
                      <div className='w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg flex-shrink-0'>
                        🏅
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-semibold text-gray-800'>{cert.name}</p>
                        <p className='text-xs text-gray-500'>{cert.issuer} · {cert.issueYear}{cert.expiryYear ? ` – ${cert.expiryYear}` : ''}</p>
                      </div>
                      <div className='flex gap-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition'>
                        <button onClick={() => openEditCertification(cert)} className='text-xs font-semibold text-teal-700 hover:underline'>{t('Ubah', 'Edit')}</button>
                        <button onClick={() => removeCertification(cert)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className='border-t border-gray-100 pt-5'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wide'>{t('Keahlian', 'Skills')}</h3>
                <ActionButton size='sm' icon='➕' onClick={openAddSkill}>{t('Tambah','Add')}</ActionButton>
              </div>
              {(!emp.skills || emp.skills.length === 0) ? (
                <p className='text-sm text-gray-400'>{t('Tidak ada data.', 'No data.')}</p>
              ) : (
                <div className='flex flex-wrap gap-2'>
                  {emp.skills.map((sk, i) => (
                    <div key={sk.id ?? i} className='group flex items-center gap-1.5 border border-gray-200 rounded-full pl-3 pr-1.5 py-1.5'>
                      <span className='text-sm text-gray-700 font-semibold'>{sk.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${skillLevelColor(sk.level)}`}>{sk.level}</span>
                      <button onClick={() => openEditSkill(sk)} title={t('Ubah','Edit')}
                        className='w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-teal-700 opacity-0 group-hover:opacity-100 transition'>
                        <Icon e='✏️' size={10} />
                      </button>
                      <button onClick={() => removeSkill(sk)} title={t('Hapus','Delete')}
                        className='w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition'>
                        <Icon e='✕' size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── History ────────────────────────────────────────────────── */}
        {tab === 'History' && (
          <div>
            {(!emp.history || emp.history.length === 0) ? (
              <div className='flex flex-col items-center justify-center py-16 text-gray-400 gap-2'>
                <span className='text-4xl'><Icon e='📜' size={15} /></span>
                <p className='text-sm'>{t('Tidak ada riwayat kepegawaian.', 'No employment history.')}</p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Tanggal Efektif', 'Effective Date')}</th>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Aksi', 'Action')}</th>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Alasan', 'Reason')}</th>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Catatan', 'Notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...emp.history].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)).map((h, i) => (
                      <tr key={h.id ?? i} className='border-t border-gray-100 hover:bg-gray-50'>
                        <td className='px-4 py-3 text-gray-600 font-mono text-xs'>{h.effectiveDate}</td>
                        <td className='px-4 py-3'>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ACTION_COLOR[h.action] || 'bg-gray-100 text-gray-600'}`}>
                            {h.action}
                          </span>
                        </td>
                        <td className='px-4 py-3 text-gray-600 text-xs'>{h.reason || '—'}</td>
                        <td className='px-4 py-3 text-gray-500 text-xs'>{h.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Salary ─────────────────────────────────────────────────── */}
        {tab === 'Salary' && (
          <div>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='text-sm font-bold text-gray-800'>{t('Riwayat Gaji', 'Salary History')}</h3>
                <p className='text-xs text-gray-400'>{t('Bagian dari riwayat kepegawaian yang sama (lihat tab History) — tiap baris adalah snapshot gaji & jabatan di tanggal efektifnya, dipakai Payroll Run untuk memilih nilai yang berlaku di periode tersebut.', 'Part of the same unified employment history (see the History tab) — each row is a job + salary snapshot at its effective date, used by Payroll Run to pick the value that applies for a given period.')}</p>
              </div>
              <ActionButton size='sm' icon='➕' onClick={openAddRecord}>{t('Tambah Riwayat','Add Record')}</ActionButton>
            </div>

            {salaryRecords.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-gray-400 gap-2'>
                <span className='text-4xl'><Icon e='💰' size={15} /></span>
                <p className='text-sm'>{t('Belum ada riwayat gaji.','No salary records yet.')}</p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Efektif Mulai','Effective Start')}</th>
                      <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Efektif Sampai','Effective End')}</th>
                      <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Aksi','Action')}</th>
                      <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Posisi','Position')}</th>
                      <th className='px-3 py-2.5 text-right text-xs font-bold text-gray-500'>{t('Gaji Pokok','Basic')}</th>
                      <th className='px-3 py-2.5 text-right text-xs font-bold text-gray-500'>{t('Total Bruto','Gross')}</th>
                      <th className='px-3 py-2.5 text-left text-xs font-bold text-gray-500'></th>
                      <th className='px-3 py-2.5 w-20'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryRecords.map(r => {
                      const gross = r.basic + (r.allowance || 0) + sumVariableAllowances(r.variableAllowances)
                      const pos = positions.find(p => p.id === r.positionId)
                      return (
                        <tr key={r.id} className='border-t border-gray-100 hover:bg-gray-50'>
                          <td className='px-3 py-2.5 font-mono text-xs text-gray-700'>{r.effectiveDate}</td>
                          <td className='px-3 py-2.5 font-mono text-xs text-gray-500'>{formatEndDate(r.effectiveEndDate)}</td>
                          <td className='px-3 py-2.5'>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACTION_COLOR[r.action] || 'bg-gray-100 text-gray-600'}`}>{r.action}</span>
                          </td>
                          <td className='px-3 py-2.5 text-gray-600 text-xs'>{pos?.name || '—'}</td>
                          <td className='px-3 py-2.5 text-right text-gray-700'>{formatRp(r.basic)}</td>
                          <td className='px-3 py-2.5 text-right font-semibold text-gray-800'>{formatRp(gross)}</td>
                          <td className='px-3 py-2.5'>
                            {r.id === activeRecordId && <StatusBadge tone='success'>{t('Aktif','Active')}</StatusBadge>}
                          </td>
                          <td className='px-3 py-2.5 text-right whitespace-nowrap'>
                            <button onClick={()=>openEditRecord(r)} className='text-xs font-semibold text-red-700 hover:underline mr-3'>{t('Edit','Edit')}</button>
                            <button onClick={()=>deleteRecord(r)} className='text-gray-400 hover:text-red-600' aria-label={t('Hapus','Delete')}>
                              <Icon e='🗑️' size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <a href='/hr/payroll/run' className='inline-block mt-4 text-xs font-semibold text-red-700 hover:underline'>
              {t('Lihat di Payroll Run →','View in Payroll Run →')}
            </a>
          </div>
        )}

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
                {t('Belum ada document type aktif. Atur dulu di ', 'No active document types yet. Set them up under ')}
                <a href='/sysadmin/settings/master-document-types' className='font-semibold text-red-700 hover:underline'>
                  System Admin → Settings → Master Document Types
                </a>.
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

      {/* Salary record modal */}
      {recordModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='flex justify-between items-start mb-4'>
              <h3 className='text-base font-bold text-gray-800'>
                {recordModal.mode === 'add' ? t('Tambah Riwayat Gaji','Add Salary Record') : t('Edit Riwayat Gaji','Edit Salary Record')}
              </h3>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>

            <div className='grid grid-cols-3 gap-3 mb-3'>
              <FormField label={t('Efektif Mulai','Effective Start')} required>
                <Input type='date' value={recordModal.form.effectiveDate} disabled={recordModal.form.action === 'Cancel Employment'}
                  onChange={e=>setRecordModal(m=>({...m, form:{...m.form, effectiveDate:e.target.value}}))} />
              </FormField>
              <FormField label={t('Efektif Sampai','Effective End')} hint={t('Default 9999-01-01 = masih berlaku','Defaults to 9999-01-01 = still current')}>
                <Input type='date' value={recordModal.form.effectiveEndDate}
                  onChange={e=>setRecordModal(m=>({...m, form:{...m.form, effectiveEndDate:e.target.value}}))} />
              </FormField>
              <FormField label={t('Sequence','Sequence')}>
                <Input type='number' value={recordModal.form.effectiveSeq} disabled={recordModal.form.action === 'Cancel Employment'}
                  onChange={e=>setRecordModal(m=>({...m, form:{...m.form, effectiveSeq:e.target.value}}))} />
              </FormField>
            </div>

            <div className='grid grid-cols-2 gap-3 mb-3'>
              <FormField label={t('Aksi','Action')} required>
                <Select value={recordModal.form.action} onChange={e=>{
                  const action = e.target.value
                  setRecordModal(m => {
                    const patch = { action, reason: '' }
                    // Pin to the exact Hire date/next sequence so this always
                    // reads as "voided the same day it started" — never a real
                    // separate employment event with its own date.
                    if (action === 'Cancel Employment' && hireRecord) {
                      patch.effectiveDate = hireRecord.effectiveDate
                      patch.effectiveSeq = hireRecord.effectiveSeq + 1
                    }
                    return { ...m, form: { ...m.form, ...patch } }
                  })
                }}>
                  {HISTORY_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </Select>
              </FormField>
              <FormField label={t('Alasan','Reason')} required>
                <Select value={recordModal.form.reason} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, reason:e.target.value}}))}>
                  <option value=''>{t('— Pilih —','— Select —')}</option>
                  {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </FormField>
            </div>

            {recordModal.form.action === 'Cancel Employment' && (
              <div className='mb-3 flex items-start gap-2 rounded-lg bg-gray-100 px-3 py-2.5'>
                <span className='text-sm'>⚠️</span>
                <p className='text-xs text-gray-600'>
                  {hireRecord
                    ? t('Membatalkan hire yang salah input — dianggap karyawan ini belum pernah bekerja. Tanggal dikunci sama dengan tanggal Hire, sequence berikutnya.',
                        'Voids a mistakenly-entered hire — treats this employee as if they never worked here. Date is locked to the Hire date, next sequence.')
                    : t('Tidak ditemukan record Hire untuk karyawan ini — tanggal & sequence tidak bisa dikunci otomatis.',
                        'No Hire record found for this employee — date & sequence can\'t be auto-locked.')}
                </p>
              </div>
            )}

            <div className='border-t border-gray-100 pt-4 mb-3'>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>{t('Penempatan','Job Assignment')}</h4>
              <div className='grid grid-cols-2 gap-3'>
                <FormField label={t('Perusahaan','Company')}>
                  <Select value={recordModal.form.companyId} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, companyId:e.target.value}}))}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Departemen','Department')}>
                  <Select value={recordModal.form.departmentId} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, departmentId:e.target.value}}))}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Posisi','Position')}>
                  <Select value={recordModal.form.positionId} onChange={e=>handlePositionChange(e.target.value)}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </FormField>
                <FormField label='Grade'>
                  <Input value={grades.find(g => g.id === recordModal.form.gradeId)?.name || (recordModal.form.gradeId ? `PC ${recordModal.form.gradeId}` : '')} disabled />
                </FormField>
                <FormField label={t('Tipe Kepegawaian','Employment Type')}>
                  <Select value={recordModal.form.employmentType} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, employmentType:e.target.value}}))}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {EMPLOYMENT_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                  </Select>
                </FormField>
              </div>
            </div>

            <div className='border-t border-gray-100 pt-4 mb-3'>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>{t('Komponen Gaji','Salary Components')}</h4>
              <div className='grid grid-cols-2 gap-3'>
                <FormField label={t('Gaji Pokok', 'Basic Salary')} required>
                  <Input type='number' value={recordModal.form.basic}
                    onChange={e=>setRecordModal(m=>({...m, form:{...m.form, basic:e.target.value}}))} />
                </FormField>
                <FormField label={t('Tunjangan Tetap', 'Fixed Allowance')}>
                  <Input type='number' value={recordModal.form.allowance}
                    onChange={e=>setRecordModal(m=>({...m, form:{...m.form, allowance:e.target.value}}))} />
                </FormField>
              </div>
            </div>

            <div className='border-t border-gray-100 pt-4 mb-3'>
              <div className='flex items-center justify-between mb-2'>
                <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wide'>{t('Tunjangan Variable', 'Variable Allowances')}</h4>
                <button onClick={addVariableRow} type='button' className='text-xs font-semibold text-red-700 hover:underline flex items-center gap-1'>
                  <Icon e='➕' size={11} /> {t('Tambah','Add')}
                </button>
              </div>
              {allowanceOptions.length === 0 && (
                <p className='text-xs text-gray-400 mb-2'>
                  {t('Belum ada pilihan nama tunjangan. ','No allowance name options yet. ')}
                  <a href='/sysadmin/settings/master-lookup' className='text-red-700 hover:underline'>
                    {t('Atur di Master Lookup →','Set up in Master Lookup →')}
                  </a>
                </p>
              )}
              {(!recordModal.form.variableAllowances || recordModal.form.variableAllowances.length === 0) ? (
                <p className='text-sm text-gray-400'>{t('Belum ada tunjangan variable.','No variable allowances yet.')}</p>
              ) : (
                <table className='w-full text-sm'>
                  <tbody>
                    {recordModal.form.variableAllowances.map(row => (
                      <tr key={row.id}>
                        <td className='py-1 pr-2'>
                          <Select value={row.label} onChange={e=>updateVariableRow(row.id, { label: e.target.value })}>
                            <option value=''>{t('— Pilih —','— Select —')}</option>
                            {row.label && !allowanceOptions.some(o => o.label === row.label) && (
                              <option value={row.label}>{row.label}</option>
                            )}
                            {allowanceOptions.map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                          </Select>
                        </td>
                        <td className='py-1 pr-2 w-32'>
                          <Input type='number' value={row.amount} placeholder='0'
                            onChange={e=>updateVariableRow(row.id, { amount: e.target.value })} />
                        </td>
                        <td className='py-1 w-8 text-center'>
                          <button onClick={()=>removeVariableRow(row.id)} type='button' className='text-gray-400 hover:text-red-600' aria-label={t('Hapus baris','Remove row')}>
                            <Icon e='🗑️' size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className='border-t border-gray-200'>
                      <td className='py-1.5 pr-2 font-semibold text-gray-700 text-xs'>{t('Total','Total')}</td>
                      <td className='py-1.5 pr-2 font-semibold text-gray-800 text-xs'>{formatRp(sumVariableAllowances(recordModal.form.variableAllowances))}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div className='border-t border-gray-100 pt-4 mb-4'>
              <div className='grid grid-cols-2 gap-3 mb-3'>
                <FormField label='PTKP'>
                  <Select value={recordModal.form.ptkpStatus} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, ptkpStatus:e.target.value}}))}>
                    {PTKP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
                <FormField label='NPWP'>
                  <Select value={recordModal.form.npwp ? '1' : '0'} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, npwp: e.target.value==='1'}}))}>
                    <option value='1'>{t('Ada','Yes')}</option>
                    <option value='0'>{t('Tidak ada','No')}</option>
                  </Select>
                </FormField>
              </div>
              <div className='flex gap-5 text-sm mb-3'>
                <label className='flex items-center gap-2'>
                  <input type='checkbox' checked={recordModal.form.bpjsKesehatan} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, bpjsKesehatan:e.target.checked}}))} />
                  BPJS Kesehatan
                </label>
                <label className='flex items-center gap-2'>
                  <input type='checkbox' checked={recordModal.form.bpjsTk} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, bpjsTk:e.target.checked}}))} />
                  BPJS Ketenagakerjaan
                </label>
              </div>
              <FormField label={t('Catatan','Note')}>
                <textarea value={recordModal.form.note} onChange={e=>setRecordModal(m=>({...m, form:{...m.form, note:e.target.value}}))} rows={2}
                  className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none' />
              </FormField>
            </div>

            <div className='flex gap-2'>
              <button onClick={closeModal} className='flex-1 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                {t('Batal','Cancel')}
              </button>
              <ActionButton onClick={saveRecord} disabled={!canSave} className='flex-1'>{t('Simpan','Save')}</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Bio (personal data) Correct/Update modal */}
      {bioModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeBioModal}>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <h3 className='text-base font-bold text-gray-800'>
                  {bioModal.intent === 'update' ? t('Update Data Pribadi','Update Personal Data') : t('Correct Data Pribadi','Correct Personal Data')}
                </h3>
                <p className='text-xs text-gray-400 mt-0.5'>
                  {bioModal.intent === 'update'
                    ? t('Membuat riwayat baru dengan tanggal efektif — data lama tetap tersimpan.', 'Creates a new dated record — the old value stays in history.')
                    : t('Memperbaiki data pada baris yang sama, tanpa membuat riwayat baru.', 'Fixes the data on the same row, without creating a new history entry.')}
                </p>
              </div>
              <button onClick={closeBioModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>

            <div className='grid grid-cols-3 gap-3 mb-3'>
              <FormField label={t('Efektif Mulai','Effective Start')} required>
                <Input type='date' disabled={bioDateLocked} value={bioModal.form.effectiveDate}
                  onChange={e=>setBioModal(m=>({...m, form:{...m.form, effectiveDate:e.target.value}}))} />
              </FormField>
              <FormField label={t('Efektif Sampai','Effective End')} hint={t('Default 9999-01-01 = masih berlaku','Defaults to 9999-01-01 = still current')}>
                <Input type='date' disabled={bioDateLocked} value={bioModal.form.effectiveEndDate}
                  onChange={e=>setBioModal(m=>({...m, form:{...m.form, effectiveEndDate:e.target.value}}))} />
              </FormField>
              <FormField label={t('Sequence','Sequence')}>
                <Input type='number' disabled={bioDateLocked} value={bioModal.form.effectiveSeq}
                  onChange={e=>setBioModal(m=>({...m, form:{...m.form, effectiveSeq:e.target.value}}))} />
              </FormField>
            </div>

            <div className='grid grid-cols-2 gap-3 mb-3'>
              <FormField label={t('Alasan','Reason')} required>
                <Select value={bioModal.form.reason} onChange={e=>setBioModal(m=>({...m, form:{...m.form, reason:e.target.value}}))}>
                  <option value=''>{t('— Pilih —','— Select —')}</option>
                  {(HISTORY_REASONS['Data Change'] || []).map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </FormField>
              <FormField label={t('Catatan','Note')}>
                <Input value={bioModal.form.note} onChange={e=>setBioModal(m=>({...m, form:{...m.form, note:e.target.value}}))} />
              </FormField>
            </div>

            <div className='border-t border-gray-100 pt-4 mb-3'>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>{t('Informasi Pribadi', 'Personal Information')}</h4>
              <div className='grid grid-cols-2 gap-3'>
                <FormField label={t('Jenis Kelamin', 'Gender')}>
                  <Select value={bioModal.form.gender} onChange={e=>setBioModal(m=>({...m, form:{...m.form, gender:e.target.value}}))}>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Tanggal Lahir', 'Birth Date')}>
                  <Input type='date' value={bioModal.form.birthDate} onChange={e=>setBioModal(m=>({...m, form:{...m.form, birthDate:e.target.value}}))} />
                </FormField>
                <FormField label={t('Tempat Lahir', 'Birth Place')}>
                  <Input value={bioModal.form.birthPlace} onChange={e=>setBioModal(m=>({...m, form:{...m.form, birthPlace:e.target.value}}))} />
                </FormField>
                <FormField label={t('Kewarganegaraan', 'Nationality')}>
                  <Input value={bioModal.form.nationality} onChange={e=>setBioModal(m=>({...m, form:{...m.form, nationality:e.target.value}}))} />
                </FormField>
                <FormField label={t('Agama', 'Religion')}>
                  <Select value={bioModal.form.religion} onChange={e=>setBioModal(m=>({...m, form:{...m.form, religion:e.target.value}}))}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Status Pernikahan', 'Marital Status')}>
                  <Select value={bioModal.form.maritalStatus} onChange={e=>setBioModal(m=>({...m, form:{...m.form, maritalStatus:e.target.value}}))}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {MARITAL.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
              </div>
            </div>

            <div className='border-t border-gray-100 pt-4 mb-3'>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>{t('Kontak', 'Contact')}</h4>
              <div className='grid grid-cols-2 gap-3'>
                <FormField label={t('Telepon', 'Phone')}>
                  <Input value={bioModal.form.phone} onChange={e=>setBioModal(m=>({...m, form:{...m.form, phone:e.target.value}}))} />
                </FormField>
                <FormField label={t('Email Kerja', 'Work Email')}>
                  <Input type='email' value={bioModal.form.email} onChange={e=>setBioModal(m=>({...m, form:{...m.form, email:e.target.value}}))} />
                </FormField>
                <FormField label={t('Email Pribadi', 'Personal Email')}>
                  <Input type='email' value={bioModal.form.personalEmail} onChange={e=>setBioModal(m=>({...m, form:{...m.form, personalEmail:e.target.value}}))} />
                </FormField>
                <FormField label={t('Kota', 'City')}>
                  <Select value={bioModal.form.city} onChange={e=>setBioModal(m=>({...m, form:{...m.form, city:e.target.value}}))}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Negara', 'Country')}>
                  <Select value={bioModal.form.country} onChange={e=>setBioModal(m=>({...m, form:{...m.form, country:e.target.value}}))}>
                    <option value=''>{t('— Pilih —','— Select —')}</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Alamat', 'Address')} className='col-span-2'>
                  <textarea value={bioModal.form.address} onChange={e=>setBioModal(m=>({...m, form:{...m.form, address:e.target.value}}))} rows={2}
                    className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none' />
                </FormField>
              </div>
            </div>

            <div className='border-t border-gray-100 pt-4 mb-4'>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>{t('Nomor Identitas', 'ID Numbers')}</h4>
              <div className='grid grid-cols-3 gap-3'>
                <FormField label='KTP'>
                  <Input value={bioModal.form.ktp} onChange={e=>setBioModal(m=>({...m, form:{...m.form, ktp:e.target.value}}))} />
                </FormField>
                <FormField label='NPWP'>
                  <Input value={bioModal.form.npwp} onChange={e=>setBioModal(m=>({...m, form:{...m.form, npwp:e.target.value}}))} />
                </FormField>
                <FormField label='BPJS'>
                  <Input value={bioModal.form.bpjs} onChange={e=>setBioModal(m=>({...m, form:{...m.form, bpjs:e.target.value}}))} />
                </FormField>
              </div>
            </div>

            <div className='flex gap-2'>
              <button onClick={closeBioModal} className='flex-1 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                {t('Batal','Cancel')}
              </button>
              <ActionButton onClick={saveBio} disabled={!bioModal.form.effectiveDate || !bioModal.form.reason} className='flex-1'>{t('Simpan','Save')}</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT MATRIKS APPROVAL ────────────────────────── */}
      {showApprovalModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4'>
            <div className='flex items-center justify-between pb-3 border-b border-gray-100'>
              <div>
                <h3 className='text-base font-bold text-gray-900'>
                  {t('Konfigurasi Matriks Approval', 'Configure Approval Matrix')}
                </h3>
                <p className='text-xs text-gray-500 mt-0.5 flex items-center gap-1.5'>
                  <span className='font-semibold text-gray-700'>{emp.name}</span>
                  <span>•</span>
                  <span className='px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-100'>
                    {emp.dept || 'No Department'}
                  </span>
                  <span>•</span>
                  <span>{emp.jobPosition || emp.position || 'Staff'}</span>
                </p>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className='text-gray-400 hover:text-gray-600 p-1 text-lg'
              >
                ✕
              </button>
            </div>

            <div className='space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1'>
              {/* 1. Atasan Langsung */}
              <div className='bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/70 space-y-2'>
                <div className='flex items-center justify-between'>
                  <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1'>
                    <span>👤</span> {t('Atasan Langsung (Direct Manager)', 'Direct Manager')}
                  </label>
                  <span className='text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md'>
                    🏢 {emp.dept || t('Tanpa Departemen', 'No Dept')}
                  </span>
                </div>

                <div>
                  <label className='block text-[11px] text-gray-500 mb-1 font-medium'>
                    {t('Pilih Atasan Langsung', 'Select Direct Manager')} <span className='text-gray-400 font-normal'>({t('Khusus departemen', 'Only department')} {emp.dept || '-'})</span>
                  </label>
                  <select
                    value={approvalForm.managerId}
                    onChange={(e) => setApprovalForm(f => ({ ...f, managerId: e.target.value }))}
                    className='w-full px-2.5 py-2 border border-blue-200 rounded-lg text-xs outline-none focus:border-blue-400 bg-white font-medium'
                  >
                    <option value=''>— {t('Pilih Atasan Langsung', 'Select Direct Manager')} —</option>
                    {employees
                      .filter(e => {
                        if (e.id === emp.id || e.status !== 'Active') return false
                        if (approvalForm.managerId && e.id === Number(approvalForm.managerId)) return true
                        if (emp.dept && e.dept !== emp.dept) return false
                        return true
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name} {e.jobPosition ? `(${e.jobPosition})` : ''} • [{e.dept || 'No Dept'}]
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 2. Tingkat Approval Dinamis (N-Tier) */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between bg-blue-50/50 p-2.5 rounded-xl border border-blue-100'>
                  <div>
                    <label className='block text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1'>
                      <span>⚡</span> {t('Tingkat Persetujuan (Approval Tiers)', 'Approval Tiers')}
                    </label>
                    <span className='text-[11px] text-blue-700/80'>
                      {matrixRows.length} {t('Tingkat persetujuan dikonfigurasi', 'Tier(s) configured')}
                    </span>
                  </div>
                  <span className='text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-lg'>
                    🏢 {t('Khusus Departemen', 'Dept Only')}: {emp.dept || '-'}
                  </span>
                </div>

                {matrixRows.map((row, idx) => (
                  <div key={idx} className='p-3.5 bg-blue-50/20 border border-blue-100 rounded-xl space-y-2 relative hover:border-blue-200 transition'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs font-bold text-blue-800 flex items-center gap-1.5'>
                        <span>{idx === 0 ? '1️⃣' : idx === 1 ? '2️⃣' : idx === 2 ? '3️⃣' : `${idx + 1}️⃣`}</span>
                        Tingkat {idx + 1}
                      </span>
                      {matrixRows.length > 1 && (
                        <button
                          type='button'
                          onClick={() => {
                            setMatrixRows(rows => rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, level: i + 1 })))
                          }}
                          className='text-xs text-red-500 hover:text-red-700 p-1 flex items-center gap-1 transition'
                          title={t('Hapus tingkat ini', 'Delete this tier')}
                        >
                          <Icon e='🗑️' size={12} />
                          <span className='text-[11px] font-medium'>{t('Hapus', 'Delete')}</span>
                        </button>
                      )}
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                      {/* 1. Dropdown Karyawan Approver */}
                      <div>
                        <label className='block text-[11px] text-gray-500 mb-1 font-medium'>
                          {t('Pilih Approver', 'Select Approver')} <span className='text-gray-400 font-normal'>({emp.dept || 'Dept'})</span>
                        </label>
                        <select
                          value={row.employeeId}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : ''
                            setMatrixRows(rows => rows.map((r, i) => i === idx ? { ...r, employeeId: val } : r))
                          }}
                          className='w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs outline-none focus:border-blue-400 bg-white font-medium'
                        >
                          <option value=''>— {t('Pilih Approver', 'Select Approver')} —</option>
                          {employees
                            .filter(e => {
                              if (e.status !== 'Active') return false
                              if (row.employeeId && e.id === Number(row.employeeId)) return true
                              if (emp.dept && e.dept !== emp.dept) return false
                              return true
                            })
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(e => (
                              <option key={e.id} value={e.id}>
                                {e.name} {e.jobPosition ? `(${e.jobPosition})` : ''} • [{e.dept || 'No Dept'}]
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* 2. Label / Peran Tingkat */}
                      <div>
                        <label className='block text-[11px] text-gray-500 mb-1 font-medium'>
                          {t('Label / Jabatan Approval', 'Tier Label / Role')}
                        </label>
                        <input
                          type='text'
                          value={row.label}
                          onChange={(e) => {
                            const val = e.target.value
                            setMatrixRows(rows => rows.map((r, i) => i === idx ? { ...r, label: val } : r))
                          }}
                          placeholder={`Approval ${idx + 1}`}
                          className='w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-400 bg-white'
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type='button'
                  onClick={() => {
                    setMatrixRows(rows => [
                      ...rows,
                      {
                        level: rows.length + 1,
                        employeeId: '',
                        label: `Approval ${rows.length + 1} (${rows.length === 1 ? 'Manager' : rows.length === 2 ? 'Direktur / GM' : 'Head'})`,
                      }
                    ])
                  }}
                  className='w-full py-2.5 border-2 border-dashed border-blue-200 text-blue-700 hover:bg-blue-50/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition'
                >
                  <Icon e='➕' size={13} />
                  <span>{t('Tambah Tingkat Approval', 'Add Approval Tier')}</span>
                </button>
              </div>

              {/* 3. Persetujuan Akhir HR (Info only) */}
              <div className='p-3.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-3'>
                <span className='text-2xl'>🏢</span>
                <div className='text-xs text-purple-900'>
                  <span className='font-semibold text-purple-950'>{t('Persetujuan Akhir: Tim HR (Final Gate)', 'Final Approval: HR Team (Final Gate)')}</span>
                  <p className='text-purple-700 text-[11px] mt-0.5 leading-relaxed'>
                    {t('Seluruh tingkat operasional di atas akan bermuara ke HR untuk verifikasi akhir dan pengesahan status Approved di sistem.', 'All operational tiers above will lead to HR for final verification and Approved status confirmation.')}
                  </p>
                </div>
              </div>
            </div>

            <div className='flex gap-2.5 pt-3 border-t border-gray-100'>
              <button
                onClick={() => setShowApprovalModal(false)}
                className='flex-1 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'
              >
                {t('Batal', 'Cancel')}
              </button>
              <button
                onClick={async () => {
                  const cleaned = matrixRows
                    .filter(r => r.employeeId)
                    .map(r => ({
                      level: r.level,
                      employeeId: Number(r.employeeId),
                      label: r.label,
                    }))

                  await updateEmployee(emp.id, {
                    managerId: approvalForm.managerId ? Number(approvalForm.managerId) : null,
                    approver1Id: cleaned[0]?.employeeId ? Number(cleaned[0].employeeId) : null,
                    approver2Id: cleaned[1]?.employeeId ? Number(cleaned[1].employeeId) : null,
                    approvalMatrix: cleaned,
                  })
                  setShowApprovalModal(false)
                }}
                className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md hover:opacity-90 transition'
                style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
              >
                {t('Simpan Matriks', 'Save Matrix')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
