import { createClient } from "@/lib/supabase/server"
import { OrdersTable } from "@/components/admin/orders-table"

export default async function UnpaidOrdersPage() {
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
    .eq("payment_status", "unpaid")
    .order("order_date", { ascending: false })

  if (error) {
    console.error("Error fetching unpaid orders:", error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Unpaid Orders</h1>
        <p className="text-slate-600">Orders awaiting payment</p>
      </div>

      <OrdersTable orders={orders || []} />
    </div>
  )
}
