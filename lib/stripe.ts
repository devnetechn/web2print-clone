import Stripe from "stripe"

// Lazily instantiate the Stripe client. Creating it at module scope made the
// Next.js build fail ("Neither apiKey nor config.authenticator provided")
// because route modules are evaluated while collecting page data, before any
// request and without STRIPE_SECRET_KEY in the build environment.
//
// The exported `stripe` is a Proxy so existing callers (`stripe.checkout...`,
// `stripe.webhooks...`) keep working unchanged — the real client is created on
// first property access, at request time.
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
    })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})
