'use client'
import { useState } from 'react'
import { useMenuStore, ICON_MAP } from '@/store/menuStore'
import { X, Plus, Edit2, Trash2, Save, Search, RotateCcw, Home, User, Users, Settings, BookOpen, Briefcase, Clock, Calendar, DollarSign, TrendingUp, Star, Award, Clipboard, UserCheck, Building2, Target, AlertCircle, CheckCircle, Trophy, Shield, Key, FileText, Bell, Link, Mail, Phone, MapPin, UsersRound, BookMarked, GraduationCap, AwardIcon, FolderKanban, Kanban, MessageSquare, Send, PieChart, BarChart3, LineChart, Activity, Heart, PlusCircle, MinusCircle, Edit, Eye, EyeOff, Lock, Unlock, Database, Server, Wifi, WifiOff, Globe, Monitor, Smartphone, Tablet, Printer, Download, Upload, Share2, Copy, Trash, Archive, Inbox, SendHorizontal, Clock4, CalendarClock, CalendarDays, CalendarCheck, UserPlus, UserMinus, UserX, Users2, Building, BuildingIcon, Landmark, Receipt, CreditCard, Wallet, ShoppingCart, Package, Box, ArchiveIcon, FolderOpen, Folder, File, FileCheck, FileX, FilePlus, FileEdit, Image, Video, Music, Mic, Camera, VideoIcon, GitBranch, Palette, ListChecks, CheckSquare } from 'lucide-react'

const ICON_OPTIONS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'user', label: 'User', icon: User },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'users2', label: 'Users2', icon: Users2 },
  { key: 'usersRound', label: 'Users Round', icon: UsersRound },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'book', label: 'Book', icon: BookOpen },
  { key: 'bookMarked', label: 'Book Marked', icon: BookMarked },
  { key: 'graduation', label: 'Graduation', icon: GraduationCap },
  { key: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { key: 'clock', label: 'Clock', icon: Clock },
  { key: 'clock4', label: 'Clock4', icon: Clock4 },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'calendarClock', label: 'Calendar Clock', icon: CalendarClock },
  { key: 'calendarDays', label: 'Calendar Days', icon: CalendarDays },
  { key: 'calendarCheck', label: 'Calendar Check', icon: CalendarCheck },
  { key: 'dollar', label: 'Dollar', icon: DollarSign },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'creditCard', label: 'Credit Card', icon: CreditCard },
  { key: 'receipt', label: 'Receipt', icon: Receipt },
  { key: 'shield', label: 'Shield', icon: Shield },
  { key: 'key', label: 'Key', icon: Key },
  { key: 'lock', label: 'Lock', icon: Lock },
  { key: 'unlock', label: 'Unlock', icon: Unlock },
  { key: 'menu', label: 'Menu', icon: Clipboard },
  { key: 'clipboard', label: 'Clipboard', icon: Clipboard },
  { key: 'file', label: 'File', icon: FileText },
  { key: 'fileText', label: 'File Text', icon: FileText },
  { key: 'fileCheck', label: 'File Check', icon: FileCheck },
  { key: 'folder', label: 'Folder', icon: Folder },
  { key: 'folderOpen', label: 'Folder Open', icon: FolderOpen },
  { key: 'archive', label: 'Archive', icon: ArchiveIcon },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'star', label: 'Star', icon: Star },
  { key: 'award', label: 'Award', icon: Award },
  { key: 'trophy', label: 'Trophy', icon: Trophy },
  { key: 'target', label: 'Target', icon: Target },
  { key: 'pieChart', label: 'Pie Chart', icon: PieChart },
  { key: 'barChart', label: 'Bar Chart', icon: BarChart3 },
  { key: 'lineChart', label: 'Line Chart', icon: LineChart },
  { key: 'heart', label: 'Heart', icon: Heart },
  { key: 'alert', label: 'Alert', icon: AlertCircle },
  { key: 'check', label: 'Check', icon: CheckCircle },
  { key: 'userCheck', label: 'User Check', icon: UserCheck },
  { key: 'userPlus', label: 'User Plus', icon: UserPlus },
  { key: 'userMinus', label: 'User Minus', icon: UserMinus },
  { key: 'userX', label: 'User X', icon: UserX },
  { key: 'building', label: 'Building', icon: Building2 },
  { key: 'buildingIcon', label: 'Building', icon: BuildingIcon },
  { key: 'landmark', label: 'Landmark', icon: Landmark },
  { key: 'bell', label: 'Bell', icon: Bell },
  { key: 'message', label: 'Message', icon: MessageSquare },
  { key: 'send', label: 'Send', icon: Send },
  { key: 'mail', label: 'Mail', icon: Mail },
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'mapPin', label: 'Map Pin', icon: MapPin },
  { key: 'globe', label: 'Globe', icon: Globe },
  { key: 'link', label: 'Link', icon: Link },
  { key: 'share', label: 'Share', icon: Share2 },
  { key: 'copy', label: 'Copy', icon: Copy },
  { key: 'download', label: 'Download', icon: Download },
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'edit', label: 'Edit', icon: Edit },
  { key: 'eye', label: 'Eye', icon: Eye },
  { key: 'eyeOff', label: 'Eye Off', icon: EyeOff },
  { key: 'trash', label: 'Trash', icon: Trash },
  { key: 'database', label: 'Database', icon: Database },
  { key: 'server', label: 'Server', icon: Server },
  { key: 'monitor', label: 'Monitor', icon: Monitor },
  { key: 'smartphone', label: 'Smartphone', icon: Smartphone },
  { key: 'printer', label: 'Printer', icon: Printer },
  { key: 'package', label: 'Package', icon: Package },
  { key: 'box', label: 'Box', icon: Box },
  { key: 'image', label: 'Image', icon: Image },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'music', label: 'Music', icon: Music },
  { key: 'mic', label: 'Mic', icon: Mic },
  { key: 'camera', label: 'Camera', icon: Camera },
  { key: 'folderKanban', label: 'Folder Kanban', icon: FolderKanban },
  { key: 'kanban', label: 'Kanban', icon: Kanban },
  { key: 'plusCircle', label: 'Plus Circle', icon: PlusCircle },
  { key: 'minusCircle', label: 'Minus Circle', icon: MinusCircle },
  { key: 'gitbranch', label: 'Git Branch / Workflow', icon: GitBranch },
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
  { key: 'checklist', label: 'Checklist', icon: CheckSquare },
  { key: 'palette', label: 'Palette', icon: Palette },
]

