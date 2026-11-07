'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useFlowableStore } from '@/store/flowableStore'

export default function FlowableSettingsPage() {
  const { settings, setSettings, testConnection, isTesting, isConnected } = useFlowableStore()
  const [formData, setFormData] = useState({ url: '', uiUrl: '', username: '', password: '', enabled: false })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { setFormData({ url: settings.url, uiUrl: settings.uiUrl, username: settings.username, password: '', enabled: settings.enabled }) }, [settings])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleTest = async () => {
    setMessage(null)
    const result = await testConnection(formData)
    setMessage({ type: result.success ? 'success' : 'error', text: result.message || (result.success ? 'Connected!' : 'Failed') })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/flowable/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const result = await res.json()
      if (result.success) { setSettings(formData); setMessage({ type: 'success', text: 'Saved!' }) }
      else setMessage({ type: 'error', text: result.error })
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Flowable Settings</h1>
        <p className="text-gray-600">Configure Flowable engine connection</p>
      </div>

      {message && <div className={`p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message.text}</div>}

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Connection Settings</h2>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">REST API URL</label>
            <input type="text" name="url" value={formData.url} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">UI URL</label>
            <input type="text" name="uiUrl" value={formData.uiUrl} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Leave empty" /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="enabled" checked={formData.enabled} onChange={handleChange} className="w-4 h-4" />
            <label className="text-sm">Enable Flowable</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-6 border-t">
          <button onClick={handleTest} disabled={isTesting} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            {isTesting ? '⏳' : '🔗'} Test
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? '💾' : '💾'} Save
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Cara Menjalankan Flowable Lokal (Tanpa Docker)</h3>
        <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
          <li>Pastikan Java (JDK/JRE 11, 17, atau 21) terpasang di komputer Anda (<code className="bg-blue-100 px-1 rounded font-mono text-xs">java -version</code>).</li>
          <li>Jalankan script starter: <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">scripts\start-flowable.bat</code></li>
          <li>Engine akan aktif di port 8080:
            <ul className="list-disc list-inside ml-5 mt-1 space-y-0.5 text-xs">
              <li>REST API: <code className="bg-blue-100 px-1 rounded">http://localhost:8080/flowable-rest</code></li>
              <li>UI Portal: <code className="bg-blue-100 px-1 rounded">http://localhost:8080/flowable-ui</code> (Login: <code className="font-mono">admin</code> / <code className="font-mono">test</code>)</li>
            </ul>
          </li>
          <li>Klik tombol <strong>🔗 Test</strong> di atas untuk memverifikasi koneksi.</li>
        </ol>
      </div>

      <div className="mt-4 flex gap-4">
        <Link href="/sysadmin/workflow/designer" className="px-4 py-2 bg-green-600 text-white rounded-lg">🎨 Designer</Link>
        <Link href="/sysadmin/workflow" className="px-4 py-2 bg-gray-100 rounded-lg">← Back</Link>
      </div>
    </div>
  )
}
