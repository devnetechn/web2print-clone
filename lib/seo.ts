// Central SEO helpers: canonical URLs, structured data (JSON-LD), and unique
// per-category marketing descriptions. Presentation-layer only — this file
// never touches the 4over API, env vars, or order/checkout logic.

// Canonical host is the www subdomain (per SEO spec §1/§4). Non-www and http
// should 301 to this at the DNS/Vercel level.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.web2printusa.com"
).replace(/\/$/, "")

export const SITE_NAME = "Web2Print USA"
export const SITE_PHONE = "+1-888-843-6867"
export const SITE_EMAIL = "info@web2printusa.com"
export const SITE_LOGO = `${SITE_URL}/logo.png`
export const DEFAULT_OG_IMAGE = "/og-image.png"

// NAP (§4): Service-Area Business based in Fort Lauderdale. The public
// geographic identity is Fort Lauderdale + the three South Florida counties;
// the St. Petersburg address is a registered-agent mailing address only.
export const SITE_CITY = "Fort Lauderdale"
export const SITE_REGION = "FL"
export const SERVICE_AREAS = ["Broward County", "Miami-Dade County", "Palm Beach County"]

// Public social/citation profiles (§1.6 sameAs). Add real profile URLs here as
// they go live; empty entries are omitted from the schema.
export const SITE_SAME_AS: string[] = []

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

/**
 * Canonical metadata for a page. Always points at the clean path (no query
 * string), which collapses duplicate URLs like /print/postcards/x?uuid=... to
 * a single indexable target.
 */
export function canonical(path: string) {
  return { alternates: { canonical: absoluteUrl(path) } }
}

// ---------------------------------------------------------------------------
// Unique, outcome-oriented category descriptions (suggestion #1).
// Keyed by the parent category slug and by common product-type slugs so each
// page gets its own copy instead of one templated sentence sitewide.
// ---------------------------------------------------------------------------
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "business-cards":
    "Premium business cards that make the first handshake count — silk, raised foil, painted edge, and more, with live pricing and fast nationwide shipping.",
  "marketing-materials":
    "Flyers, brochures, postcards, and booklets that get your offer into the right hands — print-ready quality with live pricing and quick turnaround.",
  "signs-banners":
    "Indoor and outdoor signs, banners, and displays built to be seen — durable materials, bold color, and fast production for your next event or storefront.",
  "boxes-packaging":
    "Custom boxes and packaging that turn unboxing into brand experience — retail-ready structures, premium print, and low minimums.",
  "roll-labels-stickers":
    "Roll labels and stickers that make products pop on the shelf — waterproof options, custom shapes, and vibrant, scuff-resistant printing.",
  "promo-products":
    "Branded promo products people actually keep — apparel, drinkware, magnets, and more that put your logo to work every day.",
  "trading-cards":
    "Custom trading cards with collector-grade finishes — foil, spot UV, and premium stocks that make every card feel special.",
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  postcards:
    "Custom postcards that land your message in mailboxes and hands — premium stocks, live pricing, and fast nationwide shipping from Web2Print USA.",
  "silk-cards":
    "Soft-touch silk business cards with a velvety finish that feels as premium as it looks — configure and order online with live pricing.",
  "raised-foil":
    "Raised foil business cards with tactile metallic shine that makes your brand impossible to ignore — live pricing and fast turnaround.",
  flyers:
    "High-impact custom flyers that get your promotion noticed — bright color, sharp text, and quick turnaround at Web2Print USA.",
  brochures:
    "Professional brochures that tell your story and sell — crisp folds, premium paper, and live online pricing.",
  "roll-labels":
    "Custom roll labels for bottles, jars, and products — waterproof options, custom shapes, and vibrant printing built for the shelf.",
  stickers:
    "Custom stickers and decals in any shape — durable, waterproof, and vivid, priced live and shipped fast.",
  "outdoor-banners":
    "Weatherproof outdoor banners built to grab attention — heavy vinyl, reinforced hems, and bold, fade-resistant color.",
}

/** Unique description for a print category or product-type page. */
export function categoryDescription(slug: string, label: string): string {
  return (
    TYPE_DESCRIPTIONS[slug] ||
    CATEGORY_DESCRIPTIONS[slug] ||
    `Order custom ${label.toLowerCase()} online at Web2Print USA — live pricing, premium stocks, and fast nationwide shipping.`
  )
}

// ---------------------------------------------------------------------------
// Structured data builders (suggestion #2). Return plain objects; render them
// with the <JsonLd> component.
// ---------------------------------------------------------------------------
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_PHONE,
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: "English",
    },
  }
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

export type Crumb = { name: string; path: string }

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  }
}

export function productSchema(opts: {
  name: string
  description: string
  image?: string
  path: string
  sku?: string
  price?: number
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    brand: { "@type": "Brand", name: SITE_NAME },
    url: absoluteUrl(opts.path),
  }
  if (opts.image) schema.image = absoluteUrl(opts.image)
  if (opts.sku) schema.sku = opts.sku
  if (opts.price && opts.price > 0) {
    schema.offers = {
      "@type": "Offer",
      priceCurrency: "USD",
      price: opts.price.toFixed(2),
      availability: "https://schema.org/InStock",
      url: absoluteUrl(opts.path),
      seller: { "@type": "Organization", name: SITE_NAME },
    }
  }
  return schema
}
