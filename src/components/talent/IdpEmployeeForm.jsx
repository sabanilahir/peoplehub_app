'use client'
import { useState } from 'react'
import { IDP_OPTIONS, idpGap, idpCompetencyStatus, idpOption } from '@/store/idpStore'
import { LEVEL_LABELS } from '@/store/competencyStore'
import IdpTypeDetail from '@/components/talent/IdpTypeDetail'
import Icon from '@/components/ui/Icon'

// Kategori kompetensi → tab.
const SOFT_CATEGORIES = ['Leadership', 'Core', 'Behavioral']
const TABS = [
  { key: 'soft',      label: 'Soft Competencies' },
  { key: 'technical', label: 'Functional Technical Competencies' },
]

// ── Rating bintang (read-only) ────────────────────────────────────────────────
function Stars({ level = 0 }) {
  const n = Number(level) || 0
  return (
    <div className='flex items-center gap-0.5' aria-label={`Level ${n} dari 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox='0 0 20 20' className={`h-4 w-4 ${i <= n ? 'text-amber-400' : 'text-gray-200'}`} fill='currentColor'>
          <path d='M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.98l-5.2 2.74.99-5.8L1.58 7.62l5.82-.85z' />
        </svg>
      ))}
    </div>
  )
}

// ── Ikon info kecil ───────────────────────────────────────────────────────────
function InfoDot({ title }) {
  return (
    <span title={title} className='inline-flex flex-shrink-0 cursor-help text-gray-300 transition hover:text-gray-500'>
      <Icon name='info' size={14} />
    </span>
  )
}

const statusTextClass = { danger: 'text-red-600', success: 'text-emerald-600', warning: 'text-amber-600' }

// ── Baris kompetensi ──────────────────────────────────────────────────────────
function CompetencyRow({ comp, readOnly, onChangeIdp }) {
  const required = Number(comp.expected) || 0
  const actual = Number(comp.current) || 0
  const gap = idpGap(required, actual)
  const status = idpCompetencyStatus(gap)
  const needsIdp = gap < 0

  return (
    <tr className='border-t border-gray-100'>
      {/* Competency */}
      <td className='px-4 py-4 align-top'>
        <div className='flex items-center gap-1.5'>
          <span className='text-sm font-semibold text-gray-800'>{comp.name}</span>
          <InfoDot title={comp.description} />
        </div>
        {comp.description && <p className='mt-1 max-w-xs text-xs leading-snug text-gray-400'>{comp.description}</p>}
      </td>

      {/* Required (JCP) */}
      <td className='px-4 py-4 align-top'>
        <div className='text-sm font-bold text-gray-800'>Lv. {required}</div>
        <Stars level={required} />
      </td>

      {/* Actual (Self Assessment) */}
      <td className='px-4 py-4 align-top'>
        <div className='text-sm font-bold text-gray-800'>Lv. {actual}</div>
        <Stars level={actual} />
      </td>

      {/* Gap */}
      <td className='px-4 py-4 align-top'>
        {gap < 0
          ? <span className='inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-sm font-bold text-red-600'>{gap}</span>
          : <span className='text-sm font-bold text-gray-500'>{gap > 0 ? `+${gap}` : 0}</span>}
      </td>

      {/* Status */}
      <td className={`px-4 py-4 align-top text-sm font-semibold ${statusTextClass[status.tone] || 'text-gray-600'}`}>
        {status.label}
      </td>

      {/* IDP (Optional) */}
      <td className='px-4 py-4 align-top'>
        {needsIdp ? (
          <select
            value={comp.idp || ''}
            disabled={readOnly}
            onChange={e => onChangeIdp(comp.id, e.target.value)}
            className='w-full min-w-[170px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-gray-50 disabled:text-gray-400'
          >
            <option value=''>Pilih IDP</option>
            {IDP_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <div className='w-full min-w-[170px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400'>
            Tidak Wajib IDP
          </div>
        )}
      </td>
    </tr>
  )
}

export default function IdpEmployeeForm({
  employeeName, managerName, hrTalentName,
  competencies = [],
  learningAspiration = '', careerAspiration = '',
  readOnly = false,
  reviewer, people = [],
  onChangeIdp, onChangeDetail, onChangeAspiration, onSubmit,
}) {
  const [tab, setTab] = useState('soft')
  const [showHelp, setShowHelp] = useState(false)

  const isSoft = c => SOFT_CATEGORIES.includes(c.category)
  const rows = competencies.filter(c => (tab === 'soft' ? isSoft(c) : !isSoft(c)))

  const cap = (s, max) => (s || '').slice(0, max)

  return (
    <div className='space-y-5'>
      {/* ── Header POV ─────────────────────────────────────────────────────── */}
      <div className='relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6'>
        <span className='absolute inset-y-0 left-0 w-1.5' style={{ background: 'linear-gradient(180deg,#052B52,#039299)' }} />
        <div className='flex flex-col gap-4 pl-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100'>
              POV: Karyawan ({employeeName})
            </span>
            <h1 className='text-xl font-bold tracking-tight text-gray-900'>Modul Individual Development Plan (IDP)</h1>
          </div>
          <div className='flex flex-wrap gap-x-8 gap-y-1 text-sm'>
            <div><span className='text-gray-400'>Karyawan: </span><span className='font-semibold text-gray-800'>{employeeName}</span></div>
            <div><span className='text-gray-400'>Atasan Langsung: </span><span className='font-semibold text-gray-800'>{managerName}</span></div>
            <div><span className='text-gray-400'>HR Talent: </span><span className='font-semibold text-gray-800'>{hrTalentName}</span></div>
          </div>
        </div>
      </div>

      {/* ── Tabs + How It Works ────────────────────────────────────────────── */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex gap-2'>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowHelp(v => !v)}
          className='inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50'
        >
          <InfoDot title='How It Works' /> How It Works
        </button>
      </div>

      {showHelp && (
        <div className='rounded-xl bg-blue-50/70 px-4 py-3 text-sm text-gray-600 ring-1 ring-blue-100'>
          <b>Required (JCP)</b> adalah level yang dibutuhkan posisi Anda. <b>Actual</b> berasal dari final score
          (penilaian akhir atasan) pada Competency Assessment. Bila terdapat <b>gap negatif</b> (Needs Development),
          pilih metode <b>IDP</b> untuk menutup kesenjangan tersebut, lalu isi aspirasi Anda dan kirim ke atasan untuk ditinjau.
        </div>
      )}

      {/* ── Tabel kompetensi ───────────────────────────────────────────────── */}
      <div className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='text-left text-xs font-semibold uppercase tracking-wide text-gray-400'>
                <th className='px-4 py-3'>Competency</th>
                <th className='px-4 py-3'>Required (JCP)</th>
                <th className='px-4 py-3'>Actual (Final Score)</th>
                <th className='px-4 py-3'>Gap</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3'>IDP (Optional)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-4 py-10 text-center text-sm text-gray-400'>
                    Belum ada kompetensi pada kategori ini.
                  </td>
                </tr>
              ) : rows.map(comp => (
                <CompetencyRow key={comp.id} comp={comp} readOnly={readOnly} onChangeIdp={onChangeIdp} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail per tipe IDP ────────────────────────────────────────────── */}
      {rows.filter(c => c.idp).map(comp => {
        const opt = idpOption(comp.idp)
        return (
          <div key={`detail-${comp.id}`} className='rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6'>
            <div className='mb-4 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4'>
              {opt && (
                <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600'>
                  <Icon name={opt.icon} size={17} />
                </span>
              )}
              <span className='text-xs font-semibold uppercase tracking-wide text-gray-400'>IDP untuk</span>
              <span className='text-sm font-bold text-gray-800'>{comp.name}</span>
              <div className='ml-auto'>
                <select
                  value={comp.idp}
                  disabled={readOnly}
                  onChange={e => onChangeIdp(comp.id, e.target.value)}
                  className='rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-gray-50 disabled:text-gray-500'
                >
                  {IDP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <IdpTypeDetail
              type={comp.idp}
              detail={comp.detail || {}}
              onChange={d => onChangeDetail(comp.id, d)}
              readOnly={readOnly}
              reviewer={reviewer}
              people={people}
            />
          </div>
        )
      })}

      {/* ── Aspirasi ───────────────────────────────────────────────────────── */}
      <div className='grid gap-5 lg:grid-cols-2'>
        {[
          { field: 'learningAspiration', value: learningAspiration, icon: 'graduation', iconBg: 'bg-violet-100 text-violet-600',
            title: 'Aspirasi Belajar', hint: 'Apa yang ingin Anda pelajari untuk pengembangan diri Anda?' },
          { field: 'careerAspiration', value: careerAspiration, icon: 'rocket', iconBg: 'bg-emerald-100 text-emerald-600',
            title: 'Aspirasi Karir', hint: 'Karier seperti apa yang Anda inginkan di masa depan?' },
        ].map(a => (
          <div key={a.field} className='rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100'>
            <div className='mb-3 flex items-center gap-3'>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${a.iconBg}`}><Icon name={a.icon} size={18} /></span>
              <div>
                <h3 className='text-sm font-bold text-gray-800'>{a.title}</h3>
                <p className='text-xs text-gray-400'>{a.hint}</p>
              </div>
            </div>
            <div className='relative'>
              <textarea
                rows={4}
                maxLength={500}
                value={a.value}
                disabled={readOnly}
                onChange={e => onChangeAspiration(a.field, cap(e.target.value, 500))}
                className='w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-700 shadow-sm transition focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-gray-50 disabled:text-gray-500'
              />
              <span className='pointer-events-none absolute bottom-2.5 right-3 text-xs text-gray-300'>
                {(a.value || '').length}/500
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className='flex flex-col items-end gap-1'>
          <button
            onClick={onSubmit}
            className='inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
          >
            Submit to Manager <span aria-hidden>→</span>
          </button>
          <p className='text-xs text-gray-400'>Kirim penilaian ke atasan untuk ditinjau.</p>
        </div>
      )}
    </div>
  )
}
