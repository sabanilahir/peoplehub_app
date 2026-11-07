'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo, useRef }                from 'react'
import { useSearchParams, useRouter }                from 'next/navigation'
import { Tree, TreeNode }                            from 'react-organizational-chart'
import { useEmployeeStore }                          from '@/store/employeeStore'
import { useStructureStore, PC_CATEGORY_COLOR }      from '@/store/structureStore'
import { exportPNG, exportJPG, exportPPTX, exportXLSX } from '@/utils/orgChartExport'
import { useT } from '@/store/languageStore'

// ── grade → accent color ──────────────────────────────────────────────────────
function nodeColor(gradeId) {
  const pc = +gradeId
  if (pc === 72) return { border:'#f59e0b', bg:'#fffbeb', text:'#92400e', badge:'bg-amber-100 text-amber-800',  toggle:'#f59e0b' }
  if (pc >= 70)  return { border:'#7c3aed', bg:'#f5f3ff', text:'#4c1d95', badge:'bg-violet-100 text-violet-800', toggle:'#7c3aed' }
  if (pc >= 67)  return { border:'#6d28d9', bg:'#ede9fe', text:'#4c1d95', badge:'bg-red-100 text-red-800', toggle:'#6d28d9' }
  if (pc >= 64)  return { border:'#2563eb', bg:'#eff6ff', text:'#1e3a8a', badge:'bg-blue-100 text-blue-800',    toggle:'#2563eb' }
  if (pc >= 61)  return { border:'#0d9488', bg:'#f0fdfa', text:'#134e4a', badge:'bg-teal-100 text-teal-800',    toggle:'#0d9488' }
  if (pc >= 53)  return { border:'#16a34a', bg:'#f0fdf4', text:'#14532d', badge:'bg-green-100 text-green-800',  toggle:'#16a34a' }
  if (pc >= 40)  return { border:'#0284c7', bg:'#f0f9ff', text:'#0c4a6e', badge:'bg-sky-100 text-sky-800',      toggle:'#0284c7' }
  return               { border:'#9ca3af', bg:'#f9fafb', text:'#374151', badge:'bg-gray-100 text-gray-600',    toggle:'#9ca3af' }
}

// ── count all descendants ─────────────────────────────────────────────────────
function countAll(empId, childMap) {
  const children = childMap[empId] || []
  let total = children.length
  children.forEach(cId => { total += countAll(cId, childMap) })
  return total
}

