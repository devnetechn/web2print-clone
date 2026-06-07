import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      customer_name,
      customer_email,
      customer_phone,
      company_name,
      product_id,
      brand_name,
      style_number,
      product_name,
      print_method,
      print_locations,
      number_of_colors,
      total_quantity,
      size_breakdown,
      garment_color,
      artwork_notes,
      customer_notes,
    } = body

    // Validation
    if (!customer_name || !customer_email || !total_quantity) {
      return NextResponse.json(
        { error: "Name, email, and quantity are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("quote_requests")
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        company_name,
        product_id: product_id || null,
        brand_name,
        style_number,
        product_name,
        print_method,
        print_locations,
        number_of_colors,
        total_quantity,
        size_breakdown,
        garment_color,
        artwork_notes,
        customer_notes,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Quote submission error:", error)
      return NextResponse.json(
        { error: "Failed to submit quote request" },
        { status: 500 }
      )
    }

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to customer

    return NextResponse.json({
      success: true,
      quote_id: data.id,
      quote_number: data.quote_number,
    })
  } catch (error) {
    console.error("Quote API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  let query = supabase
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ quotes: data })
}
