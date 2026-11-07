import { NextResponse } from 'next/server'
import {
  getCutoffDateRange,
  aggregateCutoffAttendance,
  syncCutoffToOdoo,
  getOdooDraftPayslipsMap,
} from '@/lib/odooPayrollService'

export const dynamic = 'force-dynamic'

// GET: Pratinjau (Preview) Rekap Presensi Periode Cut-Off 26 - 25
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customDateFrom = searchParams.get('dateFrom')
    const customDateTo = searchParams.get('dateTo')
    const dateRef = searchParams.get('dateRef')

    let range
    if (customDateFrom && customDateTo) {
      range = { dateFrom: customDateFrom, dateTo: customDateTo, label: `${customDateFrom} s/d ${customDateTo}` }
    } else {
      range = getCutoffDateRange(dateRef)
    }

    const summary = await aggregateCutoffAttendance({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    })

    // Ambil status draft slip gaji dari Odoo secara paralel
    const odooDraftMap = await getOdooDraftPayslipsMap({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    })

    const enhancedSummary = summary.map((emp) => {
      const draft = emp.odoo_id ? odooDraftMap.get(emp.odoo_id) : null
      return {
        ...emp,
        odooDraft: draft || null,
      }
    })

    const totalEmployees = enhancedSummary.length
    const withOdooCount = enhancedSummary.filter((s) => s.hasOdoo).length
    const withDraftInOdooCount = enhancedSummary.filter((s) => s.odooDraft?.state === 'draft').length
    const withPenaltyCount = enhancedSummary.filter((s) => s.totalPenalty > 0).length
    const withRewardCount = enhancedSummary.filter((s) => s.rewardAmount > 0).length
    const withTransportCount = enhancedSummary.filter((s) => (s.transportAllowance || 0) > 0).length
    const withKpiCount = enhancedSummary.filter((s) => (s.kpiAllowance || 0) > 0).length

    const totalPenaltySum = enhancedSummary.reduce((acc, s) => acc + (s.totalPenalty || 0), 0)
    const totalRewardSum = enhancedSummary.reduce((acc, s) => acc + (s.rewardAmount || 0), 0)
    const totalBasicSum = enhancedSummary.reduce((acc, s) => acc + (s.basicSalary || 0), 0)
    const totalTransportSum = enhancedSummary.reduce((acc, s) => acc + (s.transportAllowance || 0), 0)
    const totalKpiSum = enhancedSummary.reduce((acc, s) => acc + (s.kpiAllowance || 0), 0)
    const totalGrossSum = enhancedSummary.reduce((acc, s) => acc + (s.grossSalary || 0), 0)

    return NextResponse.json({
      success: true,
      range,
      stats: {
        totalEmployees,
        withOdooCount,
        withDraftInOdooCount,
        withPenaltyCount,
        withRewardCount,
        withTransportCount,
        withKpiCount,
        totalPenaltySum,
        totalRewardSum,
        totalBasicSum,
        totalTransportSum,
        totalKpiSum,
        totalGrossSum,
      },
      data: enhancedSummary,
    })
  } catch (error) {
    console.error('Error in GET /api/odoo/payroll/sync:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: Sinkronisasi ke Items Payroll Odoo (hr.payslip.input)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      dateFrom: customFrom,
      dateTo: customTo,
      dateRef,
      employeeIds,
      dryRun,
      onlyUpdateExistingDraft = true,
    } = body

    let dateFrom = customFrom
    let dateTo = customTo

    if (!dateFrom || !dateTo) {
      const range = getCutoffDateRange(dateRef)
      dateFrom = range.dateFrom
      dateTo = range.dateTo
    }

    const result = await syncCutoffToOdoo({
      dateFrom,
      dateTo,
      employeeIds,
      dryRun: !!dryRun,
      onlyUpdateExistingDraft,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/odoo/payroll/sync:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

