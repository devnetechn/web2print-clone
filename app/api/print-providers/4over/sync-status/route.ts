import { createAdminClient } from "@/lib/supabase/server"
import { getOrderStatus } from "@/lib/4over/client"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    const body = await request.json()
    const { orderId } = body

    // Get order items with 4over order IDs
    const { data: orderItems } = await admin
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
        const result = await getOrderStatus(item.provider_order_id)
        if (!result.success) continue

        // Verified against the live sandbox: the response is
        // { entities: [{ status, date_set, ... }, ...] } - a status
        // HISTORY list, most-recent first - not a single {status} object.
        const newStatus = result.data?.entities?.[0]?.status
        if (!newStatus) continue

        updates.push({
          item_id: item.id,
          new_status: newStatus,
        })

        // Update item status
        await admin
          .from("order_items")
          .update({
            provider_status: newStatus,
          })
          .eq("id", item.id)
      }
    }

    // Check if all items are shipped
    const { data: allItems } = await admin.from("order_items").select("provider_status").eq("order_id", orderId)

    const allShipped = allItems?.length
      ? allItems.every((item: any) => item.provider_status?.toLowerCase() === "shipped")
      : false

    if (allShipped) {
      await admin
        .from("orders")
        .update({
          status: "shipped",
          shipped_date: new Date().toISOString(),
        })
        .eq("id", orderId)

      await admin.from("order_status_logs").insert({
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
