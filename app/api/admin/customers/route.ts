import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get("sort") || "recent"

    const supabase = await createClient()

    let query = supabase.from("profiles").select("*")

    // Apply sorting
    switch (sort) {
      case "name":
        query = query.order("full_name", { ascending: true })
        break
      case "recent":
      default:
        query = query.order("created_at", { ascending: false })
        break
    }

    const { data: customers, error } = await query

    if (error) {
      return NextResponse.json({ customers: [], error: error.message })
    }

    // Fetch order counts and totals for each customer
    const customersWithStats = await Promise.all(
      (customers || []).map(async (customer) => {
        const { data: orders } = await supabase
          .from("orders")
          .select("total")
          .eq("customer_id", customer.id)

        return {
          ...customer,
          total_orders: orders?.length || 0,
          total_spent: orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
        }
      })
    )

    // Sort by orders or spent if needed
    if (sort === "orders") {
      customersWithStats.sort((a, b) => b.total_orders - a.total_orders)
    } else if (sort === "spent") {
      customersWithStats.sort((a, b) => b.total_spent - a.total_spent)
    }

    return NextResponse.json({ customers: customersWithStats })
  } catch (error) {
    console.error("Customers error:", error)
    return NextResponse.json({ customers: [], error: String(error) })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        company_name: body.company_name,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ customer: data })
  } catch (error) {
    console.error("Create customer error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
