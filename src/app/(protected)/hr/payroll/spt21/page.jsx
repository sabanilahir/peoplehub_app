'use client'
import { useState, useMemo } from 'react'
import { usePayrollStore, formatRp } from '@/store/payrollStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, SearchBar,
  ActionButton, StatusBadge, EmptyState, FormField, Input, Select,
} from '@/components/ui'
import {
  buildAllBuktiPotong, buktiPotongToCsv, nomorBuktiPotong,
  availableTaxYears, MONTHS_ID,
} from '@/lib/spt21'
import { openBuktiPotongPdf } from '@/lib/spt21Pdf'

const DEFAULT_PEMOTONG = { npwp: '', nama: '', alamat: '', penandatanganNama: '', penandatanganNpwp: '' }

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Spt21Page() {
  const t = useT()
  const { payslips, settings, updateSettings } = usePayrollStore()
  const { employees } = useEmployeeStore()

  const years = availableTaxYears(payslips)
  const [year, setYear] = useState(years[0] || String(new Date().getFullYear()))
  const [q, setQ] = useState('')
  const [editPemotong, setEditPemotong] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  // Clicking a row fills the official DJP template and hands over the PDF —
  // no print preview in between.
  const generate = async (b, idx) => {
    setBusyId(b.empId)
    setError('')
    try {
      await openBuktiPotongPdf({ b, no: nomorBuktiPotong(year, idx), pemotong })
    } catch (e) {
      setError(t(`Gagal membuat PDF: ${e.message}`, `Failed to build PDF: ${e.message}`))
    } finally {
      setBusyId(null)
    }
  }

  const pemotong = { ...DEFAULT_PEMOTONG, ...(settings.pemotong || {}) }
  const setPemotong = (patch) => updateSettings({ pemotong: { ...pemotong, ...patch } })

  // Only Published payslips belong on a bukti potong — a Draft hasn't been paid.
  const published = useMemo(
    () => payslips.filter(p => p.status === 'Published'),
    [payslips],
  )
  const list = useMemo(
    () => buildAllBuktiPotong({ payslips: published, year, employees, settings }),
    [published, year, employees, settings],
  )

  const needle = q.trim().toLowerCase()
  const shown = needle
    ? list.filter(b => b.nama.toLowerCase().includes(needle) || (b.npwp || '').includes(needle))
    : list

  const totalBruto = list.reduce((s, b) => s + b.bruto, 0)
  const totalPph = list.reduce((s, b) => s + b.pphTerutang, 0)
  const mismatched = list.filter(b => b.selisih !== 0).length

  const exportCsv = () => {
    const blob = new Blob([buktiPotongToCsv(list, year)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SPT-PPh21-1721-A1-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        icon='🧾'
        title={t('SPT PPh 21 Karyawan (1721-A1)', 'Employee PPh 21 Return (1721-A1)')}
        subtitle={t(
          'Bukti potong PPh 21 tahunan untuk pegawai tetap, dihitung dari payroll yang sudah dipublish.',
          'Annual PPh 21 withholding certificates for permanent employees, built from published payroll.',
        )}
        actions={
          <div className='flex items-center gap-2'>
            <Select value={year} onChange={e => { setYear(e.target.value); setOpenIdx(null) }}>
              {(years.length ? years : [year]).map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
            <ActionButton onClick={exportCsv} icon='⬇️' disabled={list.length === 0}>
              {t('Export CSV', 'Export CSV')}
            </ActionButton>
          </div>
        }
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <StatCard icon='👥' tone='gray'   label={t('Jumlah Pegawai', 'Employees')} value={String(list.length)} />
        <StatCard icon='💰' tone='blue'   label={t('Total Bruto', 'Total Gross')} value={formatRp(totalBruto)} />
        <StatCard icon='🧾' tone='orange' label={t('Total PPh 21 Terutang', 'Total PPh 21 Due')} value={formatRp(totalPph)} />
        <StatCard icon='⚖️' tone={mismatched ? 'red' : 'green'}
          label={t('Perlu Penyesuaian', 'Needs Adjustment')} value={String(mismatched)}
          hint={t('Terutang ≠ dipotong', 'Due ≠ withheld')} />
      </div>

      <SectionCard
        icon='🏢'
        title={t('Identitas Pemotong', 'Withholder Identity')}
        subtitle={t('Dipakai di bagian C setiap bukti potong.', 'Printed in section C of every certificate.')}
        className='mb-6'
        actions={
          <ActionButton variant='secondary' size='sm' onClick={() => setEditPemotong(v => !v)}>
            {editPemotong ? t('Selesai', 'Done') : t('Ubah', 'Edit')}
          </ActionButton>
        }
      >
        {editPemotong ? (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormField label={t('NPWP Pemotong', 'Withholder NPWP')}>
              <Input value={pemotong.npwp} onChange={e => setPemotong({ npwp: e.target.value })} placeholder='00.000.000.0-000.000' />
            </FormField>
            <FormField label={t('Nama Pemotong', 'Withholder Name')}>
              <Input value={pemotong.nama} onChange={e => setPemotong({ nama: e.target.value })} />
            </FormField>
            <FormField label={t('Alamat', 'Address')} className='md:col-span-2'>
              <Input value={pemotong.alamat} onChange={e => setPemotong({ alamat: e.target.value })} />
            </FormField>
            <FormField label={t('Nama Penandatangan', 'Signatory Name')}>
              <Input value={pemotong.penandatanganNama} onChange={e => setPemotong({ penandatanganNama: e.target.value })} />
            </FormField>
            <FormField label={t('NPWP Penandatangan', 'Signatory NPWP')}>
              <Input value={pemotong.penandatanganNpwp} onChange={e => setPemotong({ penandatanganNpwp: e.target.value })} />
            </FormField>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 text-sm md:grid-cols-3'>
            <p><span className='block text-xs text-gray-400'>NPWP</span>{pemotong.npwp || '—'}</p>
            <p><span className='block text-xs text-gray-400'>{t('Nama', 'Name')}</span>{pemotong.nama || '—'}</p>
            <p><span className='block text-xs text-gray-400'>{t('Penandatangan', 'Signatory')}</span>{pemotong.penandatanganNama || '—'}</p>
          </div>
        )}
      </SectionCard>

      <div className='mb-4'>
        <SearchBar value={q} onChange={setQ} placeholder={t('Cari nama atau NPWP…', 'Search name or NPWP…')} />
      </div>

      {error && (
        <p className='mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100'>{error}</p>
      )}

      {list.length > 0 && (
        <p className='mb-3 text-xs text-gray-400'>
          {t('Klik baris untuk membuat PDF bukti potong sesuai formulir resmi DJP.',
             'Click a row to build the PDF on the official DJP form.')}
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon='🧾'
          title={t('Belum ada data', 'No data yet')}
          description={t(
            `Belum ada payroll berstatus Published untuk tahun ${year}. Jalankan dan publish Payroll Run lebih dulu.`,
            `No Published payroll for ${year}. Run and publish a Payroll Run first.`,
          )}
        />
      ) : (
        <DataTable columns={[
          { label: t('No. Bukti Potong', 'Certificate No.') },
          { label: t('Nama', 'Name') },
          { label: 'NPWP' },
          { label: 'PTKP', align: 'center' },
          { label: t('Masa', 'Period'), align: 'center' },
          { label: t('Bruto', 'Gross'), align: 'right' },
          { label: t('PPh 21 Terutang', 'PPh 21 Due'), align: 'right' },
          { label: t('Dipotong', 'Withheld'), align: 'right' },
          { label: t('Selisih', 'Difference'), align: 'right' },
          { label: '', align: 'right', width: 110 },
        ]}>
          {shown.map((b) => {
            const idx = list.indexOf(b)
            return (
              <Tr key={b.empId} onClick={() => generate(b, idx)}>
                <Td className='text-xs tabular-nums'>{nomorBuktiPotong(year, idx)}</Td>
                <Td className='font-semibold text-gray-800'>{b.nama}</Td>
                <Td className='text-xs'>{b.npwp || <span className='text-gray-300'>—</span>}</Td>
                <Td align='center'>{b.ptkpStatus}</Td>
                <Td align='center' className='text-xs tabular-nums'>
                  {MONTHS_ID[b.masaDari - 1].slice(0, 3)}–{MONTHS_ID[b.masaSampai - 1].slice(0, 3)}
                </Td>
                <Td align='right' className='tabular-nums'>{formatRp(b.bruto)}</Td>
                <Td align='right' className='tabular-nums'>{formatRp(b.pphTerutang)}</Td>
                <Td align='right' className='tabular-nums'>{formatRp(b.pphDipotong)}</Td>
                <Td align='right'>
                  {b.selisih === 0
                    ? <StatusBadge tone='success'>{t('Sesuai', 'Match')}</StatusBadge>
                    : <span className={`font-semibold tabular-nums ${b.selisih > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {b.selisih > 0 ? '+' : '−'}{formatRp(Math.abs(b.selisih))}
                      </span>}
                </Td>
                <Td align='right'>
                  <span className='text-xs font-semibold text-red-700'>
                    {busyId === b.empId ? t('Membuat…', 'Building…') : t('📄 Cetak PDF', '📄 Get PDF')}
                  </span>
                </Td>
              </Tr>
            )
          })}
        </DataTable>
      )}
    </div>
  )
}
