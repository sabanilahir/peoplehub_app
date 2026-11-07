// ── Auto-Assign Onboarding engine ─────────────────────────────────────────────
// Single source of truth for rule-based onboarding assignment.
// Caller passes the employee list to avoid circular imports with employeeStore.
import { useMasterOnboardingStore } from './masterOnboardingStore'
import { useOnboardingStore, onboardingApprovalSteps } from './onboardingStore'
import { useOnboardingRulesStore }  from './onboardingRulesStore'
import { useStructureStore }        from './structureStore'
import { frequencyDays }            from '@/utils/reviewCadence'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

const addRuntime = (item, joinDate) => {
  let date = ''
  if (joinDate && item.dueDate != null && item.dueDate !== '') {
    const d = new Date(joinDate)
    d.setDate(d.getDate() + Number(item.dueDate))
    date = d.toISOString().slice(0, 10)
  }
  return { ...item, id: uid(), date, completed: false }
}

// Periodic Review items carry a cadence — stamp the first due date from the
// employee's join date so recurring reviews (weekly/monthly/custom) have a
// concrete next-review anchor. One-time reviews keep their dueDate-based date.
const addReviewRuntime = (item, joinDate) => {
  const runtime = addRuntime(item, joinDate)
  const days = frequencyDays(item)
  if (joinDate && days > 0) {
    const d = new Date(joinDate)
    d.setDate(d.getDate() + days)
    runtime.nextReviewDate = d.toISOString().slice(0, 10)
  }
  return runtime
}

const BLANK_BUDDY = {
  buddyEmpId: '', buddyName: '', buddyPosition: '',
  programDuration: '', programDurationUnit: 'Bulan',
  programStartDate: '', programEndDate: '', hrbpNotes: '',
}

// ── Does a rule match this employee? ──────────────────────────────────────────
export function ruleMatchesEmployee(rule, emp) {
  if (!rule?.active) return false
  const c = rule.criteria ?? {}
  if (c.employmentTypes?.length && !c.employmentTypes.includes(emp.employmentType)) return false
  if (c.companyIds?.length      && !c.companyIds.includes(emp.companyId))           return false
  if (c.departmentIds?.length   && !c.departmentIds.includes(emp.departmentId))     return false
  if (c.positionIds?.length     && !c.positionIds.includes(emp.positionId))         return false
  return true
}

