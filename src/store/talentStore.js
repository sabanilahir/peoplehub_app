import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _nextId = 100

const genId = () => _nextId++

export const useTalentStore = create(
  persist(
    (set, get) => ({
      // ── Key Positions ────────────────────────────────────────────────────────
      keyPositions: [
        {
          id: 1, positionId: 'POS-001', positionName: 'General Manager Operations',
          employeeId: 'EMP-001', employeeName: 'Budi Santoso', pcLevel: 65,
          assessedBy: 'Corporate Organization Development', assessedAt: '2024-01-15',
          q1: true, q2: true, q3: true, isKeyPosition: true, status: 'Key Position',
          criticalityScore: 5, businessImpact: 'Mengkoordinasi seluruh operasional bisnis, berdampak langsung pada revenue',
          estimatedVacancyDate: '2025-06-30', requiredSuccessors: 2,
        },
        {
          id: 2, positionId: 'POS-002', positionName: 'Head of Finance',
          employeeId: 'EMP-002', employeeName: 'Siti Rahma', pcLevel: 63,
          assessedBy: 'HR PT', assessedAt: '2024-01-20',
          q1: true, q2: false, q3: true, isKeyPosition: true, status: 'Key Position',
          criticalityScore: 4, businessImpact: 'Mengelola laporan keuangan korporat dan compliance regulasi',
          estimatedVacancyDate: '2026-12-31', requiredSuccessors: 1,
        },
        {
          id: 3, positionId: 'POS-003', positionName: 'Staff Administrasi',
          employeeId: 'EMP-003', employeeName: 'Ahmad Fauzi', pcLevel: 52,
          assessedBy: 'HR PT', assessedAt: '2024-02-01',
          q1: false, q2: false, q3: false, isKeyPosition: false, status: 'General',
          criticalityScore: 2, businessImpact: '', estimatedVacancyDate: '', requiredSuccessors: 0,
        },
      ],

      addKeyPosition: (data) =>
        set(s => {
          const isKey = data.q1 || data.q2 || data.q3
          const newRec = {
            ...data,
            id: genId(),
            assessedAt: new Date().toISOString().split('T')[0],
            isKeyPosition: isKey,
            status: isKey ? 'Key Position' : 'General',
            assessedBy: data.pcLevel >= 64 ? 'Corporate Organization Development' : 'HR PT',
          }
          return { keyPositions: [...s.keyPositions, newRec] }
        }),

      updateKeyPosition: (id, patch) =>
        set(s => {
          const updated = s.keyPositions.map(k => {
            if (k.id !== id) return k
            const merged = { ...k, ...patch }
            const isKey = merged.q1 || merged.q2 || merged.q3
            return {
              ...merged,
              isKeyPosition: isKey,
              status: isKey ? 'Key Position' : 'General',
              assessedBy: merged.pcLevel >= 64 ? 'Corporate Organization Development' : 'HR PT',
            }
          })
          return { keyPositions: updated }
        }),

      deleteKeyPosition: (id) =>
        set(s => ({ keyPositions: s.keyPositions.filter(k => k.id !== id) })),

      // ── Vacancy Risks ────────────────────────────────────────────────────────
      vacancyRisks: [
        {
          id: 1, keyPositionId: 1, positionName: 'General Manager Operations',
          employeeId: 'EMP-001', employeeName: 'Budi Santoso',
          gapToRetirement: 0.5, endOfContract: '2025-06-30',
          careerPlan: 'Akan pensiun dini', healthStatus: 'Fair',
          riskTerm: 'Short', notes: 'Perlu segera cari pengganti', assessedAt: '2024-01-16',
        },
        {
          id: 2, keyPositionId: 2, positionName: 'Head of Finance',
          employeeId: 'EMP-002', employeeName: 'Siti Rahma',
          gapToRetirement: 2, endOfContract: '2026-12-31',
          careerPlan: 'Berencana pindah ke anak perusahaan', healthStatus: 'Good',
          riskTerm: 'Mid', notes: 'Pantau rencana karir', assessedAt: '2024-01-21',
        },
      ],

      addVacancyRisk: (data) =>
        set(s => {
          const gap = parseFloat(data.gapToRetirement) || 0
          const riskTerm = gap <= 1 ? 'Short' : gap <= 3 ? 'Mid' : 'Long'
          return {
            vacancyRisks: [...s.vacancyRisks, {
              ...data,
              id: genId(),
              riskTerm,
              assessedAt: new Date().toISOString().split('T')[0],
            }],
          }
        }),

      updateVacancyRisk: (id, patch) =>
        set(s => ({
          vacancyRisks: s.vacancyRisks.map(v => {
            if (v.id !== id) return v
            const merged = { ...v, ...patch }
            const gap = parseFloat(merged.gapToRetirement) || 0
            merged.riskTerm = gap <= 1 ? 'Short' : gap <= 3 ? 'Mid' : 'Long'
            return merged
          }),
        })),

      // ── Talent 9-Box ─────────────────────────────────────────────────────────
      talentBoxes: [
        {
          id: 1, employeeId: 'EMP-004', employeeName: 'Dewi Lestari', year: 2024,
          performanceScore: 4.5, competencyScore: 4.8,
          boxRow: 3, boxCol: 3, boxLabel: 'Star', notes: 'Top performer siap promosi',
        },
        {
          id: 2, employeeId: 'EMP-005', employeeName: 'Rudi Hartono', year: 2024,
          performanceScore: 4.0, competencyScore: 3.2,
          boxRow: 2, boxCol: 3, boxLabel: 'High Performer', notes: 'Perlu kembangkan kompetensi',
        },
        {
          id: 3, employeeId: 'EMP-006', employeeName: 'Rina Wulandari', year: 2024,
          performanceScore: 2.5, competencyScore: 2.0,
          boxRow: 1, boxCol: 2, boxLabel: 'Developing', notes: 'Butuh coaching intensif',
        },
        // Team of the demo Manager (Dewi Rahayu) so "9-Box Tim Saya" is populated.
        {
          id: 4, employeeId: '30', employeeName: 'Reza Firmansyah', year: 2026,
          performanceScore: 4.6, competencyScore: 4.7,
          boxRow: 3, boxCol: 3, boxLabel: 'Star', notes: 'Kandidat suksesor, siap promosi.',
        },
        {
          id: 5, employeeId: '32', employeeName: 'Hendro Cahyo', year: 2026,
          performanceScore: 4.4, competencyScore: 3.6,
          boxRow: 3, boxCol: 2, boxLabel: 'High Performer', notes: 'Konsisten, kembangkan kepemimpinan.',
        },
        {
          id: 6, employeeId: '31', employeeName: 'Tika Rahmawati', year: 2026,
          performanceScore: 3.6, competencyScore: 4.3,
          boxRow: 2, boxCol: 3, boxLabel: 'High Potential', notes: 'Potensi tinggi, beri stretch assignment.',
        },
        {
          id: 7, employeeId: '33', employeeName: 'Yuni Purnamasari', year: 2026,
          performanceScore: 3.5, competencyScore: 3.4,
          boxRow: 2, boxCol: 2, boxLabel: 'Core Player', notes: 'Pemain inti tim, jaga engagement.',
        },
      ],

      addTalentBox: (data) =>
        set(s => ({
          talentBoxes: [...s.talentBoxes, { ...data, id: genId() }],
        })),

      updateTalentBox: (id, patch) =>
        set(s => ({
          talentBoxes: s.talentBoxes.map(t => t.id === id ? { ...t, ...patch } : t),
        })),

      deleteTalentBox: (id) =>
        set(s => ({ talentBoxes: s.talentBoxes.filter(t => t.id !== id) })),

      // ── IDP ──────────────────────────────────────────────────────────────────
      idpList: [
        {
          id: 1, employeeId: 'EMP-004', employeeName: 'Dewi Lestari', year: 2024,
          status: 'Approved',
          items: [
            {
              id: 'idp-item-1', competencyType: 'Leadership', competencyName: 'Strategic Thinking',
              target: 4, actual: 3.5, gap: -0.5, condition: 'Butuh Dev',
              specificGoal: 'Mampu memimpin proyek strategis',
              courseRecommendation: 'Strategic Leadership Program',
              lmsLink: 'https://lms.example.com/strategic', ojt: 'Mentoring oleh GM',
              timeline: '2024-06', idpStatus: 'In Progress',
            },
          ],
          managerApproval: 'Approved', approvedAt: '2024-02-15', approvedBy: 'Manajer Divisi',
        },
        {
          id: 2, employeeId: 'EMP-005', employeeName: 'Rudi Hartono', year: 2024,
          status: 'Submitted',
          items: [
            {
              id: 'idp-item-2', competencyType: 'Technical', competencyName: 'Data Analysis',
              target: 3, actual: 2, gap: -1, condition: 'Butuh Dev',
              specificGoal: 'Mampu analisis data mandiri',
              courseRecommendation: 'Data Analytics Fundamentals',
              lmsLink: '', ojt: 'Project nyata dengan data tim', timeline: '2024-09', idpStatus: 'Planned',
            },
          ],
          managerApproval: 'Pending', approvedAt: null, approvedBy: null,
        },
        {
          id: 3, employeeId: 'EMP-006', employeeName: 'Rina Wulandari', year: 2024,
          status: 'Draft',
          items: [],
          managerApproval: null, approvedAt: null, approvedBy: null,
        },
      ],

      addIdp: (data) =>
        set(s => ({
          idpList: [...s.idpList, {
            ...data,
            id: genId(),
            status: 'Draft',
            items: [],
            managerApproval: null,
            approvedAt: null,
            approvedBy: null,
          }],
        })),

      updateIdp: (id, patch) =>
        set(s => ({
          idpList: s.idpList.map(i => i.id === id ? { ...i, ...patch } : i),
        })),

      approveIdp: (id, approvedBy) =>
        set(s => ({
          idpList: s.idpList.map(i =>
            i.id === id
              ? { ...i, status: 'Approved', managerApproval: 'Approved', approvedAt: new Date().toISOString(), approvedBy }
              : i
          ),
        })),

      // ── Talent Reviews ───────────────────────────────────────────────────────
      talentReviews: [
        {
          id: 1, keyPositionId: 1, positionName: 'General Manager Operations',
          meetingDate: '2024-03-10', attendees: 'Corporate Organization Development, HR Director, Div Head',
          successors: [
            { employeeId: 'EMP-004', name: 'Dewi Lestari', fitnessLevel: 'High', sdpTerm: 'Short', schedule: 'Q2 2024' },
            { employeeId: 'EMP-005', name: 'Rudi Hartono', fitnessLevel: 'Medium', sdpTerm: 'Mid', schedule: 'Q4 2024' },
          ],
          decision: 'Internal', notes: 'Dewi siap dalam 6 bulan',
        },
        {
          id: 2, keyPositionId: 2, positionName: 'Head of Finance',
          meetingDate: '2024-03-15', attendees: 'Corporate Organization Development, HR Director',
          successors: [
            { employeeId: 'EMP-006', name: 'Rina Wulandari', fitnessLevel: 'Low', sdpTerm: 'Long', schedule: '2025' },
          ],
          decision: 'External Hiring', notes: 'Belum ada kandidat internal siap jangka pendek',
        },
      ],

      addTalentReview: (data) =>
        set(s => ({
          talentReviews: [...s.talentReviews, { ...data, id: genId() }],
        })),

      updateTalentReview: (id, patch) =>
        set(s => ({
          talentReviews: s.talentReviews.map(r => r.id === id ? { ...r, ...patch } : r),
        })),

      deleteTalentReview: (id) =>
        set(s => ({ talentReviews: s.talentReviews.filter(r => r.id !== id) })),

      // ── SDP ──────────────────────────────────────────────────────────────────
      sdpList: [
        {
          id: 1, employeeId: 'EMP-004', employeeName: 'Dewi Lestari',
          targetPosition: 'General Manager Operations', vacancyRisk: 'Short',
          successorReadiness: 'Short',
          programs: [
            { type: 'Mentoring', name: 'Executive Mentoring with GM', timeline: 'Q2 2024', status: 'In Progress' },
            { type: 'Project', name: 'Lead Ops Improvement Project', timeline: 'Q3 2024', status: 'Planned' },
          ],
          careerPlan: 'Target promosi GM Q4 2024', status: 'Active',
        },
        {
          id: 2, employeeId: 'EMP-005', employeeName: 'Rudi Hartono',
          targetPosition: 'Head of Finance', vacancyRisk: 'Mid',
          successorReadiness: 'Mid',
          programs: [
            { type: 'Course', name: 'Finance for Leaders', timeline: 'Q3 2024', status: 'Planned' },
          ],
          careerPlan: 'Target promosi 2026', status: 'Active',
        },
        {
          id: 3, employeeId: 'EMP-006', employeeName: 'Rina Wulandari',
          targetPosition: 'Head of Finance', vacancyRisk: 'Short',
          successorReadiness: 'Long',
          programs: [
            { type: 'Course', name: 'Accounting Fundamentals', timeline: 'Q4 2024', status: 'Planned' },
            { type: 'Mentoring', name: 'Job Shadowing Finance', timeline: '2025', status: 'Planned' },
          ],
          careerPlan: 'Target promosi 2027', status: 'Active',
        },
      ],

      addSdp: (data) =>
        set(s => ({
          sdpList: [...s.sdpList, { ...data, id: genId(), programs: [], status: 'Active' }],
        })),

      updateSdp: (id, patch) =>
        set(s => ({
          sdpList: s.sdpList.map(r => r.id === id ? { ...r, ...patch } : r),
        })),

      deleteSdp: (id) =>
        set(s => ({ sdpList: s.sdpList.filter(r => r.id !== id) })),

      // ── Database Talent ──────────────────────────────────────────────────────
      databaseTalent: [
        {
          id: 1, employeeId: 'EMP-004', employeeName: 'Dewi Lestari',
          position: 'Senior Manager Operations', department: 'Operations',
          talentBoxLabel: 'Star', year: 2024, inTalentPool: true,
          addedAt: '2024-03-20',
          readinessLevel: 'Ready Now', flightRisk: 'Low', lastAssessmentDate: '2024-03-20',
          skills: 'Leadership, Strategic Planning, Operations',
        },
        {
          id: 2, employeeId: 'EMP-005', employeeName: 'Rudi Hartono',
          position: 'Finance Analyst', department: 'Finance',
          talentBoxLabel: 'High Performer', year: 2024, inTalentPool: true,
          addedAt: '2024-03-20',
          readinessLevel: '1-2 Year', flightRisk: 'Medium', lastAssessmentDate: '2024-03-20',
          skills: 'Data Analysis, Finance, Excel',
        },
      ],

      addToTalentDatabase: (data) =>
        set(s => ({
          databaseTalent: [...s.databaseTalent, {
            ...data,
            id: genId(),
            inTalentPool: true,
            addedAt: new Date().toISOString().split('T')[0],
          }],
        })),

      removeFromTalentDatabase: (id) =>
        set(s => ({ databaseTalent: s.databaseTalent.filter(d => d.id !== id) })),

      updateTalentDatabase: (id, patch) =>
        set(s => ({ databaseTalent: s.databaseTalent.map(d => d.id === id ? { ...d, ...patch } : d) })),

      // ── Database Successor ───────────────────────────────────────────────────
      databaseSuccessor: [
        {
          id: 1, employeeId: 'EMP-004', employeeName: 'Dewi Lestari',
          targetPositionId: 'POS-001', targetPositionName: 'General Manager Operations',
          fitnessLevel: 'High', sdpTerm: 'Short', addedAt: '2024-03-10',
        },
        {
          id: 2, employeeId: 'EMP-005', employeeName: 'Rudi Hartono',
          targetPositionId: 'POS-001', targetPositionName: 'General Manager Operations',
          fitnessLevel: 'Medium', sdpTerm: 'Mid', addedAt: '2024-03-10',
        },
        {
          id: 3, employeeId: 'EMP-006', employeeName: 'Rina Wulandari',
          targetPositionId: 'POS-002', targetPositionName: 'Head of Finance',
          fitnessLevel: 'Low', sdpTerm: 'Long', addedAt: '2024-03-15',
        },
      ],

      addToSuccessorDatabase: (data) =>
        set(s => ({
          databaseSuccessor: [...s.databaseSuccessor, {
            ...data,
            id: genId(),
            addedAt: new Date().toISOString().split('T')[0],
          }],
        })),

      removeFromSuccessorDatabase: (id) =>
        set(s => ({ databaseSuccessor: s.databaseSuccessor.filter(d => d.id !== id) })),

      updateSuccessorDatabase: (id, patch) =>
        set(s => ({
          databaseSuccessor: s.databaseSuccessor.map(d => d.id === id ? { ...d, ...patch } : d),
        })),

      // ── Career Paths ─────────────────────────────────────────────────────────
      careerPaths: [
        {
          id: 1, employeeId: 'EMP-004', employeeName: 'Dewi Lestari',
          currentPosition: 'Senior Manager Operations', currentPCLevel: 60,
          steps: [
            { id: 'cp-s-1', targetPosition: 'Deputy GM Operations', targetPCLevel: 62, direction: 'vertical', estimatedYears: 1.5, requirements: 'Selesaikan proyek transformasi ops Q3 2024', status: 'In Progress' },
            { id: 'cp-s-2', targetPosition: 'General Manager Operations', targetPCLevel: 65, direction: 'vertical', estimatedYears: 1, requirements: 'Capai KPI divisi 95%+, sertifikasi leadership', status: 'Planned' },
          ],
          createdAt: '2024-03-01', updatedAt: '2024-03-20',
        },
        {
          id: 2, employeeId: 'EMP-005', employeeName: 'Rudi Hartono',
          currentPosition: 'Finance Analyst', currentPCLevel: 54,
          steps: [
            { id: 'cp-s-3', targetPosition: 'Senior Finance Analyst', targetPCLevel: 56, direction: 'vertical', estimatedYears: 1, requirements: 'Selesaikan CPA, lead 1 proyek audit', status: 'Planned' },
            { id: 'cp-s-4', targetPosition: 'Finance Controller', targetPCLevel: 58, direction: 'vertical', estimatedYears: 2, requirements: 'Kelola tim minimal 3 orang', status: 'Planned' },
          ],
          createdAt: '2024-04-01', updatedAt: '2024-04-01',
        },
        {
          id: 3, employeeId: 'EMP-006', employeeName: 'Rina Wulandari',
          currentPosition: 'HR Specialist', currentPCLevel: 53,
          steps: [
            { id: 'cp-s-5', targetPosition: 'HR Business Partner', targetPCLevel: 55, direction: 'lateral', estimatedYears: 1.5, requirements: 'Sertifikasi CHRP, pengalaman rekrutmen senior', status: 'Planned' },
            { id: 'cp-s-6', targetPosition: 'HR Manager', targetPCLevel: 58, direction: 'vertical', estimatedYears: 2, requirements: 'Kelola 5+ proyek HR strategis', status: 'Planned' },
          ],
          createdAt: '2024-04-10', updatedAt: '2024-04-10',
        },
      ],

      addCareerPath: (data) =>
        set(s => ({
          careerPaths: [...s.careerPaths, {
            ...data,
            id: genId(),
            steps: [],
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
          }],
        })),

      updateCareerPath: (id, patch) =>
        set(s => ({
          careerPaths: s.careerPaths.map(c =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString().split('T')[0] } : c
          ),
        })),

      deleteCareerPath: (id) =>
        set(s => ({ careerPaths: s.careerPaths.filter(c => c.id !== id) })),

      addCareerStep: (pathId, step) =>
        set(s => ({
          careerPaths: s.careerPaths.map(c =>
            c.id === pathId
              ? { ...c, steps: [...c.steps, { ...step, id: `cp-s-${genId()}` }], updatedAt: new Date().toISOString().split('T')[0] }
              : c
          ),
        })),

      updateCareerStep: (pathId, stepId, patch) =>
        set(s => ({
          careerPaths: s.careerPaths.map(c =>
            c.id === pathId
              ? { ...c, steps: c.steps.map(st => st.id === stepId ? { ...st, ...patch } : st), updatedAt: new Date().toISOString().split('T')[0] }
              : c
          ),
        })),

      deleteCareerStep: (pathId, stepId) =>
        set(s => ({
          careerPaths: s.careerPaths.map(c =>
            c.id === pathId
              ? { ...c, steps: c.steps.filter(st => st.id !== stepId), updatedAt: new Date().toISOString().split('T')[0] }
              : c
          ),
        })),

      // ── Future Planning ──────────────────────────────────────────────────────
      futurePlanning: [
        {
          id: 1, positionId: 'POS-001', positionName: 'General Manager Operations',
          planYear: 2025, createdBy: 'Corporate Organization Development', notes: 'Persiapan pergantian GM Ops yang akan pensiun dini Q2 2025.',
          successors: [
            { employeeId: 'EMP-004', employeeName: 'Dewi Lestari', readiness: 'High', targetDate: '2025-06-30' },
            { employeeId: 'EMP-005', employeeName: 'Rudi Hartono', readiness: 'Medium', targetDate: '2025-12-31' },
          ],
          confidential: true, createdAt: '2024-01-10',
        },
        {
          id: 2, positionId: 'POS-002', positionName: 'Head of Finance',
          planYear: 2026, createdBy: 'Corporate Organization Development', notes: 'Siti Rahma berencana pindah ke anak perusahaan. Perlu kader pengganti.',
          successors: [
            { employeeId: 'EMP-006', employeeName: 'Rina Wulandari', readiness: 'Low', targetDate: '2026-06-30' },
          ],
          confidential: true, createdAt: '2024-01-15',
        },
        {
          id: 3, positionId: 'POS-003', positionName: 'VP Human Capital',
          planYear: 2025, createdBy: 'Corporate Organization Development', notes: 'Posisi baru hasil restrukturisasi organisasi.',
          successors: [],
          confidential: true, createdAt: '2024-02-01',
        },
      ],

      addFuturePlan: (data) =>
        set(s => ({
          futurePlanning: [...s.futurePlanning, {
            ...data,
            id: genId(),
            successors: [],
            confidential: true,
            createdAt: new Date().toISOString().split('T')[0],
          }],
        })),

      updateFuturePlan: (id, patch) =>
        set(s => ({
          futurePlanning: s.futurePlanning.map(p => p.id === id ? { ...p, ...patch } : p),
        })),

      deleteFuturePlan: (id) =>
        set(s => ({ futurePlanning: s.futurePlanning.filter(p => p.id !== id) })),

      addSuccessor: (planId, successor) =>
        set(s => ({
          futurePlanning: s.futurePlanning.map(p =>
            p.id === planId ? { ...p, successors: [...p.successors, { ...successor, employeeId: `EMP-${genId()}` }] } : p
          ),
        })),

      removeSuccessor: (planId, employeeId) =>
        set(s => ({
          futurePlanning: s.futurePlanning.map(p =>
            p.id === planId ? { ...p, successors: p.successors.filter(sc => sc.employeeId !== employeeId) } : p
          ),
        })),

      // ── Retention Risks ──────────────────────────────────────────────────────
      retentionRisks: [
        {
          id: 1, employeeId: 'EMP-001', employeeName: 'Budi Santoso',
          position: 'General Manager Operations', department: 'Operations',
          riskLevel: 'High', riskScore: 85,
          factors: [
            { factor: 'Gap to Retirement', value: '0.5 tahun', weight: 40, contribution: 40 },
            { factor: 'Kontrak Habis', value: '< 6 bulan', weight: 30, contribution: 30 },
            { factor: 'Career Plan Pindah/Resign', value: 'Pensiun dini', weight: 25, contribution: 15 },
          ],
          flaggedAt: '2024-01-16', action: 'Sudah dibicarakan oleh Corporate Organization Development, sedang cari pengganti.', actionBy: 'HR Director',
          resolved: false,
        },
        {
          id: 2, employeeId: 'EMP-002', employeeName: 'Siti Rahma',
          position: 'Head of Finance', department: 'Finance',
          riskLevel: 'Medium', riskScore: 55,
          factors: [
            { factor: 'Career Plan Pindah/Resign', value: 'Pindah ke anak perusahaan', weight: 25, contribution: 25 },
            { factor: 'Tenure Tanpa Promosi', value: '11 tahun', weight: 20, contribution: 20 },
            { factor: 'Kontrak Habis', value: '> 1 tahun', weight: 30, contribution: 10 },
          ],
          flaggedAt: '2024-01-21', action: 'Pantau rencana karir, pertimbangkan rotasi strategis.', actionBy: 'HR Manager',
          resolved: false,
        },
        {
          id: 3, employeeId: 'EMP-007', employeeName: 'Hendra Kusuma',
          position: 'IT Infrastructure Lead', department: 'IT',
          riskLevel: 'High', riskScore: 70,
          factors: [
            { factor: 'Kontrak Habis', value: '< 6 bulan', weight: 30, contribution: 30 },
            { factor: 'Tenure Tanpa Promosi', value: '12 tahun', weight: 20, contribution: 20 },
            { factor: 'Gap to Retirement', value: '2 tahun', weight: 40, contribution: 20 },
          ],
          flaggedAt: '2024-02-05', action: 'Sudah direnewkan kontrak per Maret 2024.', actionBy: 'HR PT',
          resolved: true,
        },
      ],

      addRetentionRisk: (data) =>
        set(s => ({
          retentionRisks: [...s.retentionRisks, {
            ...data,
            id: genId(),
            flaggedAt: new Date().toISOString().split('T')[0],
            resolved: false,
          }],
        })),

      updateRetentionRisk: (id, patch) =>
        set(s => ({
          retentionRisks: s.retentionRisks.map(r => r.id === id ? { ...r, ...patch } : r),
        })),

      deleteRetentionRisk: (id) =>
        set(s => ({ retentionRisks: s.retentionRisks.filter(r => r.id !== id) })),

      resolveRetentionRisk: (id, actionBy, action) =>
        set(s => ({
          retentionRisks: s.retentionRisks.map(r =>
            r.id === id ? { ...r, resolved: true, action, actionBy } : r
          ),
        })),
    }),
    { name: 'hcm-talent-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
