import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Hierarchy: Enterprise → Division (sub-group) → Company → Business Unit → Department

const SEED_ENTERPRISES = [
  { id:1, code:'ENT001', name:'Nusantara Group', country:'Indonesia', industry:'Diversified', status:'Active' },
]

const SEED_DIVISIONS = [
  { id:1, enterpriseId:1, code:'DIV001', name:'Technology Group',  headName:'', status:'Active' },
  { id:2, enterpriseId:1, code:'DIV002', name:'Operations Group',  headName:'', status:'Active' },
  { id:3, enterpriseId:1, code:'DIV003', name:'Finance Group',     headName:'', status:'Active' },
]

const SEED_COMPANIES = [
  { id:1, divisionId:1, code:'CO001', companyCode:'NTK', name:'PT Nusantara Teknologi', legalEntity:'PT',  country:'Indonesia',  status:'Active', emailDomain:'nusantara-teknologi.com' },
  { id:2, divisionId:3, code:'CO002', companyCode:'NFC', name:'PT Nusantara Finance',   legalEntity:'PT',  country:'Indonesia',  status:'Active', emailDomain:'nusantara-finance.com' },
  { id:3, divisionId:1, code:'CO003', companyCode:'PHL', name:'Philippines, Inc.',       legalEntity:'PMA', country:'Philippines', status:'Active', emailDomain:'philippinesinc.com' },
]

const SEED_BUSINESS_UNITS = [
  { id:1, companyId:1, code:'BU001', name:'Software Engineering',  costCenter:'CC-001', status:'Active' },
  { id:2, companyId:1, code:'BU002', name:'Infrastructure',        costCenter:'CC-002', status:'Active' },
  { id:3, companyId:2, code:'BU003', name:'Accounting',            costCenter:'CC-003', status:'Active' },
  { id:4, companyId:1, code:'BU004', name:'Human Resources',       costCenter:'CC-004', status:'Active' },
  { id:5, companyId:2, code:'BU005', name:'Human Resources',       costCenter:'CC-005', status:'Active' },
  // Philippines, Inc.
  { id:6, companyId:3, code:'BU006', name:'Product Engineering',   costCenter:'CC-006', status:'Active' },
  { id:7, companyId:3, code:'BU007', name:'Quality Assurance',     costCenter:'CC-007', status:'Active' },
  { id:8, companyId:3, code:'BU008', name:'Human Resources',       costCenter:'CC-008', status:'Active' },
]

const SEED_DEPARTMENTS = [
  { id: 1,  businessUnitId: 1, code: 'ADM',  name: 'Administration',      status: 'Active' },
  { id: 2,  businessUnitId: 1, code: 'BM',   name: 'Brand Marketing',     status: 'Active' },
  { id: 3,  businessUnitId: 1, code: 'ECOM', name: 'Ecommerce & Ads',     status: 'Active' },
  { id: 4,  businessUnitId: 1, code: 'FAT',  name: 'FAT',                 status: 'Active' },
  { id: 5,  businessUnitId: 1, code: 'FUL',  name: 'Fullfilment',         status: 'Active' },
  { id: 6,  businessUnitId: 1, code: 'HRGA', name: 'HR/GA',               status: 'Active' },
  { id: 7,  businessUnitId: 1, code: 'LIVE', name: 'Live Streaming',      status: 'Active' },
  { id: 8,  businessUnitId: 1, code: 'PD',   name: 'Product Development', status: 'Active' },
  { id: 9,  businessUnitId: 1, code: 'PUR',  name: 'Purchasing',          status: 'Active' },
  { id: 10, businessUnitId: 1, code: 'SAL',  name: 'Sales Offline',       status: 'Active' },
  { id: 11, businessUnitId: 1, code: 'SC',   name: 'Supplychain',         status: 'Active' },
  { id: 12, businessUnitId: 1, code: 'SUP',  name: 'Support',             status: 'Active' },
  { id: 13, businessUnitId: 1, code: 'ENG',  name: 'Engineering',         status: 'Active' },
  { id: 14, businessUnitId: 1, code: 'IT',   name: 'IT',                  status: 'Active' },
]

