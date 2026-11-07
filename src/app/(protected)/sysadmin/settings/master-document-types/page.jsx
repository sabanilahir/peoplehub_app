'use client'
import { useState } from 'react'
import { useDocumentTypeStore } from '@/store/documentTypeStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, SearchBar,
  ActionButton, StatusBadge, EmptyState, FormField, Input,
} from '@/components/ui'

const FIELD_DEFS = [
  { key: 'issuedDate',         label: ['Issued Date', 'Issued Date'] },
  { key: 'effectiveStartDate', label: ['Effective Start Date', 'Effective Start Date'] },
  { key: 'effectiveEndDate',   label: ['Effective End Date', 'Effective End Date'] },
  { key: 'note',               label: ['Note', 'Note'] },
  { key: 'customField',        label: ['Custom Field', 'Custom Field'] },
]

const EMPTY_FORM = {
  name: '', title: '', mandatory: false, active: true,
  fields: { issuedDate: false, effectiveStartDate: false, effectiveEndDate: false, note: true, customField: false },
  customFieldLabel: '',
}

export default function MasterDocumentTypesPage() {
  const t = useT()
  const { types, addType, updateType, removeType } = useDocumentTypeStore()

  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)   // { mode: 'add'|'edit', id?, form }
  const [flash, setFlash] = useState('')

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  const needle = q.trim().toLowerCase()
  const rows = types
    .filter(x => !needle || x.name.toLowerCase().includes(needle) || x.title.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))

  const counts = {
    total: types.length,
    mandatory: types.filter(x => x.mandatory).length,
    active: types.filter(x => x.active).length,
  }

  const openAdd = () => setModal({ mode: 'add', form: { ...EMPTY_FORM, fields: { ...EMPTY_FORM.fields } } })
  const openEdit = (x) => setModal({ mode: 'edit', id: x.id, form: { ...x, fields: { ...x.fields } } })
  const close = () => setModal(null)
  const setField = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))
  const setTypeField = (key, val) => setModal(m => ({ ...m, form: { ...m.form, fields: { ...m.form.fields, [key]: val } } }))

  const save = () => {
    const f = modal.form
    if (!f.name.trim() || !f.title.trim()) return
    if (f.fields.customField && !f.customFieldLabel.trim()) return
    const payload = {
      name: f.name.trim(), title: f.title.trim(), mandatory: f.mandatory, active: f.active,
      fields: f.fields, customFieldLabel: f.fields.customField ? f.customFieldLabel.trim() : '',
    }
    if (modal.mode === 'add') {
      addType(payload)
      say(t('Document type ditambahkan.', 'Document type added.'))
    } else {
      updateType(modal.id, payload)
      say(t('Document type diperbarui.', 'Document type updated.'))
    }
    close()
  }

  const del = (x) => {
    if (!window.confirm(t(`Hapus document type "${x.title}"?`, `Delete document type "${x.title}"?`))) return
    removeType(x.id)
    say(t('Document type dihapus.', 'Document type deleted.'))
  }

  const invalid = modal && (!modal.form.name.trim() || !modal.form.title.trim() || (modal.form.fields.customField && !modal.form.customFieldLabel.trim()))

  return (
    <div>
      <PageHeader
        icon='🗂️'
        title='Master Document Types'
        subtitle={t(
          'Jenis dokumen yang tersedia di tab Personal Document — atur field apa yang diminta dan mana yang wajib.',
          'Document types available on the Personal Document tab — set which fields it asks for and which are mandatory.',
        )}
        actions={
          <div className='flex items-center gap-3'>
            {flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
            <ActionButton onClick={openAdd} icon='➕'>{t('Tambah Document Type', 'Add Document Type')}</ActionButton>
          </div>
        }
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard icon='🗂️' tone='brand' label={t('Total Document Type', 'Total Document Types')} value={String(counts.total)} />
        <StatCard icon='⚠️' tone='red'   label={t('Wajib', 'Mandatory')} value={String(counts.mandatory)} />
        <StatCard icon='✅' tone='green' label={t('Aktif', 'Active')} value={String(counts.active)} />
      </div>

      <div className='mb-4'>
        <SearchBar value={q} onChange={setQ} placeholder={t('Cari nama atau judul…', 'Search name or title…')} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon='🗂️' title={t('Belum ada document type.', 'No document types yet.')}
          action={<ActionButton onClick={openAdd} icon='➕'>{t('Tambah Document Type', 'Add Document Type')}</ActionButton>} />
      ) : (
        <DataTable columns={[
          t('Name', 'Name'), t('Title', 'Title'), { label: t('Wajib', 'Mandatory'), align: 'center' },
          t('Field Aktif', 'Enabled Fields'), { label: t('Status', 'Status'), align: 'center' }, { label: '', align: 'right' },
        ]}>
          {rows.map(x => (
            <Tr key={x.id}>
              <Td className='font-semibold text-gray-800'>{x.name}</Td>
              <Td className='text-sm text-gray-600'>{x.title}</Td>
              <Td align='center'>
                {x.mandatory
                  ? <StatusBadge tone='danger'>{t('Wajib', 'Mandatory')}</StatusBadge>
                  : <span className='text-gray-300'>—</span>}
              </Td>
              <Td>
                <div className='flex flex-wrap gap-1'>
                  {FIELD_DEFS.filter(fd => x.fields[fd.key]).map(fd => (
                    <span key={fd.key} className='rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600'>
                      {fd.key === 'customField' && x.customFieldLabel ? x.customFieldLabel : t(fd.label[0], fd.label[1])}
                    </span>
                  ))}
                  {FIELD_DEFS.every(fd => !x.fields[fd.key]) && <span className='text-xs text-gray-300'>—</span>}
                </div>
              </Td>
              <Td align='center'>
                <StatusBadge tone={x.active ? 'success' : 'neutral'}>{x.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}</StatusBadge>
              </Td>
              <Td align='right'>
                <div className='flex justify-end gap-2'>
                  <button onClick={() => openEdit(x)} className='text-xs font-semibold text-red-700 hover:underline'>{t('Ubah', 'Edit')}</button>
                  <button onClick={() => del(x)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>
                {modal.mode === 'add' ? t('Tambah Document Type', 'Add Document Type') : t('Ubah Document Type', 'Edit Document Type')}
              </h3>
              <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Name' required hint={t('Nama singkat/kode.', 'Short code name.')}>
                  <Input value={modal.form.name} onChange={e => setField({ name: e.target.value })} autoFocus placeholder='KTP' />
                </FormField>
                <FormField label='Title' required hint={t('Nama lengkap yang ditampilkan.', 'Full display name.')}>
                  <Input value={modal.form.title} onChange={e => setField({ title: e.target.value })} placeholder='Kartu Tanda Penduduk' />
                </FormField>
              </div>

              <label className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                <input type='checkbox' checked={modal.form.mandatory}
                  onChange={e => setField({ mandatory: e.target.checked })} className='h-4 w-4 accent-red-700' />
                ⚠️ {t('Wajib — setiap karyawan harus punya dokumen jenis ini', 'Mandatory — every employee must have this document')}
              </label>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                <input type='checkbox' checked={modal.form.active}
                  onChange={e => setField({ active: e.target.checked })} className='h-4 w-4 accent-red-700' />
                {t('Aktif — muncul di pilihan upload', 'Active — shown as an upload option')}
              </label>

              <div className='rounded-xl bg-gray-50 p-3'>
                <p className='mb-2 text-xs font-semibold text-gray-600'>
                  {t('Field yang diminta saat upload dokumen jenis ini:', 'Fields asked for when uploading this document type:')}
                </p>
                <div className='grid grid-cols-2 gap-2'>
                  {FIELD_DEFS.map(fd => (
                    <label key={fd.key} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                      <input type='checkbox' checked={modal.form.fields[fd.key]}
                        onChange={e => setTypeField(fd.key, e.target.checked)} className='h-4 w-4 accent-red-700' />
                      {t(fd.label[0], fd.label[1])}
                    </label>
                  ))}
                </div>
                {modal.form.fields.customField && (
                  <div className='mt-3'>
                    <FormField label={t('Label Custom Field', 'Custom Field Label')} required
                      hint={t('Contoh: "Lembaga Penerbit" untuk Sertifikat.', 'e.g. "Issuing Institution" for a Certificate.')}>
                      <Input value={modal.form.customFieldLabel} onChange={e => setField({ customFieldLabel: e.target.value })} />
                    </FormField>
                  </div>
                )}
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={close}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={save} icon='💾' disabled={invalid}>{t('Simpan', 'Save')}</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
