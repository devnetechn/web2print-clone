"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import {
  ChevronLeft,
  Check,
  Truck,
  Shield,
  Star,
  Plus,
  Minus,
  ArrowRight,
  Info,
} from "lucide-react"
import {
  calculateScreenPrintPrice,
  calculateEmbroideryPrice,
  calculateDTFPrice,
  applyMarkup,
} from "@/lib/merch/pricing"

interface PrintMethod {
  id: string
  name: string
  slug: string
  description: string
  min_quantity: number
  best_for: string
  limitations: string
  pricing_note: string
}

interface Product {
  id: string
  style_number: string
  name: string
  description: string
  fabric: string
  weight: string
  sizes: string[]
  colors?: { name: string; hex: string }[]
  color_count?: number
  base_price: number
  msrp?: number
  print_methods: string[]
  brand: { name: string; slug: string; description?: string }
  category: { name: string; slug: string }
  image?: string
  badge?: string
  rating?: number
  reviews?: string
}

interface Props {
  product: Product
  printMethods: PrintMethod[]
  relatedProducts: any[]
}

// Category images
const categoryImages: Record<string, string> = {
  'crew-neck-tees': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
  'v-neck-tees': 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&h=800&fit=crop',
  'long-sleeve-tees': 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&h=800&fit=crop',
  'polos': 'https://images.unsplash.com/photo-1625910513413-5fc45b31c1d6?w=800&h=800&fit=crop',
  'hoodies': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop',
  'sweatshirts': 'https://images.unsplash.com/photo-1572495641004-28421ae29ed4?w=800&h=800&fit=crop',
}

const printMethodImages: Record<string, string> = {
  silkscreen: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
  embroidery: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=300&fit=crop',
  dtf: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=300&fit=crop',
}

const printLocations = [
  { id: "front", label: "Front", position: "Center chest" },
  { id: "back", label: "Back", position: "Full back" },
  { id: "left_chest", label: "Left Chest", position: "Logo size" },
  { id: "left_sleeve", label: "Sleeve", position: "Left or right" },
]

// Markup percentage for customer pricing (adjust as needed)
const MARKUP_PERCENT = 100

