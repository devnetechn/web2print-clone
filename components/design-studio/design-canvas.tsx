"use client"

import { useEffect, useRef } from "react"
import * as fabric from "fabric"

interface DesignCanvasProps {
  onCanvasReady: (canvas: fabric.Canvas) => void
}

export function DesignCanvas({ onCanvasReady }: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Initialize Fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
    })

    // Add grid
    const gridSize = 50
    for (let i = 0; i < canvas.width! / gridSize; i++) {
      canvas.add(
        new fabric.Line([i * gridSize, 0, i * gridSize, canvas.height!], {
          stroke: "#e5e7eb",
          selectable: false,
          evented: false,
        }),
      )
      canvas.add(
        new fabric.Line([0, i * gridSize, canvas.width!, i * gridSize], {
          stroke: "#e5e7eb",
          selectable: false,
          evented: false,
        }),
      )
    }

    onCanvasReady(canvas)

    return () => {
      canvas.dispose()
    }
  }, [onCanvasReady])

  return (
    <div ref={containerRef} className="flex h-full items-center justify-center p-8">
      <div className="rounded-lg bg-white shadow-xl">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
