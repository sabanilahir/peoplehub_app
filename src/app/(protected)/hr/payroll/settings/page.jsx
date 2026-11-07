'use client'
import { useState } from 'react'
import { usePayrollStore, formatRp } from '@/store/payrollStore'
import { PTKP_TABLE, TAX_BRACKETS } from '@/lib/payrollCalc'
import { useT } from '@/store/languageStore'
import {
  PageHeader, SectionCard, FormField, Input, ActionButton, DataTable, Tr, Td,
} from '@/components/ui'

const pct = (n) => `${(n * 100).toFixed(2)}%`

export default function PayrollSettingsPage() {
  const t = useT()
  const { settings, updateSettings } = usePayrollStore()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)

  const set = (path, value) => setForm(f => {
    const next = structuredClone(f)
    const keys = path.split('.')
    let o = next
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]]
    o[keys.at(-1)] = value
    return next
  })

  const save = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(()=>setSaved(false), 3000)
  }

  const pctField = (label, path, value) => (
    <FormField label={label}>
      <Input type='number' step='0.01' value={Math.round(value*10000)/100} onChange={e=>set(path, Number(e.target.value)/100)} />
    </FormField>
  )
  const rpField = (label, path, value) => (
    <FormField label={label}>
      <Input type='number' value={value} onChange={e=>set(path, Number(e.target.value))} />
    </FormField>
  )

  return (
    <div>
      <PageHeader
        icon='⚙️'
        title={t('Payroll Settings','Payroll Settings')}
        subtitle={t('Tarif & batas atas BPJS/PPh 21 yang dipakai saat generate payroll.','Rates & caps for BPJS/PPh 21 used when generating payroll.')}
        actions={
          <ActionButton onClick={save} icon='💾'>{t('Simpan','Save')}</ActionButton>
        }
      />

      {saved && (
        <div className='mb-4 text-xs px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 inline-block'>
          {t('Pengaturan tersimpan.','Settings saved.')}
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4'>
        <SectionCard title='BPJS Kesehatan' subtitle={t('Iuran jaminan kesehatan.','Health insurance contribution.')}>
          <div className='grid grid-cols-2 gap-3'>
            {pctField(t('Tarif Karyawan (%)','Employee Rate (%)'), 'bpjsKesehatan.employeeRate', form.bpjsKesehatan.employeeRate)}
            {pctField(t('Tarif Perusahaan (%)','Employer Rate (%)'), 'bpjsKesehatan.employerRate', form.bpjsKesehatan.employerRate)}
            {rpField(t('Batas Upah (Rp)','Salary Cap (Rp)'), 'bpjsKesehatan.salaryCap', form.bpjsKesehatan.salaryCap)}
          </div>
        </SectionCard>

        <SectionCard title='BPJS Ketenagakerjaan — JHT' subtitle='Jaminan Hari Tua'>
          <div className='grid grid-cols-2 gap-3'>
            {pctField(t('Tarif Karyawan (%)','Employee Rate (%)'), 'jht.employeeRate', form.jht.employeeRate)}
            {pctField(t('Tarif Perusahaan (%)','Employer Rate (%)'), 'jht.employerRate', form.jht.employerRate)}
          </div>
        </SectionCard>

        <SectionCard title='BPJS Ketenagakerjaan — JP' subtitle='Jaminan Pensiun'>
          <div className='grid grid-cols-2 gap-3'>
            {pctField(t('Tarif Karyawan (%)','Employee Rate (%)'), 'jp.employeeRate', form.jp.employeeRate)}
            {pctField(t('Tarif Perusahaan (%)','Employer Rate (%)'), 'jp.employerRate', form.jp.employerRate)}
            {rpField(t('Batas Upah (Rp)','Salary Cap (Rp)'), 'jp.salaryCap', form.jp.salaryCap)}
          </div>
        </SectionCard>

        <SectionCard title='JKK & JKM' subtitle={t('Kecelakaan Kerja & Kematian (perusahaan).','Work Accident & Death (employer only).')}>
          <div className='grid grid-cols-2 gap-3'>
            {pctField('JKK (%)', 'jkk.employerRate', form.jkk.employerRate)}
            {pctField('JKM (%)', 'jkm.employerRate', form.jkm.employerRate)}
          </div>
        </SectionCard>

        <SectionCard title={t('Biaya Jabatan','Position Cost Deduction')} subtitle='PMK 250/2008'>
          <div className='grid grid-cols-2 gap-3'>
            {pctField(t('Tarif (%)','Rate (%)'), 'biayaJabatan.rate', form.biayaJabatan.rate)}
            {rpField(t('Batas per Bulan (Rp)','Monthly Cap (Rp)'), 'biayaJabatan.monthlyCap', form.biayaJabatan.monthlyCap)}
          </div>
        </SectionCard>

        <SectionCard title={t('Tanpa NPWP','No NPWP')} subtitle='Pasal 21 ayat 5a UU PPh'>
          {pctField(t('Tambahan Tarif (%)','Surcharge (%)'), 'npwpSurcharge', form.npwpSurcharge)}
        </SectionCard>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <SectionCard title='PTKP' subtitle={t('Penghasilan Tidak Kena Pajak (per tahun).','Non-taxable income (annual).')} bodyClass='p-0'>
          <DataTable columns={[{label:'Status'}, {label:t('Nilai','Amount'), align:'right'}]}>
            {Object.entries(PTKP_TABLE).map(([k,v]) => (
              <Tr key={k}><Td className='font-medium'>{k}</Td><Td align='right'>{formatRp(v)}</Td></Tr>
            ))}
          </DataTable>
        </SectionCard>

        <SectionCard title={t('Tarif Progresif PPh 21','PPh 21 Progressive Brackets')} subtitle='UU HPP 2022' bodyClass='p-0'>
          <DataTable columns={[{label:t('Lapisan PKP','PKP Bracket'), align:'left'}, {label:t('Tarif','Rate'), align:'right'}]}>
            {TAX_BRACKETS.map((b, i) => {
              const lower = i === 0 ? 0 : TAX_BRACKETS[i-1].upTo
              const label = b.upTo === Infinity ? `> ${formatRp(lower)}` : `${formatRp(lower)} – ${formatRp(b.upTo)}`
              return <Tr key={i}><Td>{label}</Td><Td align='right' className='font-semibold'>{pct(b.rate)}</Td></Tr>
            })}
          </DataTable>
        </SectionCard>
      </div>
    </div>
  )
}
