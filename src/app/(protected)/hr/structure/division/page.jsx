'use client'
import Icon from '@/components/ui/Icon'
import { useState }          from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, FormField, Input, Select,
  StatusBadge, ActionButton, EmptyState,
} from '@/components/ui'

const BLANK = { enterpriseId:'', code:'', name:'', headName:'', status:'Active' }
const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

export default function DivisionPage() {
  const t = useT()
  const { enterprises, divisions, addDivision, updateDivision, deleteDivision } = useStructureStore()
  const [form,      setForm     ] = useState(BLANK)
  const [editing,   setEditing  ] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const openNew    = () => { setEditing(null); setForm(BLANK); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const handleSave = () => {
    if (!form.enterpriseId || !form.code || !form.name) return flash(t('Enterprise, kode, dan nama wajib diisi.','Enterprise, code, and name are required.'),'error')
    if (editing) { updateDivision(editing, {...form, enterpriseId:+form.enterpriseId}); flash(t('Division diperbarui.','Division updated.')) }
    else         { addDivision({...form, enterpriseId:+form.enterpriseId}); flash(t('Division ditambahkan.','Division added.')) }
    closeModal()
  }

  const handleEdit = (x) => {
    setEditing(x.id)
    setForm({ enterpriseId:x.enterpriseId, code:x.code, name:x.name, headName:x.headName||'', status:x.status })
    setShowModal(true)
  }

  const entName    = (id) => enterprises.find(e=>e.id===id)?.name || '-'
  const activeCount = divisions.filter(d=>d.status==='Active').length

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🏛️'
        title='Division'
        subtitle={t('Sub-group di bawah Enterprise. Berfungsi sebagai pengelompokan Company.','Sub-group under Enterprise. Groups companies within the enterprise.')}
      />

      <div className='mb-6 flex items-center gap-2 text-xs text-gray-400'>
        <span className='rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700'>Enterprise</span>
        <span><Icon e='→' size={15} /></span>
        <span className='rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white'>Division</span>
        <span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Company</span>
        <span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Business Unit</span>
        <span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Department</span>
      </div>

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <StatCard label={t('Total Division','Total Division')} value={divisions.length} icon='🏛️' tone='brand' />
        <StatCard label={t('Aktif','Active')} value={activeCount} icon='✅' tone='green' />
        <StatCard label={t('Tidak Aktif','Inactive')} value={divisions.length-activeCount} icon='⏸️' tone='gray' />
      </div>

      <SectionCard
        title={t('Daftar Division','Division List')}
        icon='🏛️'
        bodyClass='p-0'
        actions={
          <button onClick={openNew}
            className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
            style={{ background: BRAND }}>
            + {t('Tambah Division','Add Division')}
          </button>
        }
      >
        {divisions.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[t('Kode','Code'),t('Nama Division','Division Name'),'Enterprise','Division Head','Status',{label:t('Aksi','Action'),align:'right'}]}
          >
            {divisions.map(x=>(
              <Tr key={x.id}>
                <Td className='font-mono text-xs text-gray-500'>{x.code}</Td>
                <Td className='font-medium text-gray-800'>{x.name}</Td>
                <Td className='text-xs text-gray-500'>{entName(x.enterpriseId)}</Td>
                <Td>{x.headName||'-'}</Td>
                <Td><StatusBadge status={x.status} /></Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <ActionButton size='sm' variant='secondary' onClick={()=>handleEdit(x)}>Edit</ActionButton>
                    <ActionButton size='sm' variant='danger' onClick={()=>{deleteDivision(x.id);flash(t('Division dihapus.','Division deleted.'))}}>{t('Hapus','Delete')}</ActionButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='🏛️' title={t('Belum ada division.','No divisions yet.')} />
          </div>
        )}
      </SectionCard>

      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>{editing?t('Edit Division','Edit Division'):t('Tambah Division','Add Division')}</h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label='Enterprise' required>
                <Select value={form.enterpriseId} onChange={e=>setForm(f=>({...f,enterpriseId:e.target.value}))}>
                  <option value=''>-- {t('Pilih Enterprise','Select Enterprise')} --</option>
                  {enterprises.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </FormField>
              {[[t('Kode','Code'),'code',true],[t('Nama Division','Division Name'),'name',true],['Division Head','headName',false]].map(([lbl,key,req])=>(
                <FormField key={key} label={lbl} required={req}>
                  <Input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                    placeholder={key==='headName'?t('Opsional','Optional'):''} />
                </FormField>
              ))}
              <FormField label='Status'>
                <Select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option>Active</option><option>Inactive</option>
                </Select>
              </FormField>
            </div>
            <div className='px-6 pb-5 flex gap-3'>
              <button onClick={handleSave} className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition' style={{background:BRAND}}>
                {editing?t('Simpan Perubahan','Save Changes'):t('Tambah Division','Add Division')}
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
