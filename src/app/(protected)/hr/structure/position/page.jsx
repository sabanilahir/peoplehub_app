'use client'
import Icon from '@/components/ui/Icon'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useState, useMemo }  from 'react'
import { useStructureStore, PC_CATEGORY_COLOR } from '@/store/structureStore'
import { useCompetencyStore, COMPETENCY_CATEGORIES, LEVEL_LABELS, resolvePositionCompetencies } from '@/store/competencyStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, FormField, Input, Select,
  StatusBadge, ActionButton, EmptyState,
} from '@/components/ui'

const CAT_TONE = { Leadership:'danger', Core:'info', Technical:'success', Behavioral:'warning' }

const BLANK = { companyId:'', departmentId:'', jobFamilyId:'', gradeId:'', code:'', name:'', status:'Active' }

const fmt = (n) => n ? `Rp ${new Intl.NumberFormat('id-ID').format(n)}` : '-'

export default function PositionPage() {
  const t = useT()
  const {
    departments, jobFamilies, grades, positions, companies, businessUnits,
    addPosition, updatePosition, deletePosition,
  } = useStructureStore()

  const { catalog, positionCompetencies, setPositionCompetencies } = useCompetencyStore()

  const [form,       setForm     ] = useState(BLANK)
  const [editing,    setEditing  ] = useState(null)
  const [showModal,  setShowModal] = useState(false)
  const [msg,        setMsg      ] = useState(null)
  const [filterDept, setFilterDept] = useState('')

  // ── Competency (Position Profile) modal ──────────────────────────────────
  const [compPos,   setCompPos]   = useState(null)   // position being mapped
  const [compDraft, setCompDraft] = useState([])     // [{competencyId, expectedLevel}]

  // Start the draft from the manual mapping, or the auto-derived default profile
  // when the position hasn't been mapped yet — so no position is ever blank.
  const openComp = (x) => { setCompDraft(resolvePositionCompetencies(x.id, positionCompetencies).map(d => ({ ...d }))); setCompPos(x) }
  const closeComp = () => { setCompPos(null); setCompDraft([]) }
  const inDraft = (cid) => compDraft.find(d => d.competencyId === cid)
  const toggleComp = (cid) => setCompDraft(d => inDraft(cid) ? d.filter(x=>x.competencyId!==cid) : [...d, { competencyId:cid, expectedLevel:3 }])
  const setCompLevel = (cid, lv) => setCompDraft(d => d.map(x => x.competencyId===cid ? { ...x, expectedLevel:+lv } : x))
  const saveComp = () => { setPositionCompetencies(compPos.id, compDraft); flash(t(`Profil kompetensi ${compPos.name} disimpan.`,`Competency profile for ${compPos.name} saved.`)); closeComp() }

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const openNew = () => { setEditing(null); setForm(BLANK); setShowModal(true) }

  const handleSave = () => {
    if (!form.departmentId || !form.gradeId || !form.code || !form.name)
      return flash(t('Department, grade, kode, dan nama wajib diisi.','Department, grade, code, and name are required.'),'error')
    const data = {
      departmentId: +form.departmentId,
      jobFamilyId:  form.jobFamilyId ? +form.jobFamilyId : null,
      gradeId:      +form.gradeId,
      code:         form.code,
      name:         form.name,
      status:       form.status,
    }
    if (editing) { updatePosition(editing, data); flash(t('Position diperbarui.','Position updated.')) }
    else         { addPosition(data); flash(t('Position ditambahkan.','Position added.')) }
    setShowModal(false)
    setEditing(null)
    setForm(BLANK)
  }

  const handleEdit = (x) => {
    setEditing(x.id)
    const dept = departments.find(d=>d.id===x.departmentId)
    const bu = businessUnits.find(b=>b.id===dept?.businessUnitId)
    setForm({
      companyId:    bu?.companyId ? String(bu.companyId) : '',
      departmentId: x.departmentId,
      jobFamilyId:  x.jobFamilyId || '',
      gradeId:      x.gradeId,
      code:         x.code,
      name:         x.name,
      status:       x.status,
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const deptName  = (id) => departments.find(d=>d.id===id)?.name  || '-'
  const jfName    = (id) => jobFamilies.find(j=>j.id===id)?.name  || '-'
  const gradeCode = (id) => grades.find(g=>g.id===id)?.code       || '-'

  const selectedGrade = grades.find(g=>g.id===+form.gradeId)

  const companyDepartments = form.companyId
    ? departments.filter(d => businessUnits.find(bu => bu.id === d.businessUnitId)?.companyId === Number(form.companyId))
    : []

  const gradeGroups = useMemo(() => {
    const map = {}
    grades.forEach(g => {
      if (!map[g.category]) map[g.category] = []
      map[g.category].push(g)
    })
    return map
  }, [grades])

  const filtered = filterDept
    ? positions.filter(p=>p.departmentId===+filterDept)
    : positions

  const activeCount = positions.filter(p=>p.status==='Active').length

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
        icon='📌'
        title='Position'
        subtitle={t('Jabatan di bawah Department, dilengkapi Job Family dan Grade.','Position under Department, with Job Family and Grade.')}
      />

      {/* Breadcrumb */}
      <div className='mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-400'>
        <span className='px-2.5 py-1'>Enterprise</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Division</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Company</span><span><Icon e='→' size={15} /></span>
        <span className='px-2.5 py-1'>Business Unit</span><span><Icon e='→' size={15} /></span>
        <span className='rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700'>Department</span>
        <span><Icon e='→' size={15} /></span>
        <span className='rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white'>Position</span>
      </div>

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <StatCard label={t('Total Position','Total Position')} value={positions.length} icon='📌' tone='brand' />
        <StatCard label={t('Aktif','Active')} value={activeCount} icon='✅' tone='green' />
        <StatCard label={t('Tidak Aktif','Inactive')} value={positions.length-activeCount} icon='⏸️' tone='gray' />
        <StatCard label={t('Job Family','Job Family')} value={jobFamilies.length} icon='🧩' tone='blue' />
      </div>

      {/* Table */}
      <SectionCard
        title={t('Daftar Position','Position List')}
        icon='📌'
        bodyClass='p-0'
        actions={
          <div className='flex items-center gap-3'>
            <Select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className='py-1.5 text-xs'>
              <option value=''>{t('Semua Department','All Departments')}</option>
              {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <button onClick={openNew}
              className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
              + {t('Tambah Position','Add Position')}
            </button>
          </div>
        }
      >
        {filtered.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[t('Kode','Code'),t('Nama Position','Position Name'),'Department','Job Family','Grade',t('Salary Range','Salary Range'),'Status',{label:t('Aksi','Action'),align:'right'}]}
          >
            {filtered.map(x=>{
              const g = grades.find(gr=>gr.id===x.gradeId)
              return (
                <Tr key={x.id}>
                  <Td className='font-mono text-xs text-gray-500'>{x.code}</Td>
                  <Td className='font-medium text-gray-800'>{x.name}</Td>
                  <Td className='text-xs text-gray-500'>{deptName(x.departmentId)}</Td>
                  <Td className='text-xs text-gray-500'>{x.jobFamilyId ? jfName(x.jobFamilyId) : '-'}</Td>
                  <Td>
                    <span className='rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700'>
                      {gradeCode(x.gradeId)}
                    </span>
                  </Td>
                  <Td className='whitespace-nowrap text-xs text-gray-500'>
                    {g ? `${fmt(g.minSalary)} – ${fmt(g.maxSalary)}` : '-'}
                  </Td>
                  <Td><StatusBadge status={x.status} /></Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-2'>
                      <ActionButton size='sm' variant='ghost' onClick={()=>openComp(x)}>
                        {t('Kompetensi','Competency')}
                        {(() => {
                          const n = resolvePositionCompetencies(x.id, positionCompetencies).length
                          const mapped = positionCompetencies[x.id]?.length > 0
                          return n > 0 && (
                            <span
                              title={mapped ? t('Dipetakan manual','Manually mapped') : t('Profil default (otomatis)','Default profile (auto)')}
                              className={`ml-1 rounded-full px-1.5 text-[10px] font-bold ${mapped ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{n}</span>
                          )
                        })()}
                      </ActionButton>
                      <ActionButton size='sm' variant='secondary' onClick={()=>handleEdit(x)}>Edit</ActionButton>
                      <ActionButton size='sm' variant='danger' onClick={()=>{deletePosition(x.id);flash(t('Position dihapus.','Position deleted.'))}}>{t('Hapus','Delete')}</ActionButton>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='📌' title={t('Belum ada position.','No positions yet.')} />
          </div>
        )}
      </SectionCard>

      {/* Grade Reference */}
      <div className='mt-6'>
        <SectionCard title={t('Position Class Reference (PC 1–72)','Position Class Reference (PC 1–72)')} icon='📊'>
          {Object.entries(gradeGroups).map(([cat, items]) => (
            <div key={cat} className='mb-6 last:mb-0'>
              <div className='mb-3 flex items-center gap-2'>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${PC_CATEGORY_COLOR[cat]}`}>{cat}</span>
                <span className='text-xs text-gray-400'>PC {items[0].pc}{items.length > 1 ? `–${items[items.length-1].pc}` : ''}</span>
              </div>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'>
                {items.map(g => (
                  <div key={g.id} className='rounded-xl p-3 text-center ring-1 ring-gray-100 transition hover:shadow-sm hover:ring-red-200'>
                    <div className='text-sm font-bold text-red-600'>{g.code}</div>
                    <div className='mt-0.5 text-xs leading-tight text-gray-600'>{g.name}</div>
                    {!g.isBoard && (
                      <div className='mt-1.5 text-xs leading-tight text-gray-400'>
                        {fmt(g.minSalary)}<br/>
                        <span className='text-gray-300'>—</span><br/>
                        {fmt(g.maxSalary)}
                      </div>
                    )}
                    {g.isBoard && (
                      <div className='mt-1.5 text-xs text-yellow-600'>Honorarium</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto' onClick={e=>e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>
                {editing ? t('Edit Position','Edit Position') : t('Tambah Position','Add Position')}
              </h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label='Company' required>
                <Select value={form.companyId} onChange={e=>setForm(f=>({...f,companyId:e.target.value,departmentId:''}))}>
                  <option value=''>-- {t('Pilih Company','Select Company')} --</option>
                  {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>

              <FormField label='Department' required>
                <SearchableSelect
                  value={form.departmentId}
                  disabled={!form.companyId}
                  placeholder={`-- ${t('Pilih Department','Select Department')} --`}
                  onChange={val => setForm(f=>({...f,departmentId:val}))}
                  options={companyDepartments.map(d=>({ value: String(d.id), label: d.name }))}
                />
              </FormField>

              {[[t('Kode','Code'),'code'],[t('Nama Position','Position Name'),'name']].map(([lbl,key])=>(
                <FormField key={key} label={lbl} required>
                  <Input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
                </FormField>
              ))}

              <FormField label='Job Family'>
                <Select value={form.jobFamilyId} onChange={e=>setForm(f=>({...f,jobFamilyId:e.target.value}))}>
                  <option value=''>-- {t('Opsional','Optional')} --</option>
                  {jobFamilies.filter(j=>j.status==='Active').map(j=><option key={j.id} value={j.id}>{j.name}</option>)}
                </Select>
              </FormField>

              <FormField label='Grade (Position Class)' required>
                <Select value={form.gradeId} onChange={e=>setForm(f=>({...f,gradeId:e.target.value}))}>
                  <option value=''>-- {t('Pilih PC','Select PC')} --</option>
                  {Object.entries(gradeGroups).map(([cat, items]) => (
                    <optgroup key={cat} label={`── ${cat} ──`}>
                      {items.map(g => (
                        <option key={g.id} value={g.id}>{g.code} · {g.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                {selectedGrade && (
                  <div className='mt-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs ring-1 ring-red-100'>
                    <div className='mb-1 flex items-center justify-between'>
                      <span className='font-bold text-red-700'>{selectedGrade.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PC_CATEGORY_COLOR[selectedGrade.category]}`}>
                        {selectedGrade.category}
                      </span>
                    </div>
                    <div className='font-medium text-gray-700'>{selectedGrade.name}</div>
                    {selectedGrade.isBoard
                      ? <div className='mt-1 text-gray-400'>Honorarium-based (non-payroll)</div>
                      : <div className='mt-1 text-gray-500'>
                          Salary range: {fmt(selectedGrade.minSalary)} – {fmt(selectedGrade.maxSalary)}
                        </div>
                    }
                  </div>
                )}
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
                {editing ? t('Simpan Perubahan','Save Changes') : t('Tambah Position','Add Position')}
              </button>
              <button onClick={closeModal}
                className='flex-1 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                {t('Batal','Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competency (Position Profile) modal */}
      {compPos && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeComp}>
          <div className='max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>{t('Profil Kompetensi','Competency Profile')}</h2>
                <p className='mt-0.5 text-xs text-gray-500'>{compPos.code} · {compPos.name} · {compDraft.length} {t('kompetensi dipilih','competencies selected')}</p>
              </div>
              <button onClick={closeComp} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-5 px-6 py-5'>
              {COMPETENCY_CATEGORIES.map(cat => {
                const items = catalog.filter(c => c.category === cat)
                if (items.length === 0) return null
                return (
                  <div key={cat}>
                    <div className='mb-2'><StatusBadge tone={CAT_TONE[cat]}>{cat}</StatusBadge></div>
                    <div className='grid gap-2 sm:grid-cols-2'>
                      {items.map(c => {
                        const d = inDraft(c.id)
                        return (
                          <div key={c.id} className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition ${d ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}>
                            <label className='flex min-w-0 items-center gap-2.5'>
                              <input type='checkbox' checked={!!d} onChange={()=>toggleComp(c.id)} />
                              <span className='min-w-0'>
                                <span className='block truncate text-sm font-medium text-gray-800'>{c.name}</span>
                                <span className='block truncate text-[11px] text-gray-400'>{c.code}</span>
                              </span>
                            </label>
                            {d && (
                              <Select value={d.expectedLevel} onChange={e=>setCompLevel(c.id, e.target.value)} className='w-32 shrink-0 py-1.5 text-xs'>
                                {[1,2,3,4,5].map(lv=><option key={lv} value={lv}>L{lv} · {LEVEL_LABELS[lv]}</option>)}
                              </Select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <p className='text-xs text-gray-400'>{t('Kompetensi ini otomatis dipakai pada IDP karyawan yang menempati posisi ini.','These competencies are auto-applied to the IDP of employees in this position.')}</p>
            </div>

            <div className='sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={saveComp} className='flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>{t('Simpan Profil','Save Profile')}</button>
              <button onClick={closeComp} className='flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>{t('Batal','Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
