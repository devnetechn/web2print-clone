"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  ShoppingCart, Trash2, ArrowRight, Package, 
  ShieldCheck, Truck, ArrowLeft, Loader2, MapPin, Clock
} from "lucide-react"

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
}

type ShippingOption = {
  carrier: string
  service: string
  price: number
  estimatedDays: number
  facility?: string
}

type ShippingAddress = {
  address: string
  address2: string
  city: string
  state: string
  zipcode: string
  country: string
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<PrintCartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)
  
  // Shipping state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    address: "",
    address2: "",
    city: "",
    state: "",
    zipcode: "",
    country: "US"
  })
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState<string>("")
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [showShippingForm, setShowShippingForm] = useState(false)

  // Load both cart types
  useEffect(() => {
    // Load print cart (from configurator)
    const printCart = localStorage.getItem("print_cart")
    // Load regular cart
    const regularCart = localStorage.getItem("cart")
    
    const items: PrintCartItem[] = []
    
    if (printCart) {
      try {
        const parsed = JSON.parse(printCart)
        items.push(...parsed)
      } catch (e) {
        console.error("Failed to parse print cart:", e)
      }
    }
    
    if (regularCart) {
      try {
        const parsed = JSON.parse(regularCart)
        // Convert regular cart format to print cart format
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
        console.error("Failed to parse regular cart:", e)
      }
    }
    
    setCartItems(items)
    setLoading(false)
  }, [])

  const removeItem = (itemId: string) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId)
    setCartItems(updatedCart)
    // Update both storage locations
    localStorage.setItem("print_cart", JSON.stringify(updatedCart.filter(i => i.productUuid)))
    localStorage.setItem("cart", JSON.stringify(updatedCart.filter(i => !i.productUuid)))
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem("print_cart")
    localStorage.removeItem("cart")
  }

  // Fetch shipping quotes from 4over
  const fetchShippingQuotes = async () => {
    if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipcode) {
      setShippingError("Please fill in all shipping address fields")
      return
    }
    
    // Find first item with 4over product info
    const fourOverItem = cartItems.find(item => item.productUuid && item.colorspecUuid && item.runsizeUuid && item.turnaroundUuid)
    
    if (!fourOverItem) {
      // Use flat rate shipping for non-4over items
      setShippingOptions([
        { carrier: "USPS", service: "Priority Mail", price: 12.99, estimatedDays: 5 },
        { carrier: "UPS", service: "Ground", price: 9.99, estimatedDays: 7 },
        { carrier: "FedEx", service: "Express", price: 24.99, estimatedDays: 2 },
      ])
      setSelectedShipping("UPS-Ground")
      return
    }
    
    setShippingLoading(true)
    setShippingError(null)
    
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
            sets: 1
          },
          shipping_address: {
            address: shippingAddress.address,
            address2: shippingAddress.address2 || undefined,
            city: shippingAddress.city,
            state: shippingAddress.state,
            country: shippingAddress.country,
            zipcode: shippingAddress.zipcode
          },
          bypass_address_validation: false
        })
      })
      
      const data = await res.json()
      
      if (data.success && data.options) {
        const options: ShippingOption[] = data.options.map((opt: any) => ({
          carrier: opt.carrier || "Standard",
          service: opt.service || opt.name || "Shipping",
          price: parseFloat(opt.price || opt.rate || "0"),
          estimatedDays: opt.estimated_days || opt.days || 5,
          facility: opt.facility
        }))
        setShippingOptions(options)
        if (options.length > 0) {
          setSelectedShipping(`${options[0].carrier}-${options[0].service}`)
        }
      } else if (data.shipping_options) {
        // Handle alternative response format
        const options: ShippingOption[] = data.shipping_options.map((opt: any) => ({
          carrier: opt.carrier_name || opt.carrier || "Standard",
          service: opt.service_name || opt.service || "Shipping",
          price: parseFloat(opt.shipping_price || opt.price || "0"),
          estimatedDays: parseInt(opt.delivery_days || "5"),
          facility: opt.ship_from_facility
        }))
        setShippingOptions(options)
        if (options.length > 0) {
          setSelectedShipping(`${options[0].carrier}-${options[0].service}`)
        }
      } else {
        // Fallback to standard shipping options
        setShippingOptions([
          { carrier: "Standard", service: "Ground", price: 9.99, estimatedDays: 7 },
          { carrier: "Priority", service: "2-Day", price: 19.99, estimatedDays: 2 },
          { carrier: "Express", service: "Overnight", price: 34.99, estimatedDays: 1 },
        ])
        setSelectedShipping("Standard-Ground")
      }
    } catch (e) {
      console.error("Shipping quote error:", e)
      setShippingError("Unable to fetch shipping rates. Using standard rates.")
      setShippingOptions([
        { carrier: "Standard", service: "Ground", price: 9.99, estimatedDays: 7 },
        { carrier: "Priority", service: "2-Day", price: 19.99, estimatedDays: 2 },
      ])
      setSelectedShipping("Standard-Ground")
    } finally {
      setShippingLoading(false)
    }
  }

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.price || 0)
  }, 0)

  const discount = promoApplied ? subtotal * 0.1 : 0
  
  const selectedShippingOption = shippingOptions.find(
    opt => `${opt.carrier}-${opt.service}` === selectedShipping
  )
  const shippingCost = selectedShippingOption?.price || (subtotal > 100 ? 0 : 9.99)
  
  const total = subtotal - discount + shippingCost

  if (loading) {
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
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-[#2c327a]" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Shopping Cart</h1>
              <p className="text-slate-600">
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in your cart
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {cartItems.length === 0 ? (
          <Card className="max-w-lg mx-auto text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-slate-900">Your cart is empty</h2>
              <p className="text-slate-600 mb-6">
                Start shopping to add items to your cart
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-[#2c327a] hover:bg-[#1a1f4e]">
                  <Link href="/print">
                    Browse Print Products
                  </Link>
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
            {/* Cart Items */}
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
                              {item.size && (
                                <Badge variant="secondary" className="text-xs">{item.size}</Badge>
                              )}
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
                          <Link href={`/print/${item.productType}`}>
                            <Button variant="outline" size="sm">Edit Options</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Shipping Address Form */}
              <Card>
                <CardHeader className="cursor-pointer" onClick={() => setShowShippingForm(!showShippingForm)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-[#2c327a]" />
                      <CardTitle className="text-base">Shipping Address</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm">
                      {showShippingForm ? "Hide" : "Enter Address"}
                    </Button>
                  </div>
                </CardHeader>
                {showShippingForm && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          placeholder="123 Main Street"
                          value={shippingAddress.address}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="address2">Address Line 2 (optional)</Label>
                        <Input
                          id="address2"
                          placeholder="Apt, Suite, Unit, etc."
                          value={shippingAddress.address2}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="Los Angeles"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            placeholder="CA"
                            maxLength={2}
                            value={shippingAddress.state}
                            onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipcode">ZIP Code</Label>
                          <Input
                            id="zipcode"
                            placeholder="90001"
                            value={shippingAddress.zipcode}
                            onChange={(e) => setShippingAddress(prev => ({ ...prev, zipcode: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={fetchShippingQuotes} 
                      disabled={shippingLoading}
                      className="w-full bg-[#2c327a] hover:bg-[#1a1f4e]"
                    >
                      {shippingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Getting Shipping Rates...
                        </>
                      ) : (
                        <>
                          <Truck className="h-4 w-4 mr-2" />
                          Get Shipping Rates
                        </>
                      )}
                    </Button>
                    {shippingError && (
                      <p className="text-sm text-amber-600">{shippingError}</p>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Shipping Options */}
              {shippingOptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-5 w-5 text-[#2c327a]" />
                      Select Shipping Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={selectedShipping} onValueChange={setSelectedShipping} className="space-y-3">
                      {shippingOptions.map((option) => {
                        const optionKey = `${option.carrier}-${option.service}`
                        return (
                          <Label
                            key={optionKey}
                            htmlFor={optionKey}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedShipping === optionKey 
                                ? "border-[#2c327a] bg-[#2c327a]/5" 
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={optionKey} id={optionKey} />
                              <div>
                                <p className="font-medium">{option.carrier} {option.service}</p>
                                <p className="text-sm text-slate-500">
                                  Estimated {option.estimatedDays} business days
                                  {option.facility && <span className="text-slate-400"> • Ships from {option.facility}</span>}
                                </p>
                              </div>
                            </div>
                            <p className="font-bold text-[#2c327a]">${option.price.toFixed(2)}</p>
                          </Label>
                        )
                      })}
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

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

            {/* Order Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Promo Discount (10%)</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-medium">
                      {shippingOptions.length > 0 
                        ? `$${shippingCost.toFixed(2)}`
                        : subtotal > 100 ? "FREE" : `$${shippingCost.toFixed(2)}`
                      }
                    </span>
                  </div>
                  {shippingOptions.length === 0 && subtotal <= 100 && (
                    <p className="text-xs text-slate-500">Free shipping on orders over $100</p>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-[#2c327a]">${total.toFixed(2)}</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Promo Code</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (promoCode.toLowerCase() === "save10") {
                            setPromoApplied(true)
                          }
                        }}
                        disabled={promoApplied}
                      >
                        Apply
                      </Button>
                    </div>
                    {promoApplied && (
                      <p className="text-xs text-green-600 mt-1">Promo code applied!</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                  <Button className="w-full gap-2 bg-[#e42a27] hover:bg-[#c42020]" size="lg" asChild>
                    <Link href={`/checkout?total=${Math.round(total * 100)}`}>
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    Secure checkout powered by Stripe
                  </p>
                </CardFooter>
              </Card>

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
