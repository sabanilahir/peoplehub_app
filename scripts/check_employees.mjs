import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const content = fs.readFileSync('temp_user_data.txt', 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  const rawRows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length >= 5 && cols[0] !== 'Name' && !cols[0].includes('/plan')) {
      rawRows.push({
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

  const allDbEmployees = await prisma.employee.findMany({
    select: { id: true, name: true }
  });
  const norm = (str) => (str || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const distinctApp1 = [...new Set(rawRows.map(r => r.app1).filter(Boolean))];
  const distinctApp2 = [...new Set(rawRows.map(r => r.app2).filter(Boolean))];

  console.log('Distinct Approval 1 names:', distinctApp1);
  console.log('Distinct Approval 2 names:', distinctApp2);

  const missingApprovers = [];
  for (const name of [...distinctApp1, ...distinctApp2]) {
    const found = allDbEmployees.find(e => norm(e.name) === norm(name));
    if (!found) {
      // Try partial match
      const partial = allDbEmployees.filter(e => norm(e.name).includes(norm(name)) || norm(name).includes(norm(e.name)));
      missingApprovers.push({ target: name, partial: partial.map(p => p.name) });
    }
  }

  console.log('Missing/Mismatch Approvers:', JSON.stringify(missingApprovers, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
