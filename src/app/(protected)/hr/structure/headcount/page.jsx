'use client'
import Icon from '@/components/ui/Icon'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useState } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, FormField, Input, Select,
  StatusBadge, ActionButton, EmptyState,
} from '@/components/ui'

const BLANK = { positionId:'', code:'', name:'', employeeId:'', supervisorHeadcountId:'', status:'Active' }

export default function HeadcountPage() {
  const t = useT()
  const {
    departments, positions, headcounts, companies, businessUnits,
    addHeadcount, updateHeadcount, deleteHeadcount,
  } = useStructureStore()
  const { employees } = useEmployeeStore()

  const [form,      setForm     ] = useState(BLANK)
  const [editing,   setEditing  ] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)
  const [filterPos, setFilterPos] = useState('')

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const openNew = () => { setEditing(null); setForm(BLANK); setShowModal(true) }

  const handleSave = () => {
    if (!form.positionId || !form.code || !form.name)
      return flash(t('Position, kode, dan nama wajib diisi.','Position, code, and name are required.'),'error')
    const data = {
      ...form,
      positionId: +form.positionId,
      employeeId: form.employeeId ? +form.employeeId : null,
      supervisorHeadcountId: form.supervisorHeadcountId ? +form.supervisorHeadcountId : null,
    }
    if (editing) { updateHeadcount(editing, data); flash(t('Headcount diperbarui.','Headcount updated.')) }
    else         { addHeadcount(data); flash(t('Headcount ditambahkan.','Headcount added.')) }
    setShowModal(false)
    setEditing(null)
    setForm(BLANK)
  }

  const handleEdit = (x) => {
    setEditing(x.id)
    setForm({
      positionId:            x.positionId,
      code:                  x.code,
      name:                  x.name,
      employeeId:            x.employeeId || '',
      supervisorHeadcountId: x.supervisorHeadcountId || '',
      status:                x.status,
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const position  = (id) => positions.find(p=>p.id===id)
  const deptName  = (id) => departments.find(d=>d.id===id)?.name || '-'
  const companyName = (departmentId) => {
    const dept = departments.find(d=>d.id===departmentId)
    const bu = businessUnits.find(b=>b.id===dept?.businessUnitId)
    return companies.find(c=>c.id===bu?.companyId)?.name || '-'
  }
  const employee  = (id) => employees.find(e=>e.id===id)

  const headcount = (id) => headcounts.find(h=>h.id===id)

  const suggestedName = (posId) => {
    const pos = position(+posId)
    if (!pos) return ''
    const count = headcounts.filter(h => h.positionId === +posId && h.id !== editing?.id).length
    return `${pos.name} ${String.fromCharCode(65 + count)}`
  }

  const selectedPos = position(+form.positionId)
  const selectedSup = headcount(+form.supervisorHeadcountId)
  const supIncumbent = selectedSup?.employeeId ? employee(selectedSup.employeeId) : null

  const filtered = filterPos
    ? headcounts.filter(h=>h.positionId===+filterPos)
    : headcounts

  const filledCount  = headcounts.filter(h=>h.employeeId).length
  const activeCount  = headcounts.filter(h=>h.status==='Active').length
  const posWithHc    = new Set(headcounts.map(h=>h.positionId)).size

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='👤'
        title='Headcount'
        subtitle={t('Kursi bernama di bawah Position yang menempel langsung ke karyawan — mis. "Developer A" dan "Developer B" di bawah position "Developer".','Named seats under a Position, attached directly to an employee — e.g. "Developer A" and "Developer B" under the "Developer" position.')}
      />

      {/* Breadcrumb */}
      <div className='mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-400'>
        <span className='px-2.5 py-1'>Enterprise</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Division</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Company</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Business Unit</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Department</span><span><Icon e='→' size={15} /></span>
        <span className='rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700'>Position</span>
        <span><Icon e='→' size={15} /></span>
        <span className='rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white'>Headcount</span>
      </div>

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <StatCard label={t('Total Headcount','Total Headcount')} value={headcounts.length} icon='👤' tone='brand' />
        <StatCard label={t('Terisi','Filled')} value={filledCount} icon='✅' tone='green' />
        <StatCard label={t('Kosong (Vacant)','Vacant')} value={headcounts.length-filledCount} icon='🪑' tone='gray' />
        <StatCard label={t('Position Terkait','Positions Covered')} value={posWithHc} icon='📌' tone='blue' />
      </div>

      {/* Table */}
      <SectionCard
        title={t('Daftar Headcount','Headcount List')}
        icon='👤'
        bodyClass='p-0'
        actions={
          <div className='flex items-center gap-3'>
            <Select value={filterPos} onChange={e=>setFilterPos(e.target.value)} className='py-1.5 text-xs'>
              <option value=''>{t('Semua Position','All Positions')}</option>
              {positions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <button onClick={openNew}
              className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
              + {t('Tambah Headcount','Add Headcount')}
            </button>
          </div>
        }
      >
        {filtered.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[t('Kode','Code'),t('Nama Headcount','Headcount Name'),'Position','Department',t('Karyawan','Employee'),'Supervisor',t('Okupansi','Occupancy'),'Status',{label:t('Aksi','Action'),align:'right'}]}
          >
            {filtered.map(x=>{
              const p      = position(x.positionId)
              const emp    = employee(x.employeeId)
              const sup    = headcount(x.supervisorHeadcountId)
              const supEmp = sup?.employeeId ? employee(sup.employeeId) : null
              return (
                <Tr key={x.id}>
                  <Td className='font-mono text-xs text-gray-500'>{x.code}</Td>
                  <Td className='font-medium text-gray-800'>{x.name}</Td>
                  <Td>
                    <span className='rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700'>
                      {p?.name || '-'}
                    </span>
                  </Td>
                  <Td className='text-xs text-gray-500'>{p ? deptName(p.departmentId) : '-'}</Td>
                  <Td className='text-xs'>
                    {emp
                      ? <span className='font-medium text-gray-800'>{emp.name}</span>
                      : <span className='italic text-gray-400'>{t('Belum ada','Unassigned')}</span>}
                  </Td>
                  <Td className='text-xs'>
                    {sup
                      ? <span>
                          <span className='block font-medium text-gray-700'>{sup.name}</span>
                          <span className='block text-[11px] text-gray-400'>{supEmp ? supEmp.name : t('Vacant','Vacant')}</span>
                        </span>
                      : <span className='text-gray-300'>-</span>}
                  </Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${x.employeeId ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {x.employeeId ? t('Terisi','Filled') : t('Vacant','Vacant')}
                    </span>
                  </Td>
                  <Td><StatusBadge status={x.status} /></Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-2'>
                      <ActionButton size='sm' variant='secondary' onClick={()=>handleEdit(x)}>Edit</ActionButton>
                      <ActionButton size='sm' variant='danger' onClick={()=>{deleteHeadcount(x.id);flash(t('Headcount dihapus.','Headcount deleted.'))}}>{t('Hapus','Delete')}</ActionButton>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='👤' title={t('Belum ada headcount.','No headcounts yet.')} />
          </div>
        )}
      </SectionCard>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>
                {editing ? t('Edit Headcount','Edit Headcount') : t('Tambah Headcount','Add Headcount')}
              </h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label='Position' required>
                <SearchableSelect
                  value={form.positionId}
                  placeholder={`-- ${t('Pilih Position','Select Position')} --`}
                  onChange={val => setForm(f=>({...f, positionId: val, name: suggestedName(val)}))}
                  options={positions.filter(p=>p.status==='Active').map(p=>({ value: String(p.id), label: `${p.code} · ${p.name}` }))}
                />
                {selectedPos && (
                  <div className='mt-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs ring-1 ring-red-100'>
                    <div className='font-bold text-red-700'>Company: {companyName(selectedPos.departmentId)}</div>
                    <div className='mt-1 text-gray-700 font-semibold'>{selectedPos.code} · {selectedPos.name}</div>
                    <div className='mt-1 text-gray-500'>Department: {deptName(selectedPos.departmentId)}</div>
                  </div>
                )}
              </FormField>

              {[[t('Kode','Code'),'code'],[t('Nama Headcount','Headcount Name'),'name']].map(([lbl,key])=>(
                <FormField key={key} label={lbl} required hint={key==='name' ? t('Contoh: "Developer A", "Developer B"','Example: "Developer A", "Developer B"') : undefined}>
                  <Input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
                </FormField>
              ))}

              <FormField label={t('Karyawan (Penempatan)','Employee (Assignment)')}>
                <Select value={form.employeeId} onChange={e=>setForm(f=>({...f,employeeId:e.target.value}))}>
                  <option value=''>-- {t('Vacant / belum ditempati','Vacant / unassigned')} --</option>
                  {employees.filter(e=>e.status==='Active').map(e=>(
                    <option key={e.id} value={e.id}>{e.name}{e.position ? ` · ${e.position}` : ''}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t('Supervisor Headcount Name','Supervisor Headcount Name')}>
                <Select value={form.supervisorHeadcountId} onChange={e=>setForm(f=>({...f,supervisorHeadcountId:e.target.value}))}>
                  <option value=''>-- {t('Pilih Supervisor Headcount','Select Supervisor Headcount')} --</option>
                  {headcounts
                    .filter(h=>h.status==='Active' && h.id!==editing)
                    .map(h=><option key={h.id} value={h.id}>{h.code} · {h.name}</option>)}
                </Select>
              </FormField>

              <FormField label={t('Supervisor Incumbent','Supervisor Incumbent')} hint={t('Terisi otomatis dari karyawan pada supervisor headcount.','Auto-filled from the employee on the supervisor headcount.')}>
                <Input
                  value={selectedSup ? (supIncumbent ? `${supIncumbent.name}${supIncumbent.nik ? ` - ${supIncumbent.nik}` : ''}` : t('Vacant / belum ditempati','Vacant / unassigned')) : '-'}
                  disabled
                />
              </FormField>

              <FormField label='Status'>
                <Select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option>Active</option><option>Inactive</option>
                </Select>
              </FormField>
            </div>
            <div className='px-6 pb-5 flex gap-3'>
              <button onClick={handleSave}
                className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition'
                style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                {editing ? t('Simpan Perubahan','Save Changes') : t('Tambah Headcount','Add Headcount')}
              </button>
              <button onClick={closeModal}
                className='flex-1 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                {t('Batal','Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
