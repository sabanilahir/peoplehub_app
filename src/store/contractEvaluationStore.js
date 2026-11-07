import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _id = 1

const CORE_VALUES = () => [
  { id: _id++, no: 1, aspect: 'Strive for Excellence', keyBehaviors: 'Selalu berupaya memberikan yang terbaik dalam setiap pekerjaan dan terus meningkatkan standar kualitas secara berkelanjutan.', rating: null },
  { id: _id++, no: 2, aspect: 'Act Professionally',    keyBehaviors: 'Berperilaku profesional, jujur, dan berintegritas dalam setiap interaksi dan pengambilan keputusan.', rating: null },
  { id: _id++, no: 3, aspect: 'Deal with Care',        keyBehaviors: 'Peduli terhadap kebutuhan pelanggan, rekan kerja, dan lingkungan dengan penuh empati dan tanggung jawab.', rating: null },
]

const CORE_COMPETENCY = () => [
  { id: _id++, no: 1, aspect: 'Alliance Management', keyBehaviors: 'Membangun dan memelihara hubungan kerja sama yang efektif dengan berbagai pihak internal dan eksternal.', rating: null },
  { id: _id++, no: 2, aspect: 'Change Management',   keyBehaviors: 'Mampu beradaptasi dan mendukung perubahan organisasi secara proaktif dan positif.', rating: null },
  { id: _id++, no: 3, aspect: 'Innovation',          keyBehaviors: 'Menghasilkan ide-ide baru dan solusi kreatif yang memberikan nilai tambah bagi perusahaan.', rating: null },
  { id: _id++, no: 4, aspect: 'Resource Management', keyBehaviors: 'Mengelola sumber daya yang tersedia secara efektif, efisien, dan bertanggung jawab.', rating: null },
]

const STRATEGIC_LEADERSHIP = () => [
  { id: _id++, no: 1, aspect: 'Strategic Thinking',    keyBehaviors: 'Berpikir jangka panjang dan memahami implikasi strategis dari setiap keputusan bisnis.', rating: null },
  { id: _id++, no: 2, aspect: 'People Development',    keyBehaviors: 'Mengembangkan, memotivasi, dan memberdayakan tim untuk mencapai potensi dan kinerja terbaik.', rating: null },
  { id: _id++, no: 3, aspect: 'Decision Making',       keyBehaviors: 'Mengambil keputusan yang tepat dan berani berdasarkan analisis data, risiko, dan situasi.', rating: null },
  { id: _id++, no: 4, aspect: 'Stakeholder Management',keyBehaviors: 'Mengelola hubungan dan ekspektasi pemangku kepentingan secara efektif dan strategis.', rating: null },
]

const TECHNICAL_COMPETENCY = () => [
  { id: _id++, no: 1, aspect: 'Technical Knowledge',        keyBehaviors: 'Memiliki pengetahuan teknis yang memadai sesuai dengan tuntutan posisi dan tanggung jawab pekerjaan.', rating: null },
  { id: _id++, no: 2, aspect: 'Process & Procedure',        keyBehaviors: 'Memahami dan menerapkan SOP/WI yang berlaku dalam pelaksanaan tugas dan pekerjaan sehari-hari.', rating: null },
  { id: _id++, no: 3, aspect: 'Quality & Compliance',       keyBehaviors: 'Menjaga standar kualitas dan kepatuhan terhadap regulasi serta ketentuan perusahaan.', rating: null },
  { id: _id++, no: 4, aspect: 'Digital & System Proficiency',keyBehaviors: 'Mampu menggunakan sistem dan teknologi digital yang dibutuhkan untuk mendukung pekerjaan secara optimal.', rating: null },
]

export const useContractEvaluationStore = create(persist(
  (set, get) => ({
    evaluations: [],

    ensureEvaluation(emp, profile = null) {
      const exists = get().evaluations.find(ev => ev.employeeId === emp.id)
      if (exists) return exists

      const fromProfile = (arr) => (arr || []).map((item, i) => ({
        id: _id++, no: i + 1,
        aspect: item.aspect ?? '', keyBehaviors: item.keyBehaviors ?? '', rating: null,
      }))

      const ev = {
        id: _id++,
        employeeId:   emp.id,
        employeeName: emp.name,
        positionId:   emp.positionId,
        joinDate:     emp.joinDate,
        managerId:    emp.managerId,
        legalEntity:      '',
        documentNumber:   '',
        revision:         '',
        classification:   '',
        effectiveDate:    '',
        coreValues:          CORE_VALUES(),
        coreCompetency:      profile?.coreCompetency?.length      ? fromProfile(profile.coreCompetency)      : CORE_COMPETENCY(),
        strategicLeadership: profile?.strategicLeadership?.length ? fromProfile(profile.strategicLeadership) : STRATEGIC_LEADERSHIP(),
        technicalCompetency: profile?.technicalCompetency?.length ? fromProfile(profile.technicalCompetency) : TECHNICAL_COMPETENCY(),
        finalDecision:       '',
        extendMonths:        '',
        finalEffectiveDate:  '',
        strength:            '',
        areaDevelopment:     '',
        status:          'Pending',
        submittedAt:     null,
        submittedById:   null,
        submittedByName: null,
      }
      set(s => ({ evaluations: [...s.evaluations, ev] }))
      return ev
    },

    syncFromProfile(evalId, profile) {
      if (!profile) return
      const ev = get().evaluations.find(e => e.id === evalId)
      if (!ev || ev.status === 'Submitted') return

      const merge = (profileItems, existingItems) => {
        if (!profileItems?.length) return existingItems
        return profileItems.map((item, i) => ({
          id:           existingItems[i]?.id ?? _id++,
          no:           i + 1,
          aspect:       item.aspect       ?? '',
          keyBehaviors: item.keyBehaviors ?? '',
          rating:       existingItems[i]?.rating ?? null,
        }))
      }

      set(s => ({
        evaluations: s.evaluations.map(e =>
          e.id !== evalId ? e : {
            ...e,
            coreCompetency:      merge(profile.coreCompetency,      e.coreCompetency),
            strategicLeadership: merge(profile.strategicLeadership, e.strategicLeadership),
            technicalCompetency: merge(profile.technicalCompetency, e.technicalCompetency),
          }
        )
      }))
    },

    updateEvaluation(id, data) {
      set(s => ({
        evaluations: s.evaluations.map(ev => ev.id === id ? { ...ev, ...data } : ev)
      }))
    },

    submitEvaluation(id, userId, userName) {
      set(s => ({
        evaluations: s.evaluations.map(ev =>
          ev.id === id
            ? { ...ev, status: 'Submitted', submittedAt: new Date().toISOString(), submittedById: userId, submittedByName: userName }
            : ev
        )
      }))
    },
  }),
  { name: 'contract-evaluation-store', storage: createJSONStorage(() => dbStorage) }
))
