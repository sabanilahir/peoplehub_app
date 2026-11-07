'use client'
import Icon from '@/components/ui/Icon'
import { useState }          from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, FormField, Input, Select,
  StatusBadge, ActionButton, EmptyState,
} from '@/components/ui'

const BLANK = { divisionId:'', code:'', companyCode:'', name:'', legalEntity:'PT', country:'Indonesia', status:'Active', emailDomain:'' }
const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

const COUNTRIES = [
  'Indonesia',
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bangladesh', 'Belgium', 'Brazil', 'Brunei', 'Cambodia', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 'Finland', 'France',
  'Germany', 'Ghana', 'Greece', 'Hong Kong', 'Hungary', 'India', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kenya', 'Kuwait', 'Laos',
  'Lebanon', 'Libya', 'Luxembourg', 'Malaysia', 'Mexico', 'Morocco', 'Myanmar',
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palestine',
  'Papua New Guinea', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea',
  'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand',
  'Timor-Leste', 'Tunisia', 'Turkey', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Venezuela', 'Vietnam', 'Yemen',
]

export default function CompanyPage() {
  const t = useT()
  const { divisions, companies, addCompany, updateCompany, deleteCompany } = useStructureStore()
  const [form,      setForm     ] = useState(BLANK)
  const [editing,   setEditing  ] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const openNew    = () => { setEditing(null); setForm(BLANK); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const handleSave = () => {
    if (!form.divisionId || !form.code || !form.name) return flash(t('Division, kode, dan nama wajib diisi.','Division, code, and name are required.'),'error')
    if (form.companyCode && form.companyCode.length > 3) return flash(t('Company Code maksimal 3 karakter.','Company Code maximum 3 characters.'),'error')
    if (editing) { updateCompany(editing, {...form, divisionId:+form.divisionId}); flash(t('Company diperbarui.','Company updated.')) }
    else         { addCompany({...form, divisionId:+form.divisionId}); flash(t('Company ditambahkan.','Company added.')) }
    closeModal()
  }

  const handleEdit = (x) => {
    setEditing(x.id)
    setForm({ divisionId:x.divisionId, code:x.code, companyCode:x.companyCode||'', name:x.name, legalEntity:x.legalEntity, country:x.country, status:x.status, emailDomain:x.emailDomain||'' })
    setShowModal(true)
  }

  const divName    = (id) => divisions.find(d=>d.id===id)?.name || '-'
  const activeCount = companies.filter(c=>c.status==='Active').length

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🏠'
        title='Company'
        subtitle={t('Entitas legal perusahaan di bawah Division.','Legal entity of the company under Division.')}
      />

      <div className='mb-6 flex items-center gap-2 text-xs text-gray-400'>
        <span className='px-2.5 py-1'>Enterprise</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Division</span><span><Icon e='→' size={15} /></span>
        <span className='rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white'>Company</span>
        <span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Business Unit</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Department</span>
      </div>

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <StatCard label={t('Total Company','Total Company')} value={companies.length} icon='🏠' tone='brand' />
        <StatCard label={t('Aktif','Active')} value={activeCount} icon='✅' tone='green' />
        <StatCard label={t('Tidak Aktif','Inactive')} value={companies.length-activeCount} icon='⏸️' tone='gray' />
      </div>

      <SectionCard
        title={t('Daftar Company','Company List')}
        icon='🏠'
        bodyClass='p-0'
        actions={
          <button onClick={openNew}
            className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
            style={{ background: BRAND }}>
            + {t('Tambah Company','Add Company')}
          </button>
        }
      >
        {companies.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[t('Kode','Code'),'Co. Code',t('Nama Company','Company Name'),'Division',t('Domain Email','Email Domain'),'Legal',t('Negara','Country'),'Status',{label:t('Aksi','Action'),align:'right'}]}
          >
            {companies.map(x=>(
              <Tr key={x.id}>
                <Td className='font-mono text-xs text-gray-500'>{x.code}</Td>
                <Td>
                  {x.companyCode
                    ? <span className='rounded bg-red-50 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-red-700'>{x.companyCode}</span>
                    : <span className='text-xs text-gray-300'>—</span>}
                </Td>
                <Td className='font-medium text-gray-800'>{x.name}</Td>
                <Td className='text-xs text-gray-500'>{divName(x.divisionId)}</Td>
                <Td className='font-mono text-xs text-gray-500'>{x.emailDomain ? `@${x.emailDomain}` : <span className='text-gray-300'>—</span>}</Td>
                <Td>{x.legalEntity}</Td>
                <Td>{x.country}</Td>
                <Td><StatusBadge status={x.status} /></Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <ActionButton size='sm' variant='secondary' onClick={()=>handleEdit(x)}>Edit</ActionButton>
                    <ActionButton size='sm' variant='danger' onClick={()=>{deleteCompany(x.id);flash(t('Company dihapus.','Company deleted.'))}}>{t('Hapus','Delete')}</ActionButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='🏠' title={t('Belum ada company.','No companies yet.')} />
          </div>
        )}
      </SectionCard>

      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>{editing?t('Edit Company','Edit Company'):t('Tambah Company','Add Company')}</h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label='Division' required>
                <Select value={form.divisionId} onChange={e=>setForm(f=>({...f,divisionId:e.target.value}))}>
                  <option value=''>-- {t('Pilih Division','Select Division')} --</option>
                  {divisions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </FormField>
              {[[t('Kode','Code'),'code'],[t('Nama Company','Company Name'),'name']].map(([lbl,key])=>(
                <FormField key={key} label={lbl} required>
                  <Input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
                </FormField>
              ))}
              <FormField label={t('Negara','Country')}>
                <Select value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}>
                  {COUNTRIES.map(c=><option key={c}>{c}</option>)}
                </Select>
              </FormField>
              <FormField label='Company Code' hint={t('Maks. 3 karakter','Max. 3 characters')}>
                <div className='relative'>
                  <Input
                    value={form.companyCode}
                    onChange={e=>setForm(f=>({...f,companyCode:e.target.value.toUpperCase().slice(0,3)}))}
                    maxLength={3}
                    placeholder={t('mis. JKT','e.g. JKT')}
                    className='pr-10 font-mono uppercase tracking-widest'
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${form.companyCode.length===3?'text-red-500':'text-gray-300'}`}>
                    {form.companyCode.length}/3
                  </span>
                </div>
              </FormField>
              <FormField label={t('Domain Email','Email Domain')}
                hint={t('Tanpa "@" — dipakai untuk generate email kerja karyawan baru otomatis, mis. joko.susilo@nusantara-teknologi.com',
                        'Without "@" — used to auto-generate new hires\' work email, e.g. joko.susilo@nusantara-teknologi.com')}>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>@</span>
                  <Input
                    value={form.emailDomain}
                    onChange={e=>setForm(f=>({...f,emailDomain:e.target.value.trim().toLowerCase().replace(/^@+/,'')}))}
                    placeholder='nusantara-teknologi.com'
                    className='pl-7'
                  />
                </div>
              </FormField>
              <FormField label='Legal Entity'>
                <Select value={form.legalEntity} onChange={e=>setForm(f=>({...f,legalEntity:e.target.value}))}>
                  {['PT','CV','Yayasan','Koperasi','PMA'].map(l=><option key={l}>{l}</option>)}
                </Select>
              </FormField>
              <FormField label='Status'>
                <Select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option>Active</option><option>Inactive</option>
                </Select>
              </FormField>
            </div>
            <div className='px-6 pb-5 flex gap-3'>
              <button onClick={handleSave} className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition' style={{background:BRAND}}>
                {editing?t('Simpan Perubahan','Save Changes'):t('Tambah Company','Add Company')}
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
