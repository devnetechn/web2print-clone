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
    
    // Parse the response and return formatted shipping options
    const data = result.data
    
    // Response format from 4over includes:
    // - box_weight, box_count, box_length, box_width, box_height
    // - shipping_options array with carrier_name, service_name, shipping_price, delivery_days, ship_from_facility
    
    const shippingOptions = data.shipping_options?.map((opt: any) => ({
      carrier: opt.carrier_name || opt.carrier || "Standard",
      service: opt.service_name || opt.service || "Ground",
      price: parseFloat(opt.shipping_price || opt.price || "0"),
      estimatedDays: parseInt(opt.delivery_days || "5"),
      facility: opt.ship_from_facility || opt.facility,
      uuid: opt.shipping_option_uuid
    })) || []
    
    return NextResponse.json({ 
      success: true,
      box_weight: data.box_weight,
      box_count: data.box_count,
      options: shippingOptions,
      shipping_options: data.shipping_options, // Raw response
      data: data
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
