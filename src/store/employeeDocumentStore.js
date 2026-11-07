import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Personal documents per employee (KTP, ijazah, kontrak kerja, dll).
//
// Files are stored as data URLs directly in this store's JSON blob — the
// same approach the employee photo already uses (see employeeStore.setPhoto)
// — rather than a real object-storage backend, which this prototype doesn't
// have. That's fine at demo scale, but every store's data is primed in ONE
// shared /api/state request on load (see dbStorage.js), so large files here
// add weight to every page load, not just this one. DOCUMENT_MAX_BYTES below
// keeps that in check; raise it only alongside real file storage.

// The available categories and which extra fields each one asks for are
// configured under System Admin > Settings > Master Document Types
// (documentTypeStore), not hardcoded here.

export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

let _id = 1

export const useEmployeeDocumentStore = create(persist(
  (set, get) => ({
    // { id, employeeId, category, fileName, fileType, fileSize, dataUrl,
    //   issuedDate, effectiveStartDate, effectiveEndDate, note, customFieldValue,
    //   uploadedAt, uploadedBy, uploadedByName }
    documents: [],

    documentsFor: (employeeId) => get().documents
      .filter(d => d.employeeId === employeeId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),

    addDocument: (doc) => set(s => ({ documents: [...s.documents, { id: _id++, ...doc }] })),
    deleteDocument: (id) => set(s => ({ documents: s.documents.filter(d => d.id !== id) })),
  }),
  {
    name: 'hcm-employee-documents-v1',
    storage: createJSONStorage(() => dbStorage),
    onRehydrateStorage: () => (state) => {
      if (state?.documents?.length) _id = Math.max(0, ...state.documents.map(d => d.id)) + 1
    },
  },
))
