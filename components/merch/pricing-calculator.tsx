"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { ArrowRight, Calculator, Clock } from "lucide-react"
import {
  calculateScreenPrintPrice,
  calculateEmbroideryPrice,
  applyMarkup,
} from "@/lib/merch/pricing"

const MARKUP_PERCENT = 100

export function PricingCalculator() {
  const [printMethod, setPrintMethod] = useState<'screenprint' | 'embroidery' | 'dtf'>('screenprint')
  const [quantity, setQuantity] = useState(48)
  const [frontColors, setFrontColors] = useState(2)
  const [backColors, setBackColors] = useState(0)
  const [sleeveColors, setSleeveColors] = useState(0)
  const [stitchCount, setStitchCount] = useState(5000)
  const [embLocations, setEmbLocations] = useState(1)
  // Average garment cost - not shown to customers
  const garmentCost = 4.00
  const [garmentType, setGarmentType] = useState("standard")
  const [turnaround, setTurnaround] = useState("standard")

  const pricing = useMemo(() => {
    const totalGarmentCost = garmentCost * quantity
    let printCost = 0
    let setupCost = 0
    let error: string | undefined

    if (printMethod === 'screenprint') {
      // Calculate total colors and locations
      const maxColors = Math.max(frontColors, backColors, sleeveColors)
      const locations = (frontColors > 0 ? 1 : 0) + (backColors > 0 ? 1 : 0) + (sleeveColors > 0 ? 1 : 0)
      
      if (locations === 0) {
        return { error: "Select at least one print location" }
      }

      const result = calculateScreenPrintPrice({
        quantity,
        colors: maxColors,
        locations,
        garmentType: garmentType as 'standard' | 'hoodie' | 'jacket' | 'poly' | 'pocket',
        includeSetup: true,
      })
      
      if (result.error) {
        error = result.error
      } else {
        printCost = result.totalPrintCost - result.setupCost
        setupCost = result.setupCost
      }
    } else if (printMethod === 'embroidery') {
      const result = calculateEmbroideryPrice({
        quantity,
        stitchCount,
        locations: embLocations,
        includeDigitizing: true,
        is3dPuff: false,
      })
      if (result.error) {
        error = result.error
      } else {
        printCost = result.totalEmbroideryyCost - result.setupCost
        setupCost = result.setupCost
      }
    } else if (printMethod === 'dtf') {
      // DTF: $5.45 per piece (small), $7.25 (large) - use average
      const dtfCostPerPiece = 6.35 // average
      printCost = dtfCostPerPiece * quantity
      setupCost = 25 // DTF setup fee
    }

    if (error) return { error }

    let subtotal = totalGarmentCost + printCost + setupCost
    
    // Turnaround upcharges
    let turnaroundFee = 0
    if (turnaround === "rush") {
      turnaroundFee = subtotal * 0.15
    } else if (turnaround === "next-day") {
      turnaroundFee = subtotal * 0.30
    }
    
    subtotal += turnaroundFee
    const customerPrice = applyMarkup(subtotal, MARKUP_PERCENT)
    const pricePerPiece = customerPrice / quantity

    return {
      garmentCost: totalGarmentCost,
      printCost,
      setupCost,
      turnaroundFee,
      subtotal,
      customerPrice,
      pricePerPiece,
    }
  }, [printMethod, quantity, frontColors, backColors, sleeveColors, stitchCount, embLocations, garmentCost, garmentType, turnaround])

  return (
    <Card className="bg-white border-2">
      <CardHeader className="pb-4 bg-slate-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Instant Price Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        
        {/* Step 1: Decoration Type */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">1. Decoration Type</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPrintMethod('screenprint')}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                printMethod === 'screenprint'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-semibold">Screen Print</p>
              <p className="text-xs text-muted-foreground mt-1">24 pc min</p>
            </button>
            <button
              onClick={() => setPrintMethod('embroidery')}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                printMethod === 'embroidery'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-semibold">Embroidery</p>
              <p className="text-xs text-muted-foreground mt-1">6 pc min</p>
            </button>
            <button
              onClick={() => setPrintMethod('dtf')}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                printMethod === 'dtf'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-semibold">DTF Print</p>
              <p className="text-xs text-muted-foreground mt-1">No min</p>
            </button>
          </div>
        </div>

        <Separator />

        {/* Step 2: Quantity */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">2. Quantity</Label>
          <div className="flex gap-2 mb-3">
            {[24, 48, 72, 144, 250].map((q) => (
              <Button
                key={q}
                variant={quantity === q ? "default" : "outline"}
                size="sm"
                onClick={() => setQuantity(q)}
                className="flex-1"
              >
                {q}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Custom:</span>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20"
              min={1}
            />
          </div>
        </div>

        <Separator />

        {/* Step 3: Design Details - Screen Print */}
        {printMethod === 'screenprint' && (
          <div>
            <Label className="text-sm font-semibold mb-3 block">3. Print Colors by Location</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">FRONT</Label>
                <Select value={frontColors.toString()} onValueChange={(v) => setFrontColors(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 Color</SelectItem>
                    <SelectItem value="2">2 Colors</SelectItem>
                    <SelectItem value="3">3 Colors</SelectItem>
                    <SelectItem value="4">4 Colors</SelectItem>
                    <SelectItem value="5">5 Colors</SelectItem>
                    <SelectItem value="6">6 Colors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">BACK</Label>
                <Select value={backColors.toString()} onValueChange={(v) => setBackColors(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 Color</SelectItem>
                    <SelectItem value="2">2 Colors</SelectItem>
                    <SelectItem value="3">3 Colors</SelectItem>
                    <SelectItem value="4">4 Colors</SelectItem>
                    <SelectItem value="5">5 Colors</SelectItem>
                    <SelectItem value="6">6 Colors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">SLEEVE</Label>
                <Select value={sleeveColors.toString()} onValueChange={(v) => setSleeveColors(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 Color</SelectItem>
                    <SelectItem value="2">2 Colors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground mb-1 block">GARMENT TYPE</Label>
              <Select value={garmentType} onValueChange={setGarmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard T-Shirt</SelectItem>
                  <SelectItem value="hoodie">Hoodie/Sweatshirt (+$1.10)</SelectItem>
                  <SelectItem value="jacket">Jacket (+$1.20)</SelectItem>
                  <SelectItem value="poly">Poly/Performance (+$0.15)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Design Details - Embroidery */}
        {printMethod === 'embroidery' && (
          <div>
            <Label className="text-sm font-semibold mb-3 block">3. Embroidery Details</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">STITCH COUNT</Label>
                <Select value={stitchCount.toString()} onValueChange={(v) => setStitchCount(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3000">Up to 3K (Small)</SelectItem>
                    <SelectItem value="5000">Up to 5K (Standard)</SelectItem>
                    <SelectItem value="8000">Up to 8K (Large)</SelectItem>
                    <SelectItem value="10000">Up to 10K (XL)</SelectItem>
                    <SelectItem value="15000">Up to 15K (Full)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">LOCATIONS</Label>
                <Select value={embLocations.toString()} onValueChange={(v) => setEmbLocations(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Location</SelectItem>
                    <SelectItem value="2">2 Locations</SelectItem>
                    <SelectItem value="3">3 Locations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Step 4: Turnaround Time */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">4. Turnaround Time</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTurnaround('standard')}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                turnaround === 'standard'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Clock className="h-4 w-4 mx-auto mb-1 text-slate-600" />
              <p className="font-medium text-sm">Standard</p>
              <p className="text-xs text-muted-foreground">5-7 days</p>
            </button>
            <button
              onClick={() => setTurnaround('rush')}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                turnaround === 'rush'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Clock className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <p className="font-medium text-sm">Rush</p>
              <p className="text-xs text-orange-600">3-5 days (+15%)</p>
            </button>
            <button
              onClick={() => setTurnaround('next-day')}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                turnaround === 'next-day'
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
                >
                  <Clock className="h-4 w-4 mx-auto mb-1 text-red-500" />
                  <p className="font-medium text-sm">Next Day</p>
                  <p className="text-xs text-red-600">24 hrs (+30%)</p>
                </button>
              </div>
            </div>

        <Separator />

        {/* Results */}
        {pricing.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{pricing.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-xl p-5">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Per Piece</p>
                  <p className="text-3xl font-bold">${pricing.pricePerPiece?.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Order Total</p>
                  <p className="text-2xl font-bold">${pricing.customerPrice?.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-700 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Garments ({quantity} x ${garmentCost.toFixed(2)})</span>
                  <span>${pricing.garmentCost?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{printMethod === 'screenprint' ? 'Screen printing' : 'Embroidery'}</span>
                  <span>${pricing.printCost?.toFixed(2)}</span>
                </div>
                {printMethod === 'screenprint' && (
                  <div className="text-xs text-slate-500 ml-4 mt-2 space-y-1 border-l border-slate-600 pl-3">
                    <p>Per-Color Breakdown:</p>
                    {frontColors > 0 && <p>• Front: {frontColors} color{frontColors > 1 ? 's' : ''}</p>}
                    {backColors > 0 && <p>• Back: {backColors} color{backColors > 1 ? 's' : ''}</p>}
                    {sleeveColors > 0 && <p>• Sleeves: {sleeveColors} color{sleeveColors > 1 ? 's' : ''}</p>}
                    {(frontColors > 0 && backColors > 0) || (frontColors > 0 && sleeveColors > 0) || (backColors > 0 && sleeveColors > 0) ? (
                      <p className="text-slate-400 mt-1">Flash charge: Included</p>
                    ) : null}
                  </div>
                )}
                {pricing.setupCost > 0 && (
                  <div className="flex justify-between text-slate-400 mt-2">
                    <span>Setup fees</span>
                    <span>${pricing.setupCost.toFixed(2)}</span>
                  </div>
                )}
                {pricing.turnaroundFee > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>{turnaround === 'rush' ? 'Rush' : 'Next-day'} fee</span>
                    <span>+${pricing.turnaroundFee.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <Button className="w-full" size="lg">
              Start Your Order
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Estimates based on standard designs. Final price confirmed after artwork review.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
