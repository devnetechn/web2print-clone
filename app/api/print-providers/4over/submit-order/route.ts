import { createClient } from "@/lib/supabase/server"
import { pushOrderToFourOver } from "@/lib/4over/push-order"
import { type NextRequest, NextResponse } from "next/server"

// The manual path: an admin picking an order and a card in
// /admin/orders/4over-transfer. The push itself now lives in
// lib/4over/push-order.ts so the Stripe webhook can run the same code without
// a session — this route is just the admin gate around it.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    const { orderId, profileToken } = await request.json()

    if (!profileToken) {
      return NextResponse.json({ error: "No payment profile selected" }, { status: 400 })
    }

    const result = await pushOrderToFourOver(orderId, profileToken)

    if (!result.success) {
      const status = result.error === "Order not found" ? 404 : result.error.includes("eligible") ? 400 : 502
      return NextResponse.json({ error: result.error }, { status })
    }

    if (result.alreadySubmitted) {
      return NextResponse.json({
        success: true,
        jobIds: result.jobIds,
        message: `This order was already sent to 4over (job ${result.jobIds.join(", ")}). Not sending it again.`,
      })
    }

    return NextResponse.json({
      success: true,
      fourOverOrderId: result.fourOverOrderId,
      jobIds: result.jobIds,
      fileWarnings: result.fileWarnings,
      message:
        result.fileWarnings.length > 0
          ? `Order sent to 4over, but artwork needs attention: ${result.fileWarnings.join("; ")}`
          : "Order successfully submitted to 4over",
    })
  } catch (error) {
    console.error("[4over] Error submitting order:", error)
    return NextResponse.json({ error: "Failed to submit order to 4over" }, { status: 500 })
  }
}
