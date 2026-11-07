'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBrandingStore } from '@/store/brandingStore'
import { useRecruitmentStore, isPublished } from '@/store/recruitmentStore'
import { useDocumentTypeStore } from '@/store/documentTypeStore'
import { useCandidateDocumentStore, CANDIDATE_DOCUMENT_MAX_BYTES } from '@/store/candidateDocumentStore'
import { useStructureStore } from '@/store/structureStore'
import { useNotificationSettingsStore, resolveTemplate } from '@/store/notificationSettingsStore'

// Dedicated apply page instead of a modal — with 6+ mandatory documents the
// form is genuinely long, and a modal just clips it. Lives outside
// (protected), same as /careers itself.

const BRAND = 'linear-gradient(135deg,#052B52,#039299)'
const EMPTY_FORM = { name: '', email: '', phone: '', notes: '' }

const formatBytes = (n) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`

const readAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export default function ApplyPage() {
  const { id } = useParams()
  const reqId = Number(id)

  const { requisitions, addCandidate } = useRecruitmentStore()
  const { departments, companies } = useStructureStore()
  const { types: docTypes } = useDocumentTypeStore()
  const { addDocument: addCandidateDocument } = useCandidateDocumentStore()
  const { candidateApply, addLog } = useNotificationSettingsStore()

  const req = requisitions.find(r => r.id === reqId)
  const deptName = departments.find(d => d.id === req?.departmentId)?.name || '—'
  const companyName = companies.find(c => c.id === req?.companyId)?.name || '—'
  const mandatoryDocTypes = docTypes.filter(x => x.active && x.mandatory)

  const [form, setForm] = useState(EMPTY_FORM)
  const [docFiles, setDocFiles] = useState({})
  const [docErrors, setDocErrors] = useState({})
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const setField = (patch) => setForm(f => ({ ...f, ...patch }))

  const setDocFile = (typeId, file) => {
    if (!file) return
    if (file.size > CANDIDATE_DOCUMENT_MAX_BYTES) {
      setDocErrors(e => ({ ...e, [typeId]: `Ukuran file maksimal ${formatBytes(CANDIDATE_DOCUMENT_MAX_BYTES)}.` }))
      return
    }
    setDocFiles(f => ({ ...f, [typeId]: file }))
    setDocErrors(e => ({ ...e, [typeId]: null }))
  }

  const missingMandatoryDocs = mandatoryDocTypes.filter(dt => !docFiles[dt.id])
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && missingMandatoryDocs.length === 0

  const submit = async () => {
    if (!valid || submitting) return
    setSubmitting(true)
    const appliedDate = new Date().toISOString().slice(0, 10)
    const newId = addCandidate({
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
      requisitionId: req.id, source: 'Career Site',
      appliedDate,
      notes: form.notes.trim(),
    })
    for (const dt of mandatoryDocTypes) {
      const file = docFiles[dt.id]
      if (!file) continue
      const dataUrl = await readAsDataURL(file)
      addCandidateDocument({
        candidateId: newId, category: dt.name,
        fileName: file.name, fileType: file.type, fileSize: file.size, dataUrl,
        uploadedAt: new Date().toISOString(),
      })
    }

    // Notification Setup (System Admin) drives this — subject/body/variables
    // are all configured there, resolved here with the real submission.
    if (candidateApply.active) {
      const values = {
        candidateName: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        positionTitle: req.publicTitle || req.positionTitle, departmentName: deptName,
        companyName, appliedDate,
      }
      const to = form.email.trim()
      const subject = resolveTemplate(candidateApply.subject, values)
      const body = resolveTemplate(candidateApply.body, values)

      let emailStatus = 'sent', emailError = ''
      try {
        const res = await fetch('/api/send-notification', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, body }),
        })
        if (!res.ok) { emailStatus = 'failed'; emailError = (await res.json().catch(() => ({})))?.error || `HTTP ${res.status}` }
      } catch (err) {
        emailStatus = 'failed'; emailError = err?.message || 'Network error'
      }

      addLog({
        to, subject, body, emailStatus, emailError,
        candidateName: form.name.trim(), candidateId: newId, requisitionId: req.id,
      })
    }

    setSubmitting(false)
    setSent(true)
  }

  // Requisition missing, or no longer live (closed/expired/reassigned) —
  // don't let someone apply to a job that's gone.
  if (!req || !isPublished(req)) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-6 text-center'>
        <p className='text-4xl'>🗂️</p>
        <p className='font-semibold text-gray-700'>Lowongan tidak ditemukan atau sudah tidak tersedia.</p>
        <Link href='/careers' className='mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white'
          style={{ background: BRAND }}>
          ← Kembali ke Daftar Lowongan
        </Link>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <nav className='sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur'>
        <div className='mx-auto flex max-w-2xl items-center gap-3 px-6 py-3.5'>
          <img src={mounted && loginLogo ? loginLogo : '/logos/Rans PeopleHub.png'} alt='' className='h-8 w-8 rounded-lg object-contain' />
          <span className='text-sm font-bold text-gray-800'>Rans PeopleHub</span>
        </div>
      </nav>

      <main className='mx-auto max-w-2xl px-6 py-10'>
        {sent ? (
          <div className='rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100'>
            <p className='text-5xl'>✅</p>
            <h1 className='mt-4 text-xl font-bold text-gray-800'>Lamaran Terkirim!</h1>
            <p className='mx-auto mt-2 max-w-md text-sm text-gray-500'>
              Terima kasih sudah melamar untuk posisi <b>{req.publicTitle || req.positionTitle}</b>. Tim kami akan menghubungi Anda jika profil Anda sesuai.
            </p>
            {candidateApply.active && (
              <p className='mx-auto mt-3 max-w-md text-xs text-teal-700'>
                📧 Email konfirmasi telah dikirim ke <b>{form.email}</b>.
              </p>
            )}
            <Link href='/careers' className='mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white'
              style={{ background: BRAND }}>
              Lihat Lowongan Lain
            </Link>
          </div>
        ) : (
          <>
            <Link href='/careers' className='mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-teal-700'>
              ← Kembali ke Daftar Lowongan
            </Link>

            <div className='rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8'>
              <h1 className='text-lg font-bold text-gray-800 sm:text-xl'>Lamar Posisi</h1>
              <p className='mt-1 text-sm text-gray-500'>{req.publicTitle || req.positionTitle} · {deptName} · {companyName}</p>

              <div className='mt-6 space-y-4'>
                <div>
                  <label className='mb-1 block text-xs font-semibold text-gray-600'>Nama Lengkap *</label>
                  <input value={form.name} onChange={e => setField({ name: e.target.value })} autoFocus
                    className='w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
                </div>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-1 block text-xs font-semibold text-gray-600'>Email *</label>
                    <input type='email' value={form.email} onChange={e => setField({ email: e.target.value })}
                      className='w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
                  </div>
                  <div>
                    <label className='mb-1 block text-xs font-semibold text-gray-600'>Nomor Telepon</label>
                    <input value={form.phone} onChange={e => setField({ phone: e.target.value })}
                      className='w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
                  </div>
                </div>
                <div>
                  <label className='mb-1 block text-xs font-semibold text-gray-600'>Pesan Singkat (opsional)</label>
                  <textarea rows={3} value={form.notes} onChange={e => setField({ notes: e.target.value })}
                    className='w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
                </div>

                {mandatoryDocTypes.length > 0 && (
                  <div className='rounded-xl bg-gray-50 p-4'>
                    <p className='mb-3 text-xs font-semibold text-gray-600'>Dokumen Wajib</p>
                    <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
                      {mandatoryDocTypes.map(dt => (
                        <div key={dt.id}>
                          <input type='file' id={`apply-doc-${dt.id}`} className='hidden'
                            accept='.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
                            onChange={e => setDocFile(dt.id, e.target.files?.[0])} />
                          <label htmlFor={`apply-doc-${dt.id}`}
                            className='flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2.5 text-xs hover:border-teal-300 hover:bg-teal-50/40'>
                            <span className='font-medium text-gray-700'>{dt.title} <span className='text-red-500'>*</span></span>
                            <span className='truncate text-gray-400'>
                              {docFiles[dt.id] ? `📎 ${docFiles[dt.id].name}` : 'Pilih file'}
                            </span>
                          </label>
                          {docErrors[dt.id] && <span className='mt-1 block text-[11px] text-red-500'>{docErrors[dt.id]}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={submit} disabled={!valid || submitting}
                className='mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-40'
                style={{ background: BRAND }}>
                {submitting ? 'Mengirim…' : 'Kirim Lamaran'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
