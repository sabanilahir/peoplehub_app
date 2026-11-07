'use client'
import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useShiftStore } from '@/store/shiftStore'
import { useAttendanceStore } from '@/store/attendanceStore'
import { useLeaveStore } from '@/store/leaveStore'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, ActionButton, DataTable, Tr, Td } from '@/components/ui'
import { shiftFor, gradeTime, toMinutes, TONE_CLASS, localDateStr as dateStr } from '@/lib/workSchedule'

const pad2 = (n) => String(n).padStart(2, '0')

// Bucket a leave's type into the three stat categories the summary reports —
// mirrors how most Indonesian HR systems (Talenta, etc.) split "Sakit" and
// "Tahunan" out from everything else.
const leaveBucket = (typeName) => {
  const s = String(typeName || '')
  if (/sakit/i.test(s)) return 'sick'
  if (/tahunan/i.test(s)) return 'leave'
  return 'other'
}

// Cell-level category → border/background, independent of the per-value time
// colour (which stays the existing green/amber/red grading).
const CELL_STYLE = {
  off:        { border: 'border-red-200',    bg: 'bg-red-50/60',    label: 'text-red-500' },
  leave:      { border: 'border-red-200',    bg: 'bg-red-50/60',    label: 'text-red-500' },
  scheduled:  { border: 'border-blue-100',   bg: 'bg-white',        label: 'text-gray-400' },
  attend:     { border: 'border-emerald-200',bg: 'bg-emerald-50/40',label: 'text-emerald-600' },
  late:       { border: 'border-amber-200',  bg: 'bg-amber-50/50',  label: 'text-amber-600' },
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = startDow; i > 0; i--) cells.push({ date: new Date(year, month, 1 - i), inMonth: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), inMonth: true })
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
  }
  return cells
}

function classifyDay(date, { userId, chain, records, leaves, t }) {
  const ds = dateStr(date)
  const sched = shiftFor(userId, ds, chain)
  const leave = leaves.find(l => l.userId === userId && l.status === 'Approved' && l.start <= ds && ds <= l.end)
  const record = records.find(r => r.userId === userId && r.date === ds)

  if (leave) {
    return { ds, sched, leave, record: null, category: 'leave', gin: null, gout: null }
  }
  if (!sched) {
    return { ds, sched: null, leave: null, record: null, category: 'off', gin: null, gout: null }
  }
  const hasIn = record?.checkIn && record.checkIn !== '-'
  const hasOut = record?.checkOut && record.checkOut !== '-'
  if (!hasIn) {
    return { ds, sched, leave: null, record, category: 'scheduled', gin: null, gout: null }
  }
  const gin = gradeTime(record.checkIn, sched.shift.startTime, 'in')
  const gout = hasOut ? gradeTime(record.checkOut, sched.shift.endTime, 'out') : null
  const category = (gin.tone !== 'ok' || (gout && gout.tone !== 'ok')) ? 'late' : 'attend'
  return { ds, sched, leave: null, record, category, gin, gout }
}

