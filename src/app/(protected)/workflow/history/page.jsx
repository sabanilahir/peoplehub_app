'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function WorkflowHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/flowable/history?size=50')
      const result = await res.json()
      if (result.success) setHistory(result.data.data || [])
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'CANCELLED': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflow History</h1>
          <p className="text-gray-600">View completed workflow instances</p>
        </div>
        <button onClick={fetchHistory} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          🔄 Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'COMPLETED', 'CANCELLED'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-5xl mb-4">📜</div>
          <p className="text-gray-500">No history found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {history.filter(h => filter === 'all' || h.processInstanceStatus === filter).map((item) => (
            <div key={item.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{item.processDefinitionName || item.processDefinitionKey}</h3>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <p>Started: {item.startTime ? new Date(item.startTime).toLocaleString() : '-'}</p>
                    <p>Completed: {item.endTime ? new Date(item.endTime).toLocaleString() : 'In Progress'}</p>
                    <p>Duration: {item.durationInMillis ? `${Math.round(item.durationInMillis / 1000 / 60)} minutes` : '-'}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.processInstanceStatus)}`}>
                  {item.processInstanceStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Link href="/workflow" className="text-gray-600 hover:text-gray-800">← Back to Workflow</Link>
      </div>
    </div>
  )
}
