'use client'
import { useEffect, useRef } from 'react'

interface Shape {
  x: number
  y: number
  size: number
  dx: number
  dy: number
  color: string
  type: 'circle' | 'rect' | 'triangle'
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const shapes: Shape[] = []
    const shapeCount = 11 // ✅ Around 10–11 shapes
    const colors = ['#6EC1E4', '#E76F51', '#E9C46A', '#2A9D8F', '#264653']

    // Create random shapes
    for (let i = 0; i < shapeCount; i++) {
      shapes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 40 + 25, // ✅ Slightly smaller (25–65px)
        dx: (Math.random() - 0.5) * 0.8,
        dy: (Math.random() - 0.5) * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: ['circle', 'rect', 'triangle'][
          Math.floor(Math.random() * 3)
        ] as Shape['type'],
      })
    }

    const drawShape = (s: Shape) => {
      ctx.globalAlpha = 0.25 // ✅ soft transparency
      ctx.fillStyle = s.color
      ctx.beginPath()

      if (s.type === 'circle') {
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      } else if (s.type === 'rect') {
        ctx.rect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size)
      } else if (s.type === 'triangle') {
        ctx.moveTo(s.x, s.y - s.size)
        ctx.lineTo(s.x - s.size, s.y + s.size)
        ctx.lineTo(s.x + s.size, s.y + s.size)
        ctx.closePath()
      }

      ctx.fill()
      ctx.globalAlpha = 1
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      shapes.forEach((s) => {
        s.x += s.dx
        s.y += s.dy

        // Wrap around edges for smooth looping
        if (s.x < -s.size) s.x = width + s.size
        if (s.x > width + s.size) s.x = -s.size
        if (s.y < -s.size) s.y = height + s.size
        if (s.y > height + s.size) s.y = -s.size

        // Repel from mouse
        const dx = mouse.current.x - s.x
        const dy = mouse.current.y - s.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = 130
        if (dist < minDist) {
          const angle = Math.atan2(dy, dx)
          const force = (minDist - dist) / minDist
          s.x -= Math.cos(angle) * force * 6
          s.y -= Math.sin(angle) * force * 6
        }

        drawShape(s)
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-b from-[#f8f9fa] to-[#eef3ff]"
    />
  )
}