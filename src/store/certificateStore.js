import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

export const THEMES = [
  { id:'navy',    label:'Navy Corporate',    primary:'#052B52', accent:'#039299', bg:'#f0f4ff', border:'#052B52', text:'#052B52' },
  { id:'maroon',  label:'Maroon Prestige',   primary:'#7b1d1d', accent:'#b91c1c', bg:'#fff5f5', border:'#7b1d1d', text:'#7b1d1d' },
  { id:'forest',  label:'Forest Green',      primary:'#14532d', accent:'#166534', bg:'#f0fdf4', border:'#14532d', text:'#14532d' },
  { id:'gold',    label:'Gold Executive',    primary:'#78350f', accent:'#d97706', bg:'#fffbeb', border:'#92400e', text:'#78350f' },
  { id:'slate',   label:'Slate Modern',      primary:'#1e293b', accent:'#475569', bg:'#f8fafc', border:'#334155', text:'#1e293b' },
  { id:'purple',  label:'Royal Purple',      primary:'#4c1d95', accent:'#7c3aed', bg:'#f5f3ff', border:'#5b21b6', text:'#4c1d95' },
  { id:'teal',    label:'Teal Professional', primary:'#134e4a', accent:'#0f766e', bg:'#f0fdfa', border:'#115e59', text:'#134e4a' },
  { id:'crimson', label:'Crimson Premium',   primary:'#881337', accent:'#be123c', bg:'#fff1f2', border:'#9f1239', text:'#881337' },
]

// ── Signature SVG helpers ──────────────────────────────────────────────────────
const sig = (paths) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="75" viewBox="0 0 220 75">${paths}</svg>`)}`

