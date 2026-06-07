import { createClient } from "@/lib/supabase/server"
import { fourOverAPI } from "@/lib/4over-api"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { orderId } = body

    // Get order items with 4over order IDs
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, provider_order_id, provider_status")
      .eq("order_id", orderId)
      .not("provider_order_id", "is", null)

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ error: "No 4over orders found for this order" }, { status: 404 })
    }

    const updates = []

    for (const item of orderItems) {
      if (item.provider_order_id) {
        const status = await fourOverAPI.getOrderStatus(item.provider_order_id)

        updates.push({
          item_id: item.id,
          new_status: status.status,
          tracking_number: status.trackingNumber,
        })

        // Update item status
        await supabase
          .from("order_items")
          .update({
            provider_status: status.status,
          })
          .eq("id", item.id)
      }
    }

    // Check if all items are shipped
    const { data: allItems } = await supabase.from("order_items").select("provider_status").eq("order_id", orderId)

    const allShipped = allItems?.every((item: any) => item.provider_status === "shipped")

    if (allShipped) {
      await supabase
        .from("orders")
        .update({
          status: "shipped",
          shipped_date: new Date().toISOString(),
        })
        .eq("id", orderId)

      await supabase.from("order_status_logs").insert({
        order_id: orderId,
        status: "shipped",
        notes: "All items shipped from 4over",
      })
    }

    return NextResponse.json({
      success: true,
      updates,
      allShipped,
    })
  } catch (error) {
    console.error("[v0] Error syncing 4over status:", error)
    return NextResponse.json({ error: "Failed to sync 4over status" }, { status: 500 })
  }
}
