import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, MapPin, CreditCard, FileText, Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      *,
      profiles:customer_id (
        full_name,
        company_name,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        zip_code
      )
    `,
    )
    .eq("id", params.id)
    .single()

  if (!order) {
    notFound()
  }

  const { data: orderItems } = await supabase
    .from("order_items")
    .select(
      `
      *,
      products (
        name,
        image_url
      )
    `,
    )
    .eq("order_id", params.id)

  const { data: statusLogs } = await supabase
    .from("order_status_logs")
    .select("*")
    .eq("order_id", params.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order #{order.order_number}</h1>
            <p className="text-slate-600">
              Placed on {new Date(order.order_date).toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Print Invoice</Button>
          <Button variant="outline">Send Email</Button>
          <Button>Process Order</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems?.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-lg border p-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-slate-100">
                      {item.products?.image_url ? (
                        <img
                          src={item.products.image_url || "/placeholder.svg"}
                          alt={item.product_name}
                          className="h-full w-full object-cover rounded"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product_name}</h3>
                      <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                      {item.options && (
                        <p className="text-sm text-slate-600">
                          Options: {typeof item.options === "object" ? JSON.stringify(item.options) : item.options}
                        </p>
                      )}
                      {item.print_provider && (
                        <Badge variant="outline" className="mt-2">
                          <Printer className="mr-1 h-3 w-3" />
                          {item.print_provider}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${Number(item.total_price).toFixed(2)}</p>
                      <p className="text-sm text-slate-600">${Number(item.unit_price).toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax</span>
                  <span>${Number(order.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Shipping</span>
                  <span>${Number(order.shipping).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total</span>
                  <span>${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusLogs && statusLogs.length > 0 ? (
                  statusLogs.map((log) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                          <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                        </div>
                        <div className="h-full w-px bg-slate-200"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium capitalize">{log.status.replace("_", " ")}</p>
                        <p className="text-sm text-slate-600">{log.notes || "Status updated"}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No status updates yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Current Status</label>
                <Select defaultValue={order.status}>
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
                <Badge variant={order.payment_status === "paid" ? "default" : "destructive"} className="capitalize">
                  {order.payment_status}
                </Badge>
              </div>
              <Button className="w-full">Update Status</Button>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{order.profiles?.full_name || order.profiles?.company_name}</p>
                <p className="text-slate-600">{order.customer_email}</p>
                {order.profiles?.phone && <p className="text-slate-600">{order.profiles.phone}</p>}
              </div>
              {order.shipping_address && (
                <div>
                  <p className="mb-1 font-medium">Shipping Address</p>
                  <p className="text-slate-600">
                    {typeof order.shipping_address === "object" && order.shipping_address !== null
                      ? JSON.stringify(order.shipping_address)
                      : order.shipping_address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Payment Method</span>
                <span className="font-medium">Stripe</span>
              </div>
              {order.payment_intent_id && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment ID</span>
                  <span className="font-mono text-xs">{order.payment_intent_id}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