// ── node card ─────────────────────────────────────────────────────────────────
function NodeCard({ emp, positions, departments, companies, grades,
                    isSelected, onSelect,
                    directCount, totalCount,
                    hasChildren, isCollapsed, onToggleCollapse }) {
  const pos    = positions.find(p => p.id === +emp.positionId)
  const dept   = departments.find(d => d.id === +emp.departmentId)
  const co     = companies.find(c => c.id === +emp.companyId)
  const grade  = grades.find(g => g.id === +emp.gradeId)
  const color  = nodeColor(emp.gradeId)
  const indirectCount = totalCount - directCount

  return (
    <div style={{
      display: 'inline-block',
      border: `2px solid ${isSelected ? '#7c3aed' : color.border}`,
      background: isSelected ? '#f5f3ff' : color.bg,
      borderRadius: 12,
      minWidth: 155, maxWidth: 185,
      boxShadow: isSelected
        ? '0 0 0 3px rgba(124,58,237,.2), 0 2px 8px rgba(0,0,0,.1)'
        : '0 1px 5px rgba(0,0,0,.08)',
      overflow: 'hidden',
    }}>

      {/* Main content — click to select */}
      <div onClick={onSelect} style={{ padding: '10px 12px 8px', cursor: 'pointer' }}>
        {/* Avatar + name */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{
            width:34, height:34, borderRadius:'50%', flexShrink:0,
            background:'#e5e7eb', overflow:'hidden',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            border:`1.5px solid ${color.border}`,
          }}>
            {emp.photo
              ? <img src={emp.photo} style={{width:'100%',height:'100%',objectFit:'cover'}} />
              : ((emp.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase())}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:12, color:'#111827', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {emp.name.split(' ').slice(0,2).join(' ')}
            </div>
            <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>{emp.nik}</div>
          </div>
        </div>

        {/* Position */}
        <div style={{ fontSize:11, color:color.text, fontWeight:600, lineHeight:1.3, marginBottom:6,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {pos?.name || '—'}
        </div>

        {/* Badges */}
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {co?.companyCode && (
            <span style={{ fontSize:9, fontWeight:700, padding:'1.5px 5px', borderRadius:4, background:'#ede9fe', color:'#6d28d9', fontFamily:'monospace', letterSpacing:1 }}>
              {co.companyCode}
            </span>
          )}
          {dept && (
            <span style={{ fontSize:9, color:'#6b7280', background:'#f3f4f6', padding:'1.5px 5px', borderRadius:4 }}>
              {dept.name}
            </span>
          )}
        </div>
      </div>

      {/* Expand/collapse bar — only if has children */}
      {hasChildren && (
        <div onClick={onToggleCollapse}
          style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'5px 10px',
            background: isCollapsed ? color.border : `${color.border}22`,
            borderTop: `1px solid ${color.border}44`,
            cursor:'pointer',
            gap:6,
          }}>
          <div style={{ display:'flex', gap:8 }}>
            {/* direct */}
            <span style={{ fontSize:9, fontWeight:700,
              color: isCollapsed ? '#fff' : color.text,
              display:'flex', alignItems:'center', gap:2 }}>
              <span><Icon e='👥' size={15} /></span>
              <span>{directCount} direct</span>
            </span>
            {/* indirect */}
            {indirectCount > 0 && (
              <span style={{ fontSize:9, fontWeight:600,
                color: isCollapsed ? '#ffffffcc' : '#6b7280',
                display:'flex', alignItems:'center', gap:2 }}>
                <span>•</span>
                <span>{indirectCount} indirect</span>
              </span>
            )}
          </div>
          {/* chevron */}
          <span style={{
            fontSize:9, fontWeight:900,
            color: isCollapsed ? '#fff' : color.toggle,
            transition:'transform .2s',
            display:'inline-block',
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}><Icon e='▼' size={15} /></span>
        </div>
      )}
    </div>
  )
}

// ── recursive tree renderer ───────────────────────────────────────────────────
function renderNode(empId, childMap, empMap, props) {
  const emp      = empMap[empId]
  if (!emp) return null
  const children    = childMap[empId] || []
  const directCount = children.length
  const totalCount  = countAll(empId, childMap)
  const isCollapsed = props.collapsed.has(empId)
  const hasChildren = directCount > 0

  const card = (
    <NodeCard
      emp={emp}
      positions={props.positions}
      departments={props.departments}
      companies={props.companies}
      grades={props.grades}
      isSelected={props.selectedId === empId}
      onSelect={() => props.onSelect(empId)}
      directCount={directCount}
      totalCount={totalCount}
      hasChildren={hasChildren}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => props.onToggle(empId)}
    />
  )

  if (!hasChildren || isCollapsed) {
    return <TreeNode key={empId} label={card} />
  }

  return (
    <TreeNode key={empId} label={card}>
      {children.map(cId => renderNode(cId, childMap, empMap, props))}
    </TreeNode>
  )
}

// ── Focused View ─────────────────────────────────────────────────────────────
function FocusedView({ focusId, employees, positions, departments, companies, grades, childMap, onClose, onGoEmployee }) {
  const chartRef   = useRef()
  const [exp, setExp] = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const fname = `org-focus-${focusId}-${new Date().toISOString().slice(0,10)}`
  const doExport = async (type) => {
    if (!chartRef.current) return
    setExp(true); setShowDrop(false)
    try {
      if      (type==='png')  await exportPNG(chartRef.current, fname)
      else if (type==='jpg')  await exportJPG(chartRef.current, fname)
      else if (type==='pptx') await exportPPTX(chartRef.current, `Org Focus — ${employees.find(e=>e.id===focusId)?.name}`, fname)
      else if (type==='xlsx') await exportXLSX(employees, positions, departments, companies, grades, childMap, fname)
    } catch(e){ console.error(e) }
    finally { setExp(false) }
  }
  const emp      = employees.find(e => e.id === focusId)
  const manager  = emp?.managerId ? employees.find(e => e.id === emp.managerId) : null
  const directs  = employees.filter(e => e.managerId === focusId)
  const total    = countAll(focusId, childMap)

  if (!emp) return (
    <div className='flex items-center justify-center h-64 text-gray-400'>
      Karyawan tidak ditemukan.
      <button onClick={onClose} className='ml-4 text-red-600 underline text-sm'>Kembali</button>
    </div>
  )

  const sharedProps = { positions, departments, companies, grades }

  // Build a focused mini-tree:
  // If manager exists → manager as root, emp as child, directs as grandchildren
  // Else             → emp as root, directs as children
  const FocusNode = ({ e, highlight, isManager = false }) => (
    <div style={{
      display:'inline-block',
      border: `2px solid ${highlight ? '#7c3aed' : nodeColor(e.gradeId).border}`,
      background: highlight ? '#f5f3ff' : nodeColor(e.gradeId).bg,
      borderRadius:12, padding:'10px 14px', minWidth:155, maxWidth:185,
      boxShadow: highlight
        ? '0 0 0 3px rgba(124,58,237,.25), 0 4px 12px rgba(0,0,0,.12)'
        : '0 1px 4px rgba(0,0,0,.08)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <div style={{
          width:34, height:34, borderRadius:'50%', flexShrink:0,
          background:'#e5e7eb', overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          border:`1.5px solid ${nodeColor(e.gradeId).border}`,
        }}>
          {e.photo ? <img src={e.photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ((e.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase())}
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:12, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {e.name.split(' ').slice(0,2).join(' ')}
            {highlight && <span style={{ marginLeft:4, fontSize:9, background:'#7c3aed', color:'#fff', borderRadius:4, padding:'1px 5px' }}>YOU</span>}
          </div>
          <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>{e.nik}</div>
        </div>
      </div>
      <div style={{ fontSize:11, color: nodeColor(e.gradeId).text, fontWeight:600, lineHeight:1.3, marginBottom:5,
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {positions.find(p=>p.id===+e.positionId)?.name || '—'}
      </div>
      <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
        {(() => { const c = companies.find(c=>c.id===+e.companyId); return c?.companyCode ? (
          <span style={{ fontSize:9, fontWeight:700, padding:'1.5px 5px', borderRadius:4, background:'#ede9fe', color:'#6d28d9', fontFamily:'monospace', letterSpacing:1 }}>{c.companyCode}</span>
        ) : null })()}
        {(() => { const d = departments.find(d=>d.id===+e.departmentId); return d ? (
          <span style={{ fontSize:9, color:'#6b7280', background:'#f3f4f6', padding:'1.5px 5px', borderRadius:4 }}>{d.name}</span>
        ) : null })()}
      </div>
      {!highlight && !isManager && (() => {
        const direct   = (childMap[e.id] || []).length
        const indirect = countAll(e.id, childMap) - direct
        if (direct === 0) return null
        return (
          <div style={{ display:'flex', gap:4, marginTop:6, paddingTop:6, borderTop:'1px solid #e5e7eb' }}>
            <span style={{ fontSize:9, background:'#dbeafe', color:'#1d4ed8', fontWeight:700, padding:'2px 6px', borderRadius:4 }}>
              <Icon e='👥' size={14} className='inline align-[-2px]' /> {direct} direct
            </span>
            {indirect > 0 && (
              <span style={{ fontSize:9, background:'#ede9fe', color:'#6d28d9', fontWeight:700, padding:'2px 6px', borderRadius:4 }}>
                +{indirect} indirect
              </span>
            )}
          </div>
        )
      })()}
    </div>
  )

  return (
    <div className='flex flex-col h-[calc(100vh-5rem)]'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-4 flex-wrap'>
        <div>
          <div className='flex items-center gap-2'>
            <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-sm'><Icon e='←' size={14} className='inline align-[-2px]' /> Full Chart</button>
            <span className='text-gray-300'>/</span>
            <h1 className='text-xl font-bold text-gray-800'><Icon e='🌳' size={14} className='inline align-[-2px]' /> {emp.name.split(' ')[0]}'s Org View</h1>
          </div>
          <p className='text-xs text-gray-400 mt-0.5'>Menampilkan atasan langsung · karyawan · direct &amp; indirect subordinate</p>
        </div>
        <div className='ml-auto flex gap-2'>
          <button onClick={onGoEmployee}
            className='px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-semibold'><Icon e='←' size={14} className='inline align-[-2px]' /> Kembali ke Employee Data
          </button>
          {/* Export */}
          <div className='relative'>
            <button onClick={()=>setShowDrop(v=>!v)} disabled={exp}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60'
              style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              {exp ? '⏳' : '⬇'} Export
            </button>
            {showDrop && (
              <div className='absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 w-44'
                onMouseLeave={()=>setShowDrop(false)}>
                {[['png','🖼️','PNG'],['jpg','📷','JPG'],['pptx','📊','PowerPoint'],['xlsx','📋','Excel']].map(([t,ic,lb])=>(
                  <button key={t} onClick={()=>doExport(t)}
                    className='w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-left'>
                    <span>{ic}</span>
                    <span className='text-xs font-semibold text-gray-800'>{lb}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className='flex gap-3 mb-4 flex-wrap'>
        {[
          ...(directs.length > 0                  ? [['Direct Subordinate',   directs.length,              'bg-blue-50 text-blue-700']]   : []),
          ...(total - directs.length > 0           ? [['Indirect Subordinate', total - directs.length,      'bg-red-50 text-red-700']]: []),
          ...(total > 0                            ? [['Total Subordinate',    total,                       'bg-gray-50 text-gray-700']]   : []),
          ...(manager                              ? [['Atasan Langsung',      manager.name.split(' ')[0],  'bg-amber-50 text-amber-700']] : []),
        ].map(([label, val, cls]) => (
          <div key={label} className={`rounded-xl px-4 py-2.5 ${cls} border border-opacity-30`}
            style={{ borderColor: 'currentColor', borderWidth: 1, opacity: 0.9 }}>
            <div className='text-lg font-bold'>{val}</div>
            <div className='text-xs opacity-75 mt-0.5'>{label}</div>
          </div>
        ))}
      </div>

      {/* Org tree */}
      <div ref={chartRef} className='flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto p-10 flex items-start justify-center'>
        <div style={{ width:'max-content' }}>
          {manager ? (
            <Tree
              label={<FocusNode e={manager} highlight={false} isManager={true} />}
              lineWidth='2px' lineColor='#d1d5db' lineStyle='solid'
              nodePadding='20px' lineBorderRadius='6px'
            >
              {directs.length > 0 ? (
                <TreeNode label={<FocusNode e={emp} highlight={true} />}>
                  {directs.map(d => (
                    <TreeNode key={d.id} label={<FocusNode e={d} highlight={false} />} />
                  ))}
                </TreeNode>
              ) : (
                <TreeNode label={<FocusNode e={emp} highlight={true} />} />
              )}
            </Tree>
          ) : (
            directs.length > 0 ? (
              <Tree
                label={<FocusNode e={emp} highlight={true} />}
                lineWidth='2px' lineColor='#d1d5db' lineStyle='solid'
                nodePadding='20px' lineBorderRadius='6px'
              >
                {directs.map(d => (
                  <TreeNode key={d.id} label={<FocusNode e={d} highlight={false} />} />
                ))}
              </Tree>
            ) : (
              <div className='flex flex-col items-center gap-4'>
                <FocusNode e={emp} highlight={true} />
                <p className='text-xs text-gray-400'>Tidak ada atasan maupun bawahan langsung.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const t = useT()
  const { employees }                                 = useEmployeeStore()
  const { positions, departments, companies, grades } = useStructureStore()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const focusId      = searchParams.get('focus') ? +searchParams.get('focus') : null

  const [selectedId, setSelectedId] = useState(null)
  const [collapsed,  setCollapsed  ] = useState(new Set())
  const [scale,      setScale      ] = useState(0.85)
  const [filterCo,   setFilterCo   ] = useState('')
  const [exporting,  setExporting  ] = useState(false)
  const [showExport, setShowExport ] = useState(false)
  const chartRef = useRef()

  // build maps
  const filtered = filterCo ? employees.filter(e => e.companyId === +filterCo) : employees
  const empMap   = useMemo(() => Object.fromEntries(filtered.map(e=>[e.id,e])), [filtered])
  const childMap = useMemo(() => {
    const m = {}
    filtered.forEach(e => {
      if (e.managerId && empMap[e.managerId]) {
        m[e.managerId] = [...(m[e.managerId]||[]), e.id]
      }
    })
    return m
  }, [filtered, empMap])

  const roots = useMemo(() =>
    filtered.filter(e => !e.managerId || !empMap[e.managerId]),
  [filtered, empMap])

  // expand/collapse handlers
  const toggleCollapse = (empId) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(empId) ? next.delete(empId) : next.add(empId)
      return next
    })
  }
  const expandAll  = () => setCollapsed(new Set())
  const collapseAll = () => {
    // collapse all nodes that have children (except roots)
    const toCollapse = new Set()
    Object.keys(childMap).forEach(id => toCollapse.add(+id))
    roots.forEach(r => toCollapse.delete(r.id)) // keep roots "open" (they're top level)
    setCollapsed(toCollapse)
  }

  // selected employee detail
  const selected      = employees.find(e => e.id === selectedId)
  const selPos        = selected ? positions.find(p=>p.id===+selected.positionId) : null
  const selMgr        = selected?.managerId ? employees.find(e=>e.id===selected.managerId) : null
  const selDept       = selected ? departments.find(d=>d.id===+selected.departmentId) : null
  const selGrade      = selected ? grades.find(g=>g.id===+selected.gradeId) : null
  const selColor      = selected ? nodeColor(selected.gradeId) : null
  const directReports = selected ? employees.filter(e=>e.managerId===selected.id) : []
  const totalReports  = selected ? countAll(selected.id, childMap) : 0

  // ── Export handlers ────────────────────────────────────────────────────────
  const coName  = filterCo ? companies.find(c=>c.id===+filterCo)?.name : 'All'
  const fname   = `org-chart-${coName}-${new Date().toISOString().slice(0,10)}`

  const handleExport = async (type) => {
    if (!chartRef.current) return
    setExporting(true); setShowExport(false)
    try {
      const el = chartRef.current
      if      (type === 'png')  await exportPNG(el, fname)
      else if (type === 'jpg')  await exportJPG(el, fname)
      else if (type === 'pptx') await exportPPTX(el, `Org Chart — ${coName}`, fname)
      else if (type === 'xlsx') await exportXLSX(filtered, positions, departments, companies, grades, childMap, fname)
    } catch(e) { console.error(e) }
    finally   { setExporting(false) }
  }

  const nodeProps = {
    positions, departments, companies, grades,
    selectedId, collapsed,
    onSelect:  (id) => setSelectedId(s => s===id ? null : id),
    onToggle:  toggleCollapse,
  }

  // ── Focused view (from Employee Data shortcut) ────────────────────────────
  if (focusId) {
    return (
      <FocusedView
        focusId={focusId}
        employees={employees}
        positions={positions} departments={departments}
        companies={companies} grades={grades}
        childMap={childMap}
        onClose={() => router.push('/hr/org-chart')}
        onGoEmployee={() => router.push('/hr/employee')}
      />
    )
  }

  return (
    <div className='flex flex-col h-[calc(100vh-5rem)]'>

      {/* ── Toolbar ── */}
      <div className='flex items-center gap-3 mb-4 flex-wrap'>
        <h1 className='text-2xl font-bold text-gray-800'><Icon e='🌳' size={14} className='inline align-[-2px]' /> Org Chart</h1>
        <div className='flex items-center gap-2 ml-auto flex-wrap'>
          <select value={filterCo} onChange={e=>setFilterCo(e.target.value)}
            className='px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400 bg-white'>
            <option value=''>Semua Company</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <button onClick={expandAll}
            className='px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition'><Icon e='⬇' size={14} className='inline align-[-2px]' /> Expand All
          </button>
          <button onClick={collapseAll}
            className='px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition'><Icon e='⬆' size={14} className='inline align-[-2px]' /> Collapse All
          </button>

          <div className='flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1'>
            <button onClick={()=>setScale(s=>Math.max(0.3,+(s-0.1).toFixed(1)))}
              className='w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-600 font-bold text-lg'>−</button>
            <span className='text-xs font-semibold text-gray-600 w-10 text-center'>{Math.round(scale*100)}%</span>
            <button onClick={()=>setScale(s=>Math.min(1.5,+(s+0.1).toFixed(1)))}
              className='w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-600 font-bold text-lg'>+</button>
          </div>
          <button onClick={()=>setScale(0.85)}
            className='px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50'>
            Reset
          </button>

          {/* Export dropdown */}
          <div className='relative'>
            <button
              onClick={()=>setShowExport(v=>!v)}
              disabled={exporting}
              className='flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition'
              style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              {exporting ? (
                <><span className='animate-spin'><Icon e='⏳' size={15} /></span> Exporting…</>
              ) : (
                <><span><Icon e='⬇' size={15} /></span> Export</>
              )}
            </button>
            {showExport && (
              <div className='absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 w-44'
                onMouseLeave={()=>setShowExport(false)}>
                {[
                  { type:'png',  icon:'🖼️', label:'PNG Image',      sub:'High-res transparent' },
                  { type:'jpg',  icon:'📷', label:'JPG Image',      sub:'Compressed photo' },
                  { type:'pptx', icon:'📊', label:'PowerPoint',     sub:'.pptx slide deck' },
                  { type:'xlsx', icon:'📋', label:'Excel / XLSX',   sub:'Hierarchy table' },
                ].map(item => (
                  <button key={item.type} onClick={()=>handleExport(item.type)}
                    className='w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-left transition'>
                    <span className='text-base flex-shrink-0'><Icon e={item.icon} size={16} /></span>
                    <div>
                      <div className='text-xs font-semibold text-gray-800'>{item.label}</div>
                      <div className='text-xs text-gray-400'>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='flex gap-4 flex-1 min-h-0'>

        {/* ── Chart canvas ── */}
        <div ref={chartRef} className='flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto p-8'>
          <div style={{ transform:`scale(${scale})`, transformOrigin:'top center', transition:'transform .2s', width:'max-content', margin:'0 auto' }}>
            {roots.length === 0 ? (
              <div className='flex items-center justify-center h-64 text-gray-400'>Tidak ada data.</div>
            ) : roots.length === 1 ? (
              <Tree
                label={
                  <NodeCard
                    emp={roots[0]}
                    {...{ positions, departments, companies, grades }}
                    isSelected={selectedId===roots[0].id}
                    onSelect={()=>setSelectedId(s=>s===roots[0].id?null:roots[0].id)}
                    directCount={(childMap[roots[0].id]||[]).length}
                    totalCount={countAll(roots[0].id, childMap)}
                    hasChildren={(childMap[roots[0].id]||[]).length > 0}
                    isCollapsed={collapsed.has(roots[0].id)}
                    onToggleCollapse={()=>toggleCollapse(roots[0].id)}
                  />
                }
                lineWidth='1.5px' lineColor='#d1d5db' lineStyle='solid'
                nodePadding='16px' lineBorderRadius='6px'
              >
                {!collapsed.has(roots[0].id) &&
                  (childMap[roots[0].id]||[]).map(cId => renderNode(cId, childMap, empMap, nodeProps))}
              </Tree>
            ) : (
              <div className='flex gap-12 justify-center'>
                {roots.map(root => (
                  <Tree key={root.id}
                    label={
                      <NodeCard
                        emp={root}
                        {...{ positions, departments, companies, grades }}
                        isSelected={selectedId===root.id}
                        onSelect={()=>setSelectedId(s=>s===root.id?null:root.id)}
                        directCount={(childMap[root.id]||[]).length}
                        totalCount={countAll(root.id, childMap)}
                        hasChildren={(childMap[root.id]||[]).length > 0}
                        isCollapsed={collapsed.has(root.id)}
                        onToggleCollapse={()=>toggleCollapse(root.id)}
                      />
                    }
                    lineWidth='1.5px' lineColor='#d1d5db' lineStyle='solid'
                    nodePadding='16px' lineBorderRadius='6px'
                  >
                    {!collapsed.has(root.id) &&
                      (childMap[root.id]||[]).map(cId => renderNode(cId, childMap, empMap, nodeProps))}
                  </Tree>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className='w-64 flex-shrink-0'>
          {selected ? (
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full overflow-y-auto'>
              <div className='flex flex-col items-center mb-5'>
                <div className='w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-3xl mb-2'
                  style={{ border:`2px solid ${selColor.border}` }}>
                  {selected.photo
                    ? <img src={selected.photo} className='w-full h-full object-cover' />
                    : ((selected.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase())}
                </div>
                <div className='text-sm font-bold text-gray-800 text-center'>{selected.name}</div>
                <div className='text-xs text-gray-500 text-center mt-0.5'>{selected.nik}</div>
              </div>

              {/* Subordinate summary */}
              {(directReports.length > 0 || totalReports > 0) && (
                <div className='grid grid-cols-2 gap-2 mb-4'>
                  <div className='bg-blue-50 rounded-xl p-3 text-center'>
                    <div className='text-xl font-bold text-blue-700'>{directReports.length}</div>
                    <div className='text-xs text-blue-500 mt-0.5'>Direct</div>
                  </div>
                  <div className='bg-red-50 rounded-xl p-3 text-center'>
                    <div className='text-xl font-bold text-red-700'>{totalReports - directReports.length}</div>
                    <div className='text-xs text-red-500 mt-0.5'>Indirect</div>
                  </div>
                </div>
              )}

              <div className='space-y-3 text-xs'>
                {[
                  ['Jabatan',    selPos?.name],
                  ['Departemen', selDept?.name],
                  ['Join Date',  selected.joinDate],
                  ['Tipe',       selected.employmentType],
                ].map(([label, val]) => val ? (
                  <div key={label}>
                    <div className='font-semibold text-gray-400 uppercase tracking-wide mb-0.5' style={{fontSize:9}}>{label}</div>
                    <div className='text-gray-700 font-medium'>{val}</div>
                  </div>
                ) : null)}

                {selMgr && (
                  <div>
                    <div className='font-semibold text-gray-400 uppercase tracking-wide mb-1' style={{fontSize:9}}><Icon e='👤' size={14} className='inline align-[-2px]' /> Reports To</div>
                    <div className='flex items-center gap-2 bg-blue-50 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-blue-100'
                      onClick={()=>setSelectedId(selMgr.id)}>
                      <span className='text-base'>{(selMgr.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}</span>
                      <div>
                        <div className='text-xs font-semibold text-blue-800'>{selMgr.name.split(' ')[0]}</div>
                        <div className='text-xs text-blue-500'>{positions.find(p=>p.id===+selMgr.positionId)?.name?.split('/')[0].trim()}</div>
                      </div>
                    </div>
                  </div>
                )}

                {directReports.length > 0 && (
                  <div>
                    <div className='font-semibold text-gray-400 uppercase tracking-wide mb-1' style={{fontSize:9}}><Icon e='👥' size={14} className='inline align-[-2px]' /> Direct Reports ({directReports.length})
                    </div>
                    <div className='space-y-1'>
                      {directReports.map(dr => (
                        <div key={dr.id}
                          className='flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-red-50'
                          onClick={()=>setSelectedId(dr.id)}>
                          <span className='text-sm'>{(dr.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}</span>
                          <div className='flex-1 min-w-0'>
                            <div className='text-xs font-semibold text-gray-700 truncate'>{dr.name.split(' ')[0]}</div>
                            <div className='text-xs text-gray-400 truncate'>
                              {positions.find(p=>p.id===+dr.positionId)?.name?.split(' ').slice(0,3).join(' ')}
                            </div>
                          </div>
                          {/* show if this person has own reports */}
                          {countAll(dr.id, childMap) > 0 && (
                            <span className='text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0'>
                              +{countAll(dr.id, childMap)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={()=>setSelectedId(null)}
                className='mt-5 w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-100 rounded-lg'>
                Tutup
              </button>
            </div>
          ) : (
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full flex flex-col'>
              <div className='flex-1 flex flex-col items-center justify-center gap-2'>
                <span className='text-3xl'><Icon e='👆' size={15} /></span>
                <p className='text-xs text-gray-400 text-center'>Klik node untuk detail</p>
                <p className='text-xs text-gray-300 text-center'>Klik bar bawah node untuk expand/collapse</p>
              </div>

              {/* Legend */}
              <div className='border-t border-gray-100 pt-4 mt-4'>
                <p className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2' style={{fontSize:9}}>Level Color</p>
                {[
                  ['CEO/President Director', '#f59e0b'],
                  ['EVP / C-Level',          '#7c3aed'],
                  ['Senior VP',               '#6d28d9'],
                  ['Vice President',          '#2563eb'],
                  ['General Manager',         '#0d9488'],
                  ['Manager',                 '#16a34a'],
                  ['Non-Manager',             '#0284c7'],
                  ['Staff / Junior',          '#9ca3af'],
                ].map(([label, border]) => (
                  <div key={label} className='flex items-center gap-2 mb-1.5'>
                    <div style={{ width:10, height:10, borderRadius:3, border:`2px solid ${border}`, flexShrink:0 }}/>
                    <span className='text-xs text-gray-700 font-medium' style={{fontSize:10}}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
