'use client'
import { useState, useEffect, useRef } from 'react'
import Link                             from 'next/link'
import { usePathname, useRouter }       from 'next/navigation'
import { useAuthStore }                 from '@/store/authStore'
import { useEmployeeStore }             from '@/store/employeeStore'
import { HR_ROLES, TALENT_ONLY_ROLES }  from '@/constants/roles'

// ─── Strip icons (icon strip left) ────────────────────────────────────────────
const IcHome   = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IcPerson = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcTeam   = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
const IcHR     = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
const IcSA     = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M17.66 17.66l1.41 1.41"/></svg>
const IcLMS    = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>

// ─── Item SVG icons ───────────────────────────────────────────────────────────
const icons = {
  // Personal / HR
  person:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  team:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  calendar:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clock:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  briefcase:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  money:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  chart:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  check:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  checkCircle:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  book:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  star:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  award:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  settings:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M17.66 17.66l1.41 1.41"/></svg>,
  workflow:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>,
  paint:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13.5V20a2 2 0 002 2h16a2 2 0 002-2v-6.5"/><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>,
  building:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
  layers:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  grid:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  tag:          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  list:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  plane:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  shuffle:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
  upload:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  clipboard:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  target:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  gauge:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0110 10"/><path d="M12 2A10 10 0 002 12"/><path d="M12 12l4.5-4.5"/><circle cx="12" cy="12" r="2"/></svg>,
  bell:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  userCheck:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  users:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  map:          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  trending:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  shield:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  edit:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  repeat:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  archive:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  video:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  cpu:          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  zap:          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  smile:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  activity:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  link:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  hash:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  trophy:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>,
  globe:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  share:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  fileText:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  mail:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4a2 2 0 01-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>,
}

const ic = (name) => icons[name] || icons.list

// ─── Flyout nav item ──────────────────────────────────────────────────────────
function FlyItem({ label, href, onClick }) {
  const pathname = usePathname()
  const active   = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <Link href={href} onClick={onClick}
      className={`group relative flex items-center gap-2.5 pl-5 pr-3 py-1.5 mx-1 rounded-lg text-[13px] transition-colors ${
        active
          ? 'bg-teal-50 text-teal-900 font-semibold'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
      }`}>
      {/* Minimal bullet indicator instead of a per-item icon */}
      <span className={`absolute left-2.5 h-1.5 w-1.5 rounded-full transition-colors ${
        active ? 'bg-teal-600' : 'bg-gray-300 group-hover:bg-gray-400'
      }`} />
      <span className='leading-snug'>{label}</span>
    </Link>
  )
}

