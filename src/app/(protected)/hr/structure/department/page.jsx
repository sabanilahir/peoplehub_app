'use client'
import Icon from '@/components/ui/Icon'
import { useState }          from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, FormField, Input, Select,
  StatusBadge, ActionButton, EmptyState,
} from '@/components/ui'

const BLANK = { businessUnitId:'', code:'', name:'', status:'Active' }
const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

export default function DepartmentPage() {
  const t = useT()
  const { businessUnits, departments, addDepartment, updateDepartment, deleteDepartment } = useStructureStore()
  const [form,      setForm     ] = useState(BLANK)
  const [editing,   setEditing  ] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const openNew    = () => { setEditing(null); setForm(BLANK); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const handleSave = () => {
    if (!form.businessUnitId || !form.code || !form.name) return flash(t('Business Unit, kode, dan nama wajib diisi.','Business Unit, code, and name are required.'),'error')
    if (editing) { updateDepartment(editing, {...form, businessUnitId:+form.businessUnitId}); flash(t('Department diperbarui.','Department updated.')) }
    else         { addDepartment({...form, businessUnitId:+form.businessUnitId}); flash(t('Department ditambahkan.','Department added.')) }
    closeModal()
  }

  const handleEdit = (x) => {
    setEditing(x.id)
    setForm({ businessUnitId:x.businessUnitId, code:x.code, name:x.name, status:x.status })
    setShowModal(true)
  }

  const buName     = (id) => businessUnits.find(b=>b.id===id)?.name || '-'
  const activeCount = departments.filter(d=>d.status==='Active').length

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🗂️'
        title='Department'
        subtitle={t('Unit terkecil struktur organisasi, di bawah Business Unit.','Smallest unit of the organizational structure, under Business Unit.')}
      />

      <div className='mb-6 flex items-center gap-2 text-xs text-gray-400'>
        <span className='px-2.5 py-1'>Enterprise</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Division</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Company</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Business Unit</span><span><Icon e='→' size={15} /></span>
        <span className='rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white'>Department</span>
      </div>

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <StatCard label={t('Total Department','Total Department')} value={departments.length} icon='🗂️' tone='brand' />
        <StatCard label={t('Aktif','Active')} value={activeCount} icon='✅' tone='green' />
        <StatCard label={t('Tidak Aktif','Inactive')} value={departments.length-activeCount} icon='⏸️' tone='gray' />
      </div>

      <SectionCard
        title={t('Daftar Department','Department List')}
        icon='🗂️'
        bodyClass='p-0'
        actions={
          <button onClick={openNew}
            className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
            style={{ background: BRAND }}>
            + {t('Tambah Department','Add Department')}
          </button>
        }
      >
        {departments.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[t('Kode','Code'),t('Nama Department','Department Name'),'Business Unit','Status',{label:t('Aksi','Action'),align:'right'}]}
          >
            {departments.map(x=>(
              <Tr key={x.id}>
                <Td className='font-mono text-xs text-gray-500'>{x.code}</Td>
                <Td className='font-medium text-gray-800'>{x.name}</Td>
                <Td className='text-xs text-gray-500'>{buName(x.businessUnitId)}</Td>
                <Td><StatusBadge status={x.status} /></Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <ActionButton size='sm' variant='secondary' onClick={()=>handleEdit(x)}>Edit</ActionButton>
                    <ActionButton size='sm' variant='danger' onClick={()=>{deleteDepartment(x.id);flash(t('Department dihapus.','Department deleted.'))}}>{t('Hapus','Delete')}</ActionButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='🗂️' title={t('Belum ada department.','No departments yet.')} />
          </div>
        )}
      </SectionCard>

      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>{editing?t('Edit Department','Edit Department'):t('Tambah Department','Add Department')}</h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label='Business Unit' required>
                <Select value={form.businessUnitId} onChange={e=>setForm(f=>({...f,businessUnitId:e.target.value}))}>
                  <option value=''>-- {t('Pilih Business Unit','Select Business Unit')} --</option>
                  {businessUnits.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </FormField>
              {[[t('Kode','Code'),'code'],[t('Nama Department','Department Name'),'name']].map(([lbl,key])=>(
                <FormField key={key} label={lbl} required>
                  <Input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
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
                {editing?t('Simpan Perubahan','Save Changes'):t('Tambah Department','Add Department')}
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
