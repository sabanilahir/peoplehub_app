'use client'
import Icon from '@/components/ui/Icon'
import { useState }                          from 'react'
import { useAuthStore }                      from '@/store/authStore'
import { useEmployeeStore }                  from '@/store/employeeStore'
import { useStructureStore }                 from '@/store/structureStore'
import { useCertificateStore, THEMES }       from '@/store/certificateStore'
import { rtfToHtml }                         from '@/lib/rtfToHtml'
import { useT } from '@/store/languageStore'

const CERTS = [
  { id:1, title:'Sertifikat K3 & Keselamatan Kerja', course:'K3 & Keselamatan Kerja', issued:'15 Januari 2025',  expires:'15 Januari 2027', score:90, cpd_points:8, status:'Valid',  training_hours:16, period:'Semester I 2025' },
  { id:2, title:'Sertifikat Pengenalan HCMS System',  course:'Pengenalan HCMS System', issued:'25 Oktober 2024', expires:null,               score:85, cpd_points:3, status:'Valid',  training_hours:8,  period:'Semester II 2024' },
]

const IN_PROGRESS = [
  { id:3, title:'Leadership Fundamentals Level 1', progress:65, due:'31 Mei 2025',       requirements:'Min Score 75% & Kehadiran 100%' },
  { id:4, title:'GCG & Compliance Certification',  progress:25, due:'30 September 2025', requirements:'Min Score 80% & Kehadiran 100%' },
]

function getGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}

