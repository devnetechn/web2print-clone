"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react"
import { CheckoutSteps } from "@/components/checkout/checkout-steps"
import { useRequireCustomerAuth } from "@/hooks/use-require-customer-auth"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

type ShipTo = {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  postalCode: string
  quantity: string
}

const EMPTY_ADDRESS: ShipTo = {
  firstName: "", lastName: "", address: "", city: "", state: "", postalCode: "", quantity: "",
}

export default function MultiShippingPage() {
  const router = useRouter()
  const authChecked = useRequireCustomerAuth()
  const [itemName, setItemName] = useState("")
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [addresses, setAddresses] = useState<ShipTo[]>([{ ...EMPTY_ADDRESS }, { ...EMPTY_ADDRESS }])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const printCart = localStorage.getItem("print_cart")
    const items = printCart ? JSON.parse(printCart) : []
    if (items.length !== 1) {
      router.replace("/cart")
      return
    }
    setItemName(items[0].productName)
    setTotalQuantity(items[0].quantity || 1)
    setLoading(false)
  }, [router])

  const updateAddress = (index: number, field: keyof ShipTo) => (value: string) => {
    setAddresses((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }

  const addAddress = () => setAddresses((prev) => [...prev, { ...EMPTY_ADDRESS }])
  const removeAddress = (index: number) => setAddresses((prev) => prev.filter((_, i) => i !== index))

  const allocatedQuantity = addresses.reduce((sum, a) => sum + (parseInt(a.quantity) || 0), 0)

  const handleContinue = () => {
    setError(null)
    const required: (keyof ShipTo)[] = ["firstName", "lastName", "address", "city", "state", "postalCode", "quantity"]
    const incomplete = addresses.some((a) => required.some((field) => !a[field].trim()))
    if (incomplete) {
      setError("Please fill in every field for each address.")
      return
    }
    if (allocatedQuantity !== totalQuantity) {
      setError(`Quantities must add up to ${totalQuantity.toLocaleString()} (currently ${allocatedQuantity.toLocaleString()}).`)
      return
    }

    sessionStorage.setItem("checkout_ship_multiple", "true")
    sessionStorage.setItem(
      "checkout_multi_addresses",
      JSON.stringify(addresses.map((a) => ({ ...a, quantity: parseInt(a.quantity) || 0, country: "US" }))),
    )
    // Flat-rate estimate per address - matches the existing flat-rate
    // fallback used elsewhere when a real per-carrier quote isn't fetched.
    sessionStorage.setItem("checkout_shipping_cost", String(addresses.length * 9.99))
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
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Ship to Multiple Addresses</h1>
          <CheckoutSteps current={2} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-slate-600 mb-6">
          Splitting <span className="font-medium text-slate-900">{itemName}</span> — {totalQuantity.toLocaleString()}{" "}
          total units — across multiple shipping addresses.
        </p>

        <div className="space-y-4">
          {addresses.map((addr, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Address {index + 1}</CardTitle>
                {addresses.length > 2 && (
                  <Button variant="ghost" size="sm" onClick={() => removeAddress(index)} className="text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input value={addr.firstName} onChange={(e) => updateAddress(index, "firstName")(e.target.value)} />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={addr.lastName} onChange={(e) => updateAddress(index, "lastName")(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Address *</Label>
                  <Input value={addr.address} onChange={(e) => updateAddress(index, "address")(e.target.value)} />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={addr.city} onChange={(e) => updateAddress(index, "city")(e.target.value)} />
                </div>
                <div>
                  <Label>State *</Label>
                  <Select value={addr.state} onValueChange={updateAddress(index, "state")}>
                    <SelectTrigger className="w-full">
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
                  <Label>Postal Code *</Label>
                  <Input value={addr.postalCode} onChange={(e) => updateAddress(index, "postalCode")(e.target.value)} />
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input type="number" value={addr.quantity} onChange={(e) => updateAddress(index, "quantity")(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={addAddress} className="mt-4 gap-2">
          <Plus className="h-4 w-4" />
          Add Another Address
        </Button>

        <div className="mt-4 text-sm text-slate-600">
          Allocated: <span className="font-medium">{allocatedQuantity.toLocaleString()}</span> /{" "}
          {totalQuantity.toLocaleString()}
        </div>

        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" asChild>
            <Link href="/cart">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Link>
          </Button>
          <Button className="gap-2 bg-[#e42a27] hover:bg-[#c42020]" size="lg" onClick={handleContinue}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
