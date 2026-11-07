import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const SEED = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Budi Santoso',
    managerId: 2,
    managerName: 'Ahmad Fauzi',
    date: '2025-06-10',
    status: 'Completed',
    createdBy: 'employee',
    employeeAnswers: {
      topic:      'Diskusi target Q3 dan kendala yang dihadapi saat ini',
      goal:       'Mendapatkan clarity tentang prioritas pekerjaan Q3 dan dukungan yang dibutuhkan',
      reality:    'Saat ini merasa overload dengan 3 proyek berjalan bersamaan, sulit fokus',
      options:    'Delegasi sebagian tugas ke junior, atau reschedule deadline salah satu proyek',
      wayForward: 'Akan mendelegasikan laporan bulanan ke Rizky, dan reschedule proyek C ke minggu depan',
    },
    managerAnswers: {
      topic:      'Manajemen beban kerja dan prioritas Q3',
      goal:       'Membantu Budi mencapai keseimbangan workload agar semua proyek berjalan lancar',
      reality:    'Tim cukup solid, namun pembagian tugas belum optimal di antara senior dan junior',
      options:    'Redistribusi task, review jadwal proyek, atau tambah resource sementara',
      wayForward: 'Setuju dengan rencana delegasi. Saya akan bantu koordinasi dengan tim C untuk reschedule.',
    },
    submittedAt:     '2025-06-10T09:00:00+07:00',
    managerFilledAt: '2025-06-10T14:30:00+07:00',
    employeeFilledAt: '2025-06-10T09:00:00+07:00',
  },
  {
    id: 2,
    employeeId: 1,
    employeeName: 'Budi Santoso',
    managerId: 2,
    managerName: 'Ahmad Fauzi',
    date: '2025-05-15',
    status: 'Completed',
    createdBy: 'employee',
    employeeAnswers: {
      topic:      'Review performance mid-year dan rencana pengembangan',
      goal:       'Memastikan track untuk mencapai target tahunan dan skill yang perlu dikembangkan',
      reality:    'Performance on-track, tapi merasa perlu upgrade skill leadership untuk jenjang karir',
      options:    'Ikut program leadership, atau mentoring dari senior manager',
      wayForward: 'Daftarkan ke Leadership Fundamentals L1 bulan depan',
    },
    managerAnswers: {
      topic:      'Mid-year performance review dan pengembangan leadership',
      goal:       'Mendukung Budi dalam mencapai target tahunan dan mempersiapkan diri ke jenjang berikutnya',
      reality:    'Performance Budi sangat baik, potensi leadership terlihat jelas',
      options:    'Program Leadership Fundamentals L1, atau proyek lintas divisi sebagai stretch assignment',
      wayForward: 'Bagus! Saya akan rekomendasikan ke HR untuk enrollment Leadership Fundamentals L1.',
    },
    submittedAt:     '2025-05-15T10:00:00+07:00',
    managerFilledAt: '2025-05-15T15:00:00+07:00',
    employeeFilledAt: '2025-05-15T10:00:00+07:00',
  },
  {
    id: 3,
    employeeId: 1,
    employeeName: 'Budi Santoso',
    managerId: 2,
    managerName: 'Ahmad Fauzi',
    date: '2025-06-18',
    status: 'Pending Manager',
    createdBy: 'employee',
    employeeAnswers: {
      topic:      'Persiapan presentasi proyek akhir Q2',
      goal:       'Mendapat masukan sebelum presentasi ke stakeholder minggu depan',
      reality:    'Draft sudah siap tapi masih kurang percaya diri soal materi teknis',
      options:    'Latihan presentasi dulu, atau minta review dari tim teknis',
      wayForward: 'Akan latihan internal dengan tim hari Jumat sebelum presentasi',
    },
    managerAnswers: null,
    submittedAt:     '2025-06-18T08:30:00+07:00',
    managerFilledAt: null,
    employeeFilledAt: '2025-06-18T08:30:00+07:00',
  },
]

