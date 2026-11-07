'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo, useRef } from 'react'
import { Tree, TreeNode }            from 'react-organizational-chart'
import { useEmployeeStore }          from '@/store/employeeStore'
import { useStructureStore }         from '@/store/structureStore'
import { exportPNG, exportJPG }      from '@/utils/orgChartExport'
import { useT } from '@/store/languageStore'

// ── Level style config ────────────────────────────────────────────────────────
const STYLE = {
  enterprise:   { icon:'🌐', color:'#7c3aed', bg:'#f5f3ff', border:'#7c3aed', label:'Enterprise'   },
  division:     { icon:'🏛️', color:'#2563eb', bg:'#eff6ff', border:'#2563eb', label:'Division'     },
  company:      { icon:'🏢', color:'#0d9488', bg:'#f0fdfa', border:'#0d9488', label:'Company'      },
  businessUnit: { icon:'💼', color:'#16a34a', bg:'#f0fdf4', border:'#16a34a', label:'Business Unit' },
  department:   { icon:'🗂️', color:'#0284c7', bg:'#f0f9ff', border:'#0284c7', label:'Department'   },
}

// child type for each level
const CHILD_TYPE = {
  enterprise: 'division',
  division:   'company',
  company:    'businessUnit',
  businessUnit: 'department',
  department: null,
}

