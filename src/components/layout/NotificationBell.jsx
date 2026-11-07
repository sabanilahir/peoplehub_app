'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore }       from '@/store/authStore'
import { useEmployeeStore }   from '@/store/employeeStore'
import { useLeaveStore }      from '@/store/leaveStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useHayStore }        from '@/store/hayStore'
import { useVipStore }        from '@/store/vipStore'
import { usePipStore }        from '@/store/pipStore'
import { usePersonnelActionStore }     from '@/store/personnelActionStore'
import { useOffboardingChecklistStore } from '@/store/offboardingChecklistStore'
import { useOffboardingNotifyStore }    from '@/store/offboardingNotifyStore'
import { offboardingActionItems }       from '@/lib/offboarding'
import { useEmergencySosStore } from '@/store/emergencySosStore'
import { HR_ROLES } from '@/constants/roles'
import { useT } from '@/store/languageStore'

// ── Helpers ───────────────────────────────────────────────────────────────────
function useTimeAgo() {
  const t = useT()
  return (iso) => {
    if (!iso) return ''
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (m < 1)  return t('Baru saja', 'Just now')
    if (m < 60) return t(`${m} mnt lalu`, `${m} min ago`)
    const h = Math.floor(m / 60)
    if (h < 24) return t(`${h} jam lalu`, `${h} hr ago`)
    return t(`${Math.floor(h / 24)} hari lalu`, `${Math.floor(h / 24)} days ago`)
  }
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
}

const STATUS_CLS = {
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Pending:  'bg-yellow-100 text-yellow-700',
  Draft:    'bg-gray-100 text-gray-500',
}

function getDirectManagerId(userId, employees) {
  return employees.find(e => e.id === userId)?.managerId ?? null
}
function getIndirectManagerId(userId, employees) {
  const d = getDirectManagerId(userId, employees)
  return d ? getDirectManagerId(d, employees) : null
}

function resolveApproverName(step, rid, employees) {
  if (step.approverName) return step.approverName
  if (step.delegatedTo) return employees.find(e => e.id === step.delegatedTo)?.name ?? null
  switch (step.type) {
    case 'supervisor': {
      const id = getDirectManagerId(rid, employees)
      return employees.find(e => e.id === id)?.name ?? null
    }
    case 'indirect_sup': {
      const id = getIndirectManagerId(rid, employees)
      return employees.find(e => e.id === id)?.name ?? null
    }
    case 'supervisor_pc53':
    case 'indirect_sup_pc53': return 'Manager (PC53)'
    case 'role':
    case 'userlist':
    case 'employee':          return 'HR / Admin'
    default: return null
  }
}

function canActLeave(pendingStep, leave, currentUser, employees) {
  if (!pendingStep || pendingStep.status !== 'Pending') return false
  const uid  = currentUser?.id
  const role = currentUser?.role
  if (pendingStep.delegatedTo && pendingStep.delegatedTo === uid) return true
  const rid  = leave.userId
  switch (pendingStep.type) {
    case 'supervisor':        return getDirectManagerId(rid, employees)   === uid
    case 'indirect_sup':      return getIndirectManagerId(rid, employees) === uid
    case 'supervisor_pc53':
    case 'indirect_sup_pc53': return role === 'manager'  || role === 'superadmin'
    case 'role':
    case 'userlist':
    case 'employee':          return role === 'hr'        || role === 'superadmin'
    default:                  return role === 'superadmin'
  }
}

function canActOnboarding(pendingStep, ob, currentUser, employees) {
  if (!pendingStep || pendingStep.status !== 'Pending') return false
  const uid  = currentUser?.id
  const role = currentUser?.role
  const rid  = ob.employeeId
  switch (pendingStep.type) {
    case 'supervisor':        return getDirectManagerId(rid, employees)   === uid
    case 'indirect_sup':      return getIndirectManagerId(rid, employees) === uid
    case 'supervisor_pc53':
    case 'indirect_sup_pc53': return role === 'manager' || role === 'superadmin'
    case 'role': {
      const roles = pendingStep.roles ?? []
      return roles.includes(role) || role === 'superadmin'
    }
    default: return role === 'superadmin'
  }
}

