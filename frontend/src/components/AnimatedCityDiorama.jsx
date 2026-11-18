import { useRef, useEffect } from 'react'
import windAnimationVideo from '../assets/wind-animation.mp4'
import './AnimatedCityDiorama.css'

export default function AnimatedCityDiorama({ className = '' }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.defaultMuted = true
    video.muted = true

    // Check motion accessibility preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      video.pause()
    } else {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay fallback: user interaction will start playback
        })
      }
    }

    const handleMotionChange = (e) => {
      if (e.matches) {
        video.pause()
      } else {
        video.play().catch(() => {})
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMotionChange)
      }
    }
  }, [])

  return (
    <div className={`city-diorama-wrapper ${className}`}>
      <video
        ref={videoRef}
        src={windAnimationVideo}
        className="city-diorama-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        aria-label="AirSense Eco-City Wind & Tree Animation"
      />
    </div>
  )
}
