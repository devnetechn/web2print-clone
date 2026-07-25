// Storefront sections that ship in the codebase but are deliberately hidden
// from customers until the client signs off on them.
//
// Both default to OFF: anything other than the literal string "true" disables
// the section, so a missing or misspelled env var fails closed rather than
// exposing an unfinished section. Same convention as FOUROVER_LIVE_ORDERS.
//
// These are NEXT_PUBLIC_ because the storefront components that read them are
// client components. That means the value is inlined at build time — flipping
// a flag in Vercel requires a redeploy, not just a settings save.

// Apparel / merch (/merch). Off until the client confirms the SS Activewear
// catalogue and pricing are ready to sell.
export const APPAREL_ENABLED = process.env.NEXT_PUBLIC_ENABLE_APPAREL === "true"

// Custom design tool (/design-studio). Off until the per-product templates are
// finished — the studio currently opens with a generic canvas for every
// product, which is not what a customer expects after picking a specific SKU.
export const DESIGN_STUDIO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DESIGN_STUDIO === "true"
