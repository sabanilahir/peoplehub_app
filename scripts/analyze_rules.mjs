import fs from 'fs';

const content = fs.readFileSync('temp_user_data.txt', 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t');
  if (cols.length >= 5 && cols[0] !== 'Name' && !cols[0].includes('/plan')) {
    rows.push({
      name: cols[0].trim(),
      level: cols[1]?.trim() || '',
      dept: cols[2]?.trim() || '',
      job: cols[3]?.trim() || '',
      manager: cols[4]?.trim() || '',
      app1: cols[5]?.trim() || '',
      app2: cols[6]?.trim() || ''
    });
  }
}

// 1. Group by Department + Job Position
const deptJobMap = new Map();
for (const r of rows) {
  const key = `${r.dept} ::: ${r.job} ::: ${r.level}`;
  if (!deptJobMap.has(key)) {
    deptJobMap.set(key, { count: 0, app1: new Set(), app2: new Set(), managers: new Set() });
  }
  const item = deptJobMap.get(key);
  item.count++;
  item.app1.add(r.app1);
  if (r.app2) item.app2.add(r.app2);
  item.managers.add(r.manager);
}

console.log('--- RULES SUMMARY ---');
for (const [k, v] of deptJobMap.entries()) {
  const [dept, job, level] = k.split(' ::: ');
  const a1 = Array.from(v.app1).join(', ');
  const a2 = Array.from(v.app2).join(', ') || '(None / 1-Tier)';
  console.log(`[Dept: ${dept}] [Level: ${level}] [Job: ${job}] (${v.count} emps) -> App1: [${a1}] | App2: [${a2}]`);
}

