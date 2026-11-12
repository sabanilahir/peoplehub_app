'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Shield, ChevronDown, ChevronRight, Plus, X, Key, RotateCcw, Check, Sparkles } from 'lucide-react'
import { usePermissionStore, PERMISSION_GROUPS, DEFAULT_PERMISSIONS } from '@/store/permissionStore'
import { useMenuStore, ICON_MAP } from '@/store/menuStore'
import { useRoleStore } from '@/store/roleStore'

const DEFAULT_SYSTEM_ROLES = [
  { key: 'superadmin', label: 'Superadmin', color: '#dc2626' },
  { key: 'hr_manager', label: 'HR Manager', color: '#2563eb' },
  { key: 'hr', label: 'HR Staff', color: '#7c3aed' },
  { key: 'hr_officer', label: 'HR Officer', color: '#0891b2' },
  { key: 'manager', label: 'Manager', color: '#059669' },
  { key: 'supervisor', label: 'Supervisor / Coordinator', color: '#0891b2' },
  { key: 'senior_staff', label: 'Senior Staff', color: '#4f46e5' },
  { key: 'staff', label: 'Staff', color: '#d97706' },
  { key: 'employee', label: 'Employee', color: '#6b7280' },
]

function PermissionContent() {
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')

  const {
    permissions,
    rolePermissions,
    togglePermission,
    addPermission,
    deletePermission,
    getByGroup,
    getRolePermissions,
    syncFromMenus,
    syncRolesFromBackend,
    reset,
  } = usePermissionStore()
  const { menus, syncFromDatabase } = useMenuStore()
  const { roles: storeRoles, fetchRoles } = useRoleStore()

  const [selectedRole, setSelectedRole] = useState(roleParam || 'superadmin')
  const [expandedGroups, setExpandedGroups] = useState([
    'ess',
    'lms',
    'hr',
    'mss',
    'sysadmin',
    'sysadmin-workflow',
    'user-workflow',
  ])
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPerm, setNewPerm] = useState({ key: '', label: '', group: 'ess' })
  const [savedNotice, setSavedNotice] = useState(false)

  // Ambil data role & menu dari database saat mount
  useEffect(() => {
    fetchRoles()
    syncRolesFromBackend()
    syncFromDatabase()
  }, [fetchRoles, syncRolesFromBackend, syncFromDatabase])

  // Otomatis rekonsiliasi seluruh sub-menu dari useMenuStore ke daftar permissions
  useEffect(() => {
    if (Array.isArray(menus) && menus.length > 0) {
      syncFromMenus(menus)
    }
  }, [menus, syncFromMenus])

  // Sinkronkan selectedRole jika query parameter ?role berubah
  useEffect(() => {
    if (roleParam) {
      setSelectedRole(roleParam)
    }
  }, [roleParam])

  // Gabungkan role dari store / database dengan role sistem bawaan
  const allRoles = useMemo(() => {
    const list = [...DEFAULT_SYSTEM_ROLES]
    if (Array.isArray(storeRoles)) {
      storeRoles.forEach((sr) => {
        const k = (sr.key || sr.name || '').toLowerCase()
        const existingIdx = list.findIndex((r) => r.key === k)
        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            label: sr.label || list[existingIdx].label,
            color: sr.color || list[existingIdx].color,
          }
        } else if (k) {
          list.push({
            key: k,
            label: sr.label || sr.name,
            color: sr.color || '#0284c7',
          })
        }
      })
    }
    return list
  }, [storeRoles])

  // Dapatkan izin hak akses aktif untuk role terpilih (dengan fallback ke smart template)
  const currentPerms = useMemo(() => {
    return getRolePermissions(selectedRole)
  }, [rolePermissions, selectedRole, getRolePermissions])

  // Auto-reconcile jika ada permission default (seperti overtime) yang belum ada di local store
  useEffect(() => {
    if (!permissions || !Array.isArray(permissions)) return
    const currentKeys = new Set(permissions.map((p) => p.key))
    const missing = DEFAULT_PERMISSIONS.filter((p) => !currentKeys.has(p.key))
    if (missing.length > 0) {
      missing.forEach((p) => addPermission(p))
    }
  }, [permissions, addPermission])

  // Sinkronkan permission dari database backend saat pertama kali load
  useEffect(() => {
    fetch('/api/permissions')
      .then((res) => (res.ok ? res.json() : []))
      .then((dbPerms) => {
        if (!Array.isArray(dbPerms)) return
        const currentKeys = new Set(permissions.map((p) => p.key))
        dbPerms.forEach((dp) => {
          if (dp.key && !currentKeys.has(dp.key)) {
            addPermission({
              id: dp.id,
              key: dp.key,
              label: dp.name || dp.label || dp.key,
              group: dp.group || dp.module || 'ess',
            })
            currentKeys.add(dp.key)
          }
        })
      })
      .catch((err) => console.warn('[PermissionPage] Gagal sinkron DB permissions:', err))
  }, [])

  // Simpan perubahan permissions ke PostgreSQL backend
  const persistPermissionsToBackend = async (roleKey, updatedPerms) => {
    try {
      await fetch('/api/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: roleKey,
          permissions: updatedPerms,
        }),
      })
    } catch (e) {
      console.warn('[PermissionPage] Gagal menyimpan ke /api/roles:', e.message)
    }
  }

  const triggerNotice = () => {
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2000)
  }

  const toggleGroup = (group) =>
    setExpandedGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]))

  const toggleAllInGroup = (group) => {
    const gp = getByGroup(group).map((p) => p.key)
    const all = gp.length > 0 && gp.every((k) => currentPerms.includes(k))
    let newSet = new Set(currentPerms)

    gp.forEach((k) => {
      if (all) {
        newSet.delete(k)
        if (currentPerms.includes(k)) togglePermission(selectedRole, k)
      } else {
        newSet.add(k)
        if (!currentPerms.includes(k)) togglePermission(selectedRole, k)
      }
    })

    persistPermissionsToBackend(selectedRole, Array.from(newSet))
    triggerNotice()
  }

  const handleToggle = (key) => {
    togglePermission(selectedRole, key)
    const newPerms = currentPerms.includes(key)
      ? currentPerms.filter((k) => k !== key)
      : [...currentPerms, key]
    persistPermissionsToBackend(selectedRole, newPerms)
    triggerNotice()
  }

  const handleAddPermission = () => {
    if (!newPerm.key || !newPerm.label) return
    addPermission({ key: newPerm.key, label: newPerm.label, group: newPerm.group })
    setNewPerm({ key: '', label: '', group: 'ess' })
    setShowAddModal(false)
    triggerNotice()
  }

  const handleResetDefaults = () => {
    if (confirm('Reset seluruh permission dan hak akses role ke standar default sistem?')) {
      reset()
      triggerNotice()
    }
  }

  // Sinkronkan otomatis permission dari default sistem, database, dan menu kustom
  const handleSyncFromMenus = async () => {
    await syncFromDatabase()
    await syncRolesFromBackend()
    const latestMenus = useMenuStore.getState().menus || menus
    let addedCount = syncFromMenus(latestMenus)
    const existingKeys = new Set((usePermissionStore.getState().permissions || []).map((p) => p.key))

    // Dari tabel database /api/permissions
    try {
      const res = await fetch('/api/permissions')
      if (res.ok) {
        const dbPerms = await res.json()
        if (Array.isArray(dbPerms)) {
          dbPerms.forEach((dp) => {
            if (dp.key && !existingKeys.has(dp.key)) {
              addPermission({
                id: dp.id,
                key: dp.key,
                label: dp.name || dp.label || dp.key,
                group: dp.group || dp.module || 'ess',
              })
              existingKeys.add(dp.key)
              addedCount++
            }
          })
        }
      }
    } catch (e) {
      console.warn('[PermissionPage] Sync API error:', e)
    }

    triggerNotice()
    alert(
      addedCount > 0
        ? `Berhasil menyinkronkan ${addedCount} sub-menu & permission baru!`
        : 'Semua sub-menu dan permission sudah tersinkronisasi.'
    )
  }

  const filteredPermissions = search
    ? permissions.filter(
        (p) =>
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.key.toLowerCase().includes(search.toLowerCase())
      )
    : permissions

  const groupedPermissions = PERMISSION_GROUPS.map((g) => ({
    ...g,
    items: filteredPermissions.filter((p) => p.group === g.key),
  })).filter((g) => g.items.length > 0)

  const selectedRoleObj = allRoles.find((r) => r.key === selectedRole) || {
    key: selectedRole,
    label: selectedRole,
    color: '#0891b2',
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <Shield className="w-7 h-7 text-teal-600" />
            Permission & Sub-Menu Management
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Kelola hak akses sub-menu sidebar dan izin fitur untuk setiap role pengguna secara dinamis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in">
              <Check size={14} /> Tersimpan
            </span>
          )}
          <button
            onClick={handleSyncFromMenus}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold hover:bg-teal-100 transition"
            title="Sinkronkan sub-menu baru dari database ke permission"
          >
            <Sparkles size={14} /> Sinkronkan Menu
          </button>
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100 transition"
            title="Kembalikan semua role & permission ke pengaturan standar"
          >
            <RotateCcw size={14} /> Reset Default
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Role Selector Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-xs text-gray-400 uppercase tracking-wider">
                Pilih Role ({allRoles.length})
              </h2>
            </div>
            <div className="space-y-1">
              {allRoles.map((role) => {
                const count = getRolePermissions(role.key).length
                const isActive = selectedRole === role.key
                return (
                  <button
                    key={role.key}
                    onClick={() => setSelectedRole(role.key)}
                    className={
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ' +
                      (isActive
                        ? 'bg-teal-50 text-teal-800 font-semibold shadow-xs border border-teal-200'
                        : 'text-gray-600 hover:bg-gray-50 border border-transparent')
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: role.color || '#0891b2' }}
                      />
                      <span className="truncate">{role.label}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium flex-shrink-0">
                      {role.key === 'superadmin' ? 'Semua' : count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Permission List Panel */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
              <div>
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedRoleObj?.color || '#0891b2' }}
                  />
                  Hak Akses Sub-Menu: {selectedRoleObj?.label}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Centang sub-menu yang boleh dilihat dan diakses oleh pengguna dengan role ini
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Cari sub-menu atau izin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-sm w-56 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                />
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus size={15} /> Tambah Izin
                </button>
              </div>
            </div>

            {/* Permission Group List */}
            <div className="divide-y divide-gray-100 overflow-auto" style={{ maxHeight: 'calc(100vh - 270px)' }}>
              {groupedPermissions.map((group) => {
                const isExpanded = expandedGroups.includes(group.key)
                const gp = getByGroup(group.key)
                const isSuper = selectedRole === 'superadmin'
                const all = isSuper || (gp.length > 0 && gp.every((p) => currentPerms.includes(p.key)))
                const some = !isSuper && gp.some((p) => currentPerms.includes(p.key)) && !all
                const cnt = isSuper ? gp.length : gp.filter((p) => currentPerms.includes(p.key)).length
                const IconComponent = group.icon && ICON_MAP[group.icon] ? ICON_MAP[group.icon] : null

                return (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full px-4 py-3 bg-gray-50/80 flex items-center justify-between hover:bg-gray-100/80 transition"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown size={18} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={18} className="text-gray-500" />
                        )}
                        <input
                          type="checkbox"
                          checked={all}
                          disabled={isSuper}
                          ref={(el) => {
                            if (el) el.indeterminate = some
                          }}
                          onChange={() => toggleAllInGroup(group.key)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                        />
                        {IconComponent && (
                          <span className="w-6 h-6 rounded-lg bg-teal-100/80 text-teal-800 flex items-center justify-center">
                            <IconComponent size={14} />
                          </span>
                        )}
                        <span className="font-bold text-gray-800 text-sm">{group.label}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white text-gray-500 border border-gray-200 font-semibold">
                          {cnt} / {gp.length} aktif
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-gray-100 bg-white">
                        {group.items.map((perm) => {
                          const checked = isSuper || currentPerms.includes(perm.key)
                          const menuItem = menus.find(
                            (m) => (m.permissionKey || m.key.replace(/-/g, '_')) === perm.key
                          )
                          const ItemIcon = menuItem?.icon && ICON_MAP[menuItem.icon] ? ICON_MAP[menuItem.icon] : null

                          return (
                            <div
                              key={perm.key}
                              className="flex items-center justify-between px-5 py-2.5 hover:bg-teal-50/30 transition"
                            >
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isSuper}
                                  onChange={() => handleToggle(perm.key)}
                                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                                />
                                {ItemIcon && (
                                  <span className="text-gray-400">
                                    <ItemIcon size={14} />
                                  </span>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{perm.label}</p>
                                  <p className="text-[11px] text-gray-400 font-mono">{perm.key}</p>
                                </div>
                              </label>

                              {perm.isCustom && (
                                <button
                                  onClick={() => deletePermission(perm.key)}
                                  className="text-gray-400 hover:text-red-500 p-1 rounded transition"
                                  title="Hapus Izin Kustom"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah Izin Baru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <Key size={18} className="text-teal-600" />
              Tambah Izin / Fitur Baru
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Key Izin (Huruf kecil & underscore)
                </label>
                <input
                  type="text"
                  placeholder="contoh: export_pdf_report"
                  value={newPerm.key}
                  onChange={(e) =>
                    setNewPerm({ ...newPerm, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Label / Nama Izin
                </label>
                <input
                  type="text"
                  placeholder="contoh: Export Laporan PDF"
                  value={newPerm.label}
                  onChange={(e) => setNewPerm({ ...newPerm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Grup Fitur
                </label>
                <select
                  value={newPerm.group}
                  onChange={(e) => setNewPerm({ ...newPerm, group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  {PERMISSION_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddPermission}
                className="px-4 py-2 text-sm bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition"
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

export default function PermissionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Memuat hak akses permission...</div>}>
      <PermissionContent />
    </Suspense>
  )
}
