import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Documents attached to a candidate application (CV, ijazah, KTP, dll.) —
// separate from employeeDocumentStore since a candidate isn't an employee
// yet. Which document types exist (and which are mandatory) still comes
// from the same Master Document Types configured under System Admin >
// Settings > Master Document Types (documentTypeStore).

export const CANDIDATE_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

let _id = 1

export const useCandidateDocumentStore = create(persist(
  (set, get) => ({
    // { id, candidateId, category, fileName, fileType, fileSize, dataUrl, uploadedAt }
    documents: [],

    documentsFor: (candidateId) => get().documents
      .filter(d => d.candidateId === candidateId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),

    addDocument: (doc) => set(s => ({ documents: [...s.documents, { id: _id++, ...doc }] })),
    deleteDocument: (id) => set(s => ({ documents: s.documents.filter(d => d.id !== id) })),
  }),
  {
    name: 'hcm-candidate-documents-v1',
    storage: createJSONStorage(() => dbStorage),
    onRehydrateStorage: () => (state) => {
      if (state?.documents?.length) _id = Math.max(0, ...state.documents.map(d => d.id)) + 1
    },
  },
))
