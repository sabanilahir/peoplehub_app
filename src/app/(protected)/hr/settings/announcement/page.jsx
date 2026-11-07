'use client'
import { useState } from 'react'
import {
  useAnnouncementStore, ANNOUNCEMENT_CATEGORIES, CATEGORY_TONE, announcementStatus,
} from '@/store/announcementStore'
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
  title: '', body: '', category: 'Umum', pinned: false, active: true,
  startDate: '', endDate: '',
}

export default function AnnouncementSettingsPage() {
  const t = useT()
  const { announcements, addAnnouncement, updateAnnouncement, removeAnnouncement } = useAnnouncementStore()

  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)   // { mode:'add'|'edit', id?, form }
  const [flash, setFlash] = useState('')

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  const openAdd  = () => setModal({ mode: 'add', form: { ...EMPTY_FORM } })
  const openEdit = (a) => setModal({ mode: 'edit', id: a.id, form: { ...EMPTY_FORM, ...a } })
  const close    = () => setModal(null)
  const setField = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))

  const save = () => {
    const f = modal.form
    if (!f.title.trim()) return
    // An end date before the start date would silently never display.
    if (f.startDate && f.endDate && f.endDate < f.startDate) return
    if (modal.mode === 'add') {
      addAnnouncement(f)
      say(t('Pengumuman ditambahkan.', 'Announcement added.'))
    } else {
      updateAnnouncement(modal.id, f)
      say(t('Pengumuman diperbarui.', 'Announcement updated.'))
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
    .filter(a => !needle || a.title.toLowerCase().includes(needle) || a.body.toLowerCase().includes(needle))
    .sort((a, b) => (b.pinned - a.pinned) || String(b.createdAt).localeCompare(String(a.createdAt)))

  const liveCount = announcements.filter(a => announcementStatus(a) === 'Aktif').length
  const scheduled = announcements.filter(a => announcementStatus(a) === 'Terjadwal').length

  const dateRangeInvalid = modal?.form.startDate && modal?.form.endDate
    && modal.form.endDate < modal.form.startDate

  return (
    <div>
      <PageHeader
        icon='📢'
        title='Announcement'
        subtitle={t(
          'Kelola pengumuman yang tampil di halaman Beranda karyawan.',
          'Manage the announcements shown on employees’ Home page.',
        )}
        actions={
          <div className='flex items-center gap-3'>
            {flash && (
              <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>
            )}
            <ActionButton onClick={openAdd} icon='➕'>{t('Tambah', 'Add')}</ActionButton>
          </div>
        }
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard icon='📢' tone='brand' label={t('Total Pengumuman', 'Total')} value={String(announcements.length)} />
        <StatCard icon='✅' tone='green' label={t('Sedang Tampil', 'Live Now')} value={String(liveCount)} />
        <StatCard icon='🗓️' tone='blue'  label={t('Terjadwal', 'Scheduled')} value={String(scheduled)} />
      </div>

      <div className='mb-4'>
        <SearchBar value={q} onChange={setQ} placeholder={t('Cari judul atau isi…', 'Search title or body…')} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon='📢'
          title={t('Belum ada pengumuman', 'No announcements yet')}
          description={t('Tambah pengumuman untuk ditampilkan di Beranda karyawan.', 'Add one to show it on employees’ Home page.')}
          action={<ActionButton onClick={openAdd} icon='➕'>{t('Tambah', 'Add')}</ActionButton>}
        />
      ) : (
        <DataTable columns={[
          { label: t('Judul', 'Title') },
          { label: t('Kategori', 'Category'), align: 'center' },
          { label: t('Periode Tampil', 'Display Period'), align: 'center' },
          { label: 'Status', align: 'center' },
          { label: '', align: 'right', width: 120 },
        ]}>
          {rows.map(a => {
            const status = announcementStatus(a)
            return (
              <Tr key={a.id}>
                <Td>
                  <p className='font-semibold text-gray-800'>
                    {a.pinned && <span className='mr-1' title={t('Disematkan', 'Pinned')}>📌</span>}
                    {a.title}
                  </p>
                  <p className='mt-0.5 line-clamp-1 text-xs text-gray-400'>{a.body}</p>
                </Td>
                <Td align='center'>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_TONE[a.category] || CATEGORY_TONE.Umum}`}>
                    {a.category}
                  </span>
                </Td>
                <Td align='center' className='text-xs tabular-nums text-gray-500'>
                  {a.startDate || '—'} → {a.endDate || t('selamanya', 'open-ended')}
                </Td>
                <Td align='center'>
                  <StatusBadge tone={STATUS_TONE[status]}>{status}</StatusBadge>
                </Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <button onClick={() => openEdit(a)} className='text-xs font-semibold text-red-700 hover:underline'>
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

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>
                {modal.mode === 'add' ? t('Tambah Pengumuman', 'Add Announcement') : t('Ubah Pengumuman', 'Edit Announcement')}
              </h3>
              <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-4'>
              <FormField label={t('Judul', 'Title')} required>
                <Input value={modal.form.title} onChange={e => setField({ title: e.target.value })} autoFocus />
              </FormField>

              <FormField label={t('Isi', 'Body')}>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={modal.form.body}
                  onChange={e => setField({ body: e.target.value })}
                />
              </FormField>

              <FormField label={t('Kategori', 'Category')}>
                <Select value={modal.form.category} onChange={e => setField({ category: e.target.value })}>
                  {ANNOUNCEMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormField>

              <div className='grid grid-cols-2 gap-4'>
                <FormField label={t('Mulai Tampil', 'Start Date')} hint={t('Kosong = langsung', 'Empty = immediately')}>
                  <Input type='date' value={modal.form.startDate} onChange={e => setField({ startDate: e.target.value })} />
                </FormField>
                <FormField
                  label={t('Selesai Tampil', 'End Date')}
                  hint={t('Kosong = selamanya', 'Empty = open-ended')}
                  error={dateRangeInvalid ? t('Harus setelah tanggal mulai.', 'Must be after the start date.') : ''}
                >
                  <Input type='date' value={modal.form.endDate} onChange={e => setField({ endDate: e.target.value })} />
                </FormField>
              </div>

              <div className='flex items-center gap-6 pt-1'>
                <label className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                  <input type='checkbox' checked={modal.form.active}
                    onChange={e => setField({ active: e.target.checked })} className='h-4 w-4 accent-red-700' />
                  {t('Aktif', 'Active')}
                </label>
                <label className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                  <input type='checkbox' checked={modal.form.pinned}
                    onChange={e => setField({ pinned: e.target.checked })} className='h-4 w-4 accent-red-700' />
                  📌 {t('Sematkan di atas', 'Pin to top')}
                </label>
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={close}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={save} icon='💾' disabled={!modal.form.title.trim() || dateRangeInvalid}>
                {t('Simpan', 'Save')}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
