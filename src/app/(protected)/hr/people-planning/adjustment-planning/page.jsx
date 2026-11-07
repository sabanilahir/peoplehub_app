'use client'
import { useState, useMemo, useEffect, Fragment } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useAdjustmentPlanStore } from '@/store/adjustmentPlanStore'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, FormField, Select, EmptyState, StatCard } from '@/components/ui'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

export default function AdjustmentPlanningPage() {
  const t = useT()
  const { companies, positions, grades } = useStructureStore()
  const { employees } = useEmployeeStore()

  // Planning is forward-looking: selectable years start NEXT year
  const baseYear   = new Date().getFullYear() + 1
  const planYears  = Array.from({ length: 5 }, (_, i) => baseYear + i)

  const [year,      setYear     ] = useState(String(baseYear))
  const [companyId, setCompanyId] = useState('')
  const [openTotal, setOpenTotal] = useState(true)
  const [openPc,    setOpenPc   ] = useState({})
  // Draft worksheet values, keyed `${employeeId}-${monthIndex}` → { adjust, pc, ic }
  const [adj,       setAdj      ] = useState({})
  const [msg,       setMsg      ] = useState(null)

  const { plans, savePlan } = useAdjustmentPlanStore()
  const planKey = `${year}:${companyId || 'all'}`

  // Load the saved worksheet whenever the Year/Company selection changes
  useEffect(() => { setAdj(plans[planKey] || {}) }, [planKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000) }
  const handleSave = () => {
    savePlan(planKey, adj)
    flash(t(`Adjustment plan ${year} disimpan.`, `Adjustment plan ${year} saved.`))
  }

  const togglePc = (pc) => setOpenPc(o => ({ ...o, [pc]: !o[pc] }))

  const pcOf = (positionId) => {
    const pos = positions.find(p => p.id === positionId)
    const g   = pos ? grades.find(gr => gr.id === pos.gradeId) : null
    return g ? g.pc : null
  }

  // Headcount = active employees, optionally filtered by company, grouped per PC
  const data = useMemo(() => {
    if (!year) return null
    const emps = employees.filter(e => {
      if (companyId && e.companyId !== +companyId) return false
      if (e.status && e.status !== 'Active') return false
      return true
    })
    const byPc = {}
    emps.forEach(e => {
      const pc = pcOf(e.positionId) ?? 0
      if (!byPc[pc]) byPc[pc] = []
      byPc[pc].push(e)
    })
    const pcs = Object.keys(byPc).map(Number).sort((a, b) => a - b)
    return { emps, byPc, pcs }
  }, [year, companyId, employees, positions, grades])

  const val    = (id, m) => adj[`${id}-${m}`] || {}
  const setVal = (id, m, field, v) =>
    setAdj(a => ({ ...a, [`${id}-${m}`]: { ...a[`${id}-${m}`], [field]: v } }))

  const isTouched   = (v) => !!(v.adjust || v.pc || v.ic)
  const isAdjusted  = (id) => MONTHS.some((_, m) => isTouched(val(id, m)))
  const touchedBy   = (id, field) => MONTHS.some((_, m) => !!val(id, m)[field])
  const kindsTouched = (id) => ['adjust', 'pc', 'ic'].filter(f => touchedBy(id, f)).length
  const checkedIn   = (emps, m) => emps.reduce((s, e) => s + (val(e.id, m).adjust ? 1 : 0), 0)
  const pcFilledIn  = (emps, m) => emps.reduce((s, e) => s + (val(e.id, m).pc ? 1 : 0), 0)
  const icFilledIn  = (emps, m) => emps.reduce((s, e) => s + (val(e.id, m).ic ? 1 : 0), 0)
  const pcLabel     = (pc) => pc === 0 ? 'PC N/A' : `PC ${pc}`

  const grandPerMonth   = data ? MONTHS.map((_, m) => checkedIn(data.emps, m)) : []
  const grandPcPerMonth = data ? MONTHS.map((_, m) => pcFilledIn(data.emps, m)) : []
  const grandIcPerMonth = data ? MONTHS.map((_, m) => icFilledIn(data.emps, m)) : []
  const grandTotal      = grandPerMonth.reduce((a, b) => a + b, 0)

  // Breakdown of "Total Headcount Diadjust" by which column(s) were touched
  const adjustedCount      = data ? data.emps.filter(e => isAdjusted(e.id)).length : 0
  const adjustedGajiCount  = data ? data.emps.filter(e => touchedBy(e.id, 'adjust')).length : 0
  const adjustedPcCount    = data ? data.emps.filter(e => touchedBy(e.id, 'pc')).length : 0
  const adjustedIcCount    = data ? data.emps.filter(e => touchedBy(e.id, 'ic')).length : 0
  const adjustedComboCount = data ? data.emps.filter(e => kindsTouched(e.id) >= 2).length : 0

  const thSub = 'border border-gray-200 bg-gray-100 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500'
  const tdNum = 'whitespace-nowrap border border-gray-200 px-2 py-1 text-center text-[11px] text-gray-600'
  const lovCls = 'w-[64px] rounded border border-gray-200 px-1 py-0.5 text-[11px] text-gray-700 focus:border-red-300 focus:outline-none'

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div className='fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-xl'>
          ✓ {msg}
        </div>
      )}

      <PageHeader
        icon='🧮'
        title='Adjustment Planning'
        subtitle={t('Perencanaan penyesuaian per headcount — tandai bulan adjust beserta PC dan IC tujuannya.','Per-headcount adjustment planning — tick the adjustment month with its target PC and IC.')}
      />

      {/* Parameters */}
      <SectionCard title={t('Parameter','Parameters')} icon='⚙️' className='mb-6'>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <FormField label='Year' required hint={t(`Perencanaan untuk tahun depan — mulai ${baseYear}.`,`Forward planning — starts at ${baseYear}.`)}>
            <Select value={year} onChange={e=>{ setYear(e.target.value); setOpenPc({}) }}>
              {planYears.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </FormField>
          <FormField label='Company'>
            <Select value={companyId} onChange={e=>{ setCompanyId(e.target.value); setOpenPc({}) }}>
              <option value=''>{t('Semua Company','All Companies')}</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
        </div>
      </SectionCard>

      {/* Mini dashboard */}
      <div className='mb-6 grid grid-cols-2 gap-4'>
        <StatCard label={t('Total Headcount','Total Headcount')} value={data?.emps.length || 0} icon='👤' tone='brand' />
        <StatCard label={t('Total Adjustment','Total Adjustment')} value={adjustedCount} icon='✅' tone='green'
          hint={t('minimal satu bulan di salah satu kolom','at least one month on any column')} />
      </div>

      {/* Breakdown of "Diadjust — Semua Jenis" by which column(s) were touched */}
      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <StatCard label={t('Adjustment Gaji Pokok','Adjustment Base Salary')} value={adjustedGajiCount} icon='💰' tone='blue'
          hint={t('minimal satu bulan dicentang','at least one month ticked')} />
        <StatCard label={t('Adjustment PC','Adjustment PC')} value={adjustedPcCount} icon='🏷️' tone='gray'
          hint={t('minimal satu bulan PC diisi','at least one month PC filled')} />
        <StatCard label={t('Adjustment IC','Adjustment IC')} value={adjustedIcCount} icon='🎯' tone='gray'
          hint={t('minimal satu bulan IC diisi','at least one month IC filled')} />
        <StatCard label={t('Adjustment Combination','Adjustment Combination')} value={adjustedComboCount} icon='🔀' tone='brand'
          hint={t('≥ 2 jenis kolom disentuh','≥ 2 column kinds touched')} />
      </div>

      <SectionCard
        title={`${t('Worksheet Adjustment','Adjustment Worksheet')} · ${year}${companyId ? ` · ${companies.find(c=>c.id===+companyId)?.name || ''}` : ''}`}
        icon='🧮'
        bodyClass='p-0'
        actions={
          <button onClick={handleSave}
            className='flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            💾 {t('Simpan','Save')}
          </button>
        }
      >
        {data && data.emps.length ? (
          <div className='overflow-x-auto'>
            <table className='border-collapse text-sm'>
              <thead>
                <tr>
                  <th rowSpan={2} className='sticky left-0 z-10 border border-gray-200 bg-gray-200/80 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600' style={{ minWidth: 220 }}>
                    {t('Kategori / PC / Headcount','Category / PC / Headcount')}
                  </th>
                  {MONTHS.map(m => (
                    <th key={m} colSpan={3} className='border border-gray-200 bg-gray-200/80 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-gray-600'>{m}</th>
                  ))}
                  <th rowSpan={2} className='border border-gray-200 bg-red-100 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-red-700'>TOTAL</th>
                </tr>
                <tr>
                  {MONTHS.map(m => (
                    <Fragment key={m}>
                      <th className={thSub} style={{ minWidth: 72 }}>{t('Gaji Pokok','Base Salary')}</th>
                      <th className={thSub} style={{ minWidth: 68 }}>PC</th>
                      <th className={thSub} style={{ minWidth: 68 }}>IC</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* TOTAL HEADCOUNT */}
                <tr className='bg-gray-100'>
                  <td className='sticky left-0 z-10 whitespace-nowrap border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-800'>
                    <span className='flex items-center gap-1.5'>
                      <button onClick={()=>setOpenTotal(v=>!v)} className='flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[10px] font-bold leading-none text-gray-600 hover:bg-gray-200'>
                        {openTotal ? '−' : '+'}
                      </button>
                      TOTAL HEADCOUNT
                    </span>
                  </td>
                  {MONTHS.map((_, m) => (
                    <Fragment key={m}>
                      <td className={`${tdNum} font-bold text-gray-800`}>{grandPerMonth[m]}</td>
                      <td className={`${tdNum} font-bold text-gray-800`}>{grandPcPerMonth[m]}</td>
                      <td className={`${tdNum} font-bold text-gray-800`}>{grandIcPerMonth[m]}</td>
                    </Fragment>
                  ))}
                  <td className='whitespace-nowrap border border-gray-200 bg-red-50/50 px-3 py-1.5 text-center text-xs font-bold text-red-700'>{grandTotal}</td>
                </tr>

                {/* PC rows → headcount rows */}
                {openTotal && data.pcs.map(pc => {
                  const emps    = data.byPc[pc]
                  const perM    = MONTHS.map((_, m) => checkedIn(emps, m))
                  const perMPc  = MONTHS.map((_, m) => pcFilledIn(emps, m))
                  const perMIc  = MONTHS.map((_, m) => icFilledIn(emps, m))
                  const rowT    = perM.reduce((a,b)=>a+b,0)
                  const open    = !!openPc[pc]
                  return (
                    <Fragment key={pc}>
                      <tr className='bg-white hover:bg-red-50/30'>
                        <td className='sticky left-0 z-10 whitespace-nowrap border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600'>
                          <span style={{ paddingLeft: 18 }} className='flex items-center gap-1.5'>
                            <button onClick={()=>togglePc(pc)} className='flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[10px] font-bold leading-none text-gray-600 hover:bg-gray-200'>
                              {open ? '−' : '+'}
                            </button>
                            <span className='font-semibold'>{pcLabel(pc)}</span>
                            <span className='text-[10px] text-gray-400'>({emps.length})</span>
                          </span>
                        </td>
                        {MONTHS.map((_, m) => (
                          <Fragment key={m}>
                            <td className={`${tdNum} font-semibold`}>{perM[m]}</td>
                            <td className={`${tdNum} font-semibold`}>{perMPc[m]}</td>
                            <td className={`${tdNum} font-semibold`}>{perMIc[m]}</td>
                          </Fragment>
                        ))}
                        <td className='whitespace-nowrap border border-gray-200 bg-red-50/50 px-3 py-1.5 text-center text-xs font-bold text-gray-700'>{rowT}</td>
                      </tr>

                      {open && emps.map((e, i) => {
                        const empT = MONTHS.reduce((s, _, m) => s + (val(e.id, m).adjust ? 1 : 0), 0)
                        const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        return (
                          <tr key={e.id} className={`${rowBg} hover:bg-red-50/40`}>
                            <td className={`sticky left-0 z-10 border border-gray-200 ${rowBg} px-3 py-1 text-[11px] text-gray-600`}>
                              <span style={{ paddingLeft: 36 }} className='block max-w-[260px] truncate'>
                                <span className='font-medium text-gray-700'>{e.name}</span>
                                {e.nik && <span className='ml-1 text-[10px] text-gray-400'>· {e.nik}</span>}
                              </span>
                            </td>
                            {MONTHS.map((_, m) => {
                              const v = val(e.id, m)
                              return (
                                <Fragment key={m}>
                                  <td className='border border-gray-200 p-0.5 text-center'>
                                    <input
                                      type='checkbox'
                                      checked={!!v.adjust}
                                      onChange={ev=>setVal(e.id, m, 'adjust', ev.target.checked)}
                                      className='h-3.5 w-3.5 accent-red-600'
                                    />
                                  </td>
                                  <td className='border border-gray-200 p-0.5'>
                                    <select value={v.pc ?? ''} onChange={ev=>setVal(e.id, m, 'pc', ev.target.value)} className={lovCls}>
                                      <option value=''>--</option>
                                      {grades.map(g => <option key={g.id} value={g.pc}>{g.pc}</option>)}
                                    </select>
                                  </td>
                                  <td className='border border-gray-200 p-0.5'>
                                    <select value={v.ic ?? ''} onChange={ev=>setVal(e.id, m, 'ic', ev.target.value)} className={lovCls}>
                                      <option value=''>--</option>
                                      {grades.map(g => <option key={g.id} value={g.pc}>{g.pc}</option>)}
                                    </select>
                                  </td>
                                </Fragment>
                              )
                            })}
                            <td className='whitespace-nowrap border border-gray-200 bg-red-50/30 px-3 py-1 text-center text-[11px] font-semibold text-gray-700'>{empT}</td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className='p-5'>
            <EmptyState
              icon='📭'
              title={t('Tidak ada headcount pada periode ini.','No headcount in this period.')}
              description={t('Coba pilih company lain.','Try a different company.')}
            />
          </div>
        )}
      </SectionCard>

      <p className='mt-3 text-xs text-gray-400'>
        {t('Centang kolom Gaji Pokok pada bulan adjust, lalu pilih PC dan IC tujuan. Baris PC dan TOTAL menjumlahkan headcount yang dicentang/diisi pada masing-masing kolom.','Tick the Base Salary column on the adjustment month, then choose the target PC and IC. PC and TOTAL rows count the headcounts ticked/filled in on each column.')}
      </p>
    </div>
  )
}
