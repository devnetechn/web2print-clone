import { NextResponse } from "next/server"
import { fourOverClient } from "@/lib/4over/client"
import { createClient } from "@/lib/supabase/server"

// Resolves the markup multiplier from the REAL, admin-editable source of
// truth: the `fourover_markups` Supabase table (edited via /admin/4over/
// markups, PATCH /api/admin/4over/markups). Two earlier attempts at this
// fix (2026-07-10) read from hardcoded files instead — lib/4over/markup.ts's
// DEFAULT_MARKUPS (a flat 40% for everything) and lib/4over-config.ts's
// FOUROVER_CATEGORIES (per-UUID rates that don't match what's actually
// configured in the DB, e.g. its hardcoded 1.5x/50% for Business Cards vs
// the DB's real, admin-set 40% — confirmed via direct query, all 75 rows in
// fourover_markups are currently a uniform 40%, seeded 2026-07-07). Neither
// hardcoded file reflects admin edits made through the dashboard. This is
// the one that does.
// `category` in this table uses underscores ("business_cards",
// "flyers_and_brochures"), while route-level category slugs use hyphens
// and are sometimes subcategory-level ("business-cards-standard") rather
// than matching a markups row directly — normalize hyphens to underscores
// and try a prefix match (a subcategory's row-equivalent always starts with
// its parent's underscored name, e.g. "business_cards_standard" starts with
// "business_cards") before falling back to the table's own generic default.
async function resolveMarkupMultiplier(categorySlug: string): Promise<number> {
  const normalized = categorySlug.replace(/-/g, "_")
  try {
    const supabase = await createClient()
    const { data: exact } = await supabase
      .from("fourover_markups")
      .select("markup_value, markup_type")
      .eq("category", normalized)
      .eq("is_active", true)
      .maybeSingle()
    const row =
      exact ??
      (
        await supabase
          .from("fourover_markups")
          .select("markup_value, markup_type")
          .eq("is_active", true)
          .ilike("category", `${normalized.split("_")[0]}_${normalized.split("_")[1] ?? ""}%`)
          .limit(1)
      ).data?.[0]
    if (row && row.markup_type === "percentage") return 1 + Number(row.markup_value) / 100
    if (row) return Number(row.markup_value) // flat/fixed markup_type stored as a multiplier
  } catch {
    // fall through to the safe default below
  }
  return 1.4 // matches fourover_markups' own current uniform default (40%)
}

// Get live product pricing from 4over
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_uuid, colorspec_uuid, runsize_uuid, turnaroundtime_uuid, options } = body
    
    if (!product_uuid || !colorspec_uuid || !runsize_uuid || !turnaroundtime_uuid) {
      return NextResponse.json({ 
        error: "Missing required fields: product_uuid, colorspec_uuid, runsize_uuid, turnaroundtime_uuid" 
      }, { status: 400 })
    }
    
    const result = await fourOverClient.getProductQuote({
      product_uuid,
      colorspec_uuid,
      runsize_uuid,
      turnaroundtime_uuid,
      options: options || []
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    return NextResponse.json(result.data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Get product option groups, base prices, or live quote
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productUuid = searchParams.get("product_uuid") || searchParams.get("product_id")
    const action = searchParams.get("action")
    // Reseller markup category — product-configurator-client.tsx (the live
    // price calculator every print category actually uses) already sends
    // this. Falls back to "default" (40%) for the other, unused-in-app
    // callers of this route that don't pass it.
    const category = searchParams.get("category") || "default"

    // If all quote params provided, get live price quote
    const colorspecUuid = searchParams.get("colorspec_uuid")
    const runsizeUuid = searchParams.get("runsize_uuid")
    const turnaroundUuid = searchParams.get("turnaround_uuid")

    if (productUuid && colorspecUuid && runsizeUuid && turnaroundUuid) {
      // Additional option_uuids (Grommets, Orientation, H-Stakes, etc.) that
      // affect the price. Passed as repeated ?options=<uuid> query params.
      const optionUuids = searchParams.getAll("options").filter(Boolean)
      // Get live price quote from 4over
      const result = await fourOverClient.getProductQuote({
        product_uuid: productUuid,
        colorspec_uuid: colorspecUuid,
        runsize_uuid: runsizeUuid,
        turnaroundtime_uuid: turnaroundUuid,
        options: optionUuids
      })

      if (result.success && result.data) {
        // Extract wholesale price from productquote response
        // Verified field name from 4over API docs: total_price
        const priceData = result.data
        const wholesale = parseFloat(priceData.total_price || priceData.base_price || priceData.product_baseprice || 0)
        // 2026-07-10: was returning raw 4over wholesale cost as "price" with
        // NO markup applied — confirmed this is the exact endpoint the live
        // price calculator displays as "Total:" for every print category,
        // meaning every price verified all session (and any real order
        // placed) was at 4over's wholesale cost, zero margin. Fixed by
        // resolving the category's markup from the admin-editable
        // `fourover_markups` table — see resolveMarkupMultiplier's comment.
        const multiplier = await resolveMarkupMultiplier(category)
        const retail = Math.round(wholesale * multiplier * 100) / 100
        return NextResponse.json({
          success: true,
          price: retail,
          wholesale,
          data: priceData
        })
      }

      // Fallback: try base prices endpoint
      const basePricesResult = await fourOverClient.getProductBasePrices(productUuid)
      if (basePricesResult.success && basePricesResult.data?.entities) {
        const matchingPrice = basePricesResult.data.entities.find((p: any) =>
          p.colorspec_uuid === colorspecUuid && p.runsize_uuid === runsizeUuid
        )
        if (matchingPrice) {
          const wholesale = parseFloat(matchingPrice.product_baseprice || "0")
          const multiplier = await resolveMarkupMultiplier(category)
          return NextResponse.json({
            success: true,
            price: Math.round(wholesale * multiplier * 100) / 100,
            wholesale,
          })
        }
      }

      return NextResponse.json({ success: false, error: "Price not found" })
    }
    
    if (!productUuid) {
      return NextResponse.json({ error: "product_uuid required" }, { status: 400 })
    }
    
    // Get option groups (colorspec, runsizes, turnaround-times, finishing)
    if (action === "option_groups" || action === "options" || !action) {
      const result = await fourOverClient.getProductOptionGroups(productUuid)
      return NextResponse.json(result.success ? result.data : { error: result.error })
    }
    
    // Get base prices
    if (action === "prices" || action === "baseprices") {
      const result = await fourOverClient.getProductBasePrices(productUuid)
      return NextResponse.json(result.success ? result.data : { error: result.error })
    }
    
    return NextResponse.json({ error: "Invalid action. Use: option_groups, prices" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
