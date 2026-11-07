'use client'
import { useState, useMemo, useEffect } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useRktkPlanStore } from '@/store/rktkPlanStore'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, FormField, Select, EmptyState, StatCard } from '@/components/ui'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

export default function RktkPage() {
  const t = useT()
  const { companies, positions, grades, departments, businessUnits, headcounts } = useStructureStore()
  const { employees } = useEmployeeStore()

  // Planning is forward-looking: selectable years start NEXT year
  const baseYear  = new Date().getFullYear() + 1
  const planYears = Array.from({ length: 5 }, (_, i) => baseYear + i)

  const [year,      setYear     ] = useState(String(baseYear))
  const [companyId, setCompanyId] = useState('')
  const [viewBy,    setViewBy   ] = useState('position')   // 'position' | 'headcount'
  const [openTotal, setOpenTotal] = useState(true)
  const [openPc,    setOpenPc   ] = useState({})
  // Draft values, keyed `${leafId}-${monthIndex}` → New Hire count (string while editing)
  const [values,    setValues   ] = useState({})
  const [msg,       setMsg      ] = useState(null)

  const { plans, savePlan } = useRktkPlanStore()
  const planKey = `${year}:${companyId || 'all'}:${viewBy}`

  useEffect(() => { setValues(plans[planKey] || {}) }, [planKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000) }
  const handleSave = () => {
    savePlan(planKey, values)
    flash(t(`Plan RKTK ${year} disimpan.`, `RKTK plan ${year} saved.`))
  }

  const toggleTotal = () => setOpenTotal(v => !v)
  const togglePc    = (pc) => setOpenPc(o => ({ ...o, [pc]: !o[pc] }))

  const pcOf = (positionId) => {
    const pos = positions.find(p => p.id === positionId)
    const g   = pos ? grades.find(gr => gr.id === pos.gradeId) : null
    return g ? g.pc : null
  }
  const companyOfPosition = (positionId) => {
    const pos  = positions.find(p => p.id === positionId)
    const dept = pos ? departments.find(d => d.id === pos.departmentId) : null
    const bu   = dept ? businessUnits.find(b => b.id === dept.businessUnitId) : null
    return bu ? bu.companyId : null
  }

  // Leaf list per current View By, grouped by PC
  const leaves = useMemo(() => {
    const filteredPositions = positions.filter(p => !companyId || companyOfPosition(p.id) === +companyId)
    let source
    if (viewBy === 'position') {
      source = filteredPositions
    } else {
      // Every Position contributes at least one Headcount row — real seats if
      // they exist, otherwise a vacant placeholder — so By Headcount is never
      // sparser than By Position (a Position can have several Headcounts, but
      // never fewer than one).
      source = []
      filteredPositions.forEach(pos => {
        const hcs = headcounts.filter(h => h.positionId === pos.id)
        if (hcs.length) source.push(...hcs)
        else source.push({ id: `virtual-${pos.id}`, positionId: pos.id, code: pos.code, name: pos.name, employeeId: null, virtual: true })
      })
    }
    const byPc = {}
    source.forEach(item => {
      const pid = viewBy === 'position' ? item.id : item.positionId
      const pc  = pcOf(pid) ?? 0
      if (!byPc[pc]) byPc[pc] = []
      byPc[pc].push(item)
    })
    const pcs = Object.keys(byPc).map(Number).sort((a, b) => a - b)
    return { items: source, byPc, pcs }
  }, [viewBy, companyId, positions, headcounts, departments, businessUnits, grades])

  const monthVal = (id, m) => +values[`${id}-${m}`] || 0
  const setMonthVal = (id, m, v) => setValues(s => ({ ...s, [`${id}-${m}`]: v }))
  const leafTotal = (id) => MONTHS.reduce((s, _, m) => s + monthVal(id, m), 0)

  // PC and grand sums, recomputed whenever the draft values change
  const sums = useMemo(() => {
    const perPc = {}
    const grand = Array(12).fill(0)
    leaves.pcs.forEach(pc => {
      const arr = Array(12).fill(0)
      leaves.byPc[pc].forEach(item => {
        MONTHS.forEach((_, m) => {
          const v = monthVal(item.id, m)
          arr[m] += v
          grand[m] += v
        })
      })
      perPc[pc] = arr
    })
    return { perPc, grand, grandTotal: grand.reduce((a, b) => a + b, 0) }
  }, [leaves, values]) // eslint-disable-line react-hooks/exhaustive-deps

  const pcLabel = (pc) => pc === 0 ? 'PC N/A' : `PC ${pc}`

  const leafLabel = (item) => {
    if (viewBy === 'position') return `${item.code} - ${item.name}`.toUpperCase()
    const emp = item.employeeId ? employees.find(e => e.id === item.employeeId) : null
    return { main: `${item.code} - ${item.name}`, sub: emp ? emp.name : t('Vacant', 'Vacant') }
  }

  const tdNum   = 'whitespace-nowrap border border-gray-200 px-2 py-1 text-center text-xs'
  const inputCls = 'w-16 rounded border border-gray-200 px-1.5 py-1 text-center text-xs text-gray-700 focus:border-red-300 focus:outline-none'

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div className='fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-xl'>
          ✓ {msg}
        </div>
      )}

      <PageHeader
        icon='📊'
        title='RKTK'
        subtitle={t('Rencana New Hire per bulan — drilldown per Position Class (PC), by Position atau by Headcount.','Monthly New Hire plan — drilldown by Position Class (PC), by Position or by Headcount.')}
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
          <FormField label='View By'>
            <Select value={viewBy} onChange={e=>{ setViewBy(e.target.value); setOpenPc({}) }}>
              <option value='position'>{t('By Position','By Position')}</option>
              <option value='headcount'>{t('By Headcount','By Headcount')}</option>
            </Select>
          </FormField>
        </div>
      </SectionCard>

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <StatCard
          label={viewBy === 'position' ? t('Total New Hire (by Position)','Total New Hire (by Position)') : t('Total New Hire (by Headcount)','Total New Hire (by Headcount)')}
          value={sums.grandTotal} icon='🧑‍💼' tone='brand'
        />
      </div>

      <SectionCard
        title={`${t('Matriks New Hire','New Hire Matrix')} · ${year}${companyId ? ` · ${companies.find(c=>c.id===+companyId)?.name || ''}` : ''} · ${viewBy === 'position' ? t('by Position','by Position') : t('by Headcount','by Headcount')}`}
        icon='📊'
        bodyClass='p-0'
        actions={
          <button onClick={handleSave}
            className='flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            💾 {t('Simpan','Save')}
          </button>
        }
      >
        {leaves.pcs.length ? (
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-sm'>
              <thead>
                <tr>
                  <th className='sticky left-0 z-10 border border-gray-200 bg-gray-200/80 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600' style={{ minWidth: 220 }}>
                    {viewBy === 'position' ? t('Kategori / PC / Position','Category / PC / Position') : t('Kategori / PC / Headcount','Category / PC / Headcount')}
                  </th>
                  {MONTHS.map(m => (
                    <th key={m} className='border border-gray-200 bg-gray-200/80 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-600'>{m}</th>
                  ))}
                  <th className='border border-gray-200 bg-red-100 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-red-700'>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {/* TOTAL row */}
                <tr className='bg-gray-100'>
                  <td className='sticky left-0 z-10 whitespace-nowrap border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-800'>
                    <span className='flex items-center gap-1.5'>
                      <button onClick={toggleTotal} className='flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[10px] font-bold leading-none text-gray-600 hover:bg-gray-200'>
                        {openTotal ? '−' : '+'}
                      </button>
                      {viewBy === 'position' ? 'TOTAL POSITION' : 'TOTAL HEADCOUNT'}
                    </span>
                  </td>
                  {MONTHS.map((_, m) => (
                    <td key={m} className={`${tdNum} font-bold text-gray-800`}>{sums.grand[m]}</td>
                  ))}
                  <td className='whitespace-nowrap border border-gray-200 bg-red-50/50 px-3 py-1.5 text-center text-xs font-bold text-red-700'>{sums.grandTotal}</td>
                </tr>

                {/* PC rows → leaf rows */}
                {openTotal && leaves.pcs.map(pc => {
                  const items = leaves.byPc[pc]
                  const arr   = sums.perPc[pc]
                  const total = arr.reduce((a, b) => a + b, 0)
                  const open  = !!openPc[pc]
                  return (
                    <FragmentGroup key={pc}>
                      <tr className='bg-white hover:bg-red-50/30'>
                        <td className='sticky left-0 z-10 whitespace-nowrap border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600'>
                          <span style={{ paddingLeft: 18 }} className='flex items-center gap-1.5'>
                            <button onClick={()=>togglePc(pc)} className='flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[10px] font-bold leading-none text-gray-600 hover:bg-gray-200'>
                              {open ? '−' : '+'}
                            </button>
                            <span className='font-semibold'>{pcLabel(pc)}</span>
                            <span className='text-[10px] text-gray-400'>({items.length})</span>
                          </span>
                        </td>
                        {MONTHS.map((_, m) => (
                          <td key={m} className={`${tdNum} font-semibold`}>{arr[m]}</td>
                        ))}
                        <td className='whitespace-nowrap border border-gray-200 bg-red-50/50 px-3 py-1.5 text-center text-xs font-bold text-gray-700'>{total}</td>
                      </tr>

                      {open && items.map((item, i) => {
                        const label = leafLabel(item)
                        const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        return (
                          <tr key={item.id} className={`${rowBg} hover:bg-red-50/40`}>
                            <td className={`sticky left-0 z-10 border border-gray-200 ${rowBg} px-3 py-1 text-[11px] text-gray-600`}>
                              <span style={{ paddingLeft: 36 }} className='block max-w-[280px] truncate'>
                                {viewBy === 'position' ? (
                                  <span className='font-medium text-gray-700'>{label}</span>
                                ) : (
                                  <>
                                    <span className='font-medium text-gray-700'>{label.main}</span>
                                    <span className='ml-1 text-[10px] text-gray-400'>· {label.sub}</span>
                                  </>
                                )}
                              </span>
                            </td>
                            {MONTHS.map((_, m) => (
                              <td key={m} className='border border-gray-200 p-0.5 text-center'>
                                <input
                                  type='number' min='0' placeholder='0'
                                  value={values[`${item.id}-${m}`] ?? ''}
                                  onChange={ev=>setMonthVal(item.id, m, ev.target.value)}
                                  className={inputCls}
                                />
                              </td>
                            ))}
                            <td className='whitespace-nowrap border border-gray-200 bg-red-50/30 px-3 py-1 text-center text-[11px] font-semibold text-gray-700'>{leafTotal(item.id)}</td>
                          </tr>
                        )
                      })}
                    </FragmentGroup>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className='p-5'>
            <EmptyState
              icon='📭'
              title={t('Tidak ada data pada filter ini.','No data for this filter.')}
              description={t('Coba pilih company lain.','Try a different company.')}
            />
          </div>
        )}
      </SectionCard>

      <p className='mt-3 text-xs text-gray-400'>
        {t('Isi jumlah New Hire per bulan pada baris Position/Headcount. Baris PC dan TOTAL menjumlahkan input di bawahnya.','Fill in the New Hire count per month on the Position/Headcount rows. PC and TOTAL rows sum the input below them.')}
      </p>
    </div>
  )
}

// Plain pass-through so a PC + its leaf rows can share one React key
function FragmentGroup({ children }) { return <>{children}</> }
