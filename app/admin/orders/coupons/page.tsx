import { createClient } from "@/lib/supabase/server"
import { CouponsManager } from "@/components/admin/coupons-manager"

export default async function CouponsPage() {
  const supabase = await createClient()

  const { data: coupons, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching coupons:", error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Coupons / Discount</h1>
        <p className="text-slate-600">Manage discount codes for checkout</p>
      </div>

      <CouponsManager coupons={coupons || []} />
    </div>
  )
}
