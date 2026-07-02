# Product Info Tabs — Description / Specs / Templates / FAQs

**Date:** 2026-07-02
**Branch:** security/4over-env-vars
**Scope:** All product pages under `/print/[category]/[typeSlug]`
**Goal:** Add a tabbed info section below the price calculator on every product page, matching 4over's layout: Description, Specs, Templates, FAQs.

---

## Background

4over shows a 4-tab section below the calculator on every product page. Our site currently ends at the calculator — no description, specs, templates, or FAQs. Boss Dwayne wants parity.

Confirmed via Playwright on: Silk Business Cards, Standard Business Cards, Suede Business Cards, 4mm Coroplast Signs — all have the same 4-tab structure.

---

## Approach

**New `product_content` Supabase table** keyed by `category_slug` stores editable content (Description, FAQs, Templates). Specs tab auto-generates from the cascade data already fetched by `page.tsx` — zero extra API calls. Admin edits content via simple textarea/JSON forms at `/admin/products/content`.

Files changed:
- `scripts/015_product_content.sql` — new migration
- `components/print/product-info-tabs.tsx` — new server component
- `app/(storefront)/print/[category]/[typeSlug]/page.tsx` — fetch content + pass specsData, render tabs
- `app/(admin)/admin/products/content/page.tsx` — product list
- `app/(admin)/admin/products/content/[slug]/page.tsx` — edit form

---

## Data Layer

### Supabase table: `product_content`

```sql
CREATE TABLE product_content (
  category_slug TEXT PRIMARY KEY,
  description TEXT,
  faqs JSONB NOT NULL DEFAULT '[]',
  template_file_prep JSONB,
  template_urls JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`faqs` shape:**
```ts
type FAQ = { q: string; a: string }
// e.g. [{ q: "Are silk business cards waterproof?", a: "Yes, they are water-resistant..." }]
```

**`template_file_prep` shape:**
```ts
type FilePrepInfo = {
  note?: string           // "For specific instructions see our FAQ's (e.g. Akuafoil and Spot UV)"
  resolution: string      // "300dpi"
  color_mode: string      // "CMYK"
  bleed: string           // "0.125\" (0.0625 on each side)"
  file_types: string[]    // ["PDF (recommended)", "JPG", "EPS", "TIFF"]
}
```

**`template_urls` shape:**
```ts
type TemplateLink = { size: string; url: string }
// e.g. [{ size: "1.5\" x 3.5\"", url: "https://4over.com/media/wysiwyg/templates/..." }]
```

### RLS
`product_content` is read-only for public (storefront renders server-side, no client exposure). Admin operations use the service role key.

---

## Specs Tab — Auto-generated

Specs data is derived from the cascade state already available in `page.tsx` at render time. The server extracts a `SpecsData` object from the fetched cascade results and passes it to `<ProductInfoTabs>`.

```ts
type SpecsData = {
  sizes: string[]
  stocks: string[]
  colorspecs: string[]
  coatings: string[]
  extraGroups: { name: string; options: string[] }[]
  turnaround: string[]
}
```

**Source mapping (page.tsx → SpecsData):**
| SpecsData field | Source |
|-----------------|--------|
| `sizes` | `sizeList.map(s => s.name)` — cleaned via `cleanBCSizeList` for BC |
| `stocks` | `stockList.map(s => s.name)` |
| `colorspecs` | `colorspecOptions.map(o => o.option_name)` |
| `coatings` | `coatingList.map(c => c.name)` |
| `extraGroups` | `extraGroups.map(g => ({ name: g.group_name, options: g.options.map(o => o.option_name) }))` |
| `turnaround` | `turnaroundOptions.map(o => o.option_name)` |

**Display layout** — two-column grid (matches 4over):

Left column: Size, Shape (if shapeList available), Radius of Corners (if available), Stock
Right column: Colorspec, Coating, SPOT UV SIDES (if available), Lamination (if available), Scoring Options (if available), Turnaround Time

Shape comes from `shapeList` (resolved after the initial cascade). If `shapeList` is empty or has only 1 item, the Shape section is omitted.

Extra groups (Lamination, Scoring Options, SPOT UV SIDES, etc.) render in whatever order the API returns them. BC uses `BC_GROUP_ORDER` to show Spot UV Sides → Lamination → Scoring first.

**Limitation:** Only shows options from the initial cascade path (first size → first stock → first coating). Shape variants across different size combos may not all appear. Accepted for now.

---

## Templates Tab

Two sections:

**File Prep block** (if `template_file_prep` is non-null):
```
File Preparation: {note}
Resolution: {resolution}
Color Mode: {color_mode}
Bleed: {bleed}
File Types: {file_types.join(", ")}
```

**Size accordion** (from `template_urls`):
- One collapsible row per entry: size label + "+" icon
- Expanded: shows link to 4over's template URL with a download icon
- If `template_urls` is empty → "Templates coming soon."

Template URLs are entered manually by admin — Boss Dwayne copies links from 4over's own Templates tab.

---

## UI Component

**File:** `components/print/product-info-tabs.tsx`
**Type:** Server component (no client state needed — tabs handled by shadcn `<Tabs>` which is already a client component internally)

```tsx
interface ProductInfoTabsProps {
  categorySlug: string
  productName: string
  content: ProductContent | null  // null = no DB row yet
  specsData: SpecsData
}
```

Uses existing `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` from `components/ui/tabs.tsx`.

Default active tab: `"description"`.

**Empty states:**
- Description: `"Product description coming soon."` (if `content?.description` is null/empty)
- Specs: always renders from API data (never empty if cascade ran)
- Templates: `"Templates coming soon."` (if no template_urls)
- FAQs: `"FAQs coming soon."` (if faqs array is empty)

---

## Page Integration

**Both render branches** in `app/(storefront)/print/[category]/[typeSlug]/page.tsx` get:

1. A Supabase fetch at the top of the branch:
```ts
const { data: content } = await supabase
  .from("product_content")
  .select("*")
  .eq("category_slug", category)
  .single()
```

2. A `specsData` object derived from cascade results already in scope.

3. The tabs rendered after the calculator grid:
```tsx
<div className="max-w-5xl mx-auto px-4 mt-10 pb-12">
  <ProductInfoTabs
    categorySlug={category}
    productName={productName}
    content={content}
    specsData={specsData}
  />
</div>
```

---

## Admin UI

**Route:** `app/(admin)/admin/products/content/`

**List page** (`page.tsx`):
- Reads all known `category_slug` values from a static list (same slugs as the storefront's `TYPE_KEYWORDS` / `SIZE_GROUPED_PARENTS`)
- Shows which slugs already have a `product_content` row (green dot) vs. not yet (grey)
- "Edit" button per row

**Edit page** (`[slug]/page.tsx`):
- Server-renders existing content (or empty defaults)
- Form fields:
  - `description`: `<textarea>` (plain text, displayed as-is)
  - `faqs`: add/remove rows, each with Question + Answer `<input>`/`<textarea>` fields
  - `template_file_prep`: individual inputs for resolution, color_mode, bleed, file_types (comma-separated)
  - `template_urls`: add/remove rows, each with Size label + URL inputs
- Submit via Server Action → upsert into `product_content`

---

## What Does NOT Change

- The price calculator logic — untouched
- The 4over API cascade — untouched
- Non-print product pages (apparel, merch) — untouched
- Existing admin routes — new routes added, nothing changed

---

## Out of Scope

- Rich text editor for Description (plain textarea for now)
- "You may also be interested in" related products section
- Auto-seeding content from 4over (manual entry only)
- Template file hosting (links go directly to 4over's URLs)
