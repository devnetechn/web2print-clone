import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { amount, customer_info } = body

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Print Order",
              description: "Custom print order from Web2Print USA",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/checkout/cancel`,
      customer_email: customer_info.email,
      metadata: {
        customer_name: customer_info.fullName,
        customer_phone: customer_info.phone,
      },
    })

    // Create order in database
    const { data: order } = await supabase
      .from("orders")
      .insert({
        customer_id: user?.id,
        customer_email: customer_info.email,
        status: "pending",
        payment_status: "unpaid",
        subtotal: amount / 100,
        tax: 0,
        shipping: 0,
        total: amount / 100,
        payment_intent_id: session.id,
        shipping_address: {
          address: customer_info.address,
          city: customer_info.city,
          state: customer_info.state,
          zip_code: customer_info.zipCode,
        },
      })
      .select()
      .single()

    return NextResponse.json({
      clientSecret: session.id,
      orderId: order?.id,
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 })
  }
}
