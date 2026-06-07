import { NextResponse } from "next/server"
import { fourOverClient } from "@/lib/4over/client"
import { applyMarkup } from "@/lib/4over/markup"

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
    
    // If all quote params provided, get live price quote
    const colorspecUuid = searchParams.get("colorspec_uuid")
    const runsizeUuid = searchParams.get("runsize_uuid")
    const turnaroundUuid = searchParams.get("turnaround_uuid")
    const category = searchParams.get("category") || "default"
    
    if (productUuid && colorspecUuid && runsizeUuid && turnaroundUuid) {
      // Get live price quote from 4over
      const result = await fourOverClient.getProductQuote({
        product_uuid: productUuid,
        colorspec_uuid: colorspecUuid,
        runsize_uuid: runsizeUuid,
        turnaroundtime_uuid: turnaroundUuid,
        options: []
      })
      
      if (result.success && result.data) {
        // Extract wholesale price from productquote response
        // Verified field name from 4over API docs: total_price
        const priceData = result.data
        const wholesale = parseFloat(priceData.total_price || priceData.base_price || priceData.product_baseprice || 0)
        const retail = applyMarkup(wholesale, category)
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
          return NextResponse.json({
            success: true,
            price: applyMarkup(wholesale, category),
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
