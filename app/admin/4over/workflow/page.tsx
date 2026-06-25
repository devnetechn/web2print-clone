import { createClient } from "@/lib/supabase/server"
import { WorkflowBoard } from "@/components/admin/workflow-board"

export default async function WorkflowDashboardPage() {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_id,
      product_name,
      quantity,
      provider_order_id,
      provider_status,
      design_file_url,
      created_at,
      orders (
        order_number,
        customer_email,
        status
      )
    `,
    )
    .not("provider_status", "is", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching workflow items:", error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
        <p className="text-slate-600">Jobs submitted to 4over, grouped by production status</p>
      </div>

      <WorkflowBoard items={(items as any) || []} />
    </div>
  )
}
