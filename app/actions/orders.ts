"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

type OrderCartItem = {
  productName: string
  quantity?: number
  price?: number
  size?: string
  colorspec?: string
  turnaround?: string
  productUuid?: string
  colorspecUuid?: string
  runsizeUuid?: string
  turnaroundUuid?: string
  designFile?: { fileName: string; url: string; contentType?: string }
}

type ShippingForm = {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  companyName: string
  mobileNumber: string
  notes: string
}

// Creates the actual `orders` + `order_items` rows BEFORE handing off to
// Stripe, then points the order's payment_intent_id at the new Checkout
// Session so the existing /api/webhooks/stripe handler (which only
// UPDATEs by payment_intent_id, never creates) can mark it paid once the
// customer completes payment. Without this, orders never reached the
// database at all — nothing for the admin panel to show.
export async function createOrderAndCheckoutSession({
  items,
  shippingForm,
  deliveryMethod,
  subtotal,
  shippingCost,
  discount,
  tax,
  total,
  customerEmail,
  poNumber,
  orderNotes,
}: {
  items: OrderCartItem[]
  shippingForm: ShippingForm
  deliveryMethod: "shipping" | "pickup"
  subtotal: number
  shippingCost: number
  discount: number
  tax: number
  total: number
  customerEmail?: string
  poNumber?: string
  orderNotes?: string
}) {
  if (!items.length) {
    throw new Error("Cart is empty")
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("Not logged in")
  }

  const admin = createAdminClient()

  const shippingAddress =
    deliveryMethod === "pickup"
      ? { method: "pickup", location: "Web2Print USA - 7901 4th St. N #27125, St. Petersburg, FL 33702" }
      : {
          method: "shipping",
          name: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
          address: shippingForm.address,
          city: shippingForm.city,
          state: shippingForm.state,
          postalCode: shippingForm.postalCode,
          country: shippingForm.country,
          companyName: shippingForm.companyName,
          mobileNumber: shippingForm.mobileNumber,
        }

  const notesParts = [
    poNumber ? `PO Number: ${poNumber}` : null,
    orderNotes || null,
    shippingForm.notes || null,
  ].filter(Boolean)

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      customer_id: userData.user.id,
      customer_email: customerEmail || userData.user.email || "",
      status: "pending",
      subtotal,
      tax,
      shipping: shippingCost,
      total,
      payment_status: "unpaid",
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      order_notes: notesParts.join("\n") || null,
    })
    .select("id, order_number")
    .single()

  if (orderError || !order) {
    throw new Error(orderError?.message || "Failed to create order")
  }

  const orderItemRows = items.map((item) => {
    const quantity = item.quantity || 1
    const totalPrice = item.price || 0
    return {
      order_id: order.id,
      product_name: item.productName,
      quantity,
      unit_price: totalPrice / quantity,
      total_price: totalPrice,
      options: {
        size: item.size,
        colorspec: item.colorspec,
        turnaround: item.turnaround,
        productUuid: item.productUuid,
        colorspecUuid: item.colorspecUuid,
        runsizeUuid: item.runsizeUuid,
        turnaroundUuid: item.turnaroundUuid,
      },
      design_file_url: item.designFile?.url || null,
      print_provider: item.productUuid ? "4over" : null,
    }
  })

  const { error: itemsError } = await admin.from("order_items").insert(orderItemRows)
  if (itemsError) {
    throw new Error(itemsError.message)
  }

  await admin.from("order_status_logs").insert({
    order_id: order.id,
    status: "pending",
    notes: "Order created, awaiting payment",
    created_by: userData.user.id,
  })

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Web2Print Order #${order.order_number}` },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    ...(customerEmail ? { customer_email: customerEmail } : {}),
  })

  await admin.from("orders").update({ payment_intent_id: session.id }).eq("id", order.id)

  return session.client_secret
}
