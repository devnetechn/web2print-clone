import { createAdminClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = (await headers()).get("stripe-signature")

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Stripe's server-to-server request carries no Supabase session cookie, so
  // the cookie-bound client (createClient) would run as anonymous and RLS
  // would silently drop these updates (0 rows affected, no error). The
  // signature check above is the actual auth boundary here, so the admin
  // client is the correct one to use.
  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object

        // Update order status
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
          })
          .eq("payment_intent_id", session.id)

        // Log status change
        const { data: order } = await supabase.from("orders").select("id").eq("payment_intent_id", session.id).single()

        if (order) {
          await supabase.from("order_status_logs").insert({
            order_id: order.id,
            status: "processing",
            notes: "Payment received successfully",
          })
        }

        break

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object

        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            status: "cancelled",
          })
          .eq("payment_intent_id", failedPayment.id)

        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
