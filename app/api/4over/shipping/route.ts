import { NextResponse } from "next/server"
import { getShippingQuote, validateAddress } from "@/lib/4over/client"

// POST /api/4over/shipping - Get shipping quote from 4over
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_info, shipping_address, bypass_address_validation } = body
    
    // Validate required fields
    if (!product_info || !shipping_address) {
      return NextResponse.json(
        { 
          success: false,
          error: "product_info and shipping_address are required",
          example: {
            product_info: {
              product_uuid: "bc3758a8-8f6c-4e24-8fb5-99d1a95ac01e",
              runsize_uuid: "52e3d710-0e8f-4d4d-8560-7d4d8655be69",
              turnaround_uuid: "e04b099b-4ac3-4a35-84d0-c530df7b7aff",
              colorspec_uuid: "13abbda7-1d64-4f25-8bb2-c179b224825d",
              sets: 1
            },
            shipping_address: {
              address: "123 Main St",
              city: "Los Angeles",
              state: "CA",
              country: "US",
              zipcode: "90001"
            },
            bypass_address_validation: false
          }
        }, 
        { status: 400 }
      )
    }
    
    // Validate address first (unless bypassed)
    if (!bypass_address_validation) {
      const addressResult = await validateAddress({
        address: shipping_address.address,
        city: shipping_address.city,
        state: shipping_address.state,
        country: shipping_address.country || "US",
        zipcode: shipping_address.zipcode
      })
      
      // Log address validation result but don't block on failure
      if (!addressResult.success) {
        console.warn("Address validation warning:", addressResult.error)
      }
    }
    
    // Get shipping quote
    const result = await getShippingQuote({
      product_info: {
        product_uuid: product_info.product_uuid,
        runsize_uuid: product_info.runsize_uuid,
        turnaround_uuid: product_info.turnaround_uuid,
        colorspec_uuid: product_info.colorspec_uuid,
        option_uuids: product_info.option_uuids || [],
        sets: product_info.sets || 1
      },
      shipping_address: {
        address: shipping_address.address,
        address2: shipping_address.address2,
        city: shipping_address.city,
        state: shipping_address.state,
        country: shipping_address.country || "US",
        zipcode: shipping_address.zipcode
      },
      bypass_address_validation: bypass_address_validation || false
    })
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    // Parse the response. 4over nests the options under
    // data.job.facilities[].shipping_options[] with fields service_code,
    // service_name, service_price, in_hand_delivery, shipping_time.
    const data = result.data
    const job = data?.job || data
    const facilities: any[] = job?.facilities || []

    const shippingOptions = facilities.flatMap((f: any) =>
      (f.shipping_options || []).map((opt: any) => ({
        code: opt.service_code || opt.shipping_code,
        service: opt.service_name || opt.carrier_name || "Shipping",
        price: parseFloat(opt.service_price || opt.shipping_price || opt.price || "0"),
        inHandDate: opt.in_hand_delivery || null,
        estimatedDays: parseInt(opt.shipping_time || opt.delivery_days || "0") || null,
        facility: f.address?.code || f.ship_from_facility || null,
      })),
    )

    // De-duplicate by service code, keeping the cheapest, and sort by price.
    const byCode = new Map<string, any>()
    for (const o of shippingOptions) {
      const key = o.code || o.service
      if (!byCode.has(key) || o.price < byCode.get(key).price) byCode.set(key, o)
    }
    const options = [...byCode.values()].sort((a, b) => a.price - b.price)

    return NextResponse.json({
      success: true,
      box_weight: job?.product_info?.box_weight,
      box_count: job?.product_info?.box_count,
      options,
    })
  } catch (error) {
    console.error("Shipping quote error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// GET /api/4over/shipping/validate - Validate address
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")
  const city = searchParams.get("city")
  const state = searchParams.get("state")
  const zipcode = searchParams.get("zipcode")
  const country = searchParams.get("country") || "US"
  
  if (!address || !city || !state || !zipcode) {
    return NextResponse.json({ 
      success: false, 
      error: "address, city, state, and zipcode are required" 
    }, { status: 400 })
  }
  
  const result = await validateAddress({
    address,
    city,
    state,
    country,
    zipcode
  })
  
  return NextResponse.json(result)
}
