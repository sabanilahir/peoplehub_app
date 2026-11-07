import { create } from 'zustand'
import { autoAssignOnboardingForEmployee } from './onboardingAutoAssign'
import { persist } from '@/lib/persist'

// ─── Action & Reason LOV ──────────────────────────────────────────────────────
export const HISTORY_ACTIONS = [
  'Hire',
  'Transfer',
  'Promotion',
  'Demotion',
  'Salary Change',
  'Leave of Absence',
  'Return from Leave',
  'Data Change',
  'Termination',
  'Cancel Employment',
]

export const HISTORY_REASONS = {
  'Hire':              ['New Hire', 'Rehire', 'Conversion from Contract', 'Acquisition'],
  'Transfer':          ['Internal Transfer', 'Interdepartmental Transfer', 'Intercompany Transfer', 'Relocation'],
  'Promotion':         ['Performance-Based', 'Merit Promotion', 'Acting Assignment'],
  'Demotion':          ['Performance Issue', 'Disciplinary Action', 'Voluntary Demotion'],
  'Salary Change':     ['Annual Review', 'Market Adjustment', 'Promotion', 'Merit Increase', 'Correction'],
  'Leave of Absence':  ['Maternity/Paternity Leave', 'Medical Leave', 'Personal Leave', 'Study Leave', 'Unpaid Leave'],
  'Return from Leave': ['Return from Maternity/Paternity', 'Return from Medical Leave', 'Return from Personal Leave', 'Return from Study Leave'],
  'Data Change':       ['Name Change', 'Address Change', 'Personal Data Update', 'Legal Data Change', 'Contract Renewal'],
  'Termination':       ['Resignation', 'End of Contract', 'Retirement', 'Layoff / Redundancy', 'Dismissal', 'Mutual Agreement', 'Death'],
  'Cancel Employment': ['Data Entry Error', 'Wrong Candidate', 'Duplicate Record', 'Offer Rescinded'],
}

export const ACTION_COLOR = {
  'Hire':              'bg-green-100 text-green-700',
  'Transfer':          'bg-blue-100 text-blue-700',
  'Promotion':         'bg-red-100 text-red-700',
  'Demotion':          'bg-orange-100 text-orange-700',
  'Salary Change':     'bg-cyan-100 text-cyan-700',
  'Leave of Absence':  'bg-yellow-100 text-yellow-700',
  'Return from Leave': 'bg-teal-100 text-teal-700',
  'Data Change':       'bg-gray-100 text-gray-600',
  'Termination':       'bg-red-100 text-red-700',
  'Cancel Employment': 'bg-gray-200 text-gray-700',
}

// ─── Structure IDs (aligned with structureStore seed data) ───────────────────
// Division: 1=Technology Group, 2=Operations Group, 3=Finance Group
// Company:  1=PT Nusantara Teknologi (NTK), 2=PT Nusantara Finance (NFC), 3=Philippines Inc (PHL)
// BUnit:    1=Software Engineering, 2=Infrastructure, 3=Accounting, 4=HR (NTK), 5=HR (NFC)
//           6=Product Engineering (PHL), 7=Quality Assurance (PHL), 8=HR (PHL)
// Dept:     1=Frontend, 2=Backend, 3=DevOps, 4=Procurement, 5=HR Ops (NTK), 6=HR Ops (NFC)
//           7=Web Development (PHL), 8=Mobile Development (PHL), 9=QA & Testing (PHL), 10=HR Ops (PHL)
// Position: 1=Junior SE(PC10), 2=SE(PC20), 3=Senior SE(PC30), 4=Eng Mgr(PC53),
//           5=IT Support(PC15), 6=Finance Analyst(PC20), 7=Finance Mgr(PC54),
//           22=HR Manager NTK(PC53), 23=HR Officer NTK(PC20),
//           24=HR Manager NFC(PC53), 25=HR Officer NFC(PC20),
//           26=Jr Web Dev(PC10), 27=Web Dev(PC20), 28=Sr Web Dev(PC30), 29=Eng Mgr PHL(PC53)
//           30=Mobile Dev(PC20), 31=Sr Mobile Dev(PC30), 32=QA Eng(PC15), 33=Sr QA Eng(PC25)
//           34=QA Lead(PC40), 35=HR Mgr PHL(PC53), 36=HR Officer PHL(PC20)

