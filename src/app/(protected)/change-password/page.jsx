'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { PageHeader, SectionCard, FormField, Input, ActionButton } from '@/components/ui'
import Icon from '@/components/ui/Icon'

export default function ChangePasswordPage() {
  const { currentUser } = useAuthStore()
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setMsg(null)

    if (!oldPass || !newPass || !confirmPass) {
      setMsg({ type: 'error', text: 'Semua kolom wajib diisi.' })
      return
    }

    if (newPass.length < 6) {
      setMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' })
      return
    }

    if (newPass !== confirmPass) {
      setMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' })
      return
    }

    if (currentUser?.password && currentUser.password !== oldPass) {
      setMsg({ type: 'error', text: 'Password lama salah.' })
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
      })

      if (res.ok) {
        useAuthStore.setState({
          currentUser: { ...currentUser, password: newPass }
        })
        try {
          const raw = localStorage.getItem('hcm-user')
          if (raw) {
            const u = JSON.parse(raw)
            u.password = newPass
            localStorage.setItem('hcm-user', JSON.stringify(u))
          }
        } catch (_) {}

        setMsg({ type: 'success', text: 'Password berhasil diubah!' })
        setOldPass('')
        setNewPass('')
        setConfirmPass('')
      } else {
        setMsg({ type: 'error', text: 'Gagal memperbarui password di server.' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Terjadi kesalahan: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='max-w-xl mx-auto'>
      <PageHeader
        icon='🔒'
        title='Ganti Password'
        subtitle='Perbarui password akun Anda demi keamanan.'
      />

      <SectionCard icon='🔑' title='Keamanan Akun' className='mt-6'>
        {msg && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
            msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-800'
          }`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className='text-gray-400 hover:text-gray-600 font-bold ml-4'>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <FormField label='Password Lama *'>
            <Input
              type='password'
              value={oldPass}
              onChange={e => setOldPass(e.target.value)}
              placeholder='Masukkan password lama'
            />
          </FormField>

          <FormField label='Password Baru *'>
            <Input
              type='password'
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder='Minimal 6 karakter'
            />
          </FormField>

          <FormField label='Konfirmasi Password Baru *'>
            <Input
              type='password'
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder='Ulangi password baru'
            />
          </FormField>

          <div className='pt-2 flex justify-end gap-3'>
            <ActionButton
              type='submit'
              disabled={loading}
              tone='primary'
              icon={loading ? '⌛' : '💾'}
            >
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}

