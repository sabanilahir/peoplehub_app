'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useHomePreferencesStore, CHART_TYPE_DEFAULT } from '@/store/homePreferencesStore'
import { dbStorage } from '@/lib/dbStorage'
import { ALL_SHORTCUTS, SICONS } from '@/lib/dashboardShortcuts'
import { accessibleDashboards } from '@/lib/homeDashboards'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, ActionButton } from '@/components/ui'

function Toggle({ checked, onChange, label, hint, order, onOrderChange, chartType, onChartTypeChange, locked, t }) {
  return (
    <div className='flex items-center justify-between gap-4 py-3'>
      <label className={`flex-1 min-w-0 ${locked ? '' : 'cursor-pointer'}`}>
        <span className='block text-sm font-semibold text-gray-800'>
          {label}
          {locked && (
            <span className='ml-2 align-middle rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500'>
              🔒 {t('Wajib', 'Required')}
            </span>
          )}
        </span>
        {hint && <span className='block text-xs text-gray-400 mt-0.5'>{hint}</span>}
      </label>
      {chartType != null && (
        <label className='flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0'>
          {t('Grafik','Chart')}
          <select
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value)}
            className='rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-800 bg-white outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100'>
            <option value='bar'>Bar</option>
            <option value='pie'>Pie</option>
          </select>
        </label>
      )}
      {order != null && (
        <label className='flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0'>
          {t('Urutan','Order')}
          <input
            type='number' min={1} value={order}
            onChange={(e) => onOrderChange(Number(e.target.value) || 1)}
            className='w-14 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-800 text-center outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100'
          />
        </label>
      )}
      <button
        type='button'
        role='switch'
        aria-checked={locked ? true : checked}
        disabled={locked}
        title={locked ? t('Pengumuman wajib tampil dan tidak dapat dinonaktifkan.', 'Announcements are required and cannot be turned off.') : undefined}
        onClick={() => !locked && onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
        style={{ background: (locked || checked) ? '#052B52' : '#d1d5db' }}>
        <span
          className='absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform'
          style={{ transform: (locked || checked) ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

export default function PreferencesPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { getPrefs, updatePrefs } = useHomePreferencesStore()
  const { employees } = useEmployeeStore()

  const uid = currentUser?.id
  const role = currentUser?.role || 'employee'
  const shortcuts = ALL_SHORTCUTS[role] || ALL_SHORTCUTS.employee

  // Only offer the dashboards this user may actually see on Home — same
  // gating dashboard/page.jsx applies when rendering them.
  const myDashboards = accessibleDashboards({
    role,
    hasDirectReports: employees.some(e => e.managerId === uid && e.status === 'Active'),
  })

  // Buffered draft — nothing is written to the store until "Simpan" is
  // pressed. Initialized from the saved prefs, and re-synced once dbStorage
  // finishes hydrating (in case this page mounted before that completed).
  const [draft, setDraft] = useState(() => getPrefs(uid))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = useHomePreferencesStore.persist.onFinishHydration(() => setDraft(getPrefs(uid)))
    if (useHomePreferencesStore.persist.hasHydrated()) setDraft(getPrefs(uid))
    return unsub
  }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const setWidget = (key, val) => setDraft(d => ({ ...d, widgets: { ...d.widgets, [key]: val } }))
  const setOrder = (key, val) => setDraft(d => ({ ...d, order: { ...d.order, [key]: val } }))
  const setWidgetOrder = (key, val) => setDraft(d => ({ ...d, widgetOrder: { ...d.widgetOrder, [key]: val } }))
  const setChartType = (key, val) => setDraft(d => ({ ...d, chartType: { ...d.chartType, [key]: val } }))
  const toggleShortcutDraft = (id) => setDraft(d => ({
    ...d,
    hiddenShortcutIds: d.hiddenShortcutIds.includes(id)
      ? d.hiddenShortcutIds.filter(x => x !== id)
      : [...d.hiddenShortcutIds, id],
  }))

  const handleSave = async () => {
    updatePrefs(uid, draft)
    setSaving(true)
    // Skip the usual debounce and wait for the database write to land, so
    // "Tersimpan" (and any navigation right after) reflects the real state
    // instead of a stale copy the DB hasn't caught up to yet.
    await dbStorage.flushNow('hcm-home-preferences-v1')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className='max-w-2xl mx-auto pb-10'>
      <PageHeader
        icon='⚙️'
        title={t('Preferensi Beranda', 'Homepage Preferences')}
        subtitle={t('Atur bagian apa saja yang tampil di halaman Beranda kamu.', 'Choose which sections show on your Home page.')}
        actions={
          <div className='flex items-center gap-3'>
            {saved && (
              <span className='text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg'>
                {t('Tersimpan.','Saved.')}
              </span>
            )}
            <ActionButton onClick={handleSave} disabled={saving} icon='💾'>
              {saving ? t('Menyimpan...','Saving...') : t('Simpan','Save')}
            </ActionButton>
          </div>
        }
      />

      <SectionCard title={t('Tampilkan di Beranda', 'Show on Homepage')}
        subtitle={t('Urutan: angka terkecil tampil paling atas.', 'Order: the smallest number shows up top.')}
        className='mb-5' bodyClass='divide-y divide-gray-100'>
        <Toggle t={t}
          locked
          label='Announcement'
          hint={t('Pengumuman perusahaan — selalu tampil, hanya urutannya yang bisa diatur.', 'Company announcements — always shown; only the order is adjustable.')}
          order={draft.order.announcement}
          onOrderChange={(v) => setOrder('announcement', v)}
        />
        <Toggle t={t}
          label={t('Menu Shortcut', 'Menu Shortcuts')}
          hint={t('Grid ikon akses cepat ke halaman yang sering dipakai.', 'Quick-access icon grid to frequently used pages.')}
          checked={draft.showMenuShortcuts}
          onChange={(v) => setDraft(d => ({ ...d, showMenuShortcuts: v }))}
          order={draft.order.menuShortcuts}
          onOrderChange={(v) => setOrder('menuShortcuts', v)}
        />
        <Toggle t={t}
          label={t('Things To Do', 'Things To Do')}
          hint={t('Daftar tugas dan informasi yang menunggu tindakanmu.', 'Tasks and FYI items waiting on you.')}
          checked={draft.showThingsToDo}
          onChange={(v) => setDraft(d => ({ ...d, showThingsToDo: v }))}
          order={draft.order.thingsToDo}
          onOrderChange={(v) => setOrder('thingsToDo', v)}
        />
        {myDashboards.map(d => (
          <Toggle key={d.id} t={t}
            label={t(d.label[0], d.label[1])}
            hint={t(d.hint[0], d.hint[1])}
            checked={draft[d.showKey]}
            onChange={(v) => setDraft(dr => ({ ...dr, [d.showKey]: v }))}
            order={draft.order[d.orderKey]}
            onOrderChange={(v) => setOrder(d.orderKey, v)}
          />
        ))}
      </SectionCard>

      {myDashboards.filter(d => draft[d.showKey]).map(d => (
        <SectionCard key={d.id}
          title={t(`Widget ${d.label[0]}`, `${d.label[1]} Widgets`)}
          subtitle={t('Urutan tampil di dalam dashboard ini.', 'Order within this dashboard.')}
          className='mb-5' bodyClass='divide-y divide-gray-100'>
          {d.widgets.map(w => (
            <Toggle key={w.key} t={t}
              label={t(w.label[0], w.label[1])}
              checked={draft.widgets[w.key]}
              onChange={(v) => setWidget(w.key, v)}
              order={draft.widgetOrder[w.key]}
              onOrderChange={(v) => setWidgetOrder(w.key, v)}
              chartType={w.chart ? (draft.chartType[w.key] || CHART_TYPE_DEFAULT) : null}
              onChartTypeChange={(v) => setChartType(w.key, v)}
            />
          ))}
        </SectionCard>
      ))}

      {draft.showMenuShortcuts && (
        <SectionCard title={t('Pilih Menu Shortcut', 'Choose Menu Shortcuts')}
          subtitle={t('Sembunyikan shortcut yang jarang kamu pakai.', 'Hide shortcuts you rarely use.')}
          bodyClass='divide-y divide-gray-100'>
          {shortcuts.map(s => {
            const visible = !draft.hiddenShortcutIds.includes(s.id)
            return (
              <div key={s.id} className='flex items-center justify-between gap-4 py-3'>
                <span className='flex items-center gap-3'>
                  <span className='w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500'>
                    {SICONS[s.icon]}
                  </span>
                  <span className='text-sm font-semibold text-gray-800'>{s.label}</span>
                </span>
                <button
                  type='button'
                  role='switch'
                  aria-checked={visible}
                  onClick={() => toggleShortcutDraft(s.id)}
                  className='relative flex-shrink-0 w-11 h-6 rounded-full transition-colors'
                  style={{ background: visible ? '#052B52' : '#d1d5db' }}>
                  <span
                    className='absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform'
                    style={{ transform: visible ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            )
          })}
        </SectionCard>
      )}

      <div className='flex justify-end mt-5'>
        <ActionButton onClick={handleSave} disabled={saving} icon='💾'>
          {saving ? t('Menyimpan...','Saving...') : t('Simpan','Save')}
        </ActionButton>
      </div>
    </div>
  )
}
