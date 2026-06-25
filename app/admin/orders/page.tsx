import { createClient } from "@/lib/supabase/server"
import { OrdersTable } from "@/components/admin/orders-table"
import { Button } from "@/components/ui/button"
import { Download, Eye, FileText } from "lucide-react"
import Link from "next/link"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
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
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  if (params.search) {
    // Strip characters meaningful to PostgREST's filter syntax (commas
    // separate or() conditions, parens/periods can alter how a clause
    // parses) so a search string can't inject extra filter conditions.
    const safeSearch = params.search.replace(/[,().]/g, "")
    if (safeSearch) {
      query = query.or(`customer_email.ilike.%${safeSearch}%,order_notes.ilike.%${safeSearch}%`)
    }
  }

  if (params.from) {
    query = query.gte("order_date", params.from)
  }

  if (params.to) {
    query = query.lte("order_date", params.to)
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