// ─── Mercer Position Class (PC) 1–72 ──────────────────────────────────────────
// Rule: higher PC = higher grade, EXCEPT PC 1 = Commissioner (board/governance).
// PC 4 = Intern | PC 5–39 = Individual Contributor | PC 40–52 = Non-Manager
// PC 53–72 = Managerial & Above | PC 1–3 = Board (governance, honorarium-based)
// ──────────────────────────────────────────────────────────────────────────────
const PC_MAP = [
  // PC, label,                          category,         min,         max
  [ 1,  'Commissioner',                  'Board',                0,           0 ],
  [ 2,  'President Commissioner',        'Board',                0,           0 ],
  [ 3,  'Vice Commissioner',             'Board',                0,           0 ],
  [ 4,  'Intern',                        'Intern',         1500000,     2500000 ],
  [ 5,  'Junior Staff I',                'Junior Staff',   3000000,     4000000 ],
  [ 6,  'Junior Staff II',               'Junior Staff',   3300000,     4500000 ],
  [ 7,  'Junior Staff III',              'Junior Staff',   3600000,     5000000 ],
  [ 8,  'Junior Staff IV',               'Junior Staff',   4000000,     5500000 ],
  [ 9,  'Junior Staff V',                'Junior Staff',   4300000,     6000000 ],
  [10,  'Staff I',                       'Staff',          4500000,     6500000 ],
  [11,  'Staff II',                      'Staff',          5000000,     7000000 ],
  [12,  'Staff III',                     'Staff',          5500000,     7500000 ],
  [13,  'Staff IV',                      'Staff',          6000000,     8000000 ],
  [14,  'Staff V',                       'Staff',          6500000,     8500000 ],
  [15,  'Staff VI',                      'Staff',          7000000,     9000000 ],
  [16,  'Staff VII',                     'Staff',          7500000,     9500000 ],
  [17,  'Staff VIII',                    'Staff',          8000000,    10000000 ],
  [18,  'Staff IX',                      'Staff',          8500000,    11000000 ],
  [19,  'Staff X',                       'Staff',          9000000,    12000000 ],
  [20,  'Senior Staff I',                'Senior Staff',   9500000,    13000000 ],
  [21,  'Senior Staff II',               'Senior Staff',  10000000,    14000000 ],
  [22,  'Senior Staff III',              'Senior Staff',  10500000,    15000000 ],
  [23,  'Senior Staff IV',               'Senior Staff',  11000000,    16000000 ],
  [24,  'Senior Staff V',                'Senior Staff',  11500000,    17000000 ],
  [25,  'Senior Staff VI',               'Senior Staff',  12000000,    18000000 ],
  [26,  'Senior Staff VII',              'Senior Staff',  12500000,    19000000 ],
  [27,  'Senior Staff VIII',             'Senior Staff',  13000000,    20000000 ],
  [28,  'Senior Staff IX',               'Senior Staff',  13500000,    21000000 ],
  [29,  'Senior Staff X',                'Senior Staff',  14000000,    22000000 ],
  [30,  'Specialist I',                  'Specialist',    14500000,    22000000 ],
  [31,  'Specialist II',                 'Specialist',    15000000,    23000000 ],
  [32,  'Specialist III',                'Specialist',    15500000,    24000000 ],
  [33,  'Specialist IV',                 'Specialist',    16000000,    25000000 ],
  [34,  'Specialist V',                  'Specialist',    16500000,    26000000 ],
  [35,  'Specialist VI',                 'Specialist',    17000000,    27000000 ],
  [36,  'Specialist VII',                'Specialist',    17500000,    28000000 ],
  [37,  'Specialist VIII',               'Specialist',    18000000,    29000000 ],
  [38,  'Specialist IX',                 'Specialist',    18500000,    30000000 ],
  [39,  'Lead Specialist',               'Specialist',    19000000,    32000000 ],
  [40,  'Supervisor I',                  'Non-Manager',   19500000,    31000000 ],
  [41,  'Supervisor II',                 'Non-Manager',   20000000,    32000000 ],
  [42,  'Supervisor III',                'Non-Manager',   21000000,    33000000 ],
  [43,  'Supervisor IV',                 'Non-Manager',   22000000,    34000000 ],
  [44,  'Supervisor V',                  'Non-Manager',   23000000,    36000000 ],
  [45,  'Senior Supervisor I',           'Non-Manager',   24000000,    37000000 ],
  [46,  'Senior Supervisor II',          'Non-Manager',   25000000,    38000000 ],
  [47,  'Senior Supervisor III',         'Non-Manager',   26000000,    40000000 ],
  [48,  'Senior Supervisor IV',          'Non-Manager',   27000000,    42000000 ],
  [49,  'Senior Supervisor V',           'Non-Manager',   28000000,    44000000 ],
  [50,  'Assistant Manager I',           'Non-Manager',   29000000,    46000000 ],
  [51,  'Assistant Manager II',          'Non-Manager',   30000000,    48000000 ],
  [52,  'Assistant Manager III',         'Non-Manager',   32000000,    50000000 ],
  [53,  'Manager I',                     'Manager',       33000000,    53000000 ],
  [54,  'Manager II',                    'Manager',       35000000,    56000000 ],
  [55,  'Manager III',                   'Manager',       38000000,    60000000 ],
  [56,  'Senior Manager I',              'Senior Manager',42000000,    65000000 ],
  [57,  'Senior Manager II',             'Senior Manager',46000000,    70000000 ],
  [58,  'Senior Manager III',            'Senior Manager',50000000,    78000000 ],
  [59,  'Principal Manager I',           'Senior Manager',55000000,    85000000 ],
  [60,  'Principal Manager II',          'Senior Manager',60000000,    92000000 ],
  [61,  'General Manager I',             'General Manager',65000000,  100000000 ],
  [62,  'General Manager II',            'General Manager',72000000,  115000000 ],
  [63,  'General Manager III',           'General Manager',80000000,  130000000 ],
  [64,  'Vice President I',              'VP',             90000000,  145000000 ],
  [65,  'Vice President II',             'VP',            100000000,  160000000 ],
  [66,  'Vice President III',            'VP',            112000000,  178000000 ],
  [67,  'Senior Vice President I',       'SVP',           125000000,  200000000 ],
  [68,  'Senior Vice President II',      'SVP',           140000000,  225000000 ],
  [69,  'Senior Vice President III',     'SVP',           158000000,  255000000 ],
  [70,  'Executive Vice President I',    'EVP',           175000000,  285000000 ],
  [71,  'Executive Vice President II',   'EVP',           200000000,  325000000 ],
  [72,  'President Director / CEO',      'C-Level',       250000000,  500000000 ],
]

