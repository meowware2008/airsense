import { useState, useEffect, useRef } from 'react'
import { IconLeafOutline } from './Icons'
import windAnimationVideo from '../assets/wind-animation.mp4'
import './SharedElementTransitionOverlay.css'

export default function SharedElementTransitionOverlay({
  transitionPayload,
  targetBrandRef,
  targetVideoRef,
  onComplete,
}) {
  const [targetRects, setTargetRects] = useState(null)
  const [isFlying, setIsFlying] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      onComplete()
      return
    }

    if (!targetBrandRef?.current || !targetVideoRef?.current) {
      onComplete()
      return
    }

    const bRect = targetBrandRef.current.getBoundingClientRect()
    const vRect = targetVideoRef.current.getBoundingClientRect()

    if (!bRect.width || !vRect.width) {
      onComplete()
      return
    }

    setTargetRects({
      brand: {
        top: bRect.top,
        left: bRect.left,
        width: bRect.width,
        height: bRect.height,
      },
      video: {
        top: vRect.top,
        left: vRect.left,
        width: vRect.width,
        height: vRect.height,
      },
    })

    // Synchronize video timestamp with origin video
    if (videoRef.current && transitionPayload?.videoTime) {
      try {
        videoRef.current.currentTime = transitionPayload.videoTime
      } catch {
        // Fallback gracefully if video playback engine has not readyState 2+
      }
    }

    // Double-rAF ensures DOM is painted in initial state before transition starts
    let rafId2
    const rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        setIsFlying(true)
      })
    })

    // Transition completion timer matching CSS 850ms duration
    const timer = setTimeout(() => {
      onComplete()
    }, 850)

    return () => {
      cancelAnimationFrame(rafId1)
      if (rafId2) cancelAnimationFrame(rafId2)
      clearTimeout(timer)
    }
  }, [targetBrandRef, targetVideoRef, onComplete, transitionPayload])

  if (!transitionPayload?.startBrand || !transitionPayload?.startVideo) {
    return null
  }

  const { startBrand, startVideo } = transitionPayload
  const destBrand = targetRects?.brand || startBrand
  const destVideo = targetRects?.video || startVideo

  const currentBrandPos = isFlying ? destBrand : startBrand
  const currentVideoPos = isFlying ? destVideo : startVideo

  return (
    <div className="shared-element-transition-portal" aria-hidden="true">
      {/* Soft Sage Backdrop that dissolves to reveal dashboard */}
      <div className={`transition-backdrop-curtain ${isFlying ? 'flying' : ''}`} />

      {/* Shared Brand Lockup Flight ("AirSense" + Leaf Logo) */}
      <div
        className={`flying-brand-node ${isFlying ? 'flying' : ''}`}
        style={{
          top: `${currentBrandPos.top}px`,
          left: `${currentBrandPos.left}px`,
          width: `${currentBrandPos.width}px`,
          height: `${currentBrandPos.height}px`,
        }}
      >
        <div className="flying-brand-leaf">
          <IconLeafOutline size={isFlying ? 24 : 26} color={isFlying ? '#255a36' : '#1e3a2f'} />
        </div>
        <div className="flying-brand-text-col">
          <span className="flying-brand-name">AirSense</span>
          <span className="flying-brand-tagline">ENVIRONMENTAL OS</span>
        </div>
      </div>

      {/* Shared Eco-City Diorama Flight (Animated Video) */}
      <div
        className={`flying-video-node ${isFlying ? 'flying' : ''}`}
        style={{
          top: `${currentVideoPos.top}px`,
          left: `${currentVideoPos.left}px`,
          width: `${currentVideoPos.width}px`,
          height: `${currentVideoPos.height}px`,
          borderRadius: isFlying ? '0px' : '16px',
          WebkitMaskImage: isFlying
            ? 'radial-gradient(ellipse 92% 88% at 72% 50%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 98%)'
            : 'none',
          maskImage: isFlying
            ? 'radial-gradient(ellipse 92% 88% at 72% 50%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 98%)'
            : 'none',
        }}
      >
        <video
          ref={videoRef}
          src={windAnimationVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          className="flying-video-player"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}
