"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Trash2, Loader2, Plus } from "lucide-react"
import { createCoupon, toggleCouponActive, deleteCoupon } from "@/app/actions/coupons"

type Coupon = {
  id: string
  code: string
  discount_type: string
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  used_count: number
  active: boolean
  expires_at: string | null
  created_at: string
}

export function CouponsManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [minOrderAmount, setMinOrderAmount] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const handleCreate = async () => {
    setError(null)
    if (!code.trim() || !discountValue) {
      setError("Code and discount value are required")
      return
    }
    setCreating(true)
    try {
      const result = await createCoupon({
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        maxUses: maxUses ? parseInt(maxUses) : null,
      })
      if (result.success) {
        setCode("")
        setDiscountValue("")
        setMinOrderAmount("")
        setMaxUses("")
        router.refresh()
      } else {
        setError(result.error || "Failed to create coupon")
      }
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string, active: boolean) => {
    setBusyId(id)
    try {
      await toggleCouponActive(id, active)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    try {
      await deleteCoupon(id)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Coupon</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div>
            <Label>Code</Label>
            <Input placeholder="SAVE10" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input type="number" placeholder="10" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </div>
          <div>
            <Label>Min Order ($)</Label>
            <Input type="number" placeholder="0" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
          </div>
          <div>
            <Label>Max Uses</Label>
            <Input type="number" placeholder="Unlimited" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500 md:col-span-5">{error}</p>}
          <Button onClick={handleCreate} disabled={creating} className="gap-2 md:col-span-5 w-fit">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Coupon
          </Button>
        </CardContent>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Discount</th>
                <th className="p-3 text-left">Min Order</th>
                <th className="p-3 text-left">Usage</th>
                <th className="p-3 text-left">Active</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No coupons yet
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium">{c.code}</td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-slate-600">${Number(c.min_order_amount).toFixed(2)}</td>
                    <td className="p-3 text-sm text-slate-600">
                      {c.used_count} {c.max_uses != null ? `/ ${c.max_uses}` : ""}
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={c.active}
                        disabled={busyId === c.id}
                        onCheckedChange={(checked) => handleToggle(c.id, checked)}
                      />
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === c.id}
                        onClick={() => handleDelete(c.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