const CATEGORY_COLOR = {
  'Board':           'bg-yellow-100 text-yellow-800',
  'Intern':          'bg-gray-100 text-gray-600',
  'Junior Staff':    'bg-blue-50 text-blue-600',
  'Staff':           'bg-blue-100 text-blue-700',
  'Senior Staff':    'bg-indigo-100 text-indigo-700',
  'Specialist':      'bg-cyan-100 text-cyan-700',
  'Non-Manager':     'bg-teal-100 text-teal-700',
  'Manager':         'bg-red-100 text-red-700',
  'Senior Manager':  'bg-red-200 text-red-800',
  'General Manager': 'bg-orange-100 text-orange-700',
  'VP':              'bg-orange-200 text-orange-800',
  'SVP':             'bg-red-100 text-red-700',
  'EVP':             'bg-red-200 text-red-800',
  'C-Level':         'bg-rose-200 text-rose-900',
}

export const PC_CATEGORY_COLOR = CATEGORY_COLOR

const SEED_GRADES = PC_MAP.map(([pc, label, category, min, max]) => ({
  id:          pc,
  code:        `PC${String(pc).padStart(2,'0')}`,
  pc,
  name:        label,
  category,
  minSalary:   min,
  maxSalary:   max,
  isBoard:     pc <= 3,
  isIntern:    pc === 4,
  isNonMgr:    pc >= 40 && pc <= 52,
  isMgr:       pc >= 53,
}))

