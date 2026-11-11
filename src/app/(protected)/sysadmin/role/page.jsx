'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Plus, Edit2, Trash2, ArrowRight, CheckCircle2, AlertCircle, Key } from 'lucide-react'
import { useRoleStore } from '@/store/roleStore'

export default function RoleManagementPage() {
  const { roles, fetchRoles, addRole, updateRole, deleteRole, isLoading } = useRoleStore()
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState({ key: '', label: '', desc: '', color: '#3b82f6' })
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3500)
  }

  const handleSave = async () => {
    if (!form.key || !form.label) {
      flash('Key dan Label role wajib diisi!', 'error')
      return
    }

    try {
      if (editData) {
        await updateRole(editData.id, form)
        flash(`Role "${form.label}" berhasil diperbarui.`)
      } else {
        await addRole(form)
        flash(`Role baru "${form.label}" berhasil ditambahkan.`)
      }
      setShowForm(false)
      setEditData(null)
      setForm({ key: '', label: '', desc: '', color: '#3b82f6' })
    } catch (e) {
      flash('Gagal menyimpan role: ' + e.message, 'error')
    }
  }

  const handleEdit = (role) => {
    setForm({
      key: role.key || role.name || '',
      label: role.label || '',
      desc: role.desc || role.description || '',
      color: role.color || '#3b82f6',
    })
    setEditData(role)
    setShowForm(true)
  }

  const handleDelete = async (role) => {
    if (role.isSystem) {
      if (!confirm(`Role "${role.label}" adalah role sistem bawaan. Anda yakin ingin menghapusnya?`)) {
        return
      }
    } else {
      if (!confirm(`Hapus role "${role.label}"?`)) return
    }

    try {
      await deleteRole(role.id)
      flash(`Role "${role.label}" telah dihapus.`)
    } catch (e) {
      flash('Gagal menghapus role: ' + e.message, 'error')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Alert */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-md border text-sm font-semibold transition-all ${
          msg.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-red-600" size={26} />
            Role Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola role sistem, permission pengguna, dan grup akses persetujuan workflow
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sysadmin/role/permission"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 shadow-sm transition"
          >
            <Key size={15} />
            <span>Hak Akses (Permission)</span>
          </Link>
          <Link
            href="/sysadmin/workflow/userlists"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
          >
            <span>Userlists (Grup Penyetuju)</span>
            <ArrowRight size={15} />
          </Link>
          <button
            onClick={() => {
              setEditData(null)
              setForm({ key: '', label: '', desc: '', color: '#3b82f6' })
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm transition"
          >
            <Plus size={18} /> Tambah Role
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/70 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Daftar Role Aktif ({roles.length})
          </span>
          {isLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Menyinkronkan data...</span>
          )}
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
            <tr>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Deskripsi</th>
              <th className="px-5 py-3.5 text-center">Tipe</th>
              <th className="px-5 py-3.5 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roles.map(role => (
              <tr key={role.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-xs"
                      style={{ backgroundColor: (role.color || '#666666') + '20', color: role.color || '#666666' }}
                    >
                      {role.icon || '🛡️'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{role.label}</p>
                      <p className="text-xs text-gray-400 font-mono">{role.key || role.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500 max-w-md">
                  {role.desc || role.description || <span className="text-gray-300 italic">Tidak ada deskripsi</span>}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {role.isSystem ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      Sistem
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Kustom
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Link
                      href={`/sysadmin/role/permission?role=${encodeURIComponent(role.key || role.name)}`}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title={`Atur hak akses (permission) untuk ${role.label}`}
                    >
                      <Key size={16} />
                    </Link>
                    <button
                      onClick={() => handleEdit(role)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit role"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hapus role"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form Tambah / Edit Role */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-red-600" />
              {editData ? 'Edit Role' : 'Tambah Role Baru'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Key / Identifier Role *
                </label>
                <input
                  type="text"
                  value={form.key}
                  onChange={e => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                  placeholder="contoh: hr_manager, finance_lead"
                  disabled={editData?.isSystem}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Digunakan pada konfigurasi BPMN, Workflow, dan Userlists.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Label Nama Role *
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="contoh: HR Manager, Koordinator Finance"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Deskripsi
                </label>
                <textarea
                  value={form.desc}
                  onChange={e => setForm({ ...form, desc: e.target.value })}
                  placeholder="Jelaskan cakupan tanggung jawab role ini..."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Warna Indikator Role
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditData(null)
                  setForm({ key: '', label: '', desc: '', color: '#3b82f6' })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm shadow-sm transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
