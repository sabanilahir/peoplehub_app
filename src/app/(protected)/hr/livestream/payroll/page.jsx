'use client'

import { useState, useEffect } from 'react'
import {
  PageHeader,
  StatCard,
  SectionCard,
} from '@/components/ui'
import {
  Coins,
  Calendar,
  Clock,
  Users,
  Award,
  FileText,
  Printer,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Settings,
  X,
} from 'lucide-react'

export default function LivestreamPayrollPage() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [month, setMonth] = useState(defaultMonth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Slip modal
  const [selectedSlip, setSelectedSlip] = useState(null)

  // Rate settings modal
  const [showRateModal, setShowRateModal] = useState(false)
  const [tier1Rate, setTier1Rate] = useState(60000)
  const [tier2Rate, setTier2Rate] = useState(65000)
  const [tier3Rate, setTier3Rate] = useState(70000)
  const [underRate, setUnderRate] = useState(50000)
  const [savingRate, setSavingRate] = useState(false)

  const fetchPayroll = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/livestream/payroll?month=${month}`)
      const resJson = await res.json()
      if (resJson.success) {
        setData(resJson)
        if (resJson.rateConfig) {
          const t = resJson.rateConfig.tiers || []
          setTier1Rate(t[0]?.ratePerHour || 60000)
          setTier2Rate(t[1]?.ratePerHour || 65000)
          setTier3Rate(t[2]?.ratePerHour || 70000)
          setUnderRate(resJson.rateConfig.underMinRate || 50000)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayroll()
  }, [month])

  // Save updated rates
  const handleSaveRates = async () => {
    try {
      setSavingRate(true)
      const res = await fetch('/api/livestream/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: [
            { minHours: 60, maxHours: 90, ratePerHour: Number(tier1Rate) },
            { minHours: 91, maxHours: 120, ratePerHour: Number(tier2Rate) },
            { minHours: 121, maxHours: 150, ratePerHour: Number(tier3Rate) },
          ],
          underMinRate: Number(underRate),
        }),
      })
      const resJson = await res.json()
      if (resJson.success) {
        setShowRateModal(false)
        fetchPayroll()
      } else {
        alert(resJson.error || 'Gagal menyimpan konfigurasi tarif')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingRate(false)
    }
  }

  const grandTotals = data?.grandTotals || {
    totalHours: 0,
    totalGross: 0,
    totalPenalty: 0,
    totalNet: 0,
    activeHostsCount: 0,
  }

  const summary = data?.summary || []

  return (
    <div className='space-y-6 pb-12'>
      {/* Page Header */}
      <PageHeader
        icon='💰'
        title='Payroll & Honor Host Live Streaming'
        subtitle='Kompensasi berbasis tarif berjenjang (hourly tiering rate) dari akumulasi durasi tayang bulanan.'
        actions={
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setShowRateModal(true)}
              className='inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm'
            >
              <Settings className='w-4 h-4 text-gray-500' />
              Konfigurasi Tarif Tiering
            </button>
            <div className='flex items-center gap-2 bg-white rounded-xl border border-gray-300 px-3 py-1.5 shadow-sm'>
              <Calendar className='w-4 h-4 text-teal-600' />
              <input
                type='month'
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className='text-xs font-bold text-gray-900 border-none outline-none'
              />
            </div>
          </div>
        }
      />

      {/* Grand Totals */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <StatCard
          icon='⏱️'
          label='Total Jam Siaran Tim'
          value={`${grandTotals.totalHours} Jam`}
          hint={`Dari ${grandTotals.activeHostsCount} Host aktif`}
          tone='blue'
        />
        <StatCard
          icon='💵'
          label='Total Honor Kotor'
          value={`Rp ${grandTotals.totalGross.toLocaleString()}`}
          hint='Sebelum potongan denda'
          tone='teal'
        />
        <StatCard
          icon='⚠️'
          label='Potongan Denda Telat'
          value={`Rp ${grandTotals.totalPenalty.toLocaleString()}`}
          hint='Rp 10.000 / 1-10 mnt telat'
          tone='red'
        />
        <StatCard
          icon='🏦'
          label='Total Honor Bersih (Siap Transfer)'
          value={`Rp ${grandTotals.totalNet.toLocaleString()}`}
          hint='Take-Home Pay semua host'
          tone='green'
        />
      </div>

      {/* Tier Reference Banner */}
      <div className='rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 p-4 shadow-sm'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5'>
            <span className='flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs'>
              %
            </span>
            <div>
              <div className='text-xs font-bold uppercase tracking-wider text-teal-900'>
                Skema Tiering Tarif Jam Tayang Bulan Ini:
              </div>
              <div className='text-xs text-teal-700'>
                Semakin banyak jam tayang dalam 1 bulan, seluruh jam siaran host berhak mendapatkan tarif yang lebih tinggi!
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <span className='inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-bold text-gray-800 border border-teal-200 shadow-sm'>
              Tier 1 (60-90 Jam): <strong className='text-teal-700'>Rp {tier1Rate.toLocaleString()}</strong>
            </span>
            <span className='inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-bold text-gray-800 border border-teal-200 shadow-sm'>
              Tier 2 (91-120 Jam): <strong className='text-teal-700'>Rp {tier2Rate.toLocaleString()}</strong>
            </span>
            <span className='inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-bold text-gray-800 border border-teal-200 shadow-sm'>
              Tier 3 (121-150 Jam): <strong className='text-teal-700'>Rp {tier3Rate.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <SectionCard
        icon='👥'
        title={`Rekapitulasi Honor Host Livestreaming (${month})`}
        subtitle='Daftar akumulasi jam siaran, tingkatan tier yang dicapai, dan nominal honor bersih siap bayar.'
      >
        {loading ? (
          <div className='py-12 text-center text-sm text-gray-500'>Menghitung data payroll livestream...</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='border-b border-gray-200 bg-gray-50/75 text-xs uppercase tracking-wider text-gray-600'>
                <tr>
                  <th className='py-3.5 px-4 font-semibold'>Host Livestream</th>
                  <th className='py-3.5 px-4 font-semibold'>Total Sesi</th>
                  <th className='py-3.5 px-4 font-semibold'>Total Jam Siaran</th>
                  <th className='py-3.5 px-4 font-semibold'>Tier Yang Diraih</th>
                  <th className='py-3.5 px-4 font-semibold'>Tarif / Jam</th>
                  <th className='py-3.5 px-4 font-semibold'>Honor Kotor</th>
                  <th className='py-3.5 px-4 font-semibold'>Denda Telat</th>
                  <th className='py-3.5 px-4 font-semibold'>Honor Bersih</th>
                  <th className='py-3.5 px-4 text-right font-semibold'>Slip</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {summary.map((row) => {
                  let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200'
                  if (row.tierLevel === 1) {
                    badgeClass = 'bg-teal-50 text-teal-800 border-teal-300 font-bold'
                  } else if (row.tierLevel === 2) {
                    badgeClass = 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                  } else if (row.tierLevel >= 3) {
                    badgeClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                  }

                  return (
                    <tr key={row.hostId} className='hover:bg-gray-50/80 transition-colors'>
                      <td className='py-3.5 px-4'>
                        <div className='flex items-center gap-2.5'>
                          <div className='flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-cyan-600 text-xs font-bold text-white shadow-sm'>
                            {row.hostName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className='font-bold text-gray-900'>{row.hostName}</div>
                            <div className='text-xs text-gray-500'>ID: {row.hostId} • {row.dept}</div>
                          </div>
                        </div>
                      </td>
                      <td className='py-3.5 px-4 font-mono font-medium text-gray-700'>
                        {row.totalSessions} Sesi
                      </td>
                      <td className='py-3.5 px-4 font-mono font-bold text-gray-900 text-base'>
                        {row.totalHours} <span className='text-xs font-normal text-gray-500'>Jam</span>
                      </td>
                      <td className='py-3.5 px-4'>
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full border ${badgeClass}`}>
                          {row.tierName}
                        </span>
                      </td>
                      <td className='py-3.5 px-4 font-mono font-bold text-teal-800'>
                        Rp {row.ratePerHour.toLocaleString()}
                      </td>
                      <td className='py-3.5 px-4 font-mono text-gray-800'>
                        Rp {row.grossHonor.toLocaleString()}
                      </td>
                      <td className='py-3.5 px-4 font-mono'>
                        {row.totalPenalty > 0 ? (
                          <span className='font-bold text-red-600'>
                            -Rp {row.totalPenalty.toLocaleString()}
                          </span>
                        ) : (
                          <span className='text-gray-400'>Rp 0</span>
                        )}
                      </td>
                      <td className='py-3.5 px-4 font-mono font-extrabold text-emerald-700 text-base'>
                        Rp {row.netHonor.toLocaleString()}
                      </td>
                      <td className='py-3.5 px-4 text-right'>
                        <button
                          onClick={() => setSelectedSlip(row)}
                          className='inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition'
                        >
                          <FileText className='w-3.5 h-3.5' />
                          Lihat Slip
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Slip Honor Modal */}
      {selectedSlip && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4'>
            {/* Header */}
            <div className='flex items-start justify-between border-b border-gray-100 pb-3'>
              <div>
                <span className='text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full'>
                  Slip Kompensasi Host Livestreaming
                </span>
                <h3 className='text-xl font-black text-gray-900 mt-1'>
                  {selectedSlip.hostName}
                </h3>
                <p className='text-xs text-gray-500'>
                  Periode: {month} • Departemen {selectedSlip.dept}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlip(null)}
                className='text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Slip Body Details */}
            <div className='rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3 text-sm'>
              <div className='flex justify-between py-1 border-b border-gray-200/60'>
                <span className='text-gray-600'>Total Sesi Siaran:</span>
                <span className='font-bold text-gray-900'>{selectedSlip.totalSessions} Sesi</span>
              </div>
              <div className='flex justify-between py-1 border-b border-gray-200/60'>
                <span className='text-gray-600'>Total Durasi Siaran:</span>
                <span className='font-mono font-bold text-gray-900'>{selectedSlip.totalHours} Jam ({selectedSlip.totalMinutes} menit)</span>
              </div>
              <div className='flex justify-between py-1 border-b border-gray-200/60'>
                <span className='text-gray-600'>Pencapaian Tier:</span>
                <span className='font-semibold text-teal-800'>{selectedSlip.tierName}</span>
              </div>
              <div className='flex justify-between py-1 border-b border-gray-200/60'>
                <span className='text-gray-600'>Tarif Per Jam:</span>
                <span className='font-mono font-bold text-gray-900'>Rp {selectedSlip.ratePerHour.toLocaleString()} / Jam</span>
              </div>
              <div className='flex justify-between py-1 border-b border-gray-200/60'>
                <span className='text-gray-600'>Honor Kotor ({selectedSlip.totalHours} x Rp {selectedSlip.ratePerHour.toLocaleString()}):</span>
                <span className='font-mono font-bold text-gray-900'>Rp {selectedSlip.grossHonor.toLocaleString()}</span>
              </div>
              <div className='flex justify-between py-1 border-b border-gray-200/60 text-red-600'>
                <span>Potongan Denda Telat ({selectedSlip.totalLateMinutes} mnt):</span>
                <span className='font-mono font-bold'>-Rp {selectedSlip.totalPenalty.toLocaleString()}</span>
              </div>
              <div className='flex justify-between pt-2 text-base font-black'>
                <span className='text-gray-900'>Total Honor Bersih:</span>
                <span className='font-mono text-emerald-700 text-lg'>Rp {selectedSlip.netHonor.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className='flex items-center justify-end gap-2 pt-2'>
              <button
                onClick={() => window.print()}
                className='inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
              >
                <Printer className='w-4 h-4' />
                Cetak Slip
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                className='rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700'
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Config Modal */}
      {showRateModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4'>
            <div className='flex items-center justify-between border-b border-gray-100 pb-3'>
              <h3 className='text-base font-bold text-gray-900'>Konfigurasi Tarif Tiering Livestream</h3>
              <button onClick={() => setShowRateModal(false)} className='text-gray-400'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='space-y-3 text-xs'>
              <div>
                <label className='font-semibold text-gray-700'>Tarif Dasar (&lt; 60 Jam):</label>
                <input
                  type='number'
                  value={underRate}
                  onChange={(e) => setUnderRate(e.target.value)}
                  className='mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono text-sm font-semibold'
                />
              </div>

              <div>
                <label className='font-semibold text-gray-700'>Tier 1 (60 s/d 90 Jam):</label>
                <input
                  type='number'
                  value={tier1Rate}
                  onChange={(e) => setTier1Rate(e.target.value)}
                  className='mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono text-sm font-semibold'
                />
              </div>

              <div>
                <label className='font-semibold text-gray-700'>Tier 2 (91 s/d 120 Jam):</label>
                <input
                  type='number'
                  value={tier2Rate}
                  onChange={(e) => setTier2Rate(e.target.value)}
                  className='mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono text-sm font-semibold'
                />
              </div>

              <div>
                <label className='font-semibold text-gray-700'>Tier 3 (121 s/d 150 Jam):</label>
                <input
                  type='number'
                  value={tier3Rate}
                  onChange={(e) => setTier3Rate(e.target.value)}
                  className='mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono text-sm font-semibold'
                />
              </div>
            </div>

            <div className='flex items-center justify-end gap-2 border-t border-gray-100 pt-3'>
              <button
                onClick={() => setShowRateModal(false)}
                className='rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700'
              >
                Batal
              </button>
              <button
                disabled={savingRate}
                onClick={handleSaveRates}
                className='rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50'
              >
                {savingRate ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

