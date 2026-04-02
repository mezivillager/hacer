"use client"

import { useRef, useEffect } from "react"
import { useTheme } from "next-themes"

interface CircuitCanvasProps {
  showAxes: boolean
}

// Theme-aware colors
const getColors = (isDark: boolean) => ({
  background: isDark ? "oklch(0.12 0.01 240)" : "oklch(0.95 0.01 240)",
  minorGrid: isDark ? "oklch(0.20 0.01 240)" : "oklch(0.85 0.02 240)",
  majorAxis: isDark ? "oklch(0.30 0.02 240)" : "oklch(0.70 0.03 240)",
  perspective: isDark ? "oklch(0.18 0.01 240)" : "oklch(0.88 0.01 240)",
})

export function CircuitCanvas({ showAxes }: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const isDark = resolvedTheme === "dark"
    const colors = getColors(isDark)

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      drawGrid()
    }

    const drawGrid = () => {
      if (!ctx) return
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      // Clear canvas with theme-aware background
      ctx.fillStyle = colors.background
      ctx.fillRect(0, 0, width, height)

      if (!showAxes) return

      const gridSize = 40
      const centerX = width / 2
      const centerY = height / 2

      // Draw minor grid lines
      ctx.strokeStyle = colors.minorGrid
      ctx.lineWidth = 0.5

      // Vertical lines
      for (let x = centerX % gridSize; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Horizontal lines
      for (let y = centerY % gridSize; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw major axes
      ctx.strokeStyle = colors.majorAxis
      ctx.lineWidth = 1

      // Vertical center line
      ctx.beginPath()
      ctx.moveTo(centerX, 0)
      ctx.lineTo(centerX, height)
      ctx.stroke()

      // Horizontal center line
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(width, centerY)
      ctx.stroke()

      // Draw perspective lines (subtle 3D effect)
      ctx.strokeStyle = colors.perspective
      ctx.lineWidth = 0.3

      const perspectiveLines = 8
      for (let i = 1; i <= perspectiveLines; i++) {
        const offset = i * 80
        
        // Top-left to bottom-right diagonal region
        ctx.beginPath()
        ctx.moveTo(centerX - offset, 0)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.moveTo(0, centerY - offset)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()

        // Top-right region
        ctx.beginPath()
        ctx.moveTo(centerX + offset, 0)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(width, centerY - offset)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()

        // Bottom regions
        ctx.beginPath()
        ctx.moveTo(centerX - offset, height)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(0, centerY + offset)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(centerX + offset, height)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(width, centerY + offset)
        ctx.lineTo(centerX, centerY)
        ctx.stroke()
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [showAxes, resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ display: "block" }}
    />
  )
}
