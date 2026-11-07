'use client'
import Icon from '@/components/ui/Icon'
import { useId } from 'react'

// ── Zona 3 — Material & evaluation matrix ─────────────────────────────────────
// Shared between the onboarding tracker (execution: all columns editable) and the
// master template builder (templateMode: only material/category/type are defined;
// the execution/sign/evaluation columns are filled later during onboarding).
const INDUKSI_TIPE       = ['Initial', 'Refreshment', 'Re-training', 'External']
const INDUKSI_KESIMPULAN = ['Lulus', 'Remedial', 'Tidak Lulus']
const INDUKSI_KATEGORI   = ['Orientasi', 'SOP Teknikal', 'On the Job Training', 'Review']

function toDateInput(val) {
  if (!val) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const d = new Date(val)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const tt = (t, id, en) => (typeof t === 'function' ? t(id, en) : id)

export default function TechnicalMatrix({
  items = [], isReadOnly = false, templateMode = false, t, onItem, onAddItem, onDelItem,
}) {
  const listId = useId()
  const th   = 'text-white font-semibold px-2 py-1.5 text-center whitespace-nowrap border border-white/20'
  const td   = 'border border-gray-200 px-2 py-1 align-top'
  const grad = { background: 'linear-gradient(135deg,#052B52,#039299)' }
  const inp  = 'w-full px-1.5 py-1 border border-gray-200 rounded outline-none focus:border-red-400'
  const dis  = 'w-full px-1.5 py-1 border border-gray-100 rounded bg-gray-100 text-gray-300 cursor-not-allowed'
  const execEditable = !isReadOnly && !templateMode
  const defEditable  = !isReadOnly
  const set   = (id, key, val) => onItem(id, { [key]: val })
  const ncols = isReadOnly ? 10 : 11

  return (
    <div className='space-y-2'>
      <div className='overflow-x-auto rounded-lg border border-gray-200'>
        <table className='w-full text-xs border-collapse'>
          <thead>
            <tr style={grad}>
              <th className={th} rowSpan={2} style={{ minWidth: 32 }}>No</th>
              <th className={th} rowSpan={2} style={{ minWidth: 200 }}>{tt(t, 'Materi / Judul dokumen', 'Material / Document title')}</th>
              <th className={th} rowSpan={2} style={{ minWidth: 120 }}>{tt(t, 'Kategori / Bagian', 'Category / Section')}</th>
              <th className={th} rowSpan={2} style={{ minWidth: 110 }}>{tt(t, 'Tipe', 'Type')}</th>
              <th className={th} colSpan={2}>{tt(t, 'Pelaksanaan', 'Execution')}</th>
              <th className={th} colSpan={2}>Paraf</th>
              <th className={th} colSpan={2}>{tt(t, 'Evaluasi', 'Evaluation')}</th>
              {!isReadOnly && <th className={th} rowSpan={2} style={{ minWidth: 32 }} />}
            </tr>
            <tr style={grad}>
              <th className={th} style={{ minWidth: 120 }}>Trainer / SME</th>
              <th className={th} style={{ minWidth: 110 }}>{tt(t, 'Tanggal', 'Date')}</th>
              <th className={th} style={{ minWidth: 60 }}>Trainer</th>
              <th className={th} style={{ minWidth: 60 }}>Kary.</th>
              <th className={th} style={{ minWidth: 90 }}>{tt(t, 'Nilai / Level', 'Score / Level')}</th>
              <th className={th} style={{ minWidth: 120 }}>{tt(t, 'Kesimpulan', 'Conclusion')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className='px-4 py-6 text-center text-gray-400' colSpan={ncols}>{tt(t, 'Belum ada materi. Klik "+ Tambah baris".', 'No materials yet. Click "+ Add row".')}</td></tr>
            ) : items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 ? 'bg-gray-50/60' : 'bg-white'}>
                <td className={`${td} text-center text-gray-500 w-8`}>{idx + 1}</td>
                {/* Materi / Judul dokumen + kode dokumen */}
                <td className={td}>
                  {defEditable ? (
                    <>
                      <input value={item.module || ''} onChange={e => set(item.id, 'module', e.target.value)} placeholder={tt(t, 'Judul materi / dokumen', 'Material / document title')} className={inp} />
                      <input value={item.docCode || ''} onChange={e => set(item.id, 'docCode', e.target.value)} placeholder={tt(t, 'Kode dokumen (opsional)', 'Doc code (optional)')} className='w-full px-1.5 py-0.5 mt-0.5 text-[10px] text-gray-500 border border-gray-100 rounded outline-none focus:border-red-400' />
                    </>
                  ) : (
                    <div><p className='text-gray-800'>{item.module || '—'}</p>{item.docCode && <p className='text-[10px] text-gray-400'>{item.docCode}</p>}</div>
                  )}
                </td>
                {/* Kategori / Bagian */}
                <td className={td}>
                  {defEditable
                    ? <input list={listId} value={item.kategoriBagian || ''} onChange={e => set(item.id, 'kategoriBagian', e.target.value)} placeholder='—' className={inp} />
                    : <span className='text-gray-700'>{item.kategoriBagian || '—'}</span>}
                </td>
                {/* Tipe */}
                <td className={td}>
                  {defEditable
                    ? <select value={item.tipe || ''} onChange={e => set(item.id, 'tipe', e.target.value)} className={`${inp} bg-white`}><option value=''>—</option>{INDUKSI_TIPE.map(o => <option key={o} value={o}>{o}</option>)}</select>
                    : <span className='text-gray-700'>{item.tipe || '—'}</span>}
                </td>
                {/* Pelaksanaan — Trainer / SME */}
                <td className={td}>
                  {isReadOnly
                    ? <span className='text-gray-700'>{item.mentorName || '—'}</span>
                    : <input disabled={!execEditable} value={item.mentorName || ''} onChange={e => set(item.id, 'mentorName', e.target.value)} placeholder={templateMode ? '' : 'Trainer / SME'} className={execEditable ? inp : dis} />}
                </td>
                {/* Pelaksanaan — Tanggal */}
                <td className={td}>
                  {isReadOnly
                    ? <span className='text-gray-700'>{item.date || '—'}</span>
                    : <input type='date' disabled={!execEditable} value={toDateInput(item.date || '')} onChange={e => set(item.id, 'date', e.target.value)} className={execEditable ? inp : dis} />}
                </td>
                {/* Paraf — Trainer */}
                <td className={`${td} text-center`}>
                  {isReadOnly ? (item.parafTrainer ? <span className='text-green-600 font-bold'><Icon e='✓' size={15} /></span> : '—')
                    : <input type='checkbox' disabled={!execEditable} checked={!!item.parafTrainer} onChange={e => set(item.id, 'parafTrainer', e.target.checked)} className='w-4 h-4 accent-red-600 disabled:opacity-40' />}
                </td>
                {/* Paraf — Karyawan */}
                <td className={`${td} text-center`}>
                  {isReadOnly ? (item.parafKaryawan ? <span className='text-green-600 font-bold'><Icon e='✓' size={15} /></span> : '—')
                    : <input type='checkbox' disabled={!execEditable} checked={!!item.parafKaryawan} onChange={e => set(item.id, 'parafKaryawan', e.target.checked)} className='w-4 h-4 accent-red-600 disabled:opacity-40' />}
                </td>
                {/* Evaluasi — Nilai / Level */}
                <td className={td}>
                  {isReadOnly ? <span className='text-gray-700'>{item.nilai || '—'}</span>
                    : <input disabled={!execEditable} value={item.nilai || ''} onChange={e => set(item.id, 'nilai', e.target.value)} placeholder={execEditable ? '+ / 90 / Lvl 4' : ''} className={execEditable ? inp : dis} />}
                </td>
                {/* Evaluasi — Kesimpulan (drives completion) */}
                <td className={td}>
                  {isReadOnly ? <span className='text-gray-700'>{item.kesimpulan || '—'}</span>
                    : <select disabled={!execEditable} value={item.kesimpulan || ''} onChange={e => onItem(item.id, { kesimpulan: e.target.value, completed: e.target.value === 'Lulus' })} className={execEditable ? `${inp} bg-white` : dis}><option value=''>—</option>{INDUKSI_KESIMPULAN.map(o => <option key={o} value={o}>{o}</option>)}</select>}
                </td>
                {!isReadOnly && <td className={`${td} text-center`}><button onClick={() => onDelItem(item.id)} className='text-red-400 hover:text-red-600 font-bold'><Icon e='✕' size={15} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id={listId}>{INDUKSI_KATEGORI.map(k => <option key={k} value={k} />)}</datalist>
      </div>
      {!isReadOnly && (
        <button onClick={onAddItem} className='px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition'>+ {tt(t, 'Tambah baris', 'Add row')}</button>
      )}
      <p className='text-[11px] text-gray-500'>
        <span className='font-semibold'>Keterangan:</span> {tt(t, 'Tipe', 'Type')}: Initial / Refreshment / Re-training / External · {tt(t, 'Nilai', 'Score')}: {tt(t, 'skala', 'scale')} 0–100 {tt(t, 'atau', 'or')} Level 1–4 · {tt(t, 'Kesimpulan', 'Conclusion')}: Lulus / Remedial / Tidak Lulus
        {templateMode && <> · {tt(t, 'Kolom Pelaksanaan/Paraf/Evaluasi diisi saat onboarding berjalan', 'Execution/Sign/Evaluation columns are filled during onboarding')}</>}
      </p>
    </div>
  )
}
