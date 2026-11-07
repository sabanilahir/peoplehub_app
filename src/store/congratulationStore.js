import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const BLANK = {
  contributors:          ['', '', '', '', ''],
  messageToContributors: '',
  messageOfSupport:      '',
}

export const useCongratulationStore = create(persist(
  (set, get) => ({
    messages: {},

    getMessage: (employeeId) =>
      get().messages[employeeId] ?? { ...BLANK, contributors: ['', '', '', ''] },

    saveMessage: (employeeId, data) =>
      set(s => ({
        messages: {
          ...s.messages,
          [employeeId]: { ...(s.messages[employeeId] ?? {}), ...data },
        },
      })),
  }),
  { name: 'hcm-congratulation-v1', storage: createJSONStorage(() => dbStorage) }
))
