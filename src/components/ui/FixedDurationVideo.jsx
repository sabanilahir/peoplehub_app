'use client'
import { useRef } from 'react'

// MediaRecorder-produced WebM clips (Emergency SOS, etc.) report duration as
// Infinity/NaN until the element is forced to seek once — until then Chrome
// renders a permanently black frame and play/seek controls do nothing, even
// though the file itself is intact. Nudging currentTime to a huge value and
// back on load fixes the metadata so normal playback works.
export default function FixedDurationVideo({ src, ...props }) {
  const ref = useRef(null)

  const fixDuration = () => {
    const video = ref.current
    if (!video || Number.isFinite(video.duration)) return
    video.currentTime = 1e101
    const onTimeUpdate = () => {
      video.currentTime = 0
      video.removeEventListener('timeupdate', onTimeUpdate)
    }
    video.addEventListener('timeupdate', onTimeUpdate)
  }

  return <video ref={ref} src={src} onLoadedMetadata={fixDuration} {...props} />
}
