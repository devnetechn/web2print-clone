"use client"

import { useCallback, useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { createMerchCheckoutSession } from "@/app/actions/checkout"
import { getAllShippingRates } from "@/lib/merch/shipping"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, Truck, AlertCircle } from "lucide-react"
import Link from "next/link"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutInner() {
  const params = useSearchParams()

  const productName = params.get("product") || "Custom Apparel"
  const productId = params.get("productId") || "g-5000" // fallback to Gildan 5000
  const garmentTotal = parseFloat(params.get("garment") || "0")
  const printTotal   = parseFloat(params.get("print") || "0")
  const setupFee     = parseFloat(params.get("setup") || "0")
  const quantity     = parseInt(params.get("qty") || "1")
  const pricePerPiece = parseFloat(params.get("ppp") || "0")

  const [shipping, setShipping] = useState<"standard" | "express" | "overnight">("standard")
  const [zipCode, setZipCode] = useState("")
  const [ready, setReady] = useState(false)
  const [shippingRates, setShippingRates] = useState<ReturnType<typeof getAllShippingRates> | null>(null)

  // Calculate real shipping rates based on weight
  useEffect(() => {
    const rates = getAllShippingRates(productId, quantity)
    setShippingRates(rates)
  }, [productId, quantity])

  const selectedRate = shippingRates?.[shipping]
  const orderSubtotal = garmentTotal + printTotal + setupFee
  const shippingCost = selectedRate?.cost || 14.99
  const orderTotal = orderSubtotal + shippingCost

  // Only show Stripe once shipping is selected and user clicks Proceed
  const fetchClientSecret = useCallback(() => {
    return createMerchCheckoutSession({
      productName,
      garmentPriceInCents: Math.round(garmentTotal * 100),
      printPriceInCents: Math.round(printTotal * 100),
      setupFeeInCents: Math.round(setupFee * 100),
      quantity,
      shippingOption: shipping,
    })
  }, [productName, garmentTotal, printTotal, setupFee, quantity, shipping])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/merch`} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm">
            <ChevronLeft className="h-4 w-4" /> Back to Shop
          </Link>
          <h1 className="text-lg font-bold">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid md:grid-cols-5 gap-8">

          {/* LEFT: Order Summary + Shipping */}
          <div className="md:col-span-2 space-y-4">

            {/* Order Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{productName}</span>
                  <span>{quantity} pcs</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Garments</span>
                  <span>${garmentTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Printing</span>
                  <span>${printTotal.toFixed(2)}</span>
                </div>
                {setupFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Setup Fee</span>
                    <span>${setupFee.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span>${orderSubtotal.toFixed(2)}</span>
                </div>
                {selectedRate && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping ({shipping.charAt(0).toUpperCase() + shipping.slice(1)})</span>
                      <span>${shippingCost.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-400 text-right">
                      {selectedRate.days} • {(selectedRate.weight).toFixed(1)} oz
                    </p>
                  </>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-green-700">${orderTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-slate-500 text-center pt-1">
                  ${pricePerPiece.toFixed(2)} per piece
                </p>
              </CardContent>
            </Card>

            {/* Shipping Methods */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Shipping Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shippingRates && (
                  <>
                    <button
                      onClick={() => { setShipping("standard"); setReady(false) }}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        shipping === "standard"
                          ? "border-[#e42a27] bg-red-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">Standard</p>
                          <p className="text-xs text-slate-500">{shippingRates.standard.days}</p>
                        </div>
                        <span className="font-bold text-sm">${shippingRates.standard.cost.toFixed(2)}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setShipping("express"); setReady(false) }}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        shipping === "express"
                          ? "border-[#e42a27] bg-red-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">Express</p>
                          <p className="text-xs text-slate-500">{shippingRates.express.days}</p>
                        </div>
                        <span className="font-bold text-sm">${shippingRates.express.cost.toFixed(2)}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setShipping("overnight"); setReady(false) }}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        shipping === "overnight"
                          ? "border-[#e42a27] bg-red-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">Overnight</p>
                          <p className="text-xs text-slate-500">{shippingRates.overnight.days}</p>
                        </div>
                        <span className="font-bold text-sm">${shippingRates.overnight.cost.toFixed(2)}</span>
                      </div>
                    </button>
                  </>
                )}

                {!ready && (
                  <Button
                    className="w-full mt-3 bg-[#e42a27] hover:bg-[#c51f1f] text-white"
                    size="lg"
                    onClick={() => setReady(true)}
                  >
                    Proceed to Payment
                  </Button>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT: Stripe Embedded Checkout */}
          <div className="md:col-span-3">
            {ready ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{ fetchClientSecret }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[400px] border-dashed">
                <div className="text-center text-slate-400">
                  <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a shipping method</p>
                  <p className="text-sm">then click Proceed to Payment</p>
                </div>
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default function MerchCheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  )
}
