"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  ChevronRight, ChevronLeft, Check, Loader2, ShoppingCart, 
  Truck, Shield, Clock, Upload, Package, FileText, Info
} from "lucide-react"

type ProductConfig = {
  name: string
  description: string
  categoryId: string
  sizes: { id: string; name: string; productUuid: string }[]
  colorspecs: { uuid: string; name: string; description: string }[]
  quantities: { uuid: string; qty: number }[]
  turnarounds: { uuid: string; name: string; days: number }[]
  stock: string
  coating: string
}

export function PrintProductConfigurator({ config, categorySlug }: { config: ProductConfig; categorySlug: string }) {
  // State
  const [selectedSize, setSelectedSize] = useState(config.sizes[0]?.id || "")
  const [selectedColorspec, setSelectedColorspec] = useState(config.colorspecs[0]?.uuid || "")
  const [selectedQuantity, setSelectedQuantity] = useState(config.quantities[0]?.uuid || "")
  const [selectedTurnaround, setSelectedTurnaround] = useState(config.turnarounds[0]?.uuid || "")
  
  const [price, setPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [shippingPrice, setShippingPrice] = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  
  const [step, setStep] = useState(1)
  const totalSteps = 4

  // Get current selection details
  const currentSize = config.sizes.find(s => s.id === selectedSize)
  const currentColorspec = config.colorspecs.find(c => c.uuid === selectedColorspec)
  const currentQuantity = config.quantities.find(q => q.uuid === selectedQuantity)
  const currentTurnaround = config.turnarounds.find(t => t.uuid === selectedTurnaround)

  // Fetch price from 4over API when options change
  useEffect(() => {
    async function fetchPrice() {
      if (!currentSize?.productUuid || !selectedColorspec || !selectedQuantity) return
      
      setPriceLoading(true)
      try {
        const params = new URLSearchParams({
          product_uuid: currentSize.productUuid,
          colorspec_uuid: selectedColorspec,
          runsize_uuid: selectedQuantity,
          turnaroundtime_uuid: selectedTurnaround,
        })
        
        const res = await fetch(`/api/4over/quote?${params}`)
        const data = await res.json()
        
        if (data.success && data.price) {
          setPrice(data.price)
        } else if (data.total_price) {
          // productquote returns total_price — apply markup from config
          const { getMarkupMultiplierBySlug } = await import("@/lib/4over-config")
          const markup = getMarkupMultiplierBySlug(categorySlug)
          setPrice(data.total_price * markup)
        } else {
          setPrice(null)
        }
      } catch (e) {
        setPrice(null)
      } finally {
        setPriceLoading(false)
      }
    }
    
    fetchPrice()
  }, [currentSize?.productUuid, selectedColorspec, selectedQuantity, selectedTurnaround, categorySlug, currentQuantity?.qty])

  // Calculate unit price
  const unitPrice = price && currentQuantity ? price / currentQuantity.qty : null

  const handleAddToCart = () => {
    const cartItem = {
      id: `${categorySlug}-${Date.now()}`,
      productType: categorySlug,
      productName: config.name,
      size: currentSize?.name,
      colorspec: currentColorspec?.name,
      quantity: currentQuantity?.qty,
      turnaround: currentTurnaround?.name,
      price: price,
      productUuid: currentSize?.productUuid,
      colorspecUuid: selectedColorspec,
      runsizeUuid: selectedQuantity,
      turnaroundUuid: selectedTurnaround,
    }
    
    // Add to localStorage cart
    const cart = JSON.parse(localStorage.getItem("print_cart") || "[]")
    cart.push(cartItem)
    localStorage.setItem("print_cart", JSON.stringify(cart))
    
    // Redirect to cart or show confirmation
    window.location.href = "/cart"
  }

  const nextStep = () => setStep(Math.min(step + 1, totalSteps))
  const prevStep = () => setStep(Math.max(step - 1, 1))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/print" className="text-muted-foreground hover:text-foreground">Print Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{config.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <Badge className="mb-2 bg-[#2c327a]/10 text-[#2c327a]">{categorySlug.replace("-", " ").toUpperCase()}</Badge>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{config.name}</h1>
              <p className="text-slate-600 mt-1">{config.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                <span><Package className="h-4 w-4 inline mr-1" />{config.stock}</span>
                <span><FileText className="h-4 w-4 inline mr-1" />{config.coating}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Your Price</p>
              <p className="text-4xl font-bold text-[#2c327a]">
                {priceLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin inline" />
                ) : price ? (
                  `$${price.toFixed(2)}`
                ) : (
                  "Configure"
                )}
              </p>
              {unitPrice && (
                <p className="text-sm text-slate-500">${unitPrice.toFixed(4)} per piece</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Trust & Info */}
          <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
            {/* Product Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                  <FileText className="h-24 w-24 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Size</span>
                  <span className="font-medium">{currentSize?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Print</span>
                  <span className="font-medium">{currentColorspec?.name.split(" - ")[0] || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity</span>
                  <span className="font-medium">{currentQuantity?.qty.toLocaleString() || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turnaround</span>
                  <span className="font-medium">{currentTurnaround?.name || "—"}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-[#2c327a]">{price ? `$${price.toFixed(2)}` : "—"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Quality Guaranteed</p>
                    <p className="text-xs text-slate-500">100% satisfaction or reprint</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Free Shipping</p>
                    <p className="text-xs text-slate-500">On orders over $100</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Rush Available</p>
                    <p className="text-xs text-slate-500">Next day turnaround</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Configurator */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card>
              {/* Progress Steps */}
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  {[
                    { num: 1, label: "Size" },
                    { num: 2, label: "Print" },
                    { num: 3, label: "Quantity" },
                    { num: 4, label: "Turnaround" },
                  ].map((s, i) => (
                    <button
                      key={s.num}
                      onClick={() => setStep(s.num)}
                      className={`flex items-center gap-2 ${i < 3 ? "flex-1" : ""}`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        step > s.num ? "bg-green-500 text-white" :
                        step === s.num ? "bg-[#2c327a] text-white" :
                        "bg-slate-200 text-slate-500"
                      }`}>
                        {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                      </div>
                      <span className={`text-sm hidden md:block ${step === s.num ? "font-semibold" : "text-slate-500"}`}>
                        {s.label}
                      </span>
                      {i < 3 && <div className="flex-1 h-0.5 bg-slate-200 mx-2 hidden md:block" />}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Step 1: Size */}
                {step === 1 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Select Size</h3>
                    <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="grid gap-3">
                      {config.sizes.map((size) => (
                        <Label
                          key={size.id}
                          htmlFor={`size-${size.id}`}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedSize === size.id 
                              ? "border-[#2c327a] bg-[#2c327a]/5" 
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <RadioGroupItem value={size.id} id={`size-${size.id}`} />
                          <div className="flex-1">
                            <p className="font-medium">{size.name}</p>
                          </div>
                          {selectedSize === size.id && <Check className="h-5 w-5 text-[#2c327a]" />}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Step 2: Colorspec */}
                {step === 2 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Select Print Type</h3>
                    <RadioGroup value={selectedColorspec} onValueChange={setSelectedColorspec} className="grid gap-3">
                      {config.colorspecs.map((spec) => (
                        <Label
                          key={spec.uuid}
                          htmlFor={`spec-${spec.uuid}`}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedColorspec === spec.uuid 
                              ? "border-[#2c327a] bg-[#2c327a]/5" 
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <RadioGroupItem value={spec.uuid} id={`spec-${spec.uuid}`} />
                          <div className="flex-1">
                            <p className="font-medium">{spec.name}</p>
                            <p className="text-sm text-slate-500">{spec.description}</p>
                          </div>
                          {selectedColorspec === spec.uuid && <Check className="h-5 w-5 text-[#2c327a]" />}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Step 3: Quantity */}
                {step === 3 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Select Quantity</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {config.quantities.map((qty) => (
                        <button
                          key={qty.uuid}
                          onClick={() => setSelectedQuantity(qty.uuid)}
                          className={`p-4 rounded-lg border-2 text-center transition-all ${
                            selectedQuantity === qty.uuid 
                              ? "border-[#2c327a] bg-[#2c327a]/5" 
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="font-bold text-xl">{qty.qty.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">pieces</p>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500 mt-4 flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Need a custom quantity? <Link href="/contact" className="text-[#2c327a] underline">Contact us</Link>
                    </p>
                  </div>
                )}

                {/* Step 4: Turnaround */}
                {step === 4 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Select Turnaround Time</h3>
                    <RadioGroup value={selectedTurnaround} onValueChange={setSelectedTurnaround} className="grid gap-3">
                      {config.turnarounds.map((turn) => (
                        <Label
                          key={turn.uuid}
                          htmlFor={`turn-${turn.uuid}`}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedTurnaround === turn.uuid 
                              ? "border-[#2c327a] bg-[#2c327a]/5" 
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <RadioGroupItem value={turn.uuid} id={`turn-${turn.uuid}`} />
                          <div className="flex-1">
                            <p className="font-medium">{turn.name}</p>
                            <p className="text-sm text-slate-500">Production time: {turn.days} business days</p>
                          </div>
                          {turn.days === 1 && (
                            <Badge className="bg-[#e42a27] text-white">Rush</Badge>
                          )}
                          {selectedTurnaround === turn.uuid && <Check className="h-5 w-5 text-[#2c327a]" />}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <Button 
                    variant="outline" 
                    onClick={prevStep}
                    disabled={step === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  
                  {step < totalSteps ? (
                    <Button onClick={nextStep} className="bg-[#2c327a] hover:bg-[#1a1f4e]">
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleAddToCart}
                      className="bg-[#e42a27] hover:bg-[#c42020]"
                      disabled={!price}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart - {price ? `$${price.toFixed(2)}` : "..."}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
