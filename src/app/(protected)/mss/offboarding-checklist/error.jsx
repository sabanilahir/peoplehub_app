'use client'
import Icon from '@/components/ui/Icon'
export default function Error({ error, reset }) {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-6'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center'>
        <div className='text-4xl mb-3'><Icon e='⚠️' size={15} /></div>
        <h1 className='text-lg font-bold text-gray-900'>Terjadi kesalahan</h1>
        <p className='text-sm text-gray-500 mt-2'>
          Halaman offboarding checklist tidak dapat dimuat. Coba muat ulang.
        </p>
        {error?.message && <p className='mt-3 text-xs text-gray-400 break-words'>{String(error.message)}</p>}
        <button onClick={() => reset()}
          className='mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700'>
          Muat ulang
        </button>
      </div>
    </div>
  )
}