export function MerchProductDetail({ product, printMethods, relatedProducts }: Props) {

  const [selectedPrintMethod, setSelectedPrintMethod] = useState<string>(product.print_methods?.[0] || "silkscreen")
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["front"])
  const [numberOfColors, setNumberOfColors] = useState(2)
  const [stitchCount, setStitchCount] = useState(5000)
  const [dtfSize, setDtfSize] = useState<'small' | 'large'>('large')
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({})
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false)
  
  const productImage = product.image || categoryImages[product.category?.slug] || categoryImages['crew-neck-tees']
  const colorCount = product.colors?.length || product.color_count || 0
  
  const totalQuantity = Object.values(sizeQuantities).reduce((a, b) => a + b, 0)
  
  const selectedMethod = printMethods.find((m) => m.slug === selectedPrintMethod)
  const meetsMinimum = totalQuantity >= (selectedMethod?.min_quantity || 1)

  // Calculate pricing using the pricing library
  const pricing = useMemo(() => {
    if (totalQuantity === 0) return null

    const garmentCost = product.base_price * totalQuantity
    let printCost = 0
    let setupCost = 0
    let error: string | undefined

    const garmentType = product.category?.slug === 'hoodies' ? 'hoodie' as const : 
                        product.category?.slug === 'polos' ? 'standard' as const : 'standard' as const

    if (selectedPrintMethod === 'silkscreen') {
      const result = calculateScreenPrintPrice({
        quantity: totalQuantity,
        colors: numberOfColors,
        locations: selectedLocations.length,
        garmentType,
        includeSetup: true,
      })
      if (result.error) {
        error = result.error
      } else {
        printCost = result.totalPrintCost - result.setupCost
        setupCost = result.setupCost
      }
    } else if (selectedPrintMethod === 'embroidery') {
      const result = calculateEmbroideryPrice({
        quantity: totalQuantity,
        stitchCount,
        locations: selectedLocations.length,
        includeDigitizing: true,
        is3dPuff: false,
      })
      if (result.error) {
        error = result.error
      } else {
        printCost = result.totalEmbroideryyCost - result.setupCost
        setupCost = result.setupCost
      }
    } else if (selectedPrintMethod === 'dtf') {
      const result = calculateDTFPrice({
        quantity: totalQuantity,
        size: dtfSize,
        locations: selectedLocations.length,
      })
      printCost = result.totalDTFCost
    }

    if (error) {
      return { error }
    }

    const subtotal = garmentCost + printCost + setupCost
    const customerPrice = applyMarkup(subtotal, MARKUP_PERCENT)
    const pricePerPiece = customerPrice / totalQuantity

    return {
      garmentCost,
      printCost,
      setupCost,
      subtotal,
      customerPrice,
      pricePerPiece,
    }
  }, [totalQuantity, selectedPrintMethod, numberOfColors, stitchCount, dtfSize, selectedLocations.length, product.base_price, product.category?.slug])

  const toggleLocation = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((l) => l !== locationId)
        : [...prev, locationId]
    )
  }

  const updateSizeQty = (size: string, delta: number) => {
    setSizeQuantities((prev) => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) + delta),
    }))
  }


  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/merch" className="text-primary hover:underline flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              All Products
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{product.brand?.name}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100">
              <Image
                src={productImage}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-white text-slate-900 shadow-lg">
                  {product.brand?.name}
                </Badge>
              </div>
            </div>

            {/* Thumbnails / Color Swatches Placeholder */}
            <div className="grid grid-cols-5 gap-2">
              {['slate', 'white', 'black', 'navy', 'red'].map((color) => (
                <button
                  key={color}
                  className="aspect-square rounded-lg border-2 border-transparent hover:border-primary transition-colors overflow-hidden"
                >
                  <div className={`w-full h-full bg-${color === 'white' ? 'slate-100' : color}-${color === 'black' ? '900' : color === 'navy' ? '800' : color === 'red' ? '600' : '500'}`} 
                       style={{ backgroundColor: color === 'slate' ? '#64748b' : color === 'white' ? '#f1f5f9' : color === 'black' ? '#1e293b' : color === 'navy' ? '#1e3a5f' : '#dc2626' }} />
                </button>
              ))}
            </div>

            {/* Product Specs */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="font-semibold mb-4">Product Specifications</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Style #</span>
                  <p className="font-medium">{product.style_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fabric</span>
                  <p className="font-medium">{product.fabric}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Weight</span>
                  <p className="font-medium">{product.weight}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Colors</span>
                  <p className="font-medium">{product.color_count}+ options</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Configuration */}
          <div>
            {/* Product Title */}
            <div className="mb-8">
              <p className="text-sm text-primary font-medium mb-1">{product.brand?.name}</p>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
              <p className="text-lg text-muted-foreground">{product.category?.name}</p>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">4.8 (127 reviews)</span>
              </div>
            </div>

            {/* Price Display */}
            <div className="bg-slate-900 text-white rounded-xl p-6 mb-8">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Starting at</p>
                  <p className="text-4xl font-bold">
                    ${pricing && !pricing.error ? pricing.pricePerPiece.toFixed(2) : product.base_price.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">per piece decorated</p>
                </div>
                {pricing && !pricing.error && totalQuantity > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Order total</p>
                    <p className="text-2xl font-bold">${pricing.customerPrice.toFixed(2)}</p>
                  </div>
                )}
              </div>
              {pricing?.error && (
                <p className="text-sm text-red-400 mt-2">{pricing.error}</p>
              )}
            </div>

            {/* Step 1: Decoration Method */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center">1</span>
                Choose Decoration
              </h3>
              <div className="grid gap-3">
                {printMethods
                  .filter((m) => product.print_methods?.includes(m.slug))
                  .map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPrintMethod(method.slug)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        selectedPrintMethod === method.slug
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={printMethodImages[method.slug]}
                          alt={method.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{method.name}</span>
                          {selectedPrintMethod === method.slug && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{method.best_for}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Min</p>
                        <p className="font-semibold">{method.min_quantity} pcs</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Step 2: Print Locations */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center">2</span>
                Select Locations
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {printLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => toggleLocation(location.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedLocations.includes(location.id)
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{location.label}</span>
                      {selectedLocations.includes(location.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{location.position}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Design Options */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center">3</span>
                Design Details
              </h3>
              
              {selectedPrintMethod === "silkscreen" && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Number of ink colors in your design
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[numberOfColors]}
                      onValueChange={(v) => setNumberOfColors(v[0])}
                      min={1}
                      max={6}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-center text-2xl font-bold">{numberOfColors}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1 color</span>
                    <span>6 colors</span>
                  </div>
                </div>
              )}

              {selectedPrintMethod === "embroidery" && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Estimated stitch count
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5000, 8000, 12000].map((count) => (
                      <button
                        key={count}
                        onClick={() => setStitchCount(count)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          stitchCount === count
                            ? "border-primary bg-primary/5"
                            : "border-slate-200"
                        }`}
                      >
                        <p className="font-semibold">{(count / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-muted-foreground">stitches</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedPrintMethod === "dtf" && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Print size
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDtfSize('small')}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        dtfSize === 'small' ? "border-primary bg-primary/5" : "border-slate-200"
                      }`}
                    >
                      <p className="font-semibold">Small</p>
                      <p className="text-xs text-muted-foreground">Up to 5&quot; x 5&quot;</p>
                    </button>
                    <button
                      onClick={() => setDtfSize('large')}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        dtfSize === 'large' ? "border-primary bg-primary/5" : "border-slate-200"
                      }`}
                    >
                      <p className="font-semibold">Large</p>
                      <p className="text-xs text-muted-foreground">Up to 14&quot; x 16&quot;</p>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Quantity */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center">4</span>
                Quantity by Size
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {product.sizes?.map((size) => (
                  <div key={size} className="text-center">
                    <Label className="text-xs font-medium text-muted-foreground block mb-2">
                      {size}
                    </Label>
                    <div className="flex items-center justify-center border-2 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="p-2 hover:bg-slate-100 transition-colors"
                        onClick={() => updateSizeQty(size, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <Input
                        type="number"
                        min="0"
                        value={sizeQuantities[size] || 0}
                        onChange={(e) =>
                          setSizeQuantities((prev) => ({
                            ...prev,
                            [size]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-12 text-center border-0 p-0 text-lg font-semibold"
                      />
                      <button
                        type="button"
                        className="p-2 hover:bg-slate-100 transition-colors"
                        onClick={() => updateSizeQty(size, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-6 p-4 bg-slate-100 rounded-xl">
                <span className="font-medium">Total Quantity</span>
                <span className="text-3xl font-bold">{totalQuantity}</span>
              </div>
              
              {!meetsMinimum && totalQuantity > 0 && (
                <p className="text-sm text-destructive mt-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Minimum {selectedMethod?.min_quantity} pieces required for {selectedMethod?.name}
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <Link
                href={
                  pricing && totalQuantity > 0 && meetsMinimum
                    ? `/merch/checkout?productId=${product.id}&product=${encodeURIComponent(`${product.brand.name} ${product.name}`)}&garment=${(applyMarkup(pricing.garmentCost, MARKUP_PERCENT)).toFixed(2)}&print=${(applyMarkup(pricing.printCost, MARKUP_PERCENT)).toFixed(2)}&setup=${(applyMarkup(pricing.setupCost, MARKUP_PERCENT)).toFixed(2)}&qty=${totalQuantity}&ppp=${pricing.pricePerPiece?.toFixed(2)}`
                    : "#"
                }
              >
                <Button
                  size="lg"
                  className="w-full h-14 text-lg bg-[#e42a27] hover:bg-[#c51f1f] text-white"
                  disabled={totalQuantity === 0 || !meetsMinimum || !pricing}
                >
                  {totalQuantity === 0
                    ? "Select Quantity"
                    : !meetsMinimum
                    ? `Minimum ${selectedMethod?.min_quantity} pcs`
                    : `Checkout — ${totalQuantity} pcs / $${pricing?.pricePerPiece?.toFixed(2)}ea`}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {totalQuantity > 0 && meetsMinimum && (
                <p className="text-center text-sm text-muted-foreground">
                  Select shipping & upload artwork at checkout
                </p>
              )}
            </div>

            {/* Trust */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t">
              <div className="text-center">
                <Truck className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Free Shipping</p>
                <p className="text-xs text-muted-foreground">On orders $150+</p>
              </div>
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Quality Guarantee</p>
                <p className="text-xs text-muted-foreground">100% satisfaction</p>
              </div>
              <div className="text-center">
                <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Expert Support</p>
                <p className="text-xs text-muted-foreground">Real humans</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
