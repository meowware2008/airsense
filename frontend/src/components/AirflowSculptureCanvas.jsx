import { useEffect, useRef } from 'react'

export default function AirflowSculptureCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let isRunning = true

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Pointer coordinates with smooth damping
    let mouseX = 0
    let mouseY = 0
    let targetMouseX = 0
    let targetMouseY = 0

    function handleMouseMove(e) {
      const halfWidth = window.innerWidth / 2
      const halfHeight = window.innerHeight / 2
      targetMouseX = (e.clientX - halfWidth) / halfWidth
      targetMouseY = (e.clientY - halfHeight) / halfHeight
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Handle canvas sizing with devicePixelRatio
    let width = 0
    let height = 0

    function handleResize() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    // Number of aerodynamic ribbon surfaces in the central airflow sculpture
    const finCount = 20
    let time = 0

    function render(currentTime) {
      if (!isRunning) return
      time = prefersReducedMotion ? 1.5 : currentTime * 0.00065

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.04
      mouseY += (targetMouseY - mouseY) * 0.04

      ctx.clearRect(0, 0, width, height)

      // =================================================================
      // C. Atmospheric Flow Lines & Wind Field Visualisation
      // =================================================================
      ctx.save()

      // 1. Concentric Atmospheric Contour Arcs (upper right quadrant)
      const arcCenterX = width * 0.94 + mouseX * 15
      const arcCenterY = height * 0.08 + mouseY * 12
      ctx.strokeStyle = 'rgba(185, 221, 224, 0.12)'
      ctx.lineWidth = 1.0

      for (let r = 90; r <= Math.max(width, height) * 0.85; r += 60) {
        ctx.beginPath()
        const startAngle = Math.PI * 0.42 + Math.sin(time * 0.4 + r * 0.002) * 0.03
        const endAngle = Math.PI * 1.08 + Math.cos(time * 0.4 + r * 0.002) * 0.03
        ctx.arc(arcCenterX, arcCenterY, r, startAngle, endAngle)
        ctx.stroke()
      }

      // 2. Subtle Horizontal Atmospheric Streamlines
      const streamLines = [0.18, 0.28, 0.44, 0.68, 0.82]
      streamLines.forEach((yRatio, idx) => {
        ctx.beginPath()
        const baseY = height * yRatio
        const waveSpeed = 0.8 + idx * 0.2
        const amplitude = 14 + idx * 4

        ctx.strokeStyle = `rgba(185, 221, 224, ${0.06 + idx * 0.02})`
        ctx.lineWidth = 1.0

        for (let x = -20; x <= width + 20; x += 25) {
          const wave = Math.sin(x * 0.0016 + time * waveSpeed + idx) * amplitude
          const mouseDeflect = Math.sin((x / width) * Math.PI) * (mouseY * 18)
          const y = baseY + wave + mouseDeflect

          if (x === -20) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      })

      ctx.restore()

      // =================================================================
      // B. Central Organic Airflow Sculpture
      // =================================================================
      const centerX = width * 0.52 + mouseX * 28
      const centerY = height * 0.47 + mouseY * 22

      // Soft ambient light diffusion behind sculpture
      const haloRadius = Math.min(width * 0.35, 380)
      const haloGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        haloRadius
      )
      haloGradient.addColorStop(0, 'rgba(98, 191, 192, 0.10)')
      haloGradient.addColorStop(0.5, 'rgba(23, 107, 112, 0.05)')
      haloGradient.addColorStop(1, 'rgba(16, 45, 56, 0)')
      ctx.fillStyle = haloGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2)
      ctx.fill()

      // Base geometry dimensions
      const baseRadius = Math.min(width * 0.17, 185)
      const verticalSpacing = 24

      const fins = []

      for (let i = 0; i < finCount; i++) {
        const normalized = i / (finCount - 1) // 0 to 1
        const centered = i - finCount / 2 // -10 to +10

        // Slow undulating deformation and smooth S-curve flow
        const waveAngle = time * 0.85 + i * 0.22
        const waveX = Math.sin(waveAngle) * 22
        const waveY = Math.cos(waveAngle * 0.8) * 7

        // Spiral aerodynamic helix coordinate
        const curveX = Math.sin(centered * 0.22) * 95 + waveX + mouseX * (18 - i * 1.4)
        const posX = centerX + curveX
        const posY = centerY + centered * verticalSpacing + waveY + mouseY * 14

        // Scale & perspective: lower fins are closer and slightly larger
        const scale = 0.80 + normalized * 0.38
        const radius = baseRadius * scale

        // Aerodynamic compression ratio (aspect ratio of the airfoil surface)
        const compression = 0.34 + Math.sin(time * 0.6 + i * 0.16) * 0.025 + mouseY * 0.04

        // Gentle continuous twist angle
        const twistAngle = (Math.PI / 16) * Math.sin(time * 0.7 + i * 0.18) + (mouseX * 0.06)

        // Depth calculation for back-to-front rendering order
        const depth = posY + scale * 45

        fins.push({
          index: i,
          x: posX,
          y: posY,
          radius,
          compression,
          thickness: 10 * scale,
          twistAngle,
          depth,
          normalized,
        })
      }

      // Sort back-to-front by depth
      fins.sort((a, b) => a.depth - b.depth)

      // Draw each aerodynamic ribbon fin
      fins.forEach(fin => {
        const { x, y, radius, compression, thickness, twistAngle, normalized } = fin
        const ry = radius * compression

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(twistAngle)

        // 1. Soft atmospheric shadow cast onto the layers below
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(6, thickness + 10, radius * 0.92, ry * 0.92, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(10, 31, 39, 0.35)'
        ctx.filter = 'blur(12px)'
        ctx.fill()
        ctx.restore()

        // 2. Aerodynamic Ribbon Thickness Rim
        ctx.beginPath()
        ctx.ellipse(0, 0, radius, ry, 0, 0, Math.PI)
        ctx.lineTo(radius, thickness)
        ctx.ellipse(0, thickness, radius, ry, 0, 0, Math.PI, false)
        ctx.lineTo(-radius, 0)
        ctx.closePath()

        const rimGradient = ctx.createLinearGradient(-radius, 0, radius, thickness)
        // Highlighting using atmospheric cyan & mist
        rimGradient.addColorStop(0, '#B9DDE0') // Specular aerodynamic leading edge
        rimGradient.addColorStop(0.25, '#62BFC0')
        rimGradient.addColorStop(0.65, '#176B70')
        rimGradient.addColorStop(1, '#102D38') // Core shadow trailing edge
        ctx.fillStyle = rimGradient
        ctx.fill()

        ctx.strokeStyle = 'rgba(16, 45, 56, 0.45)'
        ctx.lineWidth = 0.8
        ctx.stroke()

        // 3. Top Translucent Flow Surface (aerodynamic curved plane)
        ctx.beginPath()
        ctx.ellipse(0, 0, radius, ry, 0, 0, Math.PI * 2)

        const surfaceGradient = ctx.createRadialGradient(
          -radius * 0.3,
          -ry * 0.35,
          radius * 0.05,
          0,
          0,
          radius * 1.05
        )
        // Atmospheric palette: Mist (#B9DDE0) -> Cyan (#62BFC0) -> Muted Teal (#176B70)
        surfaceGradient.addColorStop(0, 'rgba(185, 221, 224, 0.92)') // Soft reflective light
        surfaceGradient.addColorStop(0.35, 'rgba(98, 191, 192, 0.88)')
        surfaceGradient.addColorStop(0.75, 'rgba(23, 107, 112, 0.85)')
        surfaceGradient.addColorStop(1, 'rgba(16, 45, 56, 0.88)')

        ctx.fillStyle = surfaceGradient
        ctx.fill()

        // Crisp delicate highlight along the top aerodynamic perimeter
        ctx.strokeStyle = `rgba(243, 245, 242, ${0.45 - normalized * 0.15})`
        ctx.lineWidth = 1.0
        ctx.stroke()

        ctx.restore()
      })

      // 4. Subtle intertwined continuous air current ribbons (connecting the sculpture)
      ctx.save()
      ctx.beginPath()
      fins.forEach((fin, idx) => {
        const offset = Math.sin(time * 0.9 + idx * 0.3) * 12
        const px = fin.x + fin.radius * 0.45 + offset
        const py = fin.y + fin.radius * fin.compression * 0.2
        if (idx === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      })
      ctx.strokeStyle = 'rgba(185, 221, 224, 0.22)'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.restore()

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    // Initial trigger
    animationFrameId = requestAnimationFrame(render)

    function handleVisibilityChange() {
      if (document.hidden) {
        isRunning = false
        cancelAnimationFrame(animationFrameId)
      } else {
        isRunning = true
        if (!prefersReducedMotion) {
          animationFrameId = requestAnimationFrame(render)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isRunning = false
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="airflow-canvas-element"
      aria-hidden="true"
    />
  )
}
