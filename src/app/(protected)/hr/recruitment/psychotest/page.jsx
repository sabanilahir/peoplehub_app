'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { usePsychotestStore, QUESTION_TYPES, QUESTION_CATEGORIES, LIKERT_SCALE } from '@/store/psychotestStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, FilterBar, FilterPill,
  ActionButton, StatusBadge, EmptyState, FormField, Input, Select, inputClass,
} from '@/components/ui'

let _optSeq = 1
const newOption = () => ({ id: `new-${_optSeq++}`, text: '', score: 0 })

const emptyQuestionForm = () => ({
  category: QUESTION_CATEGORIES[0], type: QUESTION_TYPES[0], questionText: '', active: true,
  options: [newOption(), newOption()],
})
const emptyTestForm = () => ({
  name: '', description: '', durationMinutes: 20, questionIds: [], active: true,
})

// ── Import / Export (Bank Soal) ─────────────────────────────────────────
// Wide, fixed-column layout so a round trip (export → edit in Excel →
// import) works reliably: every row has the same Opsi/Skor N columns
// regardless of question type, blank ones are just ignored on import.
const MAX_OPTIONS = 6
const IMPORT_HEADERS = ['Kategori', 'Tipe', 'Pertanyaan', 'Aktif',
  ...Array.from({ length: MAX_OPTIONS }, (_, i) => [`Opsi ${i + 1}`, `Skor ${i + 1}`]).flat()]

const questionToRow = (q) => {
  const row = { Kategori: q.category, Tipe: q.type, Pertanyaan: q.questionText, Aktif: q.active ? 'Ya' : 'Tidak' }
  for (let i = 0; i < MAX_OPTIONS; i++) {
    const opt = q.options[i]
    row[`Opsi ${i + 1}`] = opt ? opt.text : ''
    row[`Skor ${i + 1}`] = opt ? opt.score : ''
  }
  return row
}

const TEMPLATE_ROWS = [
  questionToRow({ category: 'Logika', type: 'Pilihan Ganda', questionText: 'Contoh: 2 + 2 = ?', active: true,
    options: [{ text: '3', score: 0 }, { text: '4', score: 10 }, { text: '5', score: 0 }] }),
  questionToRow({ category: 'Kepribadian', type: 'Skala Likert', questionText: 'Contoh: Saya nyaman bekerja di bawah tekanan.', active: true, options: [] }),
]

const downloadWorkbook = (rows, filename) => {
  const ws = XLSX.utils.json_to_sheet(rows, { header: IMPORT_HEADERS })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bank Soal')
  XLSX.writeFile(wb, filename)
}

// Parses one imported row into a question payload, or an error string —
// never both, so the caller can just branch on which key is present.
const parseImportRow = (row, rowNum, t) => {
  const category = String(row['Kategori'] || '').trim()
  const type = String(row['Tipe'] || '').trim()
  const questionText = String(row['Pertanyaan'] || '').trim()
  const activeRaw = String(row['Aktif'] ?? '').trim().toLowerCase()
  const active = activeRaw === '' || ['ya', 'yes', 'true', '1'].includes(activeRaw)

  if (!QUESTION_CATEGORIES.includes(category)) {
    return { error: t(`Baris ${rowNum}: kategori "${category}" tidak dikenali.`, `Row ${rowNum}: category "${category}" not recognized.`) }
  }
  if (!QUESTION_TYPES.includes(type)) {
    return { error: t(`Baris ${rowNum}: tipe "${type}" tidak dikenali.`, `Row ${rowNum}: type "${type}" not recognized.`) }
  }
  if (!questionText) return { error: t(`Baris ${rowNum}: pertanyaan kosong.`, `Row ${rowNum}: question text is empty.`) }

  let options = []
  if (type === 'Pilihan Ganda') {
    for (let i = 1; i <= MAX_OPTIONS; i++) {
      const text = String(row[`Opsi ${i}`] || '').trim()
      if (!text) continue
      options.push({ text, score: Number(row[`Skor ${i}`]) || 0 })
    }
    if (options.length < 2) return { error: t(`Baris ${rowNum}: soal Pilihan Ganda butuh minimal 2 opsi.`, `Row ${rowNum}: a Pilihan Ganda question needs at least 2 options.`) }
    if (!options.some(o => o.score > 0)) return { error: t(`Baris ${rowNum}: tidak ada opsi dengan skor > 0.`, `Row ${rowNum}: no option has a score > 0.`) }
  }

  return { question: { category, type, questionText, active, options } }
}

