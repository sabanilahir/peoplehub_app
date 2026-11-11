'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import {
  DEFAULT_BPMN,
  LEAVE_REQUEST_BPMN,
  REIMBURSEMENT_BPMN,
  DEFAULT_LEAVE_FORMS,
  DEFAULT_REIMBURSEMENT_FORMS,
} from '@/components/workflow/BpmnDesigner'

const BpmnDesigner = dynamic(() => import('@/components/workflow/BpmnDesigner'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-96 gap-2 text-gray-500">
      <div className="animate-spin text-3xl">⏳</div>
      <p className="font-medium text-sm">Memuat BPMN.js Visual Editor & Form Builder...</p>
    </div>
  ),
})

function WorkflowDesignerContent() {
  const searchParams = useSearchParams()
  const defId = searchParams.get('id')

  const [name, setName] = useState('Pengajuan Cuti Karyawan')
  const [key, setKey] = useState('leave-request-process')
  const [selectedTemplate, setSelectedTemplate] = useState('leave')
  const [saving, setSaving] = useState(false)
  const [loadingDef, setLoadingDef] = useState(false)
  const [loadedXml, setLoadedXml] = useState(null)
  const [loadedForms, setLoadedForms] = useState(null)
  const [message, setMessage] = useState(null)
  const [formsCount, setFormsCount] = useState(Object.keys(DEFAULT_LEAVE_FORMS).length)
  const designerRef = useRef(null)

  // Load existing definition if ID is passed
  useEffect(() => {
    if (!defId) return
    const fetchExisting = async () => {
      setLoadingDef(true)
      try {
        const res = await fetch(`/api/workflow/definitions/${defId}`)
        const result = await res.json()
        if (result.success && result.data) {
          const def = result.data
          setName(def.name)
          setKey(def.key)
          if (def.key === 'leave-request-process' || def.key === 'LeaveRequest') {
            setSelectedTemplate('leave')
          } else if (def.key === 'expense-reimbursement') {
            setSelectedTemplate('reimbursement')
          } else {
            setSelectedTemplate('custom')
          }
          const defForms = def.forms || {}
          setFormsCount(Object.keys(defForms).length)
          setLoadedXml(def.xml)
          setLoadedForms(defForms)
          setTimeout(() => {
            designerRef.current?.loadXml(def.xml, defForms)
          }, 300)
        }
      } catch (err) {
        console.error('Failed to load definition:', err)
      } finally {
        setLoadingDef(false)
      }
    }
    fetchExisting()
  }, [defId])

  const handleTemplateChange = (e) => {
    const tmpl = e.target.value
    setSelectedTemplate(tmpl)
    if (tmpl === 'leave') {
      setName('Pengajuan Cuti Karyawan')
      setKey('leave-request-process')
      setFormsCount(Object.keys(DEFAULT_LEAVE_FORMS).length)
      designerRef.current?.loadXml(LEAVE_REQUEST_BPMN, DEFAULT_LEAVE_FORMS)
    } else if (tmpl === 'reimbursement') {
      setName('Klaim Reimbursement')
      setKey('expense-reimbursement')
      setFormsCount(Object.keys(DEFAULT_REIMBURSEMENT_FORMS).length)
      designerRef.current?.loadXml(REIMBURSEMENT_BPMN, DEFAULT_REIMBURSEMENT_FORMS)
    } else {
      setName('New Process')
      setKey('new-process')
      setFormsCount(0)
      designerRef.current?.loadXml(DEFAULT_BPMN, {})
    }
  }

  // Track forms change
  const handleFormsChange = (updatedForms) => {
    setFormsCount(Object.keys(updatedForms || {}).length)
  }

  // Save Draft (Local DB)
  const handleSaveDraft = async (bpmnXml, forms) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Nama workflow wajib diisi' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/workflow/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          key: key || name.toLowerCase().replace(/\s+/g, '-'),
          xml: bpmnXml,
          forms: forms || {},
        }),
      })
      const result = await res.json()
      if (result.success) {
        setMessage({
          type: 'success',
          text: `✅ Draft workflow & ${Object.keys(forms || {}).length} skema form task berhasil disimpan di database!`,
        })
      } else {
        setMessage({ type: 'error', text: result.error || 'Gagal menyimpan draft' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  // Deploy to Flowable Engine
  const handleDeployFlowable = async (bpmnXml, forms) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Nama workflow wajib diisi sebelum deploy' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/flowable/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          key: key || name.toLowerCase().replace(/\s+/g, '-'),
          xml: bpmnXml,
          forms: forms || {},
        }),
      })
      const result = await res.json()
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || '🚀 Workflow dan formulir task berhasil dideploy ke Workflow Engine!',
        })
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Gagal deploy workflow',
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col space-y-4 min-h-[calc(100vh-140px)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">BPMN Visual Designer &amp; Form Builder</h1>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Desain alur kerja BPMN dan rancang formulir interaktif untuk setiap langkah (Start Form &amp; User Tasks) secara visual.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sysadmin/workflow/analytics"
            className="px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold transition"
          >
            📊 Analisa Workflow
          </Link>
          <Link
            href="/sysadmin/workflow/definitions"
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
          >
            📋 Daftar Workflows
          </Link>
          <Link
            href="/sysadmin/workflow"
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
          >
            ← Kembali
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg text-sm flex items-center justify-between shrink-0 ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600 text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Feature Notification Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 text-blue-900">
          <span className="text-lg">🎨</span>
          <div>
            <strong className="font-semibold text-blue-950">Visual Form Builder Aktif:</strong> Klik node{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-blue-800">User Task</code> atau{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-blue-800">Start Event</code> di kanvas untuk membuka Form Builder &amp; Live Preview.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-white text-blue-800 font-bold rounded-lg border border-blue-200 shadow-2xs">
            📝 {formsCount} Form Langkah Dikonfigurasi
          </span>
        </div>
      </div>

      {/* Workflow Meta & Template Selector */}
      <div className="bg-white p-3.5 border border-gray-200 rounded-xl shadow-sm shrink-0 flex flex-wrap items-end gap-3 text-sm">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Proses *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!key || key === 'new-process') {
                setKey(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, ''))
              }
            }}
            placeholder="Contoh: Pengajuan Cuti Karyawan"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Process Key (Workflow ID) *</label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="leave-request-process"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="w-64">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Template Standar</label>
          <select
            value={selectedTemplate}
            onChange={handleTemplateChange}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="leave">📑 Pengajuan Cuti Karyawan</option>
            <option value="reimbursement">💳 Klaim Reimbursement Biaya</option>
            <option value="blank">⚪ Blank Process (Mulai dari Nol)</option>
            {selectedTemplate === 'custom' && <option value="custom">⚙️ Kustom (Dari Database)</option>}
          </select>
        </div>
      </div>

      {/* Modeler Container */}
      <div className="w-full flex-1 min-h-[640px]">
        {loadingDef ? (
          <div className="flex flex-col items-center justify-center h-96 gap-2 text-gray-500 bg-white rounded-xl border">
            <div className="animate-spin text-3xl">⏳</div>
            <p className="font-medium text-sm">Memuat definisi workflow dari database...</p>
          </div>
        ) : (
          <BpmnDesigner
            ref={designerRef}
            initialXml={loadedXml || LEAVE_REQUEST_BPMN}
            initialForms={loadedForms || DEFAULT_LEAVE_FORMS}
            onSave={handleSaveDraft}
            onDeploy={handleDeployFlowable}
            onFormsChange={handleFormsChange}
            height="680px"
          />
        )}
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3">
            <span className="animate-spin text-2xl">⏳</span>
            <span className="font-medium text-gray-800">Sedang memproses dan menyimpan workflow beserta formulir...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkflowDesignerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-96 gap-2 text-gray-500">
          <div className="animate-spin text-3xl">⏳</div>
          <p className="font-medium text-sm">Memuat halaman Workflow Designer...</p>
        </div>
      }
    >
      <WorkflowDesignerContent />
    </Suspense>
  )
}
