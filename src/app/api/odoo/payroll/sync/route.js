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
    const withNonPermanentCount = enhancedSummary.filter((s) => (s.nonPermanentAllowance || s.kpiAllowance || 0) > 0).length
    const withOvertimeCount = enhancedSummary.filter((s) => (s.overtimeAmount || 0) > 0).length
    const withLeaveDeductionCount = enhancedSummary.filter((s) => (s.totalLeaveDeductions || 0) > 0).length
    const withProrateCount = enhancedSummary.filter((s) => s.isProrated).length

    const totalPenaltySum = enhancedSummary.reduce((acc, s) => acc + (s.totalPenalty || 0), 0)
    const totalRewardSum = enhancedSummary.reduce((acc, s) => acc + (s.rewardAmount || 0), 0)
    const totalBasicSum = enhancedSummary.reduce((acc, s) => acc + (s.basicSalary || 0), 0)
    const totalTransportSum = enhancedSummary.reduce((acc, s) => acc + (s.transportAllowance || 0), 0)
    const totalNonPermanentSum = enhancedSummary.reduce((acc, s) => acc + (s.nonPermanentAllowance ?? s.kpiAllowance ?? 0), 0)
    const totalOvertimeSum = enhancedSummary.reduce((acc, s) => acc + (s.overtimeAmount || 0), 0)
    const totalOvertimeHoursSum = enhancedSummary.reduce((acc, s) => acc + (s.overtimeHours || 0), 0)
    const totalHalfDayDeductionSum = enhancedSummary.reduce((acc, s) => acc + (s.halfDayDeduction || 0), 0)
    const totalSickDeductionSum = enhancedSummary.reduce((acc, s) => acc + (s.sickLeaveDeduction || 0), 0)
    const totalUnpaidDeductionSum = enhancedSummary.reduce((acc, s) => acc + (s.unpaidLeaveDeduction || 0), 0)
    const totalLeaveDeductionSum = enhancedSummary.reduce((acc, s) => acc + (s.totalLeaveDeductions || 0), 0)
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
        withNonPermanentCount,
        withKpiCount: withNonPermanentCount, // alias
        withOvertimeCount,
        withLeaveDeductionCount,
        withProrateCount,
        totalPenaltySum,
        totalRewardSum,
        totalBasicSum,
        totalTransportSum,
        totalNonPermanentSum,
        totalKpiSum: totalNonPermanentSum, // alias
        totalOvertimeSum,
        totalOvertimeHoursSum: Math.round(totalOvertimeHoursSum * 100) / 100,
        totalHalfDayDeductionSum,
        totalSickDeductionSum,
        totalUnpaidDeductionSum,
        totalLeaveDeductionSum,
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

