import assert from 'assert'

// Replicating the exact functions from src/store/announcementStore.js
function interpolateAnnouncement(text, userContext = {}) {
  if (!text || typeof text !== 'string') return text || ''
  const name = userContext.name || userContext.user?.name || 'Karyawan'
  const dept = userContext.dept || userContext.user?.dept || 'Umum'
  const location = userContext.locationName || userContext.location || 'Kantor'
  const role = userContext.role || userContext.user?.role || 'Staff'

  const d = new Date()
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const todayStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`

  return text
    .replace(/\{name\}|\{\{name\}\}/gi, name)
    .replace(/\{dept\}|\{\{dept\}\}/gi, dept)
    .replace(/\{location\}|\{\{location\}\}/gi, location)
    .replace(/\{role\}|\{\{role\}\}/gi, role)
    .replace(/\{today\}|\{\{today\}\}|\{date\}|\{\{date\}\}/gi, todayStr)
}

function isLive(a, on = '2026-11-19') {
  if (!a || !a.active) return false
  if (a.startDate && a.startDate > on) return false
  if (a.endDate && a.endDate < on) return false
  return true
}

function isLiveForUser(a, userContext = {}, on = '2026-11-19') {
  if (!isLive(a, on)) return false
  if (!userContext || Object.keys(userContext).length === 0) return true

  const userRole = String(userContext.role || userContext.user?.role || '').toLowerCase()
  const userDept = String(userContext.dept || userContext.user?.dept || '').toLowerCase()
  const userLoc = String(userContext.location || userContext.workLocationCode || '').toLowerCase()

  const targetRoles = Array.isArray(a.targetRoles) && a.targetRoles.length > 0 ? a.targetRoles : ['*']
  if (!targetRoles.includes('*')) {
    const matchedRole = targetRoles.some((r) => r.toLowerCase() === userRole)
    if (!matchedRole) return false
  }

  const targetDepts = Array.isArray(a.targetDepartments) && a.targetDepartments.length > 0 ? a.targetDepartments : ['*']
  if (!targetDepts.includes('*')) {
    const matchedDept = targetDepts.some((d) => {
      const cleanD = d.toLowerCase()
      return userDept.includes(cleanD) || cleanD.includes(userDept)
    })
    if (!matchedDept) return false
  }

  const targetLocs = Array.isArray(a.targetLocations) && a.targetLocations.length > 0 ? a.targetLocations : ['*']
  if (!targetLocs.includes('*')) {
    const matchedLoc = targetLocs.some((l) => l.toLowerCase() === userLoc)
    if (!matchedLoc) return false
  }

  return true
}

console.log('Testing Announcement Parameterization Logic...')

// 1. Test Interpolation
const userContextBudi = {
  name: 'Budi Santoso',
  dept: 'Gudang',
  location: 'gudang',
  locationName: 'Gudang (Warehouse)',
  role: 'employee',
}

const template1 = 'Halo {name}, mohon perhatikan jam kerja di unit {dept} area {location}!'
const result1 = interpolateAnnouncement(template1, userContextBudi)
console.log('Interpolation Result:', result1)
assert(result1.includes('Budi Santoso'), 'Should contain name')
assert(result1.includes('Gudang'), 'Should contain dept')
assert(result1.includes('Gudang (Warehouse)'), 'Should contain location')

// 2. Test Audience Targeting - Department
const annGudang = {
  active: true,
  targetRoles: ['*'],
  targetDepartments: ['Gudang'],
  targetLocations: ['*'],
}
const annHR = {
  active: true,
  targetRoles: ['*'],
  targetDepartments: ['HR'],
  targetLocations: ['*'],
}

assert.strictEqual(isLiveForUser(annGudang, userContextBudi), true, 'Budi in Gudang should see Gudang announcement')
assert.strictEqual(isLiveForUser(annHR, userContextBudi), false, 'Budi in Gudang should NOT see HR announcement')

// 3. Test Audience Targeting - Role
const annManagerOnly = {
  active: true,
  targetRoles: ['manager', 'hr_manager'],
  targetDepartments: ['*'],
  targetLocations: ['*'],
}
assert.strictEqual(isLiveForUser(annManagerOnly, userContextBudi), false, 'Employee should NOT see manager-only announcement')
assert.strictEqual(isLiveForUser(annManagerOnly, { role: 'manager' }), true, 'Manager should see manager-only announcement')

// 4. Test Audience Targeting - Location
const annLivestreamOnly = {
  active: true,
  targetRoles: ['*'],
  targetDepartments: ['*'],
  targetLocations: ['livestream'],
}
assert.strictEqual(isLiveForUser(annLivestreamOnly, userContextBudi), false, 'Budi at Gudang should NOT see Livestream-only announcement')
assert.strictEqual(isLiveForUser(annLivestreamOnly, { location: 'livestream' }), true, 'User at Livestream should see it')

// 5. Test Global Announcement (*)
const annGlobal = {
  active: true,
  targetRoles: ['*'],
  targetDepartments: ['*'],
  targetLocations: ['*'],
}
assert.strictEqual(isLiveForUser(annGlobal, userContextBudi), true, 'Everyone should see global announcement')

console.log('All 5 Unit Tests Passed Successfully!')
