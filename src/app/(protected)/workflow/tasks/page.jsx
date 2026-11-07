'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TaskInboxPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('assigned') // assigned, candidate, all

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/flowable/tasks?size=50')
      const result = await res.json()
      if (result.success) setTasks(result.data.data || [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (taskId) => {
    try {
      const res = await fetch(`/api/flowable/tasks/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', assignee: 'admin' })
      })
      const result = await res.json()
      if (result.success) fetchTasks()
      else alert(result.error)
    } catch (error) {
      alert('Failed to claim task')
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Task Inbox</h1>
          <p className="text-gray-600">Tasks assigned to you</p>
        </div>
        <button onClick={fetchTasks} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          🔄 Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['assigned', 'candidate', 'all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500">No pending tasks</p>
          <p className="text-sm text-gray-400 mt-2">You have no tasks assigned to you</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{task.name}</h3>
                    {task.priority && (
                      <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📋 Process: {task.processDefinitionName || task.processDefinitionId}</p>
                    <p>👤 Created: {task.created ? new Date(task.created).toLocaleString() : 'N/A'}</p>
                    {task.dueDate && <p>⏰ Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                  </div>
                  {task.description && (
                    <p className="mt-2 text-sm text-gray-700">{task.description}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {task.assignee ? (
                    <Link href={`/workflow/tasks/${task.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Open Task
                    </Link>
                  ) : (
                    <button onClick={() => handleClaim(task.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Claim Task
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href="/workflow" className="text-gray-600 hover:text-gray-800">
          ← Back to Workflow
        </Link>
      </div>
    </div>
  )
}
