// ── Onboarding item Type LOV + Link column behaviour ─────────────────────────
// A single source of truth for the agenda item "Type" list and how the
// "Link / Reference" column should behave for each type. Shared by the master
// template builder and the onboarding tracker so both stay in sync.

export const TYPE_LOV = [
  'Manual Task',
  'Video',
  'Document (Attachment)',
  'Report',
  'Application Task',
  'External URL',
  'Electronic Signature',
  'Questionnaire',
  'Configurable Form',
  'Learning Course',
]

// How the Link column resolves per type:
//   'url'       → free-text field with a context-specific placeholder
//   'lov-batch' → dropdown of Learning course batches
//   'lov-form'  → dropdown of active master forms
//   'none'      → no input (either not needed, or configured elsewhere)
export const LINK_MODE = {
  'Manual Task':           { mode: 'none',      hint: 'Tidak perlu link',                    hintEN: 'No link needed' },
  'Video':                 { mode: 'url',       placeholder: 'Link video (YouTube, Vimeo…)', placeholderEN: 'Video link (YouTube, Vimeo…)' },
  'Document (Attachment)': { mode: 'url',       placeholder: 'Link / URL dokumen…',          placeholderEN: 'Document link / URL…' },
  'Report':                { mode: 'url',       placeholder: 'Link template laporan…',       placeholderEN: 'Report template link…' },
  'Application Task':      { mode: 'url',       placeholder: 'Link aplikasi / modul…',       placeholderEN: 'App / module link…' },
  'External URL':          { mode: 'url',       placeholder: 'https://…',                    placeholderEN: 'https://…' },
  'Electronic Signature':  { mode: 'url',       placeholder: 'Link dokumen untuk ditandatangani…', placeholderEN: 'Document link to sign…' },
  'Questionnaire':         { mode: 'lov-form' },
  'Configurable Form':     { mode: 'none',      hint: 'Diatur di panel form di bawah',       hintEN: 'Configured in the form panel below' },
  'Learning Course':       { mode: 'lov-batch' },
}

export const linkModeFor = (type) =>
  LINK_MODE[type] || { mode: 'url', placeholder: 'https://…', placeholderEN: 'https://…' }