// ─── Chevron kanan (indikator cascade) ────────────────────────────────────────
const ChevronRight = ({ dim }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    className={dim ? 'text-gray-300' : 'text-gray-400'}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ─── Baris grup pada kolom cascade ────────────────────────────────────────────
function CascadeRow({ label, icon, active, hasChild, onEnter }) {
  return (
    <button onMouseEnter={onEnter} onFocus={onEnter}
      className={`mx-1 flex w-[calc(100%-8px)] items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${
        active ? 'bg-teal-50' : 'hover:bg-gray-50'
      }`}>
      <span className='flex min-w-0 items-center gap-2.5'>
        {icon && (
          <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg transition-colors ${
            active ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
          }`}>{icon}</span>
        )}
        <span className={`truncate text-[13px] font-semibold ${active ? 'text-teal-900' : 'text-gray-700'}`}>{label}</span>
      </span>
      {hasChild && <ChevronRight dim={!active} />}
    </button>
  )
}

// ─── Navigation data ──────────────────────────────────────────────────────────
const ESS_GROUPS = [
  { title: 'Personal', icon: ic('person'), items: [
    { label: 'My Profile',           href: '/ess/profile',        icon: ic('user') },
    { label: 'My Onboarding',        href: '/ess/onboarding',     icon: ic('checkCircle') },
  ]},
  { title: 'Time & Labor', icon: ic('clock'), items: [
    { label: 'Clock In/Out',         href: '/ess/clock',          icon: ic('clock') },
    { label: 'My Calendar',          href: '/ess/calendar',       icon: ic('calendar') },
    { label: 'My Attendance',        href: '/ess/attendance',     icon: ic('list') },
    { label: 'Apply Leave',          href: '/ess/apply-leave',    icon: ic('calendar') },
  ]},
  { title: 'Talent Management', icon: ic('star'), items: [
    { label: 'My Talent Profile',    href: '/ess/talent/profile',        icon: ic('star') },
    { label: 'My IDP',               href: '/ess/talent/idp',            icon: ic('target') },
    { label: 'Competency Assessment', href: '/ess/competency-assessment', icon: ic('shield') },
  ]},
  { title: 'Offboarding', icon: ic('archive'), items: [
    { label: 'My Offboarding',       href: '/ess/offboarding',    icon: ic('archive') },
  ]},
  { title: 'Performance', icon: ic('gauge'), items: [
    { label: 'Performance Check-In', href: '/ess/check-in',       icon: ic('gauge') },
    { label: 'PIP',                  href: '/ess/pip',            icon: ic('clipboard') },
  ]},
]

const MSS_GROUPS = [
  { title: 'Emergency SOS', icon: ic('activity'), items: [
    { label: 'Emergency SOS Log', href: '/hr/emergency-sos', icon: ic('activity') },
  ]},
  { title: 'Attendance & Leave', icon: ic('clock'), items: [
    { label: 'Team Attendance',            href: '/mss/team-attendance',    icon: ic('clock') },
    { label: 'Apply Leave (My Team)',      href: '/mss/apply-leave-team',   icon: ic('calendar') },
    { label: 'Approve Leave',              href: '/mss/approve-leave',      icon: ic('checkCircle') },
  ]},
  { title: 'Performance', icon: ic('gauge'), items: [
    { label: 'Team Performance Check-In', href: '/mss/check-in',           icon: ic('gauge') },
    { label: 'Competency Assessment',     href: '/mss/competency-assessment', icon: ic('shield') },
    { label: 'PIP',                        href: '/mss/pip',                icon: ic('clipboard') },
    { label: 'Form Feedback',              href: '/mss/feedback',           icon: ic('edit') },
    { label: 'Congratulation Message',     href: '/mss/congratulation',     icon: ic('smile') },
  ]},
  { title: 'Onboarding', icon: ic('userCheck'), items: [
    { label: 'Onboarding Tim Saya',        href: '/mss/approve-onboarding', icon: ic('userCheck') },
  ]},
  { title: 'Offboarding', icon: ic('archive'), items: [
    { label: 'Ajukan Resign',              href: '/mss/offboarding',           icon: ic('archive') },
    { label: 'Offboarding Checklist',       href: '/mss/offboarding-checklist', icon: ic('checkCircle') },
  ]},
  { title: 'Talent', icon: ic('star'), items: [
    { label: 'IDP Review Tim',             href: '/mss/talent/idp-review',  icon: ic('target') },
    { label: '9-Box Tim Saya',             href: '/mss/talent/nine-box',    icon: ic('grid') },
    { label: 'Career Path Tim',            href: '/mss/talent/career-path', icon: ic('map') },
  ]},
]

const LMS_GROUPS = [
  { title: 'My Learning (ESS)', icon: ic('person'), items: [
    { label: 'My Learning Dashboard',  href: '/ess/learning/dashboard',          icon: ic('chart') },
    { label: 'Course Catalog',          href: '/ess/learning/catalog',           icon: ic('book') },
    { label: 'My Courses',              href: '/ess/learning/my-courses',        icon: ic('video') },
    { label: 'Learning Path',           href: '/ess/learning/learning-path',     icon: ic('layers') },
    { label: 'Assessments & Eval',      href: '/ess/learning/assessments',       icon: ic('clipboard') },
    { label: 'My Certificates',         href: '/ess/learning/certificates',      icon: ic('award') },
    { label: 'Learning Transcript',     href: '/ess/learning/transcript',        icon: ic('fileText') },
    { label: 'Kompetensi & Skill Gap',   href: '/ess/learning/competency-profile',icon: ic('shield') },
    { label: 'My IDP',                  href: '/ess/learning/idp',               icon: ic('target') },
    { label: 'Learning Calendar',       href: '/ess/learning/calendar',          icon: ic('calendar') },
    { label: 'Leaderboard & Badge',     href: '/ess/learning/leaderboard',       icon: ic('trophy') },
    { label: 'Community & Sharing',     href: '/ess/learning/community',         icon: ic('globe') },
    { label: 'Req External Training',   href: '/ess/learning/request-external',  icon: ic('plane') },
    { label: 'Record External',         href: '/ess/learning/record-external',   icon: ic('upload') },
    { label: 'Submission Point',        href: '/ess/learning/submission-point',  icon: ic('target') },
    { label: 'Notifications',           href: '/ess/learning/notifications',     icon: ic('bell') },
    { label: 'Learning Profile',        href: '/ess/learning/profile',           icon: ic('person') },
  ]},
  { title: 'Team Learning (MSS)', icon: ic('team'), items: [
    { label: 'Team Learning Dashboard', href: '/mss/learning/dashboard',        icon: ic('chart') },
    { label: 'Mandatory Monitoring',    href: '/mss/learning/mandatory',        icon: ic('check') },
    { label: 'Training Approval',       href: '/mss/learning/approval',         icon: ic('checkCircle') },
    { label: 'Team Assignment',         href: '/mss/learning/assignment',       icon: ic('clipboard') },
    { label: 'Team Progress',           href: '/mss/learning/progress',         icon: ic('trending') },
    { label: 'Request External',        href: '/mss/learning/request-external', icon: ic('plane') },
    { label: 'Behavior Evaluation',     href: '/mss/learning/behavior-eval',    icon: ic('activity') },
    { label: 'Team Competency',         href: '/mss/learning/competency',       icon: ic('shield') },
    { label: 'Gap Analysis',            href: '/mss/learning/gap-analysis',     icon: ic('target') },
    { label: 'Recommendation',          href: '/mss/learning/recommendation',   icon: ic('star') },
    { label: 'Cert Approval',           href: '/mss/learning/cert-approval',    icon: ic('award') },
    { label: 'Team Calendar',           href: '/mss/learning/calendar',         icon: ic('calendar') },
    { label: 'Team Leaderboard',        href: '/mss/learning/leaderboard',      icon: ic('trophy') },
    { label: 'Team Report',             href: '/mss/learning/report',           icon: ic('fileText') },
    { label: 'Notifications',           href: '/mss/learning/notifications',    icon: ic('bell') },
  ]},
]

const HR_GROUPS = [
  { title: 'Emergency SOS', icon: ic('activity'), items: [
    { label: 'Emergency SOS Log', href: '/hr/emergency-sos', icon: ic('activity') },
  ]},
  { title: 'Structure', icon: ic('building'), items: [
    { label: 'Company',          href: '/hr/structure/company',           icon: ic('building') },
    { label: 'Department',       href: '/hr/structure/department',        icon: ic('users') },
    { label: 'Position',         href: '/hr/structure/position',          icon: ic('briefcase') },
    { label: 'Headcount',        href: '/hr/structure/headcount',         icon: ic('person') },
    { label: 'Org Chart',        href: '/hr/org-chart',                   icon: ic('map') },
  ]},
  { title: 'Employee', icon: ic('person'), items: [
    { label: 'Employee Data',    href: '/hr/employee',       icon: ic('person') },
    { label: 'Apply Leave (HR)', href: '/hr/apply-leave',    icon: ic('calendar') },
  ]},
  { title: 'Recruitment', icon: ic('briefcase'), items: [
    { label: 'Career Site Setup', href: '/hr/recruitment/career-site-setup', icon: ic('globe') },
    { label: 'Job Requisition',   href: '/hr/recruitment/job-requisition',   icon: ic('briefcase') },
    { label: 'Candidate Pipeline',href: '/hr/recruitment/candidate-pipeline',icon: ic('repeat') },
    { label: 'Pending Employee',  href: '/hr/recruitment/pending-employee',  icon: ic('userCheck') },
    { label: 'Interview Schedule',href: '/hr/recruitment/interview-schedule',icon: ic('video') },
    { label: 'Candidate Database',href: '/hr/recruitment/candidate-database',icon: ic('archive') },
    { label: 'Psychotest',        href: '/hr/recruitment/psychotest',        icon: ic('clipboard') },
    { label: 'Hasil Psychotest',  href: '/hr/recruitment/psychotest/results',icon: ic('chart') },
  ]},
  { title: 'Payroll', icon: ic('money'), items: [
    { label: 'Kalkulator Payroll HO', href: '/hr/payroll/ho-calculator', icon: ic('calculator') },
    { label: 'Integrasi Odoo Payroll', href: '/hr/payroll/odoo-sync', icon: ic('zap') },
    { label: 'Payroll Run',      href: '/hr/payroll/run',      icon: ic('money') },
    { label: 'Payroll Setup',    href: '/hr/payroll/setup',    icon: ic('list') },
    { label: 'SPT PPh 21 (1721-A1)', href: '/hr/payroll/spt21', icon: ic('doc') },
    { label: 'Payroll Settings', href: '/hr/payroll/settings', icon: ic('settings') },
  ]},
  { title: 'Onboarding', icon: ic('target'), items: [
    { label: 'Employee Onboarding',         href: '/hr/onboarding/tracker',    icon: ic('users') },
    { label: 'Master Onboarding',          href: '/hr/onboarding/master',     icon: ic('clipboard') },
    { label: 'Master Form',                 href: '/hr/onboarding/forms',      icon: ic('fileText') },
    { label: 'Auto Assign',                 href: '/hr/onboarding/auto-assign', icon: ic('zap') },
    { label: 'Laporan Onboarding',         href: '/hr/onboarding/laporan',    icon: ic('chart') },
  ]},
  { title: 'Offboarding', icon: ic('archive'), items: [
    { label: 'Monitor & Persetujuan',       href: '/hr/employee/personnel-action/offboarding-overview',  icon: ic('gauge') },
    { label: 'Offboarding Checklist',       href: '/hr/employee/personnel-action/offboarding-checklist', icon: ic('checkCircle') },
    { label: 'Template & Auto Assign',      href: '/hr/employee/personnel-action/offboarding-auto-assign', icon: ic('zap') },
    { label: 'Departments to Notify',       href: '/hr/employee/personnel-action/offboarding-notify',    icon: ic('bell') },
    { label: 'Exit Interview',              href: '/hr/employee/personnel-action/exit-interview',         icon: ic('edit') },
  ]},
  { title: 'Performance', icon: ic('trending'), items: [
    { label: 'Check-In (VIP & HAY)', href: '/hr/performance/check-in', icon: ic('gauge') },
    { label: 'PIP', href: '/hr/performance/pip', icon: ic('clipboard') },
  ]},
  { title: 'Learning Management', icon: ic('award'), items: [
    { label: 'Master Certificate',    href: '/hr/learning/certificate', icon: ic('award') },
    { label: 'Master Activity Point', href: '/hr/learning/point-management/master-activity', icon: ic('target') },
    { label: 'Submission Approval',   href: '/hr/learning/point-management/submission-approval', icon: ic('check') },
    { label: 'Leaderboard Setting',   href: '/hr/learning/point-management/leaderboard-setting', icon: ic('settings') },
  ]},
  { title: 'Talent Management', icon: ic('star'), items: [
    { label: 'Talent Profile',          href: '/hr/talent/talent-profile', icon: ic('person') },
    { label: 'Competency Catalog',      href: '/hr/learning/competency-catalog', icon: ic('list') },
    { label: 'Key Position Assessment', href: '/hr/talent/key-position', icon: ic('target') },
    { label: 'Vacancy Risk Assessment', href: '/hr/talent/vacancy-risk', icon: ic('shield') },
    { label: 'Talent Review Meeting',   href: '/hr/talent/talent-review-meeting', icon: ic('grid') },
    { label: 'Successor Readiness',     href: '/hr/talent/readiness-assessment', icon: ic('checkCircle') },
    { label: 'Succession Gap Analysis', href: '/hr/talent/gap-analysis', icon: ic('activity') },
    { label: 'Succession Org / Lineage',href: '/hr/talent/succession-org', icon: ic('share') },
    { label: 'Succession Plan',         href: '/hr/talent/succession-plan', icon: ic('map') },
    { label: 'IDP',                     href: '/hr/talent/idp', icon: ic('layers') },
  ]},
  { title: 'People Planning', icon: ic('layers'), items: [
    { label: 'RKTK',                href: '/hr/people-planning/rktk',                icon: ic('money') },
    { label: 'Adjustment Planning', href: '/hr/people-planning/adjustment-planning', icon: ic('edit') },
  ]},
  // Ordered the way a schedule is actually built up: shift → weekly pattern →
  // schedule → who works it.
  { title: 'Time & Labor', icon: ic('clock'), items: [
    { label: 'Shift Setting',       href: '/hr/time-labour/shift-setting',       icon: ic('clock') },
    { label: 'Shift Pattern',       href: '/hr/time-labour/shift-pattern',       icon: ic('grid') },
    { label: 'Work Schedule',       href: '/hr/time-labour/work-schedule',       icon: ic('calendar') },
    { label: 'Schedule Assignment', href: '/hr/time-labour/schedule-assignment', icon: ic('userCheck') },
    { label: 'Time Entries',        href: '/hr/time-labour/time-entries',        icon: ic('upload') },
    { label: 'Eligibility Group', href: '/hr/time-labour/eligibility-group', icon: ic('checkCircle') },
    { label: 'Overtime Matrix',   href: '/hr/time-labour/overtime-matrix',   icon: ic('grid') },
  ]},
  { title: 'Settings', icon: ic('settings'), items: [
    { label: 'Announcement', href: '/hr/settings/announcement', icon: ic('bell') },
  ]},
]

const SA_GROUPS = [
  { title: 'Settings', icon: ic('settings'), items: [
    { label: 'User Management',   href: '/sysadmin/users',                     icon: ic('users') },
    { label: 'Leave Workflow',    href: '/sysadmin/leave-workflow',             icon: ic('workflow') },
    { label: 'Role & Permission', href: '/sysadmin/learning/role-permission',   icon: ic('shield') },
    { label: 'Master Lookup',     href: '/sysadmin/settings/master-lookup',     icon: ic('list') },
    { label: 'Master Document Types', href: '/sysadmin/settings/master-document-types', icon: ic('fileText') },
    { label: 'Batas SOS Serentak',    href: '/sysadmin/settings/emergency-sos-limit',   icon: ic('activity') },
    { label: 'Gen AI',                href: '/sysadmin/settings/gen-ai',                icon: ic('zap') },
    { label: 'Notification Setup',    href: '/sysadmin/settings/notification-setup',    icon: ic('mail') },
  ]},
  { title: 'Workflow Engine (Flowable)', icon: ic('workflow'), items: [
    { label: 'Flowable Engine',     href: '/sysadmin/workflow',                     icon: ic('workflow') },
    { label: 'BPMN Designer',       href: '/sysadmin/workflow/designer',            icon: ic('paint') },
    { label: 'Analisa & Metrik',    href: '/sysadmin/workflow/analytics',           icon: ic('chart') },
    { label: 'Definitions',         href: '/sysadmin/workflow/definitions',         icon: ic('list') },
    { label: 'Flowable Settings',   href: '/sysadmin/workflow/flowable-settings',   icon: ic('settings') },
    { label: 'Workflow Settings',   href: '/sysadmin/workflow/settings',            icon: ic('settings') },
    { label: 'Userlists (Grup Penyetuju)', href: '/sysadmin/workflow/userlists', icon: ic('users') },
    { label: 'Transaction Manager', href: '/sysadmin/workflow/transaction-manager', icon: ic('cpu') },
  ]},
  { title: 'Branding', icon: ic('paint'), items: [
    { label: 'Company Logo', href: '/sysadmin/branding/company-logo', icon: ic('building') },
    { label: 'Login Theme',  href: '/sysadmin/branding/login-theme',  icon: ic('paint') },
    { label: 'Career Site',  href: '/sysadmin/branding/career-site',  icon: ic('globe') },
  ]},
]

// ─── Restricted-account filtering ─────────────────────────────────────────────
// When an `allow` list (path prefixes) is passed, the sidebar keeps only the
// menu items the account may reach — empty groups and empty sections drop out —
// so restricted accounts get the same look as the normal menu, but only with
// the pages they can actually open.
const pathAllowed = (allow, href) => allow.some(p => href === p || href.startsWith(p + '/'))

function filterGroups(groups, allow) {
  if (!groups) return null
  return groups.map(g => {
    if (g.isParent) {
      const subGroups = (g.subGroups || [])
        .map(sg => ({ ...sg, items: sg.items.filter(it => pathAllowed(allow, it.href)) }))
        .filter(sg => sg.items.length)
      return subGroups.length ? { ...g, subGroups } : null
    }
    const items = (g.items || []).filter(it => pathAllowed(allow, it.href))
    return items.length ? { ...g, items } : null
  }).filter(Boolean)
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ allow } = {}) {
  const restricted = Array.isArray(allow) && allow.length > 0
  const { currentUser, realUser } = useAuthStore()
  const { employees }    = useEmployeeStore()
  const pathname         = usePathname()
  const router           = useRouter()
  const flyoutRef        = useRef()

  const r      = currentUser?.role
  const canHR  = HR_ROLES.includes(r)
  const canSA  = r === 'superadmin'
  const canMgr = r === 'manager' || r === 'superadmin' || employees.some(e => e.managerId === currentUser?.id)

  const initialized = useRef(false)
  const [openId, setOpenId] = useState(null)
  const [hoverG, setHoverG] = useState(-1)  // index grup yang di-hover (kolom 1); -1 = belum ada
  const [hoverS, setHoverS] = useState(-1)  // index sub-grup yang di-hover (kolom 2, parent); -1 = belum ada

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (pathname.startsWith('/ess/learning') || pathname.startsWith('/mss/learning')) setOpenId('lms')
    else if (pathname.startsWith('/ess'))      setOpenId('ess')
    else if (pathname.startsWith('/mss'))      setOpenId('mss')
    else if (pathname.startsWith('/hr'))       setOpenId('hr')
    else if (pathname.startsWith('/sysadmin')) setOpenId('sysadmin')
  }, [pathname])

  useEffect(() => {
    if (!openId) return
    const handler = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) setOpenId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openId])

  // Saat flyout dibuka, arahkan cascade ke grup/sub-grup yang cocok dengan path aktif.
  useEffect(() => {
    const sec = sections.find(s => s.id === openId)
    if (!sec?.groups) return
    let gi = -1, si = -1
    sec.groups.forEach((g, i) => {
      if (g.isParent) {
        g.subGroups?.forEach((sg, j) => {
          if (sg.items.some(it => pathname.startsWith(it.href))) { gi = i; si = j }
        })
      } else if (g.items.some(it => pathname.startsWith(it.href))) {
        gi = i
      }
    })
    setHoverG(gi); setHoverS(si)
  }, [openId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isTalentOnly = TALENT_ONLY_ROLES.includes(r)
  const hrGroups   = isTalentOnly
    ? HR_GROUPS.filter(g => g.title === 'Talent Management')
    : HR_GROUPS

  const canHRAccess = canHR || isTalentOnly

  // Restricted accounts: show the normal module sections but filtered down to
  // only the pages they may open (role gating is replaced by the allow list,
  // which the protected layout already enforces for routing).
  const sections = restricted
    ? [
        { id: 'ess',      icon: IcPerson, label: 'Employee (ESS)',    href: null, groups: ESS_GROUPS },
        { id: 'mss',      icon: IcTeam,   label: 'Manager (MSS)',     href: null, groups: MSS_GROUPS },
        { id: 'lms',      icon: IcLMS,    label: 'Learning (LMS)',    href: null, groups: LMS_GROUPS },
        { id: 'hr',       icon: IcHR,     label: 'HR Administration', href: null, groups: HR_GROUPS },
        { id: 'sysadmin', icon: IcSA,     label: 'System Admin',      href: null, groups: SA_GROUPS },
      ]
        .map(s => ({ ...s, groups: filterGroups(s.groups, allow) }))
        .filter(s => s.groups && s.groups.length)
    : [
        !isTalentOnly && { id: 'dashboard', icon: IcHome,   label: 'Dashboard',           href: '/dashboard', groups: null },
        !isTalentOnly && { id: 'ess',       icon: IcPerson, label: 'Employee (ESS)',       href: null, groups: ESS_GROUPS },
        !isTalentOnly && canMgr && { id: 'mss', icon: IcTeam, label: 'Manager (MSS)', href: null, groups: MSS_GROUPS },
        !isTalentOnly && { id: 'lms', icon: IcLMS, label: 'Learning (LMS)', href: null, groups: LMS_GROUPS },
        canHRAccess && { id: 'hr',          icon: IcHR,     label: 'HR Administration',    href: null, groups: hrGroups },
        !isTalentOnly && canSA && { id: 'sysadmin', icon: IcSA, label: 'System Admin', href: null, groups: SA_GROUPS },
      ].filter(Boolean)

  const activeSec = sections.find(s => s.id === openId)

  // Cascade flyout: kolom-1 grup, hover → kolom-2 item / sub-grup, dst.
  const groups     = activeSec?.groups || []
  // Bila section hanya punya satu grup biasa, tampilkan itemnya langsung di
  // kolom 1 (tanpa perantara nama grup). Untuk akun terbatas kita pertahankan
  // baris grup (ikon + nama + chevron) agar tampilannya sama seperti menu normal.
  const flatItems  = !restricted && groups.length === 1 && !groups[0]?.isParent ? groups[0].items : null
  const curGroup   = hoverG >= 0 ? groups[hoverG] : null
  const COL_W      = 224
  const showCol2   = !flatItems && !!curGroup                            // kolom 2 muncul setelah hover kolom 1
  const showCol3   = !flatItems && !!curGroup?.isParent && hoverS >= 0   // kolom 3 muncul setelah hover kolom 2
  const flyWidth   = (groups.length ? (flatItems ? 1 : 1 + (showCol2 ? 1 : 0) + (showCol3 ? 1 : 0)) : 1) * COL_W

  const handleIconClick = (sec) => {
    if (sec.href) { router.push(sec.href); setOpenId(null) }
    else setOpenId(p => p === sec.id ? null : sec.id)
  }

  const isIconActive = (sec) => {
    if (sec.id === 'dashboard') return pathname === '/dashboard'
    if (sec.id === 'lms') return pathname.startsWith('/ess/learning') || pathname.startsWith('/mss/learning')
    if (sec.id === 'ess') return pathname.startsWith('/ess') && !pathname.startsWith('/ess/learning')
    if (sec.id === 'mss') return pathname.startsWith('/mss') && !pathname.startsWith('/mss/learning')
    return pathname.startsWith('/' + sec.id)
  }

  const topOffset = 83 + (realUser ? 36 : 0)

  return (
    <>
      {/* ── Icon strip ──────────────────────────────────────────────────────── */}
      <aside className='fixed left-0 bottom-0 w-14 z-40 flex flex-col items-center pt-2 gap-1'
        style={{ top: topOffset, background: '#fff', borderRight: '1px solid #e5e7eb' }}>
        {sections.map(sec => {
          const active  = isIconActive(sec)
          const flyOpen = openId === sec.id
          return (
            <button key={sec.id} title={sec.label}
              onClick={() => handleIconClick(sec)}
              className='relative w-10 h-10 rounded-xl flex items-center justify-center transition-all'
              style={{
                background: active || flyOpen ? '#052B52' : 'transparent',
                color:      active || flyOpen ? '#fff'    : '#6b7280',
              }}
              onMouseEnter={e => { if (!active && !flyOpen) { e.currentTarget.style.background='#f3f4f6'; e.currentTarget.style.color='#1f2937' }}}
              onMouseLeave={e => { if (!active && !flyOpen) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#6b7280' }}}>
              <sec.icon />
            </button>
          )
        })}
      </aside>

      {/* ── Flyout panel — cascading columns ────────────────────────────────── */}
      {openId && openId !== 'dashboard' && activeSec && (
        <div ref={flyoutRef}
          className='fixed left-14 bottom-0 z-30 flex flex-col overflow-hidden'
          style={{ top: topOffset, width: flyWidth, background: '#fff', borderRight: '1px solid #e5e7eb', boxShadow: '4px 0 16px rgba(0,0,0,0.08)' }}>

          {/* Panel header */}
          <div className='flex-none bg-white px-4 py-3.5' style={{ borderBottom: '2px solid #f3f4f6' }}>
            <span className='text-sm font-bold text-gray-800'>{activeSec.label}</span>
          </div>

          {/* Cascade columns */}
          <div className='flex min-h-0 flex-1'>
            {/* Kolom 1 — daftar grup, atau langsung item bila section hanya satu grup */}
            <div className={`flex-none overflow-y-auto py-2 ${flatItems ? '' : 'border-r border-gray-100'}`} style={{ width: COL_W }}>
              {flatItems
                ? flatItems.map(it => (
                    <FlyItem key={it.href} label={it.label} href={it.href} onClick={() => setOpenId(null)} />
                  ))
                : groups.map((g, i) => (
                    <CascadeRow key={i} label={g.title} icon={g.icon}
                      active={hoverG === i} hasChild
                      onEnter={() => { setHoverG(i); setHoverS(-1) }} />
                  ))}
            </div>

            {/* Kolom 2 — item grup, atau sub-grup jika parent (hanya muncul saat hover kolom 1) */}
            {showCol2 && (
              <div className='flex-none overflow-y-auto py-2'
                style={{ width: COL_W, borderRight: curGroup?.isParent ? '1px solid #f3f4f6' : 'none' }}>
                {curGroup?.isParent
                  ? curGroup.subGroups?.map((sg, j) => (
                      <CascadeRow key={j} label={sg.title}
                        active={hoverS === j} hasChild
                        onEnter={() => setHoverS(j)} />
                    ))
                  : curGroup?.items.map(it => (
                      <FlyItem key={it.href} label={it.label} href={it.href} onClick={() => setOpenId(null)} />
                    ))}
              </div>
            )}

            {/* Kolom 3 — item sub-grup (khusus parent, hanya muncul saat hover kolom 2) */}
            {showCol3 && (
              <div className='flex-none overflow-y-auto py-2' style={{ width: COL_W }}>
                {curGroup.subGroups?.[hoverS]?.items.map(it => (
                  <FlyItem key={it.href} label={it.label} href={it.href} onClick={() => setOpenId(null)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
