// Minimal CSV parser — handles quoted fields (with escaped "" and embedded
// commas/newlines) without pulling in a dependency. Good enough for the
// simple flat exports external time-tracking integrations produce.
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      pushField()
    } else if (c === '\r') {
      // skip — \n (or end of text) closes the row
    } else if (c === '\n') {
      pushRow()
    } else {
      field += c
    }
  }
  // Trailing field/row not yet terminated by a newline.
  if (field.length || row.length) pushRow()

  return rows.filter(r => !(r.length === 1 && r[0] === ''))
}

// Rows → objects keyed by normalized header (lowercased, spaces/underscores
// stripped) so "Start Date", "start_date", and "startdate" all resolve the
// same way against whatever header names the integration actually sends.
const normalizeKey = (h) => String(h || '').trim().toLowerCase().replace(/[\s_]+/g, '')

export function csvToObjects(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const headers = rows[0].map(normalizeKey)
  return rows.slice(1)
    .filter(r => r.some(cell => String(cell || '').trim() !== ''))
    .map(r => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
      return obj
    })
}

export function toCsv(rows, columns) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map(c => esc(c.label)).join(',')]
  rows.forEach(row => lines.push(columns.map(c => esc(row[c.key])).join(',')))
  return lines.join('\r\n')
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
