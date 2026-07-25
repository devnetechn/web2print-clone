import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"

// Public catalog data only (no per-user filtering), so the admin client is
// used here to avoid touching cookies()/auth inside unstable_cache, which
// Next.js forbids.
const CACHE_TAGS = ["products"]
const REVALIDATE_SECONDS = 300

export const getActiveProducts = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("name")
    return data || []
  },
  ["active-products"],
  { tags: CACHE_TAGS, revalidate: REVALIDATE_SECONDS }
)

export const getProductById = unstable_cache(
  async (id: string) => {
    const supabase = createAdminClient()
    const { data } = await supabase.from("products").select("*").eq("id", id).eq("is_active", true).single()
    return data
  },
  ["product-by-id"],
  { tags: CACHE_TAGS, revalidate: REVALIDATE_SECONDS }
)

export const getProductOptions = unstable_cache(
  async (productId: string) => {
    const supabase = createAdminClient()
    const { data } = await supabase.from("product_options").select("*").eq("product_id", productId)
    return data || []
  },
  ["product-options"],
  { tags: CACHE_TAGS, revalidate: REVALIDATE_SECONDS }
)
