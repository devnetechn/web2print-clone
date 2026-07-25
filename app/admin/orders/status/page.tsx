import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "production", label: "Production" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export default async function OrderStatusPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase.from("orders").select("status")

  const counts = STATUSES.map((s) => ({
    ...s,
    count: orders?.filter((o) => o.status === s.value).length || 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Status</h1>
        <p className="text-slate-600">Orders broken down by current status</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map((s) => (
          <Link key={s.value} href={`/admin/orders?status=${s.value}`}>
            <Card className="hover:border-blue-400 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{s.label}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {s.value}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.count}</p>
                <p className="text-sm text-slate-500">order{s.count === 1 ? "" : "s"}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
