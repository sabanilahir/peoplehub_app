'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useShiftStore } from '@/store/shiftStore'
import { useAttendanceStore, todayStr } from '@/store/attendanceStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, ActionButton, StatusBadge, EmptyState,
} from '@/components/ui'
import { shiftFor, gradeTime, TONE_CLASS, toneLabel, GRACE_MINUTES } from '@/lib/workSchedule'

const nowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** A clock time coloured by how far it sits from the schedule. */
function ClockValue({ time, scheduled, kind, size = 'text-3xl', t }) {
  if (!time || time === '-') return <span className={`${size} font-bold font-mono text-gray-300`}>--:--</span>
  const { deviation, tone } = gradeTime(time, scheduled, kind)
  return (
    <span className='inline-flex flex-col items-center'>
      <span className={`${size} font-bold font-mono ${TONE_CLASS[tone]}`}>{time}</span>
      {tone !== 'none' && (
        <span className={`text-[11px] font-semibold ${TONE_CLASS[tone]}`}>
          {toneLabel(tone, kind, deviation, t)}
        </span>
      )}
    </span>
  )
}

export default function ClockInOutPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { assignments, schedules, patterns, shifts } = useShiftStore()
  const { records, clockIn, clockOut } = useAttendanceStore()

  const [now, setNow] = useState(null)   // null until mounted — the server has
  useEffect(() => {                      // no clock, so rendering one would
    setNow(new Date())                   // mismatch on hydration
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const uid = currentUser?.id
  const date = todayStr()
  const sched = uid ? shiftFor(uid, date, { assignments, schedules, patterns, shifts }) : null
  const today = records.find(r => r.userId === uid && r.date === date) || null

  const hasIn = today?.checkIn && today.checkIn !== '-'
  const hasOut = today?.checkOut && today.checkOut !== '-'

  const doClockIn = () => {
    const time = nowHHMM()
    const late = sched ? gradeTime(time, sched.shift.startTime, 'in').deviation > 0 : false
    clockIn(uid, currentUser?.name || '', time, { date, status: late ? 'Late' : 'Present' })
  }

  const mine = [...new Map(
  records
    .filter(r => r.userId === uid)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(r => [`${r.userId}-${r.date}`, r])
).values()].slice(0, 14)

  const dateLabel = now
    ? now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div>
      <PageHeader
        icon='⏱️'
        title='Clock In/Out'
        subtitle={t(
          'Catat jam masuk dan pulang kamu secara online.',
          'Record your start and end of day online.',
        )}
      />

      <SectionCard className='mb-6'>
        <div className='flex flex-col items-center gap-1 py-2'>
          <p className='text-sm text-gray-400'>{dateLabel}</p>
          <p className='text-5xl font-bold font-mono tracking-tight text-gray-900'>
            {now ? now.toLocaleTimeString('id-ID', { hour12: false }) : '--:--:--'}
          </p>
          {sched ? (
            <p className='mt-1 text-sm text-gray-500'>
              {t('Jadwal', 'Schedule')}: <span className='font-semibold text-gray-700'>{sched.shift.name}</span>
              {' · '}{sched.shift.startTime}–{sched.shift.endTime}
              <span className='text-gray-400'> ({sched.scheduleName})</span>
            </p>
          ) : (
            <p className='mt-1 text-sm text-amber-600'>
              {t('Tidak ada jadwal kerja hari ini — jam kamu tidak dinilai terlambat/pulang cepat.',
                 'No work schedule today — your times are not graded.')}
            </p>
          )}
        </div>

        <div className='mt-4 grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 pt-5'>
          <div className='flex flex-col items-center gap-3 px-4'>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
              {t('Jam Masuk', 'Clock In')}
            </span>
            <ClockValue time={today?.checkIn} scheduled={sched?.shift.startTime} kind='in' t={t} />
            <ActionButton onClick={doClockIn} disabled={!!hasIn || !uid} icon='🟢'>
              {hasIn ? t('Sudah Clock In', 'Clocked In') : 'Clock In'}
            </ActionButton>
          </div>
          <div className='flex flex-col items-center gap-3 px-4'>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
              {t('Jam Pulang', 'Clock Out')}
            </span>
            <ClockValue time={today?.checkOut} scheduled={sched?.shift.endTime} kind='out' t={t} />
            <ActionButton
              variant='secondary'
              onClick={() => clockOut(uid, nowHHMM(), { date })}
              disabled={!hasIn || !!hasOut}
              icon='🔴'>
              {hasOut ? t('Sudah Clock Out', 'Clocked Out') : 'Clock Out'}
            </ActionButton>
          </div>
        </div>

        <p className='mt-5 border-t border-gray-100 pt-3 text-center text-xs text-gray-400'>
          <span className='font-semibold text-emerald-600'>{t('Hijau', 'Green')}</span> {t('tepat waktu', 'on time')}
          {' · '}
          <span className='font-semibold text-amber-600'>{t('Kuning', 'Amber')}</span>{' '}
          {t(`telat/pulang cepat < ${GRACE_MINUTES} menit`, `< ${GRACE_MINUTES} min late/early`)}
          {' · '}
          <span className='font-semibold text-red-600'>{t('Merah', 'Red')}</span>{' '}
          {t(`≥ ${GRACE_MINUTES} menit`, `≥ ${GRACE_MINUTES} min`)}
        </p>
      </SectionCard>

      <SectionCard
        icon='📋'
        title={t('Riwayat 14 Hari Terakhir', 'Last 14 Days')}
        subtitle={t('Warna mengikuti jadwal kerja pada tanggal tersebut.', 'Colours follow the schedule for that date.')}
        bodyClass='p-0'
      >
        {mine.length === 0 ? (
          <EmptyState icon='⏱️' title={t('Belum ada catatan', 'No records yet')}
            description={t('Clock In pertama kamu akan muncul di sini.', 'Your first clock-in will show up here.')} />
        ) : (
          <DataTable columns={[
            { label: t('Tanggal', 'Date') },
            { label: t('Jadwal', 'Schedule') },
            { label: t('Masuk', 'In'), align: 'center' },
            { label: t('Pulang', 'Out'), align: 'center' },
            { label: 'Status', align: 'center' },
          ]}>
            {mine.map(r => {
              const s = shiftFor(uid, r.date, { assignments, schedules, patterns, shifts })
              const gin = gradeTime(r.checkIn, s?.shift.startTime, 'in')
              const gout = gradeTime(r.checkOut, s?.shift.endTime, 'out')
              return (
                <Tr key={`${r.userId}-${r.date}`}>
                  <Td className='tabular-nums'>{r.date}</Td>
                  <Td className='text-xs text-gray-500'>
                    {s ? `${s.shift.name} · ${s.shift.startTime}–${s.shift.endTime}` : t('Libur', 'Day off')}
                  </Td>
                  <Td align='center' className={`font-mono font-semibold tabular-nums ${TONE_CLASS[gin.tone]}`}>
                    {r.checkIn || '-'}
                  </Td>
                  <Td align='center' className={`font-mono font-semibold tabular-nums ${TONE_CLASS[gout.tone]}`}>
                    {r.checkOut || '-'}
                  </Td>
                  <Td align='center'>
                    <StatusBadge tone={r.status === 'Present' ? 'success' : r.status === 'Late' ? 'warning' : 'danger'}>
                      {r.status}
                    </StatusBadge>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>
    </div>
  )
}
