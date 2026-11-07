// ─── Demo seed: 9-Box placements + performance ratings ────────────────────────
// So the Talent Profile, 9-Box matrix and TRM views aren't empty during the
// executive demo. Deterministic (stable across reloads) and internally
// consistent: each employee's performance band matches their 9-Box row and
// their potential matches the column.

// Employees to seed: a slice of the imported population (shown on the first
// Talent Profile pages) plus the curated demo employees.
const SEED_IDS = []
for (let i = 200001; i <= 200150; i++) SEED_IDS.push(i)
;[1, 2, 3, 5, 7, 10, 11, 30, 31, 32, 33, 92, 93, 95, 96].forEach(id => SEED_IDS.push(id))

// The nine boxes as [row, col] with a weight (Core Player heaviest, few
// Underperformers) for a realistic talent distribution.
const BOXES = [
  { rc: [3, 3], w: 3 }, { rc: [3, 2], w: 4 }, { rc: [2, 3], w: 4 },
  { rc: [3, 1], w: 3 }, { rc: [2, 2], w: 6 }, { rc: [1, 3], w: 3 },
  { rc: [2, 1], w: 2 }, { rc: [1, 2], w: 2 }, { rc: [1, 1], w: 1 },
]
const TOTAL_W = BOXES.reduce((a, b) => a + b.w, 0)

// Deterministic PRNG seeded per employee id.
const rng = (seed) => { let x = (seed * 2654435761) % 2147483647; return () => (x = (x * 48271) % 2147483647) / 2147483647 }

const pickBox = (r) => {
  let t = r() * TOTAL_W
  for (const b of BOXES) { t -= b.w; if (t <= 0) return b.rc }
  return BOXES[4].rc
}
const pkFromRow = (row, r) =>
  row === 3 ? 340 + Math.floor(r() * 60) : row === 2 ? 300 + Math.floor(r() * 40) : 250 + Math.floor(r() * 49)
const potFromCol = (col) => (col === 3 ? 'Tinggi' : col === 2 ? 'Sedang' : 'Rendah')

export const PLACEMENTS = {}
export const TRM_RECORDS = {}
for (const id of SEED_IDS) {
  const r = rng(id + 17)
  const [boxRow, boxCol] = pickBox(r)
  PLACEMENTS[id] = { boxRow, boxCol, updatedAt: '2026-01-10' }
  TRM_RECORDS[id] = {
    pkScore: pkFromRow(boxRow, r),
    potential: potFromCol(boxCol),
    fitness: 'Fit',
    status: 'Approved',
    reviewedBy: 'HR Talent Committee',
    meetingDate: '2026-01-10',
    approvedBy: 'CHRO',
    approvedAt: '2026-01-12',
  }
}