const SEED_JOB_FAMILIES = [
  { id:1, code:'JF001', name:'Engineering',       description:'Software & hardware development roles', status:'Active' },
  { id:2, code:'JF002', name:'Finance',           description:'Accounting, treasury, and finance roles', status:'Active' },
  { id:3, code:'JF003', name:'Human Resources',   description:'HR operations and talent management', status:'Active' },
  { id:4, code:'JF004', name:'Information Technology', description:'IT infrastructure and support', status:'Active' },
]

const SEED_POSITIONS = [
  { id:1,  departmentId:1, jobFamilyId:1, gradeId:10, code:'POS001', name:'Junior Software Engineer',      status:'Active' },
  { id:2,  departmentId:1, jobFamilyId:1, gradeId:20, code:'POS002', name:'Software Engineer',             status:'Active' },
  { id:3,  departmentId:1, jobFamilyId:1, gradeId:30, code:'POS003', name:'Senior Software Engineer',      status:'Active' },
  { id:4,  departmentId:1, jobFamilyId:1, gradeId:53, code:'POS004', name:'Engineering Manager',           status:'Active' },
  { id:5,  departmentId:3, jobFamilyId:4, gradeId:15, code:'POS005', name:'IT Support',                    status:'Active' },
  { id:6,  departmentId:4, jobFamilyId:2, gradeId:20, code:'POS006', name:'Finance Analyst',               status:'Active' },
  { id:7,  departmentId:4, jobFamilyId:2, gradeId:54, code:'POS007', name:'Finance Manager',               status:'Active' },
  // Senior / Executive
  { id:8,  departmentId:1, jobFamilyId:1, gradeId:58, code:'POS008', name:'Senior Manager Engineering',    status:'Active' },
  { id:9,  departmentId:2, jobFamilyId:1, gradeId:61, code:'POS009', name:'General Manager Engineering',   status:'Active' },
  { id:10, departmentId:3, jobFamilyId:4, gradeId:61, code:'POS010', name:'General Manager IT',            status:'Active' },
  { id:11, departmentId:2, jobFamilyId:3, gradeId:61, code:'POS011', name:'General Manager HR',            status:'Active' },
  { id:12, departmentId:4, jobFamilyId:2, gradeId:62, code:'POS012', name:'General Manager Finance',       status:'Active' },
  { id:13, departmentId:1, jobFamilyId:1, gradeId:64, code:'POS013', name:'Vice President Engineering',    status:'Active' },
  { id:14, departmentId:2, jobFamilyId:3, gradeId:64, code:'POS014', name:'Vice President Human Resources',status:'Active' },
  { id:15, departmentId:4, jobFamilyId:2, gradeId:65, code:'POS015', name:'Vice President Finance',        status:'Active' },
  { id:16, departmentId:1, jobFamilyId:1, gradeId:67, code:'POS016', name:'Senior Vice President Engineering', status:'Active' },
  { id:17, departmentId:4, jobFamilyId:2, gradeId:67, code:'POS017', name:'Senior Vice President Finance', status:'Active' },
  { id:18, departmentId:1, jobFamilyId:4, gradeId:70, code:'POS018', name:'Chief Technology Officer',      status:'Active' },
  { id:19, departmentId:4, jobFamilyId:2, gradeId:70, code:'POS019', name:'Chief Financial Officer',       status:'Active' },
  { id:20, departmentId:2, jobFamilyId:3, gradeId:71, code:'POS020', name:'Chief Human Resources Officer', status:'Active' },
  { id:21, departmentId:1, jobFamilyId:1, gradeId:72, code:'POS021', name:'President Director / CEO',      status:'Active' },
  // HR positions — NTK (dept 5)
  { id:22, departmentId:5, jobFamilyId:3, gradeId:53, code:'POS022', name:'HR Manager',                    status:'Active' },
  { id:23, departmentId:5, jobFamilyId:3, gradeId:20, code:'POS023', name:'HR Officer',                    status:'Active' },
  // HR positions — NFC (dept 6)
  { id:24, departmentId:6, jobFamilyId:3, gradeId:53, code:'POS024', name:'HR Manager',                    status:'Active' },
  { id:25, departmentId:6, jobFamilyId:3, gradeId:20, code:'POS025', name:'HR Officer',                    status:'Active' },
  // Philippines, Inc. — Product Engineering (dept 7 & 8)
  { id:26, departmentId:7,  jobFamilyId:1, gradeId:10, code:'POS026', name:'Junior Web Developer',          status:'Active' },
  { id:27, departmentId:7,  jobFamilyId:1, gradeId:20, code:'POS027', name:'Web Developer',                 status:'Active' },
  { id:28, departmentId:7,  jobFamilyId:1, gradeId:30, code:'POS028', name:'Senior Web Developer',          status:'Active' },
  { id:29, departmentId:7,  jobFamilyId:1, gradeId:53, code:'POS029', name:'Engineering Manager',           status:'Active' },
  { id:30, departmentId:8,  jobFamilyId:1, gradeId:20, code:'POS030', name:'Mobile Developer',              status:'Active' },
  { id:31, departmentId:8,  jobFamilyId:1, gradeId:30, code:'POS031', name:'Senior Mobile Developer',       status:'Active' },
  // Philippines, Inc. — Quality Assurance (dept 9)
  { id:32, departmentId:9,  jobFamilyId:4, gradeId:15, code:'POS032', name:'QA Engineer',                   status:'Active' },
  { id:33, departmentId:9,  jobFamilyId:4, gradeId:25, code:'POS033', name:'Senior QA Engineer',            status:'Active' },
  { id:34, departmentId:9,  jobFamilyId:4, gradeId:40, code:'POS034', name:'QA Lead',                       status:'Active' },
  // Philippines, Inc. — HR (dept 10)
  { id:35, departmentId:10, jobFamilyId:3, gradeId:53, code:'POS035', name:'HR Manager',                    status:'Active' },
  { id:36, departmentId:10, jobFamilyId:3, gradeId:20, code:'POS036', name:'HR Officer',                    status:'Active' },
  // NTK — mid-level positions (filling Asst Mgr → Supervisor → Jr Staff → Clerk gaps)
  { id:37, departmentId:2,  jobFamilyId:1, gradeId:51, code:'POS037', name:'Associate Engineering Manager',  status:'Active' },
  { id:38, departmentId:2,  jobFamilyId:1, gradeId:46, code:'POS038', name:'Senior Technology Supervisor',   status:'Active' },
  { id:39, departmentId:2,  jobFamilyId:1, gradeId:42, code:'POS039', name:'Technology Supervisor',          status:'Active' },
  { id:40, departmentId:2,  jobFamilyId:1, gradeId:7,  code:'POS040', name:'Junior Software Engineer III',   status:'Active' },
  { id:41, departmentId:3,  jobFamilyId:4, gradeId:5,  code:'POS041', name:'IT Clerk',                       status:'Active' },
  // NFC — full hierarchy positions
  { id:42, departmentId:4,  jobFamilyId:2, gradeId:72, code:'POS042', name:'President Director',             status:'Active' },
  { id:43, departmentId:4,  jobFamilyId:2, gradeId:57, code:'POS043', name:'Senior Finance Manager',         status:'Active' },
  { id:44, departmentId:4,  jobFamilyId:2, gradeId:51, code:'POS044', name:'Finance Associate Manager',      status:'Active' },
  { id:45, departmentId:4,  jobFamilyId:2, gradeId:46, code:'POS045', name:'Senior Finance Officer',         status:'Active' },
  { id:46, departmentId:4,  jobFamilyId:2, gradeId:41, code:'POS046', name:'Finance Officer',                status:'Active' },
  { id:47, departmentId:4,  jobFamilyId:2, gradeId:13, code:'POS047', name:'Finance Staff',                  status:'Active' },
  { id:48, departmentId:4,  jobFamilyId:2, gradeId:7,  code:'POS048', name:'Junior Finance Staff',           status:'Active' },
  // Philippines, Inc. — executive & mid-level positions
  { id:49, departmentId:7,  jobFamilyId:1, gradeId:72, code:'POS049', name:'President Director / CEO',       status:'Active' },
  { id:50, departmentId:7,  jobFamilyId:4, gradeId:70, code:'POS050', name:'Chief Technology Officer',       status:'Active' },
  { id:51, departmentId:10, jobFamilyId:3, gradeId:67, code:'POS051', name:'SVP Human Resources',            status:'Active' },
  { id:52, departmentId:7,  jobFamilyId:1, gradeId:51, code:'POS052', name:'Associate Engineering Manager',  status:'Active' },
  { id:53, departmentId:9,  jobFamilyId:4, gradeId:42, code:'POS053', name:'QA Supervisor',                  status:'Active' },
  { id:54, departmentId:7,  jobFamilyId:1, gradeId:7,  code:'POS054', name:'Junior Staff',                   status:'Active' },
  { id:55, departmentId:8,  jobFamilyId:1, gradeId:5,  code:'POS055', name:'Clerk',                          status:'Active' },
]

