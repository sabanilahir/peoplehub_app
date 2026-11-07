'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore }        from '@/store/authStore'
import { useOnboardingStore, onboardingStage }  from '@/store/onboardingStore'
import { useT }                from '@/store/languageStore'
import { validateResponse }    from '@/utils/formBuilderUtils'
import { frequencyLabel }      from '@/utils/reviewCadence'

const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

// ── Form Fill Modal ───────────────────────────────────────────────────────────
const NILAI_OPTS   = ['A', 'B', 'C', 'D', 'E']
const OBS_OPTS     = ['+', '0', '-']
const KESIMPULAN   = ['Lulus', 'Mengulang', 'Tidak Lulus']
const OJT_SCORES   = [{ val: 'A', poin: 4 }, { val: 'B', poin: 3 }, { val: 'C', poin: 2 }, { val: 'D', poin: 1 }]

function FormFillModal({ item, allSections, evaluatorId, evaluatorName, onSave, onClose }) {
  const existing = (item.formSubmissions ?? []).find(s => s.evaluatorId === evaluatorId)
  const [resp, setResp] = useState(existing?.response ?? item.formResponse ?? {})
  const schema   = item.formSchema ?? []
  const formType = item.formType ?? 'field'
  const setField = (id, val) => setResp(r => ({ ...r, [id]: val }))
  const isValid  = formType === 'field' ? validateResponse(schema, resp) : true

  const evalTopics = (() => {
    if (formType !== 'evaluasi') return []
    const pre = item.evalTopics ?? []
    if (pre.length > 0) return pre
    return (allSections ?? []).flatMap(ms =>
      (ms.items ?? []).filter(i => i.completed && i.type !== 'Configurable Form')
        .map(i => ({ id: i.id, label: i.module || i.agenda || i.id, section: ms.type }))
    )
  })()

  const summaryRows = formType === 'summary'
    ? (allSections ?? []).flatMap(ms =>
        (ms.items ?? []).filter(i => i.completed)
          .map(i => ({ id: i.id, label: i.module || i.agenda || '—', type: i.type, date: i.date, section: ms.type }))
      )
    : []

  const evalMethod = item.evalMethod ?? 'nilai'
  const scoreOpts  = evalMethod === 'nilai' ? NILAI_OPTS : OBS_OPTS

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
      <div className={`bg-white rounded-2xl shadow-2xl w-full mx-4 overflow-hidden ${formType === 'ojt' ? 'max-w-3xl' : 'max-w-2xl'}`}>
        <div style={{ background: BRAND }} className='px-6 py-4 flex items-center justify-between'>
          <h2 className='text-sm font-bold text-white'>
            {formType === 'evaluasi' ? <Icon name='chart' size={14} /> : formType === 'ojt' ? <Icon name='cpu' size={14} /> : formType === 'summary' ? <Icon name='clipboard' size={14} /> : <Icon name='edit' size={14} />} {item.module || 'Form'}
          </h2>
          <span className='text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white uppercase'>{formType}</span>
        </div>
        <div className='px-6 py-5 max-h-[65vh] overflow-y-auto'>
          {formType === 'field' && (
            <div className='space-y-4'>
              {schema.length === 0 && <p className='text-gray-400 text-sm text-center py-4'>Form belum memiliki field.</p>}
              {schema.map(f => {
                const val  = resp[f.id] ?? ''
                const opts = (f.options || '').split(',').map(s => s.trim()).filter(Boolean)
                return (
                  <div key={f.id}>
                    <label className='block text-xs font-semibold text-gray-700 mb-1'>
                      {f.label}{f.required && <span className='text-red-500 ml-0.5'>*</span>}
                    </label>
                    {f.type === 'text'     && <input value={val} onChange={e => setField(f.id, e.target.value)} className='w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400' />}
                    {f.type === 'textarea' && <textarea value={val} onChange={e => setField(f.id, e.target.value)} rows={3} className='w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400 resize-none' />}
                    {f.type === 'number'   && <input type='number' value={val} onChange={e => setField(f.id, e.target.value)} className='w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400' />}
                    {f.type === 'date'     && <input type='date' value={val} onChange={e => setField(f.id, e.target.value)} className='w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400' />}
                    {f.type === 'dropdown' && (
                      <select value={val} onChange={e => setField(f.id, e.target.value)} className='w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white'>
                        <option value=''>— Pilih —</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {f.type === 'radio' && (
                      <div className='space-y-1'>
                        {opts.map(o => (
                          <label key={o} className='flex items-center gap-2 text-sm text-gray-700 cursor-pointer'>
                            <input type='radio' name={f.id} value={o} checked={val === o} onChange={() => setField(f.id, o)} className='accent-red-600' />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}
                    {f.type === 'checkbox' && (
                      <label className='flex items-center gap-2 text-sm text-gray-700 cursor-pointer'>
                        <input type='checkbox' checked={!!val} onChange={e => setField(f.id, e.target.checked)} className='w-4 h-4 accent-red-600' />
                        Ya
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {formType === 'evaluasi' && (
            <div>
              <p className='text-xs text-gray-500 mb-3'>Metode penilaian: <strong>{evalMethod === 'nilai' ? 'Nilai (A/B/C/D/E)' : 'Observasi (+/0/−)'}</strong></p>
              {evalTopics.length === 0 ? (
                <p className='text-sm text-gray-400 text-center py-6'>Belum ada topik evaluasi.</p>
              ) : (
                <table className='w-full text-xs border border-gray-200 rounded-lg overflow-hidden'>
                  <thead><tr className='bg-gray-50'>
                    <th className='px-3 py-2 text-left font-semibold text-gray-600 w-8'>No</th>
                    <th className='px-3 py-2 text-left font-semibold text-gray-600'>Topik / Materi</th>
                    <th className='px-3 py-2 text-left font-semibold text-gray-600 w-24'>Seksi</th>
                    <th className='px-3 py-2 text-center font-semibold text-gray-600 w-24'>{evalMethod === 'nilai' ? 'Nilai' : 'Observasi'}</th>
                    <th className='px-3 py-2 text-left font-semibold text-gray-600 w-40'>Catatan</th>
                  </tr></thead>
                  <tbody>
                    {evalTopics.map((tp, idx) => (
                      <tr key={tp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className='px-3 py-1.5 text-center text-gray-400'>{idx + 1}</td>
                        <td className='px-3 py-1.5 text-gray-800 font-medium'>{tp.label}</td>
                        <td className='px-3 py-1.5 text-gray-500 text-[10px]'>{tp.section || '—'}</td>
                        <td className='px-3 py-1.5 text-center'>
                          <select value={resp[`score_${tp.id}`] ?? ''} onChange={e => setField(`score_${tp.id}`, e.target.value)}
                            className='px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white w-16'>
                            <option value=''>—</option>
                            {scoreOpts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className='px-3 py-1.5'>
                          <input value={resp[`note_${tp.id}`] ?? ''} onChange={e => setField(`note_${tp.id}`, e.target.value)}
                            placeholder='opsional…' className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400' />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className='mt-4 flex items-center gap-3'>
                <label className='text-xs font-semibold text-gray-700'>Kesimpulan:</label>
                <div className='flex gap-2'>
                  {KESIMPULAN.map(k => (
                    <label key={k} className='flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer'>
                      <input type='radio' name='kesimpulan' value={k} checked={resp.kesimpulan === k} onChange={() => setField('kesimpulan', k)} className='accent-red-600' />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {formType === 'ojt' && (() => {
            const ojtParams = item.ojtParams ?? []
            if (!ojtParams.length) return <p className='text-sm text-gray-400 text-center py-6'>Belum ada parameter OJT.</p>
            return (
              <div className='space-y-5'>
                {ojtParams.map((p, pIdx) => {
                  const activities = p.activities ?? []
                  let totalY = 0, countZ = 0
                  activities.forEach(a => { const sc = resp[`ojt_${p.id}_${a.id}`]; const f = OJT_SCORES.find(s => s.val === sc); if (f) { totalY += f.poin; countZ++ } })
                  return (
                    <div key={p.id} className='rounded-xl border border-violet-200 overflow-hidden'>
                      <div className='bg-violet-600 px-3 py-2'><span className='text-xs font-bold text-white'>PARAMETER {String.fromCharCode(65+pIdx)}{p.label ? `. ${p.label.toUpperCase()}` : ''}</span></div>
                      <table className='w-full text-xs'>
                        <thead><tr className='bg-gray-50 border-b border-gray-100'>
                          <th className='px-3 py-1.5 text-left font-semibold text-gray-600 w-8'>No</th>
                          <th className='px-3 py-1.5 text-left font-semibold text-gray-600'>Aktivitas</th>
                          {OJT_SCORES.map(s => <th key={s.val} className='px-2 py-1.5 text-center font-semibold text-gray-600 w-14'>{s.val}<br /><span className='text-[10px] text-gray-400'>(Poin:{s.poin})</span></th>)}
                        </tr></thead>
                        <tbody>
                          {activities.map((a, aIdx) => {
                            const key = `ojt_${p.id}_${a.id}`; const val = resp[key] ?? ''
                            return (
                              <tr key={a.id} className={aIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                <td className='px-3 py-1.5 text-center text-gray-400'>{aIdx+1}</td>
                                <td className='px-3 py-1.5 text-gray-800'>{a.label || '—'}</td>
                                {OJT_SCORES.map(s => <td key={s.val} className='px-2 py-1.5 text-center'><input type='radio' name={key} value={s.val} checked={val===s.val} onChange={() => setField(key,s.val)} className='w-3.5 h-3.5 accent-violet-600 cursor-pointer' /></td>)}
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className='bg-violet-50 border-t border-violet-100 font-semibold text-[10px]'><td colSpan={2} className='px-3 py-1.5 text-violet-700'>Total Poin (Y)</td><td colSpan={4} className='px-3 py-1.5 text-right text-violet-600 font-bold'>{totalY}</td></tr>
                          <tr className='bg-violet-50 text-[10px]'><td colSpan={2} className='px-3 py-1 text-violet-600'>Jumlah JT (Z)</td><td colSpan={4} className='px-3 py-1 text-right text-violet-600 font-bold'>{countZ}</td></tr>
                          <tr className='bg-violet-50 border-b border-violet-100 text-[10px]'><td colSpan={2} className='px-3 py-1.5 text-violet-600'>Rata-rata (Y/Z)</td><td colSpan={4} className='px-3 py-1.5 text-right text-violet-700 font-bold'>{countZ>0?(totalY/countZ).toFixed(2):'—'}</td></tr>
                        </tfoot>
                      </table>
                    </div>
                  )
                })}
                <div className='flex items-center gap-3 pt-2'>
                  <label className='text-xs font-semibold text-gray-700'>Kesimpulan:</label>
                  <div className='flex gap-2'>{KESIMPULAN.map(k => <label key={k} className='flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer'><input type='radio' name='ojt_kesimpulan' value={k} checked={resp.kesimpulan===k} onChange={() => setField('kesimpulan',k)} className='accent-violet-600' />{k}</label>)}</div>
                </div>
              </div>
            )
          })()}

          {(formType === 'form_evaluation' || formType === 'form_evaluation_contract') && (() => {
            const isContract = formType === 'form_evaluation_contract'
            const RATING_OPTS = [1,2,3,4]
            const RATING_LABELS = {1:'Far Below Expectation',2:'Slightly Below Expectation',3:'Meet Expectation',4:'Exceed Expectation'}
            const FINAL_DECISIONS = isContract ? ['Passed, to be Permanent','Extend Contract','Not Passed'] : ['Passed to be Permanent','Not Passed']
            const calcScore = () => {
              const avg = (arr, prefix) => { const r = arr.filter(i => resp[`${prefix}_${i.id}`]); return r.length ? r.reduce((s,i)=>s+Number(resp[`${prefix}_${i.id}`]),0)/r.length : 0 }
              return Math.round((avg(item.coreValues??[],'cv')/4*50) + ((() => { const all=[...(item.coreCompetency??[]),...(item.strategicLeadership??[]),...(item.technicalCompetency??[])]; const r=all.filter(i=>resp[`cb_${i.id}`]); return r.length?r.reduce((s,i)=>s+Number(resp[`cb_${i.id}`]),0)/r.length:0 })()/4*50))
            }
            const RatingSelect = ({ prefix, item: ri }) => (
              <select value={resp[`${prefix}_${ri.id}`]??''} onChange={e=>setField(`${prefix}_${ri.id}`,e.target.value===''?'':Number(e.target.value))} className='w-48 px-2 py-1 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-white'>
                <option value=''>Select</option>{RATING_OPTS.map(n=><option key={n} value={n}>{n} - {RATING_LABELS[n]}</option>)}
              </select>
            )
            const EvalTable = ({ title, pct, items, prefix }) => (
              <div className='mb-4'>
                {pct ? <div className='bg-gray-200 px-4 py-2 flex justify-between'><span className='text-xs font-bold text-gray-700 uppercase tracking-wide'>{title}</span><span className='text-xs font-bold text-gray-700'>{pct}</span></div>
                      : <div className='bg-gray-100 px-4 py-1.5'><span className='text-xs font-semibold text-gray-600 italic'>{title}</span></div>}
                {items.length===0 ? <div className='px-4 py-3 text-xs text-gray-300 italic'>Belum ada item.</div> : (
                  <table className='w-full text-xs'><thead><tr className='bg-gray-50 border-b border-gray-100'><th className='px-3 py-1.5 text-left text-gray-500 font-semibold w-8'>No</th><th className='px-3 py-1.5 text-left text-gray-500 font-semibold w-36'>Aspek</th><th className='px-3 py-1.5 text-left text-gray-500 font-semibold'>Key Behaviors</th><th className='px-3 py-1.5 text-left text-gray-500 font-semibold w-52'>Rating</th></tr></thead>
                  <tbody>{items.map((ri,idx)=><tr key={ri.id} className={idx%2===0?'bg-white':'bg-gray-50/40'}><td className='px-3 py-2 text-center text-gray-400'>{ri.no||idx+1}</td><td className='px-3 py-2 text-gray-800 font-medium'>{ri.aspect||'—'}</td><td className='px-3 py-2 text-gray-500 leading-relaxed'>{ri.keyBehaviors||'—'}</td><td className='px-3 py-2'><RatingSelect prefix={prefix} item={ri} /></td></tr>)}</tbody></table>
                )}
              </div>
            )
            const score = calcScore()
            return (
              <div className='space-y-2'>
                <div className='overflow-x-auto border border-gray-200 rounded-lg'>
                  <EvalTable title='Core Values' pct='50%' items={item.coreValues??[]} prefix='cv' />
                  <EvalTable title='Competency Based' pct='50%' items={[]} prefix='' />
                  <EvalTable title='A. Core Competency' items={item.coreCompetency??[]} prefix='cb' />
                  {item.hasStrategicLeadership && <EvalTable title='B. Strategic Leadership' items={item.strategicLeadership??[]} prefix='cb' />}
                  <EvalTable title={item.hasStrategicLeadership?'C. Technical Competency':'B. Technical Competency'} items={item.technicalCompetency??[]} prefix='cb' />
                </div>
                <div className='grid grid-cols-2 gap-4 pt-2'>
                  <div className='col-span-2'><div className='bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center'><div className='text-[10px] text-gray-500 mb-0.5'>Final Score (0–100)</div><div className={`text-lg font-bold ${score>=75?'text-green-600':score>=50?'text-amber-600':'text-red-600'}`}>{score}</div></div></div>
                  <div><label className='block text-xs font-semibold text-gray-600 mb-1'>Final Decision <span className='text-red-500'>*</span></label><select value={resp.finalDecision??''} onChange={e=>setField('finalDecision',e.target.value)} className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-white'><option value=''>— Pilih —</option>{FINAL_DECISIONS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                  {isContract && resp.finalDecision==='Extend Contract' && <div><label className='block text-xs font-semibold text-gray-600 mb-1'>Perpanjangan Kontrak</label><select value={resp.extendMonths??''} onChange={e=>setField('extendMonths',e.target.value)} className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-white'><option value=''>— Pilih —</option>{['3','6','12'].map(m=><option key={m} value={m}>{m} bulan</option>)}</select></div>}
                  <div><label className='block text-xs font-semibold text-gray-600 mb-1'>Tgl Efektif</label><input type='date' value={resp.finalEffectiveDate??''} onChange={e=>setField('finalEffectiveDate',e.target.value)} className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none' /></div>
                  <div className='col-span-2'><label className='block text-xs font-semibold text-gray-600 mb-1'>Kekuatan</label><textarea rows={2} value={resp.strength??''} onChange={e=>setField('strength',e.target.value)} className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none resize-none' /></div>
                  <div className='col-span-2'><label className='block text-xs font-semibold text-gray-600 mb-1'>Area Pengembangan</label><textarea rows={2} value={resp.areaDevelopment??''} onChange={e=>setField('areaDevelopment',e.target.value)} className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none resize-none' /></div>
                </div>
              </div>
            )
          })()}

          {formType === 'summary' && (
            <div>
              <p className='text-xs text-gray-500 mb-3'>Ringkasan seluruh task yang telah diselesaikan.</p>
              {summaryRows.length === 0 ? <p className='text-sm text-gray-400 text-center py-6'>Belum ada task selesai.</p> : (
                <table className='w-full text-xs border border-gray-200 rounded-lg overflow-hidden'>
                  <thead><tr className='bg-gray-50'><th className='px-3 py-2 text-left font-semibold text-gray-600 w-8'>No</th><th className='px-3 py-2 text-left font-semibold text-gray-600'>Materi</th><th className='px-3 py-2 text-left font-semibold text-gray-600 w-28'>Seksi</th><th className='px-3 py-2 text-left font-semibold text-gray-600 w-24'>Tipe</th><th className='px-3 py-2 text-left font-semibold text-gray-600 w-24'>Tanggal</th><th className='px-3 py-2 text-left font-semibold text-gray-600 w-32'>Catatan</th></tr></thead>
                  <tbody>{summaryRows.map((r,idx)=><tr key={r.id} className={idx%2===0?'bg-white':'bg-gray-50/60'}><td className='px-3 py-1.5 text-center text-gray-400'>{idx+1}</td><td className='px-3 py-1.5 text-gray-800 font-medium'>{r.label}</td><td className='px-3 py-1.5 text-gray-500 text-[10px]'>{r.section}</td><td className='px-3 py-1.5 text-gray-500 text-[10px]'>{r.type||'—'}</td><td className='px-3 py-1.5 text-gray-500'>{r.date||'—'}</td><td className='px-3 py-1.5'><input value={resp[`note_${r.id}`]??''} onChange={e=>setField(`note_${r.id}`,e.target.value)} placeholder='opsional…' className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400' /></td></tr>)}</tbody>
                </table>
              )}
              <div className='mt-4 flex items-center gap-3'><label className='text-xs font-semibold text-gray-700'>Kesimpulan Akhir:</label><div className='flex gap-2'>{KESIMPULAN.map(k=><label key={k} className='flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer'><input type='radio' name='kesimpulan_summary' value={k} checked={resp.kesimpulan===k} onChange={()=>setField('kesimpulan',k)} className='accent-red-600' />{k}</label>)}</div></div>
            </div>
          )}
        </div>
        <div className='px-6 py-4 border-t border-gray-100 flex justify-end gap-3'>
          <button onClick={onClose} className='px-4 py-2 text-sm text-gray-500 hover:text-gray-700'>Batal</button>
          <button onClick={() => onSave(resp)} disabled={formType==='field' && !isValid && schema.length>0}
            className='px-4 py-2 text-sm font-semibold rounded-lg text-white transition disabled:opacity-40' style={{background:BRAND}}>
            Simpan Jawaban
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Electronic Signature Modal ────────────────────────────────────────────────
function SignatureModal({ item, onSave, onClose, t }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const startDraw = (e) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(x, y)
    setDrawing(true)
  }
  const draw = (e) => {
    if (!drawing) return
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(e, canvas)
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1a2e'
    ctx.lineTo(x, y); ctx.stroke()
    setHasDrawn(true)
  }
  const stopDraw = () => setDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const save = () => {
    const canvas = canvasRef.current; if (!canvas || !hasDrawn) return
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden'>
        <div style={{background:BRAND}} className='px-6 py-4 flex items-center justify-between'>
          <h2 className='text-sm font-bold text-white'><Icon name='edit' size={14} className='inline align-[-2px]' /> {item.module || t('Tanda Tangan','Signature')}</h2>
          <button onClick={onClose} className='text-white/70 hover:text-white text-lg'><Icon name='close' size={15} /></button>
        </div>
        <div className='p-5'>
          {item.signatureData && (
            <div className='mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200 text-center'>
              <p className='text-xs text-gray-500 mb-2'>{t('Tanda tangan sebelumnya','Previous signature')}:</p>
              <img src={item.signatureData} alt='signature' className='h-16 mx-auto' />
            </div>
          )}
          <p className='text-xs text-gray-500 mb-2'>{t('Tanda tangan di area bawah ini','Sign in the area below')}:</p>
          <canvas ref={canvasRef} width={380} height={180}
            className='w-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-crosshair touch-none'
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
          <div className='flex justify-between mt-3'>
            <button onClick={clear} className='px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50'>
              {t('Bersihkan','Clear')}
            </button>
            <div className='flex gap-2'>
              <button onClick={onClose} className='px-4 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50'>{t('Batal','Cancel')}</button>
              <button onClick={save} disabled={!hasDrawn}
                className='px-4 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-40 hover:opacity-90'
                style={{background:BRAND}}>
                {t('Simpan TTD','Save Signature')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── File Upload Modal ─────────────────────────────────────────────────────────
function FileUploadModal({ item, onSave, onClose, t }) {
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPreview({ name: f.name, size: f.size, data: ev.target.result, type: f.type })
    reader.readAsDataURL(f)
  }

  const save = () => {
    if (!preview) return
    setLoading(true)
    setTimeout(() => { onSave(preview); setLoading(false) }, 300)
  }

  const fmtSize = (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden'>
        <div style={{background:BRAND}} className='px-6 py-4 flex items-center justify-between'>
          <h2 className='text-sm font-bold text-white'><Icon name='clip' size={14} className='inline align-[-2px]' /> {item.module || t('Upload Dokumen','Upload Document')}</h2>
          <button onClick={onClose} className='text-white/70 hover:text-white text-lg'><Icon name='close' size={15} /></button>
        </div>
        <div className='p-5 space-y-4'>
          {item.attachmentName && (
            <div className='p-3 bg-green-50 border border-green-200 rounded-xl'>
              <p className='text-xs text-green-700 font-semibold'><Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Sudah diupload','Already uploaded')}: {item.attachmentName}</p>
            </div>
          )}
          <label className='flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition'>
            <span className='text-gray-400 mb-1'><Icon name='folder' size={26} /></span>
            <span className='text-xs text-gray-500'>{t('Klik atau drag file ke sini','Click or drag file here')}</span>
            <span className='text-[10px] text-gray-400 mt-0.5'>PDF, DOC, DOCX, JPG, PNG</span>
            <input type='file' className='sr-only' accept='.pdf,.doc,.docx,.jpg,.jpeg,.png' onChange={handleFile} />
          </label>
          {preview && (
            <div className='flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl'>
              <span>{preview.type.includes('image') ? <Icon name='image' size={20} /> : <Icon name='file' size={20} />}</span>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-semibold text-gray-800 truncate'>{preview.name}</p>
                <p className='text-[10px] text-gray-500'>{fmtSize(preview.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setPreview(null) }} className='text-gray-400 hover:text-red-500 text-sm'><Icon name='close' size={15} /></button>
            </div>
          )}
          <div className='flex gap-3 pt-1'>
            <button onClick={onClose} className='flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50'>{t('Batal','Cancel')}</button>
            <button onClick={save} disabled={!preview || loading}
              className='flex-1 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-40 hover:opacity-90'
              style={{background:BRAND}}>
              {loading ? t('Menyimpan…','Saving…') : t('Upload','Upload')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Video Modal ───────────────────────────────────────────────────────────────
function VideoModal({ item, onClose, onMarkDone, t }) {
  const url = item.link || ''
  const embedUrl = (() => {
    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
    // Vimeo
    const vm = url.match(/vimeo\.com\/(\d+)/)
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
    return null
  })()

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden'>
        <div style={{background:BRAND}} className='px-6 py-4 flex items-center justify-between'>
          <h2 className='text-sm font-bold text-white'><Icon name='play' size={14} className='inline align-[-2px]' /> {item.module || 'Video'}</h2>
          <button onClick={onClose} className='text-white/70 hover:text-white text-lg'><Icon name='close' size={15} /></button>
        </div>
        <div className='p-4'>
          {embedUrl ? (
            <div className='relative w-full rounded-xl overflow-hidden bg-black' style={{paddingTop:'56.25%'}}>
              <iframe src={embedUrl} className='absolute inset-0 w-full h-full' allowFullScreen allow='autoplay; encrypted-media' />
            </div>
          ) : url ? (
            <video src={url} controls className='w-full rounded-xl' style={{maxHeight:400}} />
          ) : (
            <div className='py-16 text-center text-gray-400'>
              <p className='text-gray-400 mb-2'><Icon name='play' size={26} /></p>
              <p className='text-sm'>{t('URL video belum dikonfigurasi.','Video URL not configured.')}</p>
            </div>
          )}
          <div className='flex justify-end gap-3 mt-4'>
            <button onClick={onClose} className='px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50'>{t('Tutup','Close')}</button>
            <button onClick={() => { onMarkDone(); onClose() }}
              className='px-4 py-2 text-sm font-bold text-white rounded-xl hover:opacity-90' style={{background:BRAND}}>
              <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Tandai Selesai','Mark as Done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Action Button per task type ───────────────────────────────────────────────
function ItemActionButton({ item, msId, disabled, onFillForm, onSign, onUpload, onVideo, onMark, t }) {
  const btnCls = 'px-3 py-1 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition disabled:opacity-40 whitespace-nowrap'
  const doneCls = 'px-3 py-1 text-xs font-semibold rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition whitespace-nowrap'

  switch (item.type) {
    case 'Configurable Form':
    case 'Questionnaire':
      return (
        <button onClick={() => onFillForm(msId, item)} disabled={disabled} className={item.formResponse ? doneCls : btnCls}>
          {item.formResponse ? `${t('Edit Jawaban','Edit')}` : `${t('Isi Form','Fill Form')}`}
        </button>
      )

    case 'Electronic Signature':
      return (
        <button onClick={() => onSign(msId, item)} disabled={disabled} className={item.signatureData ? doneCls : btnCls}>
          {item.signatureData ? `${t('Lihat TTD','View')}` : `${t('Tandatangan','Sign')}`}
        </button>
      )

    case 'Document (Attachment)':
      return (
        <button onClick={() => onUpload(msId, item)} disabled={disabled} className={item.attachmentName ? doneCls : btnCls}>
          {item.attachmentName
            ? `${item.attachmentName.length > 16 ? item.attachmentName.slice(0,16)+'…' : item.attachmentName}`
            : `${t('Upload Dokumen','Upload')}`}
        </button>
      )

    case 'Video':
      return (
        <button onClick={() => onVideo(msId, item)} disabled={disabled} className={item.completed ? doneCls : btnCls}>
          {item.completed ? `${t('Ditonton','Watched')}` : `${t('Tonton Video','Watch Video')}`}
        </button>
      )

    case 'External URL':
      return item.link
        ? <a href={item.link} target='_blank' rel='noreferrer'
            className={btnCls} onClick={() => !item.completed && !disabled && onMark(msId, item.id)}>
            <Icon name='link' size={14} className='inline align-[-2px]' /> {t('Buka Link','Open Link')}
          </a>
        : <span className='text-gray-300 text-xs'>—</span>

    case 'Report':
      return item.link
        ? <a href={item.link} target='_blank' rel='noreferrer'
            className={btnCls} onClick={() => !item.completed && !disabled && onMark(msId, item.id)}>
            <Icon name='chart' size={14} className='inline align-[-2px]' /> {t('Lihat Laporan','View Report')}
          </a>
        : <span className='text-gray-300 text-xs'>—</span>

    case 'Application Task':
      return item.link
        ? <a href={item.link} target='_blank' rel='noreferrer'
            className={btnCls} onClick={() => !item.completed && !disabled && onMark(msId, item.id)}>
            <Icon name='cpu' size={14} className='inline align-[-2px]' /> {t('Buka Aplikasi','Open App')}
          </a>
        : <span className='text-gray-300 text-xs'>—</span>

    case 'Learning Course':
      return (
        <a href={item.link || '/ess/learning'} target={item.link ? '_blank' : '_self'} rel='noreferrer'
          className={item.completed ? doneCls : btnCls}
          onClick={() => !item.completed && !disabled && onMark(msId, item.id)}>
          <Icon name='book' size={14} className='inline align-[-2px]' /> {item.completed ? `${t('Selesai','Done')}` : t('Mulai Kursus','Start Course')}
        </a>
      )

    case 'Manual Task':
      return (
        <button onClick={() => !disabled && onMark(msId, item.id)} disabled={disabled || item.completed}
          className={item.completed ? doneCls : btnCls}>
          {item.completed ? `${t('Selesai','Done')}` : `${t('Tandai Selesai','Mark Done')}`}
        </button>
      )

    default:
      return item.link
        ? <a href={item.link} target='_blank' rel='noreferrer' className='text-red-600 hover:underline text-xs break-all'>{item.link}</a>
        : <span className='text-gray-300 text-xs'>—</span>
  }
}

// ── Misc helpers ──────────────────────────────────────────────────────────────
const isOverdue = (item) => {
  if (item.completed || !item.date) return false
  return new Date(item.date) < new Date(new Date().toDateString())
}

const STATUS_CLS = {
  Draft:       'bg-gray-100 text-gray-600',
  Preparation: 'bg-indigo-100 text-indigo-700',
  Active:      'bg-blue-100 text-blue-700',
  Pending:     'bg-yellow-100 text-yellow-700',
  Approved:    'bg-green-100 text-green-700',
  Completed:   'bg-green-100 text-green-700',
  Rejected:    'bg-red-100 text-red-700',
}
const SEC_COLORS = [
  { bg:'bg-blue-50',  text:'text-blue-700'  },
  { bg:'bg-red-50',   text:'text-red-700'   },
  { bg:'bg-amber-50', text:'text-amber-700' },
  { bg:'bg-green-50', text:'text-green-700' },
  { bg:'bg-rose-50',  text:'text-rose-700'  },
  { bg:'bg-teal-50',  text:'text-teal-700'  },
]
function toDateInput(val) {
  if (!val) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const d = new Date(val)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)
}
function migrateOnboarding(ob) {
  if (!ob) return ob
  if ((ob.mainSections??[]).length > 0) return ob
  const sections = []
  if ((ob.generalItems??[]).length>0||(ob.generalSections??[]).length>0)
    sections.push({id:'ms_general',type:'Onboarding General',sections:ob.generalSections??[],items:ob.generalItems??[]})
  if ((ob.technicalItems??[]).length>0||(ob.technicalSections??[]).length>0)
    sections.push({id:'ms_teknis',type:'Onboarding Teknis',sections:ob.technicalSections??[],items:ob.technicalItems??[]})
  if ((ob.reviewItems??[]).length>0)
    sections.push({id:'ms_review',type:'Evaluasi Berkala',sections:[],items:ob.reviewItems??[]})
  return {...ob, mainSections:sections}
}
function AgendaHead({ t }) {
  return (
    <thead>
      <tr style={{background:BRAND}}>
        {['NO',t('Tanggal','Date'),t('AGENDA','AGENDA'),'Type',t('Aksi','Action'),
          t('Nama Mentor','Mentor Name'),t('Posisi Mentor','Mentor Position'),t('Completed','Completed')].map((h,i)=>(
          <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap text-xs'
            style={{minWidth:i===2?180:i===4?160:i===7?80:i===0?40:100}}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}
function ReviewHead({ t }) {
  return (
    <thead>
      <tr style={{background:BRAND}}>
        {['NO',t('Tanggal','Date'),t('Agenda','Agenda'),t('Form','Form'),'Action',
          t('Nama Reviewer','Reviewer Name'),t('Posisi Reviewer','Reviewer Position'),t('Completed','Completed')].map((h,i)=>(
          <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap text-xs'
            style={{minWidth:i===2?200:i===3?140:i===4?100:i===7?80:i===0?40:100}}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}
function ProgressBar({ mainSections, t }) {
  const allItems  = (mainSections??[]).flatMap(ms=>ms.items??[])
  const selfItems = allItems.filter(i=>{ const v=i.assignedTo; return !v||v==='self'||v==='employee' })
  const total = selfItems.length
  const done  = selfItems.filter(i=>i.completed).length
  const pct   = total===0?0:Math.round((done/total)*100)
  return (
    <div className='mb-5'>
      <div className='flex justify-between items-center mb-1'>
        <span className='text-xs text-gray-500'>{t('Progress Onboarding','Onboarding Progress')}</span>
        <span className='text-xs font-bold text-red-700'>{done}/{total} ({pct}%)</span>
      </div>
      <div className='h-2.5 bg-gray-100 rounded-full overflow-hidden'>
        <div className='h-full rounded-full transition-all' style={{width:`${pct}%`,background:BRAND}} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EssOnboardingPage() {
  const t               = useT()
  const { currentUser } = useAuthStore()
  const { onboardings, updateOnboarding } = useOnboardingStore()

  const raw          = onboardings.find(o => o.employeeId === currentUser?.id) ?? null
  const myOnboarding = migrateOnboarding(raw)
  const status       = myOnboarding?.workflowStatus
  // Draft (HR still authoring) and Preparation (auto-assigned, pre-activation)
  // are both "being prepared" from the employee's point of view — distinct from
  // "Pending" which means the plan is finalised and waiting for approval.
  const isDraftPrep   = status === 'Draft' || status === 'Preparation'
  const isRejected    = status === 'Rejected'
  // Awaiting supervisor approval — employee cannot fill tasks yet.
  const isAwaitingApproval = status === 'Pending'
  const isCompleted   = status === 'Completed'
  const isActive      = myOnboarding && !isRejected && !isDraftPrep && !isAwaitingApproval && !isCompleted

  const [form,        setForm       ] = useState(null)
  const [saved,       setSaved      ] = useState(false)
  const [msg,         setMsg        ] = useState(null)
  const [fillModal,   setFillModal  ] = useState(null)
  const [signModal,   setSignModal  ] = useState(null)  // { msId, item }
  const [uploadModal, setUploadModal] = useState(null)  // { msId, item }
  const [videoModal,  setVideoModal ] = useState(null)  // { msId, item }

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  useEffect(() => {
    if (myOnboarding) setForm(JSON.parse(JSON.stringify(myOnboarding)))
  }, [myOnboarding?.id, myOnboarding?.workflowStatus])

  // Auto-persist: employee edits (date, checkbox) save to the store immediately,
  // just like the modal actions below — so nothing is lost if the employee
  // navigates away without pressing a Save button.
  const updItem = (msId, itemId, key, val) =>
    patchItemPersist(msId, itemId, { [key]: val })

  const patchItem = (msId, itemId, patch) =>
    setForm(f => ({...f, mainSections: f.mainSections.map(ms =>
      ms.id===msId ? {...ms, items:ms.items.map(i=>i.id===itemId?{...i,...patch}:i)} : ms
    )}))

  // Like patchItem but also persists to the store immediately. Used for modal
  // actions (sign / upload / fill form / watch video) so completed work is never
  // lost if the employee leaves before pressing "Simpan Perubahan".
  const patchItemPersist = (msId, itemId, patch) => {
    const mainSections = (form.mainSections ?? []).map(ms =>
      ms.id===msId ? {...ms, items:ms.items.map(i=>i.id===itemId?{...i,...patch}:i)} : ms)
    setForm(f => ({...f, mainSections}))
    updateOnboarding(form.id, { mainSections })
  }

  const markDone = (msId, itemId) => {
    patchItemPersist(msId, itemId, { completed: true, date: new Date().toISOString().slice(0,10) })
  }

  const handleSave = () => {
    if (!form) return
    updateOnboarding(form.id, { mainSections: form.mainSections })
    setSaved(true); setTimeout(()=>setSaved(false), 3000)
  }

  if (!myOnboarding) return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Onboarding Saya','My Onboarding')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Formulir induksi / onboarding karyawan.','Employee induction / onboarding form.')}</p>
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <div className='w-20 h-20 rounded-full flex items-center justify-center mb-4'
          style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
          <span className='text-gray-400'><Icon name='target' size={26} /></span>
        </div>
        <h2 className='text-xl font-bold text-gray-800 mb-2'>
          {t('Selamat Datang!', 'Welcome!')}
        </h2>
        <p className='text-sm text-gray-500 max-w-sm mb-6'>
          {t(
            'Program onboarding Anda belum tersedia. HR akan segera menyiapkan program onboarding sesuai posisi Anda.',
            'Your onboarding program is not yet available. HR will prepare your onboarding program according to your position.'
          )}
        </p>
        <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 max-w-sm text-left'>
          <p className='text-xs font-bold text-blue-700 mb-2'><Icon name='bulb' size={14} className='inline align-[-2px]' /> {t('Yang perlu disiapkan:', 'What to prepare:')}</p>
          <ul className='text-xs text-blue-600 space-y-1'>
            <li>• {t('Dokumen identitas (KTP, KK, NPWP)', 'Identity documents (ID card, family card, tax ID)')}</li>
            <li>• {t('Foto formal terbaru', 'Recent formal photo')}</li>
            <li>• {t('Rekening bank aktif', 'Active bank account')}</li>
            <li>• {t('Hubungi HR jika ada pertanyaan', 'Contact HR if you have questions')}</li>
          </ul>
        </div>
      </div>
    </div>
  )

  if (!form) return null

  if (isDraftPrep) return (
    <div>
      <div className='flex items-center justify-between mb-1'>
        <h1 className='text-2xl font-bold text-gray-800'>{t('Onboarding Saya','My Onboarding')}</h1>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${onboardingStage(status).cls}`}>{t(onboardingStage(status).id, onboardingStage(status).en)}</span>
      </div>
      <p className='text-gray-500 text-sm mb-5'>{t('Formulir induksi / onboarding karyawan.','Employee induction / onboarding form.')}</p>
      <div className='bg-white rounded-xl shadow-sm px-8 py-16 text-center'>
        <div className='text-gray-300 mb-4'><Icon name='calendar' size={40} /></div>
        <h2 className='text-lg font-bold text-gray-800 mb-2'>{t('Onboarding Anda sedang disiapkan','Your onboarding is being prepared')}</h2>
        <p className='text-gray-500 text-sm max-w-md mx-auto'>{t('HR dan atasan Anda sedang menyiapkan task onboarding. Semua task akan siap pada hari pertama kerja Anda.','HR and your manager are preparing your onboarding tasks. Everything will be ready on your first day.')}</p>
        {myOnboarding.buddyAssignment?.programStartDate && (
          <div className='mt-4 inline-block px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold'>
            <Icon name='calendar' size={14} className='inline align-[-2px]' /> {t('Mulai','Starts')}: {new Date(myOnboarding.buddyAssignment.programStartDate).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}
          </div>
        )}
      </div>
    </div>
  )

  if (isAwaitingApproval) return (
    <div>
      <div className='flex items-center justify-between mb-1'>
        <h1 className='text-2xl font-bold text-gray-800'>{t('Onboarding Saya','My Onboarding')}</h1>
        <span className='text-xs font-bold px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700'>{t('Menunggu Persetujuan','Pending Approval')}</span>
      </div>
      <p className='text-gray-500 text-sm mb-5'>{t('Formulir induksi / onboarding karyawan.','Employee induction / onboarding form.')}</p>
      <div className='bg-white rounded-xl shadow-sm px-8 py-14 text-center'>
        <div className='text-gray-300 mb-4'><Icon name='clock' size={40} /></div>
        <h2 className='text-lg font-bold text-gray-800 mb-2'>{t('Program onboarding menunggu persetujuan','Your onboarding is awaiting approval')}</h2>
        <p className='text-gray-500 text-sm max-w-md mx-auto mb-6'>{t('Program onboarding Anda sedang direview oleh HR dan atasan. Anda dapat mulai mengisi task setelah disetujui.','Your onboarding program is being reviewed by HR and your manager. You can start once it is approved.')}</p>
        <div className='flex flex-wrap justify-center gap-3'>
          {(myOnboarding.steps ?? []).map(step => {
            const done = step.status === 'Approved'
            const pending = step.status === 'Pending'
            return (
              <div key={step.level}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border ${done ? 'bg-green-50 text-green-700 border-green-200' : pending ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                {done ? <Icon name='check' size={14} className='inline align-[-2px]' /> : pending ? <Icon name='clock' size={14} className='inline align-[-2px]' /> : <Icon name='square' size={14} className='inline align-[-2px]' />} {step.label}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const mainSections = form.mainSections ?? []
  const isMgrTask = (item) => { const v=item.assignedTo; return v==='manager'||v==='hr'||(typeof v==='string'&&v.startsWith('emp:')) }

  // Shared action props
  const actionProps = (ms, item) => ({
    item, msId: ms.id,
    disabled: isRejected || isMgrTask(item),
    onFillForm: (msId, it) => setFillModal({ msId, item: it }),
    onSign:     (msId, it) => setSignModal({ msId, item: it }),
    onUpload:   (msId, it) => setUploadModal({ msId, item: it }),
    onVideo:    (msId, it) => setVideoModal({ msId, item: it }),
    onMark: markDone,
    t,
  })

  const renderCardItem = (item, ms) => {
    const mgrOnly = isMgrTask(item)
    const isHrTask = item.assignedTo === 'hr'
    return (
      <div key={item.id} className={`px-5 py-3 flex items-start gap-4 transition ${mgrOnly ? 'bg-gray-50 opacity-70' : item.completed ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
        {/* Checkbox / status circle */}
        <div className='mt-0.5 flex-shrink-0'>
          {mgrOnly ? (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isHrTask ? 'border-cyan-200 bg-cyan-50' : 'border-purple-200 bg-purple-50'}`}>
              <span className={`text-[10px] ${isHrTask ? 'text-cyan-400' : 'text-purple-400'}`}>{isHrTask ? 'H' : 'M'}</span>
            </div>
          ) : (
            <button
              disabled={isRejected || item.completed}
              onClick={() => !item.completed && markDone(ms.id, item.id)}
              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition
                ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-red-400'}`}
            >
              {item.completed && <span className='text-white'><Icon name='checkSmall' size={12} /></span>}
            </button>
          )}
        </div>

        {/* Task info */}
        <div className='flex-1 min-w-0'>
          <p className={`text-sm font-medium ${item.completed ? 'text-gray-400 line-through' : mgrOnly ? 'text-gray-500' : 'text-gray-800'}`}>
            {item.module || item.agenda || t('Task','Task')}
            {mgrOnly && (
              <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded font-semibold align-middle ${isHrTask ? 'bg-cyan-100 text-cyan-600' : 'bg-purple-100 text-purple-600'}`}>
                {isHrTask ? t('Dikerjakan oleh HR','HR Task') : t('Dikerjakan oleh Manager','Manager Task')}
              </span>
            )}
            {item.mandatory === false && (
              <span className='ml-1.5 text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded font-semibold align-middle'>{t('Opsional','Optional')}</span>
            )}
          </p>
          <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
            {item.type && <span className='text-xs text-gray-400'>{item.type}</span>}
            {item.date && (
              <span className={`text-xs ${isOverdue(item) ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                <Icon name='calendar' size={14} className='inline align-[-2px]' /> {item.date}
                {isOverdue(item) && <span className='ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold'>Terlambat</span>}
              </span>
            )}
            {item.mentorName && <span className='text-xs text-gray-400'><Icon name='user' size={14} className='inline align-[-2px]' /> {item.mentorName}{item.mentorPosition ? ` · ${item.mentorPosition}` : ''}</span>}
          </div>
          {item.description && <p className='text-xs text-gray-400 mt-1'>{item.description}</p>}
          {/* Editable date for non-rejected, non-manager tasks */}
          {!isRejected && !mgrOnly && (
            <div className='mt-1.5'>
              <input type='date' value={toDateInput(item.date||'')} onChange={e=>updItem(ms.id,item.id,'date',e.target.value)}
                className='px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white' />
            </div>
          )}
        </div>

        {/* Action button */}
        <div className='flex-shrink-0'>
          {!mgrOnly
            ? <ItemActionButton {...actionProps(ms, item)} />
            : <span className='text-gray-300 text-xs'>—</span>}
        </div>
      </div>
    )
  }

  return (
    <div className='pb-10'>
      {/* Modals */}
      {fillModal && (
        <FormFillModal item={fillModal.item} allSections={mainSections}
          evaluatorId={fillModal.evaluatorId ?? 'self'} evaluatorName={fillModal.evaluatorName ?? currentUser?.name ?? 'Saya'}
          onClose={() => setFillModal(null)}
          onSave={resp => {
            const submission = { evaluatorId: fillModal.evaluatorId??'self', evaluatorName: fillModal.evaluatorName??currentUser?.name??'Saya', submittedAt: new Date().toISOString(), response: resp }
            const prev = (fillModal.item.formSubmissions??[]).filter(s=>s.evaluatorId!==submission.evaluatorId)
            const newSubs = [...prev, submission]
            const evaluators = fillModal.item.evaluators??[]
            const allDone = evaluators.length===0||newSubs.length>=evaluators.length
            patchItemPersist(fillModal.msId, fillModal.item.id, { formSubmissions:newSubs, formResponse:resp, completed:allDone })
            setFillModal(null)
          }}
        />
      )}
      {signModal && (
        <SignatureModal item={signModal.item} t={t}
          onClose={() => setSignModal(null)}
          onSave={data => {
            patchItemPersist(signModal.msId, signModal.item.id, { signatureData:data, completed:true, date:new Date().toISOString().slice(0,10) })
            setSignModal(null)
          }}
        />
      )}
      {uploadModal && (
        <FileUploadModal item={uploadModal.item} t={t}
          onClose={() => setUploadModal(null)}
          onSave={file => {
            patchItemPersist(uploadModal.msId, uploadModal.item.id, { attachmentName:file.name, attachmentData:file.data, attachmentType:file.type, completed:true, date:new Date().toISOString().slice(0,10) })
            setUploadModal(null)
          }}
        />
      )}
      {videoModal && (
        <VideoModal item={videoModal.item} t={t}
          onClose={() => setVideoModal(null)}
          onMarkDone={() => patchItemPersist(videoModal.msId, videoModal.item.id, { completed:true, date:new Date().toISOString().slice(0,10) })}
        />
      )}

      {/* Flash message */}
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span>{msg.type === 'error' ? <Icon name='warning' size={14} /> : <Icon name='check' size={14} />}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className='flex items-center justify-between mb-1'>
        <h1 className='text-2xl font-bold text-gray-800'>{t('Onboarding Saya','My Onboarding')}</h1>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${onboardingStage(myOnboarding.workflowStatus).cls}`}>
          {t(onboardingStage(myOnboarding.workflowStatus).id, onboardingStage(myOnboarding.workflowStatus).en)}
        </span>
      </div>
      <p className='text-gray-500 text-sm mb-5'>{t('Formulir induksi / onboarding karyawan.','Employee induction / onboarding form.')}</p>

      {status==='Completed' ? (
        <div className='mb-5 rounded-xl px-5 py-3.5 text-sm font-medium border bg-green-50 border-green-200 text-green-700'>
          <Icon name='party' size={14} className='inline align-[-2px]' /> {t('Onboarding Anda telah selesai. Selamat bergabung!','Your onboarding is complete. Welcome aboard!')}
        </div>
      ) : status==='Approved' ? (
        <div className='mb-5 rounded-xl px-5 py-3.5 text-sm font-medium border bg-green-50 border-green-200 text-green-700'>
          <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Onboarding telah selesai diverifikasi.','Onboarding fully verified.')}
        </div>
      ) : isRejected ? (
        <div className='mb-5 rounded-xl px-5 py-3.5 text-sm font-medium border bg-red-50 border-red-200 text-red-700'>
          <div><Icon name='close' size={14} className='inline align-[-2px]' /> {t('Pengajuan onboarding ditolak. Hubungi HR.','Onboarding was rejected. Contact HR.')}</div>
          <div className='mt-1 text-xs text-red-600'>{t('HR akan melakukan revisi dan mengajukan ulang onboarding Anda.','HR will revise and resubmit your onboarding.')}</div>
        </div>
      ) : (
        <div className='mb-5 rounded-xl px-5 py-3.5 text-sm font-medium border bg-blue-50 border-blue-200 text-blue-700'>
          <Icon name='rocket' size={14} className='inline align-[-2px]' /> {t('Onboarding Anda sedang berjalan. Selesaikan tugas-tugas di bawah ini.','Your onboarding is in progress. Complete the tasks below.')}
        </div>
      )}
      {saved && (
        <div className='mb-4 rounded-lg px-4 py-2.5 bg-green-50 border border-green-200 text-green-600 text-sm'>
          <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Data berhasil disimpan.','Changes saved successfully.')}
        </div>
      )}

      <ProgressBar mainSections={mainSections} t={t} />

      <div className='bg-white rounded-xl shadow-sm overflow-hidden'>
        {/* Form header */}
        <div style={{background:BRAND}} className='px-6 py-4'>
          <h2 className='text-sm font-bold text-white mb-3'>{t('FORMULIR ONBOARDING / INDUKSI KARYAWAN','EMPLOYEE ONBOARDING / INDUCTION FORM')}</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3'>
            {[
              [t('Nama','Name'),                         myOnboarding.employeeName],
              ['NIK',                                      myOnboarding.nik||'—'],
              ['Department',                               myOnboarding.department||'—'],
              [t('Join Date','Join Date'),                myOnboarding.joinDate?String(myOnboarding.joinDate).slice(0,10):'—'],
              [t('Nama / Posisi Atasan','Supervisor'),    `${myOnboarding.supervisorName||'—'} / ${myOnboarding.supervisorPosition||'—'}`],
              [t('Status Karyawan','Employee Status'),    myOnboarding.employmentStatus],
              [t('Masa Probation/Orientasi','Probation'), `${myOnboarding.probationPeriod??'—'} ${t('Bulan','Month(s)')}`],
              [t('Contract No','Contract No'),            myOnboarding.contractNo||'—'],
              [t('Probation End Date','Probation End Date'), myOnboarding.probationEndDate||'—'],
            ].map(([label,val])=>(
              <div key={label} className='flex items-center gap-2'>
                <span className='text-xs text-red-200 w-36 flex-shrink-0'>{label} :</span>
                <span className='text-xs text-white font-semibold'>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic sections */}
        {mainSections.length===0 ? (
          <div className='px-6 py-12 text-center text-gray-400 text-sm'>{t('Belum ada materi onboarding.','No onboarding material yet.')}</div>
        ) : mainSections.map((ms) => {
          const isReview = ms.type === 'Evaluasi Berkala'

          if (isReview) {
            // Keep Periodic Review as a table inside a card with gradient header
            return (
              <div key={ms.id} className='px-6 pt-5 pb-4'>
                <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
                  <div className='px-5 py-3 flex items-center justify-between' style={{background:BRAND}}>
                    <h3 className='text-sm font-bold text-white'>{ms.type}</h3>
                    <span className='text-xs text-red-200'>
                      {(ms.items??[]).filter(i=>i.completed).length}/{(ms.items??[]).length} {t('selesai','done')}
                    </span>
                  </div>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-xs'>
                      <ReviewHead t={t} />
                      <tbody>
                        {(ms.items??[]).length===0
                          ? <tr><td colSpan={8} className='px-6 py-6 text-center text-gray-400 text-sm'>{t('Tidak ada data.','No data.')}</td></tr>
                          : (ms.items??[]).map((item,idx)=>(
                            <tr key={item.id} className={idx%2===0?'bg-white':'bg-gray-50/60'}>
                              <td className='px-3 py-1.5 text-center text-gray-500 font-medium w-8'>{idx+1}</td>
                              <td className='px-2 py-1.5 w-28'>
                                {!isRejected
                                  ? <input type='date' value={toDateInput(item.date||'')} onChange={e=>updItem(ms.id,item.id,'date',e.target.value)}
                                      className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white' />
                                  : <span className={`text-xs px-2 ${isOverdue(item) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>{item.date||<span className='text-gray-300'>—</span>}</span>}
                                {(item.frequency ?? 'once') !== 'once' && (
                                  <span className='text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block'>
                                    <Icon name='repeat' size={14} className='inline align-[-2px]' /> {frequencyLabel(item, t('id','en') === 'en')}
                                    {item.nextReviewDate && <span className='text-orange-400 ml-1'><Icon e='→' size={14} className='inline align-[-2px]' /> {item.nextReviewDate}</span>}
                                  </span>
                                )}
                                {isOverdue(item) && <span className='text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block'>Terlambat</span>}
                              </td>
                              <td className='px-3 py-1.5 text-gray-800'>{item.agenda||item.module||<span className='text-gray-300'>—</span>}</td>
                              <td className='px-3 py-1.5 text-gray-600 w-36 text-xs'>{item.masterFormName||item.type||<span className='text-gray-300'>—</span>}</td>
                              <td className='px-3 py-1.5 text-xs'>
                                {item.masterFormId ? (() => {
                                  const evaluators = item.evaluators??[]
                                  const myId = `emp:${currentUser?.id}`
                                  const canFill = evaluators.length===0||evaluators.some(e=>e.id==='self'||e.id===myId)
                                  const mySubmission = (item.formSubmissions??[]).find(s=>s.evaluatorId==='self'||s.evaluatorId===myId)
                                  const doneEval = (item.formSubmissions??[]).length
                                  return (
                                    <div className='flex items-center gap-1.5'>
                                      {canFill && (
                                        <button onClick={()=>setFillModal({msId:ms.id,item,evaluatorId:evaluators.some(e=>e.id===myId)?myId:'self',evaluatorName:currentUser?.name??'Saya'})}
                                          disabled={isRejected}
                                          className='px-3 py-1 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition disabled:opacity-40'>
                                          {mySubmission?'Edit':'Isi Form'}
                                        </button>
                                      )}
                                      {evaluators.length>0&&<span className='text-[10px] text-gray-400'>{doneEval}/{evaluators.length}</span>}
                                    </div>
                                  )
                                })() : <span className='text-gray-300'>—</span>}
                              </td>
                              <td className='px-3 py-1.5 text-gray-700 w-28'>{item.reviewerName||item.mentorName||<span className='text-gray-300'>—</span>}</td>
                              <td className='px-3 py-1.5 text-gray-600 w-28'>{item.reviewerPosition||item.mentorPosition||<span className='text-gray-300'>—</span>}</td>
                              <td className='px-3 py-1.5 text-center w-16'>
                                <input type='checkbox' checked={!!item.completed} onChange={e=>updItem(ms.id,item.id,'completed',e.target.checked)}
                                  disabled={isRejected} className='w-4 h-4 accent-red-600 disabled:cursor-not-allowed disabled:opacity-40' />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          }

          // Non-review sections: checklist card style
          const allItems = ms.items ?? []
          const hasSections = (ms.sections??[]).length > 0
          const sectionDone = allItems.filter(i => {
            const v = i.assignedTo; return (!v||v==='self'||v==='employee') && i.completed
          }).length
          const sectionTotal = allItems.filter(i => {
            const v = i.assignedTo; return !v||v==='self'||v==='employee'
          }).length

          return (
            <div key={ms.id} className='px-6 pt-5 pb-4'>
              <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
                {/* Section header */}
                <div className='px-5 py-3 flex items-center justify-between' style={{background:BRAND}}>
                  <h3 className='text-sm font-bold text-white'>{ms.type}</h3>
                  <span className='text-xs text-red-200'>
                    {sectionDone}/{sectionTotal} {t('selesai','done')}
                  </span>
                </div>

                {/* Items */}
                {!hasSections ? (
                  <div className='divide-y divide-gray-50'>
                    {allItems.length===0
                      ? <p className='px-5 py-6 text-center text-gray-400 text-sm'>{t('Tidak ada data.','No data.')}</p>
                      : allItems.map(item => renderCardItem(item, ms))}
                  </div>
                ) : (
                  (ms.sections??[]).map((sec, secIdx) => {
                    const cls  = SEC_COLORS[secIdx % SEC_COLORS.length]
                    const rows = allItems.filter(i => i.category === sec.id)
                    return (
                      <div key={sec.id} className='border-t border-gray-100 first:border-t-0'>
                        {/* Sub-section header */}
                        <div className={`px-5 py-2 ${cls.bg}`}>
                          <span className={`text-xs font-semibold ${cls.text}`}>{sec.label||'—'}</span>
                        </div>
                        <div className='divide-y divide-gray-50'>
                          {rows.length===0
                            ? <p className='px-5 py-3 text-center text-gray-300 text-xs italic'>{t('Tidak ada baris.','No rows.')}</p>
                            : rows.map(item => renderCardItem(item, ms))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}

        {/* Auto-save indicator — every change persists immediately, no manual save */}
        {isActive && (
          <div className='px-6 py-5 flex items-center gap-2 text-xs text-gray-400'>
            <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Perubahan tersimpan otomatis.','Changes are saved automatically.')}
          </div>
        )}

        {/* Selesaikan Onboarding */}
        {(() => {
          const allSelfDone = (() => {
            let allDone = true, hasAny = false
            ;(form.mainSections ?? []).forEach(ms => {
              ;[...(ms.items ?? []), ...(ms.sections ?? []).flatMap(s => s.items ?? [])].forEach(item => {
                if (item.assignedTo === 'self' || item.assignedTo === 'employee' || !item.assignedTo) {
                  hasAny = true
                  if (!item.completed) allDone = false
                }
              })
            })
            return hasAny && allDone
          })()
          return (myOnboarding.workflowStatus === 'Active' || myOnboarding.workflowStatus === 'Approved') && allSelfDone ? (
            <div className='mt-6 flex justify-center pb-4'>
              <button
                onClick={() => {
                  updateOnboarding(form.id, { workflowStatus: 'Completed', completedAt: new Date().toISOString() })
                  flash(t('Onboarding selesai! Selamat bergabung.', 'Onboarding complete! Welcome aboard.'))
                }}
                className='px-8 py-3 rounded-xl text-white font-semibold text-sm shadow-lg'
                style={{background:'linear-gradient(135deg,#052B52,#039299)'}}
              >
                <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Selesaikan Onboarding', 'Complete Onboarding')}
              </button>
            </div>
          ) : null
        })()}
      </div>
    </div>
  )
}
