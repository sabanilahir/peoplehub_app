import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ─── Leaderboard Settings ─────────────────────────────────────────────────────
// Konfigurasi leaderboard per-company (multi-company). Ada satu Global Default
// yang berlaku untuk semua company; tiap company boleh meng-override (mis. ada
// yang reset bulanan, kuartalan, atau tahunan). Benchmark fitur gamifikasi LMS
// terkenal (Docebo, TalentLMS, 360Learning, Cornerstone, Moodle Level Up!).
// Tersimpan di Postgres (AppState) via dbStorage → sync antar device.

export const RESET_PERIODS = [
  { value:'never',     label:'Tidak Pernah',  desc:'Peringkat akumulatif sepanjang waktu (all-time).' },
  { value:'weekly',    label:'Mingguan',      desc:'Reset tiap awal minggu.' },
  { value:'monthly',   label:'Bulanan',       desc:'Reset tiap awal bulan.' },
  { value:'quarterly', label:'Kuartalan',     desc:'Reset tiap awal kuartal (3 bulan).' },
  { value:'yearly',    label:'Tahunan',       desc:'Reset tiap awal periode tahunan.' },
]
export const RANKING_BASIS   = ['Period Points', 'All-Time Points']
export const SEGMENT_SCOPES  = ['Company', 'Department', 'Location', 'Grade', 'Global (All Company)']
export const VISIBILITY_MODES = ['Named', 'Anonymized', 'Opt-in Only']
export const TIE_BREAKERS = ['Earliest to reach', 'Most recent activity', 'More courses completed']
export const REFRESH_MODES = ['Real-time', 'Hourly', 'Daily']
export const ANCHOR_MODES  = ['Calendar', 'Fiscal Year']
export const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

// Konfigurasi default (dipakai company yang belum override).
export const DEFAULT_CONFIG = {
  enabled:        true,
  resetPeriod:    'monthly',
  anchor:         'Calendar',
  fiscalStart:    1,               // bulan mulai fiscal year (1=Jan) bila anchor=Fiscal
  rankingBasis:   'Period Points',
  scope:          'Company',
  topN:           10,
  visibility:     'Named',
  showCurrentUser:true,            // selalu tampilkan rank user sendiri
  allowOptOut:    true,            // user boleh keluar dari leaderboard
  minPoints:      0,               // ambang minimum poin agar muncul
  excludeManagers:false,           // kecualikan manager/admin dari ranking
  tieBreaker:     'Earliest to reach',
  showBadges:     true,
  showLevels:     true,
  refresh:        'Real-time',
  archiveOnReset: true,            // snapshot & simpan histori saat reset
  rewardTopN:     3,               // beri reward untuk juara periode
  rewardBadge:    'Season Champion',
  rewardPoints:   100,
  pointDecay:     false,           // poin lama meluruh (advanced)
  decayDays:      90,
}

export const useLeaderboardSettingStore = create(
  persist(
    (set, get) => ({
      global:    { ...DEFAULT_CONFIG },
      overrides: {},   // { [companyId]: config }

      setGlobal:   (patch) => set(s => ({ global: { ...s.global, ...patch } })),
      resetGlobal: ()      => set({ global: { ...DEFAULT_CONFIG } }),

      // Simpan / perbarui override sebuah company (full config).
      setCompany:  (companyId, config) =>
        set(s => ({ overrides: { ...s.overrides, [companyId]: config } })),
      // Hapus override → company kembali memakai Global Default.
      clearCompany: (companyId) =>
        set(s => {
          const next = { ...s.overrides }; delete next[companyId]; return { overrides: next }
        }),

      hasOverride: (companyId) => get().overrides[companyId] != null,
      // Konfigurasi efektif = override company bila ada, jika tidak Global Default.
      effectiveConfig: (companyId) => {
        const s = get()
        return s.overrides[companyId] ? { ...s.global, ...s.overrides[companyId] } : { ...s.global }
      },
    }),
    { name: 'hcm-leaderboard-setting-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