// ── Structure Node Card ───────────────────────────────────────────────────────
function StructureCard({
  type, name, code, meta, headcount,
  directChildren, childLabel,
  isSelected, onSelect,
  isFocusRoot,
  isCollapsed, onToggleCollapse,
  onDrill,
}) {
  const s = STYLE[type]
  const hasCh = directChildren > 0

  return (
    <div style={{
      display: 'inline-block',
      border: `2px solid ${isFocusRoot ? '#7c3aed' : isSelected ? '#a78bfa' : s.border}`,
      background: isFocusRoot ? '#f5f3ff' : isSelected ? '#faf5ff' : s.bg,
      borderRadius: 12,
      minWidth: 165, maxWidth: 205,
      boxShadow: isFocusRoot
        ? '0 0 0 3px rgba(124,58,237,.2), 0 4px 16px rgba(0,0,0,.12)'
        : isSelected ? '0 0 0 2px rgba(124,58,237,.15)' : '0 1px 5px rgba(0,0,0,.08)',
      overflow: 'hidden',
    }}>

      {/* Focus banner */}
      {isFocusRoot && (
        <div style={{ textAlign:'center', padding:'2px 0', background:'#7c3aed' }}>
          <span style={{ fontSize:8, fontWeight:800, color:'#fff', letterSpacing:1.5 }}><Icon e='▼' size={14} className='inline align-[-2px]' /> FOCUS ▼</span>
        </div>
      )}

      {/* Main click area */}
      <div onClick={onSelect} style={{ padding:'10px 12px 9px', cursor:'pointer' }}>

        {/* Icon + type badge */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
          <span style={{
            fontSize:17, lineHeight:1,
            background:`${s.border}15`, border:`1px solid ${s.border}30`,
            borderRadius:7, padding:'3px 5px',
          }}><Icon e={s.icon} size={16} /></span>
          <span style={{
            fontSize:8, fontWeight:800, letterSpacing:0.8,
            background:`${s.border}18`, color:s.color,
            borderRadius:4, padding:'2px 6px', textTransform:'uppercase',
          }}>{s.label}</span>
        </div>

        {/* Name */}
        <div style={{ fontWeight:700, fontSize:12.5, color:'#111827', lineHeight:1.3, marginBottom:2,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {name}
        </div>

        {/* Code + meta line */}
        <div style={{ fontSize:10, color:'#6b7280', marginBottom:7, overflow:'hidden',
          textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {code}{meta ? ` · ${meta}` : ''}
        </div>

        {/* Stat badges */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          <span style={{
            fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:5,
            background:'#e0e7ff', color:'#3730a3',
            display:'flex', alignItems:'center', gap:3,
          }}>
            <Icon e='👤' size={14} className='inline align-[-2px]' /> {headcount}
          </span>
          {hasCh && (
            <span style={{
              fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:5,
              background:`${s.border}15`, color:s.color,
            }}>
              {directChildren} {childLabel}
            </span>
          )}
        </div>
      </div>

      {/* Bottom bar: expand toggle + drill button */}
      {hasCh && (
        <div style={{ display:'flex', alignItems:'stretch', borderTop:`1px solid ${s.border}44` }}>
          <div onClick={onToggleCollapse} style={{
            flex:1, display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'5px 8px 5px 10px',
            background: isCollapsed ? s.border : `${s.border}18`,
            cursor:'pointer', gap:6, userSelect:'none',
          }}>
            <span style={{
              fontSize:9, fontWeight:700,
              color: isCollapsed ? '#fff' : s.color,
            }}>
              {directChildren} {childLabel}
            </span>
            <span style={{
              fontSize:9, fontWeight:900,
              color: isCollapsed ? '#fff' : s.color,
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform .2s', display:'inline-block',
            }}><Icon e='▼' size={15} /></span>
          </div>

          {!isFocusRoot && (
            <div onClick={onDrill} style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:'5px 11px',
              borderLeft:`1px solid ${s.border}33`,
              cursor:'pointer', background:'transparent', transition:'background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${s.border}22` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            title={`Drill into this ${STYLE[type].label}`}>
              <span style={{ fontSize:11, fontWeight:900, color:s.color }}><Icon e='▶' size={15} /></span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── recursive renderer ────────────────────────────────────────────────────────
// isRoot=true  → wraps in <Tree> with line props (used for top-level view roots)
// isRoot=false → wraps in <TreeNode> (used for all children)
function renderNode(type, id, stores, counts, props, isRoot = false) {
  const { enterprises, divisions, companies, businessUnits, departments } = stores
  const { collapsed, selectedKey, onSelect, onToggle, onDrill, focusKey } = props

  const key     = `${type}:${id}`
  const isColl  = collapsed.has(key)
  const isSel   = selectedKey === key
  const isFocus = focusKey === key

  let node, children, childType, childLabel

  if (type === 'enterprise') {
    node       = enterprises.find(e => e.id === id)
    children   = divisions.filter(d => d.enterpriseId === id)
    childType  = 'division'
    childLabel = 'Division'
  } else if (type === 'division') {
    node       = divisions.find(d => d.id === id)
    children   = companies.filter(c => c.divisionId === id)
    childType  = 'company'
    childLabel = 'Company'
  } else if (type === 'company') {
    node       = companies.find(c => c.id === id)
    children   = businessUnits.filter(b => b.companyId === id)
    childType  = 'businessUnit'
    childLabel = 'Business Unit'
  } else if (type === 'businessUnit') {
    node       = businessUnits.find(b => b.id === id)
    children   = departments.filter(d => d.businessUnitId === id)
    childType  = 'department'
    childLabel = 'Department'
  } else {
    node       = departments.find(d => d.id === id)
    children   = []
    childType  = null
    childLabel = ''
  }

  if (!node) return null

  let meta = null
  if (type === 'enterprise')    meta = `${node.industry} · ${node.country}`
  else if (type === 'company')  meta = `${node.companyCode} · ${node.legalEntity}`
  else if (type === 'businessUnit') meta = node.costCenter || null
  else if (type === 'division') meta = node.headName || null

  const card = (
    <StructureCard
      type={type}
      name={node.name}
      code={node.code}
      meta={meta}
      headcount={counts[key] || 0}
      directChildren={children.length}
      childLabel={childLabel}
      isSelected={isSel}
      onSelect={() => onSelect(key, type, id)}
      isFocusRoot={isFocus}
      isCollapsed={isColl}
      onToggleCollapse={() => onToggle(key)}
      onDrill={() => onDrill({ type, id, name: node.name })}
    />
  )

  const renderedChildren = (!children.length || isColl)
    ? null
    : children.map(ch => renderNode(childType, ch.id, stores, counts, props, false))

  if (isRoot) {
    return (
      <Tree key={key} label={card}
        lineWidth='1.5px' lineColor='#d1d5db' lineStyle='solid'
        nodePadding='16px' lineBorderRadius='6px'>
        {renderedChildren}
      </Tree>
    )
  }

  if (!renderedChildren) return <TreeNode key={key} label={card} />
  return (
    <TreeNode key={key} label={card}>
      {renderedChildren}
    </TreeNode>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrgTreePage() {
  const t = useT()
  const { employees } = useEmployeeStore()
  const {
    enterprises, divisions, companies, businessUnits, departments,
  } = useStructureStore()

  const [drillStack,  setDrillStack ] = useState([])   // [{type,id,name}]
  const [collapsed,   setCollapsed  ] = useState(new Set())
  const [selectedKey, setSelectedKey] = useState(null) // 'type:id'
  const [selectedMeta, setSelectedMeta] = useState(null) // {type, id}
  const [scale,       setScale      ] = useState(0.85)
  const [exporting,   setExporting  ] = useState(false)
  const [showExport,  setShowExport ] = useState(false)
  const chartRef = useRef()

  // ── headcount per node (direct employees) ────────────────────────────────
  const counts = useMemo(() => {
    const c = {}
    employees.forEach(emp => {
      if (emp.departmentId)   { const k = `department:${emp.departmentId}`;   c[k] = (c[k]||0)+1 }
      if (emp.businessUnitId) { const k = `businessUnit:${emp.businessUnitId}`; c[k] = (c[k]||0)+1 }
      if (emp.companyId)      { const k = `company:${emp.companyId}`;          c[k] = (c[k]||0)+1 }
    })
    // Division = sum of companies
    divisions.forEach(div => {
      const sum = companies
        .filter(co => co.divisionId === div.id)
        .reduce((s, co) => s + (c[`company:${co.id}`]||0), 0)
      c[`division:${div.id}`] = sum
    })
    // Enterprise = sum of divisions
    enterprises.forEach(ent => {
      const sum = divisions
        .filter(d => d.enterpriseId === ent.id)
        .reduce((s, d) => s + (c[`division:${d.id}`]||0), 0)
      c[`enterprise:${ent.id}`] = sum
    })
    return c
  }, [employees, enterprises, divisions, companies, businessUnits, departments])

  // ── stores bundle ─────────────────────────────────────────────────────────
  const stores = { enterprises, divisions, companies, businessUnits, departments }

  // ── drill navigation ──────────────────────────────────────────────────────
  const drillDown = ({ type, id, name }) => {
    setDrillStack(s => [...s, { type, id, name }])
    setCollapsed(new Set())
    setSelectedKey(null); setSelectedMeta(null)
  }
  const drillTo = (index) => {
    setDrillStack(index < 0 ? [] : s => s.slice(0, index + 1))
    setCollapsed(new Set())
    setSelectedKey(null); setSelectedMeta(null)
  }

  const toggleCollapse = (key) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  const expandAll = () => setCollapsed(new Set())
  const collapseAll = () => {
    const all = new Set()
    enterprises.forEach(e  => { if (e.id) all.add(`enterprise:${e.id}`) })
    divisions.forEach(d    => { if (d.id) all.add(`division:${d.id}`) })
    companies.forEach(co   => { if (co.id) all.add(`company:${co.id}`) })
    businessUnits.forEach(b => { if (b.id) all.add(`businessUnit:${b.id}`) })
    // don't collapse the current focus root
    const focus = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null
    if (focus) all.delete(`${focus.type}:${focus.id}`)
    else enterprises.forEach(e => all.delete(`enterprise:${e.id}`))
    setCollapsed(all)
  }

  // ── view roots ────────────────────────────────────────────────────────────
  const focused = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null
  const focusKey = focused ? `${focused.type}:${focused.id}` : null

  const viewRoots = focused
    ? [{ type: focused.type, id: focused.id }]
    : enterprises.map(e => ({ type: 'enterprise', id: e.id }))

  // ── selection handler ─────────────────────────────────────────────────────
  const handleSelect = (key, type, id) => {
    if (selectedKey === key) { setSelectedKey(null); setSelectedMeta(null) }
    else { setSelectedKey(key); setSelectedMeta({ type, id }) }
  }

  // ── detail panel data ─────────────────────────────────────────────────────
  const detail = useMemo(() => {
    if (!selectedMeta) return null
    const { type, id } = selectedMeta
    if (type === 'enterprise') {
      const node = enterprises.find(e => e.id === id)
      const divs = divisions.filter(d => d.enterpriseId === id)
      const cos  = companies.filter(c => divs.find(d => d.id === c.divisionId))
      const bus  = businessUnits.filter(b => cos.find(c => c.id === b.companyId))
      const dpts = departments.filter(d => bus.find(b => b.id === d.businessUnitId))
      return { node, type, divCount: divs.length, coCount: cos.length, buCount: bus.length, deptCount: dpts.length }
    }
    if (type === 'division') {
      const node = divisions.find(d => d.id === id)
      const ent  = enterprises.find(e => e.id === node?.enterpriseId)
      const cos  = companies.filter(c => c.divisionId === id)
      const bus  = businessUnits.filter(b => cos.find(c => c.id === b.companyId))
      const dpts = departments.filter(d => bus.find(b => b.id === d.businessUnitId))
      return { node, type, ent, coCount: cos.length, buCount: bus.length, deptCount: dpts.length }
    }
    if (type === 'company') {
      const node = companies.find(c => c.id === id)
      const div  = divisions.find(d => d.id === node?.divisionId)
      const bus  = businessUnits.filter(b => b.companyId === id)
      const dpts = departments.filter(d => bus.find(b => b.id === d.businessUnitId))
      return { node, type, div, buCount: bus.length, deptCount: dpts.length }
    }
    if (type === 'businessUnit') {
      const node = businessUnits.find(b => b.id === id)
      const co   = companies.find(c => c.id === node?.companyId)
      const dpts = departments.filter(d => d.businessUnitId === id)
      return { node, type, co, deptCount: dpts.length }
    }
    if (type === 'department') {
      const node  = departments.find(d => d.id === id)
      const bu    = businessUnits.find(b => b.id === node?.businessUnitId)
      const emps  = employees.filter(e => e.departmentId === id)
      return { node, type, bu, emps }
    }
    return null
  }, [selectedMeta, enterprises, divisions, companies, businessUnits, departments, employees])

  // ── export ────────────────────────────────────────────────────────────────
  const fname = `org-tree-structure-${new Date().toISOString().slice(0,10)}`
  const handleExport = async (type) => {
    if (!chartRef.current) return
    setExporting(true); setShowExport(false)
    try {
      if      (type === 'png') await exportPNG(chartRef.current, fname)
      else if (type === 'jpg') await exportJPG(chartRef.current, fname)
    } catch(e) { console.error(e) }
    finally { setExporting(false) }
  }

  const nodeProps = {
    collapsed, selectedKey, focusKey,
    onSelect: handleSelect,
    onToggle: toggleCollapse,
    onDrill:  drillDown,
  }

  return (
    <div className='flex flex-col h-[calc(100vh-5rem)]'>

      {/* ── Header + Breadcrumb ── */}
      <div className='flex items-start gap-3 mb-3 flex-wrap'>
        <div>
          <h1 className='text-2xl font-bold text-gray-800'><Icon e='🌲' size={14} className='inline align-[-2px]' /> Organization Tree</h1>
          <p className='text-xs text-gray-400 mt-0.5'>Enterprise → Division → Company → Business Unit → Department</p>

          {/* Breadcrumb */}
          <div className='flex items-center gap-1 mt-2 flex-wrap'>
            <button onClick={() => drillTo(-1)}
              className={`text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md transition
                ${drillStack.length === 0
                  ? 'text-gray-400 bg-gray-50 cursor-default'
                  : 'text-red-600 bg-red-50 hover:bg-red-100'}`}><Icon e='🏠' size={14} className='inline align-[-2px]' /> Root
            </button>
            {drillStack.map((item, i) => (
              <span key={`${item.type}:${item.id}`} className='flex items-center gap-1'>
                <span className='text-gray-300 text-xs mx-0.5'>›</span>
                <button onClick={() => drillTo(i)}
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md transition flex items-center gap-1
                    ${i === drillStack.length - 1
                      ? 'text-gray-700 bg-gray-100 cursor-default'
                      : 'text-red-600 bg-red-50 hover:bg-red-100'}`}>
                  <span>{STYLE[item.type]?.icon}</span>
                  <span>{item.name}</span>
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className='flex items-center gap-2 ml-auto flex-wrap'>
          {drillStack.length > 0 && (
            <button onClick={() => drillTo(drillStack.length - 2)}
              className='px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-semibold transition'><Icon e='←' size={14} className='inline align-[-2px]' /> Back
            </button>
          )}

          <button onClick={expandAll}
            className='px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition'><Icon e='⬇' size={14} className='inline align-[-2px]' /> Expand All
          </button>
          <button onClick={collapseAll}
            className='px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition'><Icon e='⬆' size={14} className='inline align-[-2px]' /> Collapse All
          </button>

          <div className='flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1'>
            <button onClick={() => setScale(s => Math.max(0.3, +(s-0.1).toFixed(1)))}
              className='w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-600 font-bold text-lg'>−</button>
            <span className='text-xs font-semibold text-gray-600 w-10 text-center'>{Math.round(scale*100)}%</span>
            <button onClick={() => setScale(s => Math.min(1.5, +(s+0.1).toFixed(1)))}
              className='w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-600 font-bold text-lg'>+</button>
          </div>
          <button onClick={() => setScale(0.85)}
            className='px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50'>
            Reset
          </button>

          {/* Export */}
          <div className='relative'>
            <button onClick={() => setShowExport(v => !v)} disabled={exporting}
              className='flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition'
              style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
              {exporting ? <><span className='animate-spin'><Icon e='⏳' size={15} /></span> Exporting…</> : <><span><Icon e='⬇' size={15} /></span> Export</>}
            </button>
            {showExport && (
              <div className='absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 w-40'
                onMouseLeave={() => setShowExport(false)}>
                {[
                  { type:'png', icon:'🖼️', label:'PNG Image' },
                  { type:'jpg', icon:'📷', label:'JPG Image' },
                ].map(item => (
                  <button key={item.type} onClick={() => handleExport(item.type)}
                    className='w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-left transition'>
                    <span className='text-base'><Icon e={item.icon} size={16} /></span>
                    <span className='text-xs font-semibold text-gray-800'>{item.label}</span>
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
          <div style={{
            transform:`scale(${scale})`, transformOrigin:'top center',
            transition:'transform .2s', width:'max-content', margin:'0 auto',
          }}>
            {viewRoots.length === 0 ? (
              <div className='flex items-center justify-center h-64 text-gray-400'>Tidak ada data struktur.</div>
            ) : (
              <div className={viewRoots.length > 1 ? 'flex gap-16 justify-center' : undefined}>
                {viewRoots.map(({ type, id }) =>
                  renderNode(type, id, stores, counts, nodeProps, true)
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        <div className='w-64 flex-shrink-0'>
          {detail ? (
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full overflow-y-auto'>

              {/* Header */}
              <div className='flex flex-col items-center mb-5'>
                <div className='w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3'
                  style={{ background:`${STYLE[detail.type].border}18`, border:`2px solid ${STYLE[detail.type].border}` }}>
                  {STYLE[detail.type].icon}
                </div>
                <span style={{
                  fontSize:9, fontWeight:800, letterSpacing:1, textTransform:'uppercase',
                  background:`${STYLE[detail.type].border}18`, color:STYLE[detail.type].color,
                  borderRadius:4, padding:'2px 8px', marginBottom:6,
                }}>
                  {STYLE[detail.type].label}
                </span>
                <div className='text-sm font-bold text-gray-800 text-center leading-tight'>{detail.node?.name}</div>
                <div className='text-xs text-gray-500 text-center mt-1'>{detail.node?.code}</div>
              </div>

              {/* Headcount highlight */}
              <div className='bg-indigo-50 rounded-xl p-3 text-center mb-4'>
                <div className='text-2xl font-bold text-indigo-700'>
                  {counts[`${detail.type}:${detail.node?.id}`] || 0}
                </div>
                <div className='text-xs text-indigo-500 mt-0.5'>Total Karyawan</div>
              </div>

              {/* Type-specific fields */}
              <div className='space-y-3 text-xs'>

                {detail.type === 'enterprise' && <>
                  {[
                    ['Negara',   detail.node?.country],
                    ['Industri', detail.node?.industry],
                    ['Status',   detail.node?.status],
                  ].map(([l,v]) => v ? (
                    <div key={l}>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}>{l}</div>
                      <div className='text-gray-700 font-medium'>{v}</div>
                    </div>
                  ) : null)}
                </>}

                {detail.type === 'division' && <>
                  {detail.ent && (
                    <div>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}><Icon e='🌐' size={14} className='inline align-[-2px]' /> Enterprise</div>
                      <div className='text-gray-700 font-medium'>{detail.ent.name}</div>
                    </div>
                  )}
                  {detail.node?.headName && (
                    <div>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}><Icon e='👤' size={14} className='inline align-[-2px]' /> Division Head</div>
                      <div className='text-gray-700 font-medium'>{detail.node.headName}</div>
                    </div>
                  )}
                  {[['Status', detail.node?.status]].map(([l,v]) => v ? (
                    <div key={l}>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}>{l}</div>
                      <div className='text-gray-700 font-medium'>{v}</div>
                    </div>
                  ) : null)}
                </>}

                {detail.type === 'company' && <>
                  {detail.div && (
                    <div>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}><Icon e='🏛️' size={14} className='inline align-[-2px]' /> Division</div>
                      <div className='text-gray-700 font-medium'>{detail.div.name}</div>
                    </div>
                  )}
                  {[
                    ['Company Code', detail.node?.companyCode],
                    ['Legal Entity', detail.node?.legalEntity],
                    ['Negara',       detail.node?.country],
                    ['Status',       detail.node?.status],
                  ].map(([l,v]) => v ? (
                    <div key={l}>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}>{l}</div>
                      <div className='text-gray-700 font-medium'>{v}</div>
                    </div>
                  ) : null)}
                </>}

                {detail.type === 'businessUnit' && <>
                  {detail.co && (
                    <div>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}><Icon e='🏢' size={14} className='inline align-[-2px]' /> Company</div>
                      <div className='text-gray-700 font-medium'>{detail.co.name}</div>
                    </div>
                  )}
                  {[
                    ['Cost Center', detail.node?.costCenter],
                    ['Status',      detail.node?.status],
                  ].map(([l,v]) => v ? (
                    <div key={l}>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}>{l}</div>
                      <div className='text-gray-700 font-medium'>{v}</div>
                    </div>
                  ) : null)}
                  <div className='bg-gray-50 rounded-xl p-2 text-center'>
                    <div className='text-base font-bold text-gray-700'>{detail.deptCount}</div>
                    <div className='text-gray-400' style={{fontSize:9}}>Department</div>
                  </div>
                </>}

                {detail.type === 'department' && <>
                  {detail.bu && (
                    <div>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}><Icon e='💼' size={14} className='inline align-[-2px]' /> Business Unit</div>
                      <div className='text-gray-700 font-medium'>{detail.bu.name}</div>
                    </div>
                  )}
                  {[['Status', detail.node?.status]].map(([l,v]) => v ? (
                    <div key={l}>
                      <div className='text-gray-400 uppercase tracking-wide mb-0.5 font-semibold' style={{fontSize:9}}>{l}</div>
                      <div className='text-gray-700 font-medium'>{v}</div>
                    </div>
                  ) : null)}
                  {detail.emps?.length > 0 && (
                    <div>
                      <div className='text-gray-400 uppercase tracking-wide mb-1.5 font-semibold' style={{fontSize:9}}><Icon e='👥' size={14} className='inline align-[-2px]' /> Karyawan ({detail.emps.length})
                      </div>
                      <div className='space-y-1 max-h-48 overflow-y-auto'>
                        {detail.emps.slice(0, 20).map(emp => (
                          <div key={emp.id} className='flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5'>
                            <span className='text-sm'>{(emp.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}</span>
                            <div className='min-w-0'>
                              <div className='text-xs font-semibold text-gray-700 truncate'>{emp.name}</div>
                              <div className='text-gray-400 truncate' style={{fontSize:9}}>{emp.nik}</div>
                            </div>
                          </div>
                        ))}
                        {detail.emps.length > 20 && (
                          <div className='text-xs text-gray-400 text-center py-1'>
                            +{detail.emps.length - 20} lainnya
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>}
              </div>

              {/* Drill action */}
              {CHILD_TYPE[detail.type] && (
                <button
                  onClick={() => drillDown({ type: detail.type, id: detail.node?.id, name: detail.node?.name })}
                  className='mt-4 w-full py-2 text-xs font-semibold rounded-lg transition border'
                  style={{
                    color: STYLE[detail.type].color,
                    background: `${STYLE[detail.type].border}12`,
                    borderColor: `${STYLE[detail.type].border}44`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${STYLE[detail.type].border}22` }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${STYLE[detail.type].border}12` }}
                >
                  {STYLE[detail.type].icon} Drill into {detail.node?.name}
                </button>
              )}

              <button onClick={() => { setSelectedKey(null); setSelectedMeta(null) }}
                className='mt-3 w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-100 rounded-lg transition'>
                Tutup
              </button>
            </div>
          ) : (
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full flex flex-col'>

              {/* Focus info */}
              {focused && (
                <div className='mb-4 p-3 rounded-xl border'
                  style={{ background:`${STYLE[focused.type]?.border}10`, borderColor:`${STYLE[focused.type]?.border}33` }}>
                  <p className='font-bold uppercase tracking-wide mb-2' style={{ fontSize:9, color: STYLE[focused.type]?.color }}><Icon e='📍' size={14} className='inline align-[-2px]' /> Current Focus
                  </p>
                  <div className='flex items-center gap-2'>
                    <span className='text-xl'>{STYLE[focused.type]?.icon}</span>
                    <div>
                      <div className='text-xs font-bold text-gray-800'>{focused.name}</div>
                      <div className='text-xs text-gray-500'>{STYLE[focused.type]?.label}</div>
                    </div>
                  </div>
                  <div className='mt-2 text-center bg-white rounded-lg p-2'>
                    <div className='text-lg font-bold' style={{ color: STYLE[focused.type]?.color }}>
                      {counts[`${focused.type}:${focused.id}`] || 0}
                    </div>
                    <div className='text-xs text-gray-400'>Total Karyawan</div>
                  </div>
                </div>
              )}

              <div className='flex-1 flex flex-col items-center justify-center gap-2 py-4'>
                <span className='text-4xl'><Icon e='🌲' size={15} /></span>
                <p className='text-xs text-gray-400 text-center leading-relaxed'>Klik node untuk detail</p>
                <p className='text-xs text-gray-300 text-center'>
                  Klik <span className='font-mono font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded'><Icon e='▶' size={15} /></span> untuk drill down
                </p>
              </div>

              {/* Level legend */}
              <div className='border-t border-gray-100 pt-4'>
                <p className='font-bold text-gray-400 uppercase tracking-wide mb-2' style={{fontSize:9}}>Hierarki Struktur</p>
                {Object.entries(STYLE).map(([key, s], i) => (
                  <div key={key} className='flex items-center gap-2 mb-2'>
                    <div style={{ width:10, height:10, borderRadius:3, background:s.bg, border:`2px solid ${s.border}`, flexShrink:0 }}/>
                    <span className='font-mono text-gray-400' style={{fontSize:8}}>{i+1}</span>
                    <span className='text-gray-700 font-medium' style={{fontSize:10}}>{s.label}</span>
                    <span className='text-lg leading-none'><Icon e={s.icon} size={16} /></span>
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