export default function PsychotestConfigPage() {
  const t = useT()
  const { questions, tests, addQuestion, updateQuestion, deleteQuestion, addTest, updateTest, deleteTest } = usePsychotestStore()

  const [tab, setTab] = useState('soal') // 'soal' | 'tes'
  const [flash, setFlash] = useState('')
  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  // ── Bank Soal ──────────────────────────────────────────────────────────
  const [qCategory, setQCategory] = useState('all')
  const [qModal, setQModal] = useState(null) // { mode, id?, form }
  const [importResult, setImportResult] = useState(null) // { added, errors: [] }
  const importFileRef = useRef(null)

  const exportQuestions = () => {
    if (questions.length === 0) { say(t('Belum ada soal untuk diekspor.', 'No questions to export yet.')); return }
    downloadWorkbook(questions.map(questionToRow), 'bank-soal-psikotes.xlsx')
  }
  const downloadTemplate = () => downloadWorkbook(TEMPLATE_ROWS, 'template-bank-soal.xlsx')

  const handleImportFile = async (file) => {
    if (!file) return
    setImportResult(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      let added = 0
      const errors = []
      rows.forEach((row, i) => {
        const result = parseImportRow(row, i + 2, t) // +2: header row, 1-indexed
        if (result.error) { errors.push(result.error); return }
        addQuestion(result.question)
        added++
      })
      setImportResult({ added, errors })
      say(added > 0
        ? t(`${added} soal berhasil diimpor.`, `${added} questions imported.`)
        : t('Tidak ada soal valid untuk diimpor.', 'No valid questions to import.'))
    } catch {
      setImportResult({ added: 0, errors: [t('Gagal membaca file. Pastikan formatnya .xlsx sesuai template.', 'Could not read the file. Make sure it’s an .xlsx matching the template.')] })
    }
  }

  const qRows = questions.filter(q => qCategory === 'all' || q.category === qCategory)

  const openAddQuestion = () => setQModal({ mode: 'add', form: emptyQuestionForm() })
  const openEditQuestion = (q) => setQModal({
    mode: 'edit', id: q.id,
    form: { category: q.category, type: q.type, questionText: q.questionText, active: q.active,
      options: q.type === 'Pilihan Ganda' ? q.options.map(o => ({ ...o })) : [newOption(), newOption()] },
  })
  const closeQModal = () => setQModal(null)
  const setQField = (patch) => setQModal(m => ({ ...m, form: { ...m.form, ...patch } }))
  const setOption = (optId, patch) => setQModal(m => ({
    ...m, form: { ...m.form, options: m.form.options.map(o => o.id === optId ? { ...o, ...patch } : o) },
  }))
  const addOptionRow = () => setQModal(m => ({ ...m, form: { ...m.form, options: [...m.form.options, newOption()] } }))
  const removeOptionRow = (optId) => setQModal(m => ({ ...m, form: { ...m.form, options: m.form.options.filter(o => o.id !== optId) } }))

  const qInvalid = qModal && (
    !qModal.form.questionText.trim() ||
    (qModal.form.type === 'Pilihan Ganda' && (
      qModal.form.options.length < 2 ||
      qModal.form.options.some(o => !o.text.trim()) ||
      !qModal.form.options.some(o => Number(o.score) > 0)
    ))
  )

  const saveQuestion = () => {
    const f = qModal.form
    const payload = {
      category: f.category, type: f.type, questionText: f.questionText.trim(), active: f.active,
      options: f.type === 'Pilihan Ganda'
        ? f.options.map((o, i) => ({ id: typeof o.id === 'number' ? o.id : Date.now() + i, text: o.text.trim(), score: Number(o.score) || 0 }))
        : [],
    }
    if (qModal.mode === 'add') { addQuestion(payload); say(t('Soal ditambahkan.', 'Question added.')) }
    else { updateQuestion(qModal.id, payload); say(t('Soal diperbarui.', 'Question updated.')) }
    closeQModal()
  }
  const removeQuestion = (q) => {
    if (!window.confirm(t(`Hapus soal ini? Soal akan hilang dari paket tes yang memakainya.`, `Delete this question? It will be removed from any test packages using it.`))) return
    deleteQuestion(q.id)
    say(t('Soal dihapus.', 'Question deleted.'))
  }

  // ── Paket Tes ──────────────────────────────────────────────────────────
  const [tModal, setTModal] = useState(null) // { mode, id?, form }

  const openAddTest = () => setTModal({ mode: 'add', form: emptyTestForm() })
  const openEditTest = (test) => setTModal({
    mode: 'edit', id: test.id,
    form: { name: test.name, description: test.description, durationMinutes: test.durationMinutes, questionIds: [...test.questionIds], active: test.active },
  })
  const closeTModal = () => setTModal(null)
  const setTField = (patch) => setTModal(m => ({ ...m, form: { ...m.form, ...patch } }))
  const toggleTestQuestion = (qid) => setTModal(m => ({
    ...m, form: { ...m.form, questionIds: m.form.questionIds.includes(qid)
      ? m.form.questionIds.filter(id => id !== qid) : [...m.form.questionIds, qid] },
  }))

  const tInvalid = tModal && (!tModal.form.name.trim() || tModal.form.questionIds.length === 0 || Number(tModal.form.durationMinutes) < 1)

  const saveTest = () => {
    const f = tModal.form
    const payload = { name: f.name.trim(), description: f.description.trim(), durationMinutes: Number(f.durationMinutes) || 1, questionIds: f.questionIds, active: f.active }
    if (tModal.mode === 'add') { addTest(payload); say(t('Paket tes ditambahkan.', 'Test package added.')) }
    else { updateTest(tModal.id, payload); say(t('Paket tes diperbarui.', 'Test package updated.')) }
    closeTModal()
  }
  const removeTest = (test) => {
    if (!window.confirm(t(`Hapus paket tes "${test.name}"?`, `Delete test package "${test.name}"?`))) return
    deleteTest(test.id)
    say(t('Paket tes dihapus.', 'Test package deleted.'))
  }

  const questionsByCategory = QUESTION_CATEGORIES.map(cat => ({ cat, items: questions.filter(q => q.active && q.category === cat) })).filter(g => g.items.length > 0)

  return (
    <div>
      <PageHeader
        icon='🧠'
        title='Psychotest'
        subtitle={t(
          'Bank soal dan paket tes untuk psikotes online kandidat rekrutmen.',
          'Question bank and test packages for the candidate online psychotest.',
        )}
        actions={flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard icon='📄' tone='brand' label={t('Total Soal', 'Total Questions')} value={String(questions.length)} />
        <StatCard icon='✅' tone='green' label={t('Soal Aktif', 'Active Questions')} value={String(questions.filter(q => q.active).length)} />
        <StatCard icon='🧩' tone='teal' label={t('Paket Tes', 'Test Packages')} value={String(tests.length)} />
      </div>

      <div className='mb-5 flex gap-1'>
        <button onClick={() => setTab('soal')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'soal' ? 'text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
          style={tab === 'soal' ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
          {t('Bank Soal', 'Question Bank')}
        </button>
        <button onClick={() => setTab('tes')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'tes' ? 'text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
          style={tab === 'tes' ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
          {t('Paket Tes', 'Test Packages')}
        </button>
      </div>

      {tab === 'soal' && (
        <div>
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <FilterBar>
              <FilterPill active={qCategory === 'all'} onClick={() => setQCategory('all')}>{t('Semua', 'All')}</FilterPill>
              {QUESTION_CATEGORIES.map(c => (
                <FilterPill key={c} active={qCategory === c} onClick={() => setQCategory(c)}>{c}</FilterPill>
              ))}
            </FilterBar>
            <div className='flex flex-wrap items-center gap-2'>
              <button onClick={downloadTemplate} className='text-xs font-semibold text-teal-700 hover:underline'>
                {t('Unduh Template', 'Download Template')}
              </button>
              <input ref={importFileRef} type='file' accept='.xlsx,.xls' className='hidden'
                onChange={e => { handleImportFile(e.target.files?.[0]); e.target.value = '' }} />
              <ActionButton variant='secondary' size='sm' icon='📥' onClick={() => importFileRef.current?.click()}>
                {t('Import', 'Import')}
              </ActionButton>
              <ActionButton variant='secondary' size='sm' icon='📤' onClick={exportQuestions}>
                {t('Ekspor', 'Export')}
              </ActionButton>
              <ActionButton onClick={openAddQuestion} icon='➕'>{t('Tambah Soal', 'Add Question')}</ActionButton>
            </div>
          </div>

          {importResult && (
            <div className={`mb-4 rounded-xl p-3 text-xs ${importResult.errors.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
              <div className='flex items-start justify-between gap-3'>
                <p className='font-semibold'>
                  {t(`${importResult.added} soal berhasil diimpor.`, `${importResult.added} questions imported.`)}
                  {importResult.errors.length > 0 && ` ${t(`${importResult.errors.length} baris dilewati.`, `${importResult.errors.length} rows skipped.`)}`}
                </p>
                <button onClick={() => setImportResult(null)} className='shrink-0 font-bold leading-none opacity-60 hover:opacity-100'>×</button>
              </div>
              {importResult.errors.length > 0 && (
                <ul className='mt-1.5 list-disc space-y-0.5 pl-4'>
                  {importResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {importResult.errors.length > 10 && <li>{t(`+${importResult.errors.length - 10} lainnya`, `+${importResult.errors.length - 10} more`)}</li>}
                </ul>
              )}
            </div>
          )}

          {qRows.length === 0 ? (
            <EmptyState icon='📄' title={t('Belum ada soal.', 'No questions yet.')} />
          ) : (
            <DataTable columns={[
              t('Kategori', 'Category'), t('Tipe', 'Type'), t('Pertanyaan', 'Question'),
              { label: 'Status', align: 'center' }, { label: '', align: 'right' },
            ]}>
              {qRows.map(q => (
                <Tr key={q.id}>
                  <Td><span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600'>{q.category}</span></Td>
                  <Td className='text-sm text-gray-600'>{q.type}</Td>
                  <Td className='max-w-md truncate text-sm text-gray-700'>{q.questionText}</Td>
                  <Td align='center'><StatusBadge tone={q.active ? 'success' : 'neutral'}>{q.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}</StatusBadge></Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-3'>
                      <button onClick={() => openEditQuestion(q)} className='text-xs font-semibold text-teal-700 hover:underline'>{t('Ubah', 'Edit')}</button>
                      <button onClick={() => removeQuestion(q)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </div>
      )}

      {tab === 'tes' && (
        <div>
          <div className='mb-4 flex justify-end'>
            <ActionButton onClick={openAddTest} icon='➕'>{t('Tambah Paket Tes', 'Add Test Package')}</ActionButton>
          </div>

          {tests.length === 0 ? (
            <EmptyState icon='🧩' title={t('Belum ada paket tes.', 'No test packages yet.')} />
          ) : (
            <DataTable columns={[
              t('Nama', 'Name'), t('Durasi', 'Duration'), { label: t('Jumlah Soal', 'Questions'), align: 'center' },
              { label: 'Status', align: 'center' }, { label: '', align: 'right' },
            ]}>
              {tests.map(test => (
                <Tr key={test.id}>
                  <Td>
                    <p className='font-semibold text-gray-800'>{test.name}</p>
                    {test.description && <p className='text-xs text-gray-400'>{test.description}</p>}
                  </Td>
                  <Td className='text-sm text-gray-600'>{test.durationMinutes} {t('menit', 'min')}</Td>
                  <Td align='center' className='text-sm text-gray-600'>{test.questionIds.length}</Td>
                  <Td align='center'><StatusBadge tone={test.active ? 'success' : 'neutral'}>{test.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}</StatusBadge></Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-3'>
                      <button onClick={() => openEditTest(test)} className='text-xs font-semibold text-teal-700 hover:underline'>{t('Ubah', 'Edit')}</button>
                      <button onClick={() => removeTest(test)} className='text-xs font-semibold text-gray-400 hover:text-red-600'>{t('Hapus', 'Delete')}</button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </div>
      )}

      {/* Question modal */}
      {qModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeQModal}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>{qModal.mode === 'add' ? t('Tambah Soal', 'Add Question') : t('Ubah Soal', 'Edit Question')}</h3>
              <button onClick={closeQModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label={t('Kategori', 'Category')}>
                  <Select value={qModal.form.category} onChange={e => setQField({ category: e.target.value })}>
                    {QUESTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
                <FormField label={t('Tipe Soal', 'Question Type')}>
                  <Select value={qModal.form.type} disabled={qModal.mode === 'edit'} onChange={e => setQField({ type: e.target.value })}>
                    {QUESTION_TYPES.map(ty => <option key={ty} value={ty}>{ty}</option>)}
                  </Select>
                </FormField>
              </div>
              <FormField label={t('Pertanyaan', 'Question')} required>
                <textarea rows={2} className={inputClass} value={qModal.form.questionText} onChange={e => setQField({ questionText: e.target.value })} />
              </FormField>

              {qModal.form.type === 'Pilihan Ganda' ? (
                <div className='rounded-xl bg-gray-50 p-3'>
                  <p className='mb-2 text-xs font-semibold text-gray-600'>
                    {t('Pilihan Jawaban (isi skor > 0 pada jawaban yang benar)', 'Answer Options (set score > 0 on the correct one)')}
                  </p>
                  <div className='space-y-2'>
                    {qModal.form.options.map((o, i) => (
                      <div key={o.id} className='flex items-center gap-2'>
                        <Input value={o.text} placeholder={`${t('Opsi', 'Option')} ${i + 1}`} onChange={e => setOption(o.id, { text: e.target.value })} className='flex-1' />
                        <Input type='number' min={0} value={o.score} onChange={e => setOption(o.id, { score: e.target.value })} className='w-20' />
                        {qModal.form.options.length > 2 && (
                          <button onClick={() => removeOptionRow(o.id)} className='shrink-0 text-gray-400 hover:text-red-600'>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addOptionRow} className='mt-2 text-xs font-semibold text-teal-700 hover:underline'>{t('+ Tambah Opsi', '+ Add Option')}</button>
                </div>
              ) : (
                <div className='rounded-xl bg-gray-50 p-3 text-xs text-gray-500'>
                  {t('Skala Likert tetap (1–5): ', 'Fixed Likert scale (1–5): ')}
                  {LIKERT_SCALE.map(l => l.label).join(' · ')}
                </div>
              )}

              <label className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                <input type='checkbox' checked={qModal.form.active} onChange={e => setQField({ active: e.target.checked })} className='h-4 w-4 accent-teal-700' />
                {t('Aktif — muncul di pilihan paket tes', 'Active — selectable in test packages')}
              </label>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={closeQModal}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={saveQuestion} icon='💾' disabled={qInvalid}>{t('Simpan', 'Save')}</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Test package modal */}
      {tModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeTModal}>
          <div className='max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>{tModal.mode === 'add' ? t('Tambah Paket Tes', 'Add Test Package') : t('Ubah Paket Tes', 'Edit Test Package')}</h3>
              <button onClick={closeTModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-4'>
              <FormField label={t('Nama Paket Tes', 'Test Package Name')} required>
                <Input value={tModal.form.name} onChange={e => setTField({ name: e.target.value })} autoFocus />
              </FormField>
              <FormField label={t('Deskripsi', 'Description')}>
                <textarea rows={2} className={inputClass} value={tModal.form.description} onChange={e => setTField({ description: e.target.value })} />
              </FormField>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label={t('Durasi (menit)', 'Duration (minutes)')} required>
                  <Input type='number' min={1} value={tModal.form.durationMinutes} onChange={e => setTField({ durationMinutes: e.target.value })} />
                </FormField>
                <label className='flex cursor-pointer items-center gap-2 self-end pb-2.5 text-sm text-gray-700'>
                  <input type='checkbox' checked={tModal.form.active} onChange={e => setTField({ active: e.target.checked })} className='h-4 w-4 accent-teal-700' />
                  {t('Aktif', 'Active')}
                </label>
              </div>

              <div>
                <p className='mb-2 text-xs font-semibold text-gray-600'>
                  {t(`Pilih Soal (${tModal.form.questionIds.length} dipilih)`, `Select Questions (${tModal.form.questionIds.length} selected)`)}
                </p>
                {questionsByCategory.length === 0 ? (
                  <p className='text-xs text-gray-400'>{t('Belum ada soal aktif di bank soal.', 'No active questions in the bank yet.')}</p>
                ) : (
                  <div className='max-h-64 space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3'>
                    {questionsByCategory.map(g => (
                      <div key={g.cat}>
                        <p className='mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400'>{g.cat}</p>
                        <div className='space-y-1'>
                          {g.items.map(q => (
                            <label key={q.id} className='flex cursor-pointer items-start gap-2 rounded-lg bg-white px-2.5 py-2 text-xs text-gray-700 ring-1 ring-gray-100'>
                              <input type='checkbox' checked={tModal.form.questionIds.includes(q.id)}
                                onChange={() => toggleTestQuestion(q.id)} className='mt-0.5 h-3.5 w-3.5 shrink-0 accent-teal-700' />
                              <span>{q.questionText} <span className='text-gray-400'>({q.type})</span></span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={closeTModal}>{t('Batal', 'Cancel')}</ActionButton>
              <ActionButton onClick={saveTest} icon='💾' disabled={tInvalid}>{t('Simpan', 'Save')}</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
