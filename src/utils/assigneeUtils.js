export function assigneeLabel(val, employees = []) {
  if (!val || val === 'self' || val === 'employee') return 'Self'
  if (val === 'manager') return 'Manager Langsung'
  if (val === 'hr') return 'HR / Admin'
  if (val === 'assessor') return 'Assessor'
  if (val.startsWith('emp:')) {
    const emp = employees.find(e => e.id === Number(val.slice(4)))
    return emp ? emp.name : val
  }
  return val
}

export function assigneeBadgeCls(val) {
  if (!val || val === 'self' || val === 'employee') return 'bg-green-50 text-green-700 border-green-200'
  if (val === 'manager') return 'bg-purple-50 text-purple-700 border-purple-200'
  if (val === 'hr') return 'bg-cyan-50 text-cyan-700 border-cyan-200'
  if (val === 'assessor') return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  return 'bg-orange-50 text-orange-700 border-orange-200'
}
