import { createClient } from "@/lib/supabase/server"
import { fourOverAPI } from "@/lib/4over-api"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin permission
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { orderId } = body

    // Get order details
    const { data: order } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (*)
        )
      `,
      )
      .eq("id", orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Prepare 4over order format
    const fourOverOrder = {
      orderId: order.order_number.toString(),
      items: order.order_items.map((item: any) => ({
        productId: item.products.provider_product_id || item.product_id,
        quantity: item.quantity,
        specifications: item.options || {},
        files: item.design_file_url ? [item.design_file_url] : [],
      })),
      shipping: {
        name: order.shipping_address?.name || "",
        address1: order.shipping_address?.address || "",
        city: order.shipping_address?.city || "",
        state: order.shipping_address?.state || "",
        zip: order.shipping_address?.zip_code || "",
        country: "USA",
      },
    }

    // Submit to 4over
    const result = await fourOverAPI.submitOrder(fourOverOrder)

    // Update order with 4over order ID
    await supabase
      .from("order_items")
      .update({
        provider_order_id: result.fourOverOrderId,
        provider_status: "submitted",
      })
      .eq("order_id", orderId)

    // Update order status
    await supabase
      .from("orders")
      .update({
        status: "production",
      })
      .eq("id", orderId)

    // Log status change
    await supabase.from("order_status_logs").insert({
      order_id: orderId,
      status: "production",
      notes: `Order submitted to 4over. Order ID: ${result.fourOverOrderId}`,
    })

    return NextResponse.json({
      success: true,
      fourOverOrderId: result.fourOverOrderId,
      message: "Order successfully submitted to 4over",
    })
  } catch (error) {
    console.error("[v0] Error submitting order to 4over:", error)
    return NextResponse.json({ error: "Failed to submit order to 4over" }, { status: 500 })
  }
}
