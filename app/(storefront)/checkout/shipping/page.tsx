"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Loader2, MapPin } from "lucide-react"
import { CheckoutSteps } from "@/components/checkout/checkout-steps"
import { PriceSummary } from "@/components/checkout/price-summary"
import { useRequireCustomerAuth } from "@/hooks/use-require-customer-auth"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

type PrintCartItem = {
  id: string
  productType: string
  productName: string
  quantity?: number
  price?: number
  productUuid?: string
  colorspecUuid?: string
  runsizeUuid?: string
  turnaroundUuid?: string
}

type ShippingForm = {
  firstName: string
  lastName: string
  address: string
  state: string
  city: string
  postalCode: string
  mobileNumber: string
  country: string
  companyName: string
  notes: string
}

const EMPTY_FORM: ShippingForm = {
  firstName: "",
  lastName: "",
  address: "",
  state: "",
  city: "",
  postalCode: "",
  mobileNumber: "",
  country: "US",
  companyName: "",
  notes: "",
}

export default function ShippingStepPage() {
  const router = useRouter()
  const authChecked = useRequireCustomerAuth()
  const [cartItems, setCartItems] = useState<PrintCartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [couponApplied, setCouponApplied] = useState(false)

  useEffect(() => {
    const printCart = localStorage.getItem("print_cart")
    const regularCart = localStorage.getItem("cart")
    const items: PrintCartItem[] = []

    if (printCart) {
      try {
        items.push(...JSON.parse(printCart))
      } catch (e) {
        console.error("Failed to parse print cart:", e)
      }
    }
    if (regularCart) {
      try {
        const parsed = JSON.parse(regularCart)
        items.push(...parsed.map((item: any, i: number) => ({
          id: item.id || `legacy-${i}`,
          productType: item.category || "print",
          productName: item.productName,
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        })))
      } catch (e) {
        console.error("Failed to parse cart:", e)
      }
    }

    if (items.length === 0) {
      router.replace("/cart")
      return
    }

    setCartItems(items)

    const savedCoupon = sessionStorage.getItem("checkout_coupon")
    if (savedCoupon) {
      try {
        const { code, applied } = JSON.parse(savedCoupon)
        setCouponCode(code || "")
        setCouponApplied(!!applied)
      } catch {}
    }

    const savedShipping = sessionStorage.getItem("checkout_shipping")
    if (savedShipping) {
      try {
        setForm({ ...EMPTY_FORM, ...JSON.parse(savedShipping) })
      } catch {}
    }

    setLoading(false)
  }, [router])

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0), 0)
  const discount = couponApplied ? subtotal * 0.1 : 0

  const handleApplyCoupon = () => {
    if (couponCode.toLowerCase() === "save10") {
      setCouponApplied(true)
    }
  }

  const updateField = (field: keyof ShippingForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleContinue = async () => {
    setError(null)
    const required: (keyof ShippingForm)[] = ["firstName", "lastName", "address", "state", "city", "postalCode", "mobileNumber"]
    const missing = required.filter((field) => !form[field].trim())
    if (missing.length > 0) {
      setError("Please fill in all required fields.")
      return
    }

    setSubmitting(true)

    // Reuse the 4over shipping-quote endpoint when the cart has a 4over
    // item (matches the rate the customer will actually be charged);
    // otherwise fall back to the same flat-rate logic the old single-page
    // cart used, so behavior doesn't regress for non-4over carts.
    let shippingCost = subtotal > 100 ? 0 : 9.99
    const fourOverItem = cartItems.find((item) => item.productUuid && item.colorspecUuid && item.runsizeUuid && item.turnaroundUuid)
    if (fourOverItem) {
      try {
        const res = await fetch("/api/4over/shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_info: {
              product_uuid: fourOverItem.productUuid,
              runsize_uuid: fourOverItem.runsizeUuid,
              turnaround_uuid: fourOverItem.turnaroundUuid,
              colorspec_uuid: fourOverItem.colorspecUuid,
              sets: 1,
            },
            shipping_address: {
              address: form.address,
              city: form.city,
              state: form.state,
              country: form.country,
              zipcode: form.postalCode,
            },
            bypass_address_validation: false,
          }),
        })
        const data = await res.json()
        const options = data.options || data.shipping_options
        if (options?.length > 0) {
          shippingCost = parseFloat(options[0].price || options[0].rate || options[0].shipping_price || "0") || shippingCost
        }
      } catch (e) {
        console.error("Shipping quote error, using flat rate:", e)
      }
    }

    sessionStorage.setItem("checkout_shipping", JSON.stringify(form))
    sessionStorage.setItem("checkout_coupon", JSON.stringify({ code: couponCode, applied: couponApplied }))
    sessionStorage.setItem("checkout_shipping_cost", String(shippingCost))

    router.push("/checkout")
  }

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Shipping</h1>
          <CheckoutSteps current={2} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5 text-[#2c327a]" />
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={form.firstName} onChange={(e) => updateField("firstName")(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={form.lastName} onChange={(e) => updateField("lastName")(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address Line 1 *</Label>
                  <Input id="address" value={form.address} onChange={(e) => updateField("address")(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" value={form.city} onChange={(e) => updateField("city")(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select value={form.state} onValueChange={updateField("state")}>
                    <SelectTrigger id="state" className="w-full">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input id="postalCode" value={form.postalCode} onChange={(e) => updateField("postalCode")(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input id="mobileNumber" type="tel" value={form.mobileNumber} onChange={(e) => updateField("mobileNumber")(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select value={form.country} onValueChange={updateField("country")}>
                    <SelectTrigger id="country" className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={form.companyName} onChange={(e) => updateField("companyName")(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="notes">Customer Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => updateField("notes")(e.target.value)} />
              </CardContent>
            </Card>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-between">
              <Button variant="outline" asChild>
                <Link href="/cart">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cart
                </Link>
              </Button>
              <Button className="gap-2 bg-[#e42a27] hover:bg-[#c42020]" size="lg" onClick={handleContinue} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue<ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <PriceSummary
              items={cartItems.map((item) => ({ id: item.id, name: item.productName, qty: item.quantity, price: item.price || 0 }))}
              subtotal={subtotal}
              discount={discount}
              couponCode={couponCode}
              onCouponCodeChange={setCouponCode}
              onApplyCoupon={handleApplyCoupon}
              couponApplied={couponApplied}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
