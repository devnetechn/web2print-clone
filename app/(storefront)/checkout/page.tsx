"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react"

import { createSimpleCheckoutSession } from "@/app/actions/checkout"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutContent() {
  const searchParams = useSearchParams()
  const totalParam = searchParams.get("total")
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [totalInCents, setTotalInCents] = useState<number>(0)

  useEffect(() => {
    // Get total from URL params or calculate from cart
    if (totalParam) {
      setTotalInCents(parseInt(totalParam))
    } else {
      // Fallback: calculate from localStorage carts
      let total = 0
      
      // Check print_cart (4over products)
      const printCart = localStorage.getItem("print_cart")
      if (printCart) {
        try {
          const items = JSON.parse(printCart)
          total += items.reduce((sum: number, item: any) => {
            return sum + (parseFloat(item.price || "0") * 100)
          }, 0)
        } catch (e) {
          console.error("Failed to parse print cart:", e)
        }
      }
      
      // Check regular cart
      const storedCart = localStorage.getItem("cart")
      if (storedCart) {
        try {
          const items = JSON.parse(storedCart)
          total += items.reduce((sum: number, item: any) => {
            return sum + (parseFloat(item.price || "0") * 100)
          }, 0)
        } catch (e) {
          console.error("Failed to parse cart:", e)
        }
      }
      
      if (total > 0) {
        setTotalInCents(Math.round(total))
      }
    }
  }, [totalParam])

  const fetchClientSecret = useCallback(async () => {
    if (totalInCents <= 0) {
      throw new Error("Invalid total amount")
    }
    return createSimpleCheckoutSession(totalInCents, "Web2Print Order")
  }, [totalInCents])

  const handleComplete = () => {
    setCheckoutComplete(true)
    // Clear all carts after successful checkout
    localStorage.removeItem("cart")
    localStorage.removeItem("print_cart")
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

  if (totalInCents <= 0) {
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
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cart">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cart
                </Link>
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="font-semibold">Secure Checkout</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>SSL Secured</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Order Summary */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order Total</span>
                <span className="text-xl font-bold text-primary">
                  ${(totalInCents / 100).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Embedded Checkout */}
          <Card>
            <CardContent className="p-0">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ 
                  fetchClientSecret,
                  onComplete: handleComplete
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Money-back Guarantee</span>
            </div>
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
