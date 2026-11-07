import { NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"

// GET: Fetch Odoo settings from database
export async function GET() {
  try {
    const settings = await prisma.odooSettings.findMany({ take: 1 })
    
    if (settings.length === 0) {
      return NextResponse.json({ success: true, data: null })
    }
    
    return NextResponse.json({ success: true, data: settings[0] })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: Save Odoo settings to database
export async function POST(request) {
  try {
    const body = await request.json()
    const { url, db, user, apiKey, model, syncEnabled, autoSyncInterval } = body
    
    if (!url || !db || !user || !apiKey) {
      return NextResponse.json({ success: false, error: "URL, DB, User, dan API Key harus diisi" }, { status: 400 })
    }
    
    // Upsert - update if exists, create if not
    const existing = await prisma.odooSettings.findMany({ take: 1 })
    
    if (existing.length > 0) {
      await prisma.odooSettings.update({
        where: { id: existing[0].id },
        data: {
          url,
          db,
          user,
          apiKey,
          model: model || "hr.employee",
          syncEnabled: syncEnabled || false,
          autoSyncInterval: autoSyncInterval || 0,
          updatedAt: new Date(),
        }
      })
    } else {
      await prisma.odooSettings.create({
        data: {
          url,
          db,
          user,
          apiKey,
          model: model || "hr.employee",
          syncEnabled: syncEnabled || false,
          autoSyncInterval: autoSyncInterval || 0,
        }
      })
    }
    
    return NextResponse.json({ success: true, message: "Pengaturan berhasil disimpan" })
    
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}