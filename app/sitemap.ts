import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"
import { GROUPS, SLUG_TO_CATEGORY } from "@/lib/print/categories"
import { INDUSTRY_ORDER, SCHOOLS_GOV_TILE } from "@/lib/industries"

// Static, publicly indexable marketing pages. Transactional/account routes
// (cart, checkout, account, tracking, admin, api) are intentionally excluded —
// they are also noindex'd at the page level.
const STATIC_PATHS = [
  "/",
  "/print",
  "/products",
  "/industries",
  "/services",
  "/services/website-design",
  "/services/storefront-makeover",
  "/programs",
  "/about",
  "/quote",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }))

  // Parent print categories (e.g. /print/business-cards) + every product leaf
  // (e.g. /print/silk-cards) — both render through the /print/[category] route.
  const categorySlugs = new Set<string>([
    ...Object.keys(GROUPS),
    ...Object.keys(SLUG_TO_CATEGORY),
  ])
  const printEntries: MetadataRoute.Sitemap = [...categorySlugs].map((slug) => ({
    url: `${SITE_URL}/print/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  const industrySlugs = [...INDUSTRY_ORDER, SCHOOLS_GOV_TILE.slug]
  const industryEntries: MetadataRoute.Sitemap = industrySlugs.map((slug) => ({
    url: `${SITE_URL}/industries/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  return [...staticEntries, ...printEntries, ...industryEntries]
}
