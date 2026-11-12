import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// GET: ambil semua menu dari PostgreSQL (bukan dari Zustand!)
export async function GET() {
  try {
    let menus = await prisma.menuItem.findMany({
      orderBy: { order: 'asc' },
    })

    // Auto-seed / Auto-heal jika menu Userlists belum ada di tabel MenuItem
    const hasUserlists = menus.some(m => m.key === 'sysadmin-workflow-userlists')
    if (!hasUserlists && menus.length > 0) {
      const parentWorkflow = menus.find(m => m.key === 'sysadmin-workflow')
      const parentId = parentWorkflow?.id ?? 510

      // Pastikan parent workflow mengizinkan hr_manager, hr, hr_officer
      if (parentWorkflow) {
        try {
          await prisma.menuItem.update({
            where: { id: parentWorkflow.id },
            data: {
              roles: JSON.stringify(['superadmin', 'sysadmin', 'hr_manager', 'hr', 'hr_officer'])
            }
          })
        } catch {}
      }

      // Pastikan urutan analytics dan flowable-settings digeser jika perlu
      try {
        await prisma.menuItem.updateMany({
          where: { key: 'sysadmin-workflow-analytics' },
          data: { order: 5 }
        })
        await prisma.menuItem.updateMany({
          where: { key: 'sysadmin-workflow-settings' },
          data: { order: 6 }
        })
      } catch {}

      // Upsert menu Userlists
      try {
        await prisma.menuItem.upsert({
          where: { key: 'sysadmin-workflow-userlists' },
          create: {
            id: 517,
            key: 'sysadmin-workflow-userlists',
            label: 'Userlists (Grup Penyetuju)',
            icon: 'users',
            href: '/sysadmin/workflow/userlists',
            parentId: parentId,
            roles: JSON.stringify(['superadmin', 'sysadmin', 'hr_manager', 'hr', 'hr_officer']),
            departments: JSON.stringify(['*']),
            order: 4,
            active: true,
          },
          update: {
            label: 'Userlists (Grup Penyetuju)',
            icon: 'users',
            href: '/sysadmin/workflow/userlists',
            parentId: parentId,
            roles: JSON.stringify(['superadmin', 'sysadmin', 'hr_manager', 'hr', 'hr_officer']),
            departments: JSON.stringify(['*']),
            order: 4,
            active: true,
          }
        })
      } catch {}

      // Reload menus
      menus = await prisma.menuItem.findMany({
        orderBy: { order: 'asc' },
      })
    }

    // Auto-seed / Auto-heal jika menu Kalkulator Payroll HO belum ada di tabel MenuItem
    const hasHoCalculator = menus.some(m => m.key === 'hr-payroll-ho-calculator')
    if (!hasHoCalculator && menus.length > 0) {
      const parentPayroll = menus.find(m => m.key === 'hr-payroll')
      const parentId = parentPayroll?.id ?? 305

      // Pastikan parent payroll mengarah ke /hr/payroll/ho-calculator
      if (parentPayroll) {
        try {
          await prisma.menuItem.update({
            where: { id: parentPayroll.id },
            data: { href: '/hr/payroll/ho-calculator' }
          })
        } catch {}
      }

      // Geser urutan odoo-sync ke 2 dan setup ke 3
      try {
        await prisma.menuItem.updateMany({
          where: { key: 'hr-payroll-odoo-sync' },
          data: { order: 2 }
        })
        await prisma.menuItem.updateMany({
          where: { key: 'hr-payroll-setup' },
          data: { order: 3 }
        })
      } catch {}

      // Upsert menu Kalkulator Payroll HO
      try {
        await prisma.menuItem.upsert({
          where: { key: 'hr-payroll-ho-calculator' },
          create: {
            id: 3050,
            key: 'hr-payroll-ho-calculator',
            label: 'Kalkulator Payroll HO',
            icon: 'calculator',
            href: '/hr/payroll/ho-calculator',
            parentId: parentId,
            roles: JSON.stringify(['hr', 'hr_manager', 'superadmin']),
            departments: JSON.stringify(['*']),
            order: 1,
            active: true,
          },
          update: {
            label: 'Kalkulator Payroll HO',
            icon: 'calculator',
            href: '/hr/payroll/ho-calculator',
            parentId: parentId,
            roles: JSON.stringify(['hr', 'hr_manager', 'superadmin']),
            departments: JSON.stringify(['*']),
            order: 1,
            active: true,
          }
        })
      } catch {}

      // Reload menus
      menus = await prisma.menuItem.findMany({
        orderBy: { order: 'asc' },
      })
    }

    // Auto-seed / Auto-heal jika menu Leave Report belum ada di tabel MenuItem
    const hasLeaveReport = menus.some(m => m.key === 'hr-leave-report')
    if (!hasLeaveReport && menus.length > 0) {
      const parentHR = menus.find(m => m.key === 'hr')
      const parentId = parentHR?.id ?? 30
      try {
        await prisma.menuItem.upsert({
          where: { key: 'hr-leave-report' },
          create: {
            id: 313,
            key: 'hr-leave-report',
            label: 'Leave Report',
            icon: 'chart',
            href: '/hr/leave-report',
            parentId: parentId,
            roles: JSON.stringify(['superadmin', 'admin', 'hr', 'hr_manager', 'hr_officer']),
            departments: JSON.stringify(['*']),
            order: 4,
            active: true,
          },
          update: {
            label: 'Leave Report',
            icon: 'chart',
            href: '/hr/leave-report',
            parentId: parentId,
            roles: JSON.stringify(['superadmin', 'admin', 'hr', 'hr_manager', 'hr_officer']),
            departments: JSON.stringify(['*']),
            order: 4,
            active: true,
          }
        })
      } catch {}

      menus = await prisma.menuItem.findMany({
        orderBy: { order: 'asc' },
      })
    }

    return Response.json(menus)
  } catch {
    return dbDown()
  }
}

