import { templateCatalog, categorySlug, type TemplateProduct } from "./templates"

// Maps a storefront category slug (the [category] URL segment) to the product
// FAMILY name in the scraped template catalog (lib/print/templates-catalog.json).
// The catalog is organized into broad families — e.g. every business-card
// variant (Standard, Silk, Kraft, Foil, ...) shares the one "Business Cards"
// family, whose templates are keyed by trim size, exactly like 4over's own
// templates page. Slugs with no printable template family (e.g. calendars,
// mugs) are intentionally absent and fall through to null.
const CATEGORY_TO_FAMILY: Record<string, string> = {
  // Business Cards — all variants share the single family
  "business-cards-standard": "Business Cards",
  "raised-foil": "Business Cards",
  "silk-cards": "Business Cards",
  "suede-cards": "Business Cards",
  "pearl-cards": "Business Cards",
  "natural-cards": "Business Cards",
  "painted-edge-cards": "Business Cards",
  "brown-kraft-cards": "Business Cards",
  "akuafoil": "Business Cards",
  "linen-uncoated": "Business Cards",
  "plastic-cards": "Business Cards",
  "dual-raised": "Business Cards",
  "raised-spot-uv": "Business Cards",
  "foil-worx": "Business Cards",
  "endurace-cards": "Business Cards",
  "leaf-cards": "Business Cards",
  "oval-cards": "Business Cards",
  "fold-over-cards": "Business Cards",

  // Marketing Products
  "flyers-and-brochures": "Flyers and Brochures",
  "tear-off-cards": "Flyers and Brochures",
  "trading-cards": "Trading Cards",
  "postcards": "Postcards",
  "presentation-folders": "Presentation Folders",
  "announcement-cards": "Announcement Cards",
  "booklets": "Booklets",
  "catalogs": "Catalogs",
  "counter-cards": "Counter Cards",
  "door-hangers": "Door Hangers",
  "envelopes": "Envelopes",
  "event-tickets": "Event Tickets",
  "greeting-cards": "Greeting Cards",
  "hang-tags": "Hang Tags",
  "letterheads": "Letterheads",
  "magnets": "Magnets",
  "menus": "Menus",
  "ncr-forms": "NCR Forms",
  "notepads": "Notepads",
  "posters": "Posters",
  "rack-cards": "Rack Cards",
  "sell-sheets": "Sell Sheets",
  "social-cards": "Social Cards",
  "table-tent-cards": "Table Tent",

  // Signs & Banners
  "outdoor-banners": "Banners & Flags",
  "indoor-banners": "Banners & Flags",
  "flags": "Banners & Flags",
  "banner-stands": "Display and Events",
  "displays": "Display and Events",
  "table-covers": "Display and Events",
  "window-graphics": "Adhesive Graphics",
  "wall-decals": "Adhesive Graphics",
  "floor-graphics": "Adhesive Graphics",
  "vehicle-magnets": "Adhesive Graphics",
  "rigid-signs": "Signs",
  "wall-arts": "Signs",

  // Boxes & Packaging
  "packaging": "Packaging Tags & Cards",
  "custom-boxes": "Packaging Tags & Cards",
  "header-cards": "Packaging Tags & Cards",

  // Roll Labels & Stickers
  "roll-labels": "Roll Labels & Stickers",
  "stickers": "Roll Labels & Stickers",
  "bumper-stickers": "Roll Labels & Stickers",

  // Promo Products
  "t-shirts": "Apparel",
  "tote-bags": "Marketing Promo Products",
  "mugs": "Marketing Promo Products",
  "buttons": "Marketing Promo Products",
}

/**
 * Resolves the design-template family for a storefront category slug.
 * Returns null when the category has no matching template family in the catalog.
 */
export function resolveTemplateProduct(slug: string): TemplateProduct | null {
  const familyName = CATEGORY_TO_FAMILY[slug]
  if (!familyName) return null
  const targetSlug = categorySlug(familyName)
  for (const cat of templateCatalog) {
    for (const p of cat.products) {
      if (categorySlug(p.product) === targetSlug) return p
    }
  }
  return null
}
