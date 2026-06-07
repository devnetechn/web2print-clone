"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, Eye, Truck } from "lucide-react"

interface FourOverOrder {
  id: string
  order_id: string
  fourover_order_id: string
  status: string
  tracking_number: string | null
  submitted_at: string
  total_cost: number
}

export default function FourOverOrdersPage() {
  const [orders, setOrders] = useState<FourOverOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/4over/orders")
      if (!res.ok) {
        console.error("Orders API error:", res.status)
        setLoading(false)
        return
      }
      const text = await res.text()
      if (!text) {
        setOrders([])
        setLoading(false)
        return
      }
      const data = JSON.parse(text)
      setOrders(data.orders || [])
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      setOrders([])
    }
    setLoading(false)
  }

  const checkOrderStatus = async (fouroverOrderId: string) => {
    try {
      const res = await fetch("/api/4over/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", orderId: fouroverOrderId })
      })
      if (!res.ok) {
        alert("Failed to check status")
        return
      }
      const data = await res.json()
      alert(`Status: ${data.status || "Unknown"}\nTracking: ${data.tracking || "Not available yet"}`)
      fetchOrders()
    } catch (error) {
      console.error("Failed to check status:", error)
      alert("Failed to check status")
    }
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.fourover_order_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">4over Orders</h1>
          <p className="text-slate-500">Track orders submitted to 4over for fulfillment</p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No 4over orders found. Orders will appear here once submitted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">4over Order ID</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Tracking</th>
                    <th className="pb-3 font-medium">Cost</th>
                    <th className="pb-3 font-medium">Submitted</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 font-medium">{order.order_id}</td>
                      <td className="py-3 text-slate-600">{order.fourover_order_id}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "shipped"
                              ? "bg-green-100 text-green-700"
                              : order.status === "processing"
                              ? "bg-blue-100 text-blue-700"
                              : order.status === "submitted"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {order.tracking_number ? (
                          <a
                            href={`https://www.ups.com/track?tracknum=${order.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Truck className="h-3 w-3" />
                            {order.tracking_number}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3">${order.total_cost?.toFixed(2)}</td>
                      <td className="py-3 text-slate-600">
                        {new Date(order.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => checkOrderStatus(order.fourover_order_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
