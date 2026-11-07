'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import untuk SSR
const BpmnDesigner = dynamic(() => import('@/components/workflow/BpmnDesigner'), {
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading BPMN Editor...</div>
})

export default function WorkflowDesigner() {
  const [xml, setXml] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSave = async (bpmnXml) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Please enter workflow name' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/workflow/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, xml: bpmnXml })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Workflow saved successfully!' })
        setXml(bpmnXml)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Workflow Designer</h1>
        <p className="text-gray-600">Design BPMN workflows using the visual editor</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Workflow Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Leave Request Process"
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
        <BpmnDesigner onSave={handleSave} height="100%" />
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">Saving...</div>
        </div>
      )}
    </div>
  )
}
