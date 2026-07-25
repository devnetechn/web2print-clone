import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PrintButton } from "@/components/admin/print-button"

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      *,
      profiles:customer_id ( full_name, company_name, email, phone )
    `,
    )
    .eq("id", id)
    .single()

  if (!order) {
    notFound()
  }

  const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", id)

  const addr = order.shipping_address || {}
  const addressLines: string[] =
    addr.method === "multiple"
      ? (addr.addresses || []).map((a: any) => `${a.firstName} ${a.lastName} - ${a.address}, ${a.city}, ${a.state} ${a.postalCode} (${a.quantity} units)`)
      : addr.method === "pickup"
      ? [addr.location, `${addr.firstName || ""} ${addr.lastName || ""}`.trim()]
      : [addr.name, addr.address, `${addr.city || ""}, ${addr.state || ""} ${addr.postalCode || ""}`].filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/orders/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order
          </Link>
        </Button>
        <PrintButton />
      </div>

      <div className="bg-white p-10 print:p-0 rounded-lg border print:border-0 text-slate-900">
        <div className="flex items-start justify-between border-b pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Web2Print USA</h1>
            <p className="text-sm text-slate-600 mt-1">7901 4th St. N #27125</p>
            <p className="text-sm text-slate-600">St. Petersburg, FL 33702</p>
            <p className="text-sm text-slate-600">+1.888.843.6867 - info@web2printusa.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">INVOICE</h2>
            <p className="text-sm text-slate-600 mt-1">#{order.order_number}</p>
            <p className="text-sm text-slate-600">
              {new Date(order.order_date).toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Bill To</p>
            <p className="font-medium">{order.profiles?.full_name || order.profiles?.company_name}</p>
            <p className="text-sm text-slate-600">{order.customer_email}</p>
            {order.profiles?.phone && <p className="text-sm text-slate-600">{order.profiles.phone}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Ship To</p>
            {addressLines.map((line, i) => (
              <p key={i} className="text-sm text-slate-600">
                {line}
              </p>
            ))}
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left text-sm">
              <th className="pb-2">Item</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Unit Price</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orderItems?.map((item) => (
              <tr key={item.id} className="border-b text-sm">
                <td className="py-2">{item.product_name}</td>
                <td className="py-2 text-right">{item.quantity.toLocaleString()}</td>
                <td className="py-2 text-right">${Number(item.unit_price).toFixed(2)}</td>
                <td className="py-2 text-right">${Number(item.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span>${Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Shipping</span>
              <span>${Number(order.shipping).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Tax</span>
              <span>${Number(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Payment Status</span>
              <span className="capitalize">{order.payment_status}</span>
            </div>
          </div>
        </div>

        {order.order_notes && (
          <div className="mt-8 pt-6 border-t">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.order_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
