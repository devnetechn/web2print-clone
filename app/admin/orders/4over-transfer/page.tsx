"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function FourOverTransferPage() {
  const [orderId, setOrderId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  const handleSubmitOrder = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Please enter an order ID",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/print-providers/4over/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Order submitted to 4over. Order ID: ${data.fourOverOrderId}`,
        })
        setOrderId("")
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit order",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit order to 4over",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSyncStatus = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Please enter an order ID",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)

    try {
      const response = await fetch("/api/print-providers/4over/sync-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Status synced successfully. ${data.allShipped ? "All items shipped!" : "Updates applied."}`,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to sync status",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync order status",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">4over Orders Transfer</h1>
          <p className="text-slate-600">Submit orders to 4over for printing and fulfillment</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Submit Order */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Order to 4over</CardTitle>
            <CardDescription>Send an order to 4over for production</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Enter Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="mb-4"
              />
              <Button onClick={handleSubmitOrder} disabled={isSubmitting} className="w-full gap-2">
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit to 4over"}
              </Button>
            </div>

            <div className="rounded-lg border bg-slate-50 p-4 text-sm">
              <p className="mb-2 font-medium">Requirements:</p>
              <ul className="list-inside list-disc space-y-1 text-slate-600">
                <li>Order must be paid</li>
                <li>Design files must be uploaded</li>
                <li>Product must have 4over mapping</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Order Status</CardTitle>
            <CardDescription>Update order status from 4over</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Enter Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="mb-4"
              />
              <Button
                onClick={handleSyncStatus}
                disabled={isSyncing}
                variant="outline"
                className="w-full gap-2 bg-transparent"
              >
                <RefreshCw className="h-4 w-4" />
                {isSyncing ? "Syncing..." : "Sync Status"}
              </Button>
            </div>

            <div className="rounded-lg border bg-slate-50 p-4 text-sm">
              <p className="mb-2 font-medium">Status Updates:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Submitted</Badge>
                  <span className="text-slate-600">Order sent to 4over</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">In Production</Badge>
                  <span className="text-slate-600">Being printed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>Shipped</Badge>
                  <span className="text-slate-600">On its way</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>4over API Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">Setup Instructions</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-slate-600">
              <li>Obtain API credentials from 4over.com</li>
              <li>Add FOUROVER_API_KEY and FOUROVER_API_SECRET to environment variables</li>
              <li>Map your products to 4over product IDs in the product settings</li>
              <li>Test the integration with a sample order</li>
              <li>Set up automated status sync with webhooks or scheduled jobs</li>
            </ol>
          </div>

          <div className="rounded-lg border bg-blue-50 p-4 text-sm">
            <p className="font-medium text-blue-900">Environment Variables Required:</p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-blue-800">
              <li>FOUROVER_API_KEY</li>
              <li>FOUROVER_API_SECRET</li>
              <li>FOUROVER_API_URL (optional, defaults to production)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
