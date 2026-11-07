import { create }                from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage }              from '@/lib/dbStorage'
import { generateSteps }         from '@/store/workflowStore'

const SEED_LEAVE_TYPES = [
  { id: 1, name: 'Cuti Tahunan',    maxDays: 12, active: true },
  { id: 2, name: 'Cuti Sakit',      maxDays: 14, active: true },
  { id: 3, name: 'Cuti Menikah',    maxDays:  3, active: true },
  { id: 4, name: 'Cuti Melahirkan', maxDays: 90, active: true },
]

// Default approval steps for Apply Leave workflow
const DEFAULT_STEPS = () => [
  { level: 1, type: 'supervisor', label: 'Direct Supervisor', approverId: null, approverName: null, status: 'Pending', actedAt: null, note: '' },
]

const SEED_LEAVES = [
  { id: 1, userId: 1, name: 'Budi Santoso', submittedBy: 1, submittedByName: 'Budi Santoso',
    submittedAt: '2025-01-03T08:00:00+07:00', workflowName: 'Apply Leave',
    type: 'Cuti Tahunan', start: '2025-01-06', end: '2025-01-08', note: 'Liburan keluarga', status: 'Approved',
    steps: [
      { level:1, type:'supervisor', label:'Direct Supervisor', approverId:2, approverName:'Dewi Rahayu', status:'Approved', actedAt:'2025-01-03T09:15:00+07:00', note:'' },
    ]},
  { id: 2, userId: 5, name: 'Sari Indah', submittedBy: 5, submittedByName: 'Sari Indah',
    submittedAt: '2025-02-10T07:30:00+07:00', workflowName: 'Apply Leave',
    type: 'Cuti Sakit', start: '2025-02-10', end: '2025-02-11', note: 'Demam', status: 'Approved',
    steps: [
      { level:1, type:'supervisor', label:'Direct Supervisor', approverId:4, approverName:'Ahmad Fauzi', status:'Approved', actedAt:'2025-02-10T08:05:00+07:00', note:'Semoga cepat sembuh' },
    ]},
  { id: 3, userId: 1, name: 'Budi Santoso', submittedBy: 1, submittedByName: 'Budi Santoso',
    submittedAt: '2025-06-01T10:00:00+07:00', workflowName: 'Apply Leave',
    type: 'Cuti Tahunan', start: '2025-06-02', end: '2025-06-04', note: '', status: 'Pending',
    steps: [
      { level:1, type:'supervisor', label:'Direct Supervisor', approverId:null, approverName:null, status:'Pending', actedAt:null, note:'' },
    ]},
  { id: 4, userId: 13, name: 'Desi Kurniawati', submittedBy: 12, submittedByName: 'Bagas Pratiwi',
    submittedAt: '2025-06-10T09:05:00+07:00', workflowName: 'Apply Leave (HR)',
    type: 'Cuti Tahunan', start: '2025-06-16', end: '2025-06-17', note: 'Urusan keluarga', status: 'Pending',
    steps: [
      { level:1, type:'supervisor', label:'Direct Supervisor', approverId:null, approverName:null, status:'Pending', actedAt:null, note:'' },
    ]},
  { id: 5, userId: 14, name: 'Faisal Rahman', submittedBy: 13, submittedByName: 'Desi Kurniawati',
    submittedAt: '2025-06-05T07:45:00+07:00', workflowName: 'Apply Leave (HR)',
    type: 'Cuti Sakit', start: '2025-06-05', end: '2025-06-05', note: 'Sakit kepala', status: 'Pending',
    steps: [
      { level:1, type:'supervisor', label:'Direct Supervisor', approverId:null, approverName:null, status:'Pending', actedAt:null, note:'' },
    ]},
]

let _id = 6

// Derive overall status from steps
function deriveStatus(steps) {
  if (steps.some(s => s.status === 'Rejected')) return 'Rejected'
  if (steps.every(s => s.status === 'Approved')) return 'Approved'
  return 'Pending'
}

export const useLeaveStore = create(persist((set, get) => ({
  leaves:     SEED_LEAVES.map(l => ({ ...l, steps: l.steps.map(s=>({...s})) })),
  leaveTypes: SEED_LEAVE_TYPES.map(t => ({ ...t })),

  // pageLevels: levels array from workflowStore.getLevelsForPage(pageName)
  // data.submittedBy / data.submittedByName: the actual user who pressed submit (may differ from userId when HR submits on behalf)
  submitLeave: (data, pageLevels = null) =>
    set((s) => ({
      leaves: [...s.leaves, {
        id: _id++,
        status: 'Pending',
        submittedAt:     new Date().toISOString(),
        submittedBy:     data.submittedBy     ?? data.userId,
        submittedByName: data.submittedByName ?? data.name,
        steps: pageLevels?.length ? generateSteps(pageLevels) : DEFAULT_STEPS(),
        ...data,
      }],
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)),
    })),

  // Approve a specific step
  approveStep: (leaveId, level, approverId, approverName, note = '') =>
    set((s) => ({
      leaves: s.leaves.map(l => {
        if (l.id !== leaveId) return l
        const steps = l.steps.map(step => {
          if (step.level !== level) return step
          return { ...step, status: 'Approved', approverId, approverName, actedAt: new Date().toISOString(), note }
        })
        // Activate next step if current approved
        const nextStep = steps.find(s => s.level === level + 1)
        if (nextStep && nextStep.status === 'Waiting') {
          const idx = steps.findIndex(s => s.level === level + 1)
          steps[idx] = { ...steps[idx], status: 'Pending' }
        }
        return { ...l, steps, status: deriveStatus(steps) }
      })
    })),

  // Withdraw — only allowed when no step has been acted on yet
  withdrawLeave: (leaveId) =>
    set((s) => ({
      leaves: s.leaves.map(l => {
        if (l.id !== leaveId) return l
        const anyActed = (l.steps || []).some(s => s.status === 'Approved' || s.status === 'Rejected')
        if (anyActed) return l
        return { ...l, status: 'Withdrawn', steps: (l.steps || []).map(s => ({ ...s, status: 'Withdrawn' })) }
      })
    })),

  // Reject a specific step
  rejectStep: (leaveId, level, approverId, approverName, note = '') =>
    set((s) => ({
      leaves: s.leaves.map(l => {
        if (l.id !== leaveId) return l
        const steps = l.steps.map(step => {
          if (step.level !== level) return step
          return { ...step, status: 'Rejected', approverId, approverName, actedAt: new Date().toISOString(), note }
        })
        return { ...l, steps, status: 'Rejected' }
      })
    })),

  // Delegate a pending step to another user
  delegateStep: (leaveId, level, toUserId, toUserName) =>
    set((s) => ({
      leaves: s.leaves.map(l => {
        if (l.id !== leaveId) return l
        return {
          ...l,
          steps: l.steps.map(step => {
            if (step.level !== level) return step
            return { ...step, delegatedTo: toUserId, delegatedToName: toUserName }
          }),
        }
      })
    })),
}), { name: 'hcm-leave-v1', storage: createJSONStorage(() => dbStorage) }))
