import { useEffect, useRef } from 'react'

export default function JetonDiscsCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let isRunning = true

    // Parallax mouse coordinates
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

    // Handle canvas resize
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

    const discCount = 17
    let time = 0

    function render(currentTime) {
      if (!isRunning) return
      time = currentTime * 0.001

      // Smooth mouse damping
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05

      ctx.clearRect(0, 0, width, height)

      // 1. Draw top-right subtle concentric wireframe arcs (Jeton signature detail)
      const arcCenter = { x: width * 0.95, y: height * 0.05 }
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
      ctx.lineWidth = 1.2
      for (let r = 80; r <= Math.max(width, height) * 0.75; r += 55) {
        ctx.beginPath()
        ctx.arc(arcCenter.x, arcCenter.y, r, Math.PI * 0.45, Math.PI * 1.1)
        ctx.stroke()
      }
      ctx.restore()

      // 2. Compute 3D Discs
      // Center of column is in the upper-middle of the screen
      const centerX = width * 0.5 + mouseX * 25
      const centerY = height * 0.48 + mouseY * 20

      const baseRadius = Math.min(width * 0.16, 175)
      const discThickness = 14
      const verticalSpacing = 28

      const discs = []

      for (let i = 0; i < discCount; i++) {
        const normalizedIndex = i / (discCount - 1) // 0 to 1
        const centeredIndex = i - discCount / 2 // -8 to +8

        // Spiral S-curve offsets
        const waveOffset = Math.sin(time * 1.2 + i * 0.28) * 16
        const waveY = Math.cos(time * 1.2 + i * 0.28) * 6

        // Helical curve shape
        const curveX = Math.sin(centeredIndex * 0.24) * 85 + waveOffset + mouseX * (15 - i * 1.5)
        const posX = centerX + curveX
        const posY = centerY + centeredIndex * verticalSpacing + waveY + mouseY * 15

        // Scale discs so bottom ones feel closer
        const scale = 0.82 + normalizedIndex * 0.35
        const radius = baseRadius * scale
        const compression = 0.36 + Math.sin(time * 0.8 + i * 0.2) * 0.03 + mouseY * 0.05

        // Tilt angle
        const tiltAngle = (Math.PI / 18) * Math.sin(time * 0.9 + i * 0.22) + (mouseX * 0.08)

        // Depth for sorting (bottom/closer discs drawn on top)
        const depth = posY + scale * 50

        discs.push({
          index: i,
          x: posX,
          y: posY,
          radius,
          compression,
          thickness: discThickness * scale,
          tiltAngle,
          depth,
        })
      }

      // Sort by depth (back to front)
      discs.sort((a, b) => a.depth - b.depth)

      // Draw each disc
      discs.forEach(disc => {
        const { x, y, radius, compression, thickness, tiltAngle } = disc
        const ry = radius * compression

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(tiltAngle)

        // A. Cast soft drop shadow onto the element below
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(8, thickness + 12, radius * 0.95, ry * 0.95, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(140, 18, 10, 0.32)'
        ctx.filter = 'blur(10px)'
        ctx.fill()
        ctx.restore()

        // B. Cylindrical Rim (side edge with thickness)
        ctx.beginPath()
        ctx.ellipse(0, 0, radius, ry, 0, 0, Math.PI) // Top half arc
        ctx.lineTo(radius, thickness)
        ctx.ellipse(0, thickness, radius, ry, 0, 0, Math.PI, false) // Bottom half arc
        ctx.lineTo(-radius, 0)
        ctx.closePath()

        const rimGradient = ctx.createLinearGradient(-radius, 0, radius, thickness)
        rimGradient.addColorStop(0, '#ff6e5e') // Top-left rim highlight
        rimGradient.addColorStop(0.25, '#f44336')
        rimGradient.addColorStop(0.65, '#d32f2f')
        rimGradient.addColorStop(1, '#9a1a0f') // Bottom-right rim shadow
        ctx.fillStyle = rimGradient
        ctx.fill()

        // Subtle edge stroke
        ctx.strokeStyle = 'rgba(154, 26, 15, 0.4)'
        ctx.lineWidth = 0.8
        ctx.stroke()

        // C. Top Face (smooth ellipse with specular lighting)
        ctx.beginPath()
        ctx.ellipse(0, 0, radius, ry, 0, 0, Math.PI * 2)

        const faceGradient = ctx.createRadialGradient(
          -radius * 0.25,
          -ry * 0.25,
          radius * 0.05,
          0,
          0,
          radius
        )
        faceGradient.addColorStop(0, '#ff7a6b') // Specular soft bloom
        faceGradient.addColorStop(0.4, '#f03d2e')
        faceGradient.addColorStop(0.85, '#dc2c1e')
        faceGradient.addColorStop(1, '#be2216')
        ctx.fillStyle = faceGradient
        ctx.fill()

        // Top face crisp highlight rim
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 0.9
        ctx.stroke()

        ctx.restore()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    function handleVisibilityChange() {
      if (document.hidden) {
        isRunning = false
        cancelAnimationFrame(animationFrameId)
      } else {
        isRunning = true
        animationFrameId = requestAnimationFrame(render)
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
      className="jeton-canvas-element"
      aria-hidden="true"
    />
  )
}