// Headcount: named seats directly under a Position, each attached to (at most)
// one employee. e.g. Position "Software Engineer" → "Software Engineer A", "B", …
// supervisorHeadcountId points at the headcount this seat reports to; the
// supervisor's incumbent is derived from that headcount's employeeId.
const SEED_HEADCOUNTS = [
  { id:1, positionId:2, code:'HC001', name:'Software Engineer A',        employeeId:30,   supervisorHeadcountId:7,    status:'Active' },
  { id:2, positionId:2, code:'HC002', name:'Software Engineer B',        employeeId:31,   supervisorHeadcountId:7,    status:'Active' },
  { id:3, positionId:2, code:'HC003', name:'Software Engineer C',        employeeId:33,   supervisorHeadcountId:7,    status:'Active' },
  { id:4, positionId:3, code:'HC004', name:'Senior Software Engineer A', employeeId:32,   supervisorHeadcountId:7,    status:'Active' },
  { id:5, positionId:3, code:'HC005', name:'Senior Software Engineer B', employeeId:null, supervisorHeadcountId:7,    status:'Active' },
  { id:6, positionId:1, code:'HC006', name:'Junior Software Engineer A', employeeId:null, supervisorHeadcountId:4,    status:'Active' },
  { id:7, positionId:4, code:'HC007', name:'Engineering Manager A',      employeeId:92,   supervisorHeadcountId:null, status:'Active' },
]

