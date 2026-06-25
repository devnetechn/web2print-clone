"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { CheckoutSteps } from "@/components/checkout/checkout-steps"
import { PriceSummary } from "@/components/checkout/price-summary"
import { createClient } from "@/lib/supabase/client"
import { useRequireCustomerAuth } from "@/hooks/use-require-customer-auth"

import { createOrderAndCheckoutSession } from "@/app/actions/orders"
import { validateCoupon } from "@/app/actions/coupons"

// Guard: only initialize Stripe if a publishable key is configured.
// Avoids "Please call Stripe() with your publishable key" crash when the
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY env var is empty (e.g. local 4over testing).
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

// Matches the unwired "Tax Rate (%)" default in admin/settings — there's no
// settings persistence yet, so this is a placeholder until that's wired up.
const TAX_RATE = 0.08875

type PrintCartItem = {
  id: string
  productName: string
  quantity?: number
  price?: number
  size?: string
  colorspec?: string
  turnaround?: string
  productUuid?: string
  colorspecUuid?: string
  runsizeUuid?: string
  turnaroundUuid?: string
  optionUuids?: string[]
  designFile?: { fileName: string; url: string; contentType?: string }
}

type ShippingForm = {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  companyName: string
  mobileNumber: string
  notes: string
}

function CheckoutContent() {
  const router = useRouter()
  const authChecked = useRequireCustomerAuth()
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [cartItems, setCartItems] = useState<PrintCartItem[]>([])
  const [shippingCost, setShippingCost] = useState(0)
  const [couponCode, setCouponCode] = useState("")
  const [couponApplied, setCouponApplied] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [poNumber, setPoNumber] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [customerEmail, setCustomerEmail] = useState<string | undefined>()
  const [shippingForm, setShippingForm] = useState<ShippingForm | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "pickup">("shipping")
  const [multiAddresses, setMultiAddresses] = useState<
    { firstName: string; lastName: string; address: string; city: string; state: string; postalCode: string; quantity: number; country: string }[]
  >([])
  const [ready, setReady] = useState(false)

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

    const isMultiAddress = sessionStorage.getItem("checkout_ship_multiple") === "true"
    const savedMultiAddresses = sessionStorage.getItem("checkout_multi_addresses")

    if (isMultiAddress && savedMultiAddresses) {
      try {
        setMultiAddresses(JSON.parse(savedMultiAddresses))
        // The order still needs a name/contact on file - the multi-shipping
        // page doesn't collect one separately, so the first address's
        // contact stands in for it.
        const first = JSON.parse(savedMultiAddresses)[0]
        setShippingForm({
          firstName: first?.firstName || "",
          lastName: first?.lastName || "",
          address: "", city: "", state: "", postalCode: "", country: "US", companyName: "", mobileNumber: "", notes: "",
        })
      } catch {
        router.replace("/checkout/shipping")
        return
      }
    } else {
      const savedShipping = sessionStorage.getItem("checkout_shipping")
      if (!savedShipping) {
        router.replace("/checkout/shipping")
        return
      }
      try {
        setShippingForm(JSON.parse(savedShipping))
      } catch {
        router.replace("/checkout/shipping")
        return
      }
    }

    const savedDeliveryMethod = sessionStorage.getItem("checkout_delivery_method")
    if (savedDeliveryMethod === "pickup" || savedDeliveryMethod === "shipping") {
      setDeliveryMethod(savedDeliveryMethod)
    }

    setCartItems(items)
    setShippingCost(parseFloat(sessionStorage.getItem("checkout_shipping_cost") || "0"))

    const savedCoupon = sessionStorage.getItem("checkout_coupon")
    if (savedCoupon) {
      try {
        const { code, applied, discount: savedDiscount } = JSON.parse(savedCoupon)
        setCouponCode(code || "")
        setCouponApplied(!!applied)
        setDiscount(savedDiscount || 0)
      } catch {}
    }

    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setCustomerEmail(data.user.email)
    })

    setReady(true)
  }, [router])

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0), 0)
  const tax = Math.max(0, subtotal + shippingCost - discount) * TAX_RATE
  const total = subtotal + shippingCost - discount + tax
  const totalInCents = Math.round(total * 100)

  const handleApplyCoupon = async () => {
    setCouponError(null)
    setApplyingCoupon(true)
    try {
      const result = await validateCoupon(couponCode, subtotal)
      if (result.valid) {
        setCouponApplied(true)
        setDiscount(result.discount!)
        sessionStorage.setItem("checkout_coupon", JSON.stringify({ code: couponCode, applied: true, discount: result.discount }))
      } else {
        setCouponApplied(false)
        setDiscount(0)
        setCouponError(result.error || "Invalid coupon")
      }
    } finally {
      setApplyingCoupon(false)
    }
  }

  const fetchClientSecret = useCallback(async () => {
    if (totalInCents <= 0) {
      throw new Error("Invalid total amount")
    }
    if (!shippingForm) {
      throw new Error("Missing shipping details")
    }
    const secret = await createOrderAndCheckoutSession({
      items: cartItems,
      shippingForm,
      deliveryMethod,
      multiAddresses: multiAddresses.length > 0 ? multiAddresses : undefined,
      subtotal,
      shippingCost,
      discount,
      tax,
      total,
      customerEmail,
      poNumber,
      orderNotes,
    })
    if (!secret) {
      throw new Error("Failed to start checkout")
    }
    return secret
  }, [totalInCents, customerEmail, cartItems, shippingForm, deliveryMethod, multiAddresses, subtotal, shippingCost, discount, tax, total, poNumber, orderNotes])

  const handleComplete = () => {
    setCheckoutComplete(true)
    localStorage.removeItem("cart")
    localStorage.removeItem("print_cart")
    sessionStorage.removeItem("checkout_shipping")
    sessionStorage.removeItem("checkout_shipping_cost")
    sessionStorage.removeItem("checkout_coupon")
    sessionStorage.removeItem("checkout_delivery_method")
    sessionStorage.removeItem("checkout_ship_multiple")
    sessionStorage.removeItem("checkout_multi_addresses")
  }

  if (checkoutComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your order. You will receive a confirmation email shortly with your order details and tracking information.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/products">Continue Shopping</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/account/orders">View Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!authChecked || !ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading checkout...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Payment Details</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>SSL Secured</span>
            </div>
          </div>
          <CheckoutSteps current={3} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                {stripePromise ? (
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{ fetchClientSecret, onComplete: handleComplete }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                ) : (
                  <div className="p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                    <p className="font-medium">Payments are not configured</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable checkout.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Special Instruction for Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input id="poNumber" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="orderNotes">Additional order instructions</Label>
                  <Textarea id="orderNotes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                </div>
                <p className="text-xs text-slate-500">
                  <strong>IMPORTANT:</strong> I have verified that spelling and contents are correct. I am satisfied
                  with the document layout. I understand that my document will print exactly as it appears here. I
                  cannot make any changes once my order is placed and I assume all responsibility for typographical
                  errors.
                </p>
              </CardContent>
            </Card>

            <Button variant="outline" asChild>
              <Link href="/checkout/shipping">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shipping
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            <PriceSummary
              items={cartItems.map((item) => ({ id: item.id, name: item.productName, qty: item.quantity, price: item.price || 0, designFile: item.designFile }))}
              subtotal={subtotal}
              shipping={shippingCost}
              discount={discount}
              tax={tax}
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

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading checkout...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
