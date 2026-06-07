import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ProductDetailClient } from "@/components/storefront/product-detail-client"

// Check if string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  let product = null

  // Try to find by UUID first, then by slug/category
  if (isUUID(id)) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single()
    product = data
  } else {
    // Try to find by category slug (e.g., "business-cards" -> "Business Cards")
    const categoryName = id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    const { data } = await supabase
      .from("products")
      .select("*")
      .ilike("category", categoryName)
      .eq("is_active", true)
      .limit(1)
      .single()
    product = data
  }

  if (!product) {
    notFound()
  }

  const { data: options } = await supabase.from("product_options").select("*").eq("product_id", product.id)

  return <ProductDetailClient product={product} options={options || []} />
}