let _eId=2, _dId=4, _coId=4, _bId=9, _dpId=11, _jfId=5, _posId=56, _gId=73, _hcId=8

export const useStructureStore = create(persist((set) => ({
  enterprises:   SEED_ENTERPRISES.map(x=>({...x})),
  divisions:     SEED_DIVISIONS.map(x=>({...x})),
  companies:     SEED_COMPANIES.map(x=>({...x})),
  businessUnits: SEED_BUSINESS_UNITS.map(x=>({...x})),
  departments:   SEED_DEPARTMENTS.map(x=>({...x})),
  grades:        SEED_GRADES.map(x=>({...x})),
  jobFamilies:   SEED_JOB_FAMILIES.map(x=>({...x})),
  positions:     SEED_POSITIONS.map(x=>({...x})),
  headcounts:    SEED_HEADCOUNTS.map(x=>({...x})),

  addEnterprise:    (d)    => set(s=>({ enterprises:   [...s.enterprises,   { id:_eId++,  ...d }] })),
  updateEnterprise: (id,d) => set(s=>({ enterprises:   s.enterprises.map(x=>x.id===id?{...x,...d}:x) })),
  deleteEnterprise: (id)   => set(s=>({ enterprises:   s.enterprises.filter(x=>x.id!==id) })),

  addDivision:    (d)    => set(s=>({ divisions:     [...s.divisions,     { id:_dId++,  ...d }] })),
  updateDivision: (id,d) => set(s=>({ divisions:     s.divisions.map(x=>x.id===id?{...x,...d}:x) })),
  deleteDivision: (id)   => set(s=>({ divisions:     s.divisions.filter(x=>x.id!==id) })),

  addCompany:    (d)    => set(s=>({ companies:     [...s.companies,     { id:_coId++, ...d }] })),
  updateCompany: (id,d) => set(s=>({ companies:     s.companies.map(x=>x.id===id?{...x,...d}:x) })),
  deleteCompany: (id)   => set(s=>({ companies:     s.companies.filter(x=>x.id!==id) })),

  addBusinessUnit:    (d)    => set(s=>({ businessUnits: [...s.businessUnits, { id:_bId++,  ...d }] })),
  updateBusinessUnit: (id,d) => set(s=>({ businessUnits: s.businessUnits.map(x=>x.id===id?{...x,...d}:x) })),
  deleteBusinessUnit: (id)   => set(s=>({ businessUnits: s.businessUnits.filter(x=>x.id!==id) })),

  addDepartment:    (d)    => set(s=>({ departments:   [...s.departments,   { id:_dpId++, ...d }] })),
  updateDepartment: (id,d) => set(s=>({ departments:   s.departments.map(x=>x.id===id?{...x,...d}:x) })),
  deleteDepartment: (id)   => set(s=>({ departments:   s.departments.filter(x=>x.id!==id) })),

  addGrade:    (d)    => set(s=>({ grades:       [...s.grades,       { id:_gId++,   ...d }] })),
  updateGrade: (id,d) => set(s=>({ grades:       s.grades.map(x=>x.id===id?{...x,...d}:x) })),
  deleteGrade: (id)   => set(s=>({ grades:       s.grades.filter(x=>x.id!==id) })),

  addJobFamily:    (d)    => set(s=>({ jobFamilies:  [...s.jobFamilies,  { id:_jfId++,  ...d }] })),
  updateJobFamily: (id,d) => set(s=>({ jobFamilies:  s.jobFamilies.map(x=>x.id===id?{...x,...d}:x) })),
  deleteJobFamily: (id)   => set(s=>({ jobFamilies:  s.jobFamilies.filter(x=>x.id!==id) })),

  addPosition:    (d)    => set(s=>({ positions:    [...s.positions,    { id:_posId++, ...d }] })),
  updatePosition: (id,d) => set(s=>({ positions:    s.positions.map(x=>x.id===id?{...x,...d}:x) })),
  deletePosition: (id)   => set(s=>({ positions:    s.positions.filter(x=>x.id!==id) })),

  addHeadcount:    (d)    => set(s=>({ headcounts:  [...s.headcounts,   { id:_hcId++, ...d }] })),
  updateHeadcount: (id,d) => set(s=>({ headcounts:  s.headcounts.map(x=>x.id===id?{...x,...d}:x) })),
  deleteHeadcount: (id)   => set(s=>({ headcounts:  s.headcounts.filter(x=>x.id!==id) })),
}), {
  // Headcounts and companies are database-backed — the rest of org structure
  // (departments, positions, …) is re-derived every load from the seed +
  // /api/structure import below. Companies are included because admins edit
  // them directly (e.g. setting an email domain for new-hire auto-generated
  // emails) — the import step below dedupes by id, so re-appending the same
  // imported companies on top of the persisted+edited list is a no-op, not
  // a duplicate.
  name: 'hcm-structure-headcounts-v1',
  storage: createJSONStorage(() => dbStorage),
  partialize: (state) => ({ headcounts: state.headcounts, companies: state.companies }),
}))