// Build a dot-grid SVG string (cols × rows dots)
function dotGrid(cols, rows, dotR, gap, color) {
  const dots = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      dots.push(`<circle cx="${c * gap + dotR}" cy="${r * gap + dotR}" r="${dotR}" fill="${color}"/>`)
  const w = (cols - 1) * gap + dotR * 2
  const h = (rows - 1) * gap + dotR * 2
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${dots.join('')}</svg>`
}

function buildCertificateHTML({
  cert, empName, empNik, companyName, companyCode,
  positionName, deptName, theme,
  certNumber, approverName, approverTitle,
}) {
  const p  = theme.primary
  const a  = theme.accent
  const tx = theme.text

  const dots = dotGrid(6, 5, 3, 14, '#cccccc')
  const dotUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dots)}`

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Certificate — ${cert.course}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width: 210mm; height: 297mm;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: white;
    }
    @page { size: A4 portrait; margin: 0; }

    .page {
      position: relative;
      width: 210mm; height: 297mm;
      background: white;
      overflow: hidden;
    }

    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12mm 14mm 0 14mm;
    }
    .hdr-left {
      font-size: 18pt; font-weight: 900;
      font-style: italic;
      color: ${p};
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .hdr-right {
      font-size: 14pt; font-weight: 700;
      font-style: italic;
      color: ${p};
      text-align: right;
    }

    .dots {
      position: absolute;
      top: 28mm; right: 14mm;
      width: 75px; height: 65px;
      background: url('${dotUri}') no-repeat top right;
    }

    .sq-wrap {
      position: absolute;
      top: 58mm; left: 14mm;
      width: 28px; height: 28px;
    }
    .sq-gray {
      position: absolute; top: 0; right: 0;
      width: 18px; height: 18px;
      background: #aaaaaa;
    }
    .sq-accent {
      position: absolute; bottom: 0; left: 0;
      width: 12px; height: 12px;
      background: ${a};
    }

    .title-wrap {
      margin-top: 56mm;
      padding: 0 14mm 0 44mm;
    }
    .cert-title {
      font-size: 26pt; font-weight: 900;
      color: ${p};
      text-transform: uppercase;
      letter-spacing: 1px;
      line-height: 1.15;
    }

    .sq-title-right {
      position: absolute;
      top: 73mm; right: 22mm;
      width: 12px; height: 12px;
      background: #aaaaaa;
    }

    .awarded-to {
      text-align: center;
      font-size: 11pt; color: #666;
      margin-top: 12mm; margin-bottom: 8mm;
    }

    .name-box {
      text-align: center;
      padding: 0 20mm;
      margin-bottom: 2mm;
    }
    .learner-name {
      display: inline-block;
      font-size: 26pt; font-weight: 700;
      color: #111;
      padding: 0 6mm 3mm;
      border-bottom: 2px dotted #999;
      min-width: 100mm;
    }

    .completing-text {
      text-align: center;
      font-size: 11pt; color: #666;
      margin-top: 8mm; margin-bottom: 8mm;
    }

    .course-box {
      text-align: center;
      padding: 0 16mm;
      margin-bottom: 3mm;
    }
    .course-name {
      display: inline-block;
      font-size: 20pt; font-weight: 700;
      color: #111;
      padding: 0 6mm 3mm;
      border-bottom: 2px dotted #999;
      min-width: 100mm;
    }

    .completion-line {
      text-align: center;
      font-size: 10pt; color: #555;
      margin-top: 6mm;
    }

    .chips {
      display: flex;
      justify-content: center;
      gap: 6mm;
      margin-top: 5mm;
      flex-wrap: wrap;
      padding: 0 16mm;
    }
    .chip {
      font-size: 8pt; color: #777;
      border: 0.75px solid #ddd;
      border-radius: 3px;
      padding: 1.5mm 3mm;
      background: #fafafa;
      white-space: nowrap;
    }
    .chip b { color: ${p}; }

    .footer {
      position: absolute;
      bottom: 22mm; left: 0; right: 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 16mm;
    }
    .cert-meta {
      font-size: 7.5pt; color: #999;
      line-height: 1.7;
      font-family: 'Courier New', monospace;
    }
    .sig-area { text-align: center; }
    .sig-line {
      width: 50mm; height: 0.5px;
      background: #bbb;
      margin: 0 auto 2mm;
    }
    .sig-name  { font-size: 9pt; font-weight: 700; color: #333; }
    .sig-title { font-size: 7.5pt; color: #888; }

    .corner-tr {
      position: absolute;
      bottom: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 0 55mm 55mm;
      border-color: transparent transparent ${p} transparent;
    }
    .corner-tr-inner {
      position: absolute;
      bottom: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 0 38mm 38mm;
      border-color: transparent transparent ${a} transparent;
    }

    @media print {
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-left">${companyCode}</div>
    <div class="hdr-right">${companyName}</div>
  </div>

  <!-- Dot grid decoration -->
  <div class="dots"></div>

  <!-- Geometric squares beside title -->
  <div class="sq-wrap">
    <div class="sq-gray"></div>
    <div class="sq-accent"></div>
  </div>

  <!-- Small square right side of title area -->
  <div class="sq-title-right"></div>

  <!-- Main Title -->
  <div class="title-wrap">
    <div class="cert-title">Certificate<br>of Completion</div>
  </div>

  <!-- Awarded to -->
  <div class="awarded-to">This certificate is awarded to</div>

  <!-- Learner name -->
  <div class="name-box">
    <span class="learner-name">${empName}</span>
  </div>

  <!-- For completing -->
  <div class="completing-text">for successfully completing the training of</div>

  <!-- Course name -->
  <div class="course-box">
    <span class="course-name">${cert.course}</span>
  </div>

  <!-- Completion date line -->
  <div class="completion-line">
    Completion Date : ${cert.issued}
    &nbsp;&nbsp;|&nbsp;&nbsp;
    Score : ${cert.score} &nbsp;(${getGrade(cert.score)})
    &nbsp;&nbsp;|&nbsp;&nbsp;
    Training Hours : ${cert.training_hours} jam
  </div>

  <!-- Detail chips -->
  <div class="chips">
    <div class="chip">NIK: <b>${empNik}</b></div>
    <div class="chip">Jabatan: <b>${positionName}</b></div>
    <div class="chip">Departemen: <b>${deptName}</b></div>
    ${cert.expires ? `<div class="chip">Berlaku s/d: <b>${cert.expires}</b></div>` : '<div class="chip">Berlaku: <b>Selamanya</b></div>'}
    <div class="chip">CPD: <b>${cert.cpd_points} pts</b></div>
    <div class="chip">Periode: <b>${cert.period || '-'}</b></div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="cert-meta">
      No. ${certNumber}<br>
      Diterbitkan: ${cert.issued}<br>
      ${companyName}
    </div>
    <div class="sig-area">
      <div class="sig-line"></div>
      <div class="sig-name">${approverName}</div>
      <div class="sig-title">${approverTitle}</div>
    </div>
  </div>

  <!-- Corner decoration -->
  <div class="corner-tr"></div>
  <div class="corner-tr-inner"></div>

</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); }</script>
</body>
</html>`
}

export default function CertificatesPage() {
  const t = useT()
  const { currentUser }               = useAuthStore()
  const { employees }                 = useEmployeeStore()
  const { companies }                 = useStructureStore()
  const { templates, courseSettings } = useCertificateStore()
  const [tab, setTab]                 = useState('earned')
  const [downloading, setDownloading] = useState(null)

  const employee  = employees.find(e => e.id === currentUser?.id) || {}
  const companyId = employee.companyId || 1
  const company   = companies.find(c => c.id === companyId) || { name:'PT Nusantara Teknologi', companyCode:'NTK' }

  const handleDownload = async (cert) => {
    setDownloading(cert.id)

    const template = templates.find(tmpl => tmpl.companyId === companyId) || templates[0]
    const theme    = THEMES.find(tmpl => tmpl.id === template?.themeId)   || THEMES[0]

    const courseSetting = courseSettings.find(cs =>
      cert.course.toLowerCase().includes(cs.course.toLowerCase()) ||
      cs.course.toLowerCase().includes(cert.course.toLowerCase())
    )

    const grade      = getGrade(cert.score)
    const year       = cert.issued?.slice(-4) || new Date().getFullYear()
    const certNumber = `CERT/${year}/${company.companyCode || 'HCM'}/${String(cert.id).padStart(4, '0')}`
    const empName    = employee.name    || currentUser?.name || 'Karyawan'
    const empNik     = employee.nik     || 'EMP000'
    const approverName  = courseSetting?.approver       || 'HR Manager'
    const approverTitle = courseSetting?.approver_title || 'Human Resources Manager'

    const vars = {
      '[[learner_name]]':       empName,
      '[[nik]]':                empNik,
      '[[position]]':           currentUser?.position || '-',
      '[[department]]':         currentUser?.dept     || '-',
      '[[company_name]]':       company.name,
      '[[course_name]]':        cert.course,
      '[[course_code]]':        `COURSE-${String(cert.id).padStart(3, '0')}`,
      '[[training_hours]]':     String(cert.training_hours || 0),
      '[[completion_date]]':    cert.issued,
      '[[score]]':              String(cert.score),
      '[[grade]]':              grade,
      '[[validity_date]]':      cert.expires || 'Selamanya',
      '[[certificate_number]]': certNumber,
      '[[approver_name]]':      approverName,
      '[[approver_title]]':     approverTitle,
      '[[issue_date]]':         cert.issued,
      '[[period]]':             cert.period || '-',
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      let bodyHtml, bgHtml, pageW, pageH, landscape, mT, mB, mL, mR

      if (template?.rtfContent) {
        let rtf = template.rtfContent
        for (const [k, v] of Object.entries(vars)) rtf = rtf.split(k).join(v)

        const r = rtfToHtml(rtf)
        bodyHtml  = r.html;  bgHtml = r.bgHtml
        landscape = r.landscape
        pageW = r.widthMm;   pageH = r.heightMm
        mT = r.marginTop;    mB = r.marginBottom
        mL = r.marginLeft;   mR = r.marginRight
      } else {
        pageW = 210; pageH = 297; landscape = false
        mT = 25; mB = 25; mL = 25; mR = 25
        bgHtml = ''
        bodyHtml = buildCertificateHTML({
          cert, empName, empNik,
          companyName:  company.name,
          companyCode:  company.companyCode || 'HCM',
          positionName: currentUser?.position || '-',
          deptName:     currentUser?.dept     || '-',
          theme, certNumber, approverName, approverTitle,
        })
        const m = bodyHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        bodyHtml = m ? m[1] : bodyHtml
      }

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'position:fixed;left:-99999px;top:0;'

      const pxPerMm = 96 / 25.4
      const pxW     = Math.round(pageW * pxPerMm)
      const pxH     = Math.round(pageH * pxPerMm)

      const pageEl = document.createElement('div')
      pageEl.style.cssText = [
        `width:${pxW}px`, `height:${pxH}px`,
        'position:relative', 'background:white', 'overflow:hidden',
        "font-family:'Segoe UI',Arial,sans-serif", 'font-size:11pt',
        'box-sizing:border-box',
      ].join(';')

      if (bgHtml) {
        const bgEl = document.createElement('div')
        bgEl.style.cssText = `position:absolute;top:0;left:0;width:${pxW}px;height:${pxH}px;z-index:0;overflow:hidden;`
        bgEl.innerHTML = bgHtml.replace(
          /width:[^;]+mm[^;]*;[^"]*height:[^;]+mm/g,
          `width:${pxW}px;height:${pxH}px`
        )
        pageEl.appendChild(bgEl)
      }

      const contentEl = document.createElement('div')
      const padPx = (mm) => Math.round(mm * pxPerMm)
      contentEl.style.cssText = [
        'position:relative', 'z-index:1', 'box-sizing:border-box',
        `padding:${padPx(mT)}px ${padPx(mR)}px ${padPx(mB)}px ${padPx(mL)}px`,
      ].join(';')
      contentEl.innerHTML = bodyHtml

      pageEl.appendChild(contentEl)
      wrapper.appendChild(pageEl)
      document.body.appendChild(wrapper)

      await Promise.all(
        [...pageEl.querySelectorAll('img')].map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(res => { img.onload = res; img.onerror = res })
        )
      )

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: pxW,
        height: pxH,
        logging: false,
      })

      document.body.removeChild(wrapper)

      const pdf = new jsPDF({
        orientation: landscape ? 'l' : 'p',
        unit: 'mm',
        format: [pageW, pageH],
        compress: true,
      })
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH)
      const filename = `sertifikat_${cert.course.replace(/[^\w]/g, '_')}.pdf`
      pdf.save(filename)

    } catch (err) {
      console.error('[handleDownload]', err)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>My Certificates</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Sertifikat yang telah Anda raih dan progress menuju sertifikat berikutnya.','Certificates you have earned and progress towards your next certificate.')}</p>


      <div className='flex gap-2 mb-4'>
        {[[`earned`,t('Sertifikat Diraih','Earned Certificates')],[`progress`,t('Dalam Proses','In Progress')]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab===k?'bg-red-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab==='earned' && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
          {CERTS.map(c=>{
            const template = templates.find(tmpl => tmpl.companyId === companyId) || templates[0]
            const theme    = THEMES.find(tmpl => tmpl.id === template?.themeId)  || THEMES[0]
            return (
              <div key={c.id} className='bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:border-red-200 transition'>
                <div className='relative h-20 overflow-hidden' style={{ background:'white', borderBottom:'1px solid #f0f0f0' }}>
                  <div className='absolute bottom-0 right-0 w-0 h-0'
                    style={{ borderStyle:'solid', borderWidth:'0 0 40px 40px', borderColor:`transparent transparent ${theme.primary} transparent` }}></div>
                  <div className='absolute bottom-0 right-0 w-0 h-0'
                    style={{ borderStyle:'solid', borderWidth:'0 0 26px 26px', borderColor:`transparent transparent ${theme.accent} transparent` }}></div>
                  <div className='absolute top-3 left-3 w-4 h-4 rounded-sm' style={{ background:'#ccc', opacity:0.6 }}></div>
                  <div className='absolute top-5 left-1 w-2.5 h-2.5 rounded-sm' style={{ background:theme.accent }}></div>
                  <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <div className='text-xs font-black tracking-widest uppercase' style={{ color:theme.primary }}>Certificate of Completion</div>
                    <div className='text-xs text-gray-400 mt-0.5'>{c.course}</div>
                  </div>
                </div>

                <div className='p-5'>
                  <div className='flex items-start justify-between mb-3'>
                    <div>
                      <div className='font-bold text-gray-800'>{c.title}</div>
                      <div className='text-xs mt-0.5' style={{ color: theme.primary }}>
                        {THEMES.find(tmpl=>tmpl.id===template?.themeId)?.label || 'Navy Corporate'} Theme
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.status==='Valid'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{c.status}</span>
                  </div>
                  <div className='flex gap-3 flex-wrap text-xs text-gray-500 mb-4'>
                    <span><Icon e='📅' size={14} className='inline align-[-2px]' /> {t('Terbit','Issued')}: {c.issued}</span>
                    <span><Icon e='⏰' size={14} className='inline align-[-2px]' /> {c.expires ? t(`Berlaku s/d ${c.expires}`,`Valid until ${c.expires}`) : t('Selamanya','Permanent')}</span>
                    <span><Icon e='⭐' size={14} className='inline align-[-2px]' /> {c.cpd_points} CPD</span>
                    <span><Icon e='📊' size={14} className='inline align-[-2px]' /> {t('Nilai','Score')}: <b className='text-gray-700'>{c.score} ({getGrade(c.score)})</b></span>
                  </div>
                  <div className='flex gap-2'>
                    <button className='flex-1 py-2 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100 border border-gray-200'>
                      <Icon e='👁️' size={14} className='inline align-[-2px]' /> {t('Lihat','View')}
                    </button>
                    <button
                      onClick={() => handleDownload(c)}
                      disabled={downloading === c.id}
                      className='flex-1 py-2 text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 transition'
                      style={{ background:`linear-gradient(135deg,${theme.primary},${theme.accent})` }}>
                      {downloading === c.id ? t('Memproses...','Processing...') : t('Download PDF','Download PDF')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab==='progress' && (
        <div className='space-y-4'>
          {IN_PROGRESS.map(c=>(
            <div key={c.id} className='bg-white rounded-xl p-5 shadow-sm border border-gray-200'>
              <div className='flex items-start justify-between mb-3'>
                <div>
                  <div className='font-semibold text-gray-700'>{c.title}</div>
                  <div className='text-xs text-gray-500 mt-0.5'>{t('Syarat','Requirements')}: {c.requirements}</div>
                  <div className='text-xs text-gray-400 mt-0.5'>Due: {c.due}</div>
                </div>
                <span className='text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-semibold'>{t('Dalam Proses','In Progress')}</span>
              </div>
              <div>
                <div className='flex justify-between text-xs text-gray-500 mb-1'><span>{t('Progress Course','Course Progress')}</span><span className='font-semibold'>{c.progress}%</span></div>
                <div className='w-full bg-gray-200 rounded-full h-2.5'><div className='h-2.5 rounded-full bg-red-500' style={{ width:`${c.progress}%` }}></div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
