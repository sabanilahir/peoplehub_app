// ── Org Chart Export Utilities ─────────────────────────────────────────────────
// Supports: PNG, JPG, PPTX, XLSX
// Uses html-to-image (SVG foreignObject renderer) instead of html2canvas because
// html2canvas has an unfixable bug that silently drops all child content from
// display:inline-block + overflow:hidden containers.

// ── helpers ───────────────────────────────────────────────────────────────────
// Returns the inner tree element with its CSS scale transform removed
function getInnerEl(el) {
  return el.querySelector('[style*="scale("]') ?? el
}

// ── PNG ───────────────────────────────────────────────────────────────────────
export async function exportPNG(chartEl, filename = 'org-chart') {
  const { toPng } = await import('html-to-image')
  const inner = getInnerEl(chartEl)
  const dataUrl = await toPng(inner, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    style: { transform: 'none', transformOrigin: 'initial', transition: 'none' },
  })
  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = dataUrl
  link.click()
}

// ── JPG ───────────────────────────────────────────────────────────────────────
export async function exportJPG(chartEl, filename = 'org-chart') {
  const { toJpeg } = await import('html-to-image')
  const inner = getInnerEl(chartEl)
  const dataUrl = await toJpeg(inner, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    quality: 0.92,
    style: { transform: 'none', transformOrigin: 'initial', transition: 'none' },
  })
  const link = document.createElement('a')
  link.download = `${filename}.jpg`
  link.href = dataUrl
  link.click()
}

// ── PPTX ──────────────────────────────────────────────────────────────────────
export async function exportPPTX(chartEl, title = 'Org Chart', filename = 'org-chart') {
  const { toPng }           = await import('html-to-image')
  const { default: PptxGenJS } = await import('pptxgenjs')

  const inner = getInnerEl(chartEl)
  const imgData = await toPng(inner, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    style: { transform: 'none', transformOrigin: 'initial', transition: 'none' },
  })

  // Measure natural size for aspect ratio
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imgData })
  const aspectRatio = img.height / img.width

  const pptx  = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'   // 13.33 × 7.5 in
  pptx.title  = title

  const slide = pptx.addSlide()
  slide.background = { color: 'F8F9FA' }

  // Title bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.7,
    fill: { color: '0f3460' },
  })
  slide.addText(title, {
    x: 0.3, y: 0.08, w: 10, h: 0.55,
    fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Segoe UI',
  })
  const now = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })
  slide.addText(`Generated: ${now}`, {
    x: 0, y: 0.08, w: 13, h: 0.55,
    fontSize: 10, color: 'AABBCC', fontFace: 'Segoe UI', align: 'right',
  })

  // Chart image
  const imgW = 12.6
  const imgH = Math.min(imgW * aspectRatio, 6.3)
  slide.addImage({
    data: imgData,
    x: (13.33 - imgW) / 2,
    y: 0.85 + (6.5 - imgH) / 2,
    w: imgW, h: imgH,
  })

  // Footer
  slide.addText('Rans PeopleHub HCM — Confidential', {
    x: 0, y: 7.2, w: '100%', h: 0.3,
    fontSize: 8, color: 'AAAAAA', align: 'center', fontFace: 'Segoe UI',
  })

  const blob = await pptx.write({ outputType: 'blob' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${filename}.pptx`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

// ── XLSX (uses SheetJS — fully browser-compatible) ────────────────────────────
export async function exportXLSX(employees, positions, departments, companies, grades, childMap, filename = 'org-chart') {
  const XLSX = await import('xlsx')

  const empMap = Object.fromEntries(employees.map(e=>[e.id,e]))
  const roots  = employees.filter(e=>!e.managerId || !empMap[e.managerId])
  const sorted = []
  const queue  = [...roots]
  while (queue.length) {
    const e = queue.shift()
    sorted.push(e)
    ;(childMap[e.id]||[]).forEach(cId => { if(empMap[cId]) queue.push(empMap[cId]) })
  }

  const hierarchyRows = [
    ['ORGANIZATION CHART — Rans PeopleHub HCM'],
    [],
    ['No','NIK','Nama Karyawan','Jabatan','Grade / PC','Department','Company',
     'Atasan Langsung','Direct Reports','Indirect Reports','Join Date','Status'],
  ]

  sorted.forEach((emp, idx) => {
    const level  = getLevel(emp.id, empMap)
    const pos    = positions.find(p=>p.id===+emp.positionId)?.name || '—'
    const grade  = grades.find(g=>g.id===+emp.gradeId)
    const dept   = departments.find(d=>d.id===+emp.departmentId)?.name || '—'
    const co     = companies.find(c=>c.id===+emp.companyId)?.name || '—'
    const mgr    = emp.managerId ? employees.find(e=>e.id===emp.managerId)?.name || '—' : '—'
    const direct = (childMap[emp.id]||[]).length
    hierarchyRows.push([
      idx + 1, emp.nik, '  '.repeat(level) + emp.name, pos,
      grade ? `${grade.code} · ${grade.name}` : '—',
      dept, co, mgr, direct,
      countAllSync(emp.id, childMap) - direct,
      emp.joinDate || '—', emp.status,
    ])
  })

  const now = new Date().toLocaleString('id-ID')
  const summaryRows = [
    ['Org Chart Summary', ''], [],
    ['Metric', 'Value'],
    ['Total Karyawan',           employees.length],
    ['Karyawan Active',          employees.filter(e=>e.status==='Active').length],
    ['Karyawan Inactive',        employees.filter(e=>e.status!=='Active').length],
    [],
    ['CEO / PC 72',              employees.filter(e=>+e.gradeId===72).length],
    ['EVP / C-Level (PC 70-71)', employees.filter(e=>+e.gradeId>=70&&+e.gradeId<=71).length],
    ['SVP (PC 67-69)',           employees.filter(e=>+e.gradeId>=67&&+e.gradeId<=69).length],
    ['VP (PC 64-66)',            employees.filter(e=>+e.gradeId>=64&&+e.gradeId<=66).length],
    ['GM (PC 61-63)',            employees.filter(e=>+e.gradeId>=61&&+e.gradeId<=63).length],
    ['Manager (PC 53-60)',       employees.filter(e=>+e.gradeId>=53&&+e.gradeId<=60).length],
    ['Non-Manager (PC 40-52)',   employees.filter(e=>+e.gradeId>=40&&+e.gradeId<=52).length],
    ['Staff / Junior (PC ≤ 39)', employees.filter(e=>+e.gradeId<40).length],
    [], ['Generated', now],
  ]

  const wb  = XLSX.utils.book_new()
  const wsH = XLSX.utils.aoa_to_sheet(hierarchyRows)
  wsH['!cols'] = [{wch:4},{wch:10},{wch:30},{wch:32},{wch:22},{wch:20},{wch:28},{wch:26},{wch:12},{wch:14},{wch:12},{wch:10}]
  wsH['!freeze'] = { xSplit:0, ySplit:3 }
  const wsS = XLSX.utils.aoa_to_sheet(summaryRows)
  wsS['!cols'] = [{wch:30},{wch:12}]
  XLSX.utils.book_append_sheet(wb, wsH, 'Org Hierarchy')
  XLSX.utils.book_append_sheet(wb, wsS, 'Summary')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function countAllSync(empId, childMap) {
  const children = childMap[empId] || []
  let total = children.length
  children.forEach(cId => { total += countAllSync(cId, childMap) })
  return total
}

function getLevel(empId, empMap, level = 0) {
  const emp = empMap[empId]
  if (!emp || !emp.managerId || !empMap[emp.managerId]) return level
  return getLevel(emp.managerId, empMap, level + 1)
}
