'use client'
import { useState } from 'react'
import { useStructureStore } from '@/store/structureStore'
import {
  useLeaderboardSettingStore, DEFAULT_CONFIG, RESET_PERIODS, RANKING_BASIS,
  SEGMENT_SCOPES, VISIBILITY_MODES, TIE_BREAKERS, REFRESH_MODES, ANCHOR_MODES, MONTHS,
} from '@/store/leaderboardSettingStore'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton,
  EmptyState, Select, Input, FormField,
} from '@/components/ui'

const PERIOD_LABEL = Object.fromEntries(RESET_PERIODS.map(p => [p.value, p.label]))
const PERIOD_TONE  = { never:'neutral', weekly:'info', monthly:'success', quarterly:'warning', yearly:'danger' }

// Toggle switch selaras dengan design system.
function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className='flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3'>
      <span>
        <span className='block text-sm font-medium text-gray-700'>{label}</span>
        {hint && <span className='mt-0.5 block text-xs text-gray-400'>{hint}</span>}
      </span>
      <button type='button' onClick={()=>onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${checked?'bg-emerald-500':'bg-gray-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked?'left-[22px]':'left-0.5'}`} />
      </button>
    </label>
  )
}

// Semua field konfigurasi — dipakai untuk Global Default & modal per-company.
function ConfigFields({ cfg, set }) {
  const showAnchor = cfg.resetPeriod === 'quarterly' || cfg.resetPeriod === 'yearly'
  return (
    <div className='space-y-6'>
      {/* Reset & Ranking */}
      <div>
        <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Reset & Ranking</h3>
        <div className='grid gap-3 sm:grid-cols-2'>
          <FormField label='Reset Period' hint={RESET_PERIODS.find(p=>p.value===cfg.resetPeriod)?.desc}>
            <Select value={cfg.resetPeriod} onChange={e=>set('resetPeriod', e.target.value)}>
              {RESET_PERIODS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </FormField>
          {showAnchor && (
            <FormField label='Reset Anchor' hint='Berbasis kalender atau tahun fiskal'>
              <Select value={cfg.anchor} onChange={e=>set('anchor', e.target.value)}>
                {ANCHOR_MODES.map(a=><option key={a}>{a}</option>)}
              </Select>
            </FormField>
          )}
          {showAnchor && cfg.anchor === 'Fiscal Year' && (
            <FormField label='Bulan Mulai Fiscal Year'>
              <Select value={cfg.fiscalStart} onChange={e=>set('fiscalStart', Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
              </Select>
            </FormField>
          )}
          <FormField label='Ranking Basis' hint='Poin periode berjalan atau akumulatif'>
            <Select value={cfg.rankingBasis} onChange={e=>set('rankingBasis', e.target.value)}>
              {RANKING_BASIS.map(r=><option key={r}>{r}</option>)}
            </Select>
          </FormField>
          <FormField label='Segmentasi (Scope)' hint='Pengelompokan peringkat'>
            <Select value={cfg.scope} onChange={e=>set('scope', e.target.value)}>
              {SEGMENT_SCOPES.map(s=><option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label='Tampilkan Top-N' hint='Jumlah peringkat teratas ditampilkan'>
            <Input type='number' min={1} value={cfg.topN} onChange={e=>set('topN', Number(e.target.value)||1)} />
          </FormField>
          <FormField label='Tie-breaker' hint='Penentu saat poin sama'>
            <Select value={cfg.tieBreaker} onChange={e=>set('tieBreaker', e.target.value)}>
              {TIE_BREAKERS.map(t=><option key={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label='Frekuensi Refresh'>
            <Select value={cfg.refresh} onChange={e=>set('refresh', e.target.value)}>
              {REFRESH_MODES.map(r=><option key={r}>{r}</option>)}
            </Select>
          </FormField>
        </div>
      </div>

      {/* Visibility & Privacy */}
      <div>
        <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Visibilitas & Privasi</h3>
        <div className='grid gap-3 sm:grid-cols-2'>
          <FormField label='Mode Visibilitas' hint='Named / Anonim / Opt-in'>
            <Select value={cfg.visibility} onChange={e=>set('visibility', e.target.value)}>
              {VISIBILITY_MODES.map(v=><option key={v}>{v}</option>)}
            </Select>
          </FormField>
          <FormField label='Minimum Poin untuk Tampil'>
            <Input type='number' min={0} value={cfg.minPoints} onChange={e=>set('minPoints', Number(e.target.value)||0)} />
          </FormField>
        </div>
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          <Toggle checked={cfg.showCurrentUser} onChange={v=>set('showCurrentUser', v)} label='Selalu tampilkan rank saya' hint='User selalu melihat posisinya walau di luar Top-N' />
          <Toggle checked={cfg.allowOptOut} onChange={v=>set('allowOptOut', v)} label='Izinkan opt-out' hint='User boleh keluar dari leaderboard' />
        </div>
      </div>

      {/* Eligibility */}
      <div>
        <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Kelayakan Peserta</h3>
        <div className='grid gap-3 sm:grid-cols-2'>
          <Toggle checked={cfg.excludeManagers} onChange={v=>set('excludeManagers', v)} label='Kecualikan Manager & Admin' hint='Hanya karyawan yang masuk ranking' />
        </div>
      </div>

      {/* Badges & Levels */}
      <div>
        <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Badge & Level</h3>
        <div className='grid gap-3 sm:grid-cols-2'>
          <Toggle checked={cfg.showBadges} onChange={v=>set('showBadges', v)} label='Tampilkan Badge' />
          <Toggle checked={cfg.showLevels} onChange={v=>set('showLevels', v)} label='Tampilkan Level' />
        </div>
      </div>

      {/* Rewards & Seasons */}
      <div>
        <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Reward & Season</h3>
        <Toggle checked={cfg.archiveOnReset} onChange={v=>set('archiveOnReset', v)} label='Arsipkan & simpan histori saat reset' hint='Snapshot peringkat tiap akhir periode (Season)' />
        <div className='mt-3 grid gap-3 sm:grid-cols-3'>
          <FormField label='Reward Juara Top-N'>
            <Input type='number' min={0} value={cfg.rewardTopN} onChange={e=>set('rewardTopN', Number(e.target.value)||0)} />
          </FormField>
          <FormField label='Badge Reward'>
            <Input value={cfg.rewardBadge} onChange={e=>set('rewardBadge', e.target.value)} placeholder='mis. Season Champion' />
          </FormField>
          <FormField label='Bonus Poin Juara'>
            <Input type='number' min={0} value={cfg.rewardPoints} onChange={e=>set('rewardPoints', Number(e.target.value)||0)} />
          </FormField>
        </div>
      </div>

      {/* Advanced */}
      <div>
        <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Lanjutan</h3>
        <Toggle checked={cfg.pointDecay} onChange={v=>set('pointDecay', v)} label='Point Decay' hint='Poin lama meluruh agar leaderboard tetap kompetitif' />
        {cfg.pointDecay && (
          <div className='mt-3 sm:w-1/2'>
            <FormField label='Decay setelah (hari)'>
              <Input type='number' min={1} value={cfg.decayDays} onChange={e=>set('decayDays', Number(e.target.value)||1)} />
            </FormField>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LeaderboardSettingPage() {
  const { companies } = useStructureStore()
  const { global, overrides, setGlobal, resetGlobal, setCompany, clearCompany, effectiveConfig } = useLeaderboardSettingStore()

  const [gForm, setGForm] = useState(null)   // draft global (null = sinkron dgn store)
  const [modal, setModal] = useState(null)   // { company, cfg }
  const [msg,   setMsg]   = useState(null)
  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const draftG = gForm ?? global
  const setG = (k, v) => setGForm({ ...draftG, [k]: v })
  const saveGlobal = () => { if (gForm) setGlobal(gForm); setGForm(null); flash('Global default leaderboard tersimpan.') }
  const cancelGlobal = () => setGForm(null)

  const openCompany = (company) => setModal({ company, cfg: effectiveConfig(company.id) })
  const setM = (k, v) => setModal(m => ({ ...m, cfg: { ...m.cfg, [k]: v } }))
  const saveCompany = () => { setCompany(modal.company.id, modal.cfg); flash(`Setting ${modal.company.name} tersimpan.`); setModal(null) }
  const useDefault = (company) => { clearCompany(company.id); flash(`${company.name} kembali ke Global Default.`) }

  const activeCompanies = companies.filter(c => c.status === 'Active')

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${msg.type==='error'?'bg-red-600 text-white':'bg-gray-900 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      <PageHeader icon='⚙️' title='Leaderboard Setting'
        subtitle='Atur perilaku leaderboard: periode reset (bulanan/kuartalan/tahunan), ranking, visibilitas, reward, dan lainnya — global maupun per-company.' />

      {/* Per-Company overview */}
      <SectionCard title={`Konfigurasi per Company (${activeCompanies.length})`} bodyClass='p-0' className='mb-6'>
        {activeCompanies.length === 0 ? (
          <div className='p-6'><EmptyState title='Belum ada company.' /></div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0'
            columns={['Company', 'Reset Period', 'Ranking', 'Scope', 'Reward', 'Sumber', {label:'Aksi',align:'right'}]}>
            {activeCompanies.map(c => {
              const cfg = effectiveConfig(c.id)
              const custom = overrides[c.id] != null
              return (
                <Tr key={c.id}>
                  <Td>
                    <div className='font-medium text-gray-800'>{c.name}</div>
                    <div className='font-mono text-[11px] text-gray-400'>{c.companyCode || c.code}</div>
                  </Td>
                  <Td>
                    {cfg.enabled
                      ? <StatusBadge tone={PERIOD_TONE[cfg.resetPeriod]||'neutral'}>{PERIOD_LABEL[cfg.resetPeriod]}</StatusBadge>
                      : <StatusBadge tone='neutral'>Nonaktif</StatusBadge>}
                  </Td>
                  <Td className='text-xs text-gray-600'>{cfg.rankingBasis}</Td>
                  <Td className='text-xs text-gray-600'>{cfg.scope}</Td>
                  <Td className='text-xs text-gray-600'>{cfg.archiveOnReset ? `Top ${cfg.rewardTopN} · +${cfg.rewardPoints}` : '—'}</Td>
                  <Td>
                    {custom
                      ? <StatusBadge tone='info'>Custom</StatusBadge>
                      : <StatusBadge tone='neutral'>Default</StatusBadge>}
                  </Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-1.5'>
                      <ActionButton size='sm' variant='secondary' onClick={()=>openCompany(c)}>Atur</ActionButton>
                      {custom && <button onClick={()=>useDefault(c)} className='px-2 text-xs font-semibold text-gray-400 hover:text-red-600'>Pakai Default</button>}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>

      {/* Global default */}
      <SectionCard title='Global Default' icon='🌐'
        subtitle='Berlaku untuk semua company yang belum memiliki konfigurasi khusus.'
        actions={
          <div className='flex items-center gap-2'>
            {gForm && <button onClick={cancelGlobal} className='rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200'>Batal</button>}
            <button onClick={()=>{ setGForm({ ...DEFAULT_CONFIG }); }} className='rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50'>Reset ke Bawaan</button>
            <button onClick={saveGlobal} className='rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>Simpan Global</button>
          </div>
        }>
        <div className='mb-5'>
          <Toggle checked={draftG.enabled} onChange={v=>setG('enabled', v)} label='Aktifkan Leaderboard' hint='Nonaktifkan untuk menyembunyikan leaderboard di semua modul' />
        </div>
        <ConfigFields cfg={draftG} set={setG} />
      </SectionCard>

      {/* Per-company modal */}
      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={()=>setModal(null)}>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>Leaderboard — {modal.company.name}</h2>
                <p className='text-xs text-gray-400'>{modal.company.companyCode || modal.company.code}</p>
              </div>
              <button onClick={()=>setModal(null)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='px-6 py-5'>
              <div className='mb-5'>
                <Toggle checked={modal.cfg.enabled} onChange={v=>setM('enabled', v)} label='Aktifkan Leaderboard untuk company ini' />
              </div>
              <ConfigFields cfg={modal.cfg} set={setM} />
            </div>
            <div className='sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={saveCompany} className='flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>Simpan Konfigurasi</button>
              <button onClick={()=>setModal(null)} className='flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
