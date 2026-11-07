import { NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"

// GET: Sync Jobs/Positions from Odoo to PostgreSQL
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

    // Fetch all Jobs
    const jobResponse = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [odooDb, uid, odooApiKey, "hr.job", "search_read",
            [[]],
            { fields: ["id", "name", "department_id", "state"], limit: 500 }
          ]
        },
        id: 2
      })
    })

    if (!jobResponse.ok) {
      return NextResponse.json({ success: false, error: `Job fetch HTTP ${jobResponse.status}` }, { status: 502 })
    }

    const jobData = await jobResponse.json()
    const odooJobs = jobData.result || []

    let created = 0, updated = 0

    for (const job of odooJobs) {
      const existing = await prisma.position.findFirst({ where: { odoo_id: String(job.id) } })
      
      const jobData = {
        odoo_id: String(job.id),
        name: job.name || "",
        status: job.state !== "closed" ? "Active" : "Inactive",
        last_sync_at: new Date(),
      }
      
      if (existing) {
        await prisma.position.update({ where: { id: existing.id }, data: jobData })
        updated++
      } else {
        await prisma.position.create({ data: jobData })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Jobs/Positions: ${created} created, ${updated} updated`,
      data: { created, updated, total: odooJobs.length }
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}