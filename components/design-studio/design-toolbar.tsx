"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter as AlignVerticalCenter,
} from "lucide-react"

interface DesignToolbarProps {
  canvas: any
}

export function DesignToolbar({ canvas }: DesignToolbarProps) {
  const handleZoomIn = () => {
    if (canvas) {
      const zoom = canvas.getZoom()
      canvas.setZoom(zoom * 1.1)
    }
  }

  const handleZoomOut = () => {
    if (canvas) {
      const zoom = canvas.getZoom()
      canvas.setZoom(zoom / 1.1)
    }
  }

  const handleZoomReset = () => {
    if (canvas) {
      canvas.setZoom(1)
    }
  }

  const handleDelete = () => {
    if (canvas) {
      const activeObjects = canvas.getActiveObjects()
      if (activeObjects.length) {
        activeObjects.forEach((obj: any) => canvas.remove(obj))
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    }
  }

  const handleDuplicate = () => {
    if (canvas) {
      const activeObject = canvas.getActiveObject()
      if (activeObject) {
        activeObject.clone((cloned: any) => {
          cloned.set({
            left: cloned.left + 10,
            top: cloned.top + 10,
          })
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
          canvas.renderAll()
        })
      }
    }
  }

  const handleAlign = (alignment: string) => {
    if (canvas) {
      const activeObject = canvas.getActiveObject()
      if (activeObject) {
        switch (alignment) {
          case "left":
            activeObject.set({ left: 0 })
            break
          case "center":
            activeObject.set({ left: (canvas.width - activeObject.width * activeObject.scaleX) / 2 })
            break
          case "right":
            activeObject.set({ left: canvas.width - activeObject.width * activeObject.scaleX })
            break
          case "vcenter":
            activeObject.set({ top: (canvas.height - activeObject.height * activeObject.scaleY) / 2 })
            break
        }
        canvas.renderAll()
      }
    }
  }

  return (
    <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
      <Button variant="ghost" size="icon" disabled>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled>
        <Redo2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="ghost" size="icon" onClick={handleZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleZoomReset}>
        <Maximize className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="ghost" size="icon" onClick={handleDuplicate}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="ghost" size="icon" onClick={() => handleAlign("left")}>
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleAlign("center")}>
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleAlign("right")}>
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleAlign("vcenter")}>
        <AlignVerticalCenter className="h-4 w-4" />
      </Button>
    </div>
  )
}