const MODULE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'ess', label: 'ESS' },
  { key: 'learning', label: 'Learning' },
  { key: 'hr', label: 'HR' },
  { key: 'mss', label: 'MSS' },
  { key: 'sysadmin', label: 'System Admin' },
]

const ROLE_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  { key: 'manager', label: 'Manager' },
  { key: 'hr', label: 'HR' },
  { key: 'hr_officer', label: 'HR Officer' },
  { key: 'hr_manager', label: 'HR Manager' },
  { key: 'superadmin', label: 'Superadmin' },
]

const DEPARTMENT_OPTIONS = [
  { key: 'Administration', label: 'Administration' },
  { key: 'Brand Marketing', label: 'Brand Marketing' },
  { key: 'Ecommerce & Ads', label: 'Ecommerce & Ads' },
  { key: 'Engineering', label: 'Engineering' },
  { key: 'FAT', label: 'FAT' },
  { key: 'Fullfilment', label: 'Fullfilment' },
  { key: 'HR/GA', label: 'HR/GA' },
  { key: 'IT', label: 'IT' },
  { key: 'Live Streaming', label: 'Live Streaming' },
  { key: 'Product Development', label: 'Product Development' },
  { key: 'Purchasing', label: 'Purchasing' },
  { key: 'Sales Offline', label: 'Sales Offline' },
  { key: 'Supplychain', label: 'Supplychain' },
  { key: 'Support', label: 'Support' },
]

const emptyForm = {
  key: '',
  label: '',
  icon: 'clipboard',
  href: '',
  parentId: '',
  roles: ['*'],
  departments: ['*'],
  order: 10,
  active: true,
}

