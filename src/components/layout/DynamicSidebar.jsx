'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useMenuStore, ICON_MAP } from '@/store/menuStore'
import { usePermissionStore } from '@/store/permissionStore'
import { ChevronRight, ChevronDown } from 'lucide-react'

function DynamicIcon({ name, size = 19 }) {
  const Icon = ICON_MAP[name] || ICON_MAP.clipboard
  if (!Icon) return null
  return <Icon size={size} />
}

export default function DynamicSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser } = useAuthStore()
  const { getSections, getItems, syncFromDatabase, dbLoaded, loading } = useMenuStore()
  const { hasPermission } = usePermissionStore()
  const role = currentUser?.role || 'employee'
  const dept = currentUser?.dept || ''
  const [openId, setOpenId] = useState(null)
  const [expandedSubIds, setExpandedSubIds] = useState({})

  // Auto-load dari PostgreSQL saat pertama kali
  useEffect(() => {
    syncFromDatabase()
  }, [])

  // Reset open menu saat pathname berubah
  useEffect(() => {
    setOpenId(null)
  }, [pathname])

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#dynamic-sidebar-container')) {
        setOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sections = getSections(role, hasPermission, dept)

  const handleSectionClick = (section) => {
    if (section.href) {
      if (section.href !== pathname) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:navigate-start'))
        }
        router.push(section.href)
      }
      setOpenId(null)
    } else {
      setOpenId(openId === section.id ? null : section.id)
    }
  }

  const isItemActive = (href) => {
    if (!href) return false
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  const isSectionActive = (section) => {
    if (section.href) return pathname === section.href || (section.href !== '/dashboard' && pathname.startsWith(section.href))
    const items = getItems(section.id, role, hasPermission, dept)
    return items.some(it => {
      if (isItemActive(it.href)) return true
      const childItems = getItems(it.id, role, hasPermission, dept)
      return childItems.some(c => isItemActive(c.href))
    })
  }

  if (loading && !dbLoaded) {
    return (
      <div
        id="dynamic-sidebar-container"
        style={{
          width: 56,
          position: 'fixed',
          left: 0,
          top: 64,
          bottom: 0,
          zIndex: 40,
          background: '#052B52',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#fff', fontSize: 18 }}>...</span>
      </div>
    )
  }

  return (
    <div
      id="dynamic-sidebar-container"
      style={{
        width: 56,
        position: 'fixed',
        left: 0,
        top: 64,
        bottom: 0,
        zIndex: 40,
        background: '#052B52',
        boxShadow: '1px 0 0 0 rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 8 }}>
        {sections.map((section) => {
          const active = isSectionActive(section)
          const isOpen = openId === section.id
          const items = getItems(section.id, role, hasPermission, dept)

          return (
            <div key={section.id} style={{ position: 'relative' }}>
              <button
                onClick={() => handleSectionClick(section)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active || isOpen ? '#039299' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title={section.label}
              >
                <DynamicIcon name={section.icon} />
              </button>

              {isOpen && items.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: 0,
                    width: 240,
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '4px 0 16px rgba(0,0,0,0.12)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    zIndex: 50,
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #052B52 0%, #064273 100%)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>{section.label}</span>
                  </div>
                  <div style={{ padding: '8px 0', maxHeight: 500, overflowY: 'auto' }}>
                    {items.map((item) => {
                      const childItems = getItems(item.id, role, hasPermission, dept)
                      const hasChildren = childItems.length > 0
                      const isChildActive = hasChildren && childItems.some(c => isItemActive(c.href))
                      const activeItem = isItemActive(item.href) || isChildActive
                      const isSubOpen = expandedSubIds[item.id] !== undefined ? expandedSubIds[item.id] : isChildActive

                      if (hasChildren) {
                        return (
                          <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 16px',
                                fontSize: 13,
                                color: activeItem ? '#0284c7' : '#334155',
                                background: activeItem && !isSubOpen ? '#f0f9ff' : 'transparent',
                                fontWeight: activeItem ? 600 : 500,
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'background 0.15s',
                              }}
                              onClick={() => {
                                setExpandedSubIds(prev => ({
                                  ...prev,
                                  [item.id]: !isSubOpen,
                                }))
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {item.icon && (
                                  <span style={{ color: activeItem ? '#0284c7' : '#64748b' }}>
                                    <DynamicIcon name={item.icon} size={15} />
                                  </span>
                                )}
                                <span>{item.label}</span>
                              </div>
                              <span style={{ color: activeItem ? '#0284c7' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                {isSubOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                            </div>

                            {isSubOpen && (
                              <div
                                style={{
                                  background: '#f8fafc',
                                  borderLeft: '2px solid #0284c7',
                                  marginLeft: 20,
                                  marginRight: 10,
                                  marginTop: 2,
                                  marginBottom: 4,
                                  padding: '4px 0',
                                  borderRadius: '0 6px 6px 0',
                                }}
                              >
                                {childItems.map((child) => {
                                  const activeChild = isItemActive(child.href)
                                  return (
                                    <Link
                                      key={child.id}
                                      href={child.href || '#'}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '7px 12px',
                                        fontSize: 12,
                                        color: activeChild ? '#0284c7' : '#475569',
                                        background: activeChild ? '#e0f2fe' : 'transparent',
                                        fontWeight: activeChild ? 600 : 400,
                                        textDecoration: 'none',
                                        borderRadius: 4,
                                        margin: '2px 4px',
                                        transition: 'all 0.15s',
                                      }}
                                      onClick={(e) => {
                                        if (child.href && child.href !== pathname) {
                                          if (typeof window !== 'undefined') {
                                            window.dispatchEvent(new CustomEvent('app:navigate-start'))
                                          }
                                          router.push(child.href)
                                        }
                                        setTimeout(() => {
                                          setOpenId(null)
                                        }, 120)
                                      }}
                                    >
                                      {child.icon && (
                                        <span style={{ color: activeChild ? '#0284c7' : '#94a3b8' }}>
                                          <DynamicIcon name={child.icon} size={13} />
                                        </span>
                                      )}
                                      <span>{child.label}</span>
                                    </Link>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={item.id}
                          href={item.href || '#'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '9px 16px',
                            fontSize: 13,
                            color: activeItem ? '#0284c7' : '#334155',
                            background: activeItem ? '#f0f9ff' : 'transparent',
                            fontWeight: activeItem ? 600 : 400,
                            textDecoration: 'none',
                            transition: 'background 0.15s',
                          }}
                          onClick={(e) => {
                            if (item.href && item.href !== pathname) {
                              if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('app:navigate-start'))
                              }
                              router.push(item.href)
                            }
                            setTimeout(() => {
                              setOpenId(null)
                            }, 120)
                          }}
                        >
                          {item.icon && (
                            <span style={{ color: activeItem ? '#0284c7' : '#64748b' }}>
                              <DynamicIcon name={item.icon} size={15} />
                            </span>
                          )}
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