// ── Detail popup ──────────────────────────────────────────────────────────────
function DetailPopup({ notif, currentUser, employees, leaves, onboardings,
                       leaveApprove, leaveReject, obApprove, obReject, onClose }) {
  const t = useT()
  const [note,      setNote     ] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [done,      setDone     ] = useState(false)

  const leave   = notif.type === 'leave'      ? leaves.find(l => l.id === notif.recordId)      : null
  const ob      = notif.type === 'onboarding' ? onboardings.find(o => o.id === notif.recordId) : null

  const pendingStep = leave
    ? (leave.steps  || []).find(s => s.status === 'Pending')
    : ob
      ? (ob.steps   || []).find(s => s.status === 'Pending')
      : null

  const canAct = leave
    ? canActLeave(pendingStep, leave, currentUser, employees)
    : ob
      ? canActOnboarding(pendingStep, ob, currentUser, employees)
      : false

  const handleApprove = () => {
    if (leave)  leaveApprove(leave.id,  pendingStep.level, currentUser.id, currentUser.name, note)
    if (ob)     obApprove(ob.id,        pendingStep.level, currentUser.id, currentUser.name, note)
    setDone(true)
  }
  const handleReject = () => {
    if (!note.trim()) return
    if (leave)  leaveReject(leave.id,   pendingStep.level, currentUser.id, currentUser.name, note)
    if (ob)     obReject(ob.id,         pendingStep.level, currentUser.id, currentUser.name, note)
    setDone(true)
  }

  const leaveFields = leave ? [
    [t('Karyawan', 'Employee'),    leave.name],
    [t('Jenis Cuti', 'Leave Type'), leave.type],
    [t('Mulai', 'Start'),           fmtDate(leave.start)],
    [t('Selesai', 'End'),           fmtDate(leave.end)],
    [t('Diajukan', 'Submitted'),    fmtDate(leave.submittedAt)],
    ['Status',                      leave.status],
  ] : []

  const obFields = ob ? [
    [t('Karyawan', 'Employee'),    ob.employeeName],
    ['Department',                 ob.department || '—'],
    [t('Atasan', 'Supervisor'),    ob.supervisorName || '—'],
    ['Probation',                  `${ob.probationPeriod} ${t('Bulan', 'Months')}`],
    [t('Diajukan', 'Submitted'),   fmtDate(ob.submittedAt)],
    ['Status',                     ob.workflowStatus],
  ] : []

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4'
      onClick={onClose}>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden'
        onClick={e => e.stopPropagation()}>

        <div style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
          className='px-5 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-xl'><Icon e={notif.icon} size={16} /></span>
            <div>
              <p className='text-white text-sm font-bold'>
                {notif.type === 'leave'
                  ? t('Detail Pengajuan Cuti', 'Leave Request Detail')
                  : t('Detail Onboarding', 'Onboarding Detail')}
              </p>
              <p className='text-teal-100 text-xs mt-0.5'>{notif.text}</p>
            </div>
          </div>
          <button onClick={onClose}
            className='w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition'>
            <Icon name='close' size={13} />
          </button>
        </div>

        <div className='px-5 py-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh]'>

          {/* Leave detail */}
          {leave && (
            <div className='flex flex-col gap-3'>
              <div className='grid grid-cols-2 gap-2 text-xs'>
                {leaveFields.map(([k, v]) => (
                  <div key={k}>
                    <p className='text-gray-400 mb-0.5'>{k}</p>
                    {k === 'Status'
                      ? <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[v] ?? 'bg-gray-100 text-gray-500'}`}>{v}</span>
                      : <p className='text-gray-800 font-semibold'>{v}</p>}
                  </div>
                ))}
              </div>
              {leave.note && (
                <div className='bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600'>
                  <span className='font-semibold text-gray-500'>{t('Catatan', 'Note')}: </span>{leave.note}
                </div>
              )}
              <div>
                <p className='text-xs font-semibold text-gray-500 mb-1.5'>Workflow</p>
                <div className='flex flex-col gap-1'>
                  {(leave.steps || []).map(s => {
                    const approver = resolveApproverName(s, leave.userId, employees)
                    return (
                      <div key={s.level}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
                          ${s.status === 'Approved' ? 'bg-green-50 text-green-700'
                            : s.status === 'Rejected' ? 'bg-red-50 text-red-700'
                            : s.status === 'Pending' ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-gray-50 text-gray-400'}`}>
                        <span>{s.status === 'Approved' ? <Icon name='check' size={14} /> : s.status === 'Rejected' ? <Icon name='close' size={14} /> : s.status === 'Pending' ? <Icon name='clock' size={14} /> : <Icon name='square' size={14} />}</span>
                        <span className='font-medium'>Step {s.level} — {s.label}</span>
                        {approver && <span className='ml-auto text-gray-500'>{approver}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Onboarding detail */}
          {ob && (
            <div className='flex flex-col gap-3'>
              <div className='grid grid-cols-2 gap-2 text-xs'>
                {obFields.map(([k, v]) => (
                  <div key={k}>
                    <p className='text-gray-400 mb-0.5'>{k}</p>
                    {k === 'Status'
                      ? <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[v] ?? 'bg-gray-100 text-gray-500'}`}>{v}</span>
                      : <p className='text-gray-800 font-semibold'>{v}</p>}
                  </div>
                ))}
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-500 mb-1.5'>Workflow</p>
                <div className='flex flex-col gap-1'>
                  {(ob.steps || []).map(s => {
                    const approver = resolveApproverName(s, ob.employeeId, employees)
                    return (
                      <div key={s.level}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
                          ${s.status === 'Approved' ? 'bg-green-50 text-green-700'
                            : s.status === 'Rejected' ? 'bg-red-50 text-red-700'
                            : s.status === 'Pending' ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-gray-50 text-gray-400'}`}>
                        <span>{s.status === 'Approved' ? <Icon name='check' size={14} /> : s.status === 'Rejected' ? <Icon name='close' size={14} /> : s.status === 'Pending' ? <Icon name='clock' size={14} /> : <Icon name='square' size={14} />}</span>
                        <span className='font-medium'>Step {s.level} — {s.label}</span>
                        {approver && <span className='ml-auto text-gray-500'>{approver}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action area */}
          {done ? (
            <div className='bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium text-center'>
              <Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Keputusan berhasil disimpan.', 'Decision saved successfully.')}
            </div>
          ) : canAct ? (
            <div className='border-t border-gray-100 pt-3 flex flex-col gap-2'>
              {!rejecting ? (
                <>
                  <p className='text-xs text-gray-500'>{t('Catatan (opsional)', 'Note (optional)')}</p>
                  <input value={note} onChange={e => setNote(e.target.value)}
                    placeholder={t('Tambahkan catatan…', 'Add a note…')}
                    className='w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-teal-400' />
                  <div className='flex gap-2 mt-1'>
                    <button onClick={handleApprove}
                      className='flex-1 py-2 text-sm font-bold text-white rounded-xl bg-green-500 hover:bg-green-600 transition'><Icon e='✓' size={14} className='inline align-[-2px]' /> Approve
                    </button>
                    <button onClick={() => setRejecting(true)}
                      className='flex-1 py-2 text-sm font-bold text-white rounded-xl bg-red-500 hover:bg-red-600 transition'><Icon e='✗' size={14} className='inline align-[-2px]' /> Reject
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className='text-xs text-red-500 font-semibold'>{t('Alasan penolakan (wajib)', 'Rejection reason (required)')}</p>
                  <input value={note} onChange={e => setNote(e.target.value)}
                    autoFocus placeholder={t('Tuliskan alasan penolakan…', 'Enter rejection reason…')}
                    className='w-full px-3 py-2 text-xs border border-red-300 rounded-lg outline-none focus:border-red-500' />
                  <div className='flex gap-2 mt-1'>
                    <button onClick={handleReject} disabled={!note.trim()}
                      className='flex-1 py-2 text-sm font-bold text-white rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 transition'>
                      <Icon e='✗' size={14} className='inline align-[-2px]' /> {t('Konfirmasi Tolak', 'Confirm Reject')}
                    </button>
                    <button onClick={() => { setRejecting(false); setNote('') }}
                      className='px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                      {t('Batal', 'Cancel')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const t = useT()
  const timeAgo = useTimeAgo()

  const { currentUser }                                        = useAuthStore()
  const { employees }                                          = useEmployeeStore()
  const { leaves,     approveStep: leaveApprove, rejectStep: leaveReject } = useLeaveStore()
  const { onboardings, approveStep: obApprove,   rejectStep: obReject    } = useOnboardingStore()
  const { sessions: haySessions }  = useHayStore()
  const { sessions: vipSessions }  = useVipStore()
  const { sessions: pipSessions }  = usePipStore()
  const { pas }                    = usePersonnelActionStore()
  const { items: offChecklist }    = useOffboardingChecklistStore()
  const { sends: offNotifySends }  = useOffboardingNotifyStore()
  const { alerts: sosAlerts }      = useEmergencySosStore()

  const [open,       setOpen      ] = useState(false)
  const [readIds,    setReadIds   ] = useState([])
  const [activeItem, setActiveItem] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notifications = []

  if (currentUser) {
    const uid  = currentUser.id
    const role = currentUser.role

    leaves
      .filter(l => l.userId === uid && (l.status === 'Approved' || l.status === 'Rejected'))
      .forEach(l => {
        const actedAt = (l.steps || []).findLast?.(s => s.actedAt)?.actedAt ?? l.submittedAt
        notifications.push({
          id: `leave-${l.status.toLowerCase()}-${l.id}`,
          icon: l.status === 'Approved' ? '✅' : '❌',
          text: l.status === 'Approved'
            ? t(`Pengajuan cuti "${l.type}" Anda telah disetujui.`, `Your "${l.type}" leave request has been approved.`)
            : t(`Pengajuan cuti "${l.type}" Anda telah ditolak.`,   `Your "${l.type}" leave request has been rejected.`),
          at: actedAt, type: 'leave', recordId: l.id,
        })
      })

    leaves
      .filter(l => {
        const ps = (l.steps || []).find(s => s.status === 'Pending')
        return ps && canActLeave(ps, l, currentUser, employees)
      })
      .forEach(l => {
        notifications.push({
          id: `leave-pending-${l.id}`,
          icon: '⏳',
          text: t(`Permintaan cuti dari ${l.name} menunggu persetujuan Anda.`, `Leave request from ${l.name} is awaiting your approval.`),
          at: l.submittedAt, type: 'leave', recordId: l.id,
        })
      })

    onboardings
      .filter(o => o.employeeId === uid && o.workflowStatus === 'Approved')
      .forEach(o => {
        notifications.push({
          id: `ob-approved-${o.id}`,
          icon: '🎉',
          text: t('Onboarding Anda telah disetujui sepenuhnya.', 'Your onboarding has been fully approved.'),
          at: o.submittedAt, type: 'onboarding', recordId: o.id,
        })
      })

    onboardings
      .filter(o => {
        const ps = (o.steps || []).find(s => s.status === 'Pending')
        return ps && canActOnboarding(ps, o, currentUser, employees)
      })
      .forEach(o => {
        notifications.push({
          id: `ob-pending-${o.id}`,
          icon: '📋',
          text: t(`Formulir onboarding ${o.employeeName} menunggu persetujuan Anda.`, `Onboarding form for ${o.employeeName} is awaiting your approval.`),
          at: o.submittedAt, type: 'onboarding', recordId: o.id,
        })
      })

    // Auto-assigned onboarding (no approval) — notify HR and the direct atasan
    // so they can add/remove technical tasks. Shown for ~30 days after creation.
    const WINDOW_MS = 30 * 24 * 60 * 60 * 1000
    onboardings
      .filter(o =>
        typeof o.createdVia === 'string' && o.createdVia.startsWith('rule:') &&
        (o.workflowStatus === 'Active' || o.workflowStatus === 'Preparation') &&
        (!o.createdAt || (Date.now() - new Date(o.createdAt).getTime()) < WINDOW_MS)
      )
      .forEach(o => {
        const isAtasan = getDirectManagerId(Number(o.employeeId), employees) === uid
        const isHr     = role === 'hr' || role === 'superadmin'
        if (isAtasan) {
          notifications.push({
            id: `ob-auto-mgr-${o.id}`,
            icon: '🧩',
            text: t(`Karyawan baru ${o.employeeName} di tim Anda — tinjau & sesuaikan task teknis onboarding.`, `New hire ${o.employeeName} on your team — review and adjust the technical onboarding tasks.`),
            at: o.createdAt, type: 'onboarding', recordId: o.id,
          })
        } else if (isHr) {
          notifications.push({
            id: `ob-auto-hr-${o.id}`,
            icon: '🧩',
            text: t(`Onboarding otomatis dibuat untuk ${o.employeeName} — tinjau bila perlu penyesuaian.`, `Auto onboarding created for ${o.employeeName} — review if adjustments are needed.`),
            at: o.createdAt, type: 'onboarding', recordId: o.id,
          })
        }
      })

    // ── HAY (Performance Check-In) ──────────────────────────────────────────
    haySessions
      .filter(h => h.status === 'Pending Manager' && h.managerId === uid)
      .forEach(h => {
        notifications.push({
          id: `hay-mgr-${h.id}`,
          icon: '📝',
          text: t(
            `${h.employeeName} telah mengisi formulir HAY Check-In dan menunggu tanggapan Anda.`,
            `${h.employeeName} has submitted a HAY Check-In form awaiting your response.`,
          ),
          at: h.submittedAt, type: 'hay', recordId: h.id, href: '/mss/check-in',
        })
      })

    haySessions
      .filter(h => h.status === 'Pending Employee' && h.employeeId === uid)
      .forEach(h => {
        notifications.push({
          id: `hay-emp-${h.id}`,
          icon: '📝',
          text: t(
            `Atasan Anda (${h.managerName}) telah mengisi HAY Check-In. Giliran Anda untuk mengisi.`,
            `Your manager (${h.managerName}) has responded to the HAY Check-In. Your turn to fill in.`,
          ),
          at: h.managerFilledAt, type: 'hay', recordId: h.id, href: '/ess/check-in',
        })
      })

    haySessions
      .filter(h => h.status === 'Completed' && h.employeeId === uid && h.managerFilledAt)
      .forEach(h => {
        notifications.push({
          id: `hay-done-${h.id}`,
          icon: '✅',
          text: t(
            `Sesi HAY Check-In "${h.date}" telah selesai diisi oleh kedua pihak.`,
            `HAY Check-In session "${h.date}" has been completed by both parties.`,
          ),
          at: h.managerFilledAt, type: 'hay', recordId: h.id, href: '/ess/check-in',
        })
      })

    // ── VIP (Performance Goal Check-In) ────────────────────────────────────
    // Manager: VIP goals awaiting approval at the start of the period.
    vipSessions
      .filter(v => v.managerId === uid && v.status === 'Pending Manager')
      .forEach(v => {
        notifications.push({
          id: `vip-mgr-${v.id}`,
          icon: '🎯',
          text: t(
            `Goal VIP "${v.name}" dari ${v.employeeName} menunggu persetujuan Anda.`,
            `VIP goals "${v.name}" from ${v.employeeName} are awaiting your approval.`,
          ),
          at: v.submittedAt, type: 'vip', recordId: v.id, href: '/mss/check-in',
        })
      })

    // Employee: VIP goals returned by the manager for revision.
    vipSessions
      .filter(v => v.employeeId === uid && v.status === 'Returned')
      .forEach(v => {
        notifications.push({
          id: `vip-returned-${v.id}`,
          icon: '↩️',
          text: t(
            `Goal VIP "${v.name}" dikembalikan atasan untuk direvisi.`,
            `VIP goals "${v.name}" were returned by your manager for revision.`,
          ),
          at: v.returnedAt, type: 'vip', recordId: v.id, href: '/ess/check-in',
        })
      })

    // Employee: VIP goals rated at period end.
    vipSessions
      .filter(v => v.employeeId === uid && v.status === 'Closed')
      .forEach(v => {
        notifications.push({
          id: `vip-rated-${v.id}`,
          icon: '⭐',
          text: t(
            `Goal VIP "${v.name}" telah dinilai (skor ${v.finalScore}).`,
            `VIP goals "${v.name}" have been rated (score ${v.finalScore}).`,
          ),
          at: v.ratedAt, type: 'vip', recordId: v.id, href: '/ess/check-in',
        })
      })

    // ── PIP (Performance Improvement Plan) (Dinonaktifkan sepenuhnya) ──
    /*
    if (role === 'hr' || role === 'superadmin') {
      pipSessions
        .filter(p => p.status === 'Pending HR Review')
        .forEach(p => {
          notifications.push({
            id: `pip-hr-${p.id}`,
            icon: '🛡️',
            text: t(
              `PIP untuk ${p.employeeName} menunggu review Anda.`,
              `PIP for ${p.employeeName} is awaiting your review.`,
            ),
            at: p.submittedAt, type: 'pip', recordId: p.id, href: '/hr/performance/pip',
          })
        })
    }

    pipSessions
      .filter(p => p.status === 'Rejected by HR' && p.managerId === uid)
      .forEach(p => {
        notifications.push({
          id: `pip-rejected-${p.id}`,
          icon: '↩️',
          text: t(
            `PIP untuk ${p.employeeName} dikembalikan HR untuk perbaikan.`,
            `PIP for ${p.employeeName} was returned by HR for revision.`,
          ),
          at: p.hrReviewedAt, type: 'pip', recordId: p.id, href: '/mss/check-in',
        })
      })

    pipSessions
      .filter(p => p.status === 'Pending Acknowledgement' && p.employeeId === uid)
      .forEach(p => {
        notifications.push({
          id: `pip-ack-${p.id}`,
          icon: '📄',
          text: t(
            `PIP Anda menunggu untuk diterima & diketahui.`,
            `Your PIP is awaiting your acknowledgement.`,
          ),
          at: p.hrReviewedAt, type: 'pip', recordId: p.id, href: '/ess/check-in',
        })
      })

    pipSessions
      .filter(p => p.status === 'Active' && p.managerId === uid)
      .forEach(p => {
        const overdue = (p.evaluasiRows ?? []).some((r, i) => {
          if ((r.sudah ?? '').trim() !== '') return false
          let due = r.tanggal ? new Date(r.tanggal) : null
          if ((!due || isNaN(due.getTime())) && p.startDate) {
            due = new Date(p.startDate); due.setMonth(due.getMonth() + i + 1)
          }
          return due && !isNaN(due.getTime()) && due <= new Date()
        })
        if (overdue) {
          notifications.push({
            id: `pip-eval-${p.id}`,
            icon: '📅',
            text: t(
              `Evaluasi bulanan PIP ${p.employeeName} sudah jatuh tempo — mohon diisi.`,
              `Monthly PIP evaluation for ${p.employeeName} is due — please fill it in.`,
            ),
            at: p.acknowledgedAt, type: 'pip', recordId: p.id, href: '/mss/check-in',
          })
        }
      })

    if (role === 'hr' || role === 'superadmin') {
      pipSessions
        .filter(p => p.status === 'Passed' || p.status === 'Failed')
        .forEach(p => {
          const failed = p.status === 'Failed'
          notifications.push({
            id: `pip-closed-${p.id}`,
            icon: failed ? '⚠️' : '✅',
            text: failed
              ? t(
                  `PIP ${p.employeeName} berakhir GAGAL — perlu tindak lanjut HR.`,
                  `PIP for ${p.employeeName} ended FAILED — HR follow-up needed.`,
                )
              : t(
                  `PIP ${p.employeeName} berakhir Lulus.`,
                  `PIP for ${p.employeeName} ended Passed.`,
                ),
            at: p.closedAt, type: 'pip', recordId: p.id, href: '/hr/performance/pip',
          })
        })
    }
    */

    // ── Offboarding (resignation approval, supervisor handover, dept notify) ──
    offboardingActionItems({
      currentUser, employees, pas,
      checklistItems: offChecklist, notifySends: offNotifySends,
    }).forEach(it => {
      notifications.push({
        id: it.id, icon: it.icon,
        text: t(it.id_text, it.en_text),
        at: it.at, type: 'offboarding', recordId: it.employeeId, href: it.href,
      })
    })

    // ── Emergency SOS (Dinonaktifkan sesuai permintaan) ────────────────
    /*
    const isHrForSos = HR_ROLES.includes(role)
    sosAlerts
      .filter(a => a.status === 'Pending')
      .filter(a => isHrForSos || getDirectManagerId(a.employeeId, employees) === uid)
      .forEach(a => {
        notifications.push({
          id: `sos-${a.id}`,
          icon: '🆘',
          text: isHrForSos
            ? t(`SOS Emergency dari ${a.employeeName} (${a.category}) — perlu ditinjau.`, `Emergency SOS from ${a.employeeName} (${a.category}) — needs review.`)
            : t(`SOS Emergency dari anggota tim Anda, ${a.employeeName} (${a.category}).`, `Emergency SOS from your team member ${a.employeeName} (${a.category}).`),
          at: a.createdAt, type: 'sos', recordId: a.id, href: '/hr/emergency-sos',
        })
      })
    */
  }

  notifications.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))

  const unread = notifications.filter(n => !readIds.includes(n.id))

  const markAllRead = () => setReadIds(notifications.map(n => n.id))

  const handleItemClick = (n) => {
    setReadIds(ids => ids.includes(n.id) ? ids : [...ids, n.id])
    // For types with a direct href (HAY/VIP/PIP), navigate instead of opening popup
    if (n.href && n.type !== 'leave' && n.type !== 'onboarding') {
      setOpen(false)
      window.location.href = n.href
      return
    }
    setActiveItem(n)
    setOpen(false)
  }

  return (
    <>
      <div ref={ref} className='relative'>
        <button
          onClick={() => setOpen(v => !v)}
          className='relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/15 transition text-white/90 hover:text-white'
          aria-label={t('Notifikasi', 'Notifications')}
        >
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'
            fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
            className='w-5 h-5'>
            <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
            <path d='M13.73 21a2 2 0 0 1-3.46 0' />
          </svg>
          {unread.length > 0 && (
            <span className='absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
              flex items-center justify-center rounded-full
              bg-teal-600 text-white text-[10px] font-bold leading-none'>
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>

        {open && (
          <div className='absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100'>
              <span className='text-sm font-bold text-gray-800'>
                {t('Notifikasi', 'Notifications')}
                {unread.length > 0 && (
                  <span className='ml-2 text-xs font-semibold text-white bg-teal-600 px-1.5 py-0.5 rounded-full'>
                    {unread.length}
                  </span>
                )}
              </span>
              {unread.length > 0 && (
                <button onClick={markAllRead}
                  className='text-xs text-teal-700 hover:text-teal-900 font-medium transition'>
                  {t('Tandai semua dibaca', 'Mark all as read')}
                </button>
              )}
            </div>

            <ul className='max-h-80 overflow-y-auto divide-y divide-gray-50'>
              {notifications.length === 0 ? (
                <li className='px-4 py-10 text-center text-gray-400 text-sm'>
                  {t('Tidak ada notifikasi.', 'No notifications.')}
                </li>
              ) : notifications.map(n => {
                const isUnread = !readIds.includes(n.id)
                return (
                  <li key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition
                      ${isUnread ? 'bg-teal-50/60 hover:bg-teal-50' : 'hover:bg-gray-50'}`}>
                    <span className='text-xl flex-shrink-0 mt-0.5'><Icon e={n.icon} size={16} /></span>
                    <div className='flex-1 min-w-0'>
                      <p className={`text-xs leading-relaxed ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                        {n.text}
                      </p>
                      {n.at && <p className='text-[11px] text-gray-400 mt-0.5'>{timeAgo(n.at)}</p>}
                    </div>
                    <div className='flex items-center gap-1.5 flex-shrink-0 mt-0.5'>
                      {isUnread && <span className='w-2 h-2 rounded-full bg-teal-600' />}
                      <svg xmlns='http://www.w3.org/2000/svg' className='w-3.5 h-3.5 text-gray-300'
                        fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                      </svg>
                    </div>
                  </li>
                )
              })}
            </ul>

            {notifications.length > 0 && (
              <div className='px-4 py-2.5 border-t border-gray-100 text-center'>
                <span className='text-xs text-gray-400'>
                  {notifications.length} {t('notifikasi', 'notifications')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {activeItem && (
        <DetailPopup
          notif={activeItem}
          currentUser={currentUser}
          employees={employees}
          leaves={leaves}
          onboardings={onboardings}
          leaveApprove={leaveApprove}
          leaveReject={leaveReject}
          obApprove={obApprove}
          obReject={obReject}
          onClose={() => setActiveItem(null)}
        />
      )}
    </>
  )
}
