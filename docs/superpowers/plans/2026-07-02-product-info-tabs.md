# Product Info Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Description / Specs / Templates / FAQs tabs below every product page's price calculator, matching 4over's layout.

**Architecture:** A new `product_content` Supabase table stores editable content (Description, FAQs, Templates). A `"use client"` React component `<ProductInfoTabs>` renders 4 tabs; the Specs tab lazily fetches from existing cascade API routes on first click — no extra server-side requests on page load. Both render branches in `page.tsx` fetch content at the top level and render the tabs below the calculator grid.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS), shadcn/ui Tabs, Radix UI (via existing `components/ui/tabs.tsx`), Lucide icons, Server Actions.

## Global Constraints

- Push to `testing` remote only (`git push testing ...`) — NEVER push to `origin`
- Admin routes live under `app/admin/` (NOT `app/(admin)/admin/`) — follow existing admin file pattern
- Use `createClient()` from `@/lib/supabase/server` for server-side reads; `createAdminClient()` for writes
- Supabase client already created at line 890 of `app/(storefront)/print/[category]/[typeSlug]/page.tsx` — reuse it for the product_content fetch, do NOT create a second client
- Existing `components/ui/tabs.tsx` exports: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — use as-is, do not modify
- No new npm packages — use only what is already installed
- Code comments: English only, one short line max, only when WHY is non-obvious
- No TypeScript `any` in production paths; use it only in the Specs lazy-fetch response parsing where API shape is dynamically typed
- Spec said "Specs data derived from page.tsx cascade" — this is corrected in the plan: cascade state is client-side only, so `ProductInfoTabs` fetches lazily when Specs tab is first clicked

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/015_product_content.sql` | Create | DB migration: `product_content` table + RLS |
| `lib/print/product-content.ts` | Create | TypeScript types: `ProductContent`, `FAQ`, `FilePrepInfo`, `TemplateLink` |
| `components/print/product-info-tabs.tsx` | Create | `"use client"` tabs component with lazy Specs fetch |
| `app/(storefront)/print/[category]/[typeSlug]/page.tsx` | Modify | Fetch content, remove old stub, render `<ProductInfoTabs>` in both branches |
| `app/actions/product-content.ts` | Create | Server Action: upsert `product_content` |
| `app/admin/products/content/page.tsx` | Create | Admin list: all slugs with green/grey content status |
| `app/admin/products/content/[slug]/page.tsx` | Create | Admin shell: fetches row, renders edit form |
| `components/admin/content-edit-form.tsx` | Create | `"use client"` form for editing description/FAQs/templates |

---

### Task 1: DB Migration + TypeScript Types

**Files:**
- Create: `scripts/015_product_content.sql`
- Create: `lib/print/product-content.ts`

**Interfaces:**
- Produces: `ProductContent`, `FAQ`, `FilePrepInfo`, `TemplateLink` types — consumed by Tasks 2, 3, and 4

- [ ] **Step 1: Create migration file**

Create `scripts/015_product_content.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.product_content (
  category_slug TEXT PRIMARY KEY,
  description   TEXT,
  faqs          JSONB NOT NULL DEFAULT '[]',
  template_file_prep JSONB,
  template_urls JSONB NOT NULL DEFAULT '[]',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_content ENABLE ROW LEVEL SECURITY;

-- Storefront reads server-side (no anon client exposure needed), but allow
-- anon select so createClient() works without service role on the storefront
CREATE POLICY "public_read_product_content"
  ON public.product_content FOR SELECT USING (true);
```

- [ ] **Step 2: Apply the migration in Supabase**

Open the Supabase project → SQL Editor → paste the contents of `scripts/015_product_content.sql` → Run.

Verify: go to Table Editor and confirm `product_content` appears with the 6 columns.

- [ ] **Step 3: Create TypeScript types**

Create `lib/print/product-content.ts`:

```ts
export type FAQ = { q: string; a: string }

export type FilePrepInfo = {
  note?: string
  resolution: string
  color_mode: string
  bleed: string
  file_types: string[]
}

export type TemplateLink = { size: string; url: string }

export type ProductContent = {
  category_slug: string
  description: string | null
  faqs: FAQ[]
  template_file_prep: FilePrepInfo | null
  template_urls: TemplateLink[]
  updated_at: string
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/015_product_content.sql lib/print/product-content.ts
git commit -m "feat(tabs): add product_content table migration and TypeScript types"
```

---

### Task 2: `ProductInfoTabs` Component

**Files:**
- Create: `components/print/product-info-tabs.tsx`

**Interfaces:**
- Consumes: `ProductContent`, `FAQ`, `FilePrepInfo`, `TemplateLink` from `@/lib/print/product-content`
- Consumes: `/api/4over/categoryproductslist` (GET, `category_uuid` param) — returns `{ success, data: { size_list, stock_list, coating_list, products } }`
- Consumes: `/api/4over/product-options` (GET, `product_uuid` param) — returns `{ optionGroups: [{ product_option_group_name, options: [{ option_name }] }] }`
- Consumes: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`
- Produces: `<ProductInfoTabs categoryUuid productName content isBusinessCards? />` — used by Task 3

**Cascade API field names** (exact — do not guess):
- `size_list` items: `{ size_uuid, size_name }` — display field is `size_name`
- `stock_list` items: `{ stock_uuid, stock_name }` — display field is `stock_name`
- `coating_list` items: `{ coating_uuid, coating_name }` — display field is `coating_name`
- `products` items: `{ product_uuid, ... }` — use `product_uuid` for product-options call
- `optionGroups` items: `{ product_option_group_name: string, options: [{ option_name: string }] }`

- [ ] **Step 1: Create the component**

Create `components/print/product-info-tabs.tsx`:

```tsx
"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Download } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ProductContent, FAQ, FilePrepInfo, TemplateLink } from "@/lib/print/product-content"

// Mirrors the same regex used in product-configurator-client — display-only cleanup
const BC_SIZE_SUFFIX = /\s*\((Oval|Fold\s*Over|Round\s*Corners?)\)\s*$/i

function cleanBCSize(name: string): string {
  return name.replace(BC_SIZE_SUFFIX, "").trim()
}

// Option group names handled by the configurator (Size/Stock/Coating/Shape come from
// the cascade response, not product-options; these are the extras we skip in that path)
const CASCADE_HANDLED = new Set([
  "size", "stock", "coating", "shape", "runsize", "sheets per pad",
  "product color", "button shape options", "button backing options",
])

type SpecGroup = { name: string; options: string[] }

type SpecsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "done"
      sizes: string[]
      stocks: string[]
      coatings: string[]
      colorspecs: string[]
      turnaround: string[]
      extraGroups: SpecGroup[]
    }

interface ProductInfoTabsProps {
  categoryUuid: string
  productName: string
  content: ProductContent | null
  isBusinessCards?: boolean
}

export function ProductInfoTabs({
  categoryUuid,
  productName,
  content,
  isBusinessCards = false,
}: ProductInfoTabsProps) {
  const [specsState, setSpecsState] = useState<SpecsState>({ status: "idle" })
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set())
  const [openTemplates, setOpenTemplates] = useState<Set<number>>(new Set())

  const handleTabChange = (tab: string) => {
    if (tab === "specs" && specsState.status === "idle") {
      loadSpecs()
    }
  }

  const loadSpecs = async () => {
    setSpecsState({ status: "loading" })
    try {
      const r1 = await fetch(
        `/api/4over/categoryproductslist?category_uuid=${encodeURIComponent(categoryUuid)}`
      )
      const d1 = await r1.json()
      if (!d1.success) throw new Error("cascade failed")

      const rawSizes: string[] = (d1.data?.size_list ?? []).map((s: any) => s.size_name ?? "")
      const sizes = isBusinessCards
        ? [
            ...new Map(
              rawSizes.map(s => [cleanBCSize(s).toLowerCase(), cleanBCSize(s)])
            ).values(),
          ]
        : rawSizes

      const stocks: string[] = (d1.data?.stock_list ?? []).map((s: any) => s.stock_name ?? "")
      const coatings: string[] = (d1.data?.coating_list ?? []).map((c: any) => c.coating_name ?? "")
      const firstProductUuid: string | null = d1.data?.products?.[0]?.product_uuid ?? null

      if (!firstProductUuid) {
        setSpecsState({
          status: "done",
          sizes,
          stocks,
          coatings,
          colorspecs: [],
          turnaround: [],
          extraGroups: [],
        })
        return
      }

      const r2 = await fetch(
        `/api/4over/product-options?product_uuid=${encodeURIComponent(firstProductUuid)}`
      )
      const d2 = await r2.json()

      let colorspecs: string[] = []
      let turnaround: string[] = []
      const extraGroups: SpecGroup[] = []

      for (const g of (d2.optionGroups ?? []) as any[]) {
        const nameNorm = (g.product_option_group_name as string).toLowerCase().trim()
        const opts: string[] = (g.options ?? []).map((o: any) => o.option_name ?? "")
        if (nameNorm === "colorspec") {
          colorspecs = opts
        } else if (nameNorm === "turnaround") {
          turnaround = opts
        } else if (!CASCADE_HANDLED.has(nameNorm) && opts.length > 0) {
          extraGroups.push({ name: g.product_option_group_name as string, options: opts })
        }
      }

      setSpecsState({ status: "done", sizes, stocks, coatings, colorspecs, turnaround, extraGroups })
    } catch {
      setSpecsState({ status: "error", message: "Unable to load specs. Please try again." })
    }
  }

  const toggleFaq = (i: number) =>
    setOpenFaqs(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const toggleTemplate = (i: number) =>
    setOpenTemplates(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const faqs: FAQ[] = content?.faqs ?? []
  const templateUrls: TemplateLink[] = content?.template_urls ?? []
  const filePrepInfo: FilePrepInfo | null = content?.template_file_prep ?? null

  return (
    <Tabs defaultValue="description" onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 gap-0">
        {(["description", "specs", "templates", "faqs"] as const).map(tab => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#e07b39] data-[state=active]:text-[#e07b39] px-6 py-3 text-sm font-medium bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {tab === "faqs" ? "FAQs" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Description */}
      <TabsContent value="description" className="mt-6">
        {content?.description ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {content.description}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Product description coming soon.</p>
        )}
      </TabsContent>

      {/* Specs */}
      <TabsContent value="specs" className="mt-6">
        {specsState.status === "idle" && (
          <p className="text-sm text-slate-400 italic">Click the Specs tab to load.</p>
        )}
        {specsState.status === "loading" && (
          <p className="text-sm text-slate-500">Loading specs…</p>
        )}
        {specsState.status === "error" && (
          <p className="text-sm text-red-500">{specsState.message}</p>
        )}
        {specsState.status === "done" && (
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="space-y-5">
              {specsState.sizes.length > 0 && (
                <SpecsGroup label="Size" items={specsState.sizes} />
              )}
              {specsState.stocks.length > 0 && (
                <SpecsGroup label="Stock" items={specsState.stocks} />
              )}
            </div>
            <div className="space-y-5">
              {specsState.colorspecs.length > 0 && (
                <SpecsGroup label="Colorspec" items={specsState.colorspecs} />
              )}
              {specsState.coatings.length > 0 && (
                <SpecsGroup label="Coating" items={specsState.coatings} />
              )}
              {specsState.extraGroups.map(g => (
                <SpecsGroup key={g.name} label={g.name} items={g.options} />
              ))}
              {specsState.turnaround.length > 0 && (
                <SpecsGroup label="Turnaround Time" items={specsState.turnaround} />
              )}
            </div>
          </div>
        )}
      </TabsContent>

      {/* Templates */}
      <TabsContent value="templates" className="mt-6 space-y-6">
        {filePrepInfo && (
          <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 text-slate-700">
            {filePrepInfo.note && (
              <p className="italic text-slate-500 mb-3">{filePrepInfo.note}</p>
            )}
            <p><span className="font-medium">Resolution:</span> {filePrepInfo.resolution}</p>
            <p><span className="font-medium">Color Mode:</span> {filePrepInfo.color_mode}</p>
            <p><span className="font-medium">Bleed:</span> {filePrepInfo.bleed}</p>
            <p>
              <span className="font-medium">File Types:</span>{" "}
              {filePrepInfo.file_types.join(", ")}
            </p>
          </div>
        )}
        {templateUrls.length > 0 ? (
          <div className="divide-y border rounded-lg overflow-hidden">
            {templateUrls.map((t, i) => (
              <div key={i}>
                <button
                  onClick={() => toggleTemplate(i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-800">{t.size}</span>
                  {openTemplates.has(i) ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {openTemplates.has(i) && (
                  <div className="px-4 py-3 bg-slate-50 border-t">
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#e07b39] hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Templates coming soon.</p>
        )}
      </TabsContent>

      {/* FAQs */}
      <TabsContent value="faqs" className="mt-6">
        {faqs.length > 0 ? (
          <div className="divide-y border rounded-lg overflow-hidden">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-800">{faq.q}</span>
                  {openFaqs.has(i) ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {openFaqs.has(i) && (
                  <div className="px-4 py-4 bg-slate-50 border-t text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">FAQs coming soon.</p>
        )}
      </TabsContent>
    </Tabs>
  )
}

function SpecsGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </h4>
      <ul className="text-sm text-slate-700 space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `components/print/product-info-tabs.tsx`. Fix any type errors before committing.

- [ ] **Step 3: Commit**

```bash
git add components/print/product-info-tabs.tsx
git commit -m "feat(tabs): add ProductInfoTabs client component with lazy Specs fetch"
```

---

### Task 3: Page Integration

**Files:**
- Modify: `app/(storefront)/print/[category]/[typeSlug]/page.tsx`

**Context:**
- `supabase` is already created at line 890 (`const supabase = await createClient()`)
- UUID branch: starts at `if (uuid) {` ~line 895, `return` is at ~line 1243
- UUID branch already has a stub Description/Templates section at lines ~1267–1277 inside the left column `<div>` — **DELETE it**
- TYPE_RULES branch: `return` is at ~line 1613, the grid is inside `{matchedProducts.length === 0 ? ... : (<div className="grid...">...</div>)}`
- Both branches need `<ProductInfoTabs>` below the calculator grid
- `isBusinessCards` is already computed before the uuid branch (~line 964); `isBusinessCardsType` is computed before the TYPE_RULES return

**Interfaces:**
- Consumes: `ProductInfoTabs` from `@/components/print/product-info-tabs`
- Consumes: `ProductContent` type from `@/lib/print/product-content`

- [ ] **Step 1: Add the import**

At the top of `page.tsx`, after the existing imports, add:

```ts
import { ProductInfoTabs } from "@/components/print/product-info-tabs"
import type { ProductContent } from "@/lib/print/product-content"
```

- [ ] **Step 2: Add the product_content fetch**

After line 890 (`const supabase = await createClient()`), add — before the `const leaf = ...` line:

```ts
const { data: productContent } = await supabase
  .from("product_content")
  .select("*")
  .eq("category_slug", category)
  .maybeSingle<ProductContent>()
```

This fetches once and is reused by both branches.

- [ ] **Step 3: Update the UUID branch**

In the UUID branch JSX (around line 1267–1277), **delete** the existing Description/Templates stub:

```tsx
{/* DELETE these lines — being replaced by ProductInfoTabs below */}
<div className="mt-6 max-w-[360px]">
  <div className="border-b border-slate-200 flex gap-6">
    <span className="border-b-2 border-[#e07b39] text-[#e07b39] py-2 text-sm font-medium">Description</span>
    <span className="text-slate-500 py-2 text-sm">Templates</span>
  </div>
  <p className="text-sm text-slate-600 leading-relaxed mt-3">
    {productName} — high quality professional printing with premium materials, durable and
    weather-resistant for both indoor and outdoor use.
  </p>
</div>
```

Then, after the closing `</div>` of the `grid` container (which ends just before `</div>` of `max-w-5xl`), add the tabs section. The grid closes around line 1291 and the outer `max-w-5xl` div closes at ~line 1293. Insert between them:

```tsx
          </div>{/* end grid */}
          <div className="mt-10 pb-12">
            <ProductInfoTabs
              categoryUuid={product.category_uuid || leaf?.uuid || ""}
              productName={productName}
              content={productContent ?? null}
              isBusinessCards={isBusinessCards}
            />
          </div>
        </div>{/* end max-w-5xl */}
```

The full UUID branch `return` structure after this change:

```tsx
return (
  <div className="min-h-screen bg-white">
    {/* breadcrumb */}
    <div className="border-b border-slate-200 py-2 px-4">...</div>
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{productName}</h1>
      <div className="grid lg:grid-cols-[1fr_minmax(0,640px)] gap-8 items-start">
        <div>
          <div className="aspect-square w-full max-w-[360px] ...">
            <img ... />
          </div>
          {/* NO MORE stub tabs here */}
        </div>
        <ProductConfiguratorClient ... />
      </div>
      <div className="mt-10 pb-12">
        <ProductInfoTabs
          categoryUuid={product.category_uuid || leaf?.uuid || ""}
          productName={productName}
          content={productContent ?? null}
          isBusinessCards={isBusinessCards}
        />
      </div>
    </div>
  </div>
)
```

- [ ] **Step 4: Update the TYPE_RULES branch**

The TYPE_RULES branch ternary currently returns a single `<div className="grid...">`. Wrap the non-zero case in a fragment and add tabs after the grid:

Find (~line 1640):
```tsx
        ) : (
          <div className="grid lg:grid-cols-[1fr_minmax(0,640px)] gap-8 items-start">
            {/* Left: product image */}
            ...
            {/* Right: configurator */}
            ...
          </div>
        )}
```

Replace with:
```tsx
        ) : (
          <>
            <div className="grid lg:grid-cols-[1fr_minmax(0,640px)] gap-8 items-start">
              {/* Left: product image */}
              ...
              {/* Right: configurator */}
              ...
            </div>
            <div className="mt-10 pb-12">
              <ProductInfoTabs
                categoryUuid={effectiveCategoryUuid}
                productName={typeLabel}
                content={productContent ?? null}
                isBusinessCards={isBusinessCardsType}
              />
            </div>
          </>
        )}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors. The `maybeSingle<ProductContent>()` call should type `productContent` as `ProductContent | null`.

