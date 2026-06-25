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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, ArrowRight, Loader2, MapPin, Store } from "lucide-react"

// Matches the contact info shown in the site footer — the only pickup
// location until Boss Wayne gives us more than one to choose from.
const PICKUP_LOCATION = {
  name: "Web2Print USA",
  address: "7901 4th St. N #27125, St. Petersburg, FL 33702",
}
import { CheckoutSteps } from "@/components/checkout/checkout-steps"
import { PriceSummary } from "@/components/checkout/price-summary"
import { useRequireCustomerAuth } from "@/hooks/use-require-customer-auth"
import { validateCoupon } from "@/app/actions/coupons"

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
  designFile?: { fileName: string; url: string; contentType?: string }
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
  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "pickup">("shipping")
  const [error, setError] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [couponApplied, setCouponApplied] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [shipMultiple, setShipMultiple] = useState(false)
  const [multiAddresses, setMultiAddresses] = useState<
    { firstName: string; lastName: string; address: string; city: string; state: string; postalCode: string; quantity: number }[]
  >([])

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
        const { code, applied, discount: savedDiscount } = JSON.parse(savedCoupon)
        setCouponCode(code || "")
        setCouponApplied(!!applied)
        setDiscount(savedDiscount || 0)
      } catch {}
    }

    const savedShipping = sessionStorage.getItem("checkout_shipping")
    if (savedShipping) {
      try {
        setForm({ ...EMPTY_FORM, ...JSON.parse(savedShipping) })
      } catch {}
    }

    const savedDeliveryMethod = sessionStorage.getItem("checkout_delivery_method")
    if (savedDeliveryMethod === "pickup" || savedDeliveryMethod === "shipping") {
      setDeliveryMethod(savedDeliveryMethod)
    }

    if (sessionStorage.getItem("checkout_ship_multiple") === "true") {
      setShipMultiple(true)
      try {
        setMultiAddresses(JSON.parse(sessionStorage.getItem("checkout_multi_addresses") || "[]"))
      } catch {}
    }

    setLoading(false)
  }, [router])

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0), 0)

  const handleApplyCoupon = async () => {
    setCouponError(null)
    setApplyingCoupon(true)
    try {
      const result = await validateCoupon(couponCode, subtotal)
      if (result.valid) {
        setCouponApplied(true)
        setDiscount(result.discount!)
      } else {
        setCouponApplied(false)
        setDiscount(0)
        setCouponError(result.error || "Invalid coupon")
      }
    } finally {
      setApplyingCoupon(false)
    }
  }

  const updateField = (field: keyof ShippingForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleMultiContinue = () => {
    // The shipping cost was already estimated (flat rate × address count)
    // back on the multi-shipping page, and the addresses themselves are
    // already in sessionStorage from there - this step just carries the
    // coupon decision forward, same as the single-address path.
    sessionStorage.setItem("checkout_coupon", JSON.stringify({ code: couponCode, applied: couponApplied, discount }))
    router.push("/checkout")
  }

  const handleContinue = async () => {
    setError(null)
    // Picking up in person skips the shipping address entirely — only
    // contact info (name + mobile) is still needed for the order record.
    const required: (keyof ShippingForm)[] =
      deliveryMethod === "pickup"
        ? ["firstName", "lastName", "mobileNumber"]
        : ["firstName", "lastName", "address", "state", "city", "postalCode", "mobileNumber"]
    const missing = required.filter((field) => !form[field].trim())
    if (missing.length > 0) {
      setError("Please fill in all required fields.")
      return
    }

    setSubmitting(true)

    if (deliveryMethod === "pickup") {
      sessionStorage.setItem("checkout_shipping", JSON.stringify(form))
      sessionStorage.setItem("checkout_coupon", JSON.stringify({ code: couponCode, applied: couponApplied, discount }))
      sessionStorage.setItem("checkout_shipping_cost", "0")
      sessionStorage.setItem("checkout_delivery_method", "pickup")
      router.push("/checkout")
      return
    }

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
    sessionStorage.setItem("checkout_coupon", JSON.stringify({ code: couponCode, applied: couponApplied, discount }))
    sessionStorage.setItem("checkout_shipping_cost", String(shippingCost))
    sessionStorage.setItem("checkout_delivery_method", "shipping")

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
            {shipMultiple ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Multiple Shipping Addresses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {multiAddresses.map((addr, i) => (
                    <div key={i} className="border-b pb-3 last:border-0 last:pb-0">
                      <p className="font-medium text-slate-900">
                        {addr.firstName} {addr.lastName} — {addr.quantity.toLocaleString()} units
                      </p>
                      <p className="text-sm text-slate-600">
                        {addr.address}, {addr.city}, {addr.state} {addr.postalCode}
                      </p>
                    </div>
                  ))}
                  <Link href="/checkout/multi-shipping" className="inline-block text-sm text-[#2c327a] hover:underline">
                    Edit addresses
                  </Link>
                </CardContent>
              </Card>
            ) : (
            <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Shipping</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={deliveryMethod}
                  onValueChange={(v) => setDeliveryMethod(v as "shipping" | "pickup")}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pickup" id="delivery-pickup" />
                    <Label htmlFor="delivery-pickup" className="font-normal cursor-pointer">Pickup</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="shipping" id="delivery-shipping" />
                    <Label htmlFor="delivery-shipping" className="font-normal cursor-pointer">Shipping</Label>
                  </div>
                </RadioGroup>

                {deliveryMethod === "pickup" && (
                  <div className="mt-4 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Store className="h-5 w-5 text-[#2c327a]" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{PICKUP_LOCATION.name} — Pick up</p>
                        <p className="text-xs text-slate-500">{PICKUP_LOCATION.address}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-green-600">$0.00</span>
                  </div>
                )}
              </CardContent>
            </Card>

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
                {deliveryMethod === "shipping" && (
                  <>
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
                  </>
                )}
                <div>
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input id="mobileNumber" type="tel" value={form.mobileNumber} onChange={(e) => updateField("mobileNumber")(e.target.value)} />
                </div>
                {deliveryMethod === "shipping" && (
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
                )}
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
            </>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-between">
              <Button variant="outline" asChild>
                <Link href="/cart">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cart
                </Link>
              </Button>
              <Button
                className="gap-2 bg-[#e42a27] hover:bg-[#c42020]"
                size="lg"
                onClick={shipMultiple ? handleMultiContinue : handleContinue}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue<ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <PriceSummary
              items={cartItems.map((item) => ({ id: item.id, name: item.productName, qty: item.quantity, price: item.price || 0, designFile: item.designFile }))}
              subtotal={subtotal}
              discount={discount}
              couponCode={couponCode}
              onCouponCodeChange={setCouponCode}
              onApplyCoupon={handleApplyCoupon}
              couponApplied={couponApplied}
              couponError={couponError}
              applyingCoupon={applyingCoupon}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
