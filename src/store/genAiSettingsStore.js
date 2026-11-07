import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Three commercial modes for the Gen AI features (e.g. job description
// generation on Job Requisition):
//   off      — feature hidden entirely.
//   byok     — customer brings their own LLM connector (their API key, their
//              provider bill); Rans PeopleHub only orchestrates the call.
//   embedded — Rans PeopleHub's own LLM connector, metered and billed to the
//              customer (a revenue line for Rans PeopleHub itself).
// Configured under System Admin > Settings > Gen AI.
export const GEN_AI_MODES = ['off', 'byok', 'embedded']
export const GEN_AI_PROVIDERS = ['Anthropic', 'OpenAI', 'Google']

export const useGenAiSettingsStore = create(persist(
  (set) => ({
    mode: 'off',

    // BYOK connector — customer's own key.
    provider: 'Anthropic',
    apiKey: '',
    model: 'claude-sonnet-5',

    // Embedded connector — Rans PeopleHub's own key, metered per customer.
    creditsLimit: 50,
    creditsUsed: 0,

    setConfig: (patch) => set(patch),
    useCredit: (n = 1) => set(s => ({ creditsUsed: Math.min(s.creditsLimit, s.creditsUsed + n) })),
    resetUsage: () => set({ creditsUsed: 0 }),
  }),
  { name: 'hcm-gen-ai-settings-v1', storage: createJSONStorage(() => dbStorage) },
))
