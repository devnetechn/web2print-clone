"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { 
  Type, Square, Circle, Upload, Palette, Layers, Image as ImageIcon,
  Triangle, Star, Heart, Hexagon, Bold, Italic, Underline, AlignLeft,
  AlignCenter, AlignRight, Trash2
} from "lucide-react"
import * as fabric from "fabric"

interface DesignSidebarProps {
  canvas: any
  productId?: string | null
}

// Pre-defined templates based on product category
const templates = [
  { id: 1, name: "Business Card", category: "Business Cards", preview: "BC" },
  { id: 2, name: "Flyer Simple", category: "Flyers/Brochures", preview: "FL" },
  { id: 3, name: "Door Hanger", category: "Door Hangers", preview: "DH" },
  { id: 4, name: "Event Ticket", category: "Event Tickets", preview: "ET" },
]

const colors = [
  "#000000", "#FFFFFF", "#EF4444", "#F97316", "#EAB308", 
  "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"
]

const fonts = [
  "Arial", "Helvetica", "Times New Roman", "Georgia", 
  "Verdana", "Courier New", "Impact", "Comic Sans MS"
]

export function DesignSidebar({ canvas, productId }: DesignSidebarProps) {
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [fillColor, setFillColor] = useState("#000000")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [fontSize, setFontSize] = useState(24)
  const [fontFamily, setFontFamily] = useState("Arial")
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left")

  // Listen for canvas selection changes
  useEffect(() => {
    if (!canvas) return

    const handleSelection = () => {
      const active = canvas.getActiveObject()
      setSelectedObject(active)
      if (active) {
        setFillColor(active.fill || "#000000")
        if (active.fontSize) setFontSize(active.fontSize)
        if (active.fontFamily) setFontFamily(active.fontFamily)
        if (active.textAlign) setTextAlign(active.textAlign)
      }
    }

    canvas.on("selection:created", handleSelection)
    canvas.on("selection:updated", handleSelection)
    canvas.on("selection:cleared", () => setSelectedObject(null))

    return () => {
      canvas.off("selection:created", handleSelection)
      canvas.off("selection:updated", handleSelection)
      canvas.off("selection:cleared")
    }
  }, [canvas])

  const addText = () => {
    if (!canvas) return
    const text = new fabric.IText("Double click to edit", {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  const addHeadingText = () => {
    if (!canvas) return
    const text = new fabric.IText("HEADING", {
      left: 100,
      top: 100,
      fontSize: 48,
      fill: "#000000",
      fontFamily: "Arial",
      fontWeight: "bold",
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  const addShape = (type: "rect" | "circle" | "triangle") => {
    if (!canvas) return
    
    let shape: any
    switch (type) {
      case "rect":
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 150,
          height: 100,
          fill: "#3B82F6",
          stroke: "#1E40AF",
          strokeWidth: 0,
        })
        break
      case "circle":
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: "#22C55E",
          stroke: "#16A34A",
          strokeWidth: 0,
        })
        break
      case "triangle":
        shape = new fabric.Triangle({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: "#F97316",
        })
        break
    }
    
    canvas.add(shape)
    canvas.setActiveObject(shape)
    canvas.renderAll()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !canvas) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const imgElement = new Image()
      imgElement.crossOrigin = "anonymous"
      imgElement.onload = () => {
        const img = new fabric.Image(imgElement)
        // Scale to fit canvas
        const maxWidth = canvas.width * 0.8
        const maxHeight = canvas.height * 0.8
        const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1)
        
        img.scale(scale)
        img.set({
          left: (canvas.width - img.width! * scale) / 2,
          top: (canvas.height - img.height! * scale) / 2,
        })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
      }
      imgElement.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = "" // Reset input
  }

  const updateObjectProperty = (property: string, value: any) => {
    if (!canvas || !selectedObject) return
    selectedObject.set(property, value)
    canvas.renderAll()
  }

  const applyTemplate = (template: typeof templates[0]) => {
    if (!canvas) return
    
    // Clear canvas
    canvas.clear()
    canvas.backgroundColor = "#ffffff"
    
    // Add template elements based on type
    const heading = new fabric.IText(template.name.toUpperCase(), {
      left: canvas.width / 2,
      top: 50,
      fontSize: 32,
      fill: "#1E293B",
      fontFamily: "Arial",
      fontWeight: "bold",
      originX: "center",
    })
    
    const subtitle = new fabric.IText("Your text here", {
      left: canvas.width / 2,
      top: 100,
      fontSize: 16,
      fill: "#64748B",
      fontFamily: "Arial",
      originX: "center",
    })
    
    canvas.add(heading)
    canvas.add(subtitle)
    canvas.renderAll()
  }

  const deleteSelected = () => {
    if (!canvas || !selectedObject) return
    canvas.remove(selectedObject)
    canvas.discardActiveObject()
    canvas.renderAll()
    setSelectedObject(null)
  }

  return (
    <div className="w-72 border-r bg-white flex flex-col h-full">
      <Tabs defaultValue="elements" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b h-12 shrink-0">
          <TabsTrigger value="elements" className="text-xs gap-1">
            <Layers className="h-3 w-3" />
            Elements
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1">
            <ImageIcon className="h-3 w-3" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="properties" className="text-xs gap-1">
            <Palette className="h-3 w-3" />
            Style
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Elements Tab */}
          <TabsContent value="elements" className="p-4 mt-0">
            <div className="space-y-6">
              {/* Text */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Text</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={addHeadingText} className="h-16 flex-col gap-1 text-xs">
                    <Type className="h-5 w-5" />
                    Heading
                  </Button>
                  <Button variant="outline" onClick={addText} className="h-16 flex-col gap-1 text-xs">
                    <Type className="h-4 w-4" />
                    Body Text
                  </Button>
                </div>
              </div>

              {/* Shapes */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shapes</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => addShape("rect")} className="h-14 flex-col gap-1 text-xs p-2">
                    <Square className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" onClick={() => addShape("circle")} className="h-14 flex-col gap-1 text-xs p-2">
                    <Circle className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" onClick={() => addShape("triangle")} className="h-14 flex-col gap-1 text-xs p-2">
                    <Triangle className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Upload */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upload</h3>
                <Button variant="outline" className="w-full h-20 flex-col gap-2 border-dashed" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload Image</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, SVG</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="p-4 mt-0">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Start with a template and customize it to fit your needs.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="aspect-[3/4] rounded-lg border-2 border-slate-200 hover:border-primary transition-colors bg-white flex flex-col items-center justify-center gap-2 p-2"
                  >
                    <div className="w-full flex-1 bg-slate-100 rounded flex items-center justify-center text-2xl font-bold text-slate-300">
                      {template.preview}
                    </div>
                    <span className="text-xs font-medium truncate w-full text-center">{template.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">
                More templates coming soon
              </p>
            </div>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="p-4 mt-0">
            {selectedObject ? (
              <div className="space-y-6">
                {/* Color */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fill Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setFillColor(color)
                          updateObjectProperty("fill", color)
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          fillColor === color ? "border-primary ring-2 ring-primary/20" : "border-slate-200"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="color"
                      value={fillColor}
                      onChange={(e) => {
                        setFillColor(e.target.value)
                        updateObjectProperty("fill", e.target.value)
                      }}
                      className="w-12 h-8 p-0.5 cursor-pointer"
                    />
                    <Input
                      value={fillColor}
                      onChange={(e) => {
                        setFillColor(e.target.value)
                        updateObjectProperty("fill", e.target.value)
                      }}
                      className="flex-1 h-8 text-xs"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Text-specific properties */}
                {selectedObject.type === "i-text" && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font</Label>
                      <select
                        value={fontFamily}
                        onChange={(e) => {
                          setFontFamily(e.target.value)
                          updateObjectProperty("fontFamily", e.target.value)
                        }}
                        className="w-full mt-2 h-9 rounded-md border border-input px-3 text-sm"
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Size: {fontSize}px
                      </Label>
                      <Slider
                        value={[fontSize]}
                        onValueChange={(value) => {
                          setFontSize(value[0])
                          updateObjectProperty("fontSize", value[0])
                        }}
                        min={8}
                        max={120}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Style & Alignment
                      </Label>
                      <div className="flex gap-1">
                        <Button
                          variant={selectedObject.fontWeight === "bold" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateObjectProperty("fontWeight", selectedObject.fontWeight === "bold" ? "normal" : "bold")}
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selectedObject.fontStyle === "italic" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateObjectProperty("fontStyle", selectedObject.fontStyle === "italic" ? "normal" : "italic")}
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selectedObject.underline ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateObjectProperty("underline", !selectedObject.underline)}
                        >
                          <Underline className="h-4 w-4" />
                        </Button>
                        <div className="w-px bg-slate-200 mx-1" />
                        <Button
                          variant={textAlign === "left" ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setTextAlign("left"); updateObjectProperty("textAlign", "left") }}
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={textAlign === "center" ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setTextAlign("center"); updateObjectProperty("textAlign", "center") }}
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={textAlign === "right" ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setTextAlign("right"); updateObjectProperty("textAlign", "right") }}
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Opacity */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opacity</Label>
                  <Slider
                    defaultValue={[(selectedObject.opacity || 1) * 100]}
                    onValueChange={(value) => updateObjectProperty("opacity", value[0] / 100)}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <Separator />

                {/* Delete */}
                <Button variant="destructive" className="w-full gap-2" onClick={deleteSelected}>
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Palette className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select an element to edit its properties
                </p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
