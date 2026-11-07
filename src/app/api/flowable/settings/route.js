import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    let settings = await prisma.flowableSettings.findFirst()

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.flowableSettings.create({
        data: {
          url: 'http://localhost:8080/flowable-rest',
          uiUrl: 'http://localhost:8080/flowable-ui',
          username: 'admin',
          password: 'test',
          enabled: false,
        }
      })
    }

    // Remove password from response
    const { password, ...safeSettings } = settings

    return NextResponse.json({
      success: true,
      data: {
        ...safeSettings,
        hasPassword: !!settings.password
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { url, uiUrl, username, password, enabled } = body

    let settings = await prisma.flowableSettings.findFirst()

    if (settings) {
      settings = await prisma.flowableSettings.update({
        where: { id: settings.id },
        data: {
          ...(url && { url }),
          ...(uiUrl && { uiUrl }),
          ...(username && { username }),
          ...(password && { password }),
          ...(enabled !== undefined && { enabled }),
        }
      })
    } else {
      settings = await prisma.flowableSettings.create({
        data: {
          url: url || 'http://localhost:8080/flowable-rest',
          uiUrl: uiUrl || 'http://localhost:8080/flowable-ui',
          username: username || 'admin',
          password: password || 'test',
          enabled: enabled ?? false,
        }
      })
    }

    const { password: _, ...safeSettings } = settings

    return NextResponse.json({
      success: true,
      data: safeSettings,
      message: 'Settings saved successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
