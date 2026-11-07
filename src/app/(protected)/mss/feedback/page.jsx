'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams }               from 'next/navigation'
import { useAuthStore }                  from '@/store/authStore'
import { useEmployeeStore }       from '@/store/employeeStore'
import { useStructureStore }      from '@/store/structureStore'
import { useOnboardingStore }     from '@/store/onboardingStore'
import { useFeedbackStore }       from '@/store/feedbackStore'
import { useT }                   from '@/store/languageStore'

const HEADER_GRAD = { background: 'linear-gradient(135deg,#052B52,#039299)' }

const BLANK = {
  effectiveDate:   '',
  documentNumber:  '',
  revision:        '',
  classification:  '',
  strength:        '',
  areaDevelopment: '',
}

const daysSinceJoining = (joinDate) => {
  if (!joinDate) return 0
  return Math.floor((Date.now() - new Date(joinDate)) / (1000 * 60 * 60 * 24))
}

function FeedbackPageInner() {
  const t                                     = useT()
  const { currentUser }                       = useAuthStore()
  const { employees }                         = useEmployeeStore()
  const { companies, departments, positions } = useStructureStore()
  const { onboardings }                       = useOnboardingStore()
  const { feedbacks, getFeedback, saveFeedback } = useFeedbackStore()

  // Direct reports
  const myTeam = employees.filter(
    e => e.managerId === currentUser?.id && e.joinDate && e.status === 'Active'
  ).sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))

  // Employees where current user is assigned as reviewer with type 'Form Feedback'
  const revieweeIds = new Set()
  onboardings.forEach(ob => {
    ;(ob.reviewItems ?? []).forEach(ri => {
      if (String(ri.reviewerEmpId) === String(currentUser?.id) && ri.type === 'Form Feedback') {
        revieweeIds.add(ob.employeeId)
      }
    })
  })
  const revieweeEmployees = employees.filter(
    e => revieweeIds.has(e.id) && !myTeam.find(tm => tm.id === e.id)
  )

  // Combined list: direct reports first, then reviewer-assigned
  const allEmployees = [...myTeam, ...revieweeEmployees]

  const searchParams                      = useSearchParams()
  const empIdFromUrl                      = searchParams.get('empId')

  const initialEmpId = empIdFromUrl
    ? (allEmployees.find(e => String(e.id) === String(empIdFromUrl))?.id ?? allEmployees[0]?.id ?? null)
    : (allEmployees[0]?.id ?? null)

  const [selectedEmpId, setSelectedEmpId] = useState(initialEmpId)
  const [form, setForm]                   = useState(BLANK)
  const [msg, setMsg]                     = useState(null)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const reviewerId = currentUser?.id

  // When URL empId changes (e.g. navigated from approve-onboarding), update selection
  useEffect(() => {
    if (!empIdFromUrl) return
    const emp = allEmployees.find(e => String(e.id) === String(empIdFromUrl))
    if (emp) setSelectedEmpId(emp.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empIdFromUrl])

  // Load form when employee changes
  useEffect(() => {
    if (!selectedEmpId || !reviewerId) return
    setForm({ ...BLANK, ...getFeedback(reviewerId, selectedEmpId) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmpId, reviewerId, feedbacks])

  // Auto-select first employee
  useEffect(() => {
    if (!selectedEmpId && allEmployees.length > 0) setSelectedEmpId(allEmployees[0].id)
  }, [allEmployees.length]) // eslint-disable-line

  const selectedEmp = allEmployees.find(e => e.id === selectedEmpId) ?? allEmployees[0] ?? null

  if (allEmployees.length === 0) {
    return (
      <div className='flex items-center justify-center h-[calc(100vh-56px)] bg-gray-100'>
        <div className='text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-sm'>
          <div className='text-4xl mb-3'><Icon e='👥' size={15} /></div>
          <h2 className='text-base font-bold text-gray-700 mb-2'>
            {t('Tidak Ada Tim', 'No Team Members')}
          </h2>
          <p className='text-xs text-gray-500'>
            {t(
              'Anda tidak memiliki bawahan langsung saat ini.',
              'You have no direct reports available at this time.'
            )}
          </p>
        </div>
      </div>
    )
  }

  if (!selectedEmp) return null

  const company  = companies?.find(c => c.id === selectedEmp.companyId)
  const position = positions?.find(p => p.id === selectedEmp.positionId)

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    saveFeedback(reviewerId, selectedEmpId, form)
    flash(t('Feedback berhasil disimpan.', 'Feedback saved successfully.'))
  }

  return (
    <div className='flex h-[calc(100vh-56px)] bg-gray-100'>

      {/* ── Left Panel: Team List ─────────────────────────────────────────── */}
      <aside className='w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden'>
        <div className='px-4 py-3 border-b border-gray-200' style={HEADER_GRAD}>
          <h2 className='text-sm font-bold text-white'>
            {t('Form Feedback — Tim Saya', 'Form Feedback — My Team')}
          </h2>
          <p className='text-[11px] text-red-200 mt-0.5'>
            {allEmployees.length} {t('karyawan', 'employees')}
          </p>
        </div>

        <div className='overflow-y-auto flex-1'>
          {allEmployees.map(emp => {
            const deptObj     = departments?.find(d => d.id === emp.departmentId)
            const active      = selectedEmpId === emp.id
            const fb          = getFeedback(reviewerId, emp.id)
            const hasFeedback = !!(fb.strength || fb.areaDevelopment)
            const isReviewee  = revieweeIds.has(emp.id)

            return (
              <button
                key={emp.id}
                onClick={() => setSelectedEmpId(emp.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors
                  ${active ? 'bg-red-50 border-l-4 border-l-red-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <p className={`text-xs font-semibold truncate ${active ? 'text-red-800' : 'text-gray-800'}`}>
                        {emp.name}
                      </p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0
                        ${isReviewee ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                        {isReviewee ? t('Reviewer', 'Reviewer') : t('Bawahan', 'Direct')}
                      </span>
                    </div>
                    <p className='text-[11px] text-gray-500 truncate mt-0.5'>{deptObj?.name ?? '—'}</p>
                    <p className='text-[10px] text-gray-400 mt-0.5'>
                      {t('Bergabung', 'Joined')}: {emp.joinDate}
                      {' · '}{daysSinceJoining(emp.joinDate)} {t('hari', 'days')}
                    </p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0
                    ${hasFeedback ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {hasFeedback ? t('Diisi', 'Filled') : t('Kosong', 'Empty')}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Right Panel: Form ─────────────────────────────────────────────── */}
      <main className='flex-1 overflow-y-auto p-6'>

        {msg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
            msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Page Title */}
        <div className='mb-4'>
          <h1 className='text-lg font-bold text-gray-800'>
            {t('Form Feedback — Tim Saya', 'Form Feedback — My Team')}
          </h1>
          <p className='text-xs text-gray-500 mt-0.5'>{selectedEmp.name}</p>
        </div>

        {/* ── Card 1: Informasi Dokumen ─────────────────────────────────── */}
        <div className='bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden'>
          <div className='px-5 py-3 border-b border-gray-100' style={HEADER_GRAD}>
            <h2 className='text-xs font-bold text-white uppercase tracking-wide'>
              {t('Informasi Dokumen', 'Document Information')}
            </h2>
          </div>
          <div className='p-5 flex flex-col gap-4'>

            {/* Employee Info */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b border-gray-100'>
              <div>
                <label className='block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide'>
                  {t('Nama Karyawan', 'Employee Name')}
                </label>
                <p className='text-sm font-bold text-gray-800'>{selectedEmp.name}</p>
              </div>
              <div>
                <label className='block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide'>
                  {t('Employee ID / NIK', 'Employee ID / NIK')}
                </label>
                <p className='text-sm font-bold text-gray-800 font-mono'>{selectedEmp.nik || `#${selectedEmp.id}`}</p>
              </div>
              <div>
                <label className='block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide'>
                  {t('Jabatan / Position', 'Position')}
                </label>
                <p className='text-sm font-bold text-gray-800'>{position?.name ?? '—'}</p>
              </div>
              <div>
                <label className='block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide'>
                  {t('Position ID', 'Position ID')}
                </label>
                <p className='text-sm font-bold text-gray-800 font-mono'>{selectedEmp.positionId || '—'}</p>
              </div>
            </div>

            {/* Document Fields */}
            <div className='grid grid-cols-2 gap-4'>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                  {t('Legal Entity', 'Legal Entity')}
                </label>
                <input
                  value={company?.name ?? ''}
                  readOnly
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 bg-gray-50 text-gray-700 cursor-default'
                />
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                  {t('Tanggal Efektif', 'Effective Date')}
                </label>
                <input
                  type='date'
                  value={form.effectiveDate}
                  onChange={e => setField('effectiveDate', e.target.value)}
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none'
                />
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                  {t('No. Dokumen', 'Document Number')}
                </label>
                <input
                  type='text'
                  value={form.documentNumber}
                  onChange={e => setField('documentNumber', e.target.value)}
                  placeholder='e.g. HRD/FBK/2024/001'
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none'
                />
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                  {t('Revisi', 'Revision')}
                </label>
                <input
                  type='text'
                  value={form.revision}
                  onChange={e => setField('revision', e.target.value)}
                  placeholder='e.g. 00'
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none'
                />
              </div>

              <div className='col-span-2'>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                  {t('Klasifikasi', 'Classification')}
                </label>
                <input
                  type='text'
                  value={form.classification}
                  onChange={e => setField('classification', e.target.value)}
                  placeholder='e.g. Internal'
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none'
                />
              </div>

            </div>
          </div>
        </div>

        {/* ── Card 2: Keputusan Akhir ───────────────────────────────────── */}
        <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
          <div className='px-5 py-3 border-b border-gray-100' style={HEADER_GRAD}>
            <h2 className='text-xs font-bold text-white uppercase tracking-wide'>
              {t('Keputusan Akhir', 'Final Decision')}
            </h2>
          </div>
          <div className='p-5 space-y-4'>

            {/* Strength */}
            <div>
              <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                {t('Kekuatan (Strength)', 'Strength')} <span className='text-red-400'>*</span>
              </label>
              <textarea
                rows={4}
                value={form.strength}
                onChange={e => setField('strength', e.target.value)}
                placeholder={t('Tuliskan kekuatan karyawan...', 'Describe employee strengths...')}
                className='w-full px-3 py-2 text-xs rounded border border-gray-200 focus:border-red-400 outline-none resize-none'
              />
            </div>

            {/* Area Development */}
            <div>
              <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                {t('Area Pengembangan (Area Development)', 'Area Development')} <span className='text-red-400'>*</span>
              </label>
              <textarea
                rows={4}
                value={form.areaDevelopment}
                onChange={e => setField('areaDevelopment', e.target.value)}
                placeholder={t('Tuliskan area pengembangan karyawan...', 'Describe employee development areas...')}
                className='w-full px-3 py-2 text-xs rounded border border-gray-200 focus:border-red-400 outline-none resize-none'
              />
            </div>

            {/* Save Button */}
            <div className='flex justify-end pt-2'>
              <button
                onClick={handleSave}
                className='px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow transition-opacity hover:opacity-90'
                style={HEADER_GRAD}
              >
                <Icon e='💾' size={14} className='inline align-[-2px]' /> {t('Simpan', 'Save')}
              </button>
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}

export default function MSSFeedbackPage() {
  return (
    <Suspense>
      <FeedbackPageInner />
    </Suspense>
  )
}
