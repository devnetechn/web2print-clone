"use client"

import { useSearchParams } from "next/navigation"
import { DesignCanvas } from "@/components/design-studio/design-canvas"
import { DesignToolbar } from "@/components/design-studio/design-toolbar"
import { DesignSidebar } from "@/components/design-studio/design-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, Save, Download, ShoppingCart, Undo2, Redo2, 
  Eye, FileText, HelpCircle, Layers, Settings, ChevronDown,
  CheckCircle2, AlertCircle, Loader2
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

type Product = {
  id: string
  name: string
  category: string
  base_price: number
  fourover_id: string | null
}

type DesignPage = {
  id: string
  name: string
  canvas: any
}

export default function DesignStudioPage() {
  const searchParams = useSearchParams()
  const productId = searchParams.get("product")
  
  const [canvas, setCanvas] = useState<any>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved")
  const [activePage, setActivePage] = useState<"front" | "back">("front")
  const [showPreview, setShowPreview] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [designPages, setDesignPages] = useState<{ front: any; back: any }>({ front: null, back: null })

  // Fetch product details
  useEffect(() => {
    async function fetchProduct() {
      if (!productId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/products/${productId}`)
        if (res.ok) {
          const data = await res.json()
          setProduct(data)
        }
      } catch (e) {
        console.error("Failed to fetch product:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [productId])

  const handleSave = async () => {
    if (!canvas) return
    
    setSaveStatus("saving")
    setSaving(true)
    
    try {
      const json = canvas.toJSON()
      // Save current page
      setDesignPages(prev => ({
        ...prev,
        [activePage]: json
      }))
      
      // TODO: Save to database
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate save
      
      setSaveStatus("saved")
    } catch (e) {
      console.error("Save failed:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = (format: "png" | "pdf" | "jpg" = "png") => {
    if (!canvas) return
    
    const dataURL = canvas.toDataURL({
      format: format === "pdf" ? "png" : format,
      quality: 1,
      multiplier: 3, // High resolution for print
    })
    
    const link = document.createElement("a")
    link.download = `design-${activePage}.${format}`
    link.href = dataURL
    link.click()
  }

  const handleAddToCart = () => {
    if (!canvas) return
    
    const designData = {
      front: designPages.front || (activePage === "front" ? canvas.toJSON() : null),
      back: designPages.back || (activePage === "back" ? canvas.toJSON() : null),
    }
    
    // Store design in localStorage for cart
    const cartItem = {
      productId: productId,
      productName: product?.name || "Custom Design",
      design: designData,
      timestamp: Date.now()
    }
    
    const cart = JSON.parse(localStorage.getItem("cart") || "[]")
    cart.push(cartItem)
    localStorage.setItem("cart", JSON.stringify(cart))
    
    alert("Design added to cart!")
  }

  const switchPage = (page: "front" | "back") => {
    if (!canvas) return
    
    // Save current page
    setDesignPages(prev => ({
      ...prev,
      [activePage]: canvas.toJSON()
    }))
    
    // Load new page
    setActivePage(page)
    if (designPages[page]) {
      canvas.loadFromJSON(designPages[page], () => {
        canvas.renderAll()
      })
    } else {
      // Clear canvas for new page
      canvas.clear()
      canvas.backgroundColor = "#ffffff"
      canvas.renderAll()
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={productId ? `/products/${productId}` : "/products"}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm">
                {product?.name || "Design Studio"}
              </h1>
              {product && (
                <Badge variant="secondary" className="text-xs">{product.category}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3 w-3" /> Unsaved changes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Page Selector */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <Button 
            variant={activePage === "front" ? "default" : "ghost"} 
            size="sm"
            onClick={() => switchPage("front")}
          >
            Front
          </Button>
          <Button 
            variant={activePage === "back" ? "default" : "ghost"} 
            size="sm"
            onClick={() => switchPage("back")}
          >
            Back
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)}>
            <HelpCircle className="h-4 w-4" />
          </Button>
          
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Design Preview</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 p-4">
                <div>
                  <p className="text-sm font-medium mb-2">Front</p>
                  <div className="aspect-[3/2] bg-white rounded border shadow-inner flex items-center justify-center">
                    {designPages.front || activePage === "front" ? (
                      <p className="text-muted-foreground text-sm">Front design</p>
                    ) : (
                      <p className="text-muted-foreground text-sm">No design</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Back</p>
                  <div className="aspect-[3/2] bg-white rounded border shadow-inner flex items-center justify-center">
                    {designPages.back || activePage === "back" ? (
                      <p className="text-muted-foreground text-sm">Back design</p>
                    ) : (
                      <p className="text-muted-foreground text-sm">No design</p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            <Save className="h-4 w-4" />
            Save
          </Button>
          
          <Select onValueChange={(v) => handleExport(v as any)}>
            <SelectTrigger className="w-auto gap-1" asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3 w-3" />
              </Button>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG (High Res)</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          
          <Button size="sm" onClick={handleAddToCart} className="gap-1">
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <DesignSidebar canvas={canvas} productId={productId} />

        {/* Canvas Area */}
        <div className="flex flex-1 flex-col">
          <DesignToolbar canvas={canvas} />
          <div className="flex-1 overflow-hidden bg-slate-200 relative">
            {/* Page indicator */}
            <div className="absolute top-4 left-4 z-10">
              <Badge variant="secondary" className="shadow">
                Editing: {activePage === "front" ? "Front" : "Back"}
              </Badge>
            </div>
            <DesignCanvas onCanvasReady={setCanvas} />
          </div>
        </div>

        {/* Right Sidebar - Product Options (conditionally shown) */}
        {product && (
          <div className="w-64 border-l bg-white p-4">
            <h3 className="font-semibold mb-4">Product Details</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Product</p>
                <p className="font-medium">{product.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{product.category}</p>
              </div>
              {product.base_price > 0 && (
                <div>
                  <p className="text-muted-foreground">Starting Price</p>
                  <p className="font-medium text-primary">${product.base_price.toFixed(2)}</p>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">File Requirements</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Resolution: 300 DPI</li>
                  <li>Color Mode: CMYK</li>
                  <li>Bleed: 0.125&quot;</li>
                </ul>
              </div>
              
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href={`/products/${productId}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Options
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Design Studio Help</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basics">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="tips">Tips</TabsTrigger>
            </TabsList>
            <TabsContent value="basics" className="space-y-4 pt-4">
              <div>
                <h4 className="font-semibold">Getting Started</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the sidebar to add text, images, and shapes to your design. 
                  Click on elements to select and modify them.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Front & Back</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Switch between front and back pages using the buttons in the header.
                  Each page is saved separately.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="tools" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="font-medium">Text Tool</p>
                  <p className="text-muted-foreground">Add and edit text</p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="font-medium">Image Upload</p>
                  <p className="text-muted-foreground">Add your own images</p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="font-medium">Shapes</p>
                  <p className="text-muted-foreground">Add rectangles, circles</p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="font-medium">Templates</p>
                  <p className="text-muted-foreground">Start from a template</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="tips" className="space-y-4 pt-4">
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Use high-resolution images (300 DPI) for best print quality</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Keep important content away from edges (bleed area)</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Save your design frequently</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Preview before adding to cart</span>
                </li>
              </ul>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
