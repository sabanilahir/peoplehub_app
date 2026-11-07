import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ── Level type → human label ──────────────────────────────────────────────────
export const LEVEL_LABEL = {
  supervisor:          'Direct Supervisor',
  indirect_sup:        'Indirect Supervisor',
  supervisor_pc53:     'Supervisor (PC 53+)',
  indirect_sup_pc53:   'Indirect Supervisor (PC 53+)',
  auto_approved:       'Auto Approved',
  role:                (lv) => lv.roles?.length ? lv.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' / ') : 'Role',
  position:            'Position',
  company:             'Company',
  pc:                  (lv) => `PC ${lv.pcFrom ?? ''}–${lv.pcTo ?? ''}`,
  department:          'Department',
  employee:            (lv) => lv.empMode === 'userlist' ? 'Userlist' : 'Employee',
  userlist:            'Userlist',
}

export function getLevelLabel(lv) {
  const v = LEVEL_LABEL[lv.type]
  if (typeof v === 'function') return v(lv)
  return v ?? lv.type
}

// ── Generate steps array from workflow levels ─────────────────────────────────
export function generateSteps(levels = []) {
  const steps = []
  levels.forEach((lv, idx) => {
    steps.push({
      level:        idx + 1,
      type:         lv.type,
      label:        getLevelLabel(lv),
      approverId:   null,
      approverName: null,
      status:       idx === 0 ? 'Pending' : 'Waiting',
      actedAt:      null,
      note:         '',
      // Extra metadata for resolving expected approvers at display time
      roles:        lv.roles        ?? [],
      userlistId:   lv.userlistId   ?? null,
      employeeIds:  lv.employeeIds  ?? [],
    })
  })
  return steps
}

// ── Seed: same as WorkflowSettings INITIAL_WORKFLOWS ─────────────────────────
const mkLv = (type, patch = {}) => ({ id: Math.random(), type, required: false, roles: [], positionIds: [], companyIds: [], pcFrom: '', pcTo: '', departmentIds: [], empMode: 'manual', employeeIds: [], userlistId: null, ...patch })
const mkRow = (levels) => ({ id: Math.random(), description: '', conditions: [], levels })

const INITIAL_WORKFLOWS = [
  {
    id: 1, name: 'Apply Leave',           icon: '📅', active: true,
    notifications: [], elseRow: null,
    submitters: [ mkRow([ mkLv('supervisor'), mkLv('indirect_sup') ]) ],
  },
  {
    id: 2, name: 'Apply Leave (My Team)', icon: '👥', active: true,
    notifications: [], elseRow: null,
    submitters: [ mkRow([ mkLv('supervisor') ]) ],
  },
  {
    id: 3, name: 'Apply Leave (HR)',      icon: '🗂️', active: true,
    notifications: [], elseRow: null,
    submitters: [ mkRow([ mkLv('supervisor') ]) ],
  },
  {
    id: 4, name: 'Approve Leave',         icon: '✅', active: true,
    notifications: [], elseRow: null,
    submitters: [ mkRow([ mkLv('supervisor') ]) ],
  },
  {
    id: 5, name: 'Employee Onboarding',    icon: '🎯', active: true,
    notifications: [], elseRow: null,
    submitters: [ mkRow([ mkLv('role', { roles: ['hr', 'superadmin'] }) ]) ],
  },
]

export const useWorkflowStore = create(
  persist(
    (set, get) => ({
      workflows: INITIAL_WORKFLOWS,

      updateWorkflow: (id, patch) =>
        set(s => ({ workflows: s.workflows.map(w => w.id === id ? { ...w, ...patch } : w) })),

      addWorkflow: (wf) =>
        set(s => ({ workflows: [...s.workflows, wf] })),

      deleteWorkflow: (id) =>
        set(s => ({ workflows: s.workflows.filter(w => w.id !== id) })),

      // Returns the first matching submitter row's levels for a given page name
      getLevelsForPage: (pageName) => {
        const wf = get().workflows.find(w => w.name === pageName && w.active)
        if (!wf) return []
        const row = wf.submitters?.[0]
        return row?.levels ?? []
      },
    }),
    { name: 'hcm-workflows', storage: createJSONStorage(() => dbStorage) }
  )
)
