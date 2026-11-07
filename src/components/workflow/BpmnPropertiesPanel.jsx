'use client'

import { useState, useEffect } from 'react'
import TaskFormBuilderModal from './TaskFormBuilderModal'

export const FORM_TEMPLATES = [
  {
    key: 'approval-form',
    label: 'Persetujuan / Approval Form',
    description: 'Keputusan Setuju/Tolak dan catatan reviewer.',
    fields: [
      { name: 'approved', label: 'Keputusan', type: 'boolean', required: true, desc: 'true = Setujui, false = Tolak' },
      { name: 'approvalComment', label: 'Catatan Reviewer', type: 'string', required: false, desc: 'Alasan atau catatan persetujuan' },
    ],
  },
  {
    key: 'leave-request-form',
    label: 'Formulir Pengajuan Cuti',
    description: 'Input data cuti: jenis, tanggal, dan alasan.',
    fields: [
      { name: 'leaveType', label: 'Tipe Cuti', type: 'enum', required: true, desc: 'Tahunan, Sakit, Melahirkan, Izin' },
      { name: 'startDate', label: 'Tanggal Mulai', type: 'date', required: true, desc: 'Format YYYY-MM-DD' },
      { name: 'endDate', label: 'Tanggal Selesai', type: 'date', required: true, desc: 'Format YYYY-MM-DD' },
      { name: 'reason', label: 'Alasan Cuti', type: 'string', required: true, desc: 'Keterangan pengajuan' },
    ],
  },
  {
    key: 'reimbursement-form',
    label: 'Formulir Reimbursement',
    description: 'Klaim biaya operasional, medis, atau perjalanan dinas.',
    fields: [
      { name: 'category', label: 'Kategori Biaya', type: 'enum', required: true, desc: 'Transport, Medis, Makan, Hotel' },
      { name: 'amount', label: 'Nominal Klaim (Rp)', type: 'number', required: true, desc: 'Total biaya pengeluaran' },
      { name: 'invoiceNumber', label: 'No. Kwitansi / Nota', type: 'string', required: false, desc: 'Nomor bukti transfer / struk' },
      { name: 'description', label: 'Deskripsi Biaya', type: 'string', required: true, desc: 'Rincian keperluan dinas' },
    ],
  },
  {
    key: 'custom',
    label: 'Custom Form Key',
    description: 'Tentukan form key bebas sesuai kebutuhan aplikasi Anda.',
    fields: [],
  },
]

const COMMON_GROUPS = ['managers', 'hr', 'finance', 'supervisors', 'superadmin']

const CONDITION_PRESETS = [
  { label: 'Setuju (${approved == true})', expr: '${approved == true}' },
  { label: 'Tolak (${approved == false})', expr: '${approved == false}' },
  { label: 'Nominal > 1 Juta', expr: '${amount > 1000000}' },
  { label: 'Nominal <= 1 Juta', expr: '${amount <= 1000000}' },
]

