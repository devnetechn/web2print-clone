"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart, Trash2, ArrowRight, Package,
  ShieldCheck, Truck, ArrowLeft, Loader2, Clock, FileText
} from "lucide-react"
import { CheckoutSteps } from "@/components/checkout/checkout-steps"
import { PriceSummary } from "@/components/checkout/price-summary"
import { useRequireCustomerAuth } from "@/hooks/use-require-customer-auth"

type PrintCartItem = {
  id: string
  productType: string
  productName: string
  size?: string
  colorspec?: string
  quantity?: number
  turnaround?: string
  price?: number
  productUuid?: string
  colorspecUuid?: string
  runsizeUuid?: string
  turnaroundUuid?: string
  designFile?: { fileName: string; url: string }
}

export default function CartPage() {
  const router = useRouter()
  const authChecked = useRequireCustomerAuth()
  const [cartItems, setCartItems] = useState<PrintCartItem[]>([])
  const [loading, setLoading] = useState(true)
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
          colorspec: item.colorspec,
          quantity: parseInt(item.quantity) || 1,
          turnaround: item.turnaround,
          price: parseFloat(item.price) || 0,
        })))
      } catch (e) {
        console.error("Failed to parse cart:", e)
      }
    }

    setCartItems(items)
    setLoading(false)
  }, [])

  const removeItem = (itemId: string) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId)
    setCartItems(updatedCart)
    localStorage.setItem("print_cart", JSON.stringify(updatedCart.filter(i => i.productUuid)))
    localStorage.setItem("cart", JSON.stringify(updatedCart.filter(i => !i.productUuid)))
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem("print_cart")
    localStorage.removeItem("cart")
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0), 0)
  const discount = couponApplied ? subtotal * 0.1 : 0

  const handleApplyCoupon = () => {
    if (couponCode.toLowerCase() === "save10") {
      setCouponApplied(true)
    }
  }

  const handleContinue = () => {
    // Shipping cost and tax aren't known yet — collected on the Shipping
    // step next. Persist just the coupon decision so it carries through.
    sessionStorage.setItem("checkout_coupon", JSON.stringify({ code: couponCode, applied: couponApplied }))
    router.push("/checkout/shipping")
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
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="h-8 w-8 text-[#2c327a]" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Shopping Cart</h1>
              <p className="text-slate-600">
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in your cart
              </p>
            </div>
          </div>
          <CheckoutSteps current={1} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {cartItems.length === 0 ? (
          <Card className="max-w-lg mx-auto text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-slate-900">Your cart is empty</h2>
              <p className="text-slate-600 mb-6">Start shopping to add items to your cart</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-[#2c327a] hover:bg-[#1a1f4e]">
                  <Link href="/print">Browse Print Products</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/products">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    All Products
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="h-10 w-10 text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">{item.productName}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.size && <Badge variant="secondary" className="text-xs">{item.size}</Badge>}
                              {item.colorspec && (
                                <Badge variant="secondary" className="text-xs">{item.colorspec.split(" - ")[0]}</Badge>
                              )}
                              {item.quantity && (
                                <Badge variant="secondary" className="text-xs">{item.quantity.toLocaleString()} pcs</Badge>
                              )}
                              {item.turnaround && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {item.turnaround}
                                </Badge>
                              )}
                            </div>
                            {item.designFile && (
                              <a
                                href={item.designFile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#2c327a] hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {item.designFile.fileName}
                              </a>
                            )}
                          </div>
                          <p className="text-xl font-bold text-[#2c327a] whitespace-nowrap">
                            ${(item.price || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                          <Link
                            href={item.productUuid ? `/print/${item.productType}/edit?uuid=${item.productUuid}` : `/print/${item.productType}`}
                          >
                            <Button variant="outline" size="sm">Edit Options</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" asChild>
                  <Link href="/print">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Link>
                </Button>
                <Button variant="ghost" onClick={clearCart} className="text-red-500 hover:text-red-600">
                  Clear Cart
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <PriceSummary
                items={cartItems.map((item) => ({
                  id: item.id,
                  name: item.productName,
                  qty: item.quantity,
                  price: item.price || 0,
                  designFile: item.designFile,
                }))}
                subtotal={subtotal}
                discount={discount}
                couponCode={couponCode}
                onCouponCodeChange={setCouponCode}
                onApplyCoupon={handleApplyCoupon}
                couponApplied={couponApplied}
                footer={
                  <Button className="w-full gap-2 bg-[#e42a27] hover:bg-[#c42020]" size="lg" onClick={handleContinue}>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                }
              />

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <span>Secure 256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <span>Free shipping on orders $100+</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Package className="h-5 w-5 text-purple-600" />
                    <span>Quality guaranteed or reprint</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
