import { NextResponse } from "next/server"
import { getProductBasePrices } from "@/lib/4over/client"
import { applyMarkup } from "@/lib/4over/markup"

// Returns the authoritative list of VALID colorspec/runsize/turnaround
// combinations for a product, each with a retail price. The configurator uses
// this matrix to ensure only selectable combinations are offered, which avoids
// 409 "Invalid / Missing Turnaround Time" errors from the live quote endpoint.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productUuid = searchParams.get("product_uuid")
  const category = searchParams.get("category") || "default"

  if (!productUuid) {
    return NextResponse.json({ success: false, error: "product_uuid required" }, { status: 400 })
  }

  const result = await getProductBasePrices(productUuid)
  if (!result.success) {
    return NextResponse.json({ success: true, combinations: [] })
  }

  const entities = result.data?.entities || result.data || []
  const combinations = (Array.isArray(entities) ? entities : []).map((row: any) => {
    const wholesale = parseFloat(row.product_baseprice ?? row.base_price ?? "0")
    return {
      colorspec_uuid: row.colorspec_uuid,
      colorspec: row.colorspec || row.colorspec_description || "",
      runsize_uuid: row.runsize_uuid,
      runsize: String(row.runsize ?? row.runsize_description ?? ""),
      turnaround_uuid: row.turnaroundtime_uuid || row.turnaround_uuid,
      turnaround: row.turnaroundtime || row.turnaround_description || "",
      wholesale,
      price: applyMarkup(wholesale, category),
    }
  }).filter((c: any) => c.colorspec_uuid && c.runsize_uuid && c.turnaround_uuid)

  return NextResponse.json({ success: true, combinations })
}
