import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Psychotest question bank + test packages — configured under HR
// Administration > Recruitment > Psychotest. A Test is just a named,
// timed bundle of questions picked from the bank; candidates take one via
// a token link generated when HR assigns it (see psychotestAttemptStore).

export const QUESTION_TYPES = ['Pilihan Ganda', 'Skala Likert']
export const QUESTION_CATEGORIES = ['Logika', 'Verbal', 'Numerik', 'Kepribadian', 'Lainnya']

// Fixed 5-point scale for 'Skala Likert' questions — personality/attitude
// items with no right answer, so unlike Pilihan Ganda they don't carry a
// per-option score and never contribute to a test's max score.
export const LIKERT_SCALE = [
  { value: 1, label: 'Sangat Tidak Setuju' },
  { value: 2, label: 'Tidak Setuju' },
  { value: 3, label: 'Netral' },
  { value: 4, label: 'Setuju' },
  { value: 5, label: 'Sangat Setuju' },
]

const SEED_QUESTIONS = [
  { id: 1, category: 'Logika', type: 'Pilihan Ganda', active: true,
    questionText: 'Jika semua Kucing adalah Hewan, dan sebagian Hewan adalah Peliharaan, maka...',
    options: [
      { id: 1, text: 'Semua Kucing pasti Peliharaan', score: 0 },
      { id: 2, text: 'Sebagian Kucing mungkin Peliharaan', score: 10 },
      { id: 3, text: 'Tidak ada Kucing yang Peliharaan', score: 0 },
      { id: 4, text: 'Semua Peliharaan adalah Kucing', score: 0 },
    ] },
  { id: 2, category: 'Numerik', type: 'Pilihan Ganda', active: true,
    questionText: 'Lanjutkan deret: 2, 4, 8, 16, ...',
    options: [
      { id: 1, text: '20', score: 0 },
      { id: 2, text: '24', score: 0 },
      { id: 3, text: '32', score: 10 },
      { id: 4, text: '30', score: 0 },
    ] },
  { id: 3, category: 'Kepribadian', type: 'Skala Likert', active: true,
    questionText: 'Saya lebih suka bekerja dalam tim dibanding sendirian.', options: [] },
  { id: 4, category: 'Kepribadian', type: 'Skala Likert', active: true,
    questionText: 'Saya tetap tenang saat menghadapi tekanan pekerjaan.', options: [] },
  { id: 5, category: 'Verbal', type: 'Pilihan Ganda', active: true,
    questionText: 'Sinonim dari kata "Efisien" adalah...',
    options: [
      { id: 1, text: 'Boros', score: 0 },
      { id: 2, text: 'Hemat', score: 10 },
      { id: 3, text: 'Lambat', score: 0 },
      { id: 4, text: 'Rumit', score: 0 },
    ] },
]

const SEED_TESTS = [
  { id: 1, name: 'Tes Dasar (Logika, Numerik, Verbal)', description: 'Tes kemampuan dasar untuk screening awal kandidat.',
    durationMinutes: 20, questionIds: [1, 2, 5], active: true },
  { id: 2, name: 'Tes Kepribadian Kerja', description: 'Menilai gaya kerja dan kecocokan budaya (tidak ada jawaban benar/salah).',
    durationMinutes: 10, questionIds: [3, 4], active: true },
]

let _qId = SEED_QUESTIONS.length + 1
let _tId = SEED_TESTS.length + 1

export const usePsychotestStore = create(persist(
  (set, get) => ({
    questions: SEED_QUESTIONS.map(q => ({ ...q, options: q.options.map(o => ({ ...o })) })),
    tests: SEED_TESTS.map(t => ({ ...t, questionIds: [...t.questionIds] })),

    addQuestion: (q) => set(s => ({
      questions: [...s.questions, { id: _qId++, active: true, options: [], ...q }],
    })),
    updateQuestion: (id, patch) => set(s => ({
      questions: s.questions.map(q => q.id === id ? { ...q, ...patch } : q),
    })),
    deleteQuestion: (id) => set(s => ({
      questions: s.questions.filter(q => q.id !== id),
      tests: s.tests.map(t => ({ ...t, questionIds: t.questionIds.filter(qid => qid !== id) })),
    })),

    addTest: (t) => set(s => ({
      tests: [...s.tests, { id: _tId++, active: true, questionIds: [], ...t }],
    })),
    updateTest: (id, patch) => set(s => ({
      tests: s.tests.map(t => t.id === id ? { ...t, ...patch } : t),
    })),
    deleteTest: (id) => set(s => ({ tests: s.tests.filter(t => t.id !== id) })),
  }),
  {
    name: 'hcm-psychotest-v1',
    storage: createJSONStorage(() => dbStorage),
    onRehydrateStorage: () => (state) => {
      if (state?.questions?.length) _qId = Math.max(0, ...state.questions.map(q => q.id)) + 1
      if (state?.tests?.length) _tId = Math.max(0, ...state.tests.map(t => t.id)) + 1
    },
  },
))