const SEED_EMPLOYEES = [
  // Top of the reporting chain — HR Director. Every other employee ultimately
  // reports up to this record, so no one is left without a manager.
  // { id:91, name:'Onboarding Admin',    managerId:null, status:'Active', joinDate:'2020-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR',          position:'HR Director',       nik:'HR-DIR-91', email:'onboarding-admin@testing.com' },
  // // Engineering Manager (the demo `manager` login, id 2) — reports to the CTO
  // // and directly manages the engineering team below.
  // { id:2,  name:'Dewi Rahayu',         managerId:7,  status:'Active', joinDate:'2021-03-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Engineering', position:'Engineering Manager', nik:'ENG-MGR-02', email:'dewi@testing.com' },
  // // Onboarding-module demo trio — employee 93 reports to manager 92 so the
  // // manager can approve/adjust the employee's onboarding.
  // { id:92, name:'Onboarding Manager',  managerId:91, status:'Active', joinDate:'2024-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Frontend', position:'Manager', nik:'OB-MGR-92', email:'onboarding-manager@testing.com' },
  // { id:93, name:'Onboarding Employee', managerId:92, status:'Active', joinDate:'2026-01-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Frontend', position:'Staff',   nik:'OB-EMP-93', email:'onboarding-employee@testing.com' },
  // // Offboarding-module demo trio — employee 96 reports to manager 95 so the
  // // manager can raise the resignation and track the employee's offboarding.
  // { id:95, name:'Offboarding Manager',  managerId:91, status:'Active', joinDate:'2023-02-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Frontend', position:'Manager', nik:'OF-MGR-95', email:'offboarding-manager@testing.com' },
  // { id:96, name:'Offboarding Employee', managerId:95, status:'Active', joinDate:'2024-06-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Frontend', position:'Staff',   nik:'OF-EMP-96', email:'offboarding-employee@testing.com' },
  // // Team reporting to the demo Manager account (Dewi Rahayu · id 2) so the
  // // "9-Box Tim Saya" (MSS) view shows an assessed team during the demo.
  // { id:30, name:'Reza Firmansyah',   managerId:2, status:'Active', joinDate:'2025-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer', nik:'ENG-030', email:'reza@testing.com' },
  // { id:31, name:'Tika Rahmawati',    managerId:2, status:'Active', joinDate:'2024-08-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer', nik:'ENG-031', email:'tika@testing.com' },
  // { id:32, name:'Hendro Cahyo',      managerId:2, status:'Active', joinDate:'2023-05-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Senior Software Engineer', nik:'ENG-032', email:'hendro@testing.com' },
  // { id:33, name:'Yuni Purnamasari',  managerId:2, status:'Active', joinDate:'2025-01-15', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer', nik:'ENG-033', email:'yuni@testing.com' },

  // // ── Additional managers, each with a small team (a few accounts for the
  // //    simulation) so the "manager" role always implies real subordinates. ──
  // // Engineering — CTO over the two engineering managers.
  // { id:7,  name:'Rizky Pratama',     managerId:91, status:'Active', joinDate:'2019-02-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Engineering', position:'Chief Technology Officer', nik:'ENG-CTO-07', email:'rizky@testing.com' },
  // { id:10, name:'Fajar Nugroho',     managerId:7,  status:'Active', joinDate:'2021-06-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Engineering', position:'Engineering Manager', nik:'ENG-MGR-10', email:'fajar@testing.com' },
  // { id:5,  name:'Sari Indah',        managerId:10, status:'Active', joinDate:'2023-04-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer', nik:'ENG-005', email:'sari@testing.com' },
  // { id:34, name:'Arif Budiman',      managerId:10, status:'Active', joinDate:'2024-02-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer', nik:'ENG-034', email:'arif@testing.com' },
  // { id:35, name:'Siti Kholifah',     managerId:10, status:'Active', joinDate:'2025-06-01', companyId:1, departmentId:1, positionId:1, employmentType:'Permanent', department:'Engineering', position:'Junior Engineer', nik:'ENG-035', email:'siti.k@testing.com' },
  // // IT — one manager with three engineers.
  // { id:17, name:'Juan dela Cruz',    managerId:91, status:'Active', joinDate:'2020-03-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT', position:'IT Manager', nik:'IT-MGR-17', email:'juan@testing.com' },
  // { id:18, name:'Maria Santos',      managerId:17, status:'Active', joinDate:'2023-08-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'Software Engineer', nik:'IT-018', email:'maria.santos@testing.com' },
  // { id:19, name:'Jose Reyes',        managerId:17, status:'Active', joinDate:'2024-01-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'Software Engineer', nik:'IT-019', email:'jose.reyes@testing.com' },
  // { id:20, name:'Ana Gonzales',      managerId:17, status:'Active', joinDate:'2024-05-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'Software Engineer', nik:'IT-020', email:'ana.gonzales@testing.com' },
  // // HR — one manager with two officers.
  // { id:11, name:'Anggita Putri',     managerId:91, status:'Active', joinDate:'2021-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR', position:'HR Manager', nik:'HR-MGR-11', email:'anggita@testing.com' },
  // { id:25, name:'Paolo Cruz',        managerId:11, status:'Active', joinDate:'2023-09-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR', position:'HR Officer', nik:'HR-025', email:'paolo.cruz@testing.com' },
  // { id:26, name:'Michelle Ramos',    managerId:11, status:'Active', joinDate:'2024-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR', position:'HR Officer', nik:'HR-026', email:'michelle.ramos@testing.com' },
  // // Finance — one manager with three officers.
  // { id:39, name:'Dimas Ardianto',    managerId:91, status:'Active', joinDate:'2020-07-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Finance', position:'Finance Manager', nik:'FIN-MGR-39', email:'dimas@testing.com' },
  // { id:40, name:'Clara Natalia',     managerId:39, status:'Active', joinDate:'2023-02-01', companyId:1, departmentId:1, positionId:6, employmentType:'Permanent', department:'Finance', position:'Finance Officer', nik:'FIN-040', email:'clara@testing.com' },
  // { id:41, name:'Kevin Simanjuntak', managerId:39, status:'Active', joinDate:'2024-04-01', companyId:1, departmentId:1, positionId:6, employmentType:'Permanent', department:'Finance', position:'Finance Officer', nik:'FIN-041', email:'kevin@testing.com' },
  // { id:42, name:'Putri Anggraeni',   managerId:39, status:'Active', joinDate:'2025-01-01', companyId:1, departmentId:1, positionId:6, employmentType:'Permanent', department:'Finance', position:'Finance Officer', nik:'FIN-042', email:'putri.a@testing.com' },
  // // IT — second manager with three engineers.
  // { id:23, name:'Michael Torres',    managerId:91, status:'Active', joinDate:'2020-09-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT', position:'IT Manager', nik:'IT-MGR-23', email:'michael.torres@testing.com' },
  // { id:21, name:'Ramon Villanueva',  managerId:23, status:'Active', joinDate:'2023-05-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'Software Engineer', nik:'IT-021', email:'ramon.villanueva@testing.com' },
  // { id:22, name:'Liza Manalo',       managerId:23, status:'Active', joinDate:'2024-02-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'Software Engineer', nik:'IT-022', email:'liza.manalo@testing.com' },
  // { id:24, name:'Grace Ocampo',      managerId:23, status:'Active', joinDate:'2024-07-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'IT Officer', nik:'IT-024', email:'grace.ocampo@testing.com' },
  // // HR — second manager with two officers.
  // { id:38, name:'Priyanka Dewi',     managerId:91, status:'Active', joinDate:'2020-11-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR', position:'HR Manager', nik:'HR-MGR-38', email:'priyanka@testing.com' },
  // { id:46, name:'Rose Santos',       managerId:38, status:'Active', joinDate:'2023-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR', position:'HR Officer', nik:'HR-046', email:'rose@testing.com' },
  // { id:16, name:'Hendri Wijaksono',  managerId:38, status:'Active', joinDate:'2023-10-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR', position:'HR Officer', nik:'HR-016', email:'hendri@testing.com' },

  // // Engineering — Senior Eng Manager over two more engineering managers.
  // { id:28, name:'Anita Wulandari',   managerId:7,  status:'Active', joinDate:'2019-08-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Engineering', position:'Senior Engineering Manager', nik:'ENG-SMGR-28', email:'anita@testing.com' },
  // { id:27, name:'Wawan Setiawan',    managerId:28, status:'Active', joinDate:'2021-09-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Engineering', position:'Engineering Manager', nik:'ENG-MGR-27', email:'wawan@testing.com' },
  // { id:1,  name:'Budi Santoso',      managerId:27, status:'Active', joinDate:'2023-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer', nik:'ENG-001', email:'budi@testing.com' },
  // { id:29, name:'Bimo Saputra',      managerId:28, status:'Active', joinDate:'2022-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Engineering', position:'Engineering Manager', nik:'ENG-MGR-29', email:'bimo@testing.com' },
  // { id:201,name:'Galih Prakoso',     managerId:29, status:'Active', joinDate:'2024-06-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer', nik:'ENG-201', email:'galih@testing.com' },
  // // IT — IT Director over three IT managers.
  // { id:45, name:'Jennifer Lim',      managerId:91, status:'Active', joinDate:'2019-05-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT', position:'IT Director', nik:'IT-DIR-45', email:'jennifer@testing.com' },
  // { id:37, name:'Lena Wahyuni',      managerId:45, status:'Active', joinDate:'2021-04-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT', position:'IT Manager', nik:'IT-MGR-37', email:'lena@testing.com' },
  // { id:49, name:'Sophia Mendoza',    managerId:37, status:'Active', joinDate:'2023-07-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'IT Officer', nik:'IT-049', email:'sophia.mendoza@testing.com' },
  // { id:47, name:'Marco Dela Cruz',   managerId:45, status:'Active', joinDate:'2021-11-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT', position:'IT Manager', nik:'IT-MGR-47', email:'marco.delacruz@testing.com' },
  // { id:50, name:'Luis Garcia',       managerId:47, status:'Active', joinDate:'2024-01-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'IT Officer', nik:'IT-050', email:'luis.garcia@testing.com' },
  // { id:48, name:'Angelo Bautista',   managerId:45, status:'Active', joinDate:'2022-03-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT', position:'IT Manager', nik:'IT-MGR-48', email:'angelo.bautista@testing.com' },
  // { id:202,name:'Diego Ramos',       managerId:48, status:'Active', joinDate:'2024-08-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'IT', position:'IT Officer', nik:'IT-202', email:'diego.ramos@testing.com' },
  // // ── System / role-demo logins that previously had no matching employee record.
  // //    Added so every login account maps 1:1 to an employee (all report to the
  // //    HR Director at the top of the chain, id 91).
  // { id:3,  name:'Rina Marlina',      managerId:91, status:'Active', joinDate:'2020-02-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR',            position:'HR Specialist',                       nik:'HR-003',  email:'rina@testing.com' },
  // { id:4,  name:'Ahmad Fauzi',       managerId:91, status:'Active', joinDate:'2020-02-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT',            position:'System Administrator',                nik:'IT-004',  email:'ahmad@testing.com' },
  // { id:9,  name:'Kartika Sari',      managerId:91, status:'Active', joinDate:'2019-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR',            position:'Chief Human Resources Officer',       nik:'HR-009',  email:'kartika@testing.com' },
  // { id:12, name:'Bagas Pratiwi',     managerId:91, status:'Active', joinDate:'2021-05-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR Operations', position:'HR Manager',                          nik:'HR-012',  email:'bagas@testing.com' },
  // { id:13, name:'Desi Kurniawati',   managerId:12, status:'Active', joinDate:'2022-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR Operations', position:'HR Officer',                          nik:'HR-013',  email:'desi@testing.com' },
  // { id:14, name:'Faisal Rahman',     managerId:12, status:'Active', joinDate:'2022-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR Operations', position:'HR Officer',                          nik:'HR-014',  email:'faisal@testing.com' },
  // { id:15, name:'Yuliani Suharto',   managerId:91, status:'Active', joinDate:'2021-06-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR Operations', position:'HR Manager',                          nik:'HR-015',  email:'yuliani@testing.com' },
  // { id:6,  name:'Hendra Kusuma',     managerId:91, status:'Active', joinDate:'2018-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT',            position:'Chief Technology Officer',            nik:'IT-006',  email:'hendra@testing.com' },
  // { id:8,  name:'Sandra Wijaya',     managerId:91, status:'Active', joinDate:'2017-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT',            position:'Chief Executive Officer',             nik:'IT-008',  email:'sandra@testing.com' },
  // { id:36, name:'Robert Santoso',    managerId:91, status:'Active', joinDate:'2018-04-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Finance',       position:'Chief Financial Officer',             nik:'FIN-036', email:'robert@testing.com' },
  // { id:43, name:'Yoga Pratama',      managerId:39, status:'Active', joinDate:'2024-02-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Finance',       position:'Junior Finance Officer',              nik:'FIN-043', email:'yoga@testing.com' },
  // { id:44, name:'Carlos Reyes',      managerId:91, status:'Active', joinDate:'2016-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'IT',            position:'President Director',                  nik:'IT-044',  email:'carlos@testing.com' },
  // { id:51, name:'Nadia Pratiwi',     managerId:52, status:'Active', joinDate:'2023-01-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR Operations', position:'HR Officer',                          nik:'HR-051',  email:'nadia.hro@testing.com' },
  // { id:52, name:'Bambang Wijaya',    managerId:91, status:'Active', joinDate:'2021-01-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR Operations', position:'HR Manager',                          nik:'HR-052',  email:'bambang.hrm@testing.com' },
  // { id:53, name:'Citra Lestari',     managerId:54, status:'Active', joinDate:'2023-02-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR Operations', position:'Organization Development Officer',     nik:'HR-053',  email:'citra.odo@testing.com' },
  // { id:54, name:'Surya Hidayat',     managerId:91, status:'Active', joinDate:'2021-02-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'HR Operations', position:'Organization Development Manager',     nik:'HR-054',  email:'surya.odm@testing.com' },
  // { id:55, name:'Talent User',       managerId:54, status:'Active', joinDate:'2023-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR Operations', position:'Talent Management Specialist',         nik:'HR-055',  email:'talent@testing.com' },
  // { id:90, name:'Learning Management',managerId:91, status:'Active', joinDate:'2022-01-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR Operations', position:'Learning Management Admin',            nik:'HR-090',  email:'learning@testing.com' },
  // { id:94, name:'Offboarding HR',    managerId:91, status:'Active', joinDate:'2022-02-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR',            position:'HR Offboarding',                      nik:'HR-094',  email:'offboarding-hr@testing.com' },
  // Performance-module demo trio — employee 99 reports to manager 98 so the
  // manager sees the employee in Team Check-In (HAY/VIP) and can raise a PIP;
  // the HR account (97) reviews submitted PIPs.
  { id:97, name:'Performance HR',       managerId:91, status:'Active', joinDate:'2022-03-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'HR',          position:'HR Specialist',      nik:'HR-097',  email:'performance-hr@testing.com' },
  { id:98, name:'Performance Manager',  managerId:91, status:'Active', joinDate:'2021-03-01', companyId:1, departmentId:1, positionId:4, employmentType:'Permanent', department:'Engineering', position:'Engineering Manager', nik:'ENG-MGR-98', email:'performance-manager@testing.com' },
  { id:99, name:'Performance Employee', managerId:98, status:'Active', joinDate:'2024-06-01', companyId:1, departmentId:1, positionId:2, employmentType:'Permanent', department:'Engineering', position:'Software Engineer',   nik:'ENG-099', email:'performance-employee@testing.com' },
]

let _empId     = 1
let _depId     = 10
let _eduId     = 10
let _certId    = 10
let _skillId   = 10
let _histId    = 20
let _bioHistId = 20

export const useEmployeeStore = create(
  (set, get) => ({
  // Default: empty. Data loaded from PostgreSQL via /api/employees.
  // SEED_EMPLOYEES is used as fallback only when DB is unavailable.
  employees: [],
  lastAddedEmpId: null,

  // ── Employee CRUD ──────────────────────────────────────────────
  addEmployee: (d) => {
    const id = _empId++
    const emp = {
      id, photo: null,
      dependents: [], education: [], certifications: [], skills: [],
      history: d.joinDate ? [{
        id: _histId++, effectiveDate: d.joinDate, effectiveSeq: 1,
        action: 'Hire', reason: 'New Hire',
        companyId: d.companyId||'', departmentId: d.departmentId||'',
        positionId: d.positionId||'', gradeId: d.gradeId||'', note: '',
      }] : [],
      ...d, id,
    }
    set(s => ({ lastAddedEmpId: id, employees: [...s.employees, emp] }))
    persist('/api/employees', 'POST', emp)   // write-through to DB (best-effort)

    // Also sync to authStore userList so the new user appears immediately
    try {
      if (typeof window !== 'undefined') {
        import('./authStore').then(({ useAuthStore }) => {
          const auth = useAuthStore.getState()
          const username = (emp.nik && emp.nik.trim()) || (emp.email ? emp.email.split('@')[0] : `emp_${id}`)
          const exists = auth.userList?.some(u => u.employeeId === id || (u.username && u.username.toLowerCase() === username.toLowerCase()))
          if (!exists && auth.userList) {
            const maxUId = auth.userList.reduce((m, u) => Math.max(m, Number(u.id) || 0), 0)
            const newUser = {
              id: Math.max(maxUId + 1, id),
              username,
              password: 'pass123',
              name: emp.name || '',
              role: emp.role || 'employee',
              dept: emp.dept || '',
              position: emp.position || '',
              email: emp.email || '',
              employeeId: id,
            }
            useAuthStore.setState(s => ({ userList: [...s.userList, newUser] }))
          }
        }).catch(() => {})
      }
    } catch (e) {
      console.error('Auto-sync employee to authStore failed:', e)
    }

    // Rule-based auto-assign onboarding for the new hire so no one is missed.
    // Done after state update; failures must not block employee creation.
    try {
      autoAssignOnboardingForEmployee(emp, get().employees)
    } catch (e) {
      console.error('Auto-assign onboarding failed:', e)
    }
    return id
  },
  updateEmployee: (id, d) => {
    set(s => ({ employees: s.employees.map(e => e.id === id ? { ...e, ...d } : e) }))
    persist(`/api/employees/${id}`, 'PUT', d)
  },
  deleteEmployee: (id) => {
    set(s => ({ employees: s.employees.filter(e => e.id !== id) }))
    persist(`/api/employees/${id}`, 'DELETE')
  },

  // ── Photo ──────────────────────────────────────────────────────
  setPhoto: (id, dataUrl) => set(s => ({
    employees: s.employees.map(e => e.id === id ? { ...e, photo: dataUrl } : e)
  })),

  // ── Dependents ─────────────────────────────────────────────────
  addDependent: (empId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, dependents: [...e.dependents, { id: _depId++, ...d }] }
      : e)
  })),
  updateDependent: (empId, depId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, dependents: e.dependents.map(x => x.id === depId ? {...x,...d} : x) }
      : e)
  })),
  deleteDependent: (empId, depId) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, dependents: e.dependents.filter(x => x.id !== depId) }
      : e)
  })),

  // ── Education ──────────────────────────────────────────────────
  addEducation: (empId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, education: [...e.education, { id: _eduId++, ...d }] }
      : e)
  })),
  updateEducation: (empId, eduId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, education: e.education.map(x => x.id === eduId ? { ...x, ...d } : x) }
      : e)
  })),
  deleteEducation: (empId, eduId) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, education: e.education.filter(x => x.id !== eduId) }
      : e)
  })),

  // ── Certifications ─────────────────────────────────────────────
  addCertification: (empId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, certifications: [...e.certifications, { id: _certId++, ...d }] }
      : e)
  })),
  updateCertification: (empId, certId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, certifications: e.certifications.map(x => x.id === certId ? { ...x, ...d } : x) }
      : e)
  })),
  deleteCertification: (empId, certId) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, certifications: e.certifications.filter(x => x.id !== certId) }
      : e)
  })),

  // ── Skills ─────────────────────────────────────────────────────
  addSkill: (empId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, skills: [...e.skills, { id: _skillId++, ...d }] }
      : e)
  })),
  updateSkill: (empId, skillId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, skills: e.skills.map(x => x.id === skillId ? { ...x, ...d } : x) }
      : e)
  })),
  deleteSkill: (empId, skillId) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, skills: e.skills.filter(x => x.id !== skillId) }
      : e)
  })),

  // ── History ────────────────────────────────────────────────────
  addHistory: (empId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, history: [...(e.history||[]), { id: _histId++, ...d }]
            .sort((a,b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.effectiveSeq - b.effectiveSeq) }
      : e)
  })),
  updateHistory: (empId, histId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, history: e.history.map(h => h.id === histId ? {...h,...d} : h) }
      : e)
  })),
  deleteHistory: (empId, histId) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, history: e.history.filter(h => h.id !== histId) }
      : e)
  })),

  // ── Bio (personal data) History — same effective-dated Correct/Update
  // pattern as the job/salary History above, kept as a separate array
  // since it carries a wholly different set of fields.
  addBioHistory: (empId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, bioHistory: [...(e.bioHistory||[]), { id: _bioHistId++, ...d }]
            .sort((a,b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.effectiveSeq - b.effectiveSeq) }
      : e)
  })),
  updateBioHistory: (empId, histId, d) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, bioHistory: e.bioHistory.map(h => h.id === histId ? {...h,...d} : h) }
      : e)
  })),
  deleteBioHistory: (empId, histId) => set(s => ({
    employees: s.employees.map(e => e.id === empId
      ? { ...e, bioHistory: e.bioHistory.filter(h => h.id !== histId) }
      : e)
  })),

  // Refresh latest employee data from PostgreSQL
  refreshFromDb: async () => {
    try {
      const r = await fetch('/api/employees')
      if (r.ok) {
        const rows = await r.json()
        if (Array.isArray(rows)) {
          const dbEmployees = rows.map(e => ({
            ...e,
            importedFrom: e.imported_from,
            odooId: e.odoo_id,
            dependents: e.dependents || [],
            education: e.education || [],
            certifications: e.certifications || [],
            skills: e.skills || [],
            history: e.history || [],
            bioHistory: e.bioHistory || [],
          }))
          set({ employees: dbEmployees })
          return dbEmployees
        }
      }
    } catch (e) {
      console.error('[EmployeeStore] refresh error:', e)
    }
  },
}))

