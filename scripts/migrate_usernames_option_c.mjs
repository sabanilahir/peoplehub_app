import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function formatUsername(name) {
  if (!name) return 'user';
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'user';
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first}.${last}`;
}

async function main() {
  console.log('--- Migrasi Username Karyawan ke Format Opsi C (namadepan.belakang) ---');
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
  });

  const protectedUsernames = new Set(['admin', 'hr', 'manager', 'employee']);
  const generated = new Set(protectedUsernames);

  let updatedCount = 0;

  for (const u of users) {
    if (protectedUsernames.has(u.username)) {
      continue;
    }

    const base = formatUsername(u.name);
    let finalUsername = base;
    let count = 1;

    while (generated.has(finalUsername)) {
      count++;
      finalUsername = `${base}${count}`;
    }
    generated.add(finalUsername);

    if (u.username !== finalUsername) {
      await prisma.user.update({
        where: { id: u.id },
        data: { username: finalUsername },
      });
      console.log(`[ID ${u.id}] ${u.name.padEnd(28)} : ${(u.username || '').padEnd(10)} -> ${finalUsername}`);
      updatedCount++;
    }
  }

  console.log(`\nSelesai! Sebanyak ${updatedCount} user berhasil diperbarui.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

