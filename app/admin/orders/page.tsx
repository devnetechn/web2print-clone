import { createClient } from "@/lib/supabase/server"
import { OrdersTable } from "@/components/admin/orders-table"
import { Button } from "@/components/ui/button"
import { Download, Eye, FileText } from "lucide-react"
import Link from "next/link"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string; from?: string; to?: string }
}) {
  const supabase = await createClient()

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      profiles:customer_id (
        full_name,
        company_name,
        email
      )
    `,
    )
    .order("order_date", { ascending: false })

  // Apply filters
  if (searchParams.status && searchParams.status !== "all") {
    query = query.eq("status", searchParams.status)
  }

  if (searchParams.search) {
    query = query.or(`customer_email.ilike.%${searchParams.search}%,order_notes.ilike.%${searchParams.search}%`)
  }

  if (searchParams.from) {
    query = query.gte("order_date", searchParams.from)
  }

  if (searchParams.to) {
    query = query.lte("order_date", searchParams.to)
  }

  const { data: orders, error } = await query

  if (error) {
    console.error("Error fetching orders:", error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">List Orders</h1>
          <p className="text-slate-600">Manage and track all customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <FileText className="h-4 w-4" />
            Payment Request
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Eye className="h-4 w-4" />
            Job Board
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Order Shipment
          </Button>
          <Button asChild>
            <Link href="/admin/orders/new">Add New Order</Link>
          </Button>
        </div>
      </div>

      <OrdersTable orders={orders || []} />
    </div>
  )
}
