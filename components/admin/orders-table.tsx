"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Eye, Edit, Copy, RotateCcw, MoreVertical, Search, Filter, Download } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

type Order = {
  id: string
  order_number: number
  customer_email: string
  status: string
  payment_status: string
  total: number
  order_date: string
  due_date: string | null
  production_date: string | null
  profiles: {
    full_name: string | null
    company_name: string | null
    email: string
  } | null
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "")

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set("search", searchQuery)
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (dateFrom) params.set("from", dateFrom)
    router.push(`/admin/orders?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setDateFrom("")
    router.push("/admin/orders")
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const toggleAllOrders = () => {
    setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map((o) => o.id))
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary",
      production: "default",
      shipped: "default",
      completed: "default",
      cancelled: "destructive",
    }
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    return (
      <Badge variant={status === "paid" ? "default" : "destructive"} className="bg-green-500 capitalize">
        {status}
      </Badge>
    )
  }

  return (
    <Card className="p-6">
      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input type="text" placeholder="Company Name" className="w-48" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSearch} size="sm" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>
          <Button onClick={handleReset} variant="outline" size="sm">
            Reset
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Sort By
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Bulk Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delete">Delete Selected</SelectItem>
                <SelectItem value="export">Export Selected</SelectItem>
                <SelectItem value="status">Update Status</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm">Submit</Button>
            <span className="text-sm text-slate-600">{selectedOrders.length} selected</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="p-3 text-left">
                <Checkbox checked={selectedOrders.length === orders.length} onCheckedChange={toggleAllOrders} />
              </th>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Order Details</th>
              <th className="p-3 text-left">Order Date & Amount</th>
              <th className="p-3 text-left">Order Due Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={() => toggleOrderSelection(order.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{order.order_number}</div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {order.profiles?.full_name || order.profiles?.company_name || "Guest"}
                      </div>
                      <div className="text-sm text-slate-600">{order.customer_email}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="text-sm">
                        {new Date(order.order_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${Number(order.total).toFixed(2)}</span>
                        {getPaymentBadge(order.payment_status)}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="text-sm">
                        Order:{" "}
                        {order.due_date
                          ? new Date(order.due_date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </div>
                      <div className="text-sm">
                        Production:{" "}
                        {order.production_date
                          ? new Date(order.production_date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{getStatusBadge(order.status)}</div>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Edit Order
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Copy className="h-4 w-4" />
                          Duplicate Order
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Download Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Refund
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
