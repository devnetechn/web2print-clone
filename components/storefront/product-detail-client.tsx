"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Package, Clock, ShoppingCart, Palette, Check, ChevronRight, FileText, 
  HelpCircle, Loader2, Truck, Shield, Upload, Info, Zap, DollarSign,
  ChevronDown, ChevronUp, ArrowRight
} from "lucide-react"
import Link from "next/link"

type Product = {
  id: string
  name: string
  description: string | null
  category: string
  base_price: number
  image_url: string | null
  turnaround_days: number | null
  print_provider: string | null
  fourover_id: string | null
}

type ProductOption = {
  id: string
  option_name: string
  option_value: string
  price_modifier: number
}

type OptionValue = {
  uuid: string
  name: string
  description?: string
  price?: number
}

type ParsedOptions = {
  colorspecs: OptionValue[]
  runsizes: OptionValue[]
  turnarounds: OptionValue[]
  other: { name: string; values: OptionValue[] }[]
}

export function ProductDetailClient({ product, options }: { product: Product; options: ProductOption[] }) {
  const [selectedColorspec, setSelectedColorspec] = useState<string>("")
  const [selectedRunsize, setSelectedRunsize] = useState<string>("")
  const [selectedTurnaround, setSelectedTurnaround] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  
  const [price, setPrice] = useState<number | null>(null)
  const [unitPrice, setUnitPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<string>("step-1")
  const [viewMode, setViewMode] = useState<"accordion" | "tabs">("accordion")
  
  const is4over = product.fourover_id && product.print_provider === "4over"

  // Parse options from database
  const parsedOptions = useMemo<ParsedOptions>(() => {
    const result: ParsedOptions = {
      colorspecs: [],
      runsizes: [],
      turnarounds: [],
      other: []
    }
    
    for (const opt of options) {
      if (!opt.option_value) continue
      
      const values = opt.option_value.split("|").map(v => {
        const parts = v.split(":")
        return {
          uuid: parts[0] || v,
          name: parts.length > 1 ? parts[1] : v
        }
      }).filter(v => v.uuid && v.name)
      
      const optNameLower = opt.option_name.toLowerCase()
      if (optNameLower.includes("color") || optNameLower.includes("print")) {
        result.colorspecs = values
      } else if (optNameLower.includes("quantity") || optNameLower.includes("run") || optNameLower.includes("size")) {
        result.runsizes = values
      } else if (optNameLower.includes("turnaround") || optNameLower.includes("time")) {
        result.turnarounds = values
      } else {
        result.other.push({ name: opt.option_name, values })
      }
    }
    
    return result
  }, [options])

  // Auto-select first options
  useEffect(() => {
    if (parsedOptions.colorspecs.length > 0 && !selectedColorspec) {
      setSelectedColorspec(parsedOptions.colorspecs[0].uuid)
    }
    if (parsedOptions.runsizes.length > 0 && !selectedRunsize) {
      setSelectedRunsize(parsedOptions.runsizes[0].uuid)
    }
    if (parsedOptions.turnarounds.length > 0 && !selectedTurnaround) {
      setSelectedTurnaround(parsedOptions.turnarounds[0].uuid)
    }
  }, [parsedOptions])

  // Fetch live price when options change
  useEffect(() => {
    async function fetchPrice() {
      if (!is4over || !product.fourover_id) {
        // Use base price for non-4over products
        if (product.base_price > 0) {
          setPrice(product.base_price * quantity)
          setUnitPrice(product.base_price)
        }
        return
      }
      if (!selectedColorspec || !selectedRunsize) return
      
      setPriceLoading(true)
      setPriceError(null)
      
      try {
        const res = await fetch(`/api/4over/quote?product_id=${product.fourover_id}&action=baseprices`)
        const data = await res.json()
        
        if (data.entities && Array.isArray(data.entities)) {
          const matchingPrice = data.entities.find((p: any) => 
            p.colorspec_uuid === selectedColorspec && p.runsize_uuid === selectedRunsize
          )
          
          if (matchingPrice) {
            const basePrice = parseFloat(matchingPrice.product_baseprice || "0")
            const markup = 1.35 // 35% markup
            const finalPrice = basePrice * markup
            setPrice(finalPrice)
            // Calculate unit price based on quantity from runsize name
            const qtyMatch = parsedOptions.runsizes.find(r => r.uuid === selectedRunsize)?.name.match(/\d+/)
            const qtyFromName = qtyMatch ? parseInt(qtyMatch[0]) : 1
            setUnitPrice(finalPrice / qtyFromName)
          } else {
            // Fallback to any price for this colorspec
            const anyPrice = data.entities.find((p: any) => p.colorspec_uuid === selectedColorspec)
            if (anyPrice) {
              const basePrice = parseFloat(anyPrice.product_baseprice || "0")
              setPrice(basePrice * 1.35)
            }
          }
        }
      } catch (e) {
        setPriceError("Unable to fetch pricing")
        if (product.base_price > 0) {
          setPrice(product.base_price)
        }
      } finally {
        setPriceLoading(false)
      }
    }
    
    fetchPrice()
  }, [is4over, product.fourover_id, selectedColorspec, selectedRunsize, product.base_price, quantity])

  const handleAddToCart = () => {
    const orderDetails = {
      productId: product.id,
      productName: product.name,
      colorspec: parsedOptions.colorspecs.find(c => c.uuid === selectedColorspec)?.name,
      quantity: parsedOptions.runsizes.find(r => r.uuid === selectedRunsize)?.name,
      turnaround: parsedOptions.turnarounds.find(t => t.uuid === selectedTurnaround)?.name,
      price: price?.toFixed(2)
    }
    
    // Store in localStorage cart
    const cart = JSON.parse(localStorage.getItem("cart") || "[]")
    cart.push(orderDetails)
    localStorage.setItem("cart", JSON.stringify(cart))
    
    alert(`Added to cart!\nProduct: ${product.name}\nPrice: $${price?.toFixed(2)}`)
  }

  const goToNextStep = () => {
    const steps = ["step-1", "step-2", "step-3", "step-4"]
    const currentIndex = steps.indexOf(activeStep)
    if (currentIndex < steps.length - 1) {
      setActiveStep(steps[currentIndex + 1])
    }
  }

  const isStepComplete = (step: string) => {
    switch (step) {
      case "step-1": return !!selectedColorspec
      case "step-2": return !!selectedRunsize
      case "step-3": return !!selectedTurnaround || parsedOptions.turnarounds.length === 0
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/products" className="text-muted-foreground hover:text-foreground">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="text-muted-foreground hover:text-foreground">
              {product.category}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Product Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20">{product.category}</Badge>
              <h1 className="text-2xl lg:text-3xl font-bold">{product.name}</h1>
              <p className="text-muted-foreground mt-1">
                {product.description || `Professional ${product.category.toLowerCase()} with premium quality printing`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Starting at</p>
                <p className="text-3xl font-bold text-primary">
                  {priceLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin inline" />
                  ) : price ? (
                    `$${price.toFixed(2)}`
                  ) : product.base_price > 0 ? (
                    `$${product.base_price.toFixed(2)}`
                  ) : (
                    "Get Quote"
                  )}
                </p>
                {unitPrice && unitPrice > 0 && (
                  <p className="text-xs text-muted-foreground">${unitPrice.toFixed(4)} per piece</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Product Image & Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Product Image */}
            <Card>
              <CardContent className="p-4">
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
                  ) : (
                    <Package className="h-24 w-24 text-slate-300" />
                  )}
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
                    <p className="text-xs text-muted-foreground">100% satisfaction or reprint</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Fast Shipping</p>
                    <p className="text-xs text-muted-foreground">Free shipping on orders $100+</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Rush Available</p>
                    <p className="text-xs text-muted-foreground">Same day turnaround options</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Need Help?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Our print experts are ready to assist you with your order.
                    </p>
                    <Button variant="link" className="h-auto p-0 mt-2 text-primary" asChild>
                      <Link href="/contact">Contact Support</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Configurator */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Configure Your Order</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={viewMode === "accordion" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setViewMode("accordion")}
                    >
                      Step by Step
                    </Button>
                    <Button 
                      variant={viewMode === "tabs" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setViewMode("tabs")}
                    >
                      All Options
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {viewMode === "accordion" ? (
                  /* Accordion Layout - OnPrintShop Style Step by Step */
                  <Accordion 
                    type="single" 
                    value={activeStep} 
                    onValueChange={setActiveStep}
                    className="w-full"
                  >
                    {/* Step 1: Print Type / Color Spec */}
                    <AccordionItem value="step-1" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                        <div className="flex items-center gap-3 text-left">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${isStepComplete("step-1") ? "bg-green-500 text-white" : "bg-primary text-white"}`}>
                            {isStepComplete("step-1") ? <Check className="h-4 w-4" /> : "1"}
                          </div>
                          <div>
                            <p className="font-semibold">Select Print Type</p>
                            {selectedColorspec && (
                              <p className="text-sm text-muted-foreground font-normal">
                                {parsedOptions.colorspecs.find(c => c.uuid === selectedColorspec)?.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <RadioGroup value={selectedColorspec} onValueChange={setSelectedColorspec} className="grid gap-3">
                          {parsedOptions.colorspecs.map((option) => (
                            <Label
                              key={option.uuid}
                              htmlFor={option.uuid}
                              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedColorspec === option.uuid 
                                  ? "border-primary bg-primary/5" 
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <RadioGroupItem value={option.uuid} id={option.uuid} />
                              <div className="flex-1">
                                <p className="font-medium">{option.name}</p>
                              </div>
                              {selectedColorspec === option.uuid && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </Label>
                          ))}
                        </RadioGroup>
                        {parsedOptions.colorspecs.length === 0 && (
                          <p className="text-muted-foreground text-center py-4">No print options available</p>
                        )}
                        <Button 
                          className="w-full mt-4" 
                          onClick={goToNextStep}
                          disabled={!selectedColorspec}
                        >
                          Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Step 2: Quantity */}
                    <AccordionItem value="step-2" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                        <div className="flex items-center gap-3 text-left">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${isStepComplete("step-2") ? "bg-green-500 text-white" : activeStep === "step-2" ? "bg-primary text-white" : "bg-slate-200 text-slate-600"}`}>
                            {isStepComplete("step-2") ? <Check className="h-4 w-4" /> : "2"}
                          </div>
                          <div>
                            <p className="font-semibold">Select Quantity</p>
                            {selectedRunsize && (
                              <p className="text-sm text-muted-foreground font-normal">
                                {parsedOptions.runsizes.find(r => r.uuid === selectedRunsize)?.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {parsedOptions.runsizes.map((option) => (
                            <button
                              key={option.uuid}
                              onClick={() => setSelectedRunsize(option.uuid)}
                              className={`p-4 rounded-lg border-2 text-center transition-all ${
                                selectedRunsize === option.uuid 
                                  ? "border-primary bg-primary/5" 
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <p className="font-bold text-lg">{option.name}</p>
                            </button>
                          ))}
                        </div>
                        {parsedOptions.runsizes.length === 0 && (
                          <p className="text-muted-foreground text-center py-4">No quantity options available</p>
                        )}
                        <Button 
                          className="w-full mt-4" 
                          onClick={goToNextStep}
                          disabled={!selectedRunsize}
                        >
                          Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Step 3: Turnaround Time */}
                    <AccordionItem value="step-3" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                        <div className="flex items-center gap-3 text-left">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${isStepComplete("step-3") ? "bg-green-500 text-white" : activeStep === "step-3" ? "bg-primary text-white" : "bg-slate-200 text-slate-600"}`}>
                            {isStepComplete("step-3") ? <Check className="h-4 w-4" /> : "3"}
                          </div>
                          <div>
                            <p className="font-semibold">Production Time</p>
                            {selectedTurnaround && (
                              <p className="text-sm text-muted-foreground font-normal">
                                {parsedOptions.turnarounds.find(t => t.uuid === selectedTurnaround)?.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {parsedOptions.turnarounds.length > 0 ? (
                          <RadioGroup value={selectedTurnaround} onValueChange={setSelectedTurnaround} className="grid gap-3">
                            {parsedOptions.turnarounds.map((option) => (
                              <Label
                                key={option.uuid}
                                htmlFor={`turn-${option.uuid}`}
                                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  selectedTurnaround === option.uuid 
                                    ? "border-primary bg-primary/5" 
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <RadioGroupItem value={option.uuid} id={`turn-${option.uuid}`} />
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="font-medium">{option.name}</p>
                                </div>
                              </Label>
                            ))}
                          </RadioGroup>
                        ) : (
                          <div className="text-center py-4">
                            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">Standard production: 4-7 business days</p>
                          </div>
                        )}
                        <Button 
                          className="w-full mt-4" 
                          onClick={goToNextStep}
                        >
                          Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Step 4: Upload / Design */}
                    <AccordionItem value="step-4">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                        <div className="flex items-center gap-3 text-left">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${activeStep === "step-4" ? "bg-primary text-white" : "bg-slate-200 text-slate-600"}`}>
                            4
                          </div>
                          <div>
                            <p className="font-semibold">Upload Your Design</p>
                            <p className="text-sm text-muted-foreground font-normal">
                              Upload files or design online
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <Card className="border-2 border-dashed hover:border-primary transition-colors cursor-pointer">
                            <CardContent className="p-6 text-center">
                              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                              <p className="font-semibold">Upload Files</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                PDF, JPG, PNG, EPS, TIFF
                              </p>
                              <Button variant="outline" className="mt-4">
                                Choose Files
                              </Button>
                            </CardContent>
                          </Card>
                          <Card className="border-2 hover:border-primary transition-colors cursor-pointer" asChild>
                            <Link href={`/design-studio?product=${product.id}`}>
                              <CardContent className="p-6 text-center">
                                <Palette className="h-10 w-10 text-primary mx-auto mb-3" />
                                <p className="font-semibold">Design Online</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Use our free design studio
                                </p>
                                <Button className="mt-4">
                                  Start Designing
                                </Button>
                              </CardContent>
                            </Link>
                          </Card>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  /* Tabs Layout - All Options View */
                  <div className="p-6">
                    <Tabs defaultValue="options" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="options">Options</TabsTrigger>
                        <TabsTrigger value="specs">Specs</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                        <TabsTrigger value="faqs">FAQs</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="options" className="space-y-6">
                        {/* Print Type */}
                        {parsedOptions.colorspecs.length > 0 && (
                          <div>
                            <Label className="text-sm font-semibold mb-3 block">Print Type</Label>
                            <Select value={selectedColorspec} onValueChange={setSelectedColorspec}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select print type" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedOptions.colorspecs.map((c) => (
                                  <SelectItem key={c.uuid} value={c.uuid}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Quantity */}
                        {parsedOptions.runsizes.length > 0 && (
                          <div>
                            <Label className="text-sm font-semibold mb-3 block">Quantity</Label>
                            <Select value={selectedRunsize} onValueChange={setSelectedRunsize}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select quantity" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedOptions.runsizes.map((r) => (
                                  <SelectItem key={r.uuid} value={r.uuid}>{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Turnaround */}
                        {parsedOptions.turnarounds.length > 0 && (
                          <div>
                            <Label className="text-sm font-semibold mb-3 block">Turnaround Time</Label>
                            <Select value={selectedTurnaround} onValueChange={setSelectedTurnaround}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select turnaround" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedOptions.turnarounds.map((t) => (
                                  <SelectItem key={t.uuid} value={t.uuid}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="specs">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-muted-foreground">File Format</p>
                              <p className="font-medium">PDF (recommended)</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-muted-foreground">Resolution</p>
                              <p className="font-medium">300 DPI</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-muted-foreground">Color Mode</p>
                              <p className="font-medium">CMYK</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-muted-foreground">Bleed</p>
                              <p className="font-medium">0.125&quot;</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="templates">
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="font-semibold">Download Templates</p>
                          <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Get print-ready templates for your design software
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button variant="outline">PDF Template</Button>
                            <Button variant="outline">AI Template</Button>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="faqs">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="faq-1">
                            <AccordionTrigger>What file formats do you accept?</AccordionTrigger>
                            <AccordionContent>
                              We accept PDF (recommended), JPG, PNG, EPS, and TIFF files. For best results, submit print-ready PDFs at 300 DPI in CMYK color mode.
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="faq-2">
                            <AccordionTrigger>How long is production?</AccordionTrigger>
                            <AccordionContent>
                              Standard production is 4-7 business days. Rush options are available for faster turnaround. Shipping time is additional.
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="faq-3">
                            <AccordionTrigger>Do you offer proofs?</AccordionTrigger>
                            <AccordionContent>
                              Yes, digital proofs are available for all orders. Physical proofs can be requested for an additional fee.
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary & Actions - Sticky on Desktop */}
            <Card className="mt-4 lg:sticky lg:top-4 bg-white shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Price</p>
                    <div className="flex items-baseline gap-2">
                      {priceLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <p className="text-3xl font-bold text-primary">
                          {price ? `$${price.toFixed(2)}` : "Select options"}
                        </p>
                      )}
                      {unitPrice && unitPrice > 0 && (
                        <span className="text-sm text-muted-foreground">
                          (${unitPrice.toFixed(4)}/ea)
                        </span>
                      )}
                    </div>
                    {priceError && <p className="text-xs text-red-500 mt-1">{priceError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="lg"
                      asChild
                    >
                      <Link href={`/design-studio?product=${product.id}`}>
                        <Palette className="h-5 w-5 mr-2" />
                        Design Online
                      </Link>
                    </Button>
                    <Button 
                      size="lg"
                      onClick={handleAddToCart}
                      disabled={!price || priceLoading}
                      className="gap-2"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
