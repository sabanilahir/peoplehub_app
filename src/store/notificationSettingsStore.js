import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Variables available in the "Candidate Applied" template — resolved with
// real candidate/requisition data at send time. Keep this list in sync with
// resolveTemplate() below and with what the Career Site apply flow actually
// has on hand.
export const CANDIDATE_APPLY_VARIABLES = [
  { key: 'candidateName', label: 'Nama Kandidat', sample: 'Budi Santoso' },
  { key: 'email',         label: 'Email Kandidat', sample: 'budi.santoso@email.com' },
  { key: 'phone',         label: 'Nomor Telepon', sample: '0812-3456-7890' },
  { key: 'positionTitle', label: 'Posisi yang Dilamar', sample: 'Software Engineer' },
  { key: 'departmentName',label: 'Departemen', sample: 'Frontend' },
  { key: 'companyName',   label: 'Perusahaan', sample: 'PT Nusantara Teknologi' },
  { key: 'appliedDate',   label: 'Tanggal Melamar', sample: '2026-09-24' },
]

const DEFAULT_SUBJECT = 'Lamaran Anda Diterima — {{positionTitle}}'
const DEFAULT_BODY = `Halo {{candidateName}},

Terima kasih telah melamar untuk posisi {{positionTitle}} di {{companyName}}. Lamaran Anda sudah kami terima pada {{appliedDate}} dan akan segera ditinjau oleh tim rekrutmen kami.

Kami akan menghubungi Anda kembali melalui email ini jika profil Anda sesuai dengan kebutuhan posisi tersebut.

Salam,
Tim Rekrutmen {{companyName}}`

// Fills {{variable}} placeholders in a subject/body string with real values —
// shared by the live preview in Notification Setup and the actual send from
// the Career Site apply flow, so what admins preview is exactly what goes out.
export function resolveTemplate(text, values) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? String(values[key] ?? '') : match))
}

let _logId = 1

export const useNotificationSettingsStore = create(persist(
  (set) => ({
    candidateApply: {
      subject: DEFAULT_SUBJECT,
      body: DEFAULT_BODY,
      active: true,
    },
    logs: [], // { id, to, subject, body, candidateName, positionTitle, sentAt }

    setSubject: (v) => set(s => ({ candidateApply: { ...s.candidateApply, subject: v } })),
    setBody:    (v) => set(s => ({ candidateApply: { ...s.candidateApply, body: v } })),
    setActive:  (v) => set(s => ({ candidateApply: { ...s.candidateApply, active: v } })),

    addLog: (entry) => set(s => ({ logs: [{ id: _logId++, sentAt: new Date().toISOString(), ...entry }, ...s.logs] })),
  }),
  { name: 'hcm-notification-settings-v1', storage: createJSONStorage(() => dbStorage) }
))
