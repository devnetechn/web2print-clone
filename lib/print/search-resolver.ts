import { GROUPS } from "@/lib/print/categories"

// Resolves a free-text search query to the best REAL catalog route.
//
// Priority order (most specific wins):
//   1. Exact product-type match  -> /print/[category]/[typeSlug]
//   2. Exact category match      -> /print/[category]
//   3. Category label contains q -> /print/[category]
//   4. Product-type name contains q (shortest wins) -> /print/[category]/[typeSlug]
//   5. Fallback -> /products?search=q  (still backed by the 4over catalog)
//
// This DOES NOT touch the 4over API — it only picks which already-built,
// API-backed page to navigate to.

type Entry = {
  route: string
  name: string // normalized
  kind: "type" | "category"
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

// Flatten GROUPS into a lookup index once at module load.
const CATEGORY_ENTRIES: Entry[] = []
const TYPE_ENTRIES: Entry[] = []

for (const [catKey, group] of Object.entries(GROUPS)) {
  CATEGORY_ENTRIES.push({
    route: `/print/${catKey}`,
    name: norm(group.label),
    kind: "category",
  })
  // Also index the URL key itself (e.g. "business-cards" -> "business cards").
  CATEGORY_ENTRIES.push({
    route: `/print/${catKey}`,
    name: norm(catKey),
    kind: "category",
  })
  for (const sub of group.subcategories) {
    TYPE_ENTRIES.push({
      route: `/print/${catKey}/${sub.slug}`,
      name: norm(sub.name),
      kind: "type",
    })
    TYPE_ENTRIES.push({
      route: `/print/${catKey}/${sub.slug}`,
      name: norm(sub.slug),
      kind: "type",
    })
  }
}

export function resolveSearch(rawQuery: string): string {
  const q = norm(rawQuery)
  if (!q) return "/products"

  // 1. Exact product-type match.
  const exactType = TYPE_ENTRIES.find((e) => e.name === q)
  if (exactType) return exactType.route

  // 2. Exact category match.
  const exactCat = CATEGORY_ENTRIES.find((e) => e.name === q)
  if (exactCat) return exactCat.route

  // Only attempt fuzzy "contains" matching for queries of a useful length,
  // so a stray 2-3 char query doesn't grab an unrelated page.
  if (q.length >= 4) {
    // 3. Category label contains / is contained by the query.
    const catContains = CATEGORY_ENTRIES.find(
      (e) => e.name.includes(q) || q.includes(e.name),
    )
    if (catContains) return catContains.route

    // 4. Product-type name contains / is contained by the query. Prefer the
    //    shortest matching name (the most specific product type).
    const typeMatches = TYPE_ENTRIES.filter(
      (e) => e.name.includes(q) || q.includes(e.name),
    ).sort((a, b) => a.name.length - b.name.length)
    if (typeMatches.length > 0) return typeMatches[0].route
  }

  // 5. Fallback: the 4over-backed products page filtered by the raw query.
  return `/products?search=${encodeURIComponent(rawQuery.trim())}`
}
