'use client'
// Professional line-icon set (Feather/Lucide style) used to replace emoji.
// Usage: <Icon e="🎯" />  (map by emoji)  or  <Icon name="target" />.
// Icons render as inline SVG that inherits `currentColor`, so they can be
// colored/sized by the surrounding element. Emoji inside <option> elements
// can't be replaced by SVG — strip them to plain labels instead.

const P = (...children) => children

// Map of semantic name → svg children
const ICONS = {
  role:        P(<path d='M12 2l2.4 4.8L20 8l-4 4 1 6-5-2.8L7 18l1-6-4-4 5.6-1.2L12 2z' key='a' />),
  position:    P(<path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' key='a' />, <circle cx='12' cy='10' r='3' key='b' />),
  company:     P(<path d='M3 21h18M5 21V7l8-4v18M19 21V11l-6-3' key='a' />),
  target:      P(<circle cx='12' cy='12' r='9' key='a' />, <circle cx='12' cy='12' r='5' key='b' />, <circle cx='12' cy='12' r='1.5' key='c' />),
  department:  P(<path d='M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z' key='a' />),
  folder:      P(<path d='M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z' key='a' />),
  user:        P(<path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' key='a' />, <circle cx='12' cy='7' r='4' key='b' />),
  users:       P(<path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' key='a' />, <circle cx='9' cy='7' r='4' key='b' />, <path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' key='c' />),
  settings:    P(<circle cx='12' cy='12' r='3' key='a' />, <path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z' key='b' />),
  clipboard:   P(<path d='M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2' key='a' />, <rect x='8' y='2' width='8' height='4' rx='1' key='b' />),
  check:       P(<path d='M22 11.08V12a10 10 0 11-5.93-9.14' key='a' />, <polyline points='22 4 12 14.01 9 11.01' key='b' />),
  checkSmall:  P(<polyline points='20 6 9 17 4 12' key='a' />),
  arrowUp:     P(<line x1='12' y1='19' x2='12' y2='5' key='a' />, <polyline points='5 12 12 5 19 12' key='b' />),
  arrowDown:   P(<line x1='12' y1='5' x2='12' y2='19' key='a' />, <polyline points='19 12 12 19 5 12' key='b' />),
  chevronsUp:  P(<polyline points='17 11 12 6 7 11' key='a' />, <polyline points='17 18 12 13 7 18' key='b' />),
  swap:        P(<polyline points='17 1 21 5 17 9' key='a' />, <path d='M3 11V9a4 4 0 014-4h14' key='b' />, <polyline points='7 23 3 19 7 15' key='c' />, <path d='M21 13v2a4 4 0 01-4 4H3' key='d' />),
  door:        P(<path d='M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' key='a' />, <polyline points='16 17 21 12 16 7' key='b' />, <line x1='21' y1='12' x2='9' y2='12' key='c' />),
  refresh:     P(<polyline points='23 4 23 10 17 10' key='a' />, <polyline points='1 20 1 14 7 14' key='b' />, <path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' key='c' />),
  trophy:      P(<path d='M6 9H4.5a2.5 2.5 0 010-5H6' key='a' />, <path d='M18 9h1.5a2.5 2.5 0 000-5H18' key='b' />, <path d='M4 22h16' key='c' />, <path d='M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' key='d' />, <path d='M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' key='e' />, <path d='M18 2H6v7a6 6 0 0012 0V2z' key='f' />),
  globe:       P(<circle cx='12' cy='12' r='10' key='a' />, <line x1='2' y1='12' x2='22' y2='12' key='b' />, <path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z' key='c' />),
  calendar:    P(<rect x='3' y='4' width='18' height='18' rx='2' key='a' />, <line x1='16' y1='2' x2='16' y2='6' key='b' />, <line x1='8' y1='2' x2='8' y2='6' key='c' />, <line x1='3' y1='10' x2='21' y2='10' key='d' />),
  chart:       P(<line x1='18' y1='20' x2='18' y2='10' key='a' />, <line x1='12' y1='20' x2='12' y2='4' key='b' />, <line x1='6' y1='20' x2='6' y2='14' key='c' />),
  graduation:  P(<path d='M22 10L12 5 2 10l10 5 10-5z' key='a' />, <path d='M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5' key='b' />),
  package:     P(<path d='M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' key='a' />, <polyline points='3.27 6.96 12 12.01 20.73 6.96' key='b' />, <line x1='12' y1='22.08' x2='12' y2='12' key='c' />),
  link:        P(<path d='M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71' key='a' />, <path d='M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' key='b' />),
  briefcase:   P(<rect x='2' y='7' width='20' height='14' rx='2' key='a' />, <path d='M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' key='b' />),
  cpu:         P(<rect x='4' y='4' width='16' height='16' rx='2' key='a' />, <rect x='9' y='9' width='6' height='6' key='b' />, <line x1='9' y1='1' x2='9' y2='4' key='c' />, <line x1='15' y1='1' x2='15' y2='4' key='d' />, <line x1='9' y1='20' x2='9' y2='23' key='e' />, <line x1='15' y1='20' x2='15' y2='23' key='f' />, <line x1='20' y1='9' x2='23' y2='9' key='g' />, <line x1='20' y1='14' x2='23' y2='14' key='h' />, <line x1='1' y1='9' x2='4' y2='9' key='i' />, <line x1='1' y1='14' x2='4' y2='14' key='j' />),
  clock:       P(<circle cx='12' cy='12' r='10' key='a' />, <polyline points='12 6 12 12 16 14' key='b' />),
  search:      P(<circle cx='11' cy='11' r='8' key='a' />, <line x1='21' y1='21' x2='16.65' y2='16.65' key='b' />),
  plus:        P(<line x1='12' y1='5' x2='12' y2='19' key='a' />, <line x1='5' y1='12' x2='19' y2='12' key='b' />),
  close:       P(<line x1='18' y1='6' x2='6' y2='18' key='a' />, <line x1='6' y1='6' x2='18' y2='18' key='b' />),
  trash:       P(<polyline points='3 6 5 6 21 6' key='a' />, <path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' key='b' />),
  edit:        P(<path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' key='a' />, <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' key='b' />),
  bell:        P(<path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' key='a' />, <path d='M13.73 21a2 2 0 01-3.46 0' key='b' />),
  warning:     P(<path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' key='a' />, <line x1='12' y1='9' x2='12' y2='13' key='b' />, <line x1='12' y1='17' x2='12.01' y2='17' key='c' />),
  save:        P(<path d='M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z' key='a' />, <polyline points='17 21 17 13 7 13 7 21' key='b' />, <polyline points='7 3 7 8 15 8' key='c' />),
  info:        P(<circle cx='12' cy='12' r='10' key='a' />, <line x1='12' y1='16' x2='12' y2='12' key='b' />, <line x1='12' y1='8' x2='12.01' y2='8' key='c' />),
  shuffle:     P(<polyline points='16 3 21 3 21 8' key='a' />, <line x1='4' y1='20' x2='21' y2='3' key='b' />, <polyline points='21 16 21 21 16 21' key='c' />, <line x1='15' y1='15' x2='21' y2='21' key='d' />, <line x1='4' y1='4' x2='9' y2='9' key='e' />),
  file:        P(<path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' key='a' />, <polyline points='14 2 14 8 20 8' key='b' />),
  ban:         P(<circle cx='12' cy='12' r='10' key='a' />, <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' key='b' />),
  upload:      P(<path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' key='a' />, <polyline points='17 8 12 3 7 8' key='b' />, <line x1='12' y1='3' x2='12' y2='15' key='c' />),
  archive:     P(<polyline points='21 8 21 21 3 21 3 8' key='a' />, <rect x='1' y='3' width='22' height='5' key='b' />, <line x1='10' y1='12' x2='14' y2='12' key='c' />),
  money:       P(<line x1='12' y1='1' x2='12' y2='23' key='a' />, <path d='M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' key='b' />),
  crown:       P(<path d='M2 6l4 4 6-7 6 7 4-4-1.5 13H3.5L2 6z' key='a' />),
  book:        P(<path d='M4 19.5A2.5 2.5 0 016.5 17H20' key='a' />, <path d='M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z' key='b' />),
  party:       P(<path d='M5.8 11.3L2 22l10.7-3.79' key='a' />, <path d='M4 3h.01M22 8h.01M15 2h.01M22 20h.01' key='b' />, <path d='M22 2l-2.24.75a2.9 2.9 0 00-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 12' key='c' />, <path d='M14 12l-3-3a2.07 2.07 0 00-2.93 0l-.9.9' key='d' />),
  undo:        P(<polyline points='9 14 4 9 9 4' key='a' />, <path d='M20 20v-7a4 4 0 00-4-4H4' key='b' />),
  square:      P(<rect x='4' y='4' width='16' height='16' rx='2' key='a' />),
  pause:       P(<rect x='6' y='4' width='4' height='16' rx='1' key='a' />, <rect x='14' y='4' width='4' height='16' rx='1' key='b' />),
  repeat:      P(<polyline points='17 1 21 5 17 9' key='a' />, <path d='M3 11V9a4 4 0 014-4h14' key='b' />, <polyline points='7 23 3 19 7 15' key='c' />, <path d='M21 13v2a4 4 0 01-4 4H3' key='d' />),
  home:        P(<path d='M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' key='a' />, <polyline points='9 22 9 12 15 12 15 22' key='b' />),
  shield:      P(<path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' key='a' />),
  zap:         P(<polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' key='a' />),
  coffee:      P(<path d='M18 8h1a4 4 0 010 8h-1' key='a' />, <path d='M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z' key='b' />, <line x1='6' y1='1' x2='6' y2='4' key='c' />, <line x1='10' y1='1' x2='10' y2='4' key='d' />, <line x1='14' y1='1' x2='14' y2='4' key='e' />),
  rocket:      P(<path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z' key='a' />, <path d='M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z' key='b' />, <path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' key='c' />, <path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' key='d' />),
  palm:        P(<path d='M13 8c0-2.76-2.5-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4' key='a' />, <path d='M13 7.14A5.82 5.82 0 0116.5 6c3 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-4' key='b' />, <path d='M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35z' key='c' />, <path d='M11 15.5c.5 2.5-.17 4.5-1 6.5h9c-1-4-2.5-8-5-8' key='d' />),
  puzzle:      P(<path d='M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.7 2.7 0 010 5.4H2V20a2 2 0 002 2h3.8v-1.5a2.7 2.7 0 015.4 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z' key='a' />),
  inbox:       P(<polyline points='22 12 16 12 14 15 10 15 8 12 2 12' key='a' />, <path d='M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z' key='b' />),
  bulb:        P(<line x1='9' y1='18' x2='15' y2='18' key='a' />, <line x1='10' y1='22' x2='14' y2='22' key='b' />, <path d='M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14' key='c' />),
  handshake:   P(<path d='M11 17l2 2a1 1 0 001.41 0l3.87-3.87a2.12 2.12 0 000-3L14 8' key='a' />, <path d='M11 17l-2-2' key='b' />, <path d='M2 12l4.13-4.13a2 2 0 012.83 0L14 13' key='c' />, <path d='M3 21l3-3' key='d' />),
  message:     P(<path d='M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' key='a' />),
  play:        P(<polygon points='5 3 19 12 5 21 5 3' key='a' />),
  clip:        P(<path d='M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48' key='a' />),
  image:       P(<rect x='3' y='3' width='18' height='18' rx='2' key='a' />, <circle cx='8.5' cy='8.5' r='1.5' key='b' />, <polyline points='21 15 16 10 5 21' key='c' />),
  lock:        P(<rect x='3' y='11' width='18' height='11' rx='2' key='a' />, <path d='M7 11V7a5 5 0 0110 0v4' key='b' />),
  eye:         P(<path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' key='a' />, <circle cx='12' cy='12' r='3' key='b' />),
  pointer:     P(<path d='M9 11.24V7.5a2.5 2.5 0 015 0v4.24M14 10.5a2.5 2.5 0 015 0V14M5 12.5a2.5 2.5 0 015 0V10' key='a' />, <path d='M19 14v3a5 5 0 01-5 5h-1a7 7 0 01-5-2.9L4 15.5a2 2 0 013-2.6l1 1' key='b' />),
  move:        P(<polyline points='5 9 2 12 5 15' key='a' />, <polyline points='9 5 12 2 15 5' key='b' />, <polyline points='15 19 12 22 9 19' key='c' />, <polyline points='19 9 22 12 19 15' key='d' />, <line x1='2' y1='12' x2='22' y2='12' key='e' />, <line x1='12' y1='2' x2='12' y2='22' key='f' />),
  scroll:      P(<path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' key='a' />, <polyline points='14 2 14 8 20 8' key='b' />, <line x1='9' y1='13' x2='15' y2='13' key='c' />, <line x1='9' y1='17' x2='13' y2='17' key='d' />),
}

// emoji (variation-selector stripped) → semantic name
const EMOJI = {
  '🎭': 'role', '📌': 'position', '🏢': 'company', '🎯': 'target', '🗂': 'folder',
  '👤': 'user', '👥': 'users', '⚙': 'settings', '📋': 'clipboard', '✅': 'check',
  '✓': 'checkSmall', '⬆': 'arrowUp', '⬇': 'arrowDown', '↔': 'swap', '🚪': 'door',
  '🔄': 'refresh', '🏆': 'trophy', '🌍': 'globe', '🌐': 'globe', '📂': 'folder',
  '📅': 'calendar', '📆': 'calendar', '📊': 'chart', '🎓': 'graduation', '📦': 'package',
  '🔗': 'link', '💼': 'briefcase', '🧠': 'cpu', '🕐': 'clock', '🔍': 'search',
  '➕': 'plus', '＋': 'plus', '✕': 'close', '✖': 'close', '❌': 'close', '🗑': 'trash',
  '✏': 'edit', '🔔': 'bell', '⚠': 'warning', '💾': 'save', 'ℹ': 'info', '🔀': 'shuffle',
  '📄': 'file', '↓': 'arrowDown',
  '🚫': 'ban', '📤': 'upload', '🗄': 'archive', '💰': 'money', '👑': 'crown',
  '📚': 'book', '📝': 'edit', '👔': 'briefcase', '🎉': 'party',
  '⏳': 'clock', '↩': 'undo', '⬜': 'square',
  '⏸': 'pause', '🕒': 'clock', '🔁': 'repeat', '🗓': 'calendar', '🧩': 'puzzle',
  '🏠': 'home', '🏛': 'company', '🚀': 'rocket', '🌴': 'palm', '🏦': 'company',
  '☕': 'coffee', '🛡': 'shield', '⚡': 'zap', '✗': 'close', '🧑': 'user', '📥': 'inbox', '📭': 'inbox',
  '💡': 'bulb', '🤝': 'handshake', '💬': 'message', '🔄': 'refresh',
  '✍': 'edit', '📎': 'clip', '📁': 'folder', '🖼': 'image', '🎬': 'play', '▶': 'play',
  '🖥': 'cpu', '🏭': 'cpu', '🔧': 'settings',
  '🔒': 'lock', '👁': 'eye', '👆': 'pointer', '📜': 'scroll', '✥': 'move',
  // multi-emoji combos
  '⬆⬆': 'chevronsUp', '🎯⬆': 'arrowUp', '🎯⬆⬆': 'chevronsUp', '🧑💼': 'briefcase',
}

// Strip variation selectors (U+FE0F) and zero-width joiners (U+200D)
const stripVS = (s) => (s || '').replace(/[\uFE0F\u200D]/g, '').trim()

export default function Icon({ e, name, size = 16, className = '', strokeWidth = 2, ...rest }) {
  const key = name || EMOJI[stripVS(e)]
  const children = ICONS[key]
  if (!children) return e ? <span className={className} {...rest}>{e}</span> : null
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
      strokeWidth={strokeWidth} strokeLinecap='round' strokeLinejoin='round'
      className={className} {...rest}>
      {children}
    </svg>
  )
}

// Named helper for callers that prefer a lookup
export { ICONS, EMOJI }
