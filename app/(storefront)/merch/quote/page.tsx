"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronLeft,
  Upload,
  Check,
  Loader2,
  Shirt,
  Printer,
  Scissors,
  Paintbrush,
} from "lucide-react"
import { PricingCalculator } from "@/components/merch/pricing-calculator"

const printMethodLabels: Record<string, string> = {
  silkscreen: "Screen Printing",
  embroidery: "Embroidery",
  dtg: "DTG Printing",
}

const printMethodIcons: Record<string, any> = {
  silkscreen: Printer,
  embroidery: Scissors,
  dtg: Paintbrush,
}

function QuoteFormContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-filled from product page
  const productId = searchParams.get("product_id") || ""
  const brandName = searchParams.get("brand") || ""
  const styleNumber = searchParams.get("style") || ""
  const productName = searchParams.get("name") || ""
  const printMethod = searchParams.get("print_method") || "silkscreen"
  const locations = searchParams.get("locations")?.split(",") || ["front"]
  const colors = parseInt(searchParams.get("colors") || "1")
  const quantity = parseInt(searchParams.get("quantity") || "0")
  const sizes = searchParams.get("sizes") ? JSON.parse(searchParams.get("sizes")!) : {}

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    company_name: "",
    product_id: productId,
    brand_name: brandName,
    style_number: styleNumber,
    product_name: productName,
    print_method: printMethod,
    print_locations: locations,
    number_of_colors: colors,
    total_quantity: quantity,
    size_breakdown: sizes,
    garment_color: "",
    artwork_notes: "",
    customer_notes: "",
  })

  const [artworkFile, setArtworkFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/merch/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit quote request")
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Quote Request Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for your request. Our team will review your order and send you a 
              detailed quote within 24 hours.
            </p>
            <div className="space-y-3">
              <Link href="/merch">
                <Button className="w-full">Browse More Products</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">Return Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const Icon = printMethodIcons[formData.print_method] || Printer

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/merch" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back to Merch
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Request a Quote</h1>
            <p className="text-muted-foreground">
              Fill out the form below and we&apos;ll send you a detailed quote within 24 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Form Fields */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customer_name">Full Name *</Label>
                        <Input
                          id="customer_name"
                          required
                          value={formData.customer_name}
                          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_name">Company Name</Label>
                        <Input
                          id="company_name"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Acme Corp"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customer_email">Email *</Label>
                        <Input
                          id="customer_email"
                          type="email"
                          required
                          value={formData.customer_email}
                          onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                          placeholder="john@company.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer_phone">Phone</Label>
                        <Input
                          id="customer_phone"
                          type="tel"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {productId ? (
                      <div className="p-4 bg-slate-100 rounded-lg flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                          <Shirt className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge>{brandName}</Badge>
                            <span className="text-sm text-muted-foreground">{styleNumber}</span>
                          </div>
                          <p className="font-medium">{productName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="brand_name">Brand</Label>
                          <Select
                            value={formData.brand_name}
                            onValueChange={(v) => setFormData({ ...formData, brand_name: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select brand" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Gildan">Gildan</SelectItem>
                              <SelectItem value="Next Level">Next Level Apparel</SelectItem>
                              <SelectItem value="BELLA + CANVAS">BELLA + CANVAS</SelectItem>
                              <SelectItem value="American Apparel">American Apparel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="style_number">Style Number</Label>
                          <Input
                            id="style_number"
                            value={formData.style_number}
                            onChange={(e) => setFormData({ ...formData, style_number: e.target.value })}
                            placeholder="e.g., 5000"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="garment_color">Preferred Garment Color</Label>
                      <Input
                        id="garment_color"
                        value={formData.garment_color}
                        onChange={(e) => setFormData({ ...formData, garment_color: e.target.value })}
                        placeholder="e.g., Navy Blue, Black, White"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Print Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Decoration Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-3 block">Print Method</Label>
                      <RadioGroup
                        value={formData.print_method}
                        onValueChange={(v) => setFormData({ ...formData, print_method: v })}
                        className="grid sm:grid-cols-3 gap-3"
                      >
                        {Object.entries(printMethodLabels).map(([key, label]) => {
                          const MethodIcon = printMethodIcons[key]
                          return (
                            <Label
                              key={key}
                              htmlFor={`method-${key}`}
                              className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer ${
                                formData.print_method === key
                                  ? "border-primary bg-primary/5"
                                  : "border-slate-200"
                              }`}
                            >
                              <RadioGroupItem value={key} id={`method-${key}`} />
                              <MethodIcon className="h-5 w-5" />
                              <span className="text-sm font-medium">{label}</span>
                            </Label>
                          )
                        })}
                      </RadioGroup>
                    </div>

                    {formData.print_method === "silkscreen" && (
                      <div>
                        <Label htmlFor="number_of_colors">Number of Colors in Design</Label>
                        <Select
                          value={formData.number_of_colors.toString()}
                          onValueChange={(v) => setFormData({ ...formData, number_of_colors: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n} {n === 1 ? "color" : "colors"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="total_quantity">Total Quantity *</Label>
                      <Input
                        id="total_quantity"
                        type="number"
                        min="1"
                        required
                        value={formData.total_quantity || ""}
                        onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
                        placeholder="Enter total pieces needed"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Artwork */}
                <Card>
                  <CardHeader>
                    <CardTitle>Artwork</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium mb-1">Upload your artwork</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Accepts AI, PDF, PNG, EPS, SVG (max 25MB)
                      </p>
                      <Input
                        type="file"
                        accept=".ai,.pdf,.png,.eps,.svg"
                        onChange={(e) => setArtworkFile(e.target.files?.[0] || null)}
                        className="max-w-xs mx-auto"
                      />
                      {artworkFile && (
                        <p className="text-sm text-green-600 mt-2">
                          Selected: {artworkFile.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="artwork_notes">Artwork Instructions</Label>
                      <Textarea
                        id="artwork_notes"
                        value={formData.artwork_notes}
                        onChange={(e) => setFormData({ ...formData, artwork_notes: e.target.value })}
                        placeholder="Describe your design, colors, placement, or any special instructions..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.customer_notes}
                      onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                      placeholder="Any other details, timeline requirements, or questions..."
                      rows={4}
                    />
                  </CardContent>
                </Card>

                {error && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Quote Request"
                  )}
                </Button>
              </div>

              {/* Right: Order Summary */}
              <div>
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {productId && (
                      <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
                        <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                          <Shirt className="h-6 w-6 text-slate-400" />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{brandName} {styleNumber}</p>
                          <p className="text-muted-foreground">{productName}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Decoration:</span>
                        <span className="flex items-center gap-1">
                          <Icon className="h-4 w-4" />
                          {printMethodLabels[formData.print_method]}
                        </span>
                      </div>
                      {formData.print_locations.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Locations:</span>
                          <span>{formData.print_locations.join(", ")}</span>
                        </div>
                      )}
                      {formData.print_method === "silkscreen" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Colors:</span>
                          <span>{formData.number_of_colors}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-medium">{formData.total_quantity || "—"} pcs</span>
                      </div>
                    </div>

                    <hr />

                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>* Final pricing will be provided in your quote</p>
                      <p>* Quotes typically delivered within 24 hours</p>
                      <p>* No payment required until quote is approved</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Calculator */}
                <div className="mt-6">
                  <PricingCalculator />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function QuotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <QuoteFormContent />
    </Suspense>
  )
}
