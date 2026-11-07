'use client'
import { useState, useMemo, useEffect } from 'react'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore } from '@/store/personnelActionStore'
import { useOffboardingNotifyStore } from '@/store/offboardingNotifyStore'
import { useT } from '@/store/languageStore'

// ─── Inline line icons ──────────────────────────────────────────────────────
const svg = (children, size = 18) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcSend  = svg(<><line x1='22' y1='2' x2='11' y2='13' /><polygon points='22 2 15 22 11 13 2 9 22 2' /></>, 16)
const IcUser  = svg(<><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' /><circle cx='12' cy='7' r='4' /></>)
const IcClock = svg(<><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></>, 14)
const IcCheck = svg(<><path d='M22 11.08V12a10 10 0 11-5.93-9.14' /><polyline points='22 4 12 14.01 9 11.01' /></>, 14)
const IcMail  = svg(<><rect x='2' y='4' width='20' height='16' rx='2' /><path d='M22 7l-10 6L2 7' /></>, 13)
const IcCal   = svg(<><rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' /></>, 14)
const IcBuilding = svg(<><path d='M3 21h18M5 21V7l8-4v18M19 21V11l-6-3' /></>)
const IcCpu   = svg(<><rect x='4' y='4' width='16' height='16' rx='2' /><rect x='9' y='9' width='6' height='6' /><line x1='9' y1='1' x2='9' y2='4' /><line x1='15' y1='1' x2='15' y2='4' /><line x1='9' y1='20' x2='9' y2='23' /><line x1='15' y1='20' x2='15' y2='23' /><line x1='20' y1='9' x2='23' y2='9' /><line x1='20' y1='14' x2='23' y2='14' /><line x1='1' y1='9' x2='4' y2='9' /><line x1='1' y1='14' x2='4' y2='14' /></>)
const IcMoney = svg(<><line x1='12' y1='1' x2='12' y2='23' /><path d='M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' /></>)
const IcCard  = svg(<><rect x='2' y='5' width='20' height='14' rx='2' /><line x1='2' y1='10' x2='22' y2='10' /></>)
const IcHeart = svg(<><path d='M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z' /></>, 16)
const IcBriefcase = svg(<><rect x='2' y='7' width='20' height='14' rx='2' /><path d='M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16' /></>, 14)
const IcInfo  = svg(<><circle cx='12' cy='12' r='10' /><line x1='12' y1='16' x2='12' y2='12' /><line x1='12' y1='8' x2='12.01' y2='8' /></>, 15)

const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const initials = (name) => asText(name).trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const fmtDate = (d) => {
  const s = asText(d); if (!s) return '—'
  const dt = new Date(s); if (isNaN(dt.getTime())) return s
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
// Send date = Last Working Day − 7 days, pulled back to a weekday (Mon–Fri)
const computeSendDate = (lwd) => {
  const s = asText(lwd); if (!s) return ''
  const d = new Date(s); if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() - 7)
  const day = d.getDay()
  if (day === 6) d.setDate(d.getDate() - 1)      // Sat → Fri
  else if (day === 0) d.setDate(d.getDate() - 2) // Sun → Fri
  return d.toISOString().split('T')[0]
}

const DEPARTMENTS = [
  {
    key: 'GA', name: 'General Affairs', email: 'ga@testing.com', Icon: IcBuilding, tint: 'text-red-600 bg-red-50',
    subject: (n) => `[Offboarding] Persiapan Pengembalian Aset — ${n}`,
    body: (n, lwd) => [
      `Nama karyawan resign: ${n}`,
      `Last Working Day: ${lwd}`,
      'Jadwalkan pengembalian access card, ID card, dan locker',
      'Koordinasi farewell kit & seremoni perpisahan',
    ],
  },
  {
    key: 'IT', name: 'IT', email: 'it-helpdesk@testing.com', Icon: IcCpu, tint: 'text-sky-600 bg-sky-50',
    subject: (n) => `[Offboarding] Deactivate Access & Collect Laptop — ${n}`,
    body: (n, lwd) => [
      `Nama karyawan resign: ${n}`,
      `Effective LWD: ${lwd}`,
      'Disable email account, VPN, dan SSO H+0 setelah LWD',
      'Schedule laptop wipe & collect device',
      'Revoke akses production, GitHub, dan tools internal',
    ],
  },
  {
    key: 'REM', name: 'Remuneration', email: 'remuneration@testing.com', Icon: IcMoney, tint: 'text-amber-600 bg-amber-50',
    subject: (n) => `[Offboarding] Final Payroll Calculation — ${n}`,
    body: (n, lwd) => [
      `Nama karyawan resign: ${n}`,
      `Last Working Day: ${lwd}`,
      'Hitung final salary, prorate THR & unused leave',
      'Proses JHT dan benefit tambahan (jika ada)',
    ],
  },
  {
    key: 'FIN', name: 'Finance', email: 'finance@testing.com', Icon: IcCard, tint: 'text-green-600 bg-green-50',
    subject: (n) => `[Offboarding] Finance Clearance Required — ${n}`,
    body: (n, lwd) => [
      `Nama karyawan resign: ${n}`,
      `Last Working Day: ${lwd}`,
      'Settle outstanding cash advance & reimbursement',
      'Clear saldo pinjaman / koperasi',
    ],
  },
]

export default function OffboardingNotify() {
  const t = useT()
  const { employees = [] } = useEmployeeStore()
  const { departments = [], positions = [] } = useStructureStore()
  const { pas = [] } = usePersonnelActionStore()
  const { getSend, markSent, markAllSent } = useOffboardingNotifyStore()

  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const posName = id => positions.find(x => x.id === Number(id))?.name || ''

  const eligible = useMemo(() =>
    (employees || []).filter(e =>
      (pas || []).some(p => p && p.action === 'Terminate' &&
        String(p.employeeId) === String(e.id) && ['Approved', 'Applied'].includes(p.status)))
      .sort((a, b) => asText(a.name).localeCompare(asText(b.name))),
    [employees, pas])

  const [empId, setEmpId] = useState('')
  useEffect(() => { if (!empId && eligible.length) setEmpId(String(eligible[0].id)) }, [eligible, empId])

  const emp = (employees || []).find(e => String(e.id) === String(empId))
  const termPA = useMemo(() =>
    [...(pas || [])].filter(p => p && p.action === 'Terminate' && String(p.employeeId) === String(empId))
      .sort((a, b) => asText(b.createdAt).localeCompare(asText(a.createdAt)))[0] || null,
    [pas, empId])
  const lwd = termPA?.lastWorkingDay || termPA?.effectiveDate || ''

  const [sendDate, setSendDate] = useState('')
  useEffect(() => { setSendDate(computeSendDate(lwd)) }, [lwd])

  // Editable bodies keyed by department, reset when the employee changes
  const [bodies, setBodies] = useState({})
  useEffect(() => {
    if (!emp) { setBodies({}); return }
    const next = {}
    DEPARTMENTS.forEach(d => { next[d.key] = d.body(emp.name, fmtDate(lwd)).map(l => `• ${l}`).join('\n') })
    setBodies(next)
  }, [empId, lwd]) // eslint-disable-line react-hooks/exhaustive-deps

  const [msg, setMsg] = useState(null)
  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2500) }

  const sendOne = (dept) => { markSent(empId, dept, sendDate); flash(t(`Email ke ${DEPARTMENTS.find(d=>d.key===dept)?.name} terjadwal/terkirim.`, 'Notification sent.')) }
  const sendAll = () => { markAllSent(empId, DEPARTMENTS.map(d => d.key), sendDate); flash(t('Semua departemen telah dinotifikasi.', 'All departments notified.')) }

  // Progress across the four departments for the selected employee
  const sentCount = emp ? DEPARTMENTS.filter(d => getSend(empId, d.key)?.status === 'Sent').length : 0
  const pct = Math.round((sentCount / DEPARTMENTS.length) * 100)

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-6xl mx-auto px-6 py-8'>

        {/* Header */}
        <div className='flex items-start gap-4'>
          <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-sm flex-shrink-0'>
            <IcHeart />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>{t('Notifikasi Offboarding', 'Offboarding Handover')}</h1>
            <p className='text-gray-500 mt-1 leading-relaxed max-w-3xl'>
              {t('Setiap kepergian layak diantar dengan rapi. Setelah PA Terminate diapprove HR Manager, sistem membantu menjadwalkan pemberitahuan ke GA, IT, Remuneration, dan Finance agar transisi berjalan mulus dan penuh hormat.', 'Every departure deserves a graceful handover. Once the PA Terminate is approved by the HR Manager, the system helps schedule notifications to GA, IT, Remuneration and Finance so the transition stays smooth and respectful.')}
            </p>
          </div>
        </div>

        {/* Selection card */}
        <div className='mt-7 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-50 flex items-center gap-2'>
            <span className='text-red-600'><IcUser /></span>
            <p className='font-bold text-gray-900'>{t('Siapa yang akan berpamitan?', 'Who is moving on?')}</p>
          </div>

          {eligible.length === 0 ? (
            <div className='px-6 py-10 text-center'>
              <div className='w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center'><IcInfo /></div>
              <p className='mt-3 text-sm font-semibold text-gray-700'>{t('Belum ada yang perlu dinotifikasi', 'Nothing to notify yet')}</p>
              <p className='mt-1 text-sm text-gray-400 max-w-md mx-auto'>{t('Belum ada karyawan dengan PA Terminate yang disetujui HR. Notifikasi akan muncul di sini begitu ada approval.', 'No employees with an HR-approved PA Terminate yet. Cases will appear here as soon as one is approved.')}</p>
            </div>
          ) : (
            <div className='p-6'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
                <div>
                  <label className='text-sm font-semibold text-gray-800'>{t('Karyawan Resign', 'Resigning Employee')}</label>
                  <select value={empId} onChange={e => setEmpId(e.target.value)}
                    className='mt-1.5 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white'>
                    {eligible.map(e => (
                      <option key={e.id} value={e.id}>{asText(e.name)} — {posName(e.positionId) || e.position || '—'} ({dpName(e.departmentId) || e.department || '—'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='text-sm font-semibold text-gray-800'>Last Working Day</label>
                  <input readOnly value={fmtDate(lwd)}
                    className='mt-1.5 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50' />
                </div>
                <div>
                  <label className='flex items-center gap-1.5 text-sm font-semibold text-gray-800'><span className='text-gray-400'><IcCal /></span>{t('Tanggal Kirim (H-7, Sen–Jum)', 'Send Date (LWD-7, Mon–Fri)')}</label>
                  <input type='date' value={sendDate} onChange={e => setSendDate(e.target.value)}
                    className='mt-1.5 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white' />
                  <p className='text-xs text-gray-400 mt-1'>{t('Otomatis dari LWD, bisa diedit manual.', 'Auto from LWD, editable.')}</p>
                </div>
              </div>

              {/* Employee summary + progress */}
              {emp && (
                <div className='mt-6 rounded-xl bg-gradient-to-r from-rose-50 to-red-50/40 border border-rose-100/70 p-5'>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between'>
                    <div className='flex items-center gap-3.5'>
                      <div className='w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm' style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)' }}>{initials(emp.name)}</div>
                      <div>
                        <p className='font-bold text-gray-900'>{emp.name}</p>
                        <p className='flex items-center gap-1.5 text-xs text-gray-500 mt-0.5'>
                          <IcBriefcase /> {posName(emp.positionId) || emp.position || '—'}
                          <span className='text-gray-300'>·</span>
                          {dpName(emp.departmentId) || emp.department || '—'}
                        </p>
                      </div>
                    </div>
                    <div className='sm:text-right'>
                      <p className='text-xs text-gray-500'>{t('Departemen dinotifikasi', 'Departments notified')}</p>
                      <div className='flex items-center gap-2.5 mt-1.5'>
                        <div className='w-32 h-2 rounded-full bg-white/70 overflow-hidden'>
                          <div className='h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500' style={{ width: `${pct}%` }} />
                        </div>
                        <span className='text-sm font-bold text-gray-800'>{sentCount}/{DEPARTMENTS.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className='mt-4 flex justify-end'>
                    <button onClick={sendAll}
                      className='flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow hover:shadow-md hover:brightness-105 transition text-sm'>
                      <IcSend /> {t('Kirim ke Semua Departemen', 'Notify All Departments')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Department cards */}
        {emp && (
          <>
            <p className='mt-8 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide'>{t('Rincian Notifikasi per Departemen', 'Notifications by Department')}</p>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
              {DEPARTMENTS.map(d => {
                const sent = getSend(empId, d.key)
                const isSent = sent?.status === 'Sent'
                return (
                  <div key={d.key} className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col transition ${isSent ? 'border-green-100' : 'border-gray-100'}`}>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex items-center gap-3'>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.tint}`}><d.Icon /></div>
                        <div>
                          <p className='font-bold text-gray-900'>{d.name}</p>
                          <p className='flex items-center gap-1 text-xs text-gray-400'><IcMail /> {d.email}</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isSent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isSent ? <IcCheck /> : <IcClock />}{isSent ? t('Terkirim', 'Sent') : t('Belum Terkirim', 'Not Sent')}
                      </span>
                    </div>

                    <p className='text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-4'>Subject</p>
                    <p className='text-sm font-semibold text-gray-800 mt-0.5'>{d.subject(emp.name)}</p>

                    <p className='text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-3'>{t('Isi Informasi', 'Information')}</p>
                    <textarea value={bodies[d.key] || ''} onChange={e => setBodies(b => ({ ...b, [d.key]: e.target.value }))}
                      rows={5}
                      className='mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50 resize-y bg-gray-50/40' />

                    <div className='flex items-center justify-between mt-4'>
                      <p className='text-xs text-gray-500'>{t('Jadwal kirim', 'Scheduled')}: <span className='font-semibold text-gray-700'>{fmtDate(sendDate)}</span>{isSent && sent.sentAt && <span className='text-green-600'> · {t('dikirim', 'sent')} {fmtDate(sent.sentAt)}</span>}</p>
                      <button onClick={() => sendOne(d.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${isSent ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-white bg-red-600 hover:bg-red-700 shadow'}`}>
                        <IcSend /> {isSent ? t('Kirim Ulang', 'Resend') : t('Kirim Sekarang', 'Send Now')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {msg && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold bg-green-600 text-white pointer-events-none flex items-center gap-2'>
          <IcCheck /> {msg}
        </div>
      )}
    </div>
  )
}
