"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Package, FileText } from "lucide-react"

export interface PriceSummaryItem {
  id: string
  name: string
  qty?: number
  price: number
  size?: string
  colorspec?: string
  turnaround?: string
  designFile?: { fileName: string; url: string; contentType?: string }
}

interface PriceSummaryProps {
  items: PriceSummaryItem[]
  subtotal: number
  shipping?: number
  discount?: number
  tax?: number
  couponCode: string
  onCouponCodeChange: (value: string) => void
  onApplyCoupon: () => void
  couponApplied: boolean
  couponError?: string | null
  applyingCoupon?: boolean
  footer?: React.ReactNode
}

export function PriceSummary({
  items,
  subtotal,
  shipping = 0,
  discount = 0,
  tax = 0,
  couponCode,
  onCouponCodeChange,
  onApplyCoupon,
  couponApplied,
  couponError,
  applyingCoupon = false,
  footer,
}: PriceSummaryProps) {
  const total = subtotal + shipping - discount + tax

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 overflow-hidden">
                {item.designFile?.contentType?.startsWith("image/") && item.designFile.contentType !== "image/tiff" ? (
                  <img src={item.designFile.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                {item.size && <p className="text-xs text-slate-500">Size: {item.size}</p>}
                {item.colorspec && <p className="text-xs text-slate-500">Print: {item.colorspec}</p>}
                {item.qty && <p className="text-xs text-slate-500">Qty: {item.qty}</p>}
                {item.turnaround && <p className="text-xs text-slate-500">Turnaround: {item.turnaround}</p>}
                {item.designFile && (
                  <a
                    href={item.designFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#2c327a] hover:underline truncate"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.designFile.fileName}</span>
                  </a>
                )}
              </div>
              <p className="text-sm font-medium text-slate-900 whitespace-nowrap">${item.price.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex gap-2">
          <Input
            placeholder="Coupon Code"
            value={couponCode}
            onChange={(e) => onCouponCodeChange(e.target.value)}
            disabled={couponApplied}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={onApplyCoupon}
            disabled={couponApplied || !couponCode || applyingCoupon}
          >
            {applyingCoupon ? "Checking..." : "Apply"}
          </Button>
        </div>
        {couponApplied && <p className="text-xs text-green-600">Coupon applied!</p>}
        {couponError && !couponApplied && <p className="text-xs text-red-500">{couponError}</p>}

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Shipping Price</span>
            <span className="font-medium">${shipping.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">Tax</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="text-[#2c327a]">${total.toFixed(2)}</span>
        </div>

        {footer}
      </CardContent>
    </Card>
  )
}
