import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { applyMarkup } from "@/lib/4over/markup"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productUuid = searchParams.get("product_uuid")
  const runsizeUuid = searchParams.get("runsize_uuid")
  const colorspecUuid = searchParams.get("colorspec_uuid")
  const turnaroundUuid = searchParams.get("turnaround_uuid")

  if (!productUuid) {
    return NextResponse.json({ success: false, error: "Missing product_uuid" }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    // If all 3 selection params provided, get exact price
    if (runsizeUuid && colorspecUuid && turnaroundUuid) {
      // Use maybeSingle() instead of limit(1) to handle 0 rows gracefully
      const { data: priceRow, error } = await supabase
        .from("fourover_base_prices")
        .select("product_baseprice, runsize, turnaroundtime")
        .eq("product_uuid", productUuid)
        .eq("runsize_uuid", runsizeUuid)
        .eq("colorspec_uuid", colorspecUuid)
        .eq("turnaroundtime_uuid", turnaroundUuid)
        .maybeSingle()

      if (error) {
        console.log("[v0] Price query error:", error.message)
      }

      if (priceRow) {
        const wholesale = parseFloat(String(priceRow.product_baseprice || 0))
        const retail = applyMarkup(wholesale, "default")
        return NextResponse.json({
          success: true,
          price: retail,
          wholesale,
          runsize: priceRow.runsize,
          turnaroundtime: priceRow.turnaroundtime,
        })
      }
      
      // No price in DB - return null price (not an error)
      return NextResponse.json({
        success: true,
        price: null,
        note: "Price not available. Contact for quote.",
      })
    }

    // If only runsize + colorspec, return all turnaround options with prices
    if (runsizeUuid && colorspecUuid) {
      const { data: prices } = await supabase
        .from("fourover_base_prices")
        .select("*")
        .eq("product_uuid", productUuid)
        .eq("runsize_uuid", runsizeUuid)
        .eq("colorspec_uuid", colorspecUuid)

      if (prices && prices.length > 0) {
        const turnaroundPrices = prices.map((p) => ({
          turnaroundtime_uuid: p.turnaroundtime_uuid,
          turnaroundtime: p.turnaroundtime,
          wholesale: parseFloat(String(p.product_baseprice || 0)),
          price: applyMarkup(parseFloat(String(p.product_baseprice || 0)), "default"),
        }))
        return NextResponse.json({ success: true, turnaroundPrices })
      }
    }

    // Fallback: return lowest price for product
    const { data: allPrices } = await supabase
      .from("fourover_base_prices")
      .select("product_baseprice, runsize")
      .eq("product_uuid", productUuid)
      .order("product_baseprice", { ascending: true })
      .limit(1)

    if (allPrices && allPrices.length > 0) {
      const wholesale = parseFloat(String(allPrices[0].product_baseprice || 0))
      return NextResponse.json({
        success: true,
        price: applyMarkup(wholesale, "default"),
        note: "Starting price",
      })
    }

    return NextResponse.json({ success: true, price: null, note: "No pricing data" })
  } catch (error) {
    console.log("[v0] Price API error:", error)
    return NextResponse.json({ success: true, price: null, note: "Error fetching price" })
  }
}
