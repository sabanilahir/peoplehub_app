// prisma/seed.js
// Initializes the database from the committed data files in public/data/.
// Idempotent: uses createMany({ skipDuplicates }) so re-running won't duplicate.
//
//   1. Provide a Postgres connection string in .env  (DATABASE_URL=...)
//   2. npx prisma migrate deploy   (or: npx prisma db push)
//   3. npx prisma db seed
//
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const dataDir = path.join(__dirname, "..", "public", "data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf-8"));

// ─── DATA MENU ────────────────────────────────────────────────────────────────
const DEFAULT_MENUS = [
  {
    id: 1,
    key: "dashboard",
    label: "Dashboard",
    icon: "home",
    href: "/dashboard",
    roles: '["*"]',
    order: 1,
    active: true,
  },
  {
    id: 10,
    key: "ess",
    label: "ESS",
    icon: "user",
    roles: '["*"]',
    order: 2,
    active: true,
  },
  {
    id: 101,
    key: "ess-profile",
    label: "My Profile",
    icon: "user",
    href: "/ess/profile",
    parentId: 10,
    roles: '["*"]',
    order: 1,
    active: true,
  },
  {
    id: 102,
    key: "ess-onboarding",
    label: "My Onboarding",
    icon: "clipboard",
    href: "/ess/onboarding",
    parentId: 10,
    roles: '["*"]',
    order: 2,
    active: true,
  },
  {
    id: 103,
    key: "ess-clock",
    label: "Clock In/Out",
    icon: "clock",
    href: "/ess/clock",
    parentId: 10,
    roles: '["*"]',
    order: 3,
    active: true,
  },
  {
    id: 104,
    key: "ess-calendar",
    label: "My Calendar",
    icon: "calendar",
    href: "/ess/calendar",
    parentId: 10,
    roles: '["*"]',
    order: 4,
    active: true,
  },
  {
    id: 105,
    key: "ess-attendance",
    label: "My Attendance",
    icon: "calendar",
    href: "/ess/attendance",
    parentId: 10,
    roles: '["*"]',
    order: 5,
    active: true,
  },
  {
    id: 106,
    key: "ess-leave",
    label: "Apply Leave",
    icon: "calendar",
    href: "/ess/apply-leave",
    parentId: 10,
    roles: '["*"]',
    order: 6,
    active: true,
  },
  {
    id: 107,
    key: "ess-leave-balance",
    label: "Leave Balance",
    icon: "calendar",
    href: "/ess/leave-balance",
    parentId: 10,
    roles: '["*"]',
    order: 7,
    active: true,
  },
  {
    id: 108,
    key: "ess-payslip",
    label: "Payslip",
    icon: "dollar",
    href: "/ess/payslip",
    parentId: 10,
    roles: '["*"]',
    order: 8,
    active: true,
  },
  {
    id: 20,
    key: "lms",
    label: "Learning",
    icon: "book",
    roles: '["*"]',
    order: 3,
    active: true,
  },
  {
    id: 201,
    key: "lms-dashboard",
    label: "Dashboard",
    icon: "book",
    href: "/ess/learning/dashboard",
    parentId: 20,
    roles: '["*"]',
    order: 1,
    active: true,
  },
  {
    id: 202,
    key: "lms-catalog",
    label: "Course Catalog",
    icon: "book",
    href: "/ess/learning/catalog",
    parentId: 20,
    roles: '["*"]',
    order: 2,
    active: true,
  },
  {
    id: 203,
    key: "lms-courses",
    label: "My Courses",
    icon: "book",
    href: "/ess/learning/my-courses",
    parentId: 20,
    roles: '["*"]',
    order: 3,
    active: true,
  },
  {
    id: 204,
    key: "lms-certificates",
    label: "My Certificates",
    icon: "award",
    href: "/ess/learning/certificates",
    parentId: 20,
    roles: '["*"]',
    order: 4,
    active: true,
  },
  {
    id: 205,
    key: "lms-leaderboard",
    label: "Leaderboard",
    icon: "trophy",
    href: "/ess/learning/leaderboard",
    parentId: 20,
    roles: '["*"]',
    order: 5,
    active: true,
  },
  {
    id: 30,
    key: "hr",
    label: "HR",
    icon: "users",
    roles: '["hr","hr_officer","hr_manager","superadmin"]',
    order: 4,
    active: true,
  },
  {
    id: 301,
    key: "hr-employee",
    label: "Employee Data",
    icon: "users",
    href: "/hr/employee",
    parentId: 30,
    roles: '["hr","hr_officer","hr_manager","superadmin"]',
    order: 1,
    active: true,
  },
  {
    id: 302,
    key: "hr-leave",
    label: "Leave Management",
    icon: "calendar",
    href: "/hr/absence/leave",
    parentId: 30,
    roles: '["hr","hr_officer","hr_manager","superadmin"]',
    order: 2,
    active: true,
  },
  {
    id: 303,
    key: "hr-recruitment",
    label: "Recruitment",
    icon: "userCheck",
    href: "/hr/recruitment/job-requisition",
    parentId: 30,
    roles: '["hr","hr_manager","superadmin"]',
    order: 3,
    active: true,
  },
  {
    id: 304,
    key: "hr-onboarding",
    label: "Onboarding",
    icon: "clipboard",
    href: "/hr/onboarding/tracker",
    parentId: 30,
    roles: '["hr","hr_manager","superadmin"]',
    order: 4,
    active: true,
  },
  {
    id: 305,
    key: "hr-payroll",
    label: "Payroll",
    icon: "dollar",
    href: "/hr/payroll",
    parentId: 30,
    roles: '["hr","hr_manager","superadmin"]',
    order: 5,
    active: true,
  },
  {
    id: 306,
    key: "hr-performance",
    label: "Performance",
    icon: "trending",
    href: "/hr/performance",
    parentId: 30,
    roles: '["hr","hr_manager","superadmin"]',
    order: 6,
    active: true,
  },
  {
    id: 307,
    key: "hr-talent",
    label: "Talent",
    icon: "star",
    href: "/hr/talent",
    parentId: 30,
    roles: '["hr","hr_manager","superadmin"]',
    order: 7,
    active: true,
  },
  {
    id: 308,
    key: "hr-org-chart",
    label: "Org Chart",
    icon: "building",
    href: "/hr/org-chart",
    parentId: 30,
    roles: '["*"]',
    order: 8,
    active: true,
  },
  {
    id: 40,
    key: "mss",
    label: "MSS",
    icon: "briefcase",
    roles: '["manager","hr_manager","superadmin"]',
    order: 5,
    active: true,
  },
  {
    id: 401,
    key: "mss-attendance",
    label: "Team Attendance",
    icon: "calendar",
    href: "/mss/team-attendance",
    parentId: 40,
    roles: '["manager","hr_manager"]',
    order: 1,
    active: true,
  },
  {
    id: 402,
    key: "mss-leave",
    label: "Approve Leave",
    icon: "calendar",
    href: "/mss/approve-leave",
    parentId: 40,
    roles: '["manager","hr_manager"]',
    order: 2,
    active: true,
  },
  {
    id: 403,
    key: "mss-performance",
    label: "Performance",
    icon: "trending",
    href: "/mss/performance",
    parentId: 40,
    roles: '["manager","hr_manager"]',
    order: 3,
    active: true,
  },
  {
    id: 404,
    key: "mss-talent",
    label: "Talent Review",
    icon: "star",
    href: "/mss/talent",
    parentId: 40,
    roles: '["manager","hr_manager"]',
    order: 4,
    active: true,
  },
  {
    id: 50,
    key: "sysadmin",
    label: "System",
    icon: "settings",
    roles: '["superadmin"]',
    order: 6,
    active: true,
  },
  {
    id: 501,
    key: "sysadmin-users",
    label: "User Management",
    icon: "users",
    href: "/sysadmin/users",
    parentId: 50,
    roles: '["superadmin"]',
    order: 1,
    active: true,
  },
  {
    id: 508,
    key: "sysadmin-odoo",
    label: "Odoo API",
    icon: "link",
    href: "/sysadmin/users/odoo-api",
    parentId: 50,
    roles: '["superadmin"]',
    order: 2,
    active: true,
  },
  {
    id: 502,
    key: "sysadmin-role",
    label: "Role",
    icon: "shield",
    href: "/sysadmin/role",
    parentId: 50,
    roles: '["superadmin"]',
    order: 3,
    active: true,
  },
  {
    id: 503,
    key: "sysadmin-permission",
    label: "Permission",
    icon: "key",
    href: "/sysadmin/role/permission",
    parentId: 50,
    roles: '["superadmin"]',
    order: 4,
    active: true,
  },
  {
    id: 504,
    key: "sysadmin-menus",
    label: "Menu Management",
    icon: "settings",
    href: "/sysadmin/menus",
    parentId: 50,
    roles: '["superadmin"]',
    order: 5,
    active: true,
  },
  {
    id: 505,
    key: "sysadmin-leave-workflow",
    label: "Leave Workflow",
    icon: "clipboard",
    href: "/sysadmin/leave-workflow",
    parentId: 50,
    roles: '["superadmin"]',
    order: 6,
    active: true,
  },
  {
    id: 506,
    key: "sysadmin-settings",
    label: "Settings",
    icon: "settings",
    href: "/sysadmin/settings/master-lookup",
    parentId: 50,
    roles: '["superadmin"]',
    order: 7,
    active: true,
  },
  {
    id: 507,
    key: "sysadmin-branding",
    label: "Branding",
    icon: "building",
    href: "/sysadmin/branding/company-logo",
    parentId: 50,
    roles: '["superadmin"]',
    order: 8,
    active: true,
  },

  // Workflow Engine (Flowable + BPMN.js) - Sysadmin
  {
    id: 510,
    key: "sysadmin-workflow",
    label: "Workflow Engine",
    icon: "gitbranch",
    roles: '["superadmin","sysadmin"]',
    order: 9,
    active: true,
  },
  {
    id: 511,
    key: "sysadmin-workflow-main",
    label: "Workflow Menu",
    icon: "gitbranch",
    href: "/sysadmin/workflow",
    parentId: 510,
    roles: '["superadmin","sysadmin"]',
    order: 1,
    active: true,
  },
  {
    id: 512,
    key: "sysadmin-workflow-designer",
    label: "BPMN Designer",
    icon: "palette",
    href: "/sysadmin/workflow/designer",
    parentId: 510,
    roles: '["superadmin","sysadmin"]',
    order: 2,
    active: true,
  },
  {
    id: 513,
    key: "sysadmin-workflow-definitions",
    label: "Definitions",
    icon: "clipboard",
    href: "/sysadmin/workflow/definitions",
    parentId: 510,
    roles: '["superadmin","sysadmin"]',
    order: 3,
    active: true,
  },
  {
    id: 515,
    key: "sysadmin-workflow-analytics",
    label: "Workflow Analytics",
    icon: "trending",
    href: "/sysadmin/workflow/analytics",
    parentId: 510,
    roles: '["superadmin","sysadmin"]',
    order: 4,
    active: true,
  },
  {
    id: 514,
    key: "sysadmin-workflow-settings",
    label: "Flowable Settings",
    icon: "settings",
    href: "/sysadmin/workflow/flowable-settings",
    parentId: 510,
    roles: '["superadmin","sysadmin"]',
    order: 5,
    active: true,
  },

  // User Workflow
  {
    id: 900,
    key: "user-workflow",
    label: "Workflow",
    icon: "gitbranch",
    roles: '["*"]',
    order: 10,
    active: true,
  },
  {
    id: 901,
    key: "user-workflow-tasks",
    label: "Task Inbox",
    icon: "tasks",
    href: "/workflow/tasks",
    parentId: 900,
    roles: '["*"]',
    order: 1,
    active: true,
  },
  {
    id: 902,
    key: "user-workflow-my",
    label: "My Requests",
    icon: "clipboard",
    href: "/workflow/my-requests",
    parentId: 900,
    roles: '["*"]',
    order: 2,
    active: true,
  },
  {
    id: 903,
    key: "user-workflow-history",
    label: "History",
    icon: "clock",
    href: "/workflow/history",
    parentId: 900,
    roles: '["*"]',
    order: 3,
    active: true,
  },
  {
    id: 904,
    key: "user-workflow-analytics",
    label: "Workflow Analytics",
    icon: "trending",
    href: "/sysadmin/workflow/analytics",
    parentId: 900,
    roles: '["*"]',
    order: 4,
    active: true,
  },
];
const DEFAULT_BRANDING = [
  { key: "companyName", value: "Rans PeopleHub", type: "text" },
  { key: "iconColor", value: "#052B52", type: "text" },
  { key: "footerText", value: "© 2026 Rans PeopleHub", type: "text" },
  { key: "topbarLogo", value: "", type: "image" },
  { key: "loginLogo", value: "", type: "image" },
  { key: "favicon", value: "", type: "image" },
];

