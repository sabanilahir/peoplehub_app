export const FIELD_TYPES = [
  { value: 'text',      label: 'Text (satu baris)' },
  { value: 'textarea',  label: 'Textarea (panjang)' },
  { value: 'number',    label: 'Number' },
  { value: 'date',      label: 'Date' },
  { value: 'dropdown',  label: 'Dropdown' },
  { value: 'checkbox',  label: 'Checkbox (ya/tidak)' },
  { value: 'radio',     label: 'Pilihan Ganda' },
]

export function newField() {
  return { id: `f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, label: '', type: 'text', required: false, options: '' }
}

// Returns true if all required fields have a value in response object
export function validateResponse(schema = [], response = {}) {
  return schema.filter(f => f.required).every(f => {
    const v = response[f.id]
    return v !== undefined && v !== '' && v !== false && v !== null
  })
}
