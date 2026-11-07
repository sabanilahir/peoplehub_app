'use client'
import { useState, useMemo, useRef } from 'react'
import { useTimeEntryStore } from '@/store/timeEntryStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT } from '@/store/languageStore'
import { csvToObjects, toCsv, downloadCsv } from '@/lib/csv'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, SearchBar,
  ActionButton, StatusBadge, EmptyState,
} from '@/components/ui'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

// Header aliases so "Start Date", "start_date", "TanggalMulai" etc. all
// resolve — external integrations rarely agree on exact column names.
const HEADER_ALIASES = {
  employeeNumber: ['employeenumber', 'employeeno', 'employeeid', 'nik', 'noinduk', 'nomorinduk', 'idkaryawan', 'empno'],
  startDate: ['startdate', 'tanggalmulai', 'tglmulai'],
  startTime: ['starttime', 'jammulai', 'waktumulai'],
  endDate: ['enddate', 'tanggalselesai', 'tanggalakhir', 'tglselesai'],
  endTime: ['endtime', 'jamselesai', 'jamakhir', 'waktuselesai'],
}
const TEMPLATE_COLUMNS = [
  { key: 'employeeNumber', label: 'Employee Number' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'endDate', label: 'End Date' },
  { key: 'endTime', label: 'End Time' },
]

const pickField = (row, field) => {
  for (const alias of HEADER_ALIASES[field]) {
    if (row[alias] !== undefined && row[alias] !== '') return row[alias]
  }
  return ''
}

const durationMinutes = (startDate, startTime, endDate, endTime) => {
  const start = new Date(`${startDate}T${startTime}:00`)
  const end = new Date(`${endDate}T${endTime}:00`)
  if (isNaN(start) || isNaN(end)) return null
  return Math.round((end - start) / 60000)
}
const fmtDuration = (mins, t) => {
  if (mins == null) return '—'
  if (mins < 0) return t('Negatif', 'Negative')
  return `${Math.floor(mins / 60)}${t('j', 'h')} ${mins % 60}${t('m', 'm')}`
}