const durationOf = (record) => {
  if (!record?.checkIn || record.checkIn === '-' || !record?.checkOut || record.checkOut === '-') return null
  let mins = toMinutes(record.checkOut) - toMinutes(record.checkIn)
  if (mins < 0) mins += 1440
  return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`
}

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const downloadCsv = (rows, filename) => {
  const blob = new Blob(['﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function MyCalendarPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { assignments, schedules, patterns, shifts } = useShiftStore()
  const { records } = useAttendanceStore()
  const { leaves } = useLeaveStore()

  const uid = currentUser?.id
  const chain = { assignments, schedules, patterns, shifts }

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())   // 0-11
  const [view, setView] = useState('calendar')          // 'calendar' | 'list'

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])

  const days = useMemo(
    () => cells.map(c => ({ ...c, info: classifyDay(c.date, { userId: uid, chain, records, leaves, t }) })),
    [cells, uid, assignments, schedules, patterns, shifts, records, leaves],
  )

  const summary = useMemo(() => {
    const s = { workDay: 0, attendance: 0, leave: 0, sick: 0, other: 0, noAttendance: 0 }
    days.filter(d => d.inMonth).forEach(({ info }) => {
      if (info.category === 'leave') {
        s[leaveBucket(info.leave.type)]++
        s.workDay++
        return
      }
      if (!info.sched) return   // day off — not a work day at all
      s.workDay++
      if (info.record?.checkIn && info.record.checkIn !== '-') s.attendance++
      else s.noAttendance++
    })
    return s
  }, [days])

  const WEEKDAYS = [
    t('Minggu', 'Sunday'), t('Senin', 'Monday'), t('Selasa', 'Tuesday'), t('Rabu', 'Wednesday'),
    t('Kamis', 'Thursday'), t('Jumat', 'Friday'), t('Sabtu', 'Sabtu'),
  ]

  const exportSummary = () => downloadCsv(
    [
      [t('Ringkasan', 'Summary'), monthLabel],
      [t('Hari Kerja', 'Work Day'), summary.workDay],
      [t('Hadir', 'Attendance'), summary.attendance],
      [t('Cuti', 'Leave'), summary.leave],
      [t('Sakit', 'Sick'), summary.sick],
      [t('Cuti Lainnya', 'Other Leave'), summary.other],
      [t('Tidak Hadir', 'No Attendance'), summary.noAttendance],
    ],
    `Ringkasan-Kehadiran-${year}-${pad2(month + 1)}.csv`,
  )

  const exportDetail = () => downloadCsv(
    [
      [t('Tanggal', 'Date'), t('Hari', 'Day'), t('Jadwal', 'Shift'), t('Masuk', 'Clock In'),
       t('Pulang', 'Clock Out'), t('Durasi', 'Duration'), t('Keterangan', 'Note')],
      ...days.filter(d => d.inMonth).map(({ date, info }) => [
        dateStr(date), WEEKDAYS[date.getDay()],
        info.sched ? `${info.sched.shift.startTime}-${info.sched.shift.endTime}` : '-',
        info.record?.checkIn && info.record.checkIn !== '-' ? info.record.checkIn : '-',
        info.record?.checkOut && info.record.checkOut !== '-' ? info.record.checkOut : '-',
        durationOf(info.record) || '-',
        info.category === 'leave' ? info.leave.type
          : info.category === 'off' ? t('Non Working Day', 'Non Working Day')
          : info.category === 'scheduled' ? t('Belum Absen', 'No Attendance')
          : info.category === 'late' ? t('Terlambat/Pulang Cepat', 'Late In/Early Out')
          : t('Hadir', 'On Time'),
      ]),
    ],
    `Detail-Kehadiran-${year}-${pad2(month + 1)}.csv`,
  )

  return (
    <div>
      <PageHeader
        icon='📅'
        title={t('My Calendar', 'My Calendar')}
        subtitle={t('Kalender kehadiran bulanan kamu, berdasarkan jadwal kerja.', "Your monthly attendance calendar, against your work schedule.")}
      />

      <SectionCard className='mb-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='mb-3 text-sm font-bold text-gray-800'>{t('Ringkasan', 'Summary')}</p>
            <div className='flex flex-wrap gap-x-10 gap-y-3'>
              {[
                [t('Hari Kerja', 'Work Day'), summary.workDay],
                [t('Hadir', 'Attendance'), summary.attendance],
                [t('Cuti', 'Leave'), summary.leave],
                [t('Sakit', 'Sick'), summary.sick],
                [t('Tidak Hadir', 'No Attendance'), summary.noAttendance],
                [t('Cuti Lainnya', 'Other Leave'), summary.other],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className='text-xs text-gray-400'>{label}</p>
                  <p className='text-xl font-bold text-gray-900'>{val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className='flex shrink-0 gap-2'>
            <ActionButton variant='secondary' size='sm' icon='⬇️' onClick={exportSummary}>
              {t('Export Ringkasan', 'Export Summary')}
            </ActionButton>
            <ActionButton variant='secondary' size='sm' icon='⬇️' onClick={exportDetail}>
              {t('Export Detail', 'Export Detail')}
            </ActionButton>
          </div>
        </div>
      </SectionCard>

      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <button onClick={() => shiftMonth(-1)}
            className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50'>‹</button>
          <span className='min-w-[160px] text-center text-base font-bold capitalize text-gray-800'>{monthLabel}</span>
          <button onClick={() => shiftMonth(1)}
            className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50'>›</button>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            className='ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50'>
            {t('Hari Ini', 'Today')}
          </button>
        </div>

        <div className='flex items-center gap-4'>
          <div className='flex flex-wrap items-center gap-3 text-xs text-gray-500'>
            <span className='flex items-center gap-1.5'>
              <span className='h-3 w-3 rounded border border-blue-200 bg-white' /> {t('Terjadwal', 'Shift')}
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='h-3 w-3 rounded border border-emerald-300 bg-emerald-50' /> {t('Hadir', 'Attend Day')}
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='h-3 w-3 rounded border border-amber-300 bg-amber-50' /> {t('Telat/Cepat', 'Late In, Early Out')}
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='h-3 w-3 rounded border border-red-300 bg-red-50' /> {t('Libur/Cuti', 'Non Working Day, Leave')}
            </span>
          </div>
          <div className='flex overflow-hidden rounded-lg border border-gray-200'>
            <button onClick={() => setView('calendar')}
              className={`px-2.5 py-1.5 text-sm ${view === 'calendar' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={view === 'calendar' ? { background: '#052B52' } : undefined}>▦</button>
            <button onClick={() => setView('list')}
              className={`border-l border-gray-200 px-2.5 py-1.5 text-sm ${view === 'list' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={view === 'list' ? { background: '#052B52' } : undefined}>☰</button>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
          <div className='grid grid-cols-7 border-b border-gray-100 bg-gray-50/80'>
            {WEEKDAYS.map(d => (
              <div key={d} className='px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500'>{d}</div>
            ))}
          </div>
          <div className='grid grid-cols-7'>
            {days.map(({ date, inMonth, info }, i) => {
              const style = CELL_STYLE[info.category]
              const isToday = dateStr(date) === dateStr(now)
              return (
                <div key={i}
                  className={`min-h-[112px] border-b border-r border-gray-100 p-2 ${inMonth ? style.bg : 'bg-gray-50/40'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  <div className='mb-1 flex items-center justify-between'>
                    <span className={`text-sm font-semibold ${inMonth ? 'text-gray-700' : 'text-gray-300'} ${isToday ? 'flex h-5 w-5 items-center justify-center rounded-full text-white' : ''}`}
                      style={isToday ? { background: '#052B52' } : undefined}>
                      {date.getDate()}
                    </span>
                  </div>

                  {!inMonth ? null : info.category === 'off' ? (
                    <p className={`text-[11px] font-semibold ${style.label}`}>{t('Non Working Day', 'Non Working Day')}</p>
                  ) : info.category === 'leave' ? (
                    <p className={`text-[11px] font-semibold ${style.label}`}>{info.leave.type}</p>
                  ) : (
                    <div className='space-y-1'>
                      <p className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium text-gray-500 ${style.border}`}>
                        {info.sched.shift.startTime} - {info.sched.shift.endTime}
                      </p>
                      {info.record?.checkIn && info.record.checkIn !== '-' && (
                        <div className='text-[11px] leading-tight text-gray-500'>
                          <p>{t('Masuk', 'In')}: <span className={`font-mono font-semibold ${TONE_CLASS[info.gin?.tone || 'none']}`}>{info.record.checkIn}</span></p>
                          {info.record.checkOut && info.record.checkOut !== '-' && (
                            <>
                              <p>{t('Pulang', 'Out')}: <span className={`font-mono font-semibold ${TONE_CLASS[info.gout?.tone || 'none']}`}>{info.record.checkOut}</span></p>
                              <p className='text-gray-400'>{t('Durasi', 'Dur')}: <span className='font-mono'>{durationOf(info.record)}</span></p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <DataTable columns={[
          t('Tanggal', 'Date'), t('Jadwal', 'Shift'),
          { label: t('Masuk', 'In'), align: 'center' }, { label: t('Pulang', 'Out'), align: 'center' },
          { label: t('Durasi', 'Duration'), align: 'center' }, t('Keterangan', 'Note'),
        ]}>
          {days.filter(d => d.inMonth).map(({ date, info }) => (
            <Tr key={dateStr(date)}>
              <Td className='font-medium text-gray-800'>{dateStr(date)} · {WEEKDAYS[date.getDay()].slice(0, 3)}</Td>
              <Td className='text-xs text-gray-500'>{info.sched ? `${info.sched.shift.startTime}–${info.sched.shift.endTime}` : '—'}</Td>
              <Td align='center' className={`font-mono font-semibold ${TONE_CLASS[info.gin?.tone || 'none']}`}>
                {info.record?.checkIn && info.record.checkIn !== '-' ? info.record.checkIn : '—'}
              </Td>
              <Td align='center' className={`font-mono font-semibold ${TONE_CLASS[info.gout?.tone || 'none']}`}>
                {info.record?.checkOut && info.record.checkOut !== '-' ? info.record.checkOut : '—'}
              </Td>
              <Td align='center' className='font-mono text-gray-500'>{durationOf(info.record) || '—'}</Td>
              <Td className={CELL_STYLE[info.category].label}>
                {info.category === 'leave' ? info.leave.type
                  : info.category === 'off' ? t('Non Working Day', 'Non Working Day')
                  : info.category === 'scheduled' ? t('Belum Absen', 'No Attendance')
                  : info.category === 'late' ? t('Terlambat/Pulang Cepat', 'Late/Early')
                  : t('Hadir', 'On Time')}
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}