const INIT_SIGNATORIES = [
  {
    id: 1,
    name: 'Budi Hartono',
    title: 'Human Resources Manager',
    department: 'Human Resources',
    status: 'Active',
    password: '',
    signatureImage: sig(`
      <path d="M12,55 C14,30 14,18 20,15 C28,11 33,19 30,32 C28,42 20,44 20,44 C31,42 38,47 37,57 C36,66 24,67 16,65" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M52,15 L51,62 M51,38 L76,38 M76,15 L75,62" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M8,70 Q55,64 110,67 Q160,70 215,63" stroke="#1a1a3e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 2,
    name: 'Sari Dewi Rahayu',
    title: 'Head of Learning & Development',
    department: 'Learning & Development',
    status: 'Active',
    password: '',
    signatureImage: sig(`
      <path d="M12,38 C20,10 40,8 44,22 C48,36 32,50 22,52 C12,54 8,46 14,40 C20,30 36,28 46,33 C52,36 52,42 48,50" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M68,18 C64,38 66,58 72,62 C78,66 88,60 90,48 C92,34 84,18 76,17 C68,15 63,28 66,42" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M8,70 Q60,63 115,66 Q165,69 215,62" stroke="#1a1a3e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 3,
    name: 'Ahmad Fauzi',
    title: 'Director of Human Capital',
    department: 'Human Capital',
    status: 'Active',
    password: '',
    signatureImage: sig(`
      <path d="M22,58 L42,10 L62,58 M30,36 L54,36" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M78,15 C75,35 76,56 81,60 M81,15 C94,14 100,20 98,32 C96,43 81,43 81,43 L99,60" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M8,70 Q60,63 115,66 Q165,69 215,62" stroke="#1a1a3e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 4,
    name: 'Dian Permatasari',
    title: 'GCG & Compliance Manager',
    department: 'Compliance',
    status: 'Active',
    password: '',
    signatureImage: sig(`
      <path d="M14,38 C16,16 26,10 34,14 C42,18 44,30 40,42 C36,54 24,60 16,56 C8,52 10,40 18,36 C28,30 42,34 46,46" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M62,15 L60,60 M60,37 L82,37 M88,15 C84,35 85,55 90,60" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M8,70 Q60,63 115,66 Q165,69 215,62" stroke="#1a1a3e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 5,
    name: 'Rizky Ananda',
    title: 'HR Learning Administrator',
    department: 'Learning & Development',
    status: 'Active',
    password: '',
    signatureImage: sig(`
      <path d="M14,18 L14,58 M14,18 C28,16 36,20 34,30 C32,40 14,40 14,40" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14,40 C28,38 36,44 34,56" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M50,18 L50,58 M66,18 L66,58 M50,38 L66,38" stroke="#1a1a3e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M8,70 Q60,63 115,66 Q165,69 215,62" stroke="#1a1a3e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    `),
  },
]

const INIT_COURSE_SETTINGS = [
  { id:1, course:'K3 & Keselamatan Kerja',        templateId:1, min_score:70,  attendance_req:80,  validity_months:24, auto_generate:true,  approver:'HR Manager',       approver_title:'Human Resources Manager',        status:'Active' },
  { id:2, course:'Leadership Fundamentals Level 1',templateId:2, min_score:75,  attendance_req:100, validity_months:0,  auto_generate:true,  approver:'Head of L&D',      approver_title:'Head of Learning & Development',  status:'Active' },
  { id:3, course:'GCG Compliance Certification',   templateId:3, min_score:80,  attendance_req:100, validity_months:12, auto_generate:false, approver:'Compliance Manager',approver_title:'GCG & Compliance Manager',         status:'Active' },
  { id:4, course:'Excel Advanced for HR',          templateId:1, min_score:70,  attendance_req:80,  validity_months:0,  auto_generate:true,  approver:'HR Learning Admin', approver_title:'HR Learning Administrator',        status:'Active' },
  { id:5, course:'Pengenalan HCMS System',         templateId:1, min_score:70,  attendance_req:80,  validity_months:0,  auto_generate:true,  approver:'HR Manager',       approver_title:'Human Resources Manager',        status:'Active' },
]

const INIT_TEMPLATES = [
  {
    id: 1, name: 'Sertifikat Penyelesaian Standard', type: 'Penyelesaian (Completion)',
    orientation: 'Landscape', themeId: 'navy',
    headerTitle: 'CERTIFICATE OF COMPLETION', subTitle: 'Sertifikat ini diberikan kepada',
    bodyText: 'yang telah berhasil menyelesaikan pelatihan [[course_name]] selama [[training_hours]] jam dengan nilai [[score]] ([[grade]]).',
    footerText: 'Diterbitkan pada [[issue_date]] · Berlaku hingga [[validity_date]]',
    approverName: '[[approver_name]]', approverTitle: '[[approver_title]]',
    signatoryIds: [1],
    logoUrl: null, logoPosition: 'Kiri', showSeal: true, showCertNo: true,
    validityMonths: 0, notes: 'Template umum untuk semua course.', status: 'Active',
    elements: [],
  },
  {
    id: 2, name: 'Sertifikat Excellence Award', type: 'Excellence Award',
    orientation: 'Landscape', themeId: 'gold',
    headerTitle: 'EXCELLENCE AWARD', subTitle: 'Penghargaan diberikan kepada',
    bodyText: 'atas pencapaian luar biasa dalam pelatihan [[course_name]] dengan nilai [[score]] ([[grade]]).',
    footerText: 'Diterbitkan pada [[issue_date]]',
    approverName: '[[approver_name]]', approverTitle: '[[approver_title]]',
    signatoryIds: [3],
    logoUrl: null, logoPosition: 'Tengah', showSeal: true, showCertNo: true,
    validityMonths: 0, notes: '', status: 'Draft',
    elements: [],
  },
]

export const useCertificateStore = create(
  persist(
    (set) => ({
      templates:      INIT_TEMPLATES,
      courseSettings: INIT_COURSE_SETTINGS,
      signatories:    INIT_SIGNATORIES,

      setTemplates:      (fn) => set(s => ({ templates:      typeof fn === 'function' ? fn(s.templates)      : fn })),
      setCourseSettings: (fn) => set(s => ({ courseSettings: typeof fn === 'function' ? fn(s.courseSettings) : fn })),

      updateTemplateRtf: (tplId, rtfContent) => set(s => ({
        templates: s.templates.map(t => t.id === tplId ? { ...t, rtfContent } : t),
      })),

      addSignatory: (data) => set(s => ({
        signatories: [{ ...data, id: Date.now() }, ...s.signatories],
      })),

      updateSignatory: (id, data) => set(s => ({
        signatories: s.signatories.map(sg => sg.id === id ? { ...sg, ...data } : sg),
      })),

      deleteSignatory: (id) => set(s => ({
        signatories: s.signatories.filter(sg => sg.id !== id),
      })),
    }),
    { name: 'certificate-store-v2', storage: createJSONStorage(() => dbStorage) }
  )
)
