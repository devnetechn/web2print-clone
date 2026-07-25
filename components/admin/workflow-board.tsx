"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, FileText, Loader2 } from "lucide-react"

type WorkflowItem = {
  id: string
  order_id: string
  product_name: string
  quantity: number
  provider_order_id: string | null
  provider_status: string
  design_file_url: string | null
  created_at: string
  orders: { order_number: number; customer_email: string; status: string } | null
}

export function WorkflowBoard({ items }: { items: WorkflowItem[] }) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)

  const grouped = new Map<string, WorkflowItem[]>()
  for (const item of items) {
    const key = item.provider_status || "Unknown"
    grouped.set(key, [...(grouped.get(key) || []), item])
  }
  const statuses = [...grouped.keys()].sort()

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      const orderIds = [...new Set(items.map((i) => i.order_id))]
      await Promise.all(
        orderIds.map((orderId) =>
          fetch("/api/print-providers/4over/sync-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          }).catch(() => null),
        ),
      )
      router.refresh()
    } finally {
      setSyncing(false)
    }
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500">
        No jobs have been submitted to 4over yet. Submit an order from 4over Orders Transfer to see it here.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleSyncAll} disabled={syncing} variant="outline" className="gap-2">
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sync All Statuses
      </Button>

      <Tabs defaultValue={statuses[0]}>
        <TabsList className="flex-wrap h-auto">
          {statuses.map((status) => (
            <TabsTrigger key={status} value={status}>
              {status} ({grouped.get(status)!.length})
            </TabsTrigger>
          ))}
        </TabsList>
        {statuses.map((status) => (
          <TabsContent key={status} value={status} className="mt-4">
            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-500 text-white">
                    <tr>
                      <th className="p-3 text-left">Order</th>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-left">Quantity</th>
                      <th className="p-3 text-left">4over Job ID</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Artwork</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.get(status)!.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">#{item.orders?.order_number ?? "—"}</td>
                        <td className="p-3">{item.product_name}</td>
                        <td className="p-3">{item.quantity.toLocaleString()}</td>
                        <td className="p-3 font-mono text-xs text-slate-600">{item.provider_order_id}</td>
                        <td className="p-3 text-sm text-slate-600">{item.orders?.customer_email}</td>
                        <td className="p-3">
                          {item.design_file_url ? (
                            <a
                              href={item.design_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            <Badge variant="outline">None</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
