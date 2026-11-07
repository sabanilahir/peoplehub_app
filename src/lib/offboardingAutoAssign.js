// ── Auto-Assign Offboarding engine ───────────────────────────────────────────
// Single source of truth for rule-based offboarding checklist assignment.
// When a resignation (PA Terminate) is approved, the matching rule's template is
// distributed to the employee automatically — no manual HR step — while still
// giving each employee the template that fits their situation (see
// offboardingRulesStore). Callers pass the PA list to resolve the Last Working
// Day; deadlines are computed from it at distribution time.
import { useOffboardingRulesStore }     from '@/store/offboardingRulesStore'
import { useOffboardingTemplateStore }  from '@/store/offboardingTemplateStore'
import { useOffboardingChecklistStore } from '@/store/offboardingChecklistStore'
import { getTerminatePA, lwdOf }        from '@/lib/offboarding'

// ── Does a rule match this employee? ──────────────────────────────────────────
// Empty criteria arrays mean "any"; a rule matches only when every present
// criterion matches. Mirrors ruleMatchesEmployee in onboardingAutoAssign.js.
export function offboardingRuleMatches(rule, emp) {
  if (!rule?.active || !emp) return false
  const c = rule.criteria ?? {}
  if (c.employmentTypes?.length && !c.employmentTypes.includes(emp.employmentType)) return false
  if (c.departmentIds?.length   && !c.departmentIds.includes(emp.departmentId))     return false
  if (c.positionIds?.length     && !c.positionIds.includes(emp.positionId))         return false
  return true
}

// Resolve the template for an employee: first matching active rule wins (list
// order = priority). When no rule matches, returns { tpl: null } — nothing is
// assigned and HR distributes a template manually via the checklist page.
export function resolveOffboardingTemplate(emp) {
  const { rules }                  = useOffboardingRulesStore.getState()
  const { templates, getTemplate } = useOffboardingTemplateStore.getState()

  const rule = (rules || []).find(r => offboardingRuleMatches(r, emp))
  if (!rule) return { tpl: null, rule: null }
  const tpl = getTemplate(rule.templateId) || (templates || []).find(t => String(t.id) === String(rule.templateId))
  return { tpl: tpl || null, rule }
}

// ── Assign the offboarding checklist for one approved employee (idempotent) ────
// Returns { assigned, templateName, ruleName, reason }:
//   assigned=true  → a checklist was distributed from the matching rule
//   assigned=false → reason is 'exists' (already has a checklist) or 'no-rule'
//                    (no active rule matched, so HR distributes manually).
export function autoAssignOffboardingForEmployee(emp, pas) {
  if (!emp) return { assigned: false, reason: 'no-emp' }
  const { items, applyTemplateToEmployee } = useOffboardingChecklistStore.getState()

  // Skip employees who already have a checklist — never overwrite existing
  // progress (HR may have hand-tuned it, or it was seeded earlier).
  if ((items || []).some(i => String(i.employeeId) === String(emp.id))) {
    return { assigned: false, reason: 'exists' }
  }

  const { tpl, rule } = resolveOffboardingTemplate(emp)
  if (!tpl || !tpl.activities?.length) return { assigned: false, reason: 'no-rule' }

  const lwd = lwdOf(getTerminatePA(pas, emp.id, ['Approved', 'Applied']))
  applyTemplateToEmployee(emp.id, tpl.activities, lwd, { replace: true, templateId: tpl.id, templateName: tpl.name })
  return { assigned: true, templateName: tpl.name, ruleName: rule?.name || '' }
}
