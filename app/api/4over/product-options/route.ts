import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProductFeed } from "@/lib/4over/client"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productUuid = searchParams.get("product_uuid")

  if (!productUuid) {
    return NextResponse.json({ error: "product_uuid required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Try DB first
  const { data: dbGroups } = await supabase
    .from("fourover_option_groups")
    .select("*")
    .eq("product_uuid", productUuid)
    .order("option_group_order", { ascending: true })

  if (dbGroups && dbGroups.length > 0) {
    const optionGroups = dbGroups.map(g => ({
      product_option_group_uuid: g.option_group_uuid,
      product_option_group_name: g.option_group_name,
      product_option_group_order: g.option_group_order,
      options: g.options || [],
    }))
    return NextResponse.json({ optionGroups })
  }

  // Fall back to 4over API
  const result = await getProductFeed(productUuid)
  if (result.success) {
    const apiProduct = result.data?.entities?.[0] || result.data?.[0] || result.data || {}
    const optionGroups = apiProduct.product_option_groups || []
    return NextResponse.json({ optionGroups })
  }

  return NextResponse.json({ optionGroups: [] })
}