const DEFAULT_PERMISSIONS = [
  // ESS Permissions
  { key: "ess_profile_view", name: "View Profile", module: "ess" },
  { key: "ess_profile_edit", name: "Edit Profile", module: "ess" },
  { key: "ess_attendance_view", name: "View Attendance", module: "ess" },
  { key: "ess_attendance_clock", name: "Clock In/Out", module: "ess" },
  { key: "ess_leave_apply", name: "Apply Leave", module: "ess" },
  { key: "ess_leave_view", name: "View Leave Balance", module: "ess" },
  { key: "ess_payslip_view", name: "View Payslip", module: "ess" },
  { key: "ess_onboarding_view", name: "View Onboarding", module: "ess" },
  // HR Permissions
  { key: "hr_employee_view", name: "View Employees", module: "hr" },
  { key: "hr_employee_create", name: "Create Employee", module: "hr" },
  { key: "hr_employee_edit", name: "Edit Employee", module: "hr" },
  { key: "hr_employee_delete", name: "Delete Employee", module: "hr" },
  { key: "hr_leave_approve", name: "Approve Leave", module: "hr" },
  { key: "hr_leave_view", name: "View Leave Requests", module: "hr" },
  { key: "hr_recruitment_view", name: "View Recruitment", module: "hr" },
  {
    key: "hr_recruitment_create",
    name: "Create Job Requisition",
    module: "hr",
  },
  { key: "hr_recruitment_approve", name: "Approve Recruitment", module: "hr" },
  { key: "hr_onboarding_view", name: "View Onboarding", module: "hr" },
  { key: "hr_payroll_view", name: "View Payroll", module: "hr" },
  { key: "hr_payroll_process", name: "Process Payroll", module: "hr" },
  { key: "hr_performance_view", name: "View Performance", module: "hr" },
  { key: "hr_talent_view", name: "View Talent", module: "hr" },
  { key: "hr_org_chart_view", name: "View Org Chart", module: "hr" },
  // MSS Permissions
  { key: "mss_leave_approve", name: "Approve Team Leave", module: "mss" },
  { key: "mss_attendance_view", name: "View Team Attendance", module: "mss" },
  { key: "mss_performance_view", name: "View Team Performance", module: "mss" },
  { key: "mss_talent_view", name: "View Team Talent", module: "mss" },
  // Learning Permissions
  { key: "lms_course_view", name: "View Course Catalog", module: "lms" },
  { key: "lms_enroll", name: "Enroll Course", module: "lms" },
  { key: "lms_certificate_view", name: "View Certificate", module: "lms" },
  // System Permissions
  { key: "sys_user_view", name: "View Users", module: "system" },
  { key: "sys_user_create", name: "Create User", module: "system" },
  { key: "sys_user_edit", name: "Edit User", module: "system" },
  { key: "sys_role_view", name: "View Roles", module: "system" },
  { key: "sys_role_create", name: "Create Role", module: "system" },
  { key: "sys_permission_view", name: "View Permissions", module: "system" },
  { key: "sys_menu_view", name: "View Menu Management", module: "system" },
  { key: "sys_menu_edit", name: "Edit Menu", module: "system" },
  { key: "sys_branding_view", name: "View Branding", module: "system" },
  { key: "sys_branding_edit", name: "Edit Branding", module: "system" },
];

