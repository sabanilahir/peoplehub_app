'use client'
import { useState } from 'react'
import { useOvertimeStore } from '@/store/overtimeStore'
import { formatRp } from '@/store/payrollStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard,
  FormField, Input, ActionButton, StatusBadge, EmptyState,
} from '@/components/ui'

const BRAND = 'linear-gradient(135deg,#052B52,#039299)'
const blankTier = () => ({ hourFrom: '', hourTo: '', rate: '' })
const BLANK = { name: '', active: true, tiers: [blankTier()], restMinutes: 0, roundingToleranceMinutes: 45, notes: '' }

// Round an actual duration to whole overtime hours: minutes into the current
// hour count as the next full hour once they reach the tolerance, otherwise
// they're dropped. E.g. tolerance 45 → 50m rounds up to 1h, 1h44m stays at
// 1h, 1h46m rounds up to 2h.
const roundHours = (totalMinutes, toleranceMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const remainder = totalMinutes % 60
  return remainder >= toleranceMinutes ? hours + 1 : hours
}
const fmtDuration = (totalMinutes, t) => {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const parts = []
  if (h) parts.push(`${h} ${t('jam', 'hr')}`)
  if (m || !h) parts.push(`${m} ${t('menit', 'min')}`)
  return parts.join(' ')
}
const PREVIEW_MINUTES = [50, 104, 106]

