'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore } from '@/store/personnelActionStore'
import { useT } from '@/store/languageStore'
import {
  todayStr, daysBetween, fmtDate, lwdOf,
  REASON_CATEGORIES, NOTICE_PERIOD_DAYS,
} from '@/lib/offboarding'
import { autoAssignOffboardingForEmployee } from '@/lib/offboardingAutoAssign'

const ACTION = 'Terminate'

export default function RecordResignModal({ isOpen, onClose, onSuccess }) {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees = [] } = useEmployeeStore()
  const { departments = [], positions = [], companies = [] } = useStructureStore()
  const { pas = [], addPA, nextNumber } = usePersonnelActionStore()

  const [channel, setChannel] = useState('physical') // 'physical' | 'email'
  const [empSearch, setEmpSearch] = useState('')
  const [form, setForm] = useState({
    employeeId: '',
    terminationType: 'Voluntary Resign',
    reasonCategory: 'Better Opportunity',
    reasonDetail: '',
    noticeDate: todayStr(),
    lastWorkingDay: '',
    effectiveDate: '',
    supervisorSigned: true,
    physicalArchiveLocation: '',
    emailSubject: '',
    resignLetter: '',
  })
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef(null)

  const activeEmployees = useMemo(() => {
    return employees
      .filter(e => e.status === 'Active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [employees])

  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return activeEmployees.slice(0, 30)
    const q = empSearch.toLowerCase()
    return activeEmployees.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.nik || '').toLowerCase().includes(q)
    ).slice(0, 30)
  }, [activeEmployees, empSearch])

  const selectedEmp = useMemo(() => {
    if (!form.employeeId) return null
    return employees.find(e => String(e.id) === String(form.employeeId)) || null
  }, [employees, form.employeeId])

  const existingActivePA = useMemo(() => {
    if (!form.employeeId) return null
    return pas.find(p =>
      p.action === ACTION &&
      String(p.employeeId) === String(form.employeeId) &&
      ['Draft', 'Submitted', 'Approved'].includes(p.status)
    )
  }, [pas, form.employeeId])

  // Notice compliance check
  const noticeDays = daysBetween(form.noticeDate, form.lastWorkingDay)
  const isNoticeCompliant = noticeDays !== null && noticeDays >= NOTICE_PERIOD_DAYS

  const setLWD = (dateVal) => {
    setForm(f => ({
      ...f,
      lastWorkingDay: dateVal,
      effectiveDate: (!f.effectiveDate || f.effectiveDate === f.lastWorkingDay) ? dateVal : f.effectiveDate,
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm(f => ({ ...f, resignLetter: file.name }))
    }
  }

  const handleSave = (targetStatus) => {
    setErrorMsg('')
    if (!form.employeeId) {
      setErrorMsg(t('Pilih karyawan terlebih dahulu.', 'Please select an employee.'))
      return
    }
    if (existingActivePA) {
      setErrorMsg(t(
        `Karyawan ini sudah memiliki pengajuan offboarding aktif (${existingActivePA.paNumber} - ${existingActivePA.status}).`,
        `This employee already has an active offboarding request (${existingActivePA.paNumber} - ${existingActivePA.status}).`
      ))
      return
    }
    if (!form.noticeDate) {
      setErrorMsg(t('Tanggal terima surat/email (Notice Date) wajib diisi.', 'Notice Date is required.'))
      return
    }
    if (!form.lastWorkingDay) {
      setErrorMsg(t('Last Working Day (LWD) wajib diisi.', 'Last Working Day is required.'))
      return
    }
    if (daysBetween(form.noticeDate, form.lastWorkingDay) < 0) {
      setErrorMsg(t('Last Working Day tidak boleh lebih awal dari Notice Date.', 'Last Working Day cannot precede Notice Date.'))
      return
    }

    const eff = form.effectiveDate || form.lastWorkingDay
    const paNumber = nextNumber()
    const isApproved = targetStatus === 'Approved'

    const newPa = {
      paNumber,
      action: ACTION,
      status: targetStatus,
      employeeId: Number(form.employeeId),
      reason: form.terminationType,
      reasonCategory: form.reasonCategory,
      note: form.reasonDetail || `${channel === 'physical' ? 'Surat Fisik' : 'Email'} Resign: ${form.reasonCategory}`,
      noticeDate: form.noticeDate,
      lastWorkingDay: form.lastWorkingDay,
      effectiveDate: eff,
      noticeCompliant: !!isNoticeCompliant,
      submissionChannel: channel, // 'physical' or 'email'
      supervisorSigned: channel === 'physical' ? form.supervisorSigned : true,
      physicalArchiveLocation: channel === 'physical' ? form.physicalArchiveLocation : '',
      emailSubject: channel === 'email' ? form.emailSubject : '',
      resignLetter: form.resignLetter,
      submittedBy: currentUser?.id,
      submittedByName: currentUser?.name || 'HR Department',
      fromCompanyId: selectedEmp?.companyId,
      fromDepartmentId: selectedEmp?.departmentId,
      fromPositionId: selectedEmp?.positionId,
      fromGradeId: selectedEmp?.gradeId,
      fromEmploymentType: selectedEmp?.employmentType,
      fromStatus: selectedEmp?.status,
      toStatus: 'Inactive',
      createdAt: todayStr(),
      approvedByName: isApproved ? (currentUser?.name || 'HR Admin') : '',
      approvedAt: isApproved ? todayStr() : '',
      appliedAt: '',
    }

    addPA(newPa)

    // If directly approved, auto-assign the offboarding checklist immediately
    let autoAssignResult = null
    if (isApproved && selectedEmp) {
      autoAssignResult = autoAssignOffboardingForEmployee(selectedEmp, [newPa, ...pas])
    }

    if (onSuccess) {
      onSuccess({
        pa: newPa,
        targetStatus,
        autoAssignResult,
      })
    }
    onClose()
  }

  if (!isOpen) return null

  const posName = id => positions.find(x => x.id === Number(id))?.name || '—'
  const dpName = id => departments.find(x => x.id === Number(id))?.name || '—'
  const coName = id => companies.find(x => x.id === Number(id))?.name || '—'

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='px-6 py-5 bg-gradient-to-r from-red-700 to-rose-600 text-white flex items-center justify-between flex-shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl'>
              🚪
            </div>
            <div>
              <h2 className='text-lg font-bold'>{t('Catat Pengunduran Diri (Resign)', 'Record Resignation')}</h2>
              <p className='text-xs text-rose-100 mt-0.5'>
                {t('Input pengajuan resign offline dari Karyawan via Surat Fisik atau Email', 'Input offline resignation from Employee via Physical Letter or Email')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition'
          >
            <Icon e='✕' size={15} />
          </button>
        </div>

        {/* Channel selector tabs */}
        <div className='px-6 pt-4 pb-2 bg-gray-50 border-b flex gap-3 flex-shrink-0'>
          <button
            type='button'
            onClick={() => setChannel('physical')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              channel === 'physical'
                ? 'bg-white text-red-700 shadow border border-red-200'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <span>📄</span> {t('Surat Fisik (Hardcopy)', 'Physical Letter (Hardcopy)')}
          </button>
          <button
            type='button'
            onClick={() => setChannel('email')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              channel === 'email'
                ? 'bg-white text-red-700 shadow border border-red-200'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <span>✉️</span> {t('Email Pengunduran Diri', 'Resignation Email')}
          </button>
        </div>

        {/* Modal body */}
        <div className='overflow-y-auto px-6 py-5 space-y-5 flex-1'>
          {errorMsg && (
            <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2'>
              <span className='font-bold text-base'>⚠️</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5'>
              {t('Pilih Karyawan *', 'Select Employee *')}
            </label>
            <div className='space-y-2'>
              <input
                type='text'
                placeholder={t('Ketik nama / NIK karyawan untuk memfilter...', 'Type name or NIK to search...')}
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 bg-gray-50/50'
              />
              <select
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 bg-white font-medium'
              >
                <option value=''>-- {t('Pilih Karyawan', 'Choose Employee')} --</option>
                {filteredEmployees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.nik} ({dpName(e.departmentId)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Employee Snapshot Card */}
          {selectedEmp && (
            <div className='bg-red-50/40 border border-red-100 rounded-xl p-4 text-xs space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='font-bold text-gray-900 text-sm'>{selectedEmp.name}</span>
                <span className='px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700'>
                  {selectedEmp.employmentType || 'Permanent'}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-2 text-gray-600 pt-1'>
                <p><span className='text-gray-400'>NIK:</span> {selectedEmp.nik}</p>
                <p><span className='text-gray-400'>Posisi:</span> {posName(selectedEmp.positionId)}</p>
                <p><span className='text-gray-400'>Departemen:</span> {dpName(selectedEmp.departmentId)}</p>
                <p><span className='text-gray-400'>Perusahaan:</span> {coName(selectedEmp.companyId)}</p>
                <p><span className='text-gray-400'>Join Date:</span> {selectedEmp.joinDate || '—'}</p>
              </div>
            </div>
          )}

          {/* Dates & Notice compliance */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-semibold text-gray-700 mb-1'>
                {channel === 'physical'
                  ? t('Tanggal Surat Diterima HR (Notice Date) *', 'Date Received by HR (Notice Date) *')
                  : t('Tanggal Email Masuk (Notice Date) *', 'Email Date Received (Notice Date) *')}
              </label>
              <input
                type='date'
                value={form.noticeDate}
                onChange={e => setForm(f => ({ ...f, noticeDate: e.target.value }))}
                className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400'
              />
              <p className='text-[10px] text-gray-400 mt-1'>
                {channel === 'physical'
                  ? t('Tanggal stempel/cap tanda terima fisik dari HR', 'Date of HR physical stamp receipt')
                  : t('Tanggal email resign dikirimkan oleh karyawan', 'Date email was sent by employee')}
              </p>
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-700 mb-1'>
                {t('Last Working Day (LWD) *', 'Last Working Day (LWD) *')}
              </label>
              <input
                type='date'
                value={form.lastWorkingDay}
                onChange={e => setLWD(e.target.value)}
                className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 font-semibold text-red-700'
              />
              <p className='text-[10px] text-gray-400 mt-1'>
                {t('Hari kerja terakhir karyawan di kantor', 'Employee last working day in office')}
              </p>
            </div>
          </div>

          {/* Live Notice Indicator */}
          {form.noticeDate && form.lastWorkingDay && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-3 ${
              isNoticeCompliant
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <span className='text-xl'>{isNoticeCompliant ? '✅' : '⚠️'}</span>
              <div className='flex-1'>
                <p className='font-bold'>
                  {isNoticeCompliant
                    ? t(`One-Month Notice Terpenuhi (${noticeDays} hari)`, `One-Month Notice Compliant (${noticeDays} days)`)
                    : t(`Under Notice (${noticeDays} hari - kurang dari 30 hari)`, `Under Notice (${noticeDays} days - less than 30 days)`)}
                </p>
                <p className='text-[11px] opacity-90 mt-0.5'>
                  {isNoticeCompliant
                    ? t('Memenuhi standar 30 hari pemberitahuan sesuai ketentuan perusahaan / UU.', 'Meets 30-day notice compliance standard.')
                    : t('Perlu konfirmasi persetujuan/waiver dari Atasan Langsung untuk pelepasan lebih awal.', 'Requires supervisor approval / waiver for early release.')}
                </p>
              </div>
            </div>
          )}

          {/* Reason & Category */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-semibold text-gray-700 mb-1'>
                {t('Kategori Alasan *', 'Reason Category *')}
              </label>
              <select
                value={form.reasonCategory}
                onChange={e => setForm(f => ({ ...f, reasonCategory: e.target.value }))}
                className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 bg-white'
              >
                {(REASON_CATEGORIES['Voluntary Resign'] || []).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-700 mb-1'>
                {t('Tanggal Efektif Berhenti', 'Effective Date')}
              </label>
              <input
                type='date'
                value={form.effectiveDate || form.lastWorkingDay}
                onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
                className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400'
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-gray-700 mb-1'>
              {t('Keterangan / Kutipan Alasan', 'Notes / Reason Detail')}
            </label>
            <textarea
              rows={2}
              value={form.reasonDetail}
              onChange={e => setForm(f => ({ ...f, reasonDetail: e.target.value }))}
              placeholder={t('Kutipan alasan pada surat atau keterangan tambahan HR...', 'Quote from the letter or additional HR notes...')}
              className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none'
            />
          </div>

          {/* Specific fields for Physical Letter */}
          {channel === 'physical' && (
            <div className='p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3'>
              <p className='text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5'>
                <span>📄</span> {t('Detail Berkas Fisik (Hardcopy)', 'Physical Hardcopy Details')}
              </p>

              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='supervisorSignedCheck'
                  checked={form.supervisorSigned}
                  onChange={e => setForm(f => ({ ...f, supervisorSigned: e.target.checked }))}
                  className='w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-400'
                />
                <label htmlFor='supervisorSignedCheck' className='text-xs text-gray-700 cursor-pointer font-medium'>
                  {t('Surat fisik sudah dibubuhi paraf / tanda tangan Atasan Langsung', 'Physical letter already signed/acknowledged by Direct Supervisor')}
                </label>
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                  {t('Lokasi Arsip Berkas Fisik (Filing Cabinet / Map)', 'Physical Archive Location (Filing Cabinet / Binder)')}
                </label>
                <input
                  type='text'
                  value={form.physicalArchiveLocation}
                  onChange={e => setForm(f => ({ ...f, physicalArchiveLocation: e.target.value }))}
                  placeholder={t('Contoh: Lemari Arsip HR-02 / Ordner Resign 2026', 'e.g. Filing Cabinet HR-02 / Resignation Binder 2026')}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400 bg-white'
                />
              </div>
            </div>
          )}

          {/* Specific fields for Email */}
          {channel === 'email' && (
            <div className='p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3'>
              <p className='text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5'>
                <span>✉️</span> {t('Detail Email Resign', 'Resignation Email Details')}
              </p>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>
                  {t('Subjek Email', 'Email Subject')}
                </label>
                <input
                  type='text'
                  value={form.emailSubject}
                  onChange={e => setForm(f => ({ ...f, emailSubject: e.target.value }))}
                  placeholder={t('Contoh: Resignation Letter - [Nama Karyawan]', 'e.g. Resignation Letter - [Employee Name]')}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400 bg-white'
                />
              </div>
            </div>
          )}

          {/* Scan / File Upload */}
          <div>
            <label className='block text-xs font-semibold text-gray-700 mb-1'>
              {channel === 'physical'
                ? t('Unggah Hasil Scan Surat Fisik (PDF / JPG / PNG)', 'Upload Physical Letter Scan (PDF / JPG / PNG)')
                : t('Unggah Bukti / Tangkapan Layar Email (PDF / PNG / EML)', 'Upload Email Screenshot / File (PDF / PNG / EML)')}
            </label>
            <div className='flex items-center gap-3'>
              <input
                ref={fileRef}
                type='file'
                accept='.pdf,.jpg,.jpeg,.png,.doc,.docx,.eml,.msg'
                onChange={handleFileChange}
                className='text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer'
              />
              {form.resignLetter && (
                <span className='text-xs text-green-700 font-semibold bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg flex items-center gap-1'>
                  <span>📎</span> {form.resignLetter}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal footer actions */}
        <div className='px-6 py-4 bg-gray-50 border-t flex flex-wrap items-center justify-between gap-3 flex-shrink-0'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition'
          >
            {t('Batal', 'Cancel')}
          </button>

          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => handleSave('Draft')}
              className='px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition'
            >
              {t('Simpan Draft', 'Save Draft')}
            </button>
            <button
              type='button'
              onClick={() => handleSave('Submitted')}
              className='px-4 py-2 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition'
            >
              {t('Simpan & Ajukan', 'Save & Submit')}
            </button>
            <button
              type='button'
              onClick={() => handleSave('Approved')}
              className='flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow transition'
            >
              <span>⚡</span> {t('Simpan & Langsung Setujui (Mulai Offboarding)', 'Save & Direct Approve')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
