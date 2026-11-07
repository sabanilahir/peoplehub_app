'use client'
import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import FixedDurationVideo from '@/components/ui/FixedDurationVideo'
import { useAuthStore } from '@/store/authStore'
import { useEmergencySosStore, SOS_CATEGORIES, SOS_MAX_VIDEO_SECONDS, SOS_MAX_BYTES } from '@/store/emergencySosStore'
import { useEmergencySosLimitStore } from '@/store/emergencySosLimitStore'
import { useT } from '@/store/languageStore'

const CATEGORY_ICON = { 'Kebakaran': '🔥', 'Kecelakaan Kerja': '⚠️', 'Medis': '🚑', 'Keamanan': '🛡️', 'Lainnya': '🆘' }

const readAsDataURL = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

const pickMimeType = () => {
  const candidates = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return candidates.find(c => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) || ''
}

export default function EmergencySosButton() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { alerts, addAlert } = useEmergencySosStore()
  const { enabled: limitEnabled, maxPerWindow, windowMinutes } = useEmergencySosLimitStore()

  const isLimitReached = () => {
    if (!limitEnabled) return false
    const cutoff = Date.now() - windowMinutes * 60 * 1000
    return alerts.filter(a => new Date(a.createdAt).getTime() >= cutoff).length >= maxPerWindow
  }

  const [open, setOpen] = useState(false)
  // step: 'category' | 'record' | 'preview' | 'sending' | 'sent' | 'limited'
  const [step, setStep] = useState('category')
  const [category, setCategory] = useState(null)
  const [recording, setRecording] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(SOS_MAX_VIDEO_SECONDS)
  const [cameraError, setCameraError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  // 'environment' (back camera) by default — an SOS is meant to film the
  // actual incident (fire, accident), not the reporter's face.
  const [facingMode, setFacingMode] = useState('environment')
  // Mirrors streamRef.current into state — the ref alone doesn't trigger a
  // re-render when it's set inside the async getUserMedia callback, which
  // left the "Mulai Rekam" button permanently disabled even once the camera
  // was live (its `disabled` check read a ref value React never re-rendered for).
  const [streamReady, setStreamReady] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const blobRef = useRef(null)
  const timerRef = useRef(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(tr => tr.stop())
    streamRef.current = null
    setStreamReady(false)
  }
  const clearTimer = () => { clearInterval(timerRef.current); timerRef.current = null }

  const reset = () => {
    stopStream()
    clearTimer()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    chunksRef.current = []
    blobRef.current = null
    setPreviewUrl(null)
    setRecording(false)
    setSecondsLeft(SOS_MAX_VIDEO_SECONDS)
    setCameraError(null)
    setCategory(null)
    setFacingMode('environment')
    setStep('category')
  }

  const close = () => { reset(); setOpen(false) }

  useEffect(() => () => { stopStream(); clearTimer() }, []) // release camera if unmounted mid-recording

  const openCamera = async (facing) => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true })
      streamRef.current = stream
      setStreamReady(true)
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play?.() }
    } catch {
      setCameraError(t(
        'Tidak bisa mengakses kamera/mikrofon. Anda tetap bisa mengirim SOS tanpa video.',
        "Can't access camera/microphone. You can still send the SOS without video.",
      ))
    }
  }

  const pickCategory = async (c) => {
    setCategory(c)
    setStep('record')
    await openCamera(facingMode)
  }

  const switchCamera = async () => {
    stopStream()
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    await openCamera(next)
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      // Strip codec params (e.g. "video/webm;codecs=vp8,opus") down to the
      // base type. That comma inside "vp8,opus" corrupts the clip once it's
      // converted to a data: URL for storage — a data URL splits on the
      // FIRST comma, so everything from "opus" onward gets read as literal
      // payload text instead of being recognized as the base64 data, silently
      // mangling the video (plays back as a black, unseekable frame).
      const blob = new Blob(chunksRef.current, { type: (mimeType || 'video/webm').split(';')[0] })
      blobRef.current = blob
      stopStream()
      setPreviewUrl(URL.createObjectURL(blob))
      setStep('preview')
    }
    recorderRef.current = recorder
    recorder.start()
    setRecording(true)
    setSecondsLeft(SOS_MAX_VIDEO_SECONDS)
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { stopRecording(); return 0 }
        return s - 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    clearTimer()
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    setRecording(false)
  }

  const retryRecording = () => {
    clearTimer()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    blobRef.current = null
    setStep('record')
    pickCategory(category)
  }

  const submit = async (withVideo) => {
    // Re-check right before writing — someone else may have filled the last
    // slot while this user was picking a category / recording.
    if (isLimitReached()) { stopStream(); setStep('limited'); return }
    setStep('sending')
    let videoDataUrl = null, videoType = null, videoSize = null
    if (withVideo && blobRef.current && blobRef.current.size <= SOS_MAX_BYTES) {
      videoDataUrl = await readAsDataURL(blobRef.current)
      videoType = blobRef.current.type
      videoSize = blobRef.current.size
    }
    addAlert({
      employeeId: currentUser?.id, employeeName: currentUser?.name || '',
      category, videoDataUrl, videoType, videoSize,
      createdAt: new Date().toISOString(),
    })
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setStep('sent')
  }

  return (
    <>
      <button onClick={() => { setOpen(true); if (isLimitReached()) setStep('limited') }}
        title={t('Emergency SOS', 'Emergency SOS')}
        className='flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 hover:border-red-300 animate-pulse sm:px-3'>
        <span className='text-sm'>🆘</span>
        <span className='hidden md:inline'>SOS</span>
      </button>

      {open && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4' onClick={(step === 'sent' || step === 'limited') ? close : undefined}>
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>

            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>🆘 {t('Emergency SOS', 'Emergency SOS')}</h3>
              {step !== 'sending' && (
                <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
              )}
            </div>

            {step === 'category' && (
              <div>
                <p className='mb-3 text-sm text-gray-500'>
                  {t('Pilih jenis kedaruratan yang Anda alami:', 'Select the type of emergency you are reporting:')}
                </p>
                <div className='grid grid-cols-2 gap-2'>
                  {SOS_CATEGORIES.map(c => (
                    <button key={c} onClick={() => pickCategory(c)}
                      className='flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50'>
                      <span className='text-lg'>{CATEGORY_ICON[c]}</span>{c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'record' && (
              <div>
                <p className='mb-3 text-sm text-gray-500'>
                  {CATEGORY_ICON[category]} <b>{category}</b> — {t(`Rekam video maks. ${SOS_MAX_VIDEO_SECONDS} detik sebagai bukti.`, `Record up to ${SOS_MAX_VIDEO_SECONDS}s of video as evidence.`)}
                </p>
                {cameraError ? (
                  <div className='rounded-xl bg-amber-50 p-4 text-sm text-amber-800'>
                    {cameraError}
                  </div>
                ) : (
                  <div className='relative overflow-hidden rounded-xl bg-black'>
                    <video ref={videoRef} muted playsInline
                      style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                      className='aspect-video w-full object-cover' />
                    {!recording && (
                      <button onClick={switchCamera} disabled={!streamReady}
                        title={t('Ganti Kamera', 'Switch Camera')}
                        className='absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 disabled:opacity-40'>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                        </svg>
                      </button>
                    )}
                    {!recording && (
                      <span className='absolute left-11 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white'>
                        {facingMode === 'environment' ? t('Belakang', 'Back') : t('Depan', 'Front')}
                      </span>
                    )}
                    {recording && (
                      <span className='absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white'>
                        <span className='h-2 w-2 animate-pulse rounded-full bg-red-500' /> {secondsLeft}s
                      </span>
                    )}
                  </div>
                )}
                <div className='mt-4 flex justify-end gap-2'>
                  {cameraError ? (
                    <button onClick={() => submit(false)}
                      className='rounded-xl px-4 py-2.5 text-sm font-semibold text-white' style={{ background: 'linear-gradient(135deg,#b91c1c,#ef4444)' }}>
                      {t('Kirim SOS Tanpa Video', 'Send SOS without video')}
                    </button>
                  ) : !recording ? (
                    <button onClick={startRecording} disabled={!streamReady}
                      className='rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40' style={{ background: 'linear-gradient(135deg,#b91c1c,#ef4444)' }}>
                      ⏺ {t('Mulai Rekam', 'Start Recording')}
                    </button>
                  ) : (
                    <button onClick={stopRecording}
                      className='rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white'>
                      ⏹ {t('Stop', 'Stop')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div>
                <p className='mb-3 text-sm text-gray-500'>
                  {CATEGORY_ICON[category]} <b>{category}</b> — {t('Tinjau video sebelum mengirim.', 'Review the clip before sending.')}
                </p>
                <FixedDurationVideo src={previewUrl} controls className='aspect-video w-full rounded-xl bg-black' />
                <div className='mt-4 flex justify-end gap-2'>
                  <button onClick={retryRecording}
                    className='rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50'>
                    {t('Rekam Ulang', 'Retake')}
                  </button>
                  <button onClick={() => submit(true)}
                    className='rounded-xl px-4 py-2.5 text-sm font-semibold text-white' style={{ background: 'linear-gradient(135deg,#b91c1c,#ef4444)' }}>
                    {t('Kirim SOS', 'Send SOS')}
                  </button>
                </div>
              </div>
            )}

            {step === 'sending' && (
              <div className='py-10 text-center text-sm text-gray-500'>{t('Mengirim SOS…', 'Sending SOS…')}</div>
            )}

            {step === 'limited' && (
              <div className='py-6 text-center'>
                <p className='text-4xl'>🙏</p>
                <h4 className='mt-3 text-lg font-bold text-gray-800'>{t('SOS Sudah Terwakilkan', 'Enough SOS Already Reported')}</h4>
                <p className='mt-1 text-sm text-gray-500'>
                  {t(
                    `Sudah ada ${maxPerWindow} laporan SOS dalam ${windowMinutes} menit terakhir, jadi laporan Anda tidak perlu dikirim lagi. Kalau situasi Anda berbeda atau butuh bantuan langsung, hubungi HR/Keamanan.`,
                    `There have already been ${maxPerWindow} SOS reports in the last ${windowMinutes} minutes, so yours doesn't need to be sent again. If your situation is different or you need direct help, contact HR/Security.`,
                  )}
                </p>
                <button onClick={close}
                  className='mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white'
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  {t('Tutup', 'Close')}
                </button>
              </div>
            )}

            {step === 'sent' && (
              <div className='py-6 text-center'>
                <p className='text-4xl'>✅</p>
                <h4 className='mt-3 text-lg font-bold text-gray-800'>{t('SOS Terkirim', 'SOS Sent')}</h4>
                <p className='mt-1 text-sm text-gray-500'>
                  {t('Administrator dan atasan Anda telah diberi tahu.', 'Administrators and your manager have been notified.')}
                </p>
                <button onClick={close}
                  className='mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white'
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  {t('Tutup', 'Close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
