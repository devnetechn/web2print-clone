"use server"

import { stripe } from "@/lib/stripe"

export async function createCheckoutSession(items: {
  name: string
  priceInCents: number
  quantity: number
}[]) {
  if (!items || items.length === 0) {
    throw new Error("No items provided for checkout")
  }

  const lineItems = items.map(item => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
      },
      unit_amount: item.priceInCents,
    },
    quantity: item.quantity,
  }))

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: lineItems,
    mode: "payment",
  })

  return session.client_secret
}

export async function createSimpleCheckoutSession(
  totalInCents: number,
  description: string = "Print Order",
  customerEmail?: string,
) {
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: description,
          },
          unit_amount: totalInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    // Pre-fills Stripe's own email field; shipping/billing address is
    // already collected on the Shipping step, so it's deliberately NOT
    // requested again here via shipping_address_collection.
    ...(customerEmail ? { customer_email: customerEmail } : {}),
  })

  return session.client_secret
}

// Print cart checkout - for 4over products
export async function createPrintCartCheckoutSession(
  items: {
    productName: string
    productCode: string
    size?: string
    options: { groupName: string; optionName: string }[]
    quantity: number
    unitPrice: number
  }[],
  shippingCost: number = 0
) {
  if (!items.length) {
    throw new Error('Cart is empty')
  }

  const lineItems = items.map(item => {
    const optionsDesc = item.options.map(o => `${o.groupName}: ${o.optionName}`).join(', ')
    const description = item.size 
      ? `Size: ${item.size}${optionsDesc ? ` | ${optionsDesc}` : ''}`
      : optionsDesc || item.productCode

    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productName,
          description: description.slice(0, 500),
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }
  })

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Shipping',
          description: 'UPS Shipping',
        },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    })
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    line_items: lineItems,
    mode: 'payment',
    shipping_address_collection: {
      allowed_countries: ['US'],
    },
  })

  return session.client_secret
}

export async function createMerchCheckoutSession({
  productName,
  garmentPriceInCents,
  printPriceInCents,
  setupFeeInCents,
  quantity,
  shippingOption,
}: {
  productName: string
  garmentPriceInCents: number
  printPriceInCents: number
  setupFeeInCents: number
  quantity: number
  shippingOption: "standard" | "express" | "overnight"
}) {
  // Shipping rates in cents
  const SHIPPING_RATES: Record<string, { label: string; price: number; days: string }> = {
    standard: { label: "Standard Shipping (5-7 business days)", price: 1499, days: "5-7 days" },
    express:  { label: "Express Shipping (2-3 business days)",  price: 2999, days: "2-3 days" },
    overnight:{ label: "Overnight Shipping (1 business day)",   price: 4999, days: "1 day" },
  }

  const shipping = SHIPPING_RATES[shippingOption]

  const lineItems = [
    {
      price_data: {
        currency: "usd",
        product_data: { name: productName },
        unit_amount: garmentPriceInCents,
      },
      quantity,
    },
    {
      price_data: {
        currency: "usd",
        product_data: { name: "Printing & Decoration" },
        unit_amount: printPriceInCents,
      },
      quantity: 1,
    },
  ]

  if (setupFeeInCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Screen Setup Fee" },
        unit_amount: setupFeeInCents,
      },
      quantity: 1,
    })
  }

  // Shipping as a line item
  lineItems.push({
    price_data: {
      currency: "usd",
      product_data: { name: shipping.label },
      unit_amount: shipping.price,
    },
    quantity: 1,
  })

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: lineItems,
    mode: "payment",
    phone_number_collection: { enabled: true },
    billing_address_collection: "required",
  })

  return session.client_secret
}