// Merge `incoming` items into `existing` — updates existing items if incoming has
// newer data with the same ID, and appends any newly incoming IDs.
const dedupeAppend = (existing, incoming) => {
  const incomingMap = new Map((incoming || []).map(x => [x.id, x]))
  const merged = existing.map(x => incomingMap.has(x.id) ? { ...x, ...incomingMap.get(x.id) } : x)
  const existingIds = new Set(existing.map(x => x.id))
  const newItems = (incoming || []).filter(x => !existingIds.has(x.id))
  return [...merged, ...newItems]
}

// ─── Hydrate imported org structure (from Excel upload) ───────────────────────
// Source priority: DB via /api/structure (when a database is configured & seeded),
// otherwise the static /public JSON. Appended once on the client, non-destructively,
// on top of the demo seed. Grades are kept from the seed (standard Mercer PC map).
if (typeof window !== 'undefined' && !window.__kpbStructureLoaded) {
  window.__kpbStructureLoaded = true
  const load = async () => {
    try { const r = await fetch('/api/structure'); if (r.ok) { const d = await r.json(); if (d && Array.isArray(d.positions) && d.positions.length) return d } } catch {}
    return (await fetch('/data/importedStructure.json')).json()
  }
  // Headcounts are database-backed (see persist() above). Its hydration is a
  // separate async round-trip from the /api/structure fetch below — if this
  // block called setState() before hydration lands, persist would queue a
  // debounced write holding a stale (pre-hydration) headcounts snapshot that
  // later overwrites the real hydrated data once its timer fires. Waiting for
  // hydration FIRST means every setState from here on always carries the
  // correct headcounts, so no write can ever clobber it.
  const waitForHydration = () => new Promise(resolve => {
    if (useStructureStore.persist.hasHydrated()) resolve()
    else useStructureStore.persist.onFinishHydration(resolve)
  })
  Promise.all([load(), waitForHydration()])
    .then(([d]) => {
      useStructureStore.setState(s => ({
        enterprises:   dedupeAppend(s.enterprises,   d.enterprises),
        divisions:     dedupeAppend(s.divisions,     d.divisions),
        companies:     dedupeAppend(s.companies,     d.companies),
        businessUnits: dedupeAppend(s.businessUnits, d.businessUnits),
        departments:   dedupeAppend(s.departments,   d.departments),
        jobFamilies:   dedupeAppend(s.jobFamilies,   d.jobFamilies),
        positions:     dedupeAppend(s.positions,     d.positions),
      }))
      // The import above only ever carries org structure, never headcounts —
      // every imported position starts with zero seats. Seed a few open (no
      // employeeId) seats per company so Job Requisition has something to
      // pick from across the whole company list, not just the demo seed's
      // original NTK/Frontend positions.
      const persisted = useStructureStore.getState().headcounts
      const maxId = persisted.reduce((max, h) => Math.max(max, h.id), 0)
      if (maxId >= _hcId) _hcId = maxId + 1
      backfillVacantHeadcounts()
    })
    .catch(() => { window.__kpbStructureLoaded = false })
}

