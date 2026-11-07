import { NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"

// GET: Sync Departments from Odoo to PostgreSQL
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const odooUrl = searchParams.get("odooUrl")
    const odooDb = searchParams.get("odooDb")
    const odooUser = searchParams.get("odooUser")
    const odooApiKey = searchParams.get("odooApiKey")
    
    if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 })
    }

    const baseUrl = odooUrl.replace(/\/$/, "").replace(/\/odoo$/, "")
    const jsonRpcUrl = `${baseUrl}/jsonrpc`

    // Authenticate
    const authResponse = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { service: "common", method: "authenticate", args: [odooDb, odooUser, odooApiKey, {}] },
        id: 1
      })
    })

    if (!authResponse.ok) {
      return NextResponse.json({ success: false, error: `Auth HTTP ${authResponse.status}` }, { status: 502 })
    }

    const authData = await authResponse.json()
    if (!authData.result) {
      return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 401 })
    }

    const uid = authData.result

    // Fetch all Departments
    const deptResponse = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [odooDb, uid, odooApiKey, "hr.department", "search_read",
            [[]],
            { fields: ["id", "name", "parent_id", "manager_id", "active"], limit: 500 }
          ]
        },
        id: 2
      })
    })

    if (!deptResponse.ok) {
      return NextResponse.json({ success: false, error: `Department fetch HTTP ${deptResponse.status}` }, { status: 502 })
    }

    const deptData = await deptResponse.json()
    const odooDepts = deptData.result || []

    let created = 0, updated = 0

    for (const dept of odooDepts) {
      const existing = await prisma.department.findFirst({ where: { odoo_id: String(dept.id) } })
      
      const deptData = {
        odoo_id: String(dept.id),
        name: dept.name || "",
        status: dept.active !== false ? "Active" : "Inactive",
        last_sync_at: new Date(),
      }
      
      if (existing) {
        await prisma.department.update({ where: { id: existing.id }, data: deptData })
        updated++
      } else {
        await prisma.department.create({ data: deptData })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Departments: ${created} created, ${updated} updated`,
      data: { created, updated, total: odooDepts.length }
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}