"use server"

import { createClient, createAdminClient, requireAdmin } from "@/lib/supabase/server"
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
  optionUuids?: string[]
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
  multiAddresses,
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
  multiAddresses?: {
    firstName: string
    lastName: string
    address: string
    city: string
    state: string
    postalCode: string
    quantity: number
    country: string
  }[]
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
    multiAddresses && multiAddresses.length > 0
      ? { method: "multiple", addresses: multiAddresses }
      : deliveryMethod === "pickup"
      ? {
          method: "pickup",
          location: "Web2Print USA - 7901 4th St. N #27125, St. Petersburg, FL 33702",
          firstName: shippingForm.firstName,
          lastName: shippingForm.lastName,
          mobileNumber: shippingForm.mobileNumber,
        }
      : {
          method: "shipping",
          name: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
          firstName: shippingForm.firstName,
          lastName: shippingForm.lastName,
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
        optionUuids: item.optionUuids || [],
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

export async function updateOrderStatus({
  orderId,
  status,
  paymentStatus,
  notes,
}: {
  orderId: string
  status: "pending" | "processing" | "production" | "shipped" | "completed" | "cancelled"
  paymentStatus: "unpaid" | "paid" | "refunded"
  notes?: string
}) {
  const { user, error: authError } = await requireAdmin()
  if (!user) {
    return { success: false, error: authError }
  }

  const admin = createAdminClient()

  const dateFields: Record<string, string> = {}
  if (status === "production") dateFields.production_date = new Date().toISOString()
  if (status === "shipped") dateFields.shipped_date = new Date().toISOString()
  if (status === "completed") dateFields.completed_date = new Date().toISOString()

  const { error } = await admin
    .from("orders")
    .update({ status, payment_status: paymentStatus, ...dateFields, updated_at: new Date().toISOString() })
    .eq("id", orderId)

  if (error) {
    return { success: false, error: error.message }
  }

  await admin.from("order_status_logs").insert({
    order_id: orderId,
    status,
    notes: notes || `Status updated to ${status}`,
    created_by: user.id,
  })

  return { success: true }
}

export async function refundOrder(orderId: string) {
  const { user, error: authError } = await requireAdmin()
  if (!user) {
    return { success: false, error: authError }
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from("orders")
    .select("id, payment_status, payment_intent_id")
    .eq("id", orderId)
    .single()

  if (!order) {
    return { success: false, error: "Order not found" }
  }
  if (order.payment_status !== "paid") {
    return { success: false, error: "Only paid orders can be refunded" }
  }
  if (!order.payment_intent_id) {
    return { success: false, error: "No payment record found for this order" }
  }

  try {
    // payment_intent_id actually stores the Checkout Session ID (cs_...) -
    // the PaymentIntent itself (needed for the refund call) only exists on
    // the session once it's completed, so it has to be looked up here.
    const session = await stripe.checkout.sessions.retrieve(order.payment_intent_id)
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id
    if (!paymentIntentId) {
      return { success: false, error: "No payment intent found on this checkout session" }
    }

    await stripe.refunds.create({ payment_intent: paymentIntentId })
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Stripe refund failed" }
  }

  await admin
    .from("orders")
    .update({ payment_status: "refunded", status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", orderId)

  await admin.from("order_status_logs").insert({
    order_id: orderId,
    status: "cancelled",
    notes: "Order refunded via Stripe",
    created_by: user.id,
  })

  return { success: true }
}