function backfillVacantHeadcounts() {
  const s = useStructureStore.getState()
  const { companies, businessUnits, departments, positions, headcounts } = s
  const companyIdOf = (pos) => {
    const dept = departments.find(d => d.id === pos.departmentId)
    const bu = businessUnits.find(b => b.id === dept?.businessUnitId)
    return bu?.companyId
  }
  const companyHasVacancy = (companyId) => headcounts.some(h => {
    if (h.status !== 'Active' || h.employeeId) return false
    const pos = positions.find(p => p.id === h.positionId)
    return pos && companyIdOf(pos) === companyId
  })
  let nextId = headcounts.reduce((max, h) => Math.max(max, h.id), 0) + 1
  const newRecords = []
  companies.forEach(c => {
    // Already has at least one open seat (persisted from a prior run, or a
    // real one a user created) — leave it alone.
    if (companyHasVacancy(c.id)) return
    // Up to 3 seats per company, spread across distinct departments so both
    // the company-level and department-level counts show variety.
    const seenDepts = new Set()
    for (const p of positions) {
      if (newRecords.filter(r => r.companyId === c.id).length >= 3) break
      if (p.status !== 'Active' || companyIdOf(p) !== c.id || seenDepts.has(p.departmentId)) continue
      seenDepts.add(p.departmentId)
      newRecords.push({
        companyId: c.id, positionId: p.id, code: `HC${String(nextId).padStart(4, '0')}`,
        name: `${p.name} A`, employeeId: null, supervisorHeadcountId: null, status: 'Active',
        id: nextId++,
      })
    }
  })
  if (newRecords.length) {
    useStructureStore.setState(st => ({
      headcounts: [...st.headcounts, ...newRecords.map(({ companyId, ...r }) => r)],
    }))
  }
}