// ── Build a section from a template ───────────────────────────────────────────
function buildSection(tpl, type, fbItems, fbSecs, joinDate) {
  if (!tpl) return null
  const ms = (tpl.mainSections ?? []).find(s => s.type === type)
  if (ms) return {
    ...ms,
    id: `ms_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    sections: (ms.sections ?? []).map(s => ({ ...s })),
    items: (ms.items ?? []).map(item => addRuntime(item, joinDate)),
  }
  const items = (tpl[fbItems] ?? []).map(item => addRuntime(item, joinDate))
  const secs  = (tpl[fbSecs]  ?? []).map(s => ({ ...s }))
  if (!items.length && !secs.length) return null
  return { id: `ms_${type}_${Date.now()}`, type, sections: secs, items }
}

// ── Build onboarding record from a rule for one employee ──────────────────────
export function buildOnboardingFromRule(rule, emp, employees) {
  const { templates }           = useMasterOnboardingStore.getState()
  const { positions, departments } = useStructureStore.getState()

  const findTpl = (id) => id ? templates.find(t => String(t.id) === String(id)) : null
  const tplG = findTpl(rule.tplGeneral)
  const tplT = findTpl(rule.tplTeknis)
  const tplR = findTpl(rule.tplReview)

  const supervisor = (employees ?? []).find(e => e.id === emp.managerId)
  const dept       = departments.find(d => d.id === emp.departmentId)

  const joinDate = emp.joinDate ? String(emp.joinDate).slice(0, 10) : undefined

  const mainSections = [
    buildSection(tplG, 'Onboarding General', 'generalItems', 'generalSections', joinDate),
    buildSection(tplT, 'Onboarding Teknis',  'technicalItems', 'technicalSections', joinDate),
  ].filter(Boolean)

  const rawReview = tplR ? (tplR.reviewItems ?? []).map(item => addReviewRuntime(item, joinDate)) : []
  const reviewItems = rawReview.length > 0
    ? rawReview.map(item => item.isDirectManager
        ? { ...item, reviewerEmpId: String(supervisor?.id ?? ''), reviewerName: supervisor?.name ?? 'Direct Manager', reviewerPosition: '' }
        : item)
    : null

  return {
    employeeId:         emp.id,
    employeeName:       emp.name,
    department:         dept?.name ?? '',
    supervisorName:     supervisor?.name ?? '',
    supervisorPosition: positions.find(p => p.id === supervisor?.positionId)?.name ?? '',
    employmentStatus:   'New Hire',
    probationPeriod:    '3',
    mainSections,
    reviewItems,
    hasilInductionChecked: false,
    buddyAssignment: {
      ...BLANK_BUDDY,
      programStartDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : '',
    },
    // Consistent governance: auto-assigned onboarding goes through the SAME
    // supervisor approval as a manually-created one, so every new hire's plan
    // gets a sign-off regardless of how the record was created. It lands in
    // Pending (awaiting the direct supervisor) — auto-assign removes HR's manual
    // authoring work, not the atasan's approval.
    workflowStatus: 'Pending',
    steps:           onboardingApprovalSteps(),
    submittedAt:     new Date().toISOString(),
    submittedBy:     null,
    submittedByName: 'System (Auto-Assign)',
    createdVia:  `rule:${rule.id}`,
    ruleId:      rule.id,
    ruleName:    rule.name,
    // Template versioning — record which templates were used
    templateGeneralId:   tplG?.id   ?? null,
    templateGeneralName: tplG?.name ?? '',
    templateTekniId:     tplT?.id   ?? null,
    templateTekniName:   tplT?.name ?? '',
    templateReviewId:    tplR?.id   ?? null,
    templateReviewName:  tplR?.name ?? '',
  }
}

// ── Assign onboarding for a single new employee using active rules (idempotent) ─
// Returns 1 if a record was created, 0 otherwise.
export function autoAssignOnboardingForEmployee(emp, employees) {
  if (!emp) return 0
  const { onboardings, addOnboarding } = useOnboardingStore.getState()
  const { rules }                      = useOnboardingRulesStore.getState()

  // Skip employees who already have an onboarding record
  if (onboardings.some(o => Number(o.employeeId) === Number(emp.id))) return 0

  // First active rule that matches wins (rule order = priority)
  const rule = rules.find(r => ruleMatchesEmployee(r, emp))
  if (!rule) return 0

  addOnboarding(buildOnboardingFromRule(rule, emp, employees))
  return 1
}

// ── Backfill: scan all active employees and assign any that were missed ────────
export function reconcileAutoAssign(employees) {
  let count = 0
  ;(employees ?? []).forEach(emp => {
    if (emp.status === 'Active') count += autoAssignOnboardingForEmployee(emp, employees)
  })
  return count
}

// ── Legacy: template-level match check (kept for backward compat) ─────────────
export function templateMatchesEmployee(tpl, emp) {
  if (!tpl?.active || !tpl?.autoAssign) return false
  const c = tpl.criteria ?? {}
  const etOk   = !c.employmentTypes?.length || c.employmentTypes.includes(emp.employmentType)
  const deptOk = !c.departmentIds?.length   || c.departmentIds.includes(emp.departmentId)
  const compOk = !c.companyIds?.length      || c.companyIds.includes(emp.companyId)
  const posOk  = !c.positionIds?.length     || c.positionIds.includes(emp.positionId)
  return etOk && deptOk && compOk && posOk
}

// ── Legacy: build from a master template directly ────────────────────────────
export function buildOnboardingFromTemplate(tpl, emp, employees) {
  const { positions, departments } = useStructureStore.getState()
  const supervisor = (employees ?? []).find(e => e.id === emp.managerId)
  const dept       = departments.find(d => d.id === emp.departmentId)

  const joinDate = emp.joinDate ? String(emp.joinDate).slice(0, 10) : undefined

  let mainSections = (tpl.mainSections ?? [])
    .filter(ms => ms.type)
    .map(ms => ({
      ...ms,
      id:       `ms_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      sections: (ms.sections ?? []).map(s => ({ ...s })),
      items:    (ms.items    ?? []).map(item => addRuntime(item, joinDate)),
    }))

  if (mainSections.length === 0) {
    const genSec   = (tpl.generalSections   ?? []).map(s => ({ ...s }))
    const genItem  = (tpl.generalItems      ?? []).map(item => addRuntime(item, joinDate))
    const techSec  = (tpl.technicalSections ?? []).map(s => ({ ...s }))
    const techItem = (tpl.technicalItems    ?? []).map(item => addRuntime(item, joinDate))
    if (genItem.length || genSec.length)
      mainSections.push({ id: `ms_gen_${Date.now()}`,  type: 'Onboarding General', sections: genSec,  items: genItem  })
    if (techItem.length || techSec.length)
      mainSections.push({ id: `ms_tech_${Date.now()}`, type: 'Onboarding Teknis',  sections: techSec, items: techItem })
  }

  const rawReview   = (tpl.reviewItems ?? []).map(item => addReviewRuntime(item, joinDate))
  const reviewItems = rawReview.length > 0
    ? rawReview.map(item => item.isDirectManager
        ? { ...item, reviewerEmpId: String(supervisor?.id ?? ''), reviewerName: supervisor?.name ?? 'Direct Manager', reviewerPosition: '' }
        : item)
    : null

  return {
    employeeId:         emp.id,
    employeeName:       emp.name,
    department:         dept?.name ?? '',
    supervisorName:     supervisor?.name ?? '',
    supervisorPosition: positions.find(p => p.id === supervisor?.positionId)?.name ?? '',
    employmentStatus:   'New Hire',
    probationPeriod:    '3',
    mainSections,
    reviewItems,
    hasilInductionChecked: false,
    buddyAssignment: {
      ...BLANK_BUDDY,
      programStartDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : '',
    },
    workflowStatus: 'Preparation',
    steps: [],
    submittedAt: null,
    submittedBy: null,
    submittedByName: null,
    createdVia: 'auto-assign',
    templateId: tpl.id,
    templateName: tpl.name,
  }
}
