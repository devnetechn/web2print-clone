"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DollarSign, Send, Clock, CheckCircle, XCircle, Search } from "lucide-react"

interface PaymentRequest {
  id: string
  order_id: string
  order_number: string
  customer_name: string
  customer_email: string
  amount: number
  status: "pending" | "sent" | "paid" | "expired"
  created_at: string
  sent_at?: string
  paid_at?: string
  message?: string
}

export default function PaymentRequestPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [newRequest, setNewRequest] = useState({
    order_number: "",
    amount: "",
    message: "Please complete your payment to proceed with your order."
  })

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    // For now, use mock data - in production this would fetch from database
    setRequests([
      {
        id: "1",
        order_id: "ord-001",
        order_number: "ORD-2024-001",
        customer_name: "John Smith",
        customer_email: "john@example.com",
        amount: 250.00,
        status: "pending",
        created_at: new Date().toISOString(),
        message: "Please complete your payment to proceed with your order."
      },
      {
        id: "2",
        order_id: "ord-002",
        order_number: "ORD-2024-002",
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        amount: 1500.00,
        status: "sent",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        sent_at: new Date(Date.now() - 86400000).toISOString(),
        message: "Balance due for your business card order."
      },
      {
        id: "3",
        order_id: "ord-003",
        order_number: "ORD-2024-003",
        customer_name: "Bob Wilson",
        customer_email: "bob@example.com",
        amount: 750.00,
        status: "paid",
        created_at: new Date(Date.now() - 172800000).toISOString(),
        sent_at: new Date(Date.now() - 172800000).toISOString(),
        paid_at: new Date(Date.now() - 86400000).toISOString(),
        message: "Payment for banner printing."
      }
    ])
    setLoading(false)
  }

  const sendRequest = async (id: string) => {
    setRequests(prev => prev.map(r => 
      r.id === id ? { ...r, status: "sent" as const, sent_at: new Date().toISOString() } : r
    ))
  }

  const createRequest = async () => {
    // In production, this would create a payment request in the database
    const newReq: PaymentRequest = {
      id: Date.now().toString(),
      order_id: "new",
      order_number: newRequest.order_number,
      customer_name: "Customer",
      customer_email: "customer@example.com",
      amount: parseFloat(newRequest.amount) || 0,
      status: "pending",
      created_at: new Date().toISOString(),
      message: newRequest.message
    }
    setRequests(prev => [newReq, ...prev])
    setShowNewRequest(false)
    setNewRequest({ order_number: "", amount: "", message: "Please complete your payment to proceed with your order." })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "sent":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Send className="w-3 h-3 mr-1" />Sent</Badge>
      case "paid":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>
      case "expired":
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredRequests = requests.filter(r =>
    r.order_number.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    sent: requests.filter(r => r.status === "sent").length,
    paid: requests.filter(r => r.status === "paid").length,
    totalAmount: requests.reduce((sum, r) => sum + r.amount, 0),
    paidAmount: requests.filter(r => r.status === "paid").reduce((sum, r) => sum + r.amount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Requests</h1>
          <p className="text-slate-600">Send payment requests to customers for pending orders</p>
        </div>
        <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
          <DialogTrigger asChild>
            <Button>
              <DollarSign className="w-4 h-4 mr-2" />
              New Payment Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payment Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Order Number</label>
                <Input
                  value={newRequest.order_number}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, order_number: e.target.value }))}
                  placeholder="ORD-2024-XXX"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Amount ($)</label>
                <Input
                  type="number"
                  value={newRequest.amount}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Message</label>
                <Textarea
                  value={newRequest.message}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button onClick={createRequest} className="w-full">Create Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-sm text-slate-600">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending + stats.sent}</div>
            <p className="text-sm text-slate-600">Awaiting Payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-sm text-slate-600">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">${stats.paidAmount.toFixed(2)}</div>
            <p className="text-sm text-slate-600">Collected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Requests</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.customer_name}</div>
                        <div className="text-sm text-slate-500">{request.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">${request.amount.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <Button size="sm" onClick={() => sendRequest(request.id)}>
                          <Send className="w-3 h-3 mr-1" />
                          Send
                        </Button>
                      )}
                      {request.status === "sent" && (
                        <Button size="sm" variant="outline">
                          Resend
                        </Button>
                      )}
                      {request.status === "paid" && (
                        <span className="text-sm text-green-600">Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No payment requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
