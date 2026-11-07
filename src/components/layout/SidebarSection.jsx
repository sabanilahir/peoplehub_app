'use client'
import Icon from '@/components/ui/Icon'

export default function SidebarSection({ label, children, open, onToggle }) {
  return (
    <div className='mb-1'>
      <button
        onClick={onToggle}
        className='w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all'
        style={{
          background: open ? 'rgba(240,140,0,.18)' : 'rgba(255,255,255,.04)',
          color: open ? '#fff' : '#9ca3af',
          letterSpacing: '.5px',
        }}
      >
        <span>{label}</span>
        <span style={{
          display: 'inline-block',
          transition: 'transform .2s',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          fontSize: '10px',
        }}><Icon e='▾' size={15} /></span>
      </button>
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '1000px' : '0',
        transition: 'max-height .3s ease',
      }}>
        <div className='py-1'>{children}</div>
      </div>
    </div>
  )
}
