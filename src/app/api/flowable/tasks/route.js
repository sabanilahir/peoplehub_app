import { NextResponse } from 'next/server'
import { getTasks } from '@/lib/flowable/client'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const assignee = searchParams.get('assignee')
    const candidateUser = searchParams.get('candidateUser')
    const candidateOrAssigned = searchParams.get('candidateOrAssigned')
    const candidateGroup = searchParams.get('candidateGroup')
    const processInstanceId = searchParams.get('processInstanceId')
    const status = searchParams.get('status') || 'open'
    const size = searchParams.get('size') || 50

    const params = { 
      size,
      includeProcessVariables: true,
      includeTaskLocalVariables: true,
    }

    if (assignee) params.assignee = assignee
    if (candidateUser) params.candidateUser = candidateUser
    if (candidateOrAssigned) params.candidateOrAssigned = candidateOrAssigned
    if (candidateGroup) params.candidateGroup = candidateGroup
    if (processInstanceId) params.processInstanceId = processInstanceId

    if (status === 'open') {
      params.includeCompleted = false
      params.includeDeleted = false
    }

    const result = await getTasks(params)

    if (!result.success) {
      return NextResponse.json({
        success: true,
        data: { data: [], total: 0 },
        warning: result.error,
      })
    }

    return NextResponse.json({
      success: true,
      data: result.data || { data: [], total: 0 },
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { data: [], total: 0 },
      error: error.message,
    })
  }
}
