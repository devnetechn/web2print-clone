import { createClient } from "@/lib/supabase/server"
import { OrdersTable } from "@/components/admin/orders-table"

export default async function ArchiveOrdersPage() {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
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
    .in("status", ["completed", "cancelled"])
    .order("order_date", { ascending: false })

  if (error) {
    console.error("Error fetching archived orders:", error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Archive Orders</h1>
        <p className="text-slate-600">Completed and cancelled orders</p>
      </div>

      <OrdersTable orders={orders || []} />
    </div>
  )
}
