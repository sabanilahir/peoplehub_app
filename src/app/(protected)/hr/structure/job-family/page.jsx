'use client'
import { useState }          from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, FormField, Input, Select,
  StatusBadge, ActionButton, EmptyState,
} from '@/components/ui'

const BLANK = { code:'', name:'', description:'', status:'Active' }
const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

export default function JobFamilyPage() {
  const t = useT()
  const { jobFamilies, addJobFamily, updateJobFamily, deleteJobFamily } = useStructureStore()
  const [form,      setForm     ] = useState(BLANK)
  const [editing,   setEditing  ] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const openNew    = () => { setEditing(null); setForm(BLANK); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const handleSave = () => {
    if (!form.code || !form.name) return flash(t('Kode dan nama wajib diisi.','Code and name are required.'),'error')
    if (editing) { updateJobFamily(editing, form); flash(t('Job Family diperbarui.','Job Family updated.')) }
    else         { addJobFamily(form); flash(t('Job Family ditambahkan.','Job Family added.')) }
    closeModal()
  }

  const handleEdit = (x) => {
    setEditing(x.id)
    setForm({ code:x.code, name:x.name, description:x.description||'', status:x.status })
    setShowModal(true)
  }

  const activeCount = jobFamilies.filter(j=>j.status==='Active').length

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🧩'
        title='Job Family'
        subtitle={t('Pengelompokan jabatan berdasarkan fungsi atau bidang keahlian.','Job grouping based on function or area of expertise.')}
      />

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <StatCard label={t('Total Job Family','Total Job Family')} value={jobFamilies.length} icon='🧩' tone='brand' />
        <StatCard label={t('Aktif','Active')} value={activeCount} icon='✅' tone='green' />
        <StatCard label={t('Tidak Aktif','Inactive')} value={jobFamilies.length-activeCount} icon='⏸️' tone='gray' />
      </div>

      <SectionCard
        title={t('Daftar Job Family','Job Family List')}
        icon='🧩'
        bodyClass='p-0'
        actions={
          <button onClick={openNew}
            className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
            style={{ background: BRAND }}>
            + {t('Tambah Job Family','Add Job Family')}
          </button>
        }
      >
        {jobFamilies.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[t('Kode','Code'),t('Nama','Name'),t('Deskripsi','Description'),'Status',{label:t('Aksi','Action'),align:'right'}]}
          >
            {jobFamilies.map(x=>(
              <Tr key={x.id}>
                <Td className='font-mono text-xs text-gray-500'>{x.code}</Td>
                <Td className='font-medium text-gray-800'>{x.name}</Td>
                <Td className='max-w-xs truncate text-xs text-gray-500'>{x.description||'-'}</Td>
                <Td><StatusBadge status={x.status} /></Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <ActionButton size='sm' variant='secondary' onClick={()=>handleEdit(x)}>Edit</ActionButton>
                    <ActionButton size='sm' variant='danger' onClick={()=>{deleteJobFamily(x.id);flash(t('Job Family dihapus.','Job Family deleted.'))}}>{t('Hapus','Delete')}</ActionButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='🧩' title={t('Belum ada job family.','No job families yet.')} />
          </div>
        )}
      </SectionCard>

      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>{editing?t('Edit Job Family','Edit Job Family'):t('Tambah Job Family','Add Job Family')}</h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label={t('Kode','Code')} required>
                <Input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} />
              </FormField>
              <FormField label={t('Nama Job Family','Job Family Name')} required>
                <Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
              </FormField>
              <FormField label={t('Deskripsi','Description')}>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  rows={3} placeholder={t('Opsional','Optional')}
                  className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' />
              </FormField>
              <FormField label='Status'>
                <Select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option>Active</option><option>Inactive</option>
                </Select>
              </FormField>
            </div>
            <div className='px-6 pb-5 flex gap-3'>
              <button onClick={handleSave} className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition' style={{background:BRAND}}>
                {editing?t('Simpan Perubahan','Save Changes'):t('Tambah Job Family','Add Job Family')}
              </button>
              <button onClick={closeModal} className='flex-1 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                {t('Batal','Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
