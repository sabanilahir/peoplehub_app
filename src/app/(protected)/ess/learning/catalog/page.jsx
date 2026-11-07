'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const CATEGORIES = ['All','Leadership & Management','K3 & Safety','Compliance','Digital Skills','Soft Skills','HR & People','Finance','Sales & Marketing']
const TYPES      = ['All','ILT','Self-Paced','Blended']

const CATALOG = [
  { id:1, title:'K3 & Keselamatan Kerja Dasar', category:'K3 & Safety', type:'ILT', duration:'8 jam', instructor:'Budi Santoso', rating:4.8, enrolled:850, level:'Beginner', status:'Available' },
  { id:2, title:'Leadership Fundamentals Level 1', category:'Leadership & Management', type:'Blended', duration:'24 jam', instructor:'Sari Dewi', rating:4.9, enrolled:320, level:'Intermediate', status:'Available' },
  { id:3, title:'Excel Advanced for HR', category:'Digital Skills', type:'Self-Paced', duration:'6 jam', instructor:'Online', rating:4.6, enrolled:540, level:'Intermediate', status:'Available' },
  { id:4, title:'GCG & Compliance Certification', category:'Compliance', type:'Blended', duration:'16 jam', instructor:'Ahmad Fauzi', rating:4.7, enrolled:980, level:'Intermediate', status:'Available' },
  { id:5, title:'Communication & Presentation Skills', category:'Soft Skills', type:'ILT', duration:'12 jam', instructor:'Tim L&D', rating:4.5, enrolled:210, level:'Beginner', status:'Available' },
  { id:6, title:'Data Analysis with Python', category:'Digital Skills', type:'Self-Paced', duration:'20 jam', instructor:'Online', rating:4.4, enrolled:95, level:'Advanced', status:'Available' },
  { id:7, title:'Financial Statement Analysis', category:'Finance', type:'Blended', duration:'12 jam', instructor:'Dewi Sari', rating:4.6, enrolled:130, level:'Intermediate', status:'Available' },
  { id:8, title:'Sales Excellence & Negotiation', category:'Sales & Marketing', type:'ILT', duration:'16 jam', instructor:'Tim Sales', rating:4.7, enrolled:175, level:'Intermediate', status:'Available' },
]

export default function CourseCatalogPage() {
  const t = useT()
  const [search,  setSearch ] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [typeFilter,setTypeFilter] = useState('All')
  const [enrolled, setEnrolled] = useState([1,2])

  const filtered = CATALOG.filter(c =>
    (catFilter==='All' || c.category===catFilter) &&
    (typeFilter==='All' || c.type===typeFilter) &&
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const levelColor = (l) => ({ Beginner:'bg-green-50 text-green-700', Intermediate:'bg-yellow-50 text-yellow-700', Advanced:'bg-red-50 text-red-700' }[l])
  const typeColor  = (typ) => typ==='ILT'?'bg-blue-50 text-blue-700':typ==='Self-Paced'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Course Catalog</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Jelajahi dan temukan course yang tepat untuk pengembangan skill Anda.','Explore and find the right courses for your skill development.')}</p>

      <div className='flex flex-wrap gap-2 mb-6'>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Cari course...','Search courses...')}
          className='flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white' />
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          className='px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white'>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <div className='flex gap-1'>
          {TYPES.map(typ=>(
            <button key={typ} onClick={()=>setTypeFilter(typ)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${typeFilter===typ?'bg-red-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{typ}</button>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
        {filtered.map(c=>(
          <div key={c.id} className='bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-transparent hover:border-red-200'>
            <div className='flex items-start justify-between mb-3'>
              <div className='flex gap-2 flex-wrap'>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor(c.type)}`}>{c.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelColor(c.level)}`}>{c.level}</span>
              </div>
              {enrolled.includes(c.id) && <span className='text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold'>Enrolled</span>}
            </div>
            <h3 className='font-bold text-gray-800 mb-1'>{c.title}</h3>
            <p className='text-xs text-gray-500 mb-3'>{c.category}</p>
            <div className='flex items-center gap-3 text-xs text-gray-500 mb-3'>
              <span><Icon e='⏱️' size={14} className='inline align-[-2px]' /> {c.duration}</span>
              <span><Icon e='👨‍🏫' size={14} className='inline align-[-2px]' /> {c.instructor}</span>
              <span><Icon e='👥' size={14} className='inline align-[-2px]' /> {c.enrolled}</span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1'>
                <span className='text-yellow-500'><Icon e='⭐' size={15} /></span>
                <span className='text-sm font-bold text-gray-700'>{c.rating}</span>
              </div>
              <button
                onClick={() => setEnrolled(prev => prev.includes(c.id) ? prev : [...prev, c.id])}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${enrolled.includes(c.id)?'bg-green-50 text-green-700 cursor-not-allowed':'text-white hover:opacity-90'}`}
                style={enrolled.includes(c.id)?{}:{ background:'linear-gradient(135deg,#052B52,#039299)' }}
                disabled={enrolled.includes(c.id)}
              >
                {enrolled.includes(c.id)?'Enrolled':t('Daftar Sekarang','Enroll Now')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
