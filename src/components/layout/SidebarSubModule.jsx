'use client'
import Icon from '@/components/ui/Icon'

export default function SidebarSubModule({ label, children, open, onToggle }) {
  return (
    <div className='mb-0.5'>
      <button
        onClick={onToggle}
        className='w-full flex items-center justify-between px-3 py-1.5 text-left transition-all'
        style={{
          fontSize: '10.5px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.6px',
          color: open ? '#FFBD4A' : '#9ca3af',
          background: 'rgba(240,140,0,.08)',
          borderLeft: '3px solid #F08C00',
        }}
      >
        <span>{label}</span>
        <span style={{
          fontSize: '9px',
          display: 'inline-block',
          transition: 'transform .2s',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        }}><Icon e='▾' size={15} /></span>
      </button>
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '500px' : '0',
        transition: 'max-height .25s ease',
      }}>
        {children}
      </div>
    </div>
  )
}
