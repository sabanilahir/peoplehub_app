import { NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { resolveUserRole } from "@/lib/roleResolver"

// GET: Fetch employees dari Odoo dan sync ke PostgreSQL dengan FK relations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    let odooUrl = searchParams.get("odooUrl")
    let odooDb = searchParams.get("odooDb")
    let odooUser = searchParams.get("odooUser")
    let odooApiKey = searchParams.get("odooApiKey")
    
    // Fallback otomatis membaca dari database jika tidak ada di query parameter
    if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
      const dbSettings = await prisma.odooSettings.findFirst({
        where: { url: { not: "" } },
        orderBy: { updatedAt: "desc" }
      })
      if (dbSettings) {
        odooUrl = dbSettings.url
        odooDb = dbSettings.db
        odooUser = dbSettings.user
        odooApiKey = dbSettings.apiKey
      }
    }

    if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
      return NextResponse.json({ success: false, error: "Missing Odoo credentials. Silakan konfigurasi di menu Admin > API Odoo." }, { status: 400 })
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

    // -- Step 1: Sync Departments first -----------------------------------------
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
            { fields: ["id", "name", "parent_id"], limit: 500 }
          ]
        },
        id: 2
      })
    })

    let deptMap = {} // odoo_dept_id -> db_department_id
    if (deptResponse.ok) {
      const deptData = await deptResponse.json()
      for (const d of (deptData.result || [])) {
        const existing = await prisma.department.findFirst({ where: { odoo_id: String(d.id) } })
        if (existing) {
          deptMap[String(d.id)] = existing.id
        } else {
          const newDept = await prisma.department.create({
            data: { odoo_id: String(d.id), name: d.name || "", last_sync_at: new Date() }
          })
          deptMap[String(d.id)] = newDept.id
        }
      }
    }

    // -- Step 2: Sync Jobs/Positions --------------------------------------------
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
            { fields: ["id", "name", "department_id"], limit: 500 }
          ]
        },
        id: 3
      })
    })

    let jobMap = {} // odoo_job_id -> db_position_id
    if (jobResponse.ok) {
      const jobData = await jobResponse.json()
      for (const j of (jobData.result || [])) {
        const existing = await prisma.position.findFirst({ where: { odoo_id: String(j.id) } })
        if (existing) {
          jobMap[String(j.id)] = existing.id
        } else {
          const newJob = await prisma.position.create({
            data: { odoo_id: String(j.id), name: j.name || "", last_sync_at: new Date() }
          })
          jobMap[String(j.id)] = newJob.id
        }
      }
    }

    // -- Step 2.5: Sync & Fetch 4 Work Locations -------------------------------
    const TARGET_LOCATIONS = ['Gudang', 'Head Office', 'Manhattan', 'Others']
    const DEFAULT_LOC_MAPPINGS = {
      'gudang': 'gudang',
      'head office': 'ho',
      'manhattan': 'livestream',
      'others': 'sales',
    }

    let workLocMap = {} // odoo_id -> { mappedLocationCode, name }
    try {
      const locResponse = await fetch(jsonRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [odooDb, uid, odooApiKey, "hr.work.location", "search_read",
              [[['name', 'in', TARGET_LOCATIONS]]],
              { fields: ["id", "name", "location_type"], limit: 10 }
            ]
          },
          id: 35
        })
      })

      if (locResponse.ok) {
        const locData = await locResponse.json()
        for (const l of (locData.result || [])) {
          const defaultCode = DEFAULT_LOC_MAPPINGS[l.name.toLowerCase()] || 'ho'
          const existing = await prisma.odooWorkLocation.findUnique({ where: { odoo_id: String(l.id) } })
          if (existing) {
            workLocMap[String(l.id)] = {
              mappedLocationCode: existing.mappedLocationCode || defaultCode,
              name: l.name,
            }
          } else {
            const createdLoc = await prisma.odooWorkLocation.create({
              data: {
                odoo_id: String(l.id),
                name: l.name,
                locationType: l.location_type || 'office',
                mappedLocationCode: defaultCode,
                last_sync_at: new Date(),
              }
            })
            workLocMap[String(l.id)] = {
              mappedLocationCode: createdLoc.mappedLocationCode,
              name: l.name,
            }
          }
        }
      }
    } catch (locErr) {
      console.warn('[Odoo Sync] Error syncing work locations:', locErr.message)
    }

    // -- Step 3: Fetch Employees from Odoo --------------------------------------
    const odooFields = [
      "id", "name", "active",
      "work_email", "work_phone", "mobile_phone",
      "department_id", "job_id", "job_title",
      "parent_id", "work_location_id", "work_location_name",
      "employee_type", "contract_type_id", "contract_date_start",
      "birthday", "sex", "marital",
      "identification_id", "country_id",
      "additional_note", "category_ids",
      "user_id", "address_id"
    ]

    const employeesResponse = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [odooDb, uid, odooApiKey, "hr.employee", "search_read", 
            [[]], 
            { fields: odooFields, limit: 1000 }
          ]
        },
        id: 4
      })
    })

    if (!employeesResponse.ok) {
      return NextResponse.json({ success: false, error: `Employee fetch HTTP ${employeesResponse.status}` }, { status: 502 })
    }

    const employeesData = await employeesResponse.json()
    if (employeesData.error) {
      console.error('[Odoo Sync] Error fetching employees:', employeesData.error)
      return NextResponse.json({ success: false, error: employeesData.error.data?.message || employeesData.error.message }, { status: 500 })
    }
    const odooEmployees = employeesData.result || []

    // Helper to extract ID or string safely from Odoo fields
    const getId = (val) => Array.isArray(val) ? val[0] : (val || null)
    const getName = (val) => Array.isArray(val) ? val[1] : (val || "")
    const cleanStr = (val) => (!val || val === false) ? "" : String(val).trim()

    // -- Step 3.5: Batch fetch partner addresses for Work Address --------------
    const addressPartnerMap = {}
    const companyPartnerNameMap = {} // partnerId -> companyName
    try {
      const addressIds = [...new Set(odooEmployees.map(e => getId(e.address_id)).filter(Boolean))]
      if (addressIds.length > 0) {
        const partnerResponse = await fetch(jsonRpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [odooDb, uid, odooApiKey, "res.partner", "read",
                [addressIds],
                { fields: ["id", "name", "street", "street2", "city", "state_id", "country_id", "contact_address_complete"] }
              ]
            },
            id: 38
          })
        })
        if (partnerResponse.ok) {
          const pData = await partnerResponse.json()
          for (const p of (pData.result || [])) {
            if (p.name) companyPartnerNameMap[String(p.id)] = p.name.trim()
            const lines = []
            if (p.name) lines.push(p.name)
            if (p.street) lines.push(p.street)
            if (p.street2) lines.push(p.street2)
            const cityState = [p.city, getName(p.state_id)].filter(Boolean).join(' ')
            if (cityState) lines.push(cityState)
            if (getName(p.country_id)) lines.push(getName(p.country_id))
            addressPartnerMap[String(p.id)] = lines.length > 0 ? lines.join('\n') : (p.contact_address_complete || p.name || '')
          }
        }
      }
    } catch (addrErr) {
      console.warn('[Odoo Sync] Error fetching address partners:', addrErr.message)
    }

    // -- Step 3.6: Resolve or create Company entities from Work Address ----------
    let companyCache = {} // companyName -> companyId
    try {
      const existingCompanies = await prisma.company.findMany()
      existingCompanies.forEach(c => { companyCache[c.name.toLowerCase()] = c.id })

      // Determine all unique company names from employees' address_id / company_id
      const distinctCompanyNames = new Set()
      for (const emp of odooEmployees) {
        const addrId = getId(emp.address_id)
        const nameFromAddr = (addrId && companyPartnerNameMap[String(addrId)]) || getName(emp.address_id) || getName(emp.company_id) || 'PT Gemilang Nusantara'
        if (nameFromAddr) distinctCompanyNames.add(nameFromAddr.trim())
      }

      for (const compName of distinctCompanyNames) {
        const key = compName.toLowerCase()
        if (!companyCache[key]) {
          const maxComp = await prisma.company.aggregate({ _max: { id: true } })
          const newCompId = (maxComp._max?.id || 2020) + 1
          
          // Generate a 2-3 letter code e.g. "PT Gemilang Nusantara" -> "GN"
          const words = compName.replace(/^(PT|CV|UD)\.?\s+/i, '').trim().split(/\s+/)
          const codeLetters = words.map(w => w[0]).join('').slice(0, 3).toUpperCase() || 'CO'
          
          const createdComp = await prisma.company.create({
            data: {
              id: newCompId,
              divisionId: 1001,
              code: `CO-${codeLetters}`,
              companyCode: codeLetters,
              name: compName,
              legalEntity: compName.toUpperCase().startsWith('PT') ? 'PT' : 'Other',
              country: 'Indonesia',
              status: 'Active'
            }
          })
          companyCache[key] = createdComp.id
        }
      }
    } catch (compErr) {
      console.warn('[Odoo Sync] Error resolving companies:', compErr.message)
    }

    // -- Step 4: Sync Employees with FK relations --------------------------------
    let created = 0, updated = 0, usersCreated = 0

    for (const emp of odooEmployees) {
      // Resolve FKs
      const departmentId = emp.department_id ? deptMap[String(getId(emp.department_id))] || null : null
      const positionId = emp.job_id ? jobMap[String(getId(emp.job_id))] || null : null
      
      // Resolve Work Location & Address with immediate Auto-Mapping
      const workLocId = getId(emp.work_location_id) ? String(getId(emp.work_location_id)) : null
      let rawLoc = getName(emp.work_location_id) || cleanStr(emp.work_location_name)
      const deptName = getName(emp.department_id) || ''
      const deptLower = deptName.toLowerCase()

      let finalLocation = rawLoc
      let workLocationCode = null

      // 1. Direct match by Odoo ID if in workLocMap
      if (workLocId && workLocMap[workLocId]?.mappedLocationCode) {
        workLocationCode = workLocMap[workLocId].mappedLocationCode
        finalLocation = workLocMap[workLocId].name || rawLoc
      } 
      // 2. Direct match by location text
      else if (rawLoc) {
        const norm = rawLoc.toLowerCase()
        if (norm.includes('head office') || norm === 'ho' || norm === 'office') {
          workLocationCode = 'ho'
          finalLocation = 'Head Office'
        } else if (norm.includes('gudang') || norm.includes('warehouse')) {
          workLocationCode = 'gudang'
          finalLocation = 'Gudang'
        } else if (norm.includes('manhattan') || norm.includes('live')) {
          workLocationCode = 'livestream'
          finalLocation = 'Manhattan'
        } else if (norm.includes('others') || norm.includes('sales')) {
          workLocationCode = 'sales'
          finalLocation = 'Others'
        }
      }

      // 3. Smart fallback by department if location is still empty or unmapped
      if (!workLocationCode) {
        if (deptLower.includes('sales')) {
          workLocationCode = 'sales'
          finalLocation = 'Others'
        } else if (deptLower.includes('live')) {
          workLocationCode = 'livestream'
          finalLocation = 'Manhattan'
        } else if (deptLower.includes('fullfilment') || deptLower.includes('gudang') || deptLower.includes('supplychain')) {
          workLocationCode = 'gudang'
          finalLocation = 'Gudang'
        } else {
          workLocationCode = 'ho'
          finalLocation = 'Head Office'
        }
      }

      const addrId = getId(emp.address_id)
      const workAddress = (addrId && addressPartnerMap[String(addrId)]) || getName(emp.address_id) || 'PT Gemilang Nusantara'
      const countryName = getName(emp.country_id) || "Indonesia"
      const phone = cleanStr(emp.mobile_phone) || cleanStr(emp.work_phone)
      const email = cleanStr(emp.work_email)
      const joinDate = cleanStr(emp.contract_date_start) || ""
      const marital = cleanStr(emp.marital)
      const gender = emp.sex === "female" ? "Female" : (emp.sex === "male" ? "Male" : "")

      const jobPosition = getName(emp.job_id)
      const jobTitle = cleanStr(emp.job_title)

      const companyNameResolved = (addrId && companyPartnerNameMap[String(addrId)]) || getName(emp.address_id) || getName(emp.company_id) || 'PT Gemilang Nusantara'
      const companyId = (companyNameResolved && companyCache[companyNameResolved.toLowerCase()]) || null

      const empTypeName = getName(emp.contract_type_id) || (emp.employee_type ? (emp.employee_type.charAt(0).toUpperCase() + emp.employee_type.slice(1)) : "Permanent")

      // Map all fields strictly to Prisma Employee model
      const empData = {
        odoo_id: String(emp.id),
        imported_from: "odoo",
        last_sync_at: new Date(),
        name: cleanStr(emp.name),
        email: email,
        phone: phone,
        companyId: companyId,
        departmentId: departmentId,
        positionId: positionId,
        dept: deptName,
        position: jobTitle || jobPosition,
        jobPosition: jobPosition,
        jobTitle: jobTitle,
        employmentType: empTypeName,
        joinDate: joinDate,
        gender: gender,
        maritalStatus: marital ? (marital.charAt(0).toUpperCase() + marital.slice(1)) : "",
        birthDate: cleanStr(emp.birthday),
        nationality: countryName,
        country: countryName,
        address: workAddress,
        location: finalLocation,
        odooWorkLocationId: workLocId || (finalLocation === 'Head Office' ? '8' : finalLocation === 'Gudang' ? '9' : finalLocation === 'Manhattan' ? '10' : '11'),
        workLocationCode: workLocationCode,
        ktp: cleanStr(emp.identification_id),
        status: emp.active ? "Active" : "Inactive",
      }
      
      const resolvedRole = resolveUserRole(empData)
      empData.role = resolvedRole

      const existing = await prisma.employee.findFirst({ where: { odoo_id: String(emp.id) } })

      if (existing) {
        await prisma.employee.update({ where: { id: existing.id }, data: empData })
        updated++
        
        const hasUser = await prisma.user.findFirst({ where: { employeeId: existing.id } })
        if (!hasUser) {
          const nik = existing.nik || `ODOO-${emp.id}`
          const userCreated = await tryCreateUser(existing.id, nik, emp.name, emp.work_email, emp.id, resolvedRole, deptName, empData.position)
          if (userCreated) usersCreated++
        } else {
          // Update role, dept, position if user already exists
          await prisma.user.update({
            where: { id: hasUser.id },
            data: {
              role: resolvedRole,
              dept: deptName || hasUser.dept,
              position: empData.position || hasUser.position,
            }
          })
        }
      } else {
        const maxId = await prisma.employee.aggregate({ _max: { id: true } })
        const newId = (maxId._max?.id || 200000) + 1
        const nik = `ODOO-${emp.id}`
        
        await prisma.employee.create({ 
          data: { 
            ...empData, 
            id: newId,
            nik, 
            status: empData.status,
            role: resolvedRole
          } 
        })
        created++

        const userCreated = await tryCreateUser(newId, nik, emp.name, emp.work_email, emp.id, resolvedRole, deptName, empData.position)
        if (userCreated) usersCreated++
      }
    }

    // -- Step 5: Update Manager references (second pass) ------------------------
    // This requires mapping odoo employee IDs to db IDs
    const allEmployees = await prisma.employee.findMany({ where: { imported_from: "odoo" } })
    const odooEmpMap = {} // odoo_id -> db_id
    allEmployees.forEach(e => { odooEmpMap[e.odoo_id] = e.id })

    // Also get manager odoo_ids from employee parent_id
    const managerResponse = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [odooDb, uid, odooApiKey, "hr.employee", "search_read", 
            [[]], 
            { fields: ["id", "parent_id"], limit: 1000 }
          ]
        },
        id: 5
      })
    })

    if (managerResponse.ok) {
      const mgrData = await managerResponse.json()
      for (const emp of (mgrData.result || [])) {
        const dbId = odooEmpMap[String(emp.id)]
        if (dbId && emp.parent_id) {
          const managerDbId = odooEmpMap[String(getId(emp.parent_id))]
          if (managerDbId) {
            await prisma.employee.update({
              where: { id: dbId },
              data: { managerId: managerDbId }
            }).catch(() => {})
          }
        }
      }
    }

    // Update lastSyncAt in OdooSettings
    await prisma.odooSettings.updateMany({
      data: { lastSyncAt: new Date() }
    }).catch(() => {})

    return NextResponse.json({ 
      success: true, 
      message: `Employees: ${created} created, ${updated} updated. Users: ${usersCreated} created.`,
      data: { created, updated, usersCreated, total: odooEmployees.length, departments: Object.keys(deptMap).length, jobs: Object.keys(jobMap).length }
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  return GET(request)
}

// Helper function outside GET handler
function generateUsernameFromFullName(fullName) {
  if (!fullName) return 'user'
  const clean = fullName.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '')
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'user'
  if (parts.length === 1) return parts[0]
  return `${parts[0]}.${parts[parts.length - 1]}`
}

async function tryCreateUser(employeeId, nik, name, email, odooId, role = 'employee', dept = '', position = '') {
  try {
    const existingUser = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { odoo_id: String(odooId) },
          { employeeId: employeeId }
        ]
      }
    })
    if (existingUser) return false
    
    const maxUserId = await prisma.user.aggregate({ _max: { id: true } })
    const newUserId = (maxUserId._max?.id || 200000) + 1

    const baseUsername = generateUsernameFromFullName(name)
    let candidateUsername = baseUsername
    let count = 1
    while (await prisma.user.findFirst({ where: { username: candidateUsername } })) {
      count++
      candidateUsername = `${baseUsername}${count}`
    }
    
    await prisma.user.create({
      data: {
        id: newUserId,
        username: candidateUsername,
        password: "pass123",
        name: name || "",
        role: role,
        dept: dept,
        position: position,
        email: email || "",
        employeeId: employeeId,
        odoo_id: String(odooId),
        imported_from: "odoo",
      }
    })
    return true
  } catch (userErr) {
    console.error(`[Odoo Sync] Failed to create user for ${name}:`, userErr.message)
    return false
  }
}