// ─── Hydrate employees from PostgreSQL database ─────────────────────────────────
// Primary source: DB via /api/employees (Prisma → PostgreSQL)
// Fallback: SEED_EMPLOYEES (demo data) if DB is empty or unavailable
if (typeof window !== 'undefined' && !window.__kpbEmployeesLoaded) {
  window.__kpbEmployeesLoaded = true
  
  const load = async () => {
    // Try to load from PostgreSQL first
    try { 
      const r = await fetch('/api/employees'); 
      if (r.ok) { 
        const rows = await r.json(); 
        // Return DB employees (with normalized field names)
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map(e => ({
            ...e,
            location: e.location || 'Head Office',
            workLocationCode: e.workLocationCode || (e.location === 'Gudang' ? 'gudang' : e.location === 'Manhattan' ? 'livestream' : e.location === 'Others' ? 'sales' : 'ho'),
            address: e.address || 'PT Gemilang Nusantara Pantai Indah Kapuk',
            // Normalize DB field names to store format
            importedFrom: e.imported_from,
            odooId: e.odoo_id,
            // Ensure nested arrays exist
            dependents: e.dependents || [],
            education: e.education || [],
            certifications: e.certifications || [],
            skills: e.skills || [],
            history: e.history || [],
            bioHistory: e.bioHistory || [],
          }))
        }
      } 
    } catch (e) {
      console.warn('[EmployeeStore] DB unavailable:', e.message)
    }
    // Fallback: no employees from DB
    return []
  }
  
  load()
    .then(dbEmployees => {
      useEmployeeStore.setState(s => {
        // If DB has employees, merge with SEED_EMPLOYEES (avoid duplicates by id)
        if (dbEmployees.length > 0) {
          console.log(`[EmployeeStore] Loaded ${dbEmployees.length} employees from PostgreSQL`)
          
          // Merge: DB employees + SEED_EMPLOYEES (SEED takes priority for demo data)
          const dbIds = new Set(dbEmployees.map(e => e.id))
          const seedToAdd = SEED_EMPLOYEES.filter(e => !dbIds.has(e.id))
          const allEmployees = [...dbEmployees, ...seedToAdd]
          
          console.log(`[EmployeeStore] Total employees: ${allEmployees.length} (DB: ${dbEmployees.length}, Seed: ${seedToAdd.length})`)
          
          // Update _empId counter based on combined data
          const maxId = allEmployees.reduce((m, e) => Math.max(m, e.id || 0), 0)
          if (maxId >= _empId) _empId = maxId + 1
          
          return { employees: allEmployees }
        }

        // DB empty: use SEED_EMPLOYEES
        console.log('[EmployeeStore] DB empty, using SEED_EMPLOYEES')
        return { employees: SEED_EMPLOYEES }
      })
    })
    .catch(() => { 
      console.warn('[EmployeeStore] Failed to load, keeping seed data')
      useEmployeeStore.setState({ employees: SEED_EMPLOYEES })
      window.__kpbEmployeesLoaded = false 
    })
}
