'use client'
import Icon from '@/components/ui/Icon'
import { useState }                    from 'react'
import { usePayrollStore, formatRp }   from '@/store/payrollStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td,
  StatusBadge, ActionButton, FormField, Select, EmptyState,
} from '@/components/ui'

export default function PayrollRunPage() {
  const t = useT()
  const { payslips, generatePeriod, publishPeriod, removePayslip } = usePayrollStore()
  const [period, setPeriod] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [msg, setMsg] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const flash = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const periodList = [...new Set([period, ...payslips.map(p=>p.period)])].sort((a,b)=>b.localeCompare(a))
  const rows       = payslips.filter(p=>p.period===period)
  const isDraft    = rows.some(p=>p.status==='Draft')
  const detail     = rows.find(p => p.id === detailId)

  const handleGenerate = () => {
    const before = rows.length
    generatePeriod(period)
    flash(t(`Payroll digenerate untuk periode ${period}.`,`Payroll generated for ${period}.`))
  }

  const handlePublish = () => {
    publishPeriod(period)
    flash(t('Payroll berhasil dipublish!','Payroll published successfully!').replace('!',` - ${period}!`))
  }

  const totalNet      = rows.reduce((s,p)=>s+p.net, 0)
  const totalGross     = rows.reduce((s,p)=>s+p.gross, 0)
  const totalPph21      = rows.reduce((s,p)=>s+(p.pph21||0), 0)
  const totalEmployerCost = rows.reduce((s,p)=>s+(p.employerCost||0), 0)

  return (
    <div>
      <PageHeader
        icon='💼'
        title='Payroll Run'
        subtitle={t('Generate, review, dan publish payroll bulanan sesuai PPh 21 & BPJS.','Generate, review, and publish monthly payroll per PPh 21 & BPJS rules.')}
      />

      {/* Period selector */}
      <SectionCard className='mb-6'>
        <div className='flex flex-wrap items-end gap-4'>
          <FormField label={t('Periode','Period')} className='w-44'>
            <Select value={period} onChange={e=>setPeriod(e.target.value)}>
              {periodList.map(p=><option key={p} value={p}>{p}</option>)}
            </Select>
          </FormField>
          {msg && (
            <div className={`mb-1 text-xs px-4 py-2 rounded-lg ${msg.type==='error'?'bg-red-50 text-red-600':'bg-emerald-50 text-emerald-700'}`}>
              {msg.text}
            </div>
          )}
          <div className='ml-auto mb-0.5 flex gap-2'>
            <ActionButton onClick={handleGenerate} icon='⚙️' variant='secondary'>
              {t('Generate Payroll','Generate Payroll')}
            </ActionButton>
            {isDraft ? (
              <ActionButton onClick={handlePublish} icon='🚀'>Publish Payroll</ActionButton>
            ) : rows.length ? (
              <StatusBadge tone='success'><Icon e='✅' size={14} className='inline align-[-2px]' /> Published</StatusBadge>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {/* Summary */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <StatCard icon='👥' tone='brand'  label={t('Total Karyawan','Total Employees')} value={rows.length} />
        <StatCard icon='💵' tone='blue'   label={t('Total Gaji Bruto','Total Gross')} value={formatRp(totalGross)} />
        <StatCard icon='🧾' tone='orange' label='Total PPh 21' value={formatRp(totalPph21)} />
        <StatCard icon='🏦' tone='green'  label={t('Total Take-Home','Total Take-Home')} value={formatRp(totalNet)} />
      </div>

      {/* Table */}
      <SectionCard icon='💼' title={`${t('Detail Payroll','Payroll Detail')} — ${period}`}
        subtitle={t(`Total biaya perusahaan (termasuk BPJS pemberi kerja): ${formatRp(totalEmployerCost)}`,`Total employer cost (incl. employer BPJS): ${formatRp(totalEmployerCost)}`)}
        bodyClass='p-0'>
        {rows.length ? (
          <DataTable columns={[
            { label: t('Nama','Name') },
            { label: t('Gaji Pokok','Basic Salary'), align:'right' },
            { label: t('Tunjangan','Allowance'), align:'right' },
            { label: 'BPJS', align:'right' },
            { label: 'PPh 21', align:'right' },
            { label: 'Take-Home', align:'right' },
            { label: 'Status' },
            { label: '' },
          ]}>
            {rows.map(p=>{
              const bpjsEmp = (p.bpjsKesehatanEmployee||0) + (p.jhtEmployee||0) + (p.jpEmployee||0)
              return (
              <Tr key={p.id}>
                <Td className='font-medium text-gray-800'>{p.name}</Td>
                <Td align='right' className='text-gray-600'>{formatRp(p.basic)}</Td>
                <Td align='right' className='text-gray-600'>{formatRp(p.allowance)}</Td>
                <Td align='right' className='text-red-500'>-{formatRp(bpjsEmp)}</Td>
                <Td align='right' className='text-red-500'>-{formatRp(p.pph21)}</Td>
                <Td align='right' className='font-semibold text-gray-900'>{formatRp(p.net)}</Td>
                <Td><StatusBadge status={p.status} /></Td>
                <Td align='right'>
                  <button onClick={()=>setDetailId(p.id)} className='text-xs font-semibold text-red-700 hover:underline'>
                    {t('Detail','Detail')}
                  </button>
                </Td>
              </Tr>
            )})}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='📭' title={t('Belum ada data. Klik "Generate Payroll" untuk membuatnya.','No data yet. Click "Generate Payroll" to create it.')} />
          </div>
        )}
      </SectionCard>

      {/* Detail modal */}
      {detail && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={()=>setDetailId(null)}>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-md p-6' onClick={e=>e.stopPropagation()}>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <h3 className='text-base font-bold text-gray-800'>{detail.name}</h3>
                <p className='text-xs text-gray-400'>{detail.period} · PTKP {detail.ptkpStatus} · NPWP {detail.npwp ? t('Ada','Yes') : t('Tidak ada','No')}</p>
              </div>
              <button onClick={()=>setDetailId(null)} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>

            <div className='space-y-1 text-sm mb-3'>
              <Row label={t('Gaji Pokok','Basic Salary')} value={detail.basic} />
              <Row label={t('Tunjangan Tetap','Fixed Allowance')} value={detail.allowance} />
              {detail.variableAllowance ? <Row label={t('Tunjangan Variable','Variable Allowance')} value={detail.variableAllowance} /> : null}
              {detail.attendanceReward ? <Row label={t('Reward Kehadiran','Attendance Reward')} value={detail.attendanceReward} /> : null}
              <Row label={t('Total Bruto','Gross Total')} value={detail.gross} bold />
            </div>

            <div className='space-y-1 text-sm mb-3 border-t border-gray-100 pt-3'>
              <Row label='BPJS Kesehatan (karyawan)' value={-detail.bpjsKesehatanEmployee} />
              <Row label='BPJS JHT (karyawan)' value={-detail.jhtEmployee} />
              <Row label='BPJS JP (karyawan)' value={-detail.jpEmployee} />
              <Row label='PPh 21' value={-detail.pph21} />
              {detail.attendanceDeduction ? <Row label={t('Denda Keterlambatan','Attendance Penalty')} value={-detail.attendanceDeduction} /> : null}
              {detail.otherDeduction ? <Row label={t('Potongan Lain','Other Deduction')} value={-detail.otherDeduction} /> : null}
              <Row label={t('Total Potongan','Total Deductions')} value={-detail.totalDeduction} bold />
            </div>

            <div className='flex justify-between items-center border-t-2 border-gray-200 pt-3 mb-4'>
              <span className='font-bold text-gray-800'>{t('Take-Home Pay','Take-Home Pay')}</span>
              <span className='font-bold text-red-700 text-lg'>{formatRp(detail.net)}</span>
            </div>

            <div className='space-y-1 text-xs text-gray-400 border-t border-gray-100 pt-3 mb-4'>
              <Row label='BPJS Kesehatan (perusahaan)' value={detail.bpjsKesehatanEmployer} muted />
              <Row label='BPJS JHT (perusahaan)' value={detail.jhtEmployer} muted />
              <Row label='BPJS JP (perusahaan)' value={detail.jpEmployer} muted />
              <Row label='BPJS JKK (perusahaan)' value={detail.jkkEmployer} muted />
              <Row label='BPJS JKM (perusahaan)' value={detail.jkmEmployer} muted />
              <Row label={t('Total Biaya Perusahaan','Total Employer Cost')} value={detail.employerCost} muted bold />
            </div>

            {detail.status === 'Draft' && (
              <ActionButton variant='danger' size='sm' onClick={()=>{ removePayslip(detail.id); setDetailId(null) }}>
                {t('Hapus Draft','Delete Draft')}
              </ActionButton>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold, muted }) {
  const neg = value < 0
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''} ${muted ? 'text-gray-400' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span className={neg ? 'text-red-600' : ''}>{neg ? `- ${formatRp(-value)}` : formatRp(value)}</span>
    </div>
  )
}
