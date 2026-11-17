import { useEffect, useRef } from 'react'
import './AtmosphericCanvas.css'

export default function AtmosphericCanvas({ intensity = 1.0, showParticles = true }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let isRunning = true

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Resize handler with devicePixelRatio support
    let width = 0
    let height = 0

    function handleResize() {
      if (!canvas) return
      const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width || window.innerWidth
      height = rect.height || window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    // Flowing wind ribbon parameters
    const ribbons = [
      {
        baseYRatio: 0.35,
        amplitude1: 45,
        amplitude2: 25,
        frequency1: 0.0018,
        frequency2: 0.0035,
        speed: 0.0008,
        colorStart: 'rgba(0, 242, 254, 0.22)',
        colorEnd: 'rgba(16, 185, 129, 0.05)',
        lineWidth: 2.2,
      },
      {
        baseYRatio: 0.48,
        amplitude1: 65,
        amplitude2: 35,
        frequency1: 0.0014,
        frequency2: 0.0028,
        speed: 0.0006,
        colorStart: 'rgba(14, 165, 233, 0.20)',
        colorEnd: 'rgba(0, 242, 254, 0.02)',
        lineWidth: 1.8,
      },
      {
        baseYRatio: 0.62,
        amplitude1: 50,
        amplitude2: 30,
        frequency1: 0.0022,
        frequency2: 0.004,
        speed: 0.001,
        colorStart: 'rgba(16, 185, 129, 0.18)',
        colorEnd: 'rgba(14, 165, 233, 0.03)',
        lineWidth: 2.0,
      },
      {
        baseYRatio: 0.78,
        amplitude1: 40,
        amplitude2: 20,
        frequency1: 0.0016,
        frequency2: 0.003,
        speed: 0.0007,
        colorStart: 'rgba(0, 242, 254, 0.14)',
        colorEnd: 'rgba(16, 185, 129, 0.02)',
        lineWidth: 1.5,
      },
    ]

    // Floating micro aerosol particles (PM2.5 / PM10 drift)
    const particleCount = showParticles ? 45 : 0
    const particles = []
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (width || 1200),
        y: Math.random() * (height || 800),
        size: Math.random() * 2.2 + 0.8,
        vx: Math.random() * 0.45 + 0.15,
        vy: (Math.random() - 0.5) * 0.18,
        alpha: Math.random() * 0.55 + 0.15,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.4 ? '175, 100%, 55%' : '155, 80%, 60%',
      })
    }

    let time = 0

    function draw(currentTime) {
      if (!isRunning) return
      time = currentTime * intensity

      ctx.clearRect(0, 0, width, height)

      // 1. Draw glowing atmospheric ambient haze
      const gradientBg = ctx.createRadialGradient(
        width * 0.75,
        height * 0.35,
        0,
        width * 0.75,
        height * 0.35,
        Math.max(width * 0.6, 500)
      )
      gradientBg.addColorStop(0, 'rgba(0, 242, 254, 0.07)')
      gradientBg.addColorStop(0.5, 'rgba(16, 185, 129, 0.03)')
      gradientBg.addColorStop(1, 'rgba(8, 13, 15, 0)')
      ctx.fillStyle = gradientBg
      ctx.fillRect(0, 0, width, height)

      // 2. Draw flowing air ribbons
      ribbons.forEach(ribbon => {
        ctx.beginPath()
        const baseY = height * ribbon.baseYRatio
        const step = 14

        for (let x = -20; x <= width + 20; x += step) {
          const wave1 = Math.sin(x * ribbon.frequency1 + time * ribbon.speed) * ribbon.amplitude1
          const wave2 = Math.cos(x * ribbon.frequency2 + time * ribbon.speed * 1.3) * ribbon.amplitude2
          const y = baseY + wave1 + wave2

          if (x === -20) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        const ribbonGradient = ctx.createLinearGradient(0, baseY, width, baseY)
        ribbonGradient.addColorStop(0, ribbon.colorStart)
        ribbonGradient.addColorStop(1, ribbon.colorEnd)

        ctx.strokeStyle = ribbonGradient
        ctx.lineWidth = ribbon.lineWidth
        ctx.lineCap = 'round'
        ctx.stroke()
      })

      // 3. Draw aerosol particulates
      if (showParticles) {
        particles.forEach(p => {
          if (!prefersReducedMotion) {
            p.x += p.vx
            p.y += p.vy
            p.pulsePhase += p.pulseSpeed

            if (p.x > width + 10) p.x = -10
            if (p.y > height + 10) p.y = -10
            if (p.y < -10) p.y = height + 10
          }

          const dynamicAlpha = Math.max(0.1, p.alpha + Math.sin(p.pulsePhase) * 0.2)
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue}, ${dynamicAlpha})`
          ctx.shadowBlur = 6
          ctx.shadowColor = 'rgba(0, 242, 254, 0.35)'
          ctx.fill()
          ctx.shadowBlur = 0
        })
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(draw)
      }
    }

    // Handle visibility changes to conserve resources
    function handleVisibilityChange() {
      if (document.hidden) {
        isRunning = false
        cancelAnimationFrame(animationFrameId)
      } else {
        isRunning = true
        if (!prefersReducedMotion) {
          animationFrameId = requestAnimationFrame(draw)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Initial render
    animationFrameId = requestAnimationFrame(draw)

    return () => {
      isRunning = false
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intensity, showParticles])

  return (
    <div className="atmospheric-canvas-root" aria-hidden="true">
      <canvas ref={canvasRef} className="atmospheric-canvas-element" />
      <div className="atmospheric-vignette-overlay" />
    </div>
  )
}