export const useHayStore = create(
  persist(
    (set, get) => ({
      sessions: SEED,

      submitHay: (data) => {
        const { topic, goal, reality, options, wayForward, dueDate, ...rest } = data
        const newSession = {
          id: Date.now(),
          status: 'Pending Manager',
          createdBy: 'employee',
          submittedAt: new Date().toISOString(),
          employeeFilledAt: new Date().toISOString(),
          managerFilledAt: null,
          dueDate: dueDate || null,
          round: 1,
          clarifications: [],
          actionItems: [],
          signedOffEmployee: false,
          signedOffManager: false,
          signedOffAt: null,
          confidential: true, // HR sees aggregate/metadata only unless escalated
          employeeAnswers: { topic, goal, reality, options, wayForward },
          managerAnswers: null,
          ...rest,
        }
        set(s => ({ sessions: [newSession, ...s.sessions] }))
        return newSession.id
      },

      submitHayByManager: (data) => {
        const { topic, goal, reality, options, wayForward, dueDate, ...rest } = data
        const newSession = {
          id: Date.now(),
          status: 'Pending Employee',
          createdBy: 'manager',
          submittedAt: new Date().toISOString(),
          managerFilledAt: new Date().toISOString(),
          employeeFilledAt: null,
          dueDate: dueDate || null,
          round: 1,
          clarifications: [],
          actionItems: [],
          signedOffEmployee: false,
          signedOffManager: false,
          signedOffAt: null,
          confidential: true,
          managerAnswers: { topic, goal, reality, options, wayForward },
          employeeAnswers: null,
          ...rest,
        }
        set(s => ({ sessions: [newSession, ...s.sessions] }))
        return newSession.id
      },

      fillManagerAnswers: (id, answers) => {
        set(s => ({
          sessions: s.sessions.map(h =>
            h.id === id
              ? { ...h, managerAnswers: answers, status: 'Completed', managerFilledAt: new Date().toISOString() }
              : h
          ),
        }))
      },

      fillEmployeeAnswers: (id, answers) => {
        set(s => ({
          sessions: s.sessions.map(h =>
            h.id === id
              ? { ...h, employeeAnswers: answers, status: 'Completed', employeeFilledAt: new Date().toISOString() }
              : h
          ),
        }))
      },

      // Either party asks the other to clarify/revise → reopens for another round.
      requestClarification: (id, by, note) =>
        set(s => ({
          sessions: s.sessions.map(h => {
            if (h.id !== id) return h
            const askEmployee = by === 'manager' // manager asks employee to revise
            return {
              ...h,
              status: askEmployee ? 'Pending Employee' : 'Pending Manager',
              round: (h.round || 1) + 1,
              clarifications: [...(h.clarifications || []), { by, note: note || '', at: new Date().toISOString() }],
              signedOffEmployee: false,
              signedOffManager: false,
            }
          }),
        })),

      // Turn agreed Way Forward into trackable action items.
      setActionItems: (id, items) =>
        set(s => ({
          sessions: s.sessions.map(h => h.id === id ? { ...h, actionItems: items } : h),
        })),

      toggleActionItem: (id, itemIdx) =>
        set(s => ({
          sessions: s.sessions.map(h => h.id === id
            ? { ...h, actionItems: (h.actionItems || []).map((a, i) => i === itemIdx ? { ...a, done: !a.done } : a) }
            : h),
        })),

      // Mutual sign-off; session is fully closed only when both parties sign.
      signOffHay: (id, party) =>
        set(s => ({
          sessions: s.sessions.map(h => {
            if (h.id !== id) return h
            const next = { ...h, [party === 'manager' ? 'signedOffManager' : 'signedOffEmployee']: true }
            if (next.signedOffEmployee && next.signedOffManager) next.signedOffAt = new Date().toISOString()
            return next
          }),
        })),

      getByEmployee: (employeeId) =>
        get().sessions.filter(h => h.employeeId === employeeId),

      getByManager: (managerId) =>
        get().sessions.filter(h => h.managerId === managerId),
    }),
    { name: 'hay-store-v3', storage: createJSONStorage(() => dbStorage) }
  )
)
