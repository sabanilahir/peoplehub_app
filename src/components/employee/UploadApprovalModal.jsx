'use client'

import { useState, useMemo, useRef } from 'react'
import Icon from '@/components/ui/Icon'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT } from '@/store/languageStore'

// Known variations in name spelling
const KNOWN_ALIASES = {
  'devita lesmana': 'devita lesmana teng',
  'vira hadist': 'vira mutiara hadits',
}

export default function UploadApprovalModal({ isOpen, onClose, onUploaded }) {
  const t = useT()
  const { employees, refreshFromDb } = useEmployeeStore()

  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'paste'
  const [autoCreateDirector, setAutoCreateDirector] = useState(true)
  const [updateNik, setUpdateNik] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'valid' | 'issues'
  const [errorMsg, setErrorMsg] = useState(null)
  const [successResult, setSuccessResult] = useState(null)

  const fileInputRef = useRef(null)

  // Map of lowercase names for fast lookup
  const empMap = useMemo(() => {
    const map = new Map()
    employees.forEach(e => {
      if (e.name) {
        map.set(e.name.toLowerCase().trim(), e)
      }
    })
    return map
  }, [employees])

  // Helper to match an approver name
  const resolveApprover = (nameStr) => {
    if (!nameStr || !nameStr.trim()) return null
    const clean = nameStr.toLowerCase().trim()

    // 1. Direct match
    if (empMap.has(clean)) {
      const e = empMap.get(clean)
      return { id: e.id, name: e.name, dept: e.dept, status: 'exact' }
    }

    // 2. Known alias
    const alias = KNOWN_ALIASES[clean]
    if (alias && empMap.has(alias)) {
      const e = empMap.get(alias)
      return { id: e.id, name: e.name, dept: e.dept, status: 'alias', original: nameStr }
    }

    // 3. Special Andy Lesmana handler
    if (clean === 'andy lesmana') {
      return { id: -1, name: 'Andy Lesmana', dept: 'Management', status: 'director' }
    }

    // 4. Fuzzy match (contains)
    for (const [k, e] of empMap.entries()) {
      if (k.includes(clean) || clean.includes(k)) {
        return { id: e.id, name: e.name, dept: e.dept, status: 'fuzzy', original: nameStr }
      }
    }

    return { id: null, name: nameStr, dept: null, status: 'unmatched' }
  }

  // Parse CSV text into parsed records
  const parsedRows = useMemo(() => {
    if (!rawText.trim()) return []

    const lines = rawText.trim().split(/\r?\n/)
    if (lines.length === 0) return []

    // Detect header
    let startIndex = 0
    const firstLine = lines[0].toLowerCase()
    if (firstLine.includes('id') && firstLine.includes('name') && (firstLine.includes('approval') || firstLine.includes('atasan'))) {
      startIndex = 1
    }

    const rows = []
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Support comma or semicolon or tab
      let delimiter = ','
      if (line.includes(';') && !line.includes(',')) delimiter = ';'
      else if (line.includes('\t') && !line.includes(',')) delimiter = '\t'

      // Split respecting potential quotes
      const parts = line.split(delimiter).map(p => p.replace(/^["']|["']$/g, '').trim())
      const csvId = parts[0] || ''
      const empName = parts[1] || ''
      const app1Name = parts[2] || ''
      const app2Name = parts[3] || ''

      const cleanEmpName = empName.toLowerCase()
      const empMatch = empMap.get(cleanEmpName)

      const app1 = resolveApprover(app1Name)
      const app2 = resolveApprover(app2Name)

      // Build approval matrix tiers
      const matrix = []
      if (app1 && (app1.id || app1.status === 'director')) {
        matrix.push({
          level: 1,
          employeeId: app1.id,
          label: app1.status === 'director' ? 'Approval 1 (Direktur)' : 'Approval 1 (Operasional)',
        })
      }
      if (app2 && (app2.id || app2.status === 'director') && app2.id !== app1?.id) {
        matrix.push({
          level: 2,
          employeeId: app2.id,
          label: 'Approval 2 (Manager)',
        })
      }

      const isValid = !!empMatch && (matrix.length > 0)
      const hasIssues = !empMatch || (app1Name && !app1?.id && app1?.status !== 'director') || (app2Name && !app2?.id && app2?.status !== 'director')

      rows.push({
        index: i,
        csvId,
        empName,
        empMatch,
        app1Name,
        app1,
        app2Name,
        app2,
        matrix,
        isValid,
        hasIssues,
      })
    }

    return rows
  }, [rawText, empMap])

  // Statistics
  const stats = useMemo(() => {
    const total = parsedRows.length
    const empFound = parsedRows.filter(r => !!r.empMatch).length
    const app1Mapped = parsedRows.filter(r => r.app1 && (r.app1.id || r.app1.status === 'director')).length
    const app2Count = parsedRows.filter(r => r.app2Name).length
    const app2Mapped = parsedRows.filter(r => r.app2 && (r.app2.id || r.app2.status === 'director')).length
    const ready = parsedRows.filter(r => r.isValid).length
    return { total, empFound, app1Mapped, app2Count, app2Mapped, ready }
  }, [parsedRows])

  // Filtered rows for table view
  const visibleRows = useMemo(() => {
    if (filterMode === 'valid') return parsedRows.filter(r => r.isValid)
    if (filterMode === 'issues') return parsedRows.filter(r => r.hasIssues)
    return parsedRows
  }, [parsedRows, filterMode])

  // Handle File Upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrorMsg(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        setRawText(content)
      }
    }
    reader.readAsText(file)
  }

  // Handle Drop
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setFileName(file.name)
    setErrorMsg(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        setRawText(content)
      }
    }
    reader.readAsText(file)
  }

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sample = `ID,Name,Approval 1,Approval 2\n250224000143,Gerry Krisnandi,muhammad rifki,\n23090100005,Tan Sui Lian,MOH. RAUL AMARULLAH,Devita Lesmana\n23090100013,Nurcahya Sakti,Sandy,Novi Atien Purwana Putri`
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'template_matriks_approval.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Submit Bulk Update
  const handleSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid)
    if (validRows.length === 0) {
      setErrorMsg('Tidak ada baris valid yang dapat diproses.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const payload = {
        autoCreateDirector,
        updateNik,
        items: validRows.map(r => ({
          employeeId: r.empMatch.id,
          csvId: r.csvId,
          managerId: r.app1?.id || null,
          approver1Id: r.app1?.id || null,
          approver2Id: r.app2?.id || null,
          approvalMatrix: r.matrix,
        })),
      }

      const res = await fetch('/api/employees/bulk-approval-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Terjadi kesalahan saat memproses data.')
      }

      setSuccessResult(json)
      // Refresh local store from database
      await refreshFromDb()
      if (onUploaded) onUploaded(json)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 overflow-y-auto'>
      <div className='bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150'>
        
        {/* Header */}
        <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-blue-50/30'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center text-xl font-bold'>
              <span>📤</span>
            </div>
            <div>
              <h2 className='text-base font-bold text-gray-900'>
                {t('Upload & Import Matriks Approval', 'Upload Approval Matrix')}
              </h2>
              <p className='text-xs text-gray-500 mt-0.5'>
                {t('Perbarui Atasan Langsung & Alur Tingkat Approval Karyawan secara Massal', 'Bulk update Direct Manager & Approval Workflow via CSV')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition'
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className='flex-1 overflow-y-auto p-6 space-y-5 text-sm'>

          {/* Success State Alert */}
          {successResult ? (
            <div className='p-6 bg-green-50 border border-green-200 rounded-2xl text-center space-y-3'>
              <span className='text-4xl'>🎉</span>
              <h3 className='text-lg font-bold text-green-900'>
                {t('Matriks Approval Berhasil Diperbarui!', 'Approval Matrix Successfully Updated!')}
              </h3>
              <p className='text-sm text-green-700 max-w-lg mx-auto'>
                {t('Sebanyak', 'Successfully updated')}{' '}
                <span className='font-bold underline'>{successResult.updatedCount}</span>{' '}
                {t('karyawan telah berhasil diperbarui matriks approvalnya ke basis data.', 'employees with their respective approval matrices.')}
                {successResult.directorCreated && (
                  <span className='block mt-2 font-medium bg-green-100 text-green-800 py-1 px-3 rounded-lg text-xs'>
                    ✓ {t('Profil Direktur (Andy Lesmana) berhasil didaftarkan otomatis.', 'Director profile (Andy Lesmana) was successfully registered.')}
                  </span>
                )}
              </p>
              <div className='pt-2'>
                <button
                  onClick={onClose}
                  className='px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-xs transition shadow-md'
                >
                  {t('Selesai & Tutup', 'Done & Close')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs: Upload File or Paste Text */}
              <div className='flex items-center justify-between gap-4 flex-wrap'>
                <div className='flex bg-gray-100 p-1 rounded-xl text-xs font-semibold'>
                  <button
                    type='button'
                    onClick={() => setActiveTab('upload')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'upload' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    📁 {t('Upload File CSV', 'Upload CSV File')}
                  </button>
                  <button
                    type='button'
                    onClick={() => setActiveTab('paste')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'paste' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    📋 {t('Salin / Tempel Teks', 'Paste Text')}
                  </button>
                </div>

                <button
                  type='button'
                  onClick={handleDownloadTemplate}
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition'
                >
                  <Icon e='📥' size={13} />
                  <span>{t('Unduh Template CSV', 'Download CSV Template')}</span>
                </button>
              </div>

              {/* Upload Input Area */}
              {activeTab === 'upload' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className='border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/20 hover:bg-blue-50/40 transition rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2'
                >
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.csv,.txt'
                    onChange={handleFileChange}
                    className='hidden'
                  />
                  <span className='text-3xl'>📄</span>
                  <div>
                    <p className='text-xs font-bold text-gray-800'>
                      {fileName ? fileName : t('Klik untuk memilih file atau seret file CSV ke sini', 'Click to select or drag CSV file here')}
                    </p>
                    <p className='text-[11px] text-gray-400 mt-0.5'>
                      {t('Format yang didukung: .csv atau .txt (Header: ID, Name, Approval 1, Approval 2)', 'Supported format: .csv or .txt (Header: ID, Name, Approval 1, Approval 2)')}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={5}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="ID,Name,Approval 1,Approval 2&#10;250224000143,Gerry Krisnandi,muhammad rifki,&#10;23090100005,Tan Sui Lian,MOH. RAUL AMARULLAH,Devita Lesmana"
                    className='w-full p-3 font-mono text-xs border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-gray-50/40'
                  />
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between'>
                  <span className='flex items-center gap-2'>
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </span>
                  <button onClick={() => setErrorMsg(null)} className='text-red-400 hover:text-red-600 font-bold'>✕</button>
                </div>
              )}

              {/* Statistics & Preview Section */}
              {parsedRows.length > 0 && (
                <div className='space-y-4 pt-2'>
                  {/* Stats Cards */}
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
                    <div className='bg-gray-50 p-3 rounded-xl border border-gray-100'>
                      <span className='text-[11px] text-gray-500 font-medium block'>{t('Total Baris CSV', 'Total CSV Rows')}</span>
                      <span className='text-lg font-bold text-gray-900'>{stats.total}</span>
                    </div>
                    <div className='bg-blue-50/60 p-3 rounded-xl border border-blue-100'>
                      <span className='text-[11px] text-blue-700 font-medium block'>{t('Karyawan Cocok', 'Matched Employees')}</span>
                      <span className='text-lg font-bold text-blue-900'>{stats.empFound} <span className='text-xs font-normal text-blue-600'>({((stats.empFound/stats.total)*100).toFixed(0)}%)</span></span>
                    </div>
                    <div className='bg-green-50/60 p-3 rounded-xl border border-green-100'>
                      <span className='text-[11px] text-green-700 font-medium block'>{t('Approver 1 Terpetakan', 'Approver 1 Mapped')}</span>
                      <span className='text-lg font-bold text-green-900'>{stats.app1Mapped} <span className='text-xs font-normal text-green-600'>({stats.total > 0 ? ((stats.app1Mapped/stats.total)*100).toFixed(0) : 0}%)</span></span>
                    </div>
                    <div className='bg-purple-50/60 p-3 rounded-xl border border-purple-100'>
                      <span className='text-[11px] text-purple-700 font-medium block'>{t('Approver 2 Terpetakan', 'Approver 2 Mapped')}</span>
                      <span className='text-lg font-bold text-purple-900'>{stats.app2Mapped} <span className='text-xs font-normal text-purple-600'>/ {stats.app2Count}</span></span>
                    </div>
                  </div>

                  {/* Options Checkboxes */}
                  <div className='bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/70 space-y-2'>
                    <label className='flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800 font-medium'>
                      <input
                        type='checkbox'
                        checked={autoCreateDirector}
                        onChange={(e) => setAutoCreateDirector(e.target.checked)}
                        className='rounded text-blue-600 focus:ring-blue-500 w-4 h-4'
                      />
                      <span>
                        {t('Otomatis daftarkan Andy Lesmana sebagai Direktur (Top Management) jika belum terdaftar', 'Auto-create Andy Lesmana as Director if not in database')}
                      </span>
                    </label>

                    <label className='flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800 font-medium'>
                      <input
                        type='checkbox'
                        checked={updateNik}
                        onChange={(e) => setUpdateNik(e.target.checked)}
                        className='rounded text-blue-600 focus:ring-blue-500 w-4 h-4'
                      />
                      <span>
                        {t('Perbarui juga kolom NIK karyawan dengan nomor ID dari CSV', 'Also update Employee NIK column with CSV ID')}
                      </span>
                    </label>
                  </div>

                  {/* Table Header Filter */}
                  <div className='flex items-center justify-between gap-2 pt-1'>
                    <span className='text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5'>
                      <span>📋</span> {t('Pratinjau Data Matriks Approval', 'Preview Approval Matrix Data')}
                    </span>
                    <div className='flex gap-1 text-[11px]'>
                      <button
                        type='button'
                        onClick={() => setFilterMode('all')}
                        className={`px-2.5 py-1 rounded-md transition ${filterMode === 'all' ? 'bg-gray-800 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {t('Semua', 'All')} ({parsedRows.length})
                      </button>
                      <button
                        type='button'
                        onClick={() => setFilterMode('valid')}
                        className={`px-2.5 py-1 rounded-md transition ${filterMode === 'valid' ? 'bg-green-700 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {t('Siap Simpan', 'Ready')} ({stats.ready})
                      </button>
                      <button
                        type='button'
                        onClick={() => setFilterMode('issues')}
                        className={`px-2.5 py-1 rounded-md transition ${filterMode === 'issues' ? 'bg-red-700 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {t('Bermasalah', 'Issues')} ({parsedRows.length - stats.ready})
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className='border border-gray-200 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto'>
                    <table className='w-full text-left text-xs'>
                      <thead className='bg-gray-50/90 sticky top-0 border-b border-gray-200 text-gray-500 text-[11px] uppercase tracking-wider'>
                        <tr>
                          <th className='py-2.5 px-3 font-semibold w-10'>No</th>
                          <th className='py-2.5 px-3 font-semibold w-28'>ID CSV</th>
                          <th className='py-2.5 px-3 font-semibold'>Karyawan (DB)</th>
                          <th className='py-2.5 px-3 font-semibold'>Approval 1 (Lead/SPV)</th>
                          <th className='py-2.5 px-3 font-semibold'>Approval 2 (Manager)</th>
                          <th className='py-2.5 px-3 font-semibold text-center w-28'>Status Matriks</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 text-gray-700'>
                        {visibleRows.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-blue-50/30' : 'bg-red-50/20 hover:bg-red-50/40'}>
                            <td className='py-2 px-3 text-gray-400 font-mono text-[11px]'>{idx + 1}</td>
                            <td className='py-2 px-3 font-mono text-gray-600 text-[11px]'>{row.csvId || '—'}</td>
                            <td className='py-2 px-3'>
                              {row.empMatch ? (
                                <div>
                                  <span className='font-semibold text-gray-900'>{row.empMatch.name}</span>
                                  <span className='ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-600 border border-gray-200'>
                                    {row.empMatch.dept || 'No Dept'}
                                  </span>
                                </div>
                              ) : (
                                <span className='text-red-600 font-semibold flex items-center gap-1'>
                                  <span>⚠️</span> {row.empName} (Tidak Ditemukan)
                                </span>
                              )}
                            </td>
                            <td className='py-2 px-3'>
                              {row.app1 ? (
                                <div>
                                  <span className='font-medium text-gray-900'>{row.app1.name}</span>
                                  {row.app1.status === 'director' ? (
                                    <span className='ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-medium'>
                                      👑 Direktur
                                    </span>
                                  ) : row.app1.status === 'alias' ? (
                                    <span className='ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200'>
                                      Alias
                                    </span>
                                  ) : (
                                    <span className='ml-1 text-gray-400 text-[10px]'>[{row.app1.dept || '-'}]</span>
                                  )}
                                </div>
                              ) : (
                                <span className='text-gray-400'>—</span>
                              )}
                            </td>
                            <td className='py-2 px-3'>
                              {row.app2 ? (
                                <div>
                                  <span className='font-medium text-gray-900'>{row.app2.name}</span>
                                  {row.app2.status === 'alias' && (
                                    <span className='ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200'>
                                      Alias
                                    </span>
                                  )}
                                </div>
                              ) : row.app2Name ? (
                                <span className='text-red-500 font-medium text-[11px]'>{row.app2Name} (Tidak Ditemukan)</span>
                              ) : (
                                <span className='text-gray-400 font-mono'>—</span>
                              )}
                            </td>
                            <td className='py-2 px-3 text-center'>
                              {row.isValid ? (
                                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200'>
                                  <span>✓</span> {row.matrix.length} {t('Tingkat', 'Tier')}
                                </span>
                              ) : (
                                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200'>
                                  <span>✕</span> {t('Gagal', 'Failed')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {visibleRows.length > 100 && (
                    <p className='text-[11px] text-gray-400 text-center'>
                      {t('Menampilkan 100 baris pertama dari total', 'Showing first 100 rows out of')}{' '}
                      {visibleRows.length} {t('baris.', 'rows.')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        {!successResult && (
          <div className='px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap'>
            <div className='text-xs text-gray-500'>
              {parsedRows.length > 0 && (
                <span>
                  {t('Siap diproses:', 'Ready to process:')}{' '}
                  <strong className='text-gray-800'>{stats.ready}</strong> dari {stats.total} baris
                </span>
              )}
            </div>

            <div className='flex items-center gap-2.5'>
              <button
                type='button'
                onClick={onClose}
                disabled={isSubmitting}
                className='px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition'
              >
                {t('Batal', 'Cancel')}
              </button>

              <button
                type='button'
                onClick={handleSubmit}
                disabled={isSubmitting || stats.ready === 0}
                className='inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-md hover:opacity-90 disabled:opacity-40 transition'
                style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
              >
                {isSubmitting ? (
                  <>
                    <Icon e='⌛' size={14} className='animate-spin' />
                    <span>{t('Menyimpan Data...', 'Saving Data...')}</span>
                  </>
                ) : (
                  <>
                    <Icon e='💾' size={14} />
                    <span>{t('Terapkan Matriks Approval', 'Apply Approval Matrix')} ({stats.ready})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