export default function OvertimeMatrixPage() {
  const t = useT()
  const { overtimeMatrices, addMatrix, updateMatrix, deleteMatrix, nextTierId } = useOvertimeStore()

  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg, setMsg] = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const tierLabel = (tier) => tier.hourTo
    ? t(`Jam ke-${tier.hourFrom}${tier.hourTo !== tier.hourFrom ? `–${tier.hourTo}` : ''}`, `Hour ${tier.hourFrom}${tier.hourTo !== tier.hourFrom ? `–${tier.hourTo}` : ''}`)
    : t(`Jam ke-${tier.hourFrom} dst.`, `Hour ${tier.hourFrom}+`)

  const openNew = () => { setEditing(null); setForm(BLANK); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const openEdit = (m) => {
    setEditing(m.id)
    setForm({
      name: m.name, active: m.active,
      tiers: m.tiers.map(x => ({ id: x.id, hourFrom: String(x.hourFrom), hourTo: x.hourTo ? String(x.hourTo) : '', rate: String(x.rate) })),
      restMinutes: m.restMinutes, roundingToleranceMinutes: m.roundingToleranceMinutes ?? 45, notes: m.notes || '',
    })
    setShowModal(true)
  }

  const addTierRow = () => setForm(f => ({ ...f, tiers: [...f.tiers, blankTier()] }))
  const removeTierRow = (i) => setForm(f => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }))
  const updateTierRow = (i, patch) => setForm(f => ({ ...f, tiers: f.tiers.map((tr, idx) => idx === i ? { ...tr, ...patch } : tr) }))

  const handleSave = () => {
    if (!form.name.trim()) return flash(t('Nama matrix wajib diisi.', 'Matrix name is required.'), 'error')
    const validTiers = form.tiers.filter(tr => tr.hourFrom !== '' && tr.rate !== '')
    if (!validTiers.length) return flash(t('Tambahkan minimal 1 tier jam & rate.', 'Add at least 1 hour tier & rate.'), 'error')
    const tiers = validTiers.map(tr => ({
      id: tr.id ?? nextTierId(),
      hourFrom: Number(tr.hourFrom), hourTo: tr.hourTo === '' ? null : Number(tr.hourTo), rate: Number(tr.rate),
    }))
    const payload = {
      name: form.name.trim(), active: form.active, tiers,
      restMinutes: Number(form.restMinutes) || 0,
      roundingToleranceMinutes: Number(form.roundingToleranceMinutes) || 0,
      notes: form.notes.trim(),
    }
    if (editing) { updateMatrix(editing, payload); flash(t('Matrix diperbarui.', 'Matrix updated.')) }
    else         { addMatrix(payload);             flash(t('Matrix ditambahkan.', 'Matrix added.')) }
    closeModal()
  }

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='📐'
        title={t('Overtime Matrix', 'Overtime Matrix')}
        subtitle={t(
          'Rate lembur per jam (progresif per tier) dan durasi istirahat yang dikurangi dari perhitungan jam lembur.',
          'Per-hour overtime rates (progressive by tier) and the rest duration deducted when calculating overtime hours.',
        )}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <StatCard tone='brand' icon='📐' label={t('Total Matrix', 'Total Matrices')} value={String(overtimeMatrices.length)} />
        <StatCard tone='green' icon='✅' label={t('Matrix Aktif', 'Active Matrices')} value={String(overtimeMatrices.filter(m => m.active).length)} />
      </div>

      <div className='mb-4 flex justify-end'>
        <button onClick={openNew}
          className='flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90'
          style={{ background: BRAND }}>
          + {t('Tambah Matrix', 'Add Matrix')}
        </button>
      </div>

      {overtimeMatrices.length === 0 ? (
        <SectionCard bodyClass='p-0'>
          <div className='p-5'>
            <EmptyState icon='📐' title={t('Belum ada Overtime Matrix.', 'No Overtime Matrix yet.')}
              description={t('Tambahkan matrix pertama untuk mengatur rate lembur.', 'Add your first matrix to configure overtime rates.')} />
          </div>
        </SectionCard>
      ) : (
        <div className='flex flex-col gap-4'>
          {overtimeMatrices.map(m => (
            <SectionCard key={m.id} title={m.name} icon='📐'
              subtitle={t(
                `Istirahat dikurangi: ${m.restMinutes} menit · Toleransi pembulatan: ${m.roundingToleranceMinutes ?? 45} menit`,
                `Rest deducted: ${m.restMinutes} minutes · Rounding tolerance: ${m.roundingToleranceMinutes ?? 45} minutes`,
              )}
              actions={
                <div className='flex items-center gap-2'>
                  <StatusBadge tone={m.active ? 'success' : 'neutral'}>{m.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}</StatusBadge>
                  <ActionButton size='sm' variant='secondary' onClick={() => openEdit(m)}>{t('Edit', 'Edit')}</ActionButton>
                  <button onClick={() => { deleteMatrix(m.id); flash(t('Matrix dihapus.', 'Matrix deleted.')) }}
                    className='rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100'>
                    {t('Hapus', 'Delete')}
                  </button>
                </div>
              }
            >
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {m.tiers.map(tr => (
                  <div key={tr.id} className='rounded-xl bg-gray-50 px-3 py-2.5 text-center'>
                    <p className='text-xs text-gray-500'>{tierLabel(tr)}</p>
                    <p className='text-sm font-bold text-gray-800'>{formatRp(tr.rate)}<span className='text-xs font-normal text-gray-400'>/{t('jam', 'hr')}</span></p>
                  </div>
                ))}
              </div>
              {m.notes && <p className='mt-3 text-xs text-gray-400'>{m.notes}</p>}
            </SectionCard>
          ))}
        </div>
      )}

      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeModal}>
          <div className='w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4'>
              <h2 className='text-base font-bold text-gray-800'>
                {editing ? t('Edit Overtime Matrix', 'Edit Overtime Matrix') : t('Tambah Overtime Matrix', 'Add Overtime Matrix')}
              </h2>
              <button onClick={closeModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-4 px-6 py-5'>
              <FormField label={t('Nama Matrix', 'Matrix Name')} required>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('mis. Matrix Standar — Hari Kerja', 'e.g. Standard Matrix — Weekdays')} />
              </FormField>

              <div>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-xs font-semibold text-gray-600'>{t('Tier Jam & Rate', 'Hour Tiers & Rate')}</span>
                  <button type='button' onClick={addTierRow} className='text-xs font-bold text-teal-700 hover:underline'>
                    + {t('Tambah Tier', 'Add Tier')}
                  </button>
                </div>
                <div className='space-y-2'>
                  {form.tiers.map((tr, i) => (
                    <div key={i} className='grid grid-cols-[1fr_1fr_1.3fr_auto] items-center gap-2'>
                      <Input type='number' min='1' placeholder={t('Jam dari', 'From hr')} value={tr.hourFrom}
                        onChange={e => updateTierRow(i, { hourFrom: e.target.value })} />
                      <Input type='number' min='1' placeholder={t('s/d (kosong=dst)', 'to (blank=+)')} value={tr.hourTo}
                        onChange={e => updateTierRow(i, { hourTo: e.target.value })} />
                      <Input type='number' min='0' placeholder={t('Rate/jam (Rp)', 'Rate/hr (Rp)')} value={tr.rate}
                        onChange={e => updateTierRow(i, { rate: e.target.value })} />
                      <button type='button' onClick={() => removeTierRow(i)} disabled={form.tiers.length === 1}
                        className='rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30'>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className='mt-1.5 text-xs text-gray-400'>
                  {t('Kosongkan "s/d" untuk tier terbuka (mis. jam ke-2 dan seterusnya).', 'Leave "to" blank for an open-ended tier (e.g. hour 2 and beyond).')}
                </p>
              </div>

              <FormField label={t('Durasi Istirahat (menit)', 'Rest Duration (minutes)')}
                hint={t('Dikurangi dari total durasi saat menghitung jam lembur.', 'Deducted from the total span when calculating overtime hours.')}>
                <Input type='number' min='0' value={form.restMinutes} onChange={e => setForm(f => ({ ...f, restMinutes: e.target.value }))} />
              </FormField>

              <FormField label={t('Toleransi Pembulatan (menit)', 'Rounding Tolerance (minutes)')}
                hint={t('Menit ke jam berjalan yang sudah dianggap genap 1 jam berikutnya; di bawah itu dibulatkan ke bawah.',
                        'Minutes into the current hour that already count as the next full hour; below that, it rounds down.')}>
                <Input type='number' min='0' max='59' value={form.roundingToleranceMinutes}
                  onChange={e => setForm(f => ({ ...f, roundingToleranceMinutes: e.target.value }))} />
              </FormField>

              {form.roundingToleranceMinutes !== '' && (
                <div className='rounded-xl bg-gray-50 p-3'>
                  <p className='mb-2 text-xs font-semibold text-gray-600'>{t('Contoh Pembulatan', 'Rounding Example')}</p>
                  <div className='grid grid-cols-3 gap-2 text-center'>
                    {PREVIEW_MINUTES.map(mins => (
                      <div key={mins} className='rounded-lg bg-white px-2 py-2 ring-1 ring-gray-100'>
                        <p className='text-xs text-gray-500'>{fmtDuration(mins, t)}</p>
                        <p className='text-sm font-bold text-teal-700'>
                          → {roundHours(mins, Number(form.roundingToleranceMinutes) || 0)} {t('jam', 'hr')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FormField label='Status'>
                <div className='flex items-center gap-3'>
                  <button type='button' onClick={() => setForm(f => ({ ...f, active: true }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${form.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t('Aktif', 'Active')}
                  </button>
                  <button type='button' onClick={() => setForm(f => ({ ...f, active: false }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!form.active ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t('Nonaktif', 'Inactive')}
                  </button>
                </div>
              </FormField>

              <FormField label={t('Catatan', 'Notes')}>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </FormField>
            </div>
            <div className='flex gap-3 px-6 pb-5'>
              <ActionButton onClick={handleSave} className='flex-1' icon='💾'>{t('Simpan', 'Save')}</ActionButton>
              <ActionButton variant='secondary' onClick={closeModal} className='flex-1'>{t('Batal', 'Cancel')}</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