const DEFAULT_ROLES = [
  { name: "superadmin", label: "Superadmin", color: "#dc2626" },
  { name: "hr_manager", label: "HR Manager", color: "#2563eb" },
  { name: "hr", label: "HR Staff", color: "#7c3aed" },
  { name: "hr_officer", label: "HR Officer", color: "#0891b2" },
  { name: "manager", label: "Manager", color: "#059669" },
  { name: "employee", label: "Employee", color: "#d97706" },
];

async function batch(model, rows, label) {
  const SIZE = 1000;
  let count = 0;
  for (let i = 0; i < rows.length; i += SIZE) {
    const res = await model.createMany({
      data: rows.slice(i, i + SIZE),
      skipDuplicates: true,
    });
    count += res.count;
  }
  console.log(`   ${label.padEnd(14)} ${count}/${rows.length}`);
}

async function main() {
  console.log("🌱 Seeding database from public/data/ …");

  const structure = read("importedStructure.json");
  const grades = read("grades.json");
  const employees = read("importedEmployees.json");
  const users = read("importedUsers.json");

  // ── Org structure (parents → children) ──────────────────────────────────────
  await batch(prisma.enterprise, structure.enterprises, "enterprises");
  await batch(prisma.division, structure.divisions, "divisions");
  await batch(prisma.company, structure.companies, "companies");
  await batch(prisma.businessUnit, structure.businessUnits, "businessUnits");
  await batch(prisma.department, structure.departments, "departments");
  await batch(prisma.jobFamily, structure.jobFamilies, "jobFamilies");
  await batch(prisma.grade, grades, "grades");
  await batch(prisma.position, structure.positions, "positions");

  // ── Employees (nested arrays in the JSON are not part of the schema → dropped) ─
  const empRows = employees.map((e) => ({
    id: e.id,
    nik: String(e.nik || ""),
    name: e.name || "",
    status: e.status || "Active",
    companyId: e.companyId ?? null,
    divisionId: e.divisionId ?? null,
    businessUnitId: e.businessUnitId ?? null,
    departmentId: e.departmentId ?? null,
    positionId: e.positionId ?? null,
    gradeId: e.gradeId ?? null,
    managerId: e.managerId ?? null,
    employmentType: e.employmentType || "",
    role: e.role || "employee",
    joinDate: e.joinDate || "",
    endDate: e.endDate || "",
    gender: e.gender || "",
    birthPlace: e.birthPlace || "",
    birthDate: e.birthDate || "",
    nationality: e.nationality || "",
    religion: e.religion || "",
    maritalStatus: e.maritalStatus || "",
    ktp: e.ktp || "",
    phone: e.phone || "",
    email: e.email || "",
    personalEmail: e.personalEmail || "",
    address: e.address || "",
    city: e.city || "",
    province: e.province || "",
    country: e.country || "",
    location: e.location || "",
  }));
  await batch(prisma.employee, empRows, "employees");

  // ── Login accounts (username = NIK, password = pass123) ──────────────────────
  const userRows = users.map((u) => ({
    id: u.id,
    username: String(u.username),
    password: u.password || "pass123",
    name: u.name || "",
    role: u.role || "employee",
    dept: u.dept || "",
    position: u.position || "",
    email: u.email || "",
    employeeId: u.employeeId ?? null,
  }));
  await batch(prisma.user, userRows, "users");

  // ── Menus ──────────────────────────────────────────────────────────────────
  // Data hierarki harus di-insert satu per satu secara berurutan (Sequential)
  // agar parent menu dibuat lebih dulu sebelum child menu, mencegah error P2003 (Foreign Key Constraint).
  let menuCount = 0;
  for (const menu of DEFAULT_MENUS) {
    await prisma.menuItem.upsert({
      where: { key: menu.key },
      update: menu, // Update data jika key sudah ada
      create: menu, // Buat baru jika key belum ada
    });
    menuCount++;
  }
  console.log(`   menus          ${menuCount}/${DEFAULT_MENUS.length}`);
  let brandingCount = 0;
  for (const b of DEFAULT_BRANDING) {
    await prisma.branding.upsert({
      where: { key: b.key },
      update: b,
      create: b,
    });
    brandingCount++;
  }
  console.log(`   branding        ${brandingCount}/${DEFAULT_BRANDING.length}`);

  let permCount = 0;
  for (const p of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: p,
      create: p,
    });
    permCount++;
  }
  console.log(`   permissions     ${permCount}/${DEFAULT_PERMISSIONS.length}`);

  let roleCount = 0;
  for (const r of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: r,
      create: r,
    });
    roleCount++;
  }
  console.log(`   roles          ${roleCount}/${DEFAULT_ROLES.length}`);

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
