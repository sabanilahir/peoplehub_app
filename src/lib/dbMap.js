// Maps a loose client object to the columns each Prisma model accepts.
// Int fields coerce '' / null / undefined → null; strings → String.

const EMP_INT = ['companyId', 'divisionId', 'businessUnitId', 'departmentId',
  'positionId', 'gradeId', 'managerId', 'approver1Id', 'approver2Id', 'salary']
const EMP_STR = ['nik', 'name', 'status', 'employmentType', 'role', 'joinDate', 'endDate',
  'gender', 'birthPlace', 'birthDate', 'nationality', 'religion', 'maritalStatus', 'ktp',
  'phone', 'email', 'personalEmail', 'address', 'city', 'province', 'country', 'location',
  'odooWorkLocationId', 'workLocationCode',
  'dept', 'position', 'jobPosition', 'jobTitle']
const EMP_JSON = ['approvalMatrix']

const USER_INT = ['employeeId', 'salary']
const USER_STR = ['username', 'password', 'name', 'role', 'dept', 'position', 'email']

function pick(body, ints, strs, withId, jsons = []) {
  const out = {}
  if (withId && body.id != null) out.id = Number(body.id)
  for (const k of ints) if (k in body) out[k] = (body[k] === '' || body[k] == null) ? null : Number(body[k])
  for (const k of strs) if (k in body) out[k] = body[k] == null ? '' : String(body[k])
  for (const k of jsons) if (k in body) out[k] = body[k] == null ? null : body[k]
  return out
}

export const pickEmployee = (body, opts = {}) => pick(body, EMP_INT, EMP_STR, opts.withId, EMP_JSON)
export const pickUser     = (body, opts = {}) => pick(body, USER_INT, USER_STR, opts.withId)

// ─── Onboarding templates ─────────────────────────────────────────────────────
// JSON-shaped fields are serialized to strings for the String columns; booleans
// pass through. Only keys present on `body` are written (supports partial PUT).
const TMPL_JSON = ['mainSections', 'reviewItems', 'criteria']

export function pickOnboardingTemplate(body, opts = {}) {
  const out = {}
  if (opts.withId && body.id != null) out.id = Number(body.id)
  if ('name' in body)       out.name       = body.name == null ? '' : String(body.name)
  if ('active' in body)     out.active     = !!body.active
  if ('autoAssign' in body) out.autoAssign = !!body.autoAssign
  for (const k of TMPL_JSON) {
    if (k in body) out[k] = body[k] == null ? null : JSON.stringify(body[k])
  }
  return out
}

// Parse a DB row back into the client shape (JSON strings → objects/arrays).
export function fromOnboardingTemplate(row) {
  const parse = (v, fb) => { try { return v == null ? fb : JSON.parse(v) } catch { return fb } }
  return {
    ...row,
    mainSections: parse(row.mainSections, []),
    reviewItems:  row.reviewItems == null ? null : parse(row.reviewItems, null),
    criteria:     parse(row.criteria, {}),
  }
}
