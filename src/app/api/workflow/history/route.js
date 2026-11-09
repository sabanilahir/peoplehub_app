// src/app/api/workflow/history/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workflow/history
 * Mengambil riwayat pengajuan (Cuti & Lembur) yang telah selesai (Approved / Rejected)
 * Query params:
 * - category: 'all' (default) | 'leave' | 'overtime'
 * - status: 'all' (default) | 'Approved' | 'Rejected'
 * - search: string
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryParam = searchParams.get('category') || 'all'
    const statusParam = searchParams.get('status') || 'all'
    const searchParam = (searchParams.get('search') || '').toLowerCase().trim()

    // 1. Kondisi filter status
    let statusFilter = { in: ['Approved', 'Rejected'] }
    if (statusParam === 'Approved' || statusParam === 'Rejected') {
      statusFilter = statusParam
    }

    // 2. Ambil Riwayat Cuti
    const leaves = await prisma.leave.findMany({
      where: {
        status: statusFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            dept: true,
            position: true,
            email: true,
            employeeId: true,
          },
        },
        leaveType: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    // 3. Ambil Riwayat Lembur
    const overtimes = await prisma.overtimeRecord.findMany({
      where: {
        status: statusFilter,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nik: true,
            dept: true,
            location: true,
            position: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    // 4. Normalisasi data Cuti
    const leaveHistory = leaves.map((l) => {
      const steps = Array.isArray(l.steps) ? l.steps : []
      const lastApprovedStep = [...steps].reverse().find((s) => s.status === 'Approved')
      const rejectedStep = steps.find((s) => s.status === 'Rejected')
      const finalActor = rejectedStep || lastApprovedStep || null

      let payrollImpact = 'Memotong kuota cuti tahunan'
      let payrollTone = 'blue'
      const typeLower = (l.typeName || '').toLowerCase()
      if (typeLower.includes('setengah')) {
        payrollImpact = 'Memotong 50% Gaji Gross harian di HO Calculator'
        payrollTone = 'amber'
      } else if (typeLower.includes('sakit')) {
        if (l.attachment) {
          payrollImpact = 'Memotong Prorata Tunjangan Transport di HO Calculator (Surat Terlampir)'
          payrollTone = 'emerald'
        } else {
          payrollImpact = 'Tanpa surat: memotong 100% Gaji Gross (Unpaid Leave)'
          payrollTone = 'red'
        }
      } else if (typeLower.includes('unpaid') || typeLower.includes('potong gaji')) {
        payrollImpact = 'Memotong 100% Gaji Gross harian di HO Calculator'
        payrollTone = 'red'
      }

      return {
        id: `leave-${l.id}`,
        taskId: l.id,
        category: 'leave',
        type: 'Permohonan Cuti / Izin',
        title: `${l.typeName} · ${l.user?.name || 'Karyawan'}`,
        applicantName: l.user?.name || 'Karyawan',
        applicantNik: l.user?.employeeId ? `EMP-${l.user.employeeId}` : `USR-${l.userId}`,
        applicantDept: l.user?.dept || 'Head Office',
        applicantPosition: l.user?.position || 'Staff',
        leaveType: l.typeName,
        startDate: l.startDate,
        endDate: l.endDate,
        durationText: `${l.days} Hari Kerja`,
        note: l.note || 'Tidak ada catatan',
        attachment: l.attachment || null,
        status: l.status,
        finalDecisionBy: finalActor?.approverName || (l.status === 'Approved' ? 'Atasan / HR' : '-'),
        finalDecisionNote: finalActor?.note || '-',
        completedAt: l.updatedAt || l.createdAt,
        createdAt: l.createdAt,
        steps,
        payrollImpact,
        payrollTone,
      }
    })

    // 5. Normalisasi data Lembur
    const overtimeHistory = overtimes.map((ot) => {
      return {
        id: `overtime-${ot.id}`,
        taskId: ot.id,
        category: 'overtime',
        type: 'Permohonan Lembur',
        title: `Lembur ${ot.totalHours} Jam · ${ot.employee?.name || 'Karyawan'}`,
        applicantName: ot.employee?.name || 'Karyawan',
        applicantNik: ot.employee?.nik || `EMP-${ot.empId}`,
        applicantDept: ot.employee?.dept || ot.employee?.location || 'Operasional',
        applicantPosition: ot.employee?.position || 'Staff',
        leaveType: 'Lembur',
        startDate: ot.date,
        endDate: ot.date,
        durationText: `${ot.totalHours} Jam (${ot.startTime} - ${ot.endTime})`,
        note: ot.taskNote || 'Tidak ada catatan',
        attachment: null,
        status: ot.status,
        finalDecisionBy: ot.status === 'Approved' ? 'Supervisor Operasional' : 'Ditolak Atasan',
        finalDecisionNote: ot.status === 'Approved' ? `Nominal Lembur: Rp ${ot.totalFee.toLocaleString('id-ID')}` : '-',
        completedAt: ot.updatedAt || ot.createdAt,
        createdAt: ot.createdAt,
        steps: [
          {
            level: 1,
            label: 'Atasan Langsung',
            status: ot.status,
            actedAt: ot.updatedAt,
          },
        ],
        payrollImpact: ot.status === 'Approved'
          ? `Menambah Uang Lembur (+Rp ${ot.totalFee.toLocaleString('id-ID')}) di HO Calculator`
          : 'Ditolak (Tidak ada penambahan payroll)',
        payrollTone: ot.status === 'Approved' ? 'emerald' : 'gray',
      }
    })

    // 6. Gabungkan & saring sesuai query
    let combined = []
    if (categoryParam === 'leave') {
      combined = leaveHistory
    } else if (categoryParam === 'overtime') {
      combined = overtimeHistory
    } else {
      combined = [...leaveHistory, ...overtimeHistory]
    }

    if (searchParam) {
      combined = combined.filter((item) => {
        return (
          item.applicantName.toLowerCase().includes(searchParam) ||
          item.applicantNik.toLowerCase().includes(searchParam) ||
          item.applicantDept.toLowerCase().includes(searchParam) ||
          item.leaveType.toLowerCase().includes(searchParam) ||
          item.note.toLowerCase().includes(searchParam)
        )
      })
    }

    // Urutkan berdasarkan waktu penyelesaian terbaru
    combined.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))

    return Response.json({
      success: true,
      total: combined.length,
      data: combined,
    })
  } catch (error) {
    console.error('[API /api/workflow/history GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