- [ ] **Step 6: Smoke-test locally**

Start the dev server (`npm run dev`), navigate to any product page (e.g. `/print/business-cards/silk-business-cards`). Verify:
- Description tab shows "Product description coming soon."
- Specs tab: clicking it triggers the two API calls (check Network tab in DevTools) and eventually shows sizes/stocks/etc.
- Templates tab shows "Templates coming soon."
- FAQs tab shows "FAQs coming soon."
- No JS console errors.
- The old "Description | Templates" stub in the left column is gone.

Also test a TYPE_RULES product (e.g. `/print/flyers-and-brochures/half-fold-brochure`) and confirm tabs appear below the calculator.

- [ ] **Step 7: Commit**

```bash
git add "app/(storefront)/print/[category]/[typeSlug]/page.tsx"
git commit -m "feat(tabs): integrate ProductInfoTabs into both product page branches"
```

---

### Task 4: Admin UI + Server Action

**Files:**
- Create: `app/actions/product-content.ts`
- Create: `app/admin/products/content/page.tsx`
- Create: `app/admin/products/content/[slug]/page.tsx`
- Create: `components/admin/content-edit-form.tsx`

**Interfaces:**
- Consumes: `SLUG_TO_CATEGORY` from `@/lib/print/categories` (for slug list)
- Consumes: `ProductContent`, `FAQ`, `FilePrepInfo`, `TemplateLink` from `@/lib/print/product-content`
- Consumes: `createAdminClient` from `@/lib/supabase/server`
- Produces: `/admin/products/content` list page + `/admin/products/content/[slug]` edit page

