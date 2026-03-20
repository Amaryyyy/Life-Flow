"use client"

import { useCallback, useRef, useEffect } from 'react'

interface ConfettiParticle {
  x: number
  y: number
  w: number
  h: number
  color: string
  rot: number
  rotSpeed: number
  vx: number
  vy: number
  opacity: number
}

const CONFETTI_COLORS = ['#E05555', '#E8924A', '#E8C84A', '#4BAE82', '#5B8BE8', '#9B7EDE', '#E8629A', '#4BC6B5']

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const launch = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: ConfettiParticle[] = []
    for (let i = 0; i < 140; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 200,
        w: 7 + Math.random() * 8,
        h: 5 + Math.random() * 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        vx: (Math.random() - 0.5) * 3,
        vy: 2.5 + Math.random() * 3,
        opacity: 1,
      })
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotSpeed
        p.vy += 0.05
        if (p.y > canvas.height - 60) p.opacity -= 0.025
        if (p.opacity > 0) alive = true

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.fill()
        ctx.restore()
      })
      if (alive) animFrameRef.current = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    draw()
  }, [])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return { canvasRef, launch }
}
