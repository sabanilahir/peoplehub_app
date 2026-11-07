'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useTalentCycleStore } from '@/store/talentCycleStore'
import { useIdpStore, blankIdp, IDP_STATUS_TONE } from '@/store/idpStore'
import { useCompetencyStore, buildIdpCompetencies } from '@/store/competencyStore'
import { useCompetencyAssessmentStore } from '@/store/competencyAssessmentStore'
import IdpEmployeeForm from '@/components/talent/IdpEmployeeForm'
import { StatusBadge } from '@/components/ui'

const today = () => new Date().toISOString().split('T')[0]

export default function EssIdpPage() {
  const currentUser = useAuthStore(s => s.currentUser)
  const userList    = useAuthStore(s => s.userList)
  const positions   = useStructureStore(s => s.positions)
  const employees   = useEmployeeStore(s => s.employees)
  const activeCycle = useTalentCycleStore(s => s.activeCycle)
  const { records, saveRecord } = useIdpStore()
  const { catalog, positionCompetencies } = useCompetencyStore()
  const getAssessment = useCompetencyAssessmentStore(s => s.getAssessment)
  const uid = currentUser?.id

  // Posisi karyawan → profil kompetensi.
  const myPositionId = positions.find(p => p.name === currentUser?.position)?.id ?? null

  // Atasan langsung & HR Talent untuk header POV.
  const myEmp   = employees.find(e => e.name === currentUser?.name || e.email === currentUser?.email)
  const manager = myEmp ? employees.find(e => e.id === myEmp.managerId) : null
  const managerName = manager?.name
    || userList.find(u => u.role === 'manager' && u.dept === currentUser?.dept)?.name
    || 'Atasan Langsung'
  const hrTalentName = userList.find(u => u.role === 'hr' && u.dept === currentUser?.dept)?.name
    || userList.find(u => u.role === 'hr')?.name
    || 'HR Talent'

  const [form, setForm] = useState(blankIdp())
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  useEffect(() => {
    const rec = uid != null ? records[uid] : null
    const base = { ...blankIdp(), ...(rec || {}) }
    // Kompetensi otomatis dari profil posisi bila belum ada.
    if (!base.competencies || base.competencies.length === 0) {
      const assessment = uid != null ? getAssessment(uid) : null
      base.competencies = buildIdpCompetencies(myPositionId, catalog, positionCompetencies).map(c => ({
        ...c,
        // Actual = final score (penilaian akhir atasan) dari competency assessment.
        current: assessment?.managerRatings?.[c.competencyId] ?? c.current,
      }))
    }
    setForm(base)
  }, [uid, myPositionId]) // eslint-disable-line

  const status = form.status || 'Draft'
  const locked = status === 'Submitted' || status === 'Approved'   // hanya bisa diedit atasan/HR

  const setCompetencyIdp = (id, idp) =>
    setForm(f => ({ ...f, competencies: f.competencies.map(c => c.id === id ? { ...c, idp, detail: {} } : c) }))
  const setCompetencyDetail = (id, detail) =>
    setForm(f => ({ ...f, competencies: f.competencies.map(c => c.id === id ? { ...c, detail } : c) }))
  const setAspiration = (field, value) => setForm(f => ({ ...f, [field]: value }))

  // Reviewer (atasan) & daftar kandidat mentor/coach untuk form detail IDP.
  const reviewer = { name: managerName, sub: manager?.position || 'Atasan Langsung' }
  const people = userList
    .filter(u => u.role === 'manager' || u.role === 'hr')
    .map(u => ({ name: u.name, sub: u.position }))
  if (!people.some(p => p.name === managerName)) people.unshift(reviewer)

  const base = () => ({
    ...form,
    employeeName: currentUser?.name || '',
    position: currentUser?.position || '',
    department: currentUser?.dept || '',
    cycle: form.cycle || activeCycle,
  })

  const handleSubmit = () => {
    if (!form.competencies || form.competencies.length === 0)
      return flash('Belum ada kompetensi untuk dinilai.', 'error')
    saveRecord(uid, { ...base(), status: 'Submitted', submittedBy: currentUser?.name || 'Karyawan', submittedAt: today() })
    setForm(f => ({ ...f, status: 'Submitted' }))
    flash('IDP disubmit ke atasan untuk ditinjau.')
  }

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      {status === 'Returned' && form.managerNote && (
        <div className='mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100'>
          <b>Dikembalikan atasan:</b> {form.managerNote}
        </div>
      )}
      {status === 'Submitted' && (
        <div className='mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100'>
          <StatusBadge tone={IDP_STATUS_TONE[status]}>{status}</StatusBadge>
          IDP Anda menunggu persetujuan atasan. Anda tidak dapat mengubahnya sampai disetujui atau dikembalikan.
        </div>
      )}
      {status === 'Approved' && (
        <div className='mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100'>
          IDP disetujui oleh <b>{form.approvedBy}</b> pada {form.approvedAt}.
          {form.managerNote && <> Catatan: {form.managerNote}</>}
        </div>
      )}

      <IdpEmployeeForm
        employeeName={currentUser?.name || 'Karyawan'}
        managerName={managerName}
        hrTalentName={hrTalentName}
        competencies={form.competencies}
        learningAspiration={form.learningAspiration}
        careerAspiration={form.careerAspiration}
        readOnly={locked}
        reviewer={reviewer}
        people={people}
        onChangeIdp={setCompetencyIdp}
        onChangeDetail={setCompetencyDetail}
        onChangeAspiration={setAspiration}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
