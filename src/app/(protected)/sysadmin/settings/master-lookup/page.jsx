'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useMasterLookupStore } from '@/store/masterLookupStore'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, Input, ActionButton, EmptyState } from '@/components/ui'

export default function MasterLookupPage() {
  const t = useT()
  const { categories, addCategory, removeCategory, addItem, updateItem, removeItem } = useMasterLookupStore()
  const [activeKey, setActiveKey] = useState(categories[0]?.key || null)
  const [newCatLabel, setNewCatLabel] = useState('')

  const active = categories.find(c => c.key === activeKey) || categories[0]

  const handleAddCategory = () => {
    const label = newCatLabel.trim()
    if (!label) return
    addCategory(label)
    setNewCatLabel('')
  }

  const handleRemoveCategory = (key) => {
    removeCategory(key)
    if (activeKey === key) setActiveKey(null)
  }

  return (
    <div>
      <PageHeader
        icon='🗂️'
        title='Master Lookup'
        subtitle={t('Kelola daftar List of Values (LOV) yang dipakai di form-form aplikasi.', 'Manage the List of Values (LOV) used across app forms.')}
      />

      <div className='grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6'>

        {/* Category list */}
        <SectionCard title={t('Kategori','Categories')} bodyClass='p-2'>
          <div className='space-y-1'>
            {categories.map(c => (
              <div key={c.key}
                className={`group flex items-center gap-1 rounded-lg px-3 py-2 cursor-pointer transition ${active?.key === c.key ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50 text-gray-700'}`}
                onClick={() => setActiveKey(c.key)}>
                <span className='flex-1 text-sm font-semibold truncate'>{c.label}</span>
                <span className='text-xs text-gray-400'>{c.items.length}</span>
                {c.key.startsWith('custom-') && (
                  <button onClick={(e)=>{e.stopPropagation(); handleRemoveCategory(c.key)}}
                    className='opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition'
                    aria-label={t('Hapus kategori','Remove category')}>
                    <Icon e='🗑️' size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className='flex gap-1.5 p-2 border-t border-gray-100 mt-1'>
            <Input value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)}
              placeholder={t('Kategori baru…','New category…')} className='text-xs' />
            <button onClick={handleAddCategory} className='flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600' aria-label={t('Tambah kategori','Add category')}>
              <Icon e='➕' size={13} />
            </button>
          </div>
        </SectionCard>

        {/* Items */}
        {active ? (
          <SectionCard
            title={active.label}
            subtitle={active.description}
            actions={
              <ActionButton size='sm' icon='➕' onClick={()=>addItem(active.key, '')}>
                {t('Tambah Item','Add Item')}
              </ActionButton>
            }
            bodyClass='p-0'>
            {active.items.length ? (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='px-4 py-2.5 text-left text-xs font-bold text-gray-500'>{t('Label','Label')}</th>
                      <th className='px-4 py-2.5 text-center text-xs font-bold text-gray-500 w-24'>{t('Aktif','Active')}</th>
                      <th className='px-4 py-2.5 w-10'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.items.map(item => (
                      <tr key={item.id} className='border-t border-gray-100'>
                        <td className='px-4 py-2.5'>
                          <Input value={item.label} onChange={e=>updateItem(active.key, item.id, { label: e.target.value })} />
                        </td>
                        <td className='px-4 py-2.5 text-center'>
                          <input type='checkbox' checked={item.active}
                            onChange={e=>updateItem(active.key, item.id, { active: e.target.checked })} />
                        </td>
                        <td className='px-4 py-2.5 text-center'>
                          <button onClick={()=>removeItem(active.key, item.id)} className='text-gray-400 hover:text-red-600' aria-label={t('Hapus item','Remove item')}>
                            <Icon e='🗑️' size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='p-5'>
                <EmptyState icon='📭' title={t('Belum ada item di kategori ini.','No items in this category yet.')} />
              </div>
            )}
          </SectionCard>
        ) : (
          <SectionCard>
            <EmptyState icon='🗂️' title={t('Pilih atau buat kategori.','Select or create a category.')} />
          </SectionCard>
        )}
      </div>
    </div>
  )
}