export default function MenuManagementPage() {
  const { menus, addMenu, updateMenu, deleteMenu, toggleActive, resetToDefault } = useMenuStore()
  const [search, setSearch] = useState('')
  const [filterParent, setFilterParent] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showIconPicker, setShowIconPicker] = useState(false)

  // Parent sections (menu level 1 yang tampil sebagai ikon di sidebar)
  const parentSections = menus.filter(m => !m.parentId).sort((a, b) => a.order - b.order)
  // Sub-parents (menu yang memiliki sub-menu anak, misalnya Payroll)
  const subParents = menus.filter(m => menus.some(c => c.parentId === m.id) && m.parentId)

  const filtered = menus
    .filter(m => {
      if (filterParent === 'all') return true
      if (filterParent === 'root') return !m.parentId
      return String(m.parentId) === filterParent
    })
    .filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || (m.key && m.key.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => a.order - b.order)

  const handleAdd = () => {
    setEditingMenu(null)
    setForm({ ...emptyForm, order: menus.length + 1 })
    setShowModal(true)
    setShowIconPicker(false)
  }

  const handleEdit = (menu) => {
    setEditingMenu(menu)
    let roles = ['employee']
    try { roles = JSON.parse(menu.roles) } catch {}
    let departments = ['*']
    try {
      departments = typeof menu.departments === 'string' ? JSON.parse(menu.departments) : (menu.departments || ['*'])
    } catch {
      departments = ['*']
    }
    setForm({
      key: menu.key || '',
      label: menu.label || '',
      icon: menu.icon || 'clipboard',
      href: menu.href || '',
      parentId: menu.parentId ? String(menu.parentId) : '',
      roles: roles,
      departments: departments,
      order: menu.order || 1,
      active: menu.active !== false,
    })
    setShowModal(true)
    setShowIconPicker(false)
  }

  const handleRoleToggle = (roleKey) => {
    const newRoles = form.roles.includes(roleKey)
      ? form.roles.filter(r => r !== roleKey)
      : [...form.roles, roleKey]
    setForm({ ...form, roles: newRoles })
  }

  const handleDeptToggle = (deptKey) => {
    const cur = form.departments || ['*']
    if (deptKey === '*') {
      setForm({ ...form, departments: ['*'] })
      return
    }
    let filtered = cur.filter(d => d !== '*')
    if (filtered.includes(deptKey)) {
      filtered = filtered.filter(d => d !== deptKey)
    } else {
      filtered = [...filtered, deptKey]
    }
    if (filtered.length === 0) filtered = ['*']
    setForm({ ...form, departments: filtered })
  }

  const handleSave = () => {
    if (!form.label.trim()) {
      alert("Label is required")
      return
    }
    const parentId = form.parentId ? parseInt(form.parentId) : null
    const menuData = {
      key: form.key.trim() || form.label.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      label: form.label.trim(),
      icon: form.icon || 'clipboard',
      href: form.href?.trim() || null,
      parentId: parentId,
      roles: JSON.stringify(form.roles),
      departments: JSON.stringify(form.departments || ['*']),
      order: Number(form.order) || 1,
      active: form.active,
    }
    editingMenu ? updateMenu(editingMenu.id, menuData) : addMenu(menuData)
    setShowModal(false)
    setForm(emptyForm)
  }

  const handleDelete = (menu) => {
    if (confirm("Delete menu \"" + menu.label + "\"?")) {
      deleteMenu(menu.id)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1f2937" }}>Menu Management</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>Configure dynamic navigation menus</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={resetToDefault} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#f3f4f6", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, color: "#374151" }}>
            <RotateCcw size={16} /> Reset
          </button>
          <button onClick={handleAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#3b82f6", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, color: "#fff", fontWeight: 500 }}>
            <Plus size={16} /> Add Menu
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: 12, top: 10, color: "#9ca3af" }} />
          <input type="text" placeholder="Search menus..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "10px 12px 10px 40px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
        </div>
        <select value={filterParent} onChange={e => setFilterParent(e.target.value)} style={{ padding: "10px 16px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, minWidth: 220, background: "#fff" }}>
          <option value="all">📁 Semua Kelompok Menu</option>
          <option value="root">★ Menu Utama (Ikon Sidebar)</option>
          {parentSections.map(s => <option key={s.id} value={String(s.id)}>📁 Kelompok {s.label}</option>)}
          {subParents.map(s => <option key={s.id} value={String(s.id)}>↳ Sub-Menu {s.label}</option>)}
        </select>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>#</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Menu</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Kelompok Induk</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Roles</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Departemen</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: "1px solid #e5e7eb" }}>
            {filtered.map(menu => (
              <tr key={menu.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>{menu.order}</td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {(() => {
                      const Ic = ICON_MAP[menu.icon] || Clipboard
                      return <Ic size={18} />
                    })()}
                    <div>
                      <div style={{ fontWeight: 500 }}>{menu.label}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{menu.href || "(section)"}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  {menu.parentId ? (() => {
                    const parent = menus.find(p => p.id === menu.parentId)
                    const grandParent = parent?.parentId ? menus.find(g => g.id === parent.parentId) : null
                    const parentLabel = grandParent ? `${grandParent.label} › ${parent.label}` : (parent ? parent.label : `Parent #${menu.parentId}`)
                    return (
                      <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: grandParent ? "#fef3c7" : "#e0f2fe", color: grandParent ? "#92400e" : "#0369a1", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span>{grandParent ? "↳" : "📁"}</span> {parentLabel}
                      </span>
                    )
                  })() : (
                    <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#f3e8ff", color: "#7e22ce", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span>★</span> Menu Utama
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  {(() => {
                    let roles = []
                    try { roles = JSON.parse(menu.roles) } catch {}
                    return (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {roles.includes("*") ? (
                          <span style={{ padding: "2px 6px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>ALL</span>
                        ) : roles.slice(0, 2).map(r => (
                          <span key={r} style={{ padding: "2px 6px", background: "#f3f4f6", color: "#374151", borderRadius: 4, fontSize: 11 }}>{r}</span>
                        ))}
                      </div>
                    )
                  })()}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  {(() => {
                    let depts = []
                    try {
                      depts = typeof menu.departments === 'string' ? JSON.parse(menu.departments) : (menu.departments || ['*'])
                    } catch {
                      depts = ['*']
                    }
                    return (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {depts.includes("*") ? (
                          <span style={{ padding: "2px 6px", background: "#f3f4f6", color: "#4b5563", borderRadius: 4, fontSize: 11 }}>Semua (*)</span>
                        ) : depts.map(d => (
                          <span key={d} style={{ padding: "2px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{d}</span>
                        ))}
                      </div>
                    )
                  })()}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  <button onClick={() => toggleActive(menu.id)} style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: menu.active ? "#dcfce7" : "#fee2e2", color: menu.active ? "#166534" : "#dc2626" }}>
                    {menu.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(menu)} style={{ padding: 6, borderRadius: 6, border: "none", cursor: "pointer", background: "#dbeafe", color: "#1d4ed8" }} title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(menu)} style={{ padding: 6, borderRadius: 6, border: "none", cursor: "pointer", background: "#fee2e2", color: "#dc2626" }} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>No menus found</div>
        )}
      </div>
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{editingMenu ? "Edit Menu" : "Add New Menu"}</h2>
              <button onClick={() => setShowModal(false)} style={{ padding: 4, border: "none", background: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Label *</label>
                <input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Menu label" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Key</label>
                <input type="text" value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="menu-key" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Icon</label>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {(() => {
                        const Ic = ICON_MAP[form.icon] || Clipboard
                        return <Ic size={20} />
                      })()}
                      <span style={{ fontSize: 14 }}>{form.icon || 'clipboard'}</span>
                    </div>
                    <button onClick={() => setShowIconPicker(!showIconPicker)} style={{ padding: "4px 8px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
                      {showIconPicker ? "Close" : "Browse"}
                    </button>
                  </div>
                  {showIconPicker && (
                    <div style={{ maxHeight: 300, overflowY: "auto", padding: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
                        {ICON_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => { setForm({ ...form, icon: opt.key }); setShowIconPicker(false) }}
                            style={{
                              padding: 8,
                              borderRadius: 6,
                              border: form.icon === opt.key ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                              background: form.icon === opt.key ? "#dbeafe" : "#fff",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <opt.icon size={18} />
                            <span style={{ fontSize: 9, color: "#6b7280" }}>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>URL Path</label>
                <input type="text" value={form.href} onChange={e => setForm({ ...form, href: e.target.value })} placeholder="/page-url (empty = section)" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                  Kelompok Induk (Parent Section di Sidebar) *
                </label>
                <select
                  value={form.parentId || ''}
                  onChange={e => setForm({ ...form, parentId: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, background: "#fff" }}
                >
                  <option value="">★ Menu Utama (Ikon Sendiri di Sidebar)</option>
                  <optgroup label="Pilih Modul / Kelompok Utama:">
                    {parentSections
                      .filter(s => s.id !== editingMenu?.id)
                      .map(s => (
                        <option key={s.id} value={String(s.id)}>
                          📁 {s.label} ({s.key})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Pilih Sub-Menu Induk (Menu Bersarang):">
                    {menus
                      .filter(s => s.parentId && s.id !== editingMenu?.id)
                      .map(s => {
                        const p = menus.find(x => x.id === s.parentId)
                        return (
                          <option key={s.id} value={String(s.id)}>
                            ↳ {p ? `${p.label} › ` : ''}{s.label} ({s.key})
                          </option>
                        )
                      })}
                  </optgroup>
                </select>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Pilih kelompok induk agar menu ini otomatis masuk ke dalam flyout kelompok tersebut saat sidebar diklik.
                </p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Order</label>
                <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 1 })} min={1} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Access Roles</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" onClick={() => setForm({ ...form, roles: form.roles.includes("*") ? [] : ["*"] })} style={{ padding: "6px 12px", borderRadius: 6, border: form.roles.includes("*") ? "2px solid #3b82f6" : "1px solid #e5e7eb", background: form.roles.includes("*") ? "#dbeafe" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>ALL</button>
                  {ROLE_OPTIONS.map(r => (
                    <button key={r.key} type="button" onClick={() => { if (form.roles.includes("*")) return; handleRoleToggle(r.key) }} style={{ padding: "6px 12px", borderRadius: 6, border: form.roles.includes(r.key) ? "2px solid #3b82f6" : "1px solid #e5e7eb", background: form.roles.includes(r.key) ? "#dbeafe" : "#fff", cursor: form.roles.includes("*") ? "not-allowed" : "pointer", fontSize: 12, opacity: form.roles.includes("*") ? 0.5 : 1 }}>{r.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Target Departemen</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" onClick={() => handleDeptToggle('*')} style={{ padding: "6px 12px", borderRadius: 6, border: (form.departments || []).includes("*") ? "2px solid #039299" : "1px solid #e5e7eb", background: (form.departments || []).includes("*") ? "#e0f7f6" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Semua Departemen (*)</button>
                  {DEPARTMENT_OPTIONS.map(d => {
                    const isSelected = (form.departments || []).includes(d.key)
                    const isAll = (form.departments || []).includes("*")
                    return (
                      <button key={d.key} type="button" onClick={() => handleDeptToggle(d.key)} style={{ padding: "6px 12px", borderRadius: 6, border: isSelected ? "2px solid #039299" : "1px solid #e5e7eb", background: isSelected ? "#e0f7f6" : "#fff", cursor: "pointer", fontSize: 12, opacity: isAll && !isSelected ? 0.6 : 1 }}>{d.label}</button>
                    )
                  })}
                </div>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Jika memilih spesifik departemen (misal: Live Streaming), menu ini hanya akan muncul pada ESS karyawan di departemen tersebut.
                </p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Active</span>
                </label>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><Save size={16} /> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
