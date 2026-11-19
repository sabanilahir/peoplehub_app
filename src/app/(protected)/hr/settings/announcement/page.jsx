'use client'
import { useState } from 'react'
import {
  useAnnouncementStore,
  ANNOUNCEMENT_CATEGORIES,
  CATEGORY_TONE,
  PRIORITY_CONFIG,
  DISPLAY_MODES,
  TARGET_ROLE_OPTIONS,
  TARGET_LOCATION_OPTIONS,
  announcementStatus,
} from '@/store/announcementStore'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, SearchBar,
  ActionButton, StatusBadge, EmptyState, FormField, Input, Select, inputClass,
} from '@/components/ui'

const STATUS_TONE = {
  Aktif:       'success',
  Terjadwal:   'info',
  Kedaluwarsa: 'neutral',
  Nonaktif:    'neutral',
}

const EMPTY_FORM = {
  title: '',
  body: '',
  category: 'Umum',
  pinned: false,
  active: true,
  startDate: '',
  endDate: '',
  targetRoles: ['*'],
  targetDepartments: ['*'],
  targetLocations: ['*'],
  priority: 'normal',
  displayMode: 'card',
  requireAck: false,
  acknowledgedBy: [],
}

export default function AnnouncementSettingsPage() {
  const t = useT()
  const { announcements, addAnnouncement, updateAnnouncement, removeAnnouncement } = useAnnouncementStore()
  const { departments } = useStructureStore()

  const [q, setQ] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [modal, setModal] = useState(null) // { mode:'add'|'edit', id?, form }
  const [flash, setFlash] = useState('')

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  const openAdd  = () => setModal({ mode: 'add', form: { ...EMPTY_FORM } })
  const openEdit = (a) => setModal({
    mode: 'edit',
    id: a.id,
    form: {
      ...EMPTY_FORM,
      ...a,
      targetRoles: a.targetRoles || ['*'],
      targetDepartments: a.targetDepartments || ['*'],
      targetLocations: a.targetLocations || ['*'],
      priority: a.priority || 'normal',
      displayMode: a.displayMode || 'card',
      requireAck: Boolean(a.requireAck),
      acknowledgedBy: a.acknowledgedBy || [],
    },
  })
  const close    = () => setModal(null)
  const setField = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))

  // Helper untuk menyisipkan variabel dinamis ke teks body
  const insertVariable = (varName) => {
    if (!modal) return
    const currentBody = modal.form.body || ''
    setField({ body: currentBody + (currentBody ? ' ' : '') + varName })
  }

  const save = () => {
    const f = modal.form
    if (!f.title.trim()) return
    // An end date before the start date would silently never display.
    if (f.startDate && f.endDate && f.endDate < f.startDate) return

    if (modal.mode === 'add') {
      addAnnouncement(f)
      say(t('Pengumuman terparameterisasi berhasil ditambahkan.', 'Parameterized announcement added.'))
    } else {
      updateAnnouncement(modal.id, f)
      say(t('Pengumuman berhasil diperbarui.', 'Announcement updated.'))
    }
    close()
  }

  const del = (a) => {
    if (!window.confirm(t(`Hapus pengumuman "${a.title}"?`, `Delete announcement "${a.title}"?`))) return
    removeAnnouncement(a.id)
    say(t('Pengumuman dihapus.', 'Announcement deleted.'))
  }

  const needle = q.trim().toLowerCase()
  const rows = [...announcements]
    .filter(a => {
      if (filterCategory !== 'all' && a.category !== filterCategory) return false
      if (filterPriority !== 'all' && (a.priority || 'normal') !== filterPriority) return false
      if (!needle) return true
      return a.title.toLowerCase().includes(needle) || a.body.toLowerCase().includes(needle)
    })
    .sort((a, b) => {
      const pWeight = { urgent: 3, important: 2, normal: 1 }
      const pDiff = (pWeight[b.priority] || 1) - (pWeight[a.priority] || 1)
      if (pDiff !== 0) return pDiff
      return (b.pinned - a.pinned) || String(b.createdAt).localeCompare(String(a.createdAt))
    })

  const liveCount = announcements.filter(a => announcementStatus(a) === 'Aktif').length
  const urgentCount = announcements.filter(a => a.priority === 'urgent' && announcementStatus(a) === 'Aktif').length
  const scheduled = announcements.filter(a => announcementStatus(a) === 'Terjadwal').length

  const dateRangeInvalid = modal?.form.startDate && modal?.form.endDate
    && modal.form.endDate < modal.form.startDate

  // List unique departemen dari structureStore + departemen populer
  const deptList = Array.from(new Set([
    'Gudang',
    'Livestream',
    'Sales',
    'Operations',
    'HR/GA',
    'Engineering',
    'IT',
    'FAT',
    ...(departments || []).map(d => d.name).filter(Boolean),
  ])).sort()

  return (
    <div>
      <PageHeader
        icon='📢'
        title='Pengumuman Dashboard (Parameterized)'
        subtitle={t(
          'Kelola pengumuman terparameterisasi dengan filter audiens (Role/Dept/Lokasi), variabel teks ({name}, {dept}), prioritas, dan konfirmasi baca.',
          'Manage parameterized announcements with audience targeting, dynamic variables, priority, and read confirmation.',
        )}
        actions={
          <div className='flex items-center gap-3'>
            {flash && (
              <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 animate-fade-in'>
                {flash}
              </span>
            )}
            <ActionButton onClick={openAdd} icon='➕'>{t('Tambah Pengumuman', 'Add Announcement')}</ActionButton>
          </div>
        }
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <StatCard icon='📢' tone='brand' label={t('Total Pengumuman', 'Total')} value={String(announcements.length)} />
        <StatCard icon='✅' tone='green' label={t('Sedang Tampil', 'Live Now')} value={String(liveCount)} />
        <StatCard icon='🚨' tone='danger' label={t('Prioritas Darurat', 'Urgent')} value={String(urgentCount)} />
        <StatCard icon='🗓️' tone='blue'  label={t('Terjadwal', 'Scheduled')} value={String(scheduled)} />
      </div>

      {/* Filter Bar */}
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex-1 max-w-md'>
          <SearchBar value={q} onChange={setQ} placeholder={t('Cari judul atau isi pengumuman…', 'Search title or body…')} />
        </div>
        <div className='flex items-center gap-2'>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className='rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-red-500 focus:outline-none'
          >
            <option value='all'>Semua Kategori</option>
            {ANNOUNCEMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className='rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-red-500 focus:outline-none'
          >
            <option value='all'>Semua Prioritas</option>
            <option value='normal'>Normal</option>
            <option value='important'>Penting (Important)</option>
            <option value='urgent'>Darurat (Urgent)</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon='📢'
          title={t('Belum ada pengumuman', 'No announcements yet')}
          description={t('Tambah pengumuman dengan parameter audiens dan variabel dinamis untuk ditampilkan di Dashboard karyawan.', 'Add one to show it on employees’ Dashboard.')}
          action={<ActionButton onClick={openAdd} icon='➕'>{t('Tambah', 'Add')}</ActionButton>}
        />
      ) : (
        <DataTable columns={[
          { label: t('Judul & Isi Pengumuman', 'Title & Body') },
          { label: t('Kategori & Prioritas', 'Category & Priority'), align: 'center' },
          { label: t('Target Audiens (Parameter)', 'Target Audience'), align: 'left' },
          { label: t('Periode Tampil', 'Period'), align: 'center' },
          { label: t('Konfirmasi', 'Acknowledge'), align: 'center' },
          { label: 'Status', align: 'center' },
          { label: '', align: 'right', width: 120 },
        ]}>
          {rows.map(a => {
            const status = announcementStatus(a)
            const prio = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal
            const acksCount = (a.acknowledgedBy || []).length

            // Format target labels
            const roleStr = (!a.targetRoles || a.targetRoles.includes('*'))
              ? 'Semua Role'
              : a.targetRoles.join(', ')
            const deptStr = (!a.targetDepartments || a.targetDepartments.includes('*'))
              ? 'Semua Dept'
              : a.targetDepartments.join(', ')
            const locStr = (!a.targetLocations || a.targetLocations.includes('*'))
              ? 'Semua Lokasi'
              : a.targetLocations.join(', ')

            return (
              <Tr key={a.id}>
                <Td>
                  <div className='flex items-start gap-1.5'>
                    {a.pinned && <span title={t('Disematkan', 'Pinned')} className='text-sm leading-none'>📌</span>}
                    <div>
                      <p className='font-semibold text-gray-800 text-sm'>
                        {a.title}
                      </p>
                      <p className='mt-0.5 line-clamp-2 text-xs text-gray-500 font-mono bg-gray-50/80 p-1 rounded border border-gray-100'>
                        {a.body}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td align='center'>
                  <div className='flex flex-col items-center gap-1'>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_TONE[a.category] || CATEGORY_TONE.Umum}`}>
                      {a.category}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${prio.badgeClass}`}>
                      {prio.label}
                    </span>
                    {a.displayMode && a.displayMode !== 'card' && (
                      <span className='rounded bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 font-medium border border-indigo-200'>
                        {DISPLAY_MODES[a.displayMode] || a.displayMode}
                      </span>
                    )}
                  </div>
                </Td>
                <Td align='left'>
                  <div className='text-xs space-y-0.5 text-gray-600'>
                    <div className='flex items-center gap-1'>
                      <span className='font-semibold text-gray-400 text-[11px] w-12'>Role:</span>
                      <span className='rounded px-1.5 py-0.2 bg-gray-100 font-medium text-[11px]'>{roleStr}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <span className='font-semibold text-gray-400 text-[11px] w-12'>Dept:</span>
                      <span className='rounded px-1.5 py-0.2 bg-gray-100 font-medium text-[11px]'>{deptStr}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <span className='font-semibold text-gray-400 text-[11px] w-12'>Lokasi:</span>
                      <span className='rounded px-1.5 py-0.2 bg-gray-100 font-medium text-[11px]'>{locStr}</span>
                    </div>
                  </div>
                </Td>
                <Td align='center' className='text-xs tabular-nums text-gray-500 whitespace-nowrap'>
                  {a.startDate || '—'} → {a.endDate || t('selamanya', 'open-ended')}
                </Td>
                <Td align='center'>
                  {a.requireAck ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200'>
                      ✓ {acksCount} dibaca
                    </span>
                  ) : (
                    <span className='text-gray-300 text-xs'>—</span>
                  )}
                </Td>
                <Td align='center'>
                  <StatusBadge tone={STATUS_TONE[status]}>{status}</StatusBadge>
                </Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <button onClick={() => openEdit(a)} className='text-xs font-semibold text-teal-700 hover:underline'>
                      {t('Ubah', 'Edit')}
                    </button>
                    <button onClick={() => del(a)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>
                      {t('Hapus', 'Delete')}
                    </button>
                  </div>
                </Td>
              </Tr>
            )
          })}
        </DataTable>
      )}

      {/* MODAL TAMBAH / UBAH DENGAN FULL PARAMETERISASI */}
      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between border-b pb-3 border-gray-100'>
              <div>
                <h3 className='text-base font-bold text-gray-900'>
                  {modal.mode === 'add' ? t('Tambah Pengumuman Terparameterisasi', 'Add Parameterized Announcement') : t('Ubah Pengumuman', 'Edit Announcement')}
                </h3>
                <p className='text-xs text-gray-500 mt-0.5'>
                  Atur judul, variabel personalisasi, sasaran divisi/peran, serta prioritas tampil di Dashboard.
                </p>
              </div>
              <button onClick={close} className='text-2xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                <div className='md:col-span-2'>
                  <FormField label={t('Judul Pengumuman', 'Title')} required>
                    <Input
                      value={modal.form.title}
                      onChange={e => setField({ title: e.target.value })}
                      placeholder='Contoh: Penyesuaian Jam Operasional'
                      autoFocus
                    />
                  </FormField>
                </div>
                <div>
                  <FormField label={t('Kategori', 'Category')}>
                    <Select value={modal.form.category} onChange={e => setField({ category: e.target.value })}>
                      {ANNOUNCEMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* Variable Helper Chips */}
              <div>
                <div className='flex items-center justify-between mb-1'>
                  <label className='text-xs font-semibold text-gray-700'>{t('Isi Pengumuman', 'Body Content')}</label>
                  <div className='flex items-center gap-1'>
                    <span className='text-[11px] text-gray-400'>Klik untuk menyisipkan variabel:</span>
                    <button
                      type='button'
                      onClick={() => insertVariable('{name}')}
                      className='rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-mono font-semibold border border-indigo-200'
                      title='Nama Lengkap Karyawan'
                    >
                      + {`{name}`}
                    </button>
                    <button
                      type='button'
                      onClick={() => insertVariable('{dept}')}
                      className='rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-mono font-semibold border border-indigo-200'
                      title='Departemen Karyawan'
                    >
                      + {`{dept}`}
                    </button>
                    <button
                      type='button'
                      onClick={() => insertVariable('{location}')}
                      className='rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-mono font-semibold border border-indigo-200'
                      title='Lokasi Kerja'
                    >
                      + {`{location}`}
                    </button>
                    <button
                      type='button'
                      onClick={() => insertVariable('{today}')}
                      className='rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-mono font-semibold border border-indigo-200'
                      title='Tanggal Hari Ini'
                    >
                      + {`{today}`}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={modal.form.body}
                  onChange={e => setField({ body: e.target.value })}
                  placeholder='Contoh: Halo {name}, mohon perhatikan bahwa jam kerja operasional di area {location} disesuaikan...'
                />
              </div>

              {/* Section: Parameter Sasaran (Audience Targeting) */}
              <div className='rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm'>🎯</span>
                  <span className='text-xs font-bold text-gray-800 uppercase tracking-wider'>
                    Parameter Sasaran Audiens (Targeting)
                  </span>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                  <div>
                    <label className='block text-[11px] font-semibold text-gray-700 mb-1'>Target Peran (Role)</label>
                    <select
                      value={modal.form.targetRoles?.[0] || '*'}
                      onChange={e => setField({ targetRoles: [e.target.value] })}
                      className='w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm focus:border-red-500 focus:outline-none'
                    >
                      {TARGET_ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className='block text-[11px] font-semibold text-gray-700 mb-1'>Target Departemen</label>
                    <select
                      value={modal.form.targetDepartments?.[0] || '*'}
                      onChange={e => setField({ targetDepartments: [e.target.value] })}
                      className='w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm focus:border-red-500 focus:outline-none'
                    >
                      <option value='*'>Semua Departemen (All)</option>
                      {deptList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className='block text-[11px] font-semibold text-gray-700 mb-1'>Target Lokasi Kerja</label>
                    <select
                      value={modal.form.targetLocations?.[0] || '*'}
                      onChange={e => setField({ targetLocations: [e.target.value] })}
                      className='w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm focus:border-red-500 focus:outline-none'
                    >
                      {TARGET_LOCATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Prioritas & Tampilan */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <div>
                  <FormField label={t('Tingkat Prioritas', 'Priority Level')}>
                    <Select value={modal.form.priority} onChange={e => setField({ priority: e.target.value })}>
                      <option value='normal'>Normal</option>
                      <option value='important'>Penting (Important - Amber Highlight)</option>
                      <option value='urgent'>Darurat (Urgent - Red Pulse)</option>
                    </Select>
                  </FormField>
                </div>
                <div>
                  <FormField label={t('Mode Tampilan di Dashboard', 'Display Mode')}>
                    <Select value={modal.form.displayMode} onChange={e => setField({ displayMode: e.target.value })}>
                      <option value='card'>Widget Dashboard (Standar)</option>
                      <option value='banner'>Top Banner Alert (Pita Atas Dashboard)</option>
                      <option value='modal'>Pop-up Modal Dialog (Wajib Dibaca)</option>
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* Rentang Tanggal */}
              <div className='grid grid-cols-2 gap-3'>
                <FormField label={t('Mulai Tampil', 'Start Date')} hint={t('Kosong = langsung aktif', 'Empty = immediately')}>
                  <Input type='date' value={modal.form.startDate} onChange={e => setField({ startDate: e.target.value })} />
                </FormField>
                <FormField
                  label={t('Selesai Tampil', 'End Date')}
                  hint={t('Kosong = selamanya', 'Empty = open-ended')}
                  error={dateRangeInvalid ? t('Harus setelah tanggal mulai.', 'Must be after start date.') : ''}
                >
                  <Input type='date' value={modal.form.endDate} onChange={e => setField({ endDate: e.target.value })} />
                </FormField>
              </div>

              {/* Checkboxes */}
              <div className='flex flex-wrap items-center gap-5 pt-2 border-t border-gray-100'>
                <label className='flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700'>
                  <input
                    type='checkbox'
                    checked={modal.form.active}
                    onChange={e => setField({ active: e.target.checked })}
                    className='h-4 w-4 accent-teal-700'
                  />
                  {t('Aktifkan Pengumuman', 'Active')}
                </label>
                <label className='flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700'>
                  <input
                    type='checkbox'
                    checked={modal.form.pinned}
                    onChange={e => setField({ pinned: e.target.checked })}
                    className='h-4 w-4 accent-teal-700'
                  />
                  📌 {t('Sematkan di Paling Atas', 'Pin to top')}
                </label>
                <label className='flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700'>
                  <input
                    type='checkbox'
                    checked={modal.form.requireAck}
                    onChange={e => setField({ requireAck: e.target.checked })}
                    className='h-4 w-4 accent-teal-700'
                  />
                  ✅ {t('Wajibkan Konfirmasi Baca ("Saya Mengerti")', 'Require Acknowledgment')}
                </label>
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-2 border-t pt-3 border-gray-100'>
              <ActionButton variant='secondary' onClick={close}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={save} icon='💾' disabled={!modal.form.title.trim() || dateRangeInvalid}>
                {t('Simpan Pengumuman', 'Save Announcement')}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
