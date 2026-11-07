'use client'
import { useState } from 'react'
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react'

const DEFAULT_ROLES = [
  { id: 1, key: 'superadmin', label: 'Superadmin', desc: 'Akses penuh ke semua fitur sistem', color: '#dc2626' },
  { id: 2, key: 'hr_manager', label: 'HR Manager', desc: 'Manajer HR dengan akses penuh ke modul HR', color: '#2563eb' },
  { id: 3, key: 'hr', label: 'HR Staff', desc: 'Staff HR dengan akses terbatas', color: '#7c3aed' },
  { id: 4, key: 'hr_officer', label: 'HR Officer', desc: 'Officer HR untuk operasional harian', color: '#0891b2' },
  { id: 5, key: 'manager', label: 'Manager', desc: 'Manager dengan akses MSS dan tim', color: '#059669' },
  { id: 6, key: 'employee', label: 'Employee', desc: 'Karyawan dengan akses ESS saja', color: '#d97706' },
]

export default function RoleManagementPage() {
  const [roles, setRoles] = useState(DEFAULT_ROLES)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState({ key: '', label: '', desc: '', color: '#3b82f6' })

  const handleSave = () => {
    if (!form.key || !form.label) return
    if (editData) {
      setRoles(roles.map(r => r.id === editData.id ? { ...r, ...form } : r))
    } else {
      setRoles([...roles, { ...form, id: Date.now() }])
    }
    setShowForm(false)
    setEditData(null)
    setForm({ key: '', label: '', desc: '', color: '#3b82f6' })
  }

  const handleEdit = (role) => {
    setForm(role)
    setEditData(role)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (confirm('Hapus role ini?')) {
      setRoles(roles.filter(r => r.id !== id))
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Role Management</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola role dan permission pengguna sistem</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={18} /> Tambah Role
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roles.map(role => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: role.color + '20' }}>
                      <Shield size={20} style={{ color: role.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{role.label}</p>
                      <p className="text-xs text-gray-400 font-mono">{role.key}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{role.desc}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleEdit(role)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(role.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editData ? 'Edit Role' : 'Tambah Role Baru'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key (unique ID)</label>
                <input type="text" value={form.key} onChange={e => setForm({...form, key: e.target.value})}
                  placeholder="contoh: hr_manager"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input type="text" value={form.label} onChange={e => setForm({...form, label: e.target.value})}
                  placeholder="contoh: HR Manager"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})}
                  placeholder="Deskripsi role..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                    className="w-12 h-10 rounded border cursor-pointer" />
                  <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                    className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditData(null); setForm({ key: '', label: '', desc: '', color: '#3b82f6' }) }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}