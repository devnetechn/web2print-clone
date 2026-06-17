import { NextResponse } from "next/server"
import { getProductBasePrices, getProductFeed } from "@/lib/4over/client"
import { applyMarkup } from "@/lib/4over/markup"

// Returns the authoritative list of VALID colorspec/runsize/turnaround
// combinations for a product, each with a retail price. The configurator uses
// this matrix to ensure only selectable combinations are offered, which avoids
// 409 "Invalid / Missing Turnaround Time" errors from the live quote endpoint.
//
// 4over's /products/{uuid}/baseprices rows do NOT include a turnaround, and the
// nested /colorspecs/.../turnaroundtimes and /productoptiongroups endpoints
// return 404. The turnaround options live in the hydrated `productsfeed`
// response, where each Turn-Around option is already tied to a specific
// colorspec_uuid + runsize_uuid. We join that against the base prices to build
// the full matrix.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productUuid = searchParams.get("product_uuid")
  const category = searchParams.get("category") || "default"

  if (!productUuid) {
    return NextResponse.json({ success: false, error: "product_uuid required" }, { status: 400 })
  }

  // Fetch base prices (per colorspec+runsize) and the hydrated feed
  // (for turnaround options) in parallel.
  const [pricesResult, feedResult] = await Promise.all([
    getProductBasePrices(productUuid),
    getProductFeed(productUuid),
  ])

  // Base-price lookup keyed by "colorspec_uuid|runsize_uuid".
  const baseRows: any[] = pricesResult.success ? (pricesResult.data?.entities || []) : []
  const baseByCombo = new Map<string, number>()
  for (const row of baseRows) {
    baseByCombo.set(`${row.colorspec_uuid}|${row.runsize_uuid}`, parseFloat(row.product_baseprice ?? "0"))
  }

  // Locate the Turn-Around option group in the hydrated feed.
  let feed: any = feedResult.data
  if (feed?.entities) feed = feed.entities[0]
  const groups: any[] = feed?.product_option_groups || []
  const turnGroup = groups.find((g) => /turn[\s-]*around/i.test(g.product_option_group_name || ""))
  const turnOptions: any[] = turnGroup?.options || []

  // Each turnaround option is tied to a specific colorspec + runsize. Join with
  // the base price for that combo and add any turnaround surcharge.
  const combinations = turnOptions
    .map((opt) => {
      const base = baseByCombo.get(`${opt.colorspec_uuid}|${opt.runsize_uuid}`)
      if (base === undefined) return null
      const turnPrice = parseFloat(opt.option_prices_list?.[0]?.price ?? "0")
      const wholesale = base + turnPrice
      return {
        colorspec_uuid: opt.colorspec_uuid,
        colorspec: opt.colorspec || opt.colorspec_name || "",
        runsize_uuid: opt.runsize_uuid,
        runsize: String(opt.runsize ?? ""),
        turnaround_uuid: opt.option_uuid,
        turnaround: opt.option_description || opt.option_name || "",
        wholesale,
        price: applyMarkup(wholesale, category),
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && !!c.colorspec_uuid && !!c.runsize_uuid && !!c.turnaround_uuid)

  return NextResponse.json({ success: true, combinations })
}
