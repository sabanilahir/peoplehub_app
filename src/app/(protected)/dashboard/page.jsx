'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useLeaveStore } from '@/store/leaveStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useHayStore } from '@/store/hayStore'
import { usePipStore } from '@/store/pipStore'
import { usePersonnelActionStore } from '@/store/personnelActionStore'
import { useOffboardingChecklistStore } from '@/store/offboardingChecklistStore'
import { useOffboardingNotifyStore } from '@/store/offboardingNotifyStore'
import { offboardingActionItems } from '@/lib/offboarding'
import { useHomePreferencesStore, CHART_TYPE_DEFAULT } from '@/store/homePreferencesStore'
import { ALL_SHORTCUTS, SICONS } from '@/lib/dashboardShortcuts'
import { accessibleDashboards } from '@/lib/homeDashboards'
import { useAnnouncementStore, CATEGORY_TONE, isLive } from '@/store/announcementStore'
import { useShiftStore } from '@/store/shiftStore'
import { useAttendanceStore, todayStr } from '@/store/attendanceStore'
import { shiftFor, gradeTime, toMinutes, TONE_CLASS } from '@/lib/workSchedule'
import { useT } from '@/store/languageStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts'

/* ── Greeting ──────────────────────────────────────────────────────────────── */
function getGreeting(t) {
  const h = new Date().getHours()
  if (h < 12) return t('Good Morning', 'Good Morning')
  if (h < 17) return t('Good Afternoon', 'Good Afternoon')
  return t('Good Evening', 'Good Evening')
}

/* ── My Time Card widget ───────────────────────────────────────────────────── */
// Backed by the same attendance record as the Clock In/Out page, so the two
// can never disagree, and times survive a reload.
function TimeCardWidget({ t, userId, userName, sched, record, onClockIn, onClockOut, router }) {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const inTime  = record?.checkIn  && record.checkIn  !== '-' ? record.checkIn  : null
  const outTime = record?.checkOut && record.checkOut !== '-' ? record.checkOut : null

  const gin  = gradeTime(inTime,  sched?.shift.startTime, 'in')
  const gout = gradeTime(outTime, sched?.shift.endTime,   'out')

  // Worked time so far, from the recorded clock-in to clock-out (or now).
  const startMin = toMinutes(inTime)
  const endMin = outTime ? toMinutes(outTime) : (now ? now.getHours() * 60 + now.getMinutes() : null)
  const workedMin = startMin != null && endMin != null ? Math.max(0, endMin - startMin) : null
  const workingStr = workedMin != null ? `${Math.floor(workedMin / 60)}h ${workedMin % 60}m` : '--'

  const nowStr = now ? now.toLocaleTimeString('id-ID', { hour12: false }) : '--:--:--'

  return (
    <div className='rounded-2xl shadow-sm overflow-hidden' style={{ background: 'linear-gradient(135deg,#052B52 0%,#039299 100%)' }}>
      {/* Live clock header — the ticking time is the focal point, not a static label */}
      <div className='px-5 pt-4 pb-3 flex items-start justify-between'>
        <div>
          <p className='text-[11px] font-semibold uppercase tracking-wider text-teal-100/80'>
            {t('Jam Sekarang', 'Right Now')}
          </p>
          <p className='text-2xl font-bold font-mono tabular-nums text-white leading-tight'>{nowStr}</p>
          {sched && (
            <p className='mt-0.5 text-[11px] text-teal-100/70'>
              {sched.shift.name} · {sched.shift.startTime}–{sched.shift.endTime}
            </p>
          )}
        </div>
        <button onClick={() => router.push('/ess/calendar')}
          className='text-[11px] font-semibold text-white/70 hover:text-white transition whitespace-nowrap'>
          {t('Detail', 'Details')} →
        </button>
      </div>

      {/* In/Out chips on a light panel, not a divided two-column table */}
      <div className='mx-2 mb-2 rounded-xl bg-white/95 backdrop-blur px-3 py-3 flex gap-2'>
        <div className='flex-1 rounded-lg bg-emerald-50 px-3 py-2.5 text-center'>
          <p className='text-[10px] font-bold uppercase tracking-wide text-emerald-600'>{t('Masuk', 'Clock In')}</p>
          <p className={`text-base font-bold font-mono mt-0.5 ${inTime ? TONE_CLASS[gin.tone] : 'text-gray-300'}`}>
            {inTime || '--:--'}
          </p>
          {!inTime && (
            <button onClick={onClockIn} disabled={!userId}
              className='mt-1.5 text-[11px] text-white font-semibold px-3 py-1 rounded-full transition disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700'>
              {t('Clock In', 'Clock In')}
            </button>
          )}
        </div>
        <div className='flex-1 rounded-lg bg-rose-50 px-3 py-2.5 text-center'>
          <p className='text-[10px] font-bold uppercase tracking-wide text-rose-600'>{t('Pulang', 'Clock Out')}</p>
          <p className={`text-base font-bold font-mono mt-0.5 ${outTime ? TONE_CLASS[gout.tone] : 'text-gray-300'}`}>
            {outTime || '--:--'}
          </p>
          {inTime && !outTime && (
            <button onClick={onClockOut}
              className='mt-1.5 text-[11px] text-white font-semibold px-3 py-1 rounded-full transition bg-rose-600 hover:bg-rose-700'>
              {t('Clock Out', 'Clock Out')}
            </button>
          )}
        </div>
      </div>

      <div className='px-5 py-2 bg-black/10'>
        <span className='text-[11px] text-teal-50/90'>
          {t('Total jam kerja', 'Hours worked')}: <span className='font-bold text-white'>{workingStr}</span>
        </span>
      </div>
    </div>
  )
}

