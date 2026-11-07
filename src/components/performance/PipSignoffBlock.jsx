'use client'
import Icon from '@/components/ui/Icon'
import { useT } from '@/store/languageStore'

/*
 * Final tripartite agreement ("Disepakati Oleh") for a PIP: Employee, Direct
 * Manager, and HRBP each sign. Each party signs from their own portal.
 *
 * Props:
 *  - pip:     the PIP record (reads signoffs + fallback names/positions)
 *  - canSign: which column THIS viewer may sign ('employee' | 'manager' | 'hrbp' | null)
 *  - onSign:  (party) => void, invoked when the viewer signs their column
 */
export default function PipSignoffBlock({ pip, canSign = null, onSign }) {
  const t = useT()
  const s = pip.signoffs ?? { employee: null, manager: null, hrbp: null }

  const cols = [
    { key: 'employee', name: pip.employeeName,  position: pip.employeePosition || t('Karyawan', 'Employee'),        placeholderName: t('[Nama Karyawan]', '[Employee Name]'),         placeholderPos: t('[Posisi Karyawan]', '[Employee Position]') },
    { key: 'manager',  name: pip.managerName,   position: pip.managerPosition || t('Atasan Langsung', 'Direct Manager'), placeholderName: t('[Nama Atasan Langsung]', '[Direct Manager Name]'), placeholderPos: t('[Posisi Atasan Langsung]', '[Direct Manager Position]') },
    { key: 'hrbp',     name: s.hrbp?.name,      position: s.hrbp?.position || 'HRBP',                                placeholderName: t('[Nama HRBP]', '[HRBP Name]'),                 placeholderPos: t('[Posisi HRBP]', '[HRBP Position]') },
  ]

  const allSigned = s.employee && s.manager && s.hrbp

  return (
    <div className='border border-gray-200 rounded-xl p-5'>
      <div className='flex items-center justify-between mb-4'>
        <p className='text-sm font-bold text-gray-700'>{t('Disepakati Oleh,', 'Agreed By,')}</p>
        {allSigned && (
          <span className='text-xs font-semibold text-green-600'><Icon name='check' size={14} className='inline align-[-2px]' /> {t('Persetujuan lengkap', 'Fully agreed')}</span>
        )}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {cols.map(c => {
          const signed = s[c.key]
          return (
            <div key={c.key} className='rounded-xl border border-gray-100 bg-gray-50/60 p-4 flex flex-col'>
              {/* signature space */}
              <div className='h-14 flex items-end justify-center'>
                {signed ? (
                  <span className='text-green-600 text-sm font-semibold pb-1'>
                    <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Ditandatangani', 'Signed')}
                  </span>
                ) : canSign === c.key ? (
                  <button onClick={() => onSign?.(c.key)}
                    className='px-4 py-1.5 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    <Icon name='edit' size={13} className='inline align-[-2px]' /> {t('Tanda Tangani', 'Sign')}
                  </button>
                ) : (
                  <span className='text-[11px] text-gray-300 italic pb-1'>{t('menunggu', 'awaiting')}</span>
                )}
              </div>
              <div className='border-t border-gray-300 pt-2 text-center'>
                <p className={`text-sm font-bold ${signed ? 'text-gray-800' : 'text-gray-400 italic'}`}>{signed?.name || c.name || c.placeholderName}</p>
                <p className={`text-xs ${signed ? 'text-gray-500' : 'text-gray-400 italic'}`}>{signed?.position || c.position || c.placeholderPos}</p>
                {signed?.at && <p className='text-[10px] text-gray-400 mt-1'>{new Date(signed.at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
