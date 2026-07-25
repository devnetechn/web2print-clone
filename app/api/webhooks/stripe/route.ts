import { createAdminClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { pushOrderToFourOver } from "@/lib/4over/push-order"
import { headers } from "next/headers"
import { after, type NextRequest, NextResponse } from "next/server"

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
      case "checkout.session.completed": {
        const session = event.data.object

        // payment_intent_id stores the Checkout Session id (cs_...), set by
        // app/actions/orders.ts before redirecting to payment.
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
          })
          .eq("payment_intent_id", session.id)

        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("payment_intent_id", session.id)
          .single()

        if (order) {
          await supabase.from("order_status_logs").insert({
            order_id: order.id,
            status: "processing",
            notes: "Payment received successfully",
          })

          // Automatic hand-off to 4over on payment, per the client's request.
          //
          // This runs in after() rather than inline because a 4over submit
          // takes ~30-50s and Stripe gives a webhook 30s before it times out
          // and retries. Inline, every order would time out, Stripe would
          // retry, and the endpoint would look broken even when it worked.
          // after() lets the 200 go back immediately and the push continue.
          //
          // A failure in here therefore cannot be retried by Stripe, which is
          // deliberate: a retry risks a second charge and a second print job.
          // Failures are recorded against the order for an admin to retry from
          // /admin/orders/4over-transfer instead.
          const profileToken = process.env.FOUROVER_DEFAULT_PAYMENT_PROFILE
          if (profileToken) {
            after(async () => {
              try {
                const result = await pushOrderToFourOver(order.id, profileToken)
                if (!result.success) {
                  console.error(`[4over] Auto-push failed for order ${order.id}:`, result.error)
                  await supabase.from("order_status_logs").insert({
                    order_id: order.id,
                    status: "processing",
                    notes: `Automatic 4over submission FAILED: ${result.error}. Retry from Orders > 4over Transfer.`,
                  })
                }
              } catch (err) {
                console.error(`[4over] Auto-push threw for order ${order.id}:`, err)
                await supabase.from("order_status_logs").insert({
                  order_id: order.id,
                  status: "processing",
                  notes: `Automatic 4over submission errored: ${String(err)}. Retry from Orders > 4over Transfer.`,
                })
              }
            })
          } else {
            // Not an error — this is how the manual flow stays available.
            await supabase.from("order_status_logs").insert({
              order_id: order.id,
              status: "processing",
              notes:
                "Awaiting manual 4over submission (FOUROVER_DEFAULT_PAYMENT_PROFILE is not set, so automatic hand-off is off).",
            })
          }
        }

        break
      }

      case "payment_intent.payment_failed": {
        const failedPayment = event.data.object

        // This used to match failedPayment.id (a pi_...) against
        // payment_intent_id, which holds a Checkout Session id (cs_...) — the
        // two never match, so no failed payment was ever recorded and the
        // order sat at pending forever. The session has to be looked up from
        // the PaymentIntent to get back to the id the order was stored under.
        const sessions = await stripe.checkout.sessions.list({ payment_intent: failedPayment.id, limit: 1 })
        const sessionId = sessions.data[0]?.id

        if (sessionId) {
          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              status: "cancelled",
            })
            .eq("payment_intent_id", sessionId)
        }

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
