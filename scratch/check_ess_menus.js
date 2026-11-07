const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEssMenus() {
  const essMenus = await prisma.menuItem.findMany({
    where: {
      OR: [
        { key: { startsWith: 'ess' } },
        { parentId: 10 }
      ]
    },
    orderBy: { order: 'asc' }
  });
  console.log("Current ESS menus in DB:");
  essMenus.forEach(m => console.log(`- [${m.id}] ${m.key} | Label: "${m.label}" | Href: "${m.href}" | Roles: ${m.roles}`));
}

checkEssMenus().catch(console.error).finally(() => prisma.$disconnect());
