"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { updateOrderStatus } from "@/app/actions/orders"

type OrderStatus = "pending" | "processing" | "production" | "shipped" | "completed" | "cancelled"
type PaymentStatus = "unpaid" | "paid" | "refunded"

export function OrderStatusCard({
  orderId,
  initialStatus,
  initialPaymentStatus,
}: {
  orderId: string
  initialStatus: string
  initialPaymentStatus: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<OrderStatus>(initialStatus as OrderStatus)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(initialPaymentStatus as PaymentStatus)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleUpdate = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const result = await updateOrderStatus({ orderId, status, paymentStatus, notes })
      if (result.success) {
        setSaved(true)
        setNotes("")
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Current Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Payment Status</label>
          <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Notes (optional)</label>
          <Textarea
            placeholder="Add a note about this status change..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button className="w-full gap-2" onClick={handleUpdate} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Update Status
        </Button>
        {saved && <p className="text-sm text-green-600 text-center">Order updated successfully</p>}
      </CardContent>
    </Card>
  )
}