export default function BpmnPropertiesPanel({
  selectedElement,
  onApply,
  onConvertToUserTask,
  onClose,
  forms = {},
  onUpdateForm,
}) {
  const [formData, setFormData] = useState({
    name: '',
    candidateGroups: '',
    assignee: '',
    formKey: '',
    condition: '',
    customFields: [],
  })
  const [selectedTemplate, setSelectedTemplate] = useState('custom')
  const [savedBadge, setSavedBadge] = useState(false)
  const [showFormBuilder, setShowFormBuilder] = useState(false)

  const handleOpenBuilder = () => {
    try {
      const pads = document.querySelectorAll('.djs-context-pad')
      pads.forEach((p) => {
        p.style.display = 'none'
      })
    } catch {}
    setShowFormBuilder(true)
  }

  const handleCloseBuilder = () => {
    setShowFormBuilder(false)
    try {
      const pads = document.querySelectorAll('.djs-context-pad')
      pads.forEach((p) => {
        p.style.display = ''
      })
    } catch {}
  }

  // Sync state when selectedElement changes
  useEffect(() => {
    if (!selectedElement) return

    const initialFormKey = selectedElement.formKey || ''
    const matched = FORM_TEMPLATES.find((t) => t.key === initialFormKey)

    setFormData({
      name: selectedElement.name || '',
      candidateGroups: selectedElement.candidateGroups || '',
      assignee: selectedElement.assignee || '',
      formKey: initialFormKey,
      condition: selectedElement.condition || '',
      customFields: [],
    })

    setSelectedTemplate(matched ? matched.key : initialFormKey ? 'custom' : 'approval-form')
    setSavedBadge(false)
  }, [selectedElement])

  if (!selectedElement) {
    return (
      <div className="w-80 sm:w-96 bg-white border-l border-gray-200 flex flex-col h-full text-sm">
        <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between font-semibold text-gray-800">
          <span className="flex items-center gap-1.5">
            <span>⚙️</span> Properti & Form Task
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 px-1 text-base leading-none"
              title="Tutup Panel"
            >
              ✕
            </button>
          )}
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-center text-gray-500 h-full gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-inner">
            👆
          </div>
          <h4 className="font-semibold text-gray-800">Belum Ada Elemen Terpilih</h4>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
            Klik salah satu <strong>Task</strong> pada diagram untuk mengatur Form Task &amp; Penugasan Approver, atau klik <strong>Panah Alur</strong> untuk mengatur Kondisi Percabangan.
          </p>
          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-left text-xs text-blue-900 w-full space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <span>💡</span> Tips Cepat:
            </div>
            <p>• <strong>User Task</strong>: Elemen yang dikerjakan oleh manusia via form.</p>
            <p>• <strong>Form Key</strong>: Kode form yang dimunculkan saat approver membuka task.</p>
            <p>• <strong>Gateway</strong>: Membaca variabel <code>approved</code> untuk memilih alur.</p>
          </div>
        </div>
      </div>
    )
  }

  const elType = selectedElement.type || ''
  const isUserTask = elType === 'bpmn:UserTask'
  const isGenericTask = elType === 'bpmn:Task'
  const isAnyTask = isUserTask || isGenericTask
  const isSequenceFlow = elType === 'bpmn:SequenceFlow'
  const isGateway = elType.includes('Gateway')
  const isEvent = elType.includes('Event')
  const isStartEvent = elType.includes('StartEvent') || selectedElement.id?.toLowerCase().includes('start')

  const configuredForm = forms[selectedElement.id] || forms[formData.formKey] || null

  // Handle template change
  const handleTemplateChange = (tmplKey) => {
    setSelectedTemplate(tmplKey)
    if (tmplKey === 'custom') {
      // Keep existing or empty
    } else {
      setFormData((prev) => ({
        ...prev,
        formKey: tmplKey,
      }))
    }
  }

  // Handle save from visual builder
  const handleSaveFormSchema = (schema) => {
    if (onUpdateForm) {
      onUpdateForm(selectedElement.id, schema)
    }
    const autoKey = formData.formKey || `${selectedElement.id}-form`
    const updated = {
      ...formData,
      formKey: autoKey,
    }
    setFormData(updated)
    if (onApply) {
      onApply(updated)
    }
    setSavedBadge(true)
    setTimeout(() => setSavedBadge(false), 2500)
  }

  // Toggle group chip
  const toggleGroup = (grp) => {
    const current = formData.candidateGroups
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    let updated
    if (current.includes(grp)) {
      updated = current.filter((g) => g !== grp)
    } else {
      updated = [...current, grp]
    }
    setFormData({ ...formData, candidateGroups: updated.join(', ') })
  }

  // Submit apply
  const handleSave = (e) => {
    e?.preventDefault()
    onApply(formData)
    setSavedBadge(true)
    setTimeout(() => setSavedBadge(false), 2500)
  }

  const activeTemplateObj = FORM_TEMPLATES.find((t) => t.key === selectedTemplate)

  return (
    <div className="w-80 sm:w-96 bg-white border-l border-gray-200 flex flex-col h-full text-sm shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 flex items-center gap-1.5 text-xs">
            <span>⚙️</span> Properti:
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              isUserTask
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : isGenericTask
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : isSequenceFlow
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : isGateway
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isUserTask
              ? 'User Task (Form)'
              : isGenericTask
              ? 'Generic Task'
              : isSequenceFlow
              ? 'Sequence Flow (Alur)'
              : elType.replace('bpmn:', '')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {savedBadge && (
            <span className="text-xs text-emerald-600 font-semibold animate-pulse mr-1">
              ✓ Disimpan!
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 text-sm leading-none rounded hover:bg-gray-200"
              title="Tutup Panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Body Form */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* Element ID Badge */}
        <div className="text-[11px] text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded border border-gray-200 flex items-center justify-between">
          <span>ID: <code className="font-mono text-gray-700 font-bold">{selectedElement.id}</code></span>
        </div>

        {/* Task Conversion Alert if Generic Task */}
        {isGenericTask && onConvertToUserTask && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
            <p className="text-amber-800">
              ⚠️ Ini adalah <strong>Task Umum</strong>. Flowable memerlukan <strong>User Task</strong> agar dapat memiliki Form Interaktif dan ditugaskan ke Approver.
            </p>
            <button
              type="button"
              onClick={onConvertToUserTask}
              className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded shadow-sm text-xs transition"
            >
              ⚡ Ubah Jadi User Task Sekarang
            </button>
          </div>
        )}

        {/* Label Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Label / Nama Elemen *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={isSequenceFlow ? 'Misal: Disetujui / Ditolak' : 'Misal: Persetujuan Manager'}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* SEQUENCE FLOW CONDITIONAL EXPRESSION */}
        {isSequenceFlow && (
          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-purple-900">
                Kondisi Percabangan (Expression)
              </label>
            </div>
            <p className="text-[11px] text-purple-700 leading-tight">
              Kondisi ini menentukan kapan alur ini dipilih oleh Gateway.
            </p>

            {/* Quick chips */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-gray-500 block">
                Preset Cepat:
              </span>
              <div className="flex flex-wrap gap-1">
                {CONDITION_PRESETS.map((p) => (
                  <button
                    key={p.expr}
                    type="button"
                    onClick={() => setFormData({ ...formData, condition: p.expr })}
                    className={`text-[10px] px-2 py-0.5 rounded border transition ${
                      formData.condition === p.expr
                        ? 'bg-purple-600 text-white border-purple-600 font-semibold'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              placeholder="${approved == true}"
              className="w-full px-3 py-1.5 border border-purple-200 rounded-md text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
            />
          </div>
        )}

        {/* USER TASK CONFIGURATION */}
        {isAnyTask && (
          <>
            {/* Assignment Section */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-2.5 bg-gray-50/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                <span>👥</span> Penugasan (Approver / Pelaksana)
              </div>

              {/* Candidate Groups */}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Candidate Groups (Grup Peran)
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {COMMON_GROUPS.map((grp) => {
                    const active = formData.candidateGroups
                      .split(',')
                      .map((s) => s.trim())
                      .includes(grp)
                    return (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => toggleGroup(grp)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {active ? `✓ ${grp}` : `+ ${grp}`}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text"
                  value={formData.candidateGroups}
                  onChange={(e) => setFormData({ ...formData, candidateGroups: e.target.value })}
                  placeholder="managers, hr (pisahkan dengan koma)"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Assignee Spesifik (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  placeholder="Misal: admin atau ${initiator}"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Form Task Configuration */}
            <div className="border border-blue-200 rounded-lg p-3 space-y-3 bg-blue-50/30">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span className="flex items-center gap-1.5">
                  <span>📝</span> Konfigurasi Form Task
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                  flowable:formKey
                </span>
              </div>

              {/* Primary Visual Form Builder Trigger Button */}
              <div className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🎨</span>
                    <div>
                      <span className="text-xs font-bold block leading-tight">Visual Form Builder</span>
                      <span className="text-[10px] text-blue-100">
                        {configuredForm?.fields?.length
                          ? `${configuredForm.fields.length} kolom aktif`
                          : 'Belum ada kolom khusus'}
                      </span>
                    </div>
                  </div>
                  {configuredForm?.fields?.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/90 text-white rounded text-[10px] font-bold">
                      ✓ Aktif
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOpenBuilder}
                  className="w-full py-1.5 px-3 bg-white text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1"
                >
                  <span>{configuredForm?.fields?.length ? '✏️ Edit Kolom Form Ini' : '✨ Desain Kolom Form Baru'}</span>
                </button>
              </div>

              {/* Configured Fields Display */}
              {configuredForm && configuredForm.fields?.length > 0 && (
                <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-gray-800 flex items-center justify-between">
                    <span>{configuredForm.title || 'Formulir Kustom'}</span>
                    <span className="text-[10px] text-blue-600 font-medium">
                      {configuredForm.decisionType === 'approval' ? 'Approval Form' : 'Data Input'}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {configuredForm.fields.map((fld) => (
                      <div
                        key={fld.id}
                        className="p-1.5 rounded bg-gray-50 border border-gray-100 text-[11px] flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-700 truncate max-w-[170px]">
                          {fld.label}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] uppercase px-1 py-0.2 bg-blue-100 text-blue-700 rounded font-semibold">
                            {fld.type}
                          </span>
                          {fld.required && <span className="text-rose-500 font-bold text-[10px]">*</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Template Selector as Alternative Preset */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Atau Pilih Preset Form:
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {FORM_TEMPLATES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {activeTemplateObj && (
                  <p className="text-[11px] text-gray-500 mt-1 italic">
                    {activeTemplateObj.description}
                  </p>
                )}
              </div>

              {/* Form Key Input */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Form Key (ID Formulir di Flowable) *
                </label>
                <input
                  type="text"
                  value={formData.formKey}
                  onChange={(e) => {
                    setFormData({ ...formData, formKey: e.target.value })
                    setSelectedTemplate('custom')
                  }}
                  placeholder="Misal: approval-form"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {/* Informational for Gateways / Events */}
        {isGateway && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 space-y-1">
            <p className="font-semibold">⚡ Gateway Percabangan</p>
            <p>
              Gateway ini akan mengevaluasi alur keluar berdasarkan kondisi pada <strong>Sequence Flow</strong> (panah keluar). Pastikan panah yang keluar memiliki ekspresi kondisi seperti <code>${'{approved == true}'}</code>.
            </p>
          </div>
        )}

        {isEvent && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">
                {isStartEvent ? '🟢 Start Event (Awal Alur)' : '🔴 End Event (Akhir Alur)'}
              </p>
              {isStartEvent && configuredForm?.fields?.length > 0 && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  ✓ {configuredForm.fields.length} kolom
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed">
              {isStartEvent
                ? 'Titik awal inisiasi proses. Anda dapat mendesain formulir yang akan diisi oleh karyawan saat mengajukan alur proses ini di ESS.'
                : 'Titik akhir proses di mana alur kerja dinyatakan selesai.'}
            </p>

            {isStartEvent && (
              <button
                type="button"
                onClick={handleOpenBuilder}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <span>🎨</span>
                <span>{configuredForm?.fields?.length ? '✏️ Edit Form Inisiasi Pemohon' : '✨ Desain Form Inisiasi (Start Form)'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Submit Button */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 shrink-0">
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition flex items-center justify-center gap-1.5"
        >
          <span>💾</span> Terapkan ke Elemen Diagram
        </button>
      </div>

      {/* Modal Visual Form Builder */}
      {showFormBuilder && (
        <TaskFormBuilderModal
          elementId={selectedElement.id}
          elementName={formData.name || selectedElement.name}
          elementType={selectedElement.type}
          initialSchema={
            configuredForm || {
              title: isStartEvent
                ? `Formulir ${formData.name || 'Pengajuan'}`
                : `Formulir ${formData.name || 'Persetujuan'}`,
              decisionType: isStartEvent ? 'none' : 'approval',
              fields:
                activeTemplateObj?.fields?.map((f) => ({
                  id: `f_${f.name}`,
                  label: f.label,
                  type: f.type === 'enum' ? 'dropdown' : f.type === 'boolean' ? 'checkbox' : f.type,
                  required: f.required,
                  placeholder: f.desc || '',
                  options: f.desc || '',
                })) || [],
            }
          }
          onClose={handleCloseBuilder}
          onSave={handleSaveFormSchema}
        />
      )}
    </div>
  )
}

