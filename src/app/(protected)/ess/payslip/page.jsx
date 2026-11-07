'use client'
import Icon from '@/components/ui/Icon'
import { useState }        from 'react'
import { useAuthStore }    from '@/store/authStore'
import { usePayrollStore, formatRp } from '@/store/payrollStore'
import { useT } from '@/store/languageStore'

export default function PayslipPage() {
  const t = useT()
  const { currentUser }   = useAuthStore()
  const { payslips }      = usePayrollStore()
  const [selected, setSelected] = useState(null)

  const mine = currentUser
    ? payslips
        .filter(p => p.empId === currentUser.id && p.status === 'Published')
        .sort((a, b) => b.period.localeCompare(a.period))
    : []

  const detail = mine.find(p => p.id === selected) || mine[0]

  const earnings = detail ? [
    { label: t('Gaji Pokok','Basic Salary'), value: detail.basic },
    { label: t('Tunjangan Tetap','Fixed Allowance'), value: detail.allowance },
    ...(detail.variableAllowance ? [{ label: t('Tunjangan Variable','Variable Allowance'), value: detail.variableAllowance }] : []),
    ...(detail.overtime ? [{ label: t('Lembur','Overtime'), value: detail.overtime }] : []),
  ] : []

  const deductions = detail ? [
    { label: 'BPJS Kesehatan', value: detail.bpjsKesehatanEmployee },
    { label: 'BPJS Ketenagakerjaan (JHT)', value: detail.jhtEmployee },
    { label: 'BPJS Ketenagakerjaan (JP)', value: detail.jpEmployee },
    { label: 'PPh 21', value: detail.pph21 },
    ...(detail.otherDeduction ? [{ label: t('Potongan Lain','Other Deduction'), value: detail.otherDeduction }] : []),
  ].filter(d => d.value != null) : []

  const totalEarnings   = earnings.reduce((s, e) => s + (e.value || 0), 0)
  const totalDeductions = deductions.reduce((s, d) => s + (d.value || 0), 0)

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Payslip</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Slip gaji bulanan kamu.','Your monthly payslip.')}</p>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Period list */}
        <div className='bg-white rounded-xl p-6 shadow-sm'>
          <h2 className='text-sm font-bold text-gray-700 mb-4'><Icon e='📅' size={14} className='inline align-[-2px]' /> {t('Periode','Period')}</h2>
          <div className='flex flex-col gap-2'>
            {mine.length ? mine.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                aria-label={`${t('Pilih periode','Select period')} ${p.period}`}
                className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition ${
                  (selected === p.id || (!selected && p.id === mine[0]?.id))
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p.period}
              </button>
            )) : (
              <p className='text-sm text-gray-400'>{t('Belum ada slip gaji.','No payslip available.')}</p>
            )}
          </div>
        </div>

        {/* Slip detail */}
        {detail && (
          <div className='lg:col-span-2 bg-white rounded-xl p-6 shadow-sm'>
            <div className='flex justify-between items-start mb-6'>
              <div>
                <h2 className='text-lg font-bold text-gray-800'>{detail.name}</h2>
                <p className='text-sm text-gray-500'>{t('Periode','Period')}: {detail.period}</p>
                {detail.ptkpStatus && (
                  <p className='text-xs text-gray-400 mt-0.5'>PTKP: {detail.ptkpStatus} · NPWP: {detail.npwp ? t('Ada','Yes') : t('Tidak ada','No')}</p>
                )}
              </div>
              <span className='text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700'>
                {t('Dipublish','Published')}
              </span>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full text-sm mb-4'>
                <thead>
                  <tr className='bg-gray-50'>
                    <th scope='col' className='text-left px-4 py-2.5 text-xs font-semibold text-gray-500'>{t('Pendapatan','Earnings')}</th>
                    <th scope='col' className='text-right px-4 py-2.5 text-xs font-semibold text-gray-500'>{t('Jumlah','Amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((r, i) => (
                    <tr key={i} className='border-t border-gray-100'>
                      <td className='px-4 py-2.5 text-gray-700'>{r.label}</td>
                      <td className='px-4 py-2.5 text-right font-medium text-gray-800'>{formatRp(r.value)}</td>
                    </tr>
                  ))}
                  <tr className='border-t border-gray-200'>
                    <td className='px-4 py-2 font-semibold text-gray-700'>{t('Total Pendapatan','Total Earnings')}</td>
                    <td className='px-4 py-2 text-right font-semibold text-gray-800'>{formatRp(totalEarnings)}</td>
                  </tr>
                </tbody>
              </table>

              <table className='w-full text-sm mb-6'>
                <thead>
                  <tr className='bg-gray-50'>
                    <th scope='col' className='text-left px-4 py-2.5 text-xs font-semibold text-gray-500'>{t('Potongan','Deductions')}</th>
                    <th scope='col' className='text-right px-4 py-2.5 text-xs font-semibold text-gray-500'>{t('Jumlah','Amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((r, i) => (
                    <tr key={i} className='border-t border-gray-100'>
                      <td className='px-4 py-2.5 text-gray-700'>{r.label}</td>
                      <td className='px-4 py-2.5 text-right font-medium text-red-600'>- {formatRp(r.value)}</td>
                    </tr>
                  ))}
                  <tr className='border-t border-gray-200'>
                    <td className='px-4 py-2 font-semibold text-gray-700'>{t('Total Potongan','Total Deductions')}</td>
                    <td className='px-4 py-2 text-right font-semibold text-red-600'>- {formatRp(totalDeductions)}</td>
                  </tr>
                  <tr className='border-t-2 border-gray-200'>
                    <td className='px-4 py-3 font-bold text-gray-800'>{t('Total Take-Home','Total Take-Home')}</td>
                    <td className='px-4 py-3 text-right font-bold text-red-600 text-base'>
                      {formatRp(detail.net)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