/* ── Leave Balance widget ──────────────────────────────────────────────────── */
function LeaveBalanceWidget({ leaves, leaveTypes, userId, t }) {
  const approvedByType = {}
  leaves
    .filter(l => l.userId === userId && l.status === 'Approved')
    .forEach(l => {
      approvedByType[l.type] = (approvedByType[l.type] || 0) + 1
    })

  return (
    <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
      <div className='flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-gray-700 font-semibold text-sm'>
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='2' y='3' width='20' height='14' rx='2' ry='2'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/>
        </svg>
        {t('Leave Balance', 'Leave Balance')}
      </div>
      <div className='divide-y divide-gray-50'>
        {leaveTypes.filter(lt => lt.active).map(lt => {
          const used  = approvedByType[lt.name] || 0
          const quota = lt.maxDays
          const pct   = Math.min(100, Math.round((used / quota) * 100))
          const expiry = new Date(new Date().getFullYear() + 1, 3, 5)
          return (
            <div key={lt.id} className='px-4 py-3'>
              <p className='text-xs font-semibold text-gray-700 mb-1'>{lt.name}</p>
              <div className='flex items-center justify-between mb-1.5'>
                <span className='text-xs text-gray-500'>
                  <span className='font-bold text-gray-800'>{used}</span> of {quota} {t('days', 'days')}
                </span>
                <span className='text-xs text-gray-400'>{pct}%</span>
              </div>
              <div className='w-full h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                <div className='h-full rounded-full transition-all'
                  style={{ width: `${pct}%`, background: pct > 80 ? '#dc2626' : 'linear-gradient(90deg,#052B52,#039299)' }} />
              </div>
              <p className='text-[10px] text-gray-400 mt-1'>
                {t('Expired on', 'Expired on')} {expiry.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Announcement widget ───────────────────────────────────────────────────── */
function AnnouncementWidget({ announcements, t }) {
  return (
    <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
      <div className='flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-gray-700 font-semibold text-sm'>
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M3 11l18-5v12L3 14v-3z' /><path d='M11.6 16.8a3 3 0 11-5.8-1.6' />
        </svg>
        {t('Pengumuman', 'Announcement')}
        {announcements.length > 0 && (
          <span className='ml-auto text-xs font-bold text-white rounded-full px-2 py-0.5'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            {announcements.length}
          </span>
        )}
      </div>
      {announcements.length === 0 ? (
        <p className='text-xs text-gray-400 text-center py-10'>
          {t('Belum ada pengumuman', 'No announcements')}
        </p>
      ) : (
        <div className='divide-y divide-gray-50 max-h-72 overflow-y-auto'>
          {announcements.map(a => (
            <div key={a.id} className='px-4 py-3'>
              <div className='flex items-start gap-2'>
                {a.pinned && <span className='text-xs leading-5' title={t('Disematkan', 'Pinned')}>📌</span>}
                <p className='flex-1 text-sm font-semibold text-gray-800 leading-snug'>{a.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_TONE[a.category] || CATEGORY_TONE.Umum}`}>
                  {a.category}
                </span>
              </div>
              {a.body && <p className='mt-1 text-xs text-gray-500 leading-relaxed'>{a.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Mini chart shell (shared by the role graphic widgets below) ────────────── */
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 10, border: '1px solid #e1e0d9', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

// Fixed categorical order for pie slices. Only used when the data carries no
// meaning in its own colours (the one-hue magnitude charts) — a pie needs a
// distinct hue per slice, where a bar chart does not. Never cycled: every
// chart here is capped at 8 rows, which is exactly the number of slots.
const SLICE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

function MiniChart({ icon, title, data, emptyLabel, height = 180, barSize = 16, type = 'bar' }) {
  // Charts whose rows already encode meaning in colour (leave status, user
  // role) keep those hues as slices; the all-one-hue ones get the categorical
  // ramp, since a single-colour pie would be unreadable.
  const uniform = data.every(d => d.color === data[0]?.color)
  const sliceFill = (d, i) => (uniform ? SLICE_COLORS[i % SLICE_COLORS.length] : d.color)

  return (
    <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
      <div className='flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-gray-700 font-semibold text-sm'>
        {icon}
        {title}
      </div>
      <div className='px-2 py-3'>
        {data.length === 0 ? (
          <p className='text-xs text-gray-400 text-center py-10'>{emptyLabel}</p>
        ) : type === 'pie' ? (
          <ResponsiveContainer width='100%' height={Math.max(height, 200)}>
            <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              {/* Animation off: the widget re-renders on store ticks, which
                  restarts recharts' entry animation and can leave later
                  sectors unpainted. */}
              <Pie data={data} dataKey='value' nameKey='name' isAnimationActive={false}
                cx='34%' cy='50%' outerRadius='82%' stroke='#fcfcfb' strokeWidth={2}>
                {data.map((d, i) => <Cell key={i} fill={sliceFill(d, i)} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend layout='vertical' align='right' verticalAlign='middle'
                iconType='circle' iconSize={8}
                formatter={(name, entry) => (
                  <span style={{ fontSize: 11, color: '#52514e' }}>{name} · <b>{entry?.payload?.value}</b></span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width='100%' height={height}>
            <BarChart data={data} layout='vertical' margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke='#e1e0d9' />
              <XAxis type='number' allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }}
                axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
              <YAxis type='category' dataKey='name' width={96} tick={{ fontSize: 11, fill: '#52514e' }}
                axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
              <Tooltip cursor={{ fill: '#f9f9f7' }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey='value' radius={[0, 4, 4, 0]} maxBarSize={barSize} isAnimationActive={false}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                <LabelList dataKey='value' position='right' style={{ fontSize: 11, fill: '#52514e', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

const CHART_ICON = (path) => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>{path}</svg>
)

/* ── Employee: my leave usage by type ────────────────────────────────────────── */
function EmployeeChartWidget({ leaves, leaveTypes, userId, t, type }) {
  const data = leaveTypes.filter(lt => lt.active).map(lt => ({
    name: lt.name,
    value: leaves.filter(l => l.userId === userId && l.status === 'Approved' && l.type === lt.name).length,
    color: '#2a78d6',
  }))
  return (
    <MiniChart type={type}
      icon={CHART_ICON(<><path d='M3 3v18h18'/><path d='M18 17V9M13 17V5M8 17v-3'/></>)}
      title={t('Grafik Cuti Saya', 'My Leave Usage')}
      data={data}
      emptyLabel={t('Belum ada data cuti', 'No leave data yet')}
    />
  )
}

/* ── Manager: team leave requests by status ──────────────────────────────────── */
function ManagerChartWidget({ leaves, team, t, type }) {
  const teamIds = new Set(team.map(e => e.id))
  const counts = { Pending: 0, Approved: 0, Rejected: 0 }
  leaves.filter(l => teamIds.has(l.userId)).forEach(l => {
    if (l.status === 'Approved') counts.Approved++
    else if (l.status === 'Rejected') counts.Rejected++
    else counts.Pending++
  })
  const data = [
    { name: t('Pending', 'Pending'),   value: counts.Pending,  color: '#fab219' },
    { name: t('Disetujui', 'Approved'), value: counts.Approved, color: '#0ca30c' },
    { name: t('Ditolak', 'Rejected'),   value: counts.Rejected, color: '#d03b3b' },
  ]
  return (
    <MiniChart type={type}
      icon={CHART_ICON(<><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'/></>)}
      title={t('Grafik Status Approval Tim', "Team's Leave Status")}
      data={data}
      emptyLabel={t('Belum ada pengajuan cuti tim', 'No team leave requests yet')}
    />
  )
}

/* ── HR: shared bucketing for the headcount & demography charts ─────────────── */
// Count `rows` by whatever key `keyOf` returns, largest first, folding the tail
// past topN into a single "Lainnya" row — an org with hundreds of departments
// would otherwise render an unreadable wall of bars.
function bucketCounts(rows, keyOf, t, topN = 7) {
  const unset = t('Tidak diisi', 'Not set')
  const counts = {}
  rows.forEach(r => {
    const k = keyOf(r) || unset
    counts[k] = (counts[k] || 0) + 1
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, topN)
  const rest = sorted.slice(topN).reduce((sum, [, v]) => sum + v, 0)
  if (rest > 0) top.push([t('Lainnya', 'Other'), rest])
  return top.map(([name, value]) => ({ name, value, color: '#2a78d6' }))
}

const barHeight = (data) => Math.max(140, data.length * 32)

/* ── HR: headcount by department, org-wide ───────────────────────────────────── */
function HRChartWidget({ employees, departments, t, type }) {
  // Legacy seed rows carry a plain `department` string; employees added since
  // only have `departmentId`, resolved against Struktur Organisasi.
  const data = bucketCounts(
    employees.filter(e => e.status === 'Active'),
    (e) => departments.find(d => d.id === e.departmentId)?.name || e.department,
    t,
  )
  return (
    <MiniChart type={type}
      icon={CHART_ICON(<><line x1='18' y1='20' x2='18' y2='10'/><line x1='12' y1='20' x2='12' y2='4'/><line x1='6' y1='20' x2='6' y2='14'/></>)}
      title={t('Grafik Headcount per Departemen', 'Headcount by Department')}
      data={data}
      emptyLabel={t('Belum ada data karyawan', 'No employee data yet')}
      height={barHeight(data)}
    />
  )
}

/* ── HR: employee demography ─────────────────────────────────────────────────── */
const IC_DEMOGRAPHY = <><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'/></>

function DemographyGenderWidget({ employees, t, type }) {
  const data = bucketCounts(employees.filter(e => e.status === 'Active'), (e) => e.gender, t)
  return (
    <MiniChart type={type}
      icon={CHART_ICON(IC_DEMOGRAPHY)}
      title={t('Demografi — Jenis Kelamin', 'Demography — Gender')}
      data={data}
      emptyLabel={t('Belum ada data karyawan', 'No employee data yet')}
      height={barHeight(data)}
    />
  )
}

function DemographyReligionWidget({ employees, t, type }) {
  const data = bucketCounts(employees.filter(e => e.status === 'Active'), (e) => e.religion, t)
  return (
    <MiniChart type={type}
      icon={CHART_ICON(IC_DEMOGRAPHY)}
      title={t('Demografi — Agama', 'Demography — Religion')}
      data={data}
      emptyLabel={t('Belum ada data karyawan', 'No employee data yet')}
      height={barHeight(data)}
    />
  )
}

// Age bands stay in their natural order (never sorted by size) — an ordered
// scale read out of sequence is misleading.
const AGE_BANDS = [
  { name: '< 25',  test: (a) => a < 25 },
  { name: '25–34', test: (a) => a >= 25 && a <= 34 },
  { name: '35–44', test: (a) => a >= 35 && a <= 44 },
  { name: '45–54', test: (a) => a >= 45 && a <= 54 },
  { name: '55+',   test: (a) => a >= 55 },
]

function ageOf(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 && age < 120 ? age : null
}

function DemographyAgeWidget({ employees, t, type }) {
  const active = employees.filter(e => e.status === 'Active')
  const ages = active.map(e => ageOf(e.birthDate))
  const data = AGE_BANDS.map(band => ({
    name: band.name,
    value: ages.filter(a => a != null && band.test(a)).length,
    color: '#2a78d6',
  }))
  const unknown = ages.filter(a => a == null).length
  if (unknown > 0) data.push({ name: t('Tidak diisi', 'Not set'), value: unknown, color: '#2a78d6' })
  return (
    <MiniChart type={type}
      icon={CHART_ICON(IC_DEMOGRAPHY)}
      title={t('Demografi — Usia', 'Demography — Age')}
      data={data}
      emptyLabel={t('Belum ada data karyawan', 'No employee data yet')}
      height={barHeight(data)}
    />
  )
}

function DemographyCompanyWidget({ employees, companies, t, type }) {
  // Label by the short company code (AG, AM, …) — the legal names are far too
  // long to sit in a chart's category axis.
  const data = bucketCounts(
    employees.filter(e => e.status === 'Active'),
    (e) => {
      const company = companies.find(co => co.id === e.companyId)
      return company ? (company.companyCode || company.name) : null
    },
    t,
  )
  return (
    <MiniChart type={type}
      icon={CHART_ICON(<><rect x='3' y='7' width='18' height='14' rx='2'/><path d='M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2'/><line x1='3' y1='13' x2='21' y2='13'/></>)}
      title={t('Demografi — Perusahaan', 'Demography — Company')}
      data={data}
      emptyLabel={t('Belum ada data karyawan', 'No employee data yet')}
      height={barHeight(data)}
    />
  )
}

/* ── Superadmin: user role distribution, system-wide ─────────────────────────── */
function SuperadminChartWidget({ userList, t, type }) {
  const ROLE_LABEL = {
    employee:   t('Employee', 'Employee'),
    manager:    t('Manager', 'Manager'),
    hr:         t('HR', 'HR'),
    superadmin: t('Superadmin', 'Superadmin'),
  }
  const ROLE_COLOR = { employee: '#2a78d6', manager: '#eb6834', hr: '#1baf7a', superadmin: '#e34948', other: '#898781' }
  const counts = { employee: 0, manager: 0, hr: 0, superadmin: 0, other: 0 }
  userList.forEach(u => { counts[ROLE_LABEL[u.role] ? u.role : 'other']++ })
  const data = [
    { name: ROLE_LABEL.employee,           value: counts.employee,   color: ROLE_COLOR.employee },
    { name: ROLE_LABEL.manager,            value: counts.manager,    color: ROLE_COLOR.manager },
    { name: ROLE_LABEL.hr,                 value: counts.hr,         color: ROLE_COLOR.hr },
    { name: ROLE_LABEL.superadmin,         value: counts.superadmin, color: ROLE_COLOR.superadmin },
    { name: t('Lainnya', 'Other'),         value: counts.other,      color: ROLE_COLOR.other },
  ].filter(d => d.value > 0)
  return (
    <MiniChart type={type}
      icon={CHART_ICON(<><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'/></>)}
      title={t('Grafik Distribusi Role Pengguna', 'User Role Distribution')}
      data={data}
      emptyLabel={t('Belum ada data pengguna', 'No user data yet')}
    />
  )
}

/* ── Task items ─────────────────────────────────────────────────────────────── */
function TaskItem({ icon, title, subtitle, badge, badgeColor, onClick }) {
  return (
    <button onClick={onClick}
      className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0'>
      <div className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-500'>
        {typeof icon === 'string' ? <Icon e={icon} size={18} /> : icon}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold text-gray-800 leading-snug'>{title}</p>
        {subtitle && <p className='text-xs text-gray-400 mt-0.5'>{subtitle}</p>}
      </div>
      {badge && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${badgeColor || 'bg-yellow-100 text-yellow-700'}`}>
          {badge}
        </span>
      )}
      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#d1d5db' strokeWidth='2'>
        <polyline points='9 18 15 12 9 6'/>
      </svg>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const t = useT()
  const router = useRouter()
  const { currentUser, userList } = useAuthStore()
  const { leaves, leaveTypes } = useLeaveStore()
  const { employees } = useEmployeeStore()
  const { departments, companies } = useStructureStore()
  // Select the stable array and filter in the render body — a selector that
  // filters would hand React a new array every call.
  const { announcements } = useAnnouncementStore()
  const { assignments, schedules, patterns, shifts } = useShiftStore()
  const { records: attendance, clockIn, clockOut } = useAttendanceStore()
  const { onboardings } = useOnboardingStore()
  const hayStore = useHayStore()
  const pipStore = usePipStore()
  const { pas } = usePersonnelActionStore()
  const { items: offChecklist } = useOffboardingChecklistStore()
  const { sends: offNotifySends } = useOffboardingNotifyStore()
  const { getPrefs, toggleShortcut } = useHomePreferencesStore()

  const [editMode, setEditMode] = useState(false)
  const [mainTab, setMainTab] = useState('todo')
  const [taskTab, setTaskTab] = useState('mytask')
  const [flowableTasks, setFlowableTasks] = useState([])

  useEffect(() => {
    if (!currentUser) return
    let isCancelled = false
    const username = currentUser.username || currentUser.nik || ''
    const userRole = currentUser.role || 'employee'

    // Superadmin melihat seluruh task approval Flowable, role manager/lainnya melihat task miliknya
    const url = userRole === 'superadmin'
      ? '/api/flowable/tasks?status=open'
      : (username ? `/api/flowable/tasks?candidateOrAssigned=${encodeURIComponent(username)}` : null)

    if (url) {
      fetch(url)
        .then(res => res.json())
        .then(json => {
          if (!isCancelled && json?.success && Array.isArray(json?.data?.data)) {
            setFlowableTasks(json.data.data)
          }
        })
        .catch(() => {})
    }
    return () => { isCancelled = true }
  }, [currentUser])

  const role = currentUser?.role || 'employee'
  const uid  = currentUser?.id
  const name = currentUser?.name || ''
  const prefs = getPrefs(uid)

  /* ── shortcuts ─────────────────────────────────────────────────────────── */
  const defaultShortcuts = ALL_SHORTCUTS[role] || ALL_SHORTCUTS.employee
  const hiddenIds = prefs.hiddenShortcutIds
  const visibleShortcuts = defaultShortcuts.filter(s => !hiddenIds.includes(s.id))

  /* ── pending tasks ──────────────────────────────────────────────────────── */
  const tasks = []

  // Leave pending approval (Flowable BPMN & MSS)
  if (role === 'manager' || role === 'hr' || role === 'superadmin') {
    const pendingLeaves = leaves.filter(l => {
      // Jika pengajuan sudah memiliki instance Flowable, akan ditangani oleh flowableTasks
      if (l.customData?.flowableProcessInstanceId) return false

      const ps = (l.steps || []).find(s => s.status === 'Pending')
      if (!ps) return false
      if (ps.delegatedTo === uid) return true
      const rid = l.userId
      const getDir = (id) => employees.find(e => e.id === id)?.managerId
      const getInd = (id) => getDir(getDir(id))
      if (ps.type === 'supervisor')   return getDir(rid) === uid
      if (ps.type === 'indirect_sup') return getInd(rid) === uid
      return role === 'hr' || role === 'superadmin'
    })
    pendingLeaves.forEach(l => tasks.push({
      id: `leave-${l.id}`, icon: '📅',
      title: t(`Persetujuan cuti: ${l.name}`, `Leave approval: ${l.name}`),
      subtitle: `${l.type} · ${l.start} → ${l.end}`,
      badge: t('Pending', 'Pending'),
      badgeColor: 'bg-amber-100 text-amber-800',
      href: '/mss/approve-leave',
    }))
  }

  // Onboarding pending approval — only for the user who can act on the current step
  if (role === 'hr' || role === 'superadmin' || role === 'manager') {
    const getDir = (id) => employees.find(e => e.id === id)?.managerId
    const getInd = (id) => getDir(getDir(id))
    // Mirrors canActOnStep() in /mss/approve-onboarding so the dashboard only
    // surfaces onboardings this user can actually approve/reject.
    const canActOnboarding = (step, ob) => {
      const rid = ob.employeeId
      switch (step.type) {
        case 'supervisor':        return getDir(rid) === uid
        case 'indirect_sup':      return getInd(rid) === uid
        case 'supervisor_pc53':
        case 'indirect_sup_pc53': return role === 'manager' || role === 'superadmin'
        case 'role':              return (step.roles ?? []).includes(role) || role === 'superadmin'
        case 'userlist':
        case 'employee':          return role === 'hr' || role === 'superadmin'
        default:                  return role === 'superadmin'
      }
    }
    onboardings.filter(o => {
      const ps = (o.steps || []).find(s => s.status === 'Pending')
      return ps && canActOnboarding(ps, o)
    }).forEach(o => tasks.push({
      id: `ob-${o.id}`, icon: '🎯',
      title: t(`Onboarding: ${o.employeeName}`, `Onboarding: ${o.employeeName}`),
      subtitle: o.department || '',
      badge: t('Pending', 'Pending'),
      href: '/mss/approve-onboarding',
    }))
  }

  // HAY sessions that need manager to fill
  if (role === 'manager' || role === 'superadmin') {
    hayStore.getByManager(uid).filter(h => h.status === 'Pending Manager').forEach(h => tasks.push({
      id: `hay-mgr-${h.id}`, icon: '🤝',
      title: t(`HAY: Isi jawaban untuk ${h.employeeName}`, `HAY: Fill answers for ${h.employeeName}`),
      subtitle: `T-G-R-O-W · ${h.date}`,
      badge: t('Perlu Diisi', 'Fill Now'),
      badgeColor: 'bg-blue-100 text-blue-700',
      href: '/mss/check-in',
    }))
  }

  // HAY sessions employee needs to fill (manager-created)
  hayStore.getByEmployee(uid).filter(h => h.status === 'Pending Employee').forEach(h => tasks.push({
    id: `hay-emp-${h.id}`, icon: '🤝',
    title: t(`HAY: Isi jawaban dari ${h.managerName}`, `HAY: Fill answers from ${h.managerName}`),
    subtitle: `T-G-R-O-W · ${h.date}`,
    badge: t('Perlu Diisi', 'Fill Now'),
    badgeColor: 'bg-blue-100 text-blue-700',
    href: '/ess/check-in',
  }))

  /*
  // PIP dinonaktifkan sementara sesuai instruksi pengguna
  pipStore.getByEmployee(uid).filter(p => p.status === 'Pending Acknowledgement').forEach(p => tasks.push({
    id: `pip-${p.id}`, icon: '📋',
    title: t(`PIP menunggu Anda terima & ketahui`, `PIP awaiting your acknowledgement`),
    subtitle: `${p.managerName} · ${p.startDate}`,
    badge: t('Pending', 'Pending'),
    href: '/ess/check-in',
  }))

  if (role === 'hr' || role === 'superadmin') {
    pipStore.sessions.filter(p => p.status === 'Pending HR Review').forEach(p => tasks.push({
      id: `pip-hr-${p.id}`, icon: '🛡️',
      title: t(`Review PIP: ${p.employeeName}`, `Review PIP: ${p.employeeName}`),
      subtitle: `${p.managerName} · ${p.startDate}`,
      badge: t('Review', 'Review'),
      href: '/hr/performance/pip',
    }))
  }
  */

  // Live Approval Cuti (Flowable BPMN)
  flowableTasks.forEach(ft => {
    const vars = {}
    ;(ft.variables || []).forEach(v => { vars[v.name] = v.value })
    const empName = vars.employeeName || vars.initiatorName || ft.description || 'Karyawan'
    const leaveType = vars.leaveType || 'Cuti'
    const duration = vars.durationDays ? `${vars.durationDays} hari` : ''
    const dates = vars.startDate ? `${vars.startDate}${vars.endDate ? ` → ${vars.endDate}` : ''}` : ''

    tasks.push({
      id: `flowable-${ft.id}`,
      icon: '🏖️',
      title: t(`Persetujuan Cuti: ${empName}`, `Leave Approval: ${empName}`),
      subtitle: [leaveType, duration, dates].filter(Boolean).join(' · ') || (ft.name || 'Tugas Approval Flowable'),
      badge: t('Review', 'Review'),
      badgeColor: 'bg-emerald-100 text-emerald-800',
      href: '/mss/approve-leave',
    })
  })

  // Offboarding — resignation approvals (HR), supervisor handover tasks, and
  // department notifications. Actionable items → My Task; decided requests I
  // submitted → FYI.
  const offItems = offboardingActionItems({
    currentUser, employees, pas,
    checklistItems: offChecklist, notifySends: offNotifySends,
  })
  const OFF_BADGE = {
    'hr-approval':      { badge: t('Approval', 'Approval'), color: 'bg-yellow-100 text-yellow-700' },
    'atasan-checklist': { badge: t('To Do', 'To Do'),       color: 'bg-red-100 text-red-700' },
    'hr-notify':        { badge: t('Notify', 'Notify'),     color: 'bg-blue-100 text-blue-700' },
  }
  offItems.filter(it => it.kind !== 'result').forEach(it => {
    const b = OFF_BADGE[it.kind] || OFF_BADGE['atasan-checklist']
    tasks.push({
      id: it.id, icon: it.icon,
      title: t(it.id_text, it.en_text),
      subtitle: t(it.id_sub, it.en_sub),
      badge: b.badge, badgeColor: b.color,
      href: it.href,
    })
  })

  // FYI items
  const fyiItems = []
  offItems.filter(it => it.kind === 'result').forEach(it => {
    fyiItems.push({
      id: it.id, icon: it.icon,
      title: t(it.id_text, it.en_text),
      subtitle: t(it.id_sub, it.en_sub),
      badge: it.icon === '❌' ? t('Ditolak', 'Rejected') : t('Disetujui', 'Approved'),
      badgeColor: it.icon === '❌' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
      href: it.href,
    })
  })
  leaves.filter(l => l.userId === uid && (l.status === 'Approved' || l.status === 'Rejected')).slice(0, 3).forEach(l => {
    fyiItems.push({
      id: `leave-fyi-${l.id}`, icon: l.status === 'Approved' ? '✅' : '❌',
      title: l.status === 'Approved'
        ? t(`Cuti "${l.type}" Anda disetujui`, `Your "${l.type}" leave was approved`)
        : t(`Cuti "${l.type}" Anda ditolak`, `Your "${l.type}" leave was rejected`),
      subtitle: `${l.start} → ${l.end}`,
      badge: l.status === 'Approved' ? t('Disetujui', 'Approved') : t('Ditolak', 'Rejected'),
      badgeColor: l.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
      href: '/ess/leave',
    })
  })

  // My Team tab
  const myTeam = employees.filter(e => e.managerId === uid && e.status === 'Active')

  const displayItems = taskTab === 'mytask' ? tasks : fyiItems

  /* ── Main-column sections, reorderable via Preferensi Beranda ────────── */
  const menuShortcutsBlock = prefs.showMenuShortcuts && (
        <div key='menuShortcuts' className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100'>
          <div className='flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100'>
            <div className='flex items-center gap-2 text-sm font-bold text-gray-700'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/>
                <rect x='3' y='14' width='7' height='7' rx='1'/><rect x='14' y='14' width='7' height='7' rx='1'/>
              </svg>
              Menu
            </div>
            <button
              onClick={() => setEditMode(e => !e)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${editMode ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z'/>
              </svg>
              {editMode ? t('Selesai', 'Done') : t('Edit', 'Edit')}
            </button>
          </div>

          <div className='px-5 py-4'>
            <div className='grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3'>
              {(editMode ? defaultShortcuts : visibleShortcuts).map(s => {
                const hidden = hiddenIds.includes(s.id)
                return (
                  <div key={s.id} className='relative'>
                    <button
                      onClick={() => !editMode && router.push(s.href)}
                      className={`w-full flex flex-col items-center gap-2 p-2 rounded-xl transition group ${
                        editMode ? 'cursor-default' : 'hover:bg-teal-50/70'
                      } ${hidden ? 'opacity-40' : ''}`}>
                      <div className='w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100 text-gray-500 ring-1 ring-gray-200/60 group-hover:bg-[#039299] group-hover:text-white group-hover:ring-[#039299] transition-colors'>
                        {SICONS[s.icon]}
                      </div>
                      <span className='text-[11px] text-center text-gray-600 leading-tight group-hover:text-teal-900 transition-colors'>{s.label}</span>
                    </button>
                    {editMode && (
                      <button
                        onClick={() => toggleShortcut(uid, s.id)}
                        className='absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow transition'
                        style={{ background: hidden ? '#059669' : '#dc2626' }}>
                        {hidden ? '+' : '−'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {editMode && (
              <p className='text-xs text-gray-400 mt-3 text-center'>
                {t('Klik − untuk sembunyikan, + untuk tampilkan kembali', 'Click − to hide, + to show again')}
              </p>
            )}
          </div>
        </div>
      )

  const thingsToDoBlock = prefs.showThingsToDo && (
        <div key='thingsToDo' className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
          {/* Main tabs */}
          <div className='flex border-b border-gray-100'>
            {[
              ['todo', t('Things To Do', 'Things To Do')],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setMainTab(key)}
                className={`px-5 py-3.5 text-sm font-semibold transition relative ${
                  mainTab === key ? 'text-[#052B52]' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {label}
                {mainTab === key && (
                  <span className='absolute bottom-0 left-4 right-4 h-0.5 rounded-full' style={{ background: 'linear-gradient(90deg,#052B52,#039299)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Things To Do content */}
          {mainTab === 'todo' && (
            <>
              {/* Sub-tabs */}
              <div className='flex gap-2 px-5 pt-3 pb-2'>
                {[
                  ['mytask', t('My Task', 'My Task'), tasks.length],
                  ['fyi',    'FYI',                   fyiItems.length],
                ].map(([key, label, count]) => (
                  <button key={key} onClick={() => setTaskTab(key)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                      taskTab === key
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={taskTab === key ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
                    {label}{count > 0 ? ` (${count})` : ''}
                  </button>
                ))}
              </div>

              {displayItems.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-16 text-gray-400 gap-3'>
                  <svg width='80' height='80' viewBox='0 0 80 80' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <rect x='10' y='14' width='60' height='52' rx='4' fill='#f3f4f6'/>
                    <rect x='18' y='28' width='44' height='4' rx='2' fill='#e5e7eb'/>
                    <rect x='18' y='38' width='32' height='4' rx='2' fill='#e5e7eb'/>
                    <rect x='18' y='48' width='38' height='4' rx='2' fill='#e5e7eb'/>
                    <circle cx='56' cy='52' r='16' fill='#eff6ff'/>
                    <circle cx='56' cy='52' r='10' fill='none' stroke='#93c5fd' strokeWidth='3'/>
                    <line x1='63' y1='59' x2='68' y2='64' stroke='#93c5fd' strokeWidth='3' strokeLinecap='round'/>
                  </svg>
                  <p className='text-sm font-medium'>
                    {taskTab === 'mytask'
                      ? t('There are no tasks waiting for your action', 'There are no tasks waiting for your action')
                      : t('Tidak ada informasi terbaru', 'No recent information')}
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-gray-50'>
                  {displayItems.map(item => (
                    <TaskItem key={item.id}
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      badge={item.badge}
                      badgeColor={item.badgeColor}
                      onClick={() => item.href && router.push(item.href)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      )

  /* ── The four role dashboards ─────────────────────────────────────────── */
  // One node per widget key, so a dashboard's contents come straight from the
  // shared DASHBOARDS definition rather than being spelled out twice.
  // Bar unless the user picked otherwise for that specific chart.
  const chartType = (key) => prefs.chartType[key] || CHART_TYPE_DEFAULT

  const liveAnnouncements = announcements
    .filter(a => isLive(a))
    .sort((a, b) => (b.pinned - a.pinned) || String(b.createdAt).localeCompare(String(a.createdAt)))

  // Mandatory section — no show/hide pref, only an order. Skipped entirely
  // when nothing is live, so an empty box never sits on the page.
  const announcementBlock = liveAnnouncements.length > 0 && (
    <AnnouncementWidget key='announcement' announcements={liveAnnouncements} t={t} />
  )

  const attDate = todayStr()
  const mySched = uid ? shiftFor(uid, attDate, { assignments, schedules, patterns, shifts }) : null
  const myAttendance = attendance.find(r => r.userId === uid && r.date === attDate) || null

  const handleClockIn = () => {
    const d = new Date()
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const late = mySched ? gradeTime(time, mySched.shift.startTime, 'in').deviation > 0 : false
    clockIn(uid, name, time, { date: attDate, status: late ? 'Late' : 'Present' })
  }
  const handleClockOut = () => {
    const d = new Date()
    clockOut(uid, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, { date: attDate })
  }

  const WIDGET_NODE = {
    leaveBalance:   <LeaveBalanceWidget key='leaveBalance' leaves={leaves} leaveTypes={leaveTypes} userId={uid} t={t} />,
    leaveChart:     <EmployeeChartWidget key='leaveChart' leaves={leaves} leaveTypes={leaveTypes} userId={uid} t={t} type={chartType('leaveChart')} />,
    teamLeaveChart: <ManagerChartWidget key='teamLeaveChart' leaves={leaves} team={myTeam} t={t} type={chartType('teamLeaveChart')} />,
    headcountChart:     <HRChartWidget key='headcountChart' employees={employees} departments={departments} t={t} type={chartType('headcountChart')} />,
    demographyGender:   <DemographyGenderWidget key='demographyGender' employees={employees} t={t} type={chartType('demographyGender')} />,
    demographyReligion: <DemographyReligionWidget key='demographyReligion' employees={employees} t={t} type={chartType('demographyReligion')} />,
    demographyAge:      <DemographyAgeWidget key='demographyAge' employees={employees} t={t} type={chartType('demographyAge')} />,
    demographyCompany:  <DemographyCompanyWidget key='demographyCompany' employees={employees} companies={companies} t={t} type={chartType('demographyCompany')} />,
    userRoleChart:  <SuperadminChartWidget key='userRoleChart' userList={userList} t={t} type={chartType('userRoleChart')} />,
  }

  const myDashboards = accessibleDashboards({
    role,
    hasDirectReports: myTeam.length > 0,
  })

  const dashboardSections = myDashboards.map(d => {
    const widgets = d.widgets
      .filter(w => prefs.widgets[w.key])
      .sort((a, b) => prefs.widgetOrder[a.key] - prefs.widgetOrder[b.key])
    if (!prefs[d.showKey] || widgets.length === 0) return { key: d.id, node: null }
    return {
      key: d.id,
      order: prefs.order[d.orderKey],
      node: (
        <section key={d.id}>
          <h2 className='text-sm font-bold text-gray-700 mb-2.5'>{t(d.label[0], d.label[1])}</h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
            {widgets.map(w => WIDGET_NODE[w.key])}
          </div>
        </section>
      ),
    }
  })

  // Sections stack in one column, ordered by "Urutan" from Preferensi Beranda —
  // smallest number shows up top.
  const mainSections = [
    { key: 'announcement',  order: prefs.order.announcement,  node: announcementBlock },
    { key: 'menuShortcuts', order: prefs.order.menuShortcuts, node: menuShortcutsBlock },
    { key: 'thingsToDo',    order: prefs.order.thingsToDo,    node: thingsToDoBlock },
    ...dashboardSections,
  ].filter(s => s.node).sort((a, b) => a.order - b.order)

  return (
    <div className='space-y-5'>

      {/* Greeting + My Time Card — the time card is pinned here (not part of
          the reorderable/hideable ESS Dashboard widgets below) so clock
          in/out is always the first thing visible on login, for both
          starting and ending the day. */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-[#052B52]'>
            {getGreeting(t)},
          </h1>
          <p className='text-xl font-semibold text-gray-800 mt-0.5'>{name}</p>
          <p className='text-sm text-gray-400 mt-0.5'>
            {new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        {uid && (
          <div className='w-full sm:w-80 flex-shrink-0'>
            <TimeCardWidget t={t} userId={uid} userName={name}
              sched={mySched} record={myAttendance} router={router}
              onClockIn={handleClockIn} onClockOut={handleClockOut} />
          </div>
        )}
      </div>

      {mainSections.map(s => s.node)}
    </div>
  )
}
