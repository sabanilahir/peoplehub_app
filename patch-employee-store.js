// Patch script to update employeeStore.js
const fs = require('fs')
const path = 'src/store/employeeStore.js'

let lines = fs.readFileSync(path, 'utf8').split('\n')
let modified = false

// Find the line with "employees: SEED_EMPLOYEES.map"
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('employees: SEED_EMPLOYEES.map')) {
    // Find the comment line above
    let commentLine = i - 1
    while (commentLine >= 0 && !lines[commentLine].includes('// Demo seed')) {
      commentLine--
    }
    
    if (commentLine >= 0) {
      // Replace lines from comment to the closing `})),` with new lines
      const newLines = [
        '  // Default: empty. Data loaded from PostgreSQL via /api/employees.',
        '  // SEED_EMPLOYEES is used as fallback only when DB is unavailable.',
        '  employees: [],'
      ]
      // Remove lines from commentLine to i+5 (end of the map block)
      lines.splice(commentLine, i - commentLine + 6, ...newLines)
      modified = true
      console.log('✅ Found seed employees at line', i, '- patched')
      break
    }
  }
}

if (modified) {
  fs.writeFileSync(path, lines.join('\n'))
  console.log('✅ Patched employeeStore.js - employees now default to empty array')
} else {
  console.log('⚠️  Pattern not found')
}