// POST: buat satu menu baru di DB
export async function POST(req) {
  try {
    const body = await req.json()
    const parentId = body.parentId ? parseInt(body.parentId) : null
    const created = await prisma.menuItem.create({
      data: {
        key:      body.key,
        label:    body.label,
        icon:     body.icon     ?? null,
        href:     body.href     ?? null,
        parentId: parentId,
        roles:    typeof body.roles === 'string' ? body.roles : JSON.stringify(body.roles || ['*']),
        departments: typeof body.departments === 'string' ? body.departments : JSON.stringify(body.departments || ['*']),
        order:    Number(body.order) || 0,
        active:   body.active   ?? true,
      },
    })
    return Response.json(created, { status: 201 })
  } catch {
    return dbDown()
  }
}

// PUT: update semua menu sekaligus (bulk upsert — dipakai Menu Management page)
export async function PUT(req) {
  try {
    const { menus } = await req.json()
    // Jalankan semua upsert dalam satu transaction
    await prisma.$transaction(
      menus.map((m) => {
        const parentId = m.parentId ? parseInt(m.parentId) : null
        return prisma.menuItem.upsert({
          where:  { key: m.key },
          create: {
            key: m.key, label: m.label, icon: m.icon ?? null,
            href: m.href ?? null, parentId: parentId,
            roles: typeof m.roles === 'string' ? m.roles : JSON.stringify(m.roles || ['*']),
            departments: typeof m.departments === 'string' ? m.departments : JSON.stringify(m.departments || ['*']),
            order: Number(m.order) || 0, active: m.active ?? true,
          },
          update: {
            label: m.label, icon: m.icon ?? null, href: m.href ?? null,
            parentId: parentId,
            roles: typeof m.roles === 'string' ? m.roles : JSON.stringify(m.roles || ['*']),
            departments: typeof m.departments === 'string' ? m.departments : JSON.stringify(m.departments || ['*']),
            order: Number(m.order) || 0, active: m.active ?? true,
          },
        })
      })
    )
    return Response.json({ success: true })
  } catch {
    return dbDown()
  }
}