- [ ] **Step 1: Create Server Action**

Create `app/actions/product-content.ts`:

```ts
"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient, requireAdmin } from "@/lib/supabase/server"
import type { FAQ, FilePrepInfo, TemplateLink } from "@/lib/print/product-content"

export type SaveContentPayload = {
  description: string
  faqs: FAQ[]
  template_file_prep: FilePrepInfo | null
  template_urls: TemplateLink[]
}

export async function saveProductContent(
  slug: string,
  payload: SaveContentPayload
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  const admin = createAdminClient()
  const { error } = await admin
    .from("product_content")
    .upsert(
      {
        category_slug: slug,
        description: payload.description || null,
        faqs: payload.faqs,
        template_file_prep: payload.template_file_prep,
        template_urls: payload.template_urls,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "category_slug" }
    )

  if (error) return { success: false, error: error.message }

  // Invalidate storefront pages that show this content
  revalidatePath(`/print`, "layout")
  revalidatePath(`/admin/products/content/${slug}`)

  return { success: true }
}
```

- [ ] **Step 2: Create admin list page**

Create `app/admin/products/content/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server"
import { SLUG_TO_CATEGORY } from "@/lib/print/categories"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Edit } from "lucide-react"

export default async function ProductContentListPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from("product_content")
    .select("category_slug, updated_at")

  const contentMap = new Map((rows ?? []).map(r => [r.category_slug, r.updated_at as string]))
  const allSlugs = Object.keys(SLUG_TO_CATEGORY).sort()

  const withContent = allSlugs.filter(s => contentMap.has(s))
  const withoutContent = allSlugs.filter(s => !contentMap.has(s))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Content</h1>
          <p className="text-slate-600">
            Manage description, specs templates, and FAQs for each product category.
          </p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{allSlugs.length}</p>
            <p className="text-sm text-muted-foreground">Total Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{withContent.length}</p>
            <p className="text-sm text-muted-foreground">Have Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-slate-400">{withoutContent.length}</p>
            <p className="text-sm text-muted-foreground">Need Content</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Product Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {allSlugs.map(slug => {
              const cat = SLUG_TO_CATEGORY[slug]
              const updatedAt = contentMap.get(slug)
              return (
                <div key={slug} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        updatedAt ? "bg-green-500" : "bg-slate-300"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{cat?.name ?? slug}</p>
                      <p className="text-xs text-slate-500">
                        {cat?.parentLabel} / {slug}
                        {updatedAt && (
                          <> · Updated {new Date(updatedAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link href={`/admin/products/content/${slug}`}>
                      <Edit className="h-3.5 w-3.5" />
                      {updatedAt ? "Edit" : "Add"}
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create the client-side edit form component**

Create `components/admin/content-edit-form.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import type { ProductContent, FAQ, FilePrepInfo, TemplateLink } from "@/lib/print/product-content"
import { saveProductContent } from "@/app/actions/product-content"