export default function TimeEntriesPage() {
  const t = useT()
  const { timeEntries, addEntries, deleteEntry, deleteBatch } = useTimeEntryStore()
  const { employees } = useEmployeeStore()
  const fileInputRef = useRef(null)

  const [preview, setPreview] = useState(null) // { fileName, rows: [...] }
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all') // all | matched | unmatched
  const [msg, setMsg] = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  const matchEmployee = (employeeNumber) => employees.find(e => String(e.nik || '').trim() === String(employeeNumber).trim()) || null

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      return flash(t('File harus berformat .csv.', 'File must be a .csv file.'), 'error')
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const objects = csvToObjects(String(e.target.result))
      if (objects.length === 0) return flash(t('File CSV kosong atau tidak terbaca.', 'CSV file is empty or unreadable.'), 'error')
      const rows = objects.map((row, i) => {
        const employeeNumber = pickField(row, 'employeeNumber')
        const startDate = pickField(row, 'startDate')
        const startTime = pickField(row, 'startTime')
        const endDate = pickField(row, 'endDate')
        const endTime = pickField(row, 'endTime')
        const errors = []
        if (!employeeNumber) errors.push(t('Employee Number kosong', 'Employee Number is empty'))
        if (!DATE_RE.test(startDate)) errors.push(t('Start Date harus YYYY-MM-DD', 'Start Date must be YYYY-MM-DD'))
        if (!TIME_RE.test(startTime)) errors.push(t('Start Time harus HH:MM', 'Start Time must be HH:MM'))
        if (!DATE_RE.test(endDate)) errors.push(t('End Date harus YYYY-MM-DD', 'End Date must be YYYY-MM-DD'))
        if (!TIME_RE.test(endTime)) errors.push(t('End Time harus HH:MM', 'End Time must be HH:MM'))
        const employee = errors.length === 0 ? matchEmployee(employeeNumber) : null
        return { rowNum: i + 2, employeeNumber, startDate, startTime, endDate, endTime, errors, employee }
      })
      setPreview({ fileName: file.name, rows })
    }
    reader.readAsText(file)
  }

  const previewStats = useMemo(() => {
    if (!preview) return null
    const valid = preview.rows.filter(r => r.errors.length === 0)
    const matched = valid.filter(r => r.employee)
    const unmatched = valid.filter(r => !r.employee)
    const invalid = preview.rows.length - valid.length
    return { total: preview.rows.length, valid: valid.length, matched: matched.length, unmatched: unmatched.length, invalid }
  }, [preview])

  const confirmImport = () => {
    const validRows = preview.rows.filter(r => r.errors.length === 0)
    if (validRows.length === 0) return flash(t('Tidak ada baris valid untuk diimpor.', 'No valid rows to import.'), 'error')
    const batchId = `b${Date.now()}`
    const importedAt = new Date().toISOString()
    addEntries(validRows.map(r => ({
      employeeNumber: r.employeeNumber, employeeId: r.employee?.id ?? null, employeeName: r.employee?.name ?? null,
      startDate: r.startDate, startTime: r.startTime, endDate: r.endDate, endTime: r.endTime,
      batchId, batchLabel: preview.fileName, importedAt,
    })))
    flash(t(`${validRows.length} time entry berhasil diimpor.`, `${validRows.length} time entries imported.`))
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const cancelPreview = () => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }

  const downloadTemplate = () => {
    const sample = [
      { employeeNumber: 'ENG-001', startDate: '2026-08-24', startTime: '08:00', endDate: '2026-08-24', endTime: '17:00' },
    ]
    downloadCsv('time-entries-template.csv', toCsv(sample, TEMPLATE_COLUMNS))
  }

  // ---- main list ----
  const batches = useMemo(() => {
    const map = new Map()
    timeEntries.forEach(e => {
      if (!map.has(e.batchId)) map.set(e.batchId, { batchId: e.batchId, batchLabel: e.batchLabel, count: 0, importedAt: e.importedAt })
      map.get(e.batchId).count++
    })
    return [...map.values()].sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)))
  }, [timeEntries])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return [...timeEntries]
      .filter(e => {
        if (filter === 'matched' && !e.employeeId) return false
        if (filter === 'unmatched' && e.employeeId) return false
        if (needle) {
          const hay = `${e.employeeName || ''} ${e.employeeNumber}`.toLowerCase()
          if (!hay.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => `${b.startDate}${b.startTime}`.localeCompare(`${a.startDate}${a.startTime}`))
  }, [timeEntries, q, filter])

  const matchedCount = timeEntries.filter(e => e.employeeId).length
  const unmatchedCount = timeEntries.length - matchedCount

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='📥'
        title={t('Time Entries', 'Time Entries')}
        subtitle={t(
          'Impor data jam kerja mentah dari integrasi eksternal (mis. mesin absensi) via file CSV.',
          'Import raw time-worked data from an external integration (e.g. an attendance device) via CSV file.',
        )}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard tone='brand' icon='📥' label={t('Total Time Entries', 'Total Time Entries')} value={String(timeEntries.length)} />
        <StatCard tone='green' icon='✅' label={t('Karyawan Cocok', 'Matched Employees')} value={String(matchedCount)} />
        <StatCard tone={unmatchedCount ? 'red' : 'gray'} icon='⚠️' label={t('Tidak Ditemukan', 'Unmatched')} value={String(unmatchedCount)}
          hint={t('Employee Number tidak cocok dengan NIK manapun', "Employee Number doesn't match any NIK")} />
      </div>

      <SectionCard
        title={t('Impor dari CSV', 'Import from CSV')}
        icon='📥'
        subtitle={t(
          'Kolom wajib: Start Date, Start Time, End Date, End Time, Employee Number. Format tanggal YYYY-MM-DD, jam HH:MM.',
          'Required columns: Start Date, Start Time, End Date, End Time, Employee Number. Date format YYYY-MM-DD, time HH:MM.',
        )}
        actions={
          <button onClick={downloadTemplate}
            className='rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50'>
            ⬇ {t('Unduh Template CSV', 'Download CSV Template')}
          </button>
        }
      >
        {!preview ? (
          <label className='flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-10 text-center hover:border-teal-400 hover:bg-teal-50/30'>
            <span className='text-3xl'>📄</span>
            <span className='text-sm font-semibold text-gray-700'>{t('Klik untuk pilih file CSV', 'Click to select a CSV file')}</span>
            <span className='text-xs text-gray-400'>{t('atau seret & lepas di sini', 'or drag and drop here')}</span>
            <input ref={fileInputRef} type='file' accept='.csv,text/csv' className='hidden'
              onChange={e => handleFile(e.target.files?.[0])} />
          </label>
        ) : (
          <div>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
              <div className='text-sm text-gray-600'>
                <span className='font-semibold text-gray-800'>{preview.fileName}</span> — {previewStats.total} {t('baris', 'rows')}:{' '}
                <span className='font-semibold text-emerald-600'>{previewStats.matched} {t('cocok', 'matched')}</span>,{' '}
                <span className='font-semibold text-amber-600'>{previewStats.unmatched} {t('tidak cocok', 'unmatched')}</span>,{' '}
                <span className='font-semibold text-red-600'>{previewStats.invalid} {t('tidak valid', 'invalid')}</span>
              </div>
              <div className='flex gap-2'>
                <ActionButton size='sm' onClick={confirmImport} icon='✅' disabled={previewStats.valid === 0}>
                  {t(`Impor ${previewStats.valid} Entri`, `Import ${previewStats.valid} Entries`)}
                </ActionButton>
                <ActionButton size='sm' variant='secondary' onClick={cancelPreview}>{t('Batal', 'Cancel')}</ActionButton>
              </div>
            </div>
            <div className='max-h-96 overflow-y-auto rounded-xl border border-gray-100'>
              <DataTable className='rounded-none shadow-none ring-0' columns={[
                '#', t('Employee Number', 'Employee Number'), t('Karyawan', 'Employee'),
                t('Mulai', 'Start'), t('Selesai', 'End'), 'Status',
              ]}>
                {preview.rows.map(r => (
                  <Tr key={r.rowNum}>
                    <Td className='text-xs text-gray-400'>{r.rowNum}</Td>
                    <Td className='font-mono text-xs'>{r.employeeNumber || '—'}</Td>
                    <Td className='text-xs'>
                      {r.errors.length > 0 ? <span className='text-gray-300'>—</span>
                        : r.employee ? <span className='text-gray-700'>{r.employee.name}</span>
                        : <span className='text-amber-600'>{t('Tidak ditemukan', 'Not found')}</span>}
                    </Td>
                    <Td className='text-xs tabular-nums text-gray-500'>{r.startDate} {r.startTime}</Td>
                    <Td className='text-xs tabular-nums text-gray-500'>{r.endDate} {r.endTime}</Td>
                    <Td>
                      {r.errors.length > 0
                        ? <StatusBadge tone='danger'>{r.errors[0]}</StatusBadge>
                        : r.employee
                          ? <StatusBadge tone='success'>{t('Siap diimpor', 'Ready')}</StatusBadge>
                          : <StatusBadge tone='warning'>{t('Karyawan Tidak Cocok', 'No Employee Match')}</StatusBadge>}
                    </Td>
                  </Tr>
                ))}
              </DataTable>
            </div>
          </div>
        )}
      </SectionCard>

      {batches.length > 0 && (
        <div className='mb-4 mt-6 flex flex-wrap items-center gap-2'>
          <span className='text-xs font-bold uppercase tracking-wide text-gray-400'>{t('Batch Impor', 'Import Batches')}:</span>
          {batches.map(b => (
            <span key={b.batchId} className='inline-flex items-center gap-2 rounded-full bg-gray-100 py-1 pl-3 pr-1.5 text-xs font-medium text-gray-600'>
              {b.batchLabel} ({b.count})
              <button onClick={() => { deleteBatch(b.batchId); flash(t('Batch dihapus.', 'Batch deleted.')) }}
                className='flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600'>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className='mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='max-w-sm flex-1'>
          <SearchBar value={q} onChange={setQ} placeholder={t('Cari nama atau Employee Number…', 'Search name or Employee Number…')} />
        </div>
        <div className='flex gap-2'>
          {[['all', t('Semua', 'All')], ['matched', t('Cocok', 'Matched')], ['unmatched', t('Tidak Cocok', 'Unmatched')]].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <SectionCard bodyClass='p-0'>
        {rows.length === 0 ? (
          <div className='p-5'>
            <EmptyState icon='📥' title={t('Belum ada time entry.', 'No time entries yet.')}
              description={t('Impor file CSV pertama dari integrasi eksternal Anda.', 'Import your first CSV file from your external integration.')} />
          </div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0' columns={[
            t('Karyawan', 'Employee'), t('Mulai', 'Start'), t('Selesai', 'End'),
            { label: t('Durasi', 'Duration'), align: 'right' }, t('Sumber', 'Source'), 'Status', { label: t('Aksi', 'Action'), align: 'right' },
          ]}>
            {rows.map(e => (
              <Tr key={e.id}>
                <Td>
                  <p className='font-semibold text-gray-800'>{e.employeeName || <span className='text-gray-400'>{t('(tidak dikenal)', '(unknown)')}</span>}</p>
                  <p className='font-mono text-xs text-gray-400'>{e.employeeNumber}</p>
                </Td>
                <Td className='text-xs tabular-nums text-gray-500'>{e.startDate} {e.startTime}</Td>
                <Td className='text-xs tabular-nums text-gray-500'>{e.endDate} {e.endTime}</Td>
                <Td align='right' className='text-xs text-gray-600'>{fmtDuration(durationMinutes(e.startDate, e.startTime, e.endDate, e.endTime), t)}</Td>
                <Td className='text-xs text-gray-400'>{e.batchLabel}</Td>
                <Td>
                  {e.employeeId
                    ? <StatusBadge tone='success'>{t('Cocok', 'Matched')}</StatusBadge>
                    : <StatusBadge tone='warning'>{t('Tidak Cocok', 'Unmatched')}</StatusBadge>}
                </Td>
                <Td align='right'>
                  <button onClick={() => { deleteEntry(e.id); flash(t('Entri dihapus.', 'Entry deleted.')) }}
                    className='rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100'>
                    {t('Hapus', 'Delete')}
                  </button>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </div>
  )
}
