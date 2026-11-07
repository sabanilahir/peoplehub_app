'use client'
import Icon from '@/components/ui/Icon'
import { useEffect, useState } from 'react'
import { useToastStore } from '@/store/toastStore'

const CONFIG = {
  success: {
    icon: '✅',
    bar: 'linear-gradient(90deg,#059669,#34d399)',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#065f46',
    title: 'Berhasil',
  },
  error: {
    icon: '❌',
    bar: 'linear-gradient(90deg,#dc2626,#f87171)',
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#7f1d1d',
    title: 'Gagal',
  },
  warning: {
    icon: '⚠️',
    bar: 'linear-gradient(90deg,#d97706,#fbbf24)',
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#78350f',
    title: 'Perhatian',
  },
  info: {
    icon: 'ℹ️',
    bar: 'linear-gradient(90deg,#2563eb,#60a5fa)',
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e3a8a',
    title: 'Info',
  },
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const cfg = CONFIG[toast.type] || CONFIG.success

  useEffect(() => {
    // Trigger enter animation
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => onDismiss(toast.id), 250)
  }

  return (
    <div
      onClick={handleDismiss}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        minWidth: 280,
        maxWidth: 360,
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.95)',
      }}>
      {/* Color bar */}
      <div style={{ height: 3, background: cfg.bar }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}><Icon e={cfg.icon} size={16} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: cfg.text, margin: 0 }}>{cfg.title}</p>
          <p style={{ fontSize: 12, color: cfg.text, opacity: 0.8, margin: '2px 0 0', lineHeight: 1.4 }}>{toast.message}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); handleDismiss() }}
          style={{ color: cfg.text, opacity: 0.4, fontSize: 14, lineHeight: 1, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ✕
        </button>
      </div>
    </div>
  )
}

export default function Toast() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  )
}