interface ContentEditFormProps {
  slug: string
  initialContent: ProductContent | null
}

export function ContentEditForm({ slug, initialContent }: ContentEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [description, setDescription] = useState(initialContent?.description ?? "")

  const [faqs, setFaqs] = useState<FAQ[]>(initialContent?.faqs ?? [])

  const [filePrepEnabled, setFilePrepEnabled] = useState(!!initialContent?.template_file_prep)
  const [filePrep, setFilePrep] = useState<FilePrepInfo>(
    initialContent?.template_file_prep ?? {
      note: "",
      resolution: "300dpi",
      color_mode: "CMYK",
      bleed: '0.125" (0.0625" on each side)',
      file_types: ["PDF (recommended)", "JPG", "EPS", "TIFF"],
    }
  )

  const [templateUrls, setTemplateUrls] = useState<TemplateLink[]>(
    initialContent?.template_urls ?? []
  )

  const addFaq = () => setFaqs(prev => [...prev, { q: "", a: "" }])
  const removeFaq = (i: number) => setFaqs(prev => prev.filter((_, idx) => idx !== i))
  const updateFaq = (i: number, field: "q" | "a", value: string) =>
    setFaqs(prev => prev.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)))

  const addTemplate = () => setTemplateUrls(prev => [...prev, { size: "", url: "" }])
  const removeTemplate = (i: number) =>
    setTemplateUrls(prev => prev.filter((_, idx) => idx !== i))
  const updateTemplate = (i: number, field: "size" | "url", value: string) =>
    setTemplateUrls(prev => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveProductContent(slug, {
        description,
        faqs: faqs.filter(f => f.q.trim() || f.a.trim()),
        template_file_prep: filePrepEnabled ? filePrep : null,
        template_urls: templateUrls.filter(t => t.size.trim() || t.url.trim()),
      })
      if (result.success) {
        setSaved(true)
        router.refresh()
      } else {
        setError(result.error ?? "Save failed")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter product description..."
            rows={6}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            FAQs
            <Button type="button" size="sm" variant="outline" onClick={addFaq} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add FAQ
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.length === 0 && (
            <p className="text-sm text-slate-400">No FAQs yet. Click "Add FAQ" to start.</p>
          )}
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 relative">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeFaq(i)}
                className="absolute top-2 right-2 h-7 w-7 p-0 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <div className="space-y-1">
                <Label className="text-xs">Question</Label>
                <Input
                  value={faq.q}
                  onChange={e => updateFaq(i, "q", e.target.value)}
                  placeholder="e.g. Are silk business cards waterproof?"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Answer</Label>
                <Textarea
                  value={faq.a}
                  onChange={e => updateFaq(i, "a", e.target.value)}
                  placeholder="Answer..."
                  rows={3}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* File Prep (Templates tab) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            File Preparation Info
            <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
              <input
                type="checkbox"
                checked={filePrepEnabled}
                onChange={e => setFilePrepEnabled(e.target.checked)}
                className="rounded"
              />
              Enable
            </label>
          </CardTitle>
        </CardHeader>
        {filePrepEnabled && (
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Note (optional)</Label>
              <Input
                value={filePrep.note ?? ""}
                onChange={e => setFilePrep(p => ({ ...p, note: e.target.value }))}
                placeholder="e.g. For specific instructions see our FAQs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Resolution</Label>
                <Input
                  value={filePrep.resolution}
                  onChange={e => setFilePrep(p => ({ ...p, resolution: e.target.value }))}
                  placeholder="300dpi"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color Mode</Label>
                <Input
                  value={filePrep.color_mode}
                  onChange={e => setFilePrep(p => ({ ...p, color_mode: e.target.value }))}
                  placeholder="CMYK"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bleed</Label>
              <Input
                value={filePrep.bleed}
                onChange={e => setFilePrep(p => ({ ...p, bleed: e.target.value }))}
                placeholder='0.125" (0.0625" on each side)'
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File Types (comma-separated)</Label>
              <Input
                value={filePrep.file_types.join(", ")}
                onChange={e =>
                  setFilePrep(p => ({
                    ...p,
                    file_types: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="PDF (recommended), JPG, EPS, TIFF"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Template URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Template Downloads
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addTemplate}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Template
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templateUrls.length === 0 && (
            <p className="text-sm text-slate-400">
              No templates yet. Paste links from 4over's Templates tab.
            </p>
          )}
          {templateUrls.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={t.size}
                onChange={e => updateTemplate(i, "size", e.target.value)}
                placeholder='Size (e.g. 2" × 3.5")'
                className="w-36 flex-shrink-0"
              />
              <Input
                value={t.url}
                onChange={e => updateTemplate(i, "url", e.target.value)}
                placeholder="https://4over.com/media/..."
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeTemplate(i)}
                className="h-9 w-9 p-0 text-slate-400 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Content"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Create the admin edit page shell**

Create `app/admin/products/content/[slug]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server"
import { SLUG_TO_CATEGORY } from "@/lib/print/categories"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ContentEditForm } from "@/components/admin/content-edit-form"
import type { ProductContent } from "@/lib/print/product-content"

export default async function ProductContentEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!SLUG_TO_CATEGORY[slug]) notFound()

  const supabase = await createClient()
  const { data: content } = await supabase
    .from("product_content")
    .select("*")
    .eq("category_slug", slug)
    .maybeSingle<ProductContent>()

  const cat = SLUG_TO_CATEGORY[slug]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/admin/products/content"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Product Content
        </Link>
        <h1 className="text-3xl font-bold">{cat.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {cat.parentLabel} · <code className="bg-slate-100 px-1 rounded">{slug}</code>
        </p>
      </div>

      <ContentEditForm slug={slug} initialContent={content ?? null} />
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors. Fix any before committing.

- [ ] **Step 6: Test admin UI manually**

Navigate to `http://localhost:3000/admin/products/content`. Verify:
- All category slugs appear in the list with grey dots (no content yet)
- Click "Add" on any slug, e.g. `silk-business-cards`
- You land at `/admin/products/content/silk-business-cards`
- Fill in description, add 1 FAQ, click Save
- No error. Page refreshes. Green "Saved successfully." appears.
- Go back to list — the saved slug now shows a green dot with the updated date.
- Navigate to `/print/business-cards/silk-business-cards` on storefront — Description tab now shows your text, FAQs tab shows the FAQ you entered.

- [ ] **Step 7: Commit**

```bash
git add app/actions/product-content.ts app/admin/products/content/page.tsx "app/admin/products/content/[slug]/page.tsx" components/admin/content-edit-form.tsx
git commit -m "feat(tabs): add admin UI for editing product content (description/FAQs/templates)"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| `product_content` Supabase table (6 columns, RLS) | Task 1 |
| TypeScript types: `ProductContent`, `FAQ`, `FilePrepInfo`, `TemplateLink` | Task 1 |
| `ProductInfoTabs` component, 4 tabs | Task 2 |
| Tabs use existing shadcn `Tabs` components | Task 2 |
| Default tab: Description | Task 2 (defaultValue="description") |
| Empty states for all tabs | Task 2 |
| Specs: auto-generated from API data | Task 2 (lazy client fetch) |
| Templates: file prep block + size accordion with links | Task 2 |
| FAQs: accordion, Q+A pairs | Task 2 |
| Both page.tsx branches get tabs | Task 3 |
| Remove existing stub Description/Templates (uuid branch) | Task 3 |
| Supabase content fetch in page.tsx | Task 3 |
| Admin list: all slugs, green/grey dot | Task 4 |
| Admin edit: description textarea | Task 4 |
| Admin edit: FAQ add/remove rows | Task 4 |
| Admin edit: template_file_prep fields | Task 4 |
| Admin edit: template_urls add/remove rows | Task 4 |
| Server Action: upsert + revalidate | Task 4 |

### Correction from spec

The spec states "Specs data derived from cascade state already in page.tsx." This is incorrect — cascade state (sizeList, stockList, etc.) is loaded client-side inside `ProductConfiguratorClient`, not available server-side. The plan corrects this by making `ProductInfoTabs` a `"use client"` component that lazily fetches `/api/4over/categoryproductslist` + `/api/4over/product-options` on first Specs tab click. This is better for page load performance anyway.

The `SpecsData` type from the spec is superseded by internal component state (`SpecsState` union type in Task 2) and is not exposed as a prop — `categoryUuid` is passed instead.

### Placeholder scan

No TBDs, no "implement later", no placeholder code. All steps have complete code.

### Type consistency

- `ProductContent`, `FAQ`, `FilePrepInfo`, `TemplateLink` defined in Task 1, used in Tasks 2, 3, 4 with matching import paths (`@/lib/print/product-content`)
- `saveProductContent(slug: string, payload: SaveContentPayload)` defined in Task 4 (`app/actions/product-content.ts`), called in Task 4 form component — consistent
- `categoryUuid: string` prop on `ProductInfoTabs` defined and used in Task 2, passed correctly in Task 3 using `product.category_uuid || leaf?.uuid || ""` (uuid branch) and `effectiveCategoryUuid` (TYPE_RULES branch)
- `maybeSingle<ProductContent>()` consistent in both page.tsx (Task 3) and admin edit page (Task 4)
