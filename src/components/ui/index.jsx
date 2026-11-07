'use client'
/*
 * Shared enterprise design system for the Kappabel HRIS prototype.
 * Workday / Darwinbox / Stripe-inspired: clean, calm, subtle shadows,
 * no heavy borders. Brand color #052B52 → #039299.
 *
 * Tailwind only. Import what you need:
 *   import { PageHeader, StatCard, DataTable, ... } from '@/components/ui'
 */
import Link from 'next/link'
import Icon from './Icon'
export { default as DocCompletionDonut } from './DocCompletionDonut'
export { default as FixedDurationVideo } from './FixedDurationVideo'

/* ---------------------------------------------------------------- tokens */
export const BRAND_GRADIENT = 'linear-gradient(135deg, #052B52, #039299)'
export const BRAND = '#052B52'

// Render an icon prop: a string (emoji) is converted to a professional SVG
// line icon (falls back to the emoji itself if unmapped); a node is used as-is.
const asIcon = (icon, size = 16) =>
  typeof icon === 'string' ? <Icon e={icon} size={size} /> : icon

/* ------------------------------------------------------------ PageHeader */
export function PageHeader({ title, subtitle, icon, actions, children }) {
  return (
    <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
      <div className='flex items-start gap-3'>
        {icon && (
          <div
            className='flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl text-white shadow-sm'
            style={{ background: BRAND_GRADIENT }}
          >
            {asIcon(icon, 22)}
          </div>
        )}
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-gray-900'>{title}</h1>
          {subtitle && <p className='mt-1 text-sm text-gray-500'>{subtitle}</p>}
        </div>
      </div>
      {(actions || children) && (
        <div className='flex flex-shrink-0 items-center gap-2'>{actions || children}</div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- StatCard */
const STAT_TONES = {
  brand:  { bar: '#052B52', soft: 'bg-teal-50',   text: 'text-teal-700'   },
  blue:   { bar: '#3b82f6', soft: 'bg-blue-50',   text: 'text-blue-700'   },
  green:  { bar: '#10b981', soft: 'bg-emerald-50',text: 'text-emerald-700'},
  orange: { bar: '#f59e0b', soft: 'bg-amber-50',  text: 'text-amber-700'  },
  red:    { bar: '#ef4444', soft: 'bg-red-50',    text: 'text-red-700'    },
  purple: { bar: '#8b5cf6', soft: 'bg-violet-50', text: 'text-violet-700' },
  teal:   { bar: '#14b8a6', soft: 'bg-teal-50',   text: 'text-teal-700'   },
  violet: { bar: '#7c3aed', soft: 'bg-violet-50', text: 'text-violet-700' },
  gray:   { bar: '#6b7280', soft: 'bg-gray-100',  text: 'text-gray-700'   },
}

export function StatCard({ label, value, icon, tone = 'brand', hint, href }) {
  const t = STAT_TONES[tone] || STAT_TONES.brand
  const card = (
    <div
      className='group relative h-full overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-md'
      style={{ borderTop: `3px solid ${t.bar}` }}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='truncate text-xs font-medium uppercase tracking-wide text-gray-400'>{label}</div>
          <div className='mt-2 text-3xl font-bold leading-none tracking-tight text-gray-900'>{value}</div>
          {hint && <div className='mt-2 text-xs text-gray-400'>{hint}</div>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${t.soft} ${t.text}`}>
            {asIcon(icon, 20)}
          </div>
        )}
      </div>
    </div>
  )
  return href ? <Link href={href} className='block h-full'>{card}</Link> : card
}

/* ------------------------------------------------------------- DataTable */
export function DataTable({ columns = [], headers = [], children, className = '' }) {
  const tableCols = columns.length > 0 ? columns : headers
  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 ${className}`}>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          {tableCols.length > 0 && (
            <thead>
              <tr className='border-b border-gray-100 bg-gray-50/80'>
                {tableCols.map((c, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                      c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    {c.label ?? c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className='divide-y divide-gray-100'>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export function Tr({ children, onClick, active = false, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors ${onClick ? 'cursor-pointer' : ''} ${
        active ? 'bg-teal-50/60' : 'hover:bg-gray-50'
      } ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, align, className = '' }) {
  const a = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return <td className={`px-4 py-3 text-gray-700 ${a} ${className}`}>{children}</td>
}

/* ------------------------------------------------------------- SearchBar */
export function SearchBar({ value, onChange, placeholder = 'Search…', onSubmit, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'><Icon name='search' size={15} /></span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.() }}
        placeholder={placeholder}
        className='w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100'
      />
    </div>
  )
}

/* ------------------------------------------------------------- FilterBar */
export function FilterBar({ children, className = '' }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
}

export function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-teal-700 text-white shadow-sm'
          : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

/* ----------------------------------------------------------- StatusBadge */
const STATUS_MAP = {
  // semantic keys
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger:  'bg-red-50 text-red-700 ring-red-200',
  info:    'bg-blue-50 text-blue-700 ring-blue-200',
  purple:  'bg-violet-50 text-violet-700 ring-violet-200',
  pink:    'bg-pink-50 text-pink-700 ring-pink-200',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-200',
  // common HR statuses (auto-mapped)
  Approved:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Active:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Completed:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Applied:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Preparation:'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Pending:    'bg-amber-50 text-amber-700 ring-amber-200',
  Submitted:  'bg-amber-50 text-amber-700 ring-amber-200',
  Rejected:   'bg-red-50 text-red-700 ring-red-200',
  Terminated: 'bg-red-50 text-red-700 ring-red-200',
  Inactive:   'bg-gray-100 text-gray-600 ring-gray-200',
  Resigned:   'bg-gray-100 text-gray-600 ring-gray-200',
  Draft:      'bg-gray-100 text-gray-600 ring-gray-200',
}

export function StatusBadge({ status, tone, children }) {
  const cls = STATUS_MAP[tone] || STATUS_MAP[status] || STATUS_MAP.neutral
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {children ?? status}
    </span>
  )
}

/* ---------------------------------------------------------- ActionButton */
const BTN_VARIANTS = {
  primary:   'text-white shadow-sm hover:shadow-md',
  secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  danger:    'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost:     'text-gray-600 hover:bg-gray-100',
}

export function ActionButton({
  variant = 'primary', size = 'md', icon, children, className = '', href, ...rest
}) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' }
  const base = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${BTN_VARIANTS[variant]} ${className}`
  const style = variant === 'primary' ? { background: BRAND_GRADIENT } : undefined
  const content = (<>{icon && <span className='inline-flex items-center'>{asIcon(icon, 15)}</span>}{children}</>)
  if (href) return <Link href={href} className={base} style={style} {...rest}>{content}</Link>
  return <button className={base} style={style} {...rest}>{content}</button>
}

/* -------------------------------------------------------------- FormField */
export function FormField({ label, required, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className='mb-1.5 block text-xs font-semibold text-gray-600'>
          {label}{required && <span className='text-red-500'> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className='mt-1 block text-xs text-gray-400'>{hint}</span>}
      {error && <span className='mt-1 block text-xs text-red-500'>{error}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:text-gray-400'

export function Input(props) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />
}
export function Select({ children, ...props }) {
  return <select {...props} className={`${inputClass} ${props.className || ''}`}>{children}</select>
}

/* ------------------------------------------------------------- EmptyState */
export function EmptyState({ icon = '📭', title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center ${className}`}>
      <div className='mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-100'>
        {asIcon(icon, 26)}
      </div>
      {title && <h3 className='text-sm font-semibold text-gray-700'>{title}</h3>}
      {description && <p className='mt-1 max-w-sm text-xs text-gray-400'>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------ SectionCard */
export function SectionCard({ title, subtitle, icon, actions, children, className = '', bodyClass = '' }) {
  return (
    <section className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 ${className}`}>
      {(title || actions) && (
        <header className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4'>
          <div className='flex items-center gap-2'>
            {icon && <span className='text-gray-500 flex items-center'>{asIcon(icon, 16)}</span>}
            <div>
              <h2 className='text-sm font-bold text-gray-800'>{title}</h2>
              {subtitle && <p className='text-xs text-gray-400'>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className='flex items-center gap-2'>{actions}</div>}
        </header>
      )}
      <div className={`p-5 ${bodyClass}`}>{children}</div>
    </section>
  )
}
