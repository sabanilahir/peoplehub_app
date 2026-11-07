'use client'

export default function ProtectedLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center py-16 animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center mb-4">
        {/* Outer pulsating ring */}
        <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        
        {/* Inner logo badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/logos/san-logo.png"
            alt="Loading..."
            className="w-8 h-8 object-contain rounded drop-shadow-sm opacity-90 animate-pulse"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm font-semibold text-gray-700 tracking-tight">
          Memuat halaman...
        </p>
        <p className="text-xs text-gray-400">
          Mohon tunggu sebentar, data sedang disiapkan.
        </p>
      </div>

      {/* Subtle skeleton bar preview */}
      <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-5">
        <div className="w-full h-full bg-gradient-to-r from-[#D4AF37] via-[#039299] to-[#D4AF37] animate-[shimmer_1.5s_infinite] -translate-x-full" />
      </div>
    </div>
  )
}

