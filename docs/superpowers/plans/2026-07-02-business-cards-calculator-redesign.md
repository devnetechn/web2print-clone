# Business Cards Calculator Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match our Business Cards price calculator to 4over's field structure: Project Name/P.O., clean Size options, Shape before Stock, Colorspec label, Radius of Corners conditional, SPOT UV SIDES/Lamination/Scoring ordered correctly, and Job Samples checkbox.

**Architecture:** Add `isBusinessCards?: boolean` prop to `ProductConfiguratorClient`. When true, render a BC-specific JSX block with new field order, new state, and utility helpers. The pricing cascade (Size→Stock→Coating→product_uuid→baseprices→quote) is untouched — only the display layer changes.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Playwright (for browser verification)

## Global Constraints

- Do NOT modify the cascade logic (`fetchList`, stock/coating/product effects, `combinations`, `extraUuids` quote param) — only UI/rendering changes
- All new BC-only code must be gated on `isBusinessCards === true` so non-BC products are unaffected
- "Sides" label renamed to "Colorspec" for BC only
- `renderListRow` single-item static box must be preserved for non-BC products
- No new npm dependencies

---

## File Map

| File | Change |
|------|--------|
| `components/print/product-configurator-client.tsx` | All main changes (prop, state, utilities, JSX) |
| `app/(storefront)/print/[category]/[typeSlug]/page.tsx` | Pass `isBusinessCards` prop at both `ProductConfiguratorClient` call sites (lines 1279 and 1649) |

---

## Task 1: Scaffold — prop, cleanBCSizeList, renderListRow forceDropdown, page.tsx prop pass

**Files:**
- Modify: `components/print/product-configurator-client.tsx`
- Modify: `app/(storefront)/print/[category]/[typeSlug]/page.tsx`

**Interfaces:**
- Produces: `isBusinessCards` prop consumed by all later tasks; `cleanBCSizeList(items)` used in Task 2; `renderListRow(..., forceDropdown)` used in Tasks 2–5

---

- [ ] **Step 1: Add `isBusinessCards` to props interface**

In `components/print/product-configurator-client.tsx`, find `interface ProductConfiguratorClientProps` (line ~48) and add the new prop after `initialCoatingUuid`:

```ts
interface ProductConfiguratorClientProps {
  categoryUuid: string
  categorySlug: string
  productName: string
  allowedProductUuids?: string[]
  hiddenGroups?: string[]
  sizeProducts?: { uuid: string; size: string }[]
  initialSizeUuid?: string
  initialStockUuid?: string
  initialCoatingUuid?: string
  isBusinessCards?: boolean   // ← add this line
}
```

- [ ] **Step 2: Destructure the new prop in the function signature**

Find `export function ProductConfiguratorClient({` (line ~149) and add `isBusinessCards = false`:

```ts
export function ProductConfiguratorClient({
  categoryUuid,
  categorySlug,
  productName,
  allowedProductUuids,
  hiddenGroups,
  sizeProducts,
  initialSizeUuid,
  initialStockUuid,
  initialCoatingUuid,
  isBusinessCards = false,   // ← add this line
}: ProductConfiguratorClientProps) {
```

- [ ] **Step 3: Add `cleanBCSizeList` utility after the `dedupeList` function**

Find the `function dedupeList` block (line ~88). Add immediately after it:

```ts
// Shape suffixes baked into size names by the 4over API (e.g. "2\" X 3.5\" (Oval)").
// For BC, Oval/FoldOver/RoundCorner are Shape options, not size variants — strip them
// and deduplicate so the Size dropdown shows clean dimensions matching 4over's UI.
const BC_SHAPE_SUFFIX = /\s*\((Oval|Fold\s*Over|Round\s*Corners?)\)\s*$/i

function cleanBCSizeList(items: ListItem[]): ListItem[] {
  const seen = new Set<string>()
  return items
    .map((item) => ({ ...item, name: item.name.replace(BC_SHAPE_SUFFIX, "").trim() }))
    .filter((item) => {
      const key = item.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
```

- [ ] **Step 4: Add `forceDropdown` parameter to `renderListRow`**

Find `const renderListRow = (` (line ~813). Replace the function signature and the single-item guard:

```ts
const renderListRow = (
  label: string,
  items: ListItem[],
  value: string,
  onChange: (v: string) => void,
  forceDropdown = false,   // ← add this parameter
) => {
  if (items.length === 0) return null
  if (items.length === 1 && !forceDropdown) {   // ← add && !forceDropdown
    return (
      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 min-w-[220px] text-center">
          {items[0].name}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-slate-200 min-w-[220px]">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => (
            <SelectItem key={it.uuid} value={it.uuid}>
              {it.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

- [ ] **Step 5: Pass `isBusinessCards` in page.tsx — first call site (uuid branch, line ~1279)**

In `app/(storefront)/print/[category]/[typeSlug]/page.tsx`, find the first `<ProductConfiguratorClient` (line ~1279):

```tsx
<ProductConfiguratorClient
  categoryUuid={product.category_uuid || leaf?.uuid || ""}
  categorySlug={category}
  productName={productName}
  allowedProductUuids={allowedProductUuidsOverride || [product.product_uuid]}
  hiddenGroups={leaf?.parentSlug === "signs-banners" ? SIGNS_HIDDEN_GROUPS : undefined}
  sizeProducts={sizeProducts}
  initialSizeUuid={initialSizeUuid}
  initialStockUuid={initialStockUuid}
  initialCoatingUuid={initialCoatingUuid}
  isBusinessCards={isBusinessCards}   // ← add this line
/>
```

- [ ] **Step 6: Pass `isBusinessCards` in page.tsx — second call site (TYPE_RULES branch, line ~1649)**

Just above the second `<ProductConfiguratorClient` (around line 1647), `isSignsBanners` is already computed. Add `isBusinessCardsType` beside it:

```ts
const isSignsBanners = leaf?.parentSlug === "signs-banners"
const isBusinessCardsType = leaf?.parentSlug === "business-cards" &&
  category !== "oval-cards" && category !== "fold-over-cards"   // ← add these 2 lines
```

Then update the second `<ProductConfiguratorClient`:

```tsx
<ProductConfiguratorClient
  categoryUuid={effectiveCategoryUuid}
  categorySlug={category}
  productName={typeLabel}
  allowedProductUuids={matchedProducts.map((p) => p.product_uuid)}
  hiddenGroups={isSignsBanners ? SIGNS_HIDDEN_GROUPS : undefined}
  sizeProducts={signsSizeProducts}
  initialSizeUuid={signsSizeProducts ? undefined : initialSizeUuid}
  initialStockUuid={signsSizeProducts ? undefined : initialStockUuid}
  initialCoatingUuid={signsSizeProducts ? undefined : initialCoatingUuid}
  isBusinessCards={isBusinessCardsType}   // ← add this line
/>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new prop or functions.

- [ ] **Step 8: Commit**

```bash
git add components/print/product-configurator-client.tsx app/"(storefront)"/print/\[category\]/\[typeSlug\]/page.tsx
git commit -m "feat(bc-calc): scaffold isBusinessCards prop, cleanBCSizeList, forceDropdown"
```

---

## Task 2: Size list cleanup + always-dropdown for BC

**Files:**
- Modify: `components/print/product-configurator-client.tsx`

**Interfaces:**
- Consumes: `cleanBCSizeList` (Task 1), `forceDropdown` param on `renderListRow` (Task 1), `isBusinessCards` prop (Task 1)
- Produces: BC Size dropdown shows clean names; all BC dropdowns show `<Select>` even with 1 option

---

- [ ] **Step 1: Apply `cleanBCSizeList` in the Size render**

In the JSX section, find:
```tsx
{/* SIZE */}
{renderListRow("Size", sizeList, sizeUuid, setSizeUuid)}
```

Replace with:
```tsx
{/* SIZE */}
{renderListRow(
  "Size",
  isBusinessCards ? cleanBCSizeList(sizeList) : sizeList,
  sizeUuid,
  setSizeUuid,
  isBusinessCards,
)}
```

- [ ] **Step 2: Add `forceDropdown={isBusinessCards}` to Stock and Coating renders**

Find:
```tsx
{/* STOCK */}
{renderListRow("Stock", stockList, stockUuid, setStockUuid)}

{/* COATING */}
{(!hiddenSet || !hiddenSet.has("coating")) &&
  renderListRow("Coating", coatingList, coatingUuid, setCoatingUuid)}
```

Replace with:
```tsx
{/* STOCK */}
{renderListRow("Stock", stockList, stockUuid, setStockUuid, isBusinessCards)}

{/* COATING */}
{(!hiddenSet || !hiddenSet.has("coating")) &&
  renderListRow("Coating", coatingList, coatingUuid, setCoatingUuid, isBusinessCards)}
```

- [ ] **Step 3: Verify in browser — Silk BC Size dropdown**

Navigate to `http://localhost:3001/print/silk-cards` (redirects to the 16PT Silk BC page).

Open the Size dropdown. Verify:
- Shows `2" X 3.5"` (NOT `2" X 3.5" (Oval)`)
- Shows `2" X 7"` (NOT `2" X 7" (Fold Over)`)
- Shows `3.5" X 4"` (NOT `3.5" X 4" (Fold Over)`)
- No duplicate `2" X 3.5"` entries

Also verify: Standard Business Cards (`http://localhost:3001/print/business-cards-standard/standard-business-cards`) Size dropdown is unaffected (still shows original names).

- [ ] **Step 4: Verify Stock and Lamination are now dropdowns**

On the Silk BC page, verify:
- "Stock" shows a `<select>` dropdown with "16PT C2S" (not a static grey box)
- "Lamination" shows a `<select>` dropdown with "Silk" (not a static grey box)

- [ ] **Step 5: Commit**

```bash
git add components/print/product-configurator-client.tsx
git commit -m "feat(bc-calc): clean BC size labels, always-dropdown for BC fields"
```

---

## Task 3: Project Name / P.O. field + Colorspec label rename + cart item

**Files:**
- Modify: `components/print/product-configurator-client.tsx`

**Interfaces:**
- Consumes: `isBusinessCards` prop (Task 1)
- Produces: `projectName` state included in cart item; "Colorspec" label for BC

---

- [ ] **Step 1: Add `projectName` state**

Find the state declarations block (around line ~168, after `const [sizeList, setSizeList]`). Add:

```ts
const [projectName, setProjectName] = useState("")
```

- [ ] **Step 2: Add Project Name input above Size in the JSX**

Find the Size render in the JSX:
```tsx
{/* SIZE */}
{renderListRow(
  "Size",
  isBusinessCards ? cleanBCSizeList(sizeList) : sizeList,
```

Add the Project Name block immediately BEFORE it, gated on `isBusinessCards`:

```tsx
{/* PROJECT NAME / P.O. — BC only */}
{isBusinessCards && (
  <div className="flex items-center justify-between py-3 border-b border-slate-100">
    <label className="text-sm font-medium text-slate-700">
      Project Name / P.O.
    </label>
    <input
      type="text"
      value={projectName}
      onChange={(e) => setProjectName(e.target.value)}
      placeholder="Name Your Project"
      className="border border-slate-200 rounded px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-1 focus:ring-[#e07b39]"
    />
  </div>
)}

{/* SIZE */}
{renderListRow(
  "Size",
  isBusinessCards ? cleanBCSizeList(sizeList) : sizeList,
```

- [ ] **Step 3: Rename "Sides" label to "Colorspec" for BC**

Find the Colorspec/Sides render:
```tsx
{/* SIDES (colorspec) */}
{renderListRow(
  "Sides",
  colorspecOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
  colorspecUuid,
  setColorspecUuid,
)}
```

Replace with:
```tsx
{/* COLORSPEC (labeled "Sides" for non-BC, "Colorspec" for BC) */}
{renderListRow(
  isBusinessCards ? "Colorspec" : "Sides",
  colorspecOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
  colorspecUuid,
  setColorspecUuid,
  isBusinessCards,
)}
```

- [ ] **Step 4: Include `projectName` in `buildCartItem`**

Find `const buildCartItem = useCallback(() => {` (line ~703). After the opening `if (!productUuid || price == null) return null` guard, find the return object and add `projectName`:

```ts
return {
  id: `${productUuid}-${Date.now()}`,
  productType: categorySlug,
  productName,
  size: sizeName,
  colorspec: colorspecName,
  quantity: runsizeName ? parseInt(runsizeName) : undefined,
  turnaround: turnaroundName,
  price,
  productUuid,
  colorspecUuid,
  runsizeUuid,
  turnaroundUuid,
  optionUuids: Object.values(selectedExtras).filter(Boolean),
  projectName: projectName || undefined,   // ← add this line
  designFile: uploadedFile
    ? { fileName: uploadedFile.fileName, url: uploadedFile.url, contentType: uploadedFile.contentType }
    : undefined,
}
```

Also add `projectName` to the `buildCartItem` `useCallback` dependency array:

```ts
}, [
  productUuid,
  price,
  sizeUuid,
  colorspecUuid,
  runsizeUuid,
  turnaroundUuid,
  sizeList,
  colorspecOptions,
  runsizeOptions,
  turnaroundOptions,
  productName,
  categorySlug,
  selectedExtras,
  uploadedFile,
  projectName,   // ← add this line
])
```

- [ ] **Step 5: Verify in browser**

Navigate to `http://localhost:3001/print/silk-cards`.

Verify:
- "Project Name / P.O." text input appears at the top of the calculator (above Size)
- The Colorspec/Sides field label reads **"Colorspec"** (not "Sides")
- Typing in Project Name field works (no errors)

Navigate to `http://localhost:3001/print/business-cards-standard/standard-business-cards`.

Verify:
- "Project Name / P.O." input appears
- Label reads "Colorspec"

Navigate to a non-BC page (e.g., `/print/flyers-and-brochures`). Verify:
- No "Project Name" field
- Colorspec/Sides label still reads "Sides"

- [ ] **Step 6: Commit**

```bash
git add components/print/product-configurator-client.tsx
git commit -m "feat(bc-calc): add Project Name/P.O. field, rename Sides to Colorspec for BC"
```

---

## Task 4: BC field order — Shape before Stock, extraGroups ordering, Radius of Corners

**Files:**
- Modify: `components/print/product-configurator-client.tsx`

**Interfaces:**
- Consumes: `isBusinessCards` prop, `shapeList`, `shapeUuid`, `extraGroups`, `selectedExtras`, `visibleExtraGroups`
- Produces: BC fields in correct 4over order; Radius of Corners shown conditionally; Majestic Type + Product Orientation hidden for BC

---

- [ ] **Step 1: Add BC-specific group constants (after the `HANDLED_GROUP_NAMES` set)**

Find `const HANDLED_GROUP_NAMES = new Set([` (line ~133). After the closing `])` of that set, add:

```ts
// BC-specific extra group ordering (rendered in this order before remaining groups)
const BC_GROUP_ORDER = ["spot uv sides", "lamination", "scoring options"]
// Extra groups hidden from BC UI (not shown on 4over's calculator)
const BC_HIDDEN_EXTRA_NAMES = new Set(["majestic type", "product orientation"])
// BC extra groups that are rendered separately (not via the generic extras loop)
const BC_SEPARATE_EXTRA_NAMES = /^(radius of corners|job.?sample)/i
```

- [ ] **Step 2: Add derived memos for BC-specific group lists**

Find the `visibleExtraGroups` useMemo (line ~793). Add these two new memos AFTER the `visibleExtraGroups` memo:

```ts
// BC: group for "Radius of Corners" — shown conditionally based on Shape
const radiusGroup = useMemo(
  () => isBusinessCards ? extraGroups.find((g) => /radius.*corner/i.test(g.group_name)) : undefined,
  [extraGroups, isBusinessCards],
)

// BC: the current shape label to determine if Radius of Corners should show
const currentShapeLabel = useMemo(
  () => shapeList.find((s) => s.uuid === shapeUuid)?.shape || "",
  [shapeList, shapeUuid],
)

// BC: extra groups filtered for BC display (excludes hidden + separately-rendered groups)
const bcVisibleExtras = useMemo(() => {
  if (!isBusinessCards) return []
  const seen = new Set<string>()
  return extraGroups.filter((g) => {
    const name = g.group_name.toLowerCase().trim()
    if (BC_HIDDEN_EXTRA_NAMES.has(name)) return false
    if (BC_SEPARATE_EXTRA_NAMES.test(g.group_name)) return false
    const shapeLikeGroups = ["shape", "sheets per pad", "product color", "button shape options", "button backing options"]
    if (shapeLikeGroups.includes(name) && shapeList.length > 1) return false
    if (g.options.length === 0) return false
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
}, [isBusinessCards, extraGroups, shapeList])

// BC: ordered extras (SPOT UV SIDES → Lamination → Scoring → remaining)
const bcOrderedExtras = useMemo(() => {
  const ordered = BC_GROUP_ORDER
    .map((name) => bcVisibleExtras.find((g) => g.group_name.toLowerCase().trim() === name))
    .filter((g): g is ExtraGroup => g !== undefined)
  const rest = bcVisibleExtras.filter(
    (g) => !BC_GROUP_ORDER.includes(g.group_name.toLowerCase().trim()),
  )
  return [...ordered, ...rest]
}, [bcVisibleExtras])
```

- [ ] **Step 3: Replace the JSX field ordering block**

In the JSX, find the section from `{/* SIZE */}` through `{/* TURNAROUND TIME */}`. Replace the entire block with a BC-branched version:

```tsx
{isBusinessCards ? (
  <>
    {/* ── BC FIELD ORDER (matches 4over) ── */}

    {/* PROJECT NAME / P.O. */}
    {isBusinessCards && (
      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <label className="text-sm font-medium text-slate-700">Project Name / P.O.</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Name Your Project"
          className="border border-slate-200 rounded px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-1 focus:ring-[#e07b39]"
        />
      </div>
    )}

    {/* SIZE */}
    {renderListRow("Size", cleanBCSizeList(sizeList), sizeUuid, setSizeUuid, true)}

    {/* SHAPE — shown before Stock for BC (same data as non-BC shapeList) */}
    {renderListRow(
      "Shape",
      shapeList.map((s) => ({ name: s.shape, uuid: s.uuid })),
      shapeUuid,
      (uuid) => { setShapeUuid(uuid); setProductUuid(uuid) },
      true,
    )}

    {/* RADIUS OF CORNERS — conditional: only when a rounded shape is selected */}
    {radiusGroup && /round/i.test(currentShapeLabel) && renderListRow(
      radiusGroup.group_name,
      radiusGroup.options.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
      selectedExtras[radiusGroup.group_uuid] || "",
      (v) => setSelectedExtras((prev) => ({ ...prev, [radiusGroup.group_uuid]: v })),
      true,
    )}

    {/* STOCK */}
    {renderListRow("Stock", stockList, stockUuid, setStockUuid, true)}

    {loadingOptions && (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )}

    {/* COLORSPEC */}
    {renderListRow(
      "Colorspec",
      colorspecOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
      colorspecUuid,
      setColorspecUuid,
      true,
    )}

    {/* COATING */}
    {renderListRow("Coating", coatingList, coatingUuid, setCoatingUuid, true)}

    {/* BC ORDERED EXTRAS: SPOT UV SIDES → Lamination → Scoring → remaining */}
    {bcOrderedExtras.map((g) => (
      <Fragment key={g.group_uuid}>
        {renderListRow(
          g.group_name,
          g.options.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
          selectedExtras[g.group_uuid] || "",
          (v) => setSelectedExtras((prev) => ({ ...prev, [g.group_uuid]: v })),
          true,
        )}
      </Fragment>
    ))}
  </>
) : (
  <>
    {/* ── NON-BC FIELD ORDER (unchanged) ── */}

    {/* SIZE */}
    {renderListRow("Size", sizeList, sizeUuid, setSizeUuid)}

    {/* STOCK */}
    {renderListRow("Stock", stockList, stockUuid, setStockUuid)}

    {/* COATING */}
    {(!hiddenSet || !hiddenSet.has("coating")) &&
      renderListRow("Coating", coatingList, coatingUuid, setCoatingUuid)}

    {/* SHAPE */}
    {renderListRow(
      /^\d+\s*Sheets$/.test(shapeList[0]?.shape || "")
        ? "Sheets Per Pad"
        : /^(black|blue|gray|grey|red|white)$/i.test(shapeList[0]?.shape || "")
          ? "Color"
          : "Shape",
      shapeList.map((s) => ({ name: s.shape, uuid: s.uuid })),
      shapeUuid,
      (uuid) => { setShapeUuid(uuid); setProductUuid(uuid) },
    )}

    {loadingOptions && (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )}

    {/* SIDES (colorspec) */}
    {renderListRow(
      "Sides",
      colorspecOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
      colorspecUuid,
      setColorspecUuid,
    )}

    {/* EXTRA OPTION GROUPS */}
    {visibleExtraGroups.map((g) => (
      <Fragment key={g.group_uuid}>
        {renderListRow(
          g.group_name,
          g.options.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
          selectedExtras[g.group_uuid] || "",
          (v) => setSelectedExtras((prev) => ({ ...prev, [g.group_uuid]: v })),
        )}
      </Fragment>
    ))}
  </>
)}
```

Note: The Project Name input block is inside the BC branch (remove the earlier standalone version added in Task 3 if present — it is now inside the `isBusinessCards ? (...)` block).

- [ ] **Step 4: Move Quantity and Turnaround AFTER the BC/non-BC branch**

After the closing `)}` of the BC/non-BC branch, add Quantity and Turnaround (these are the same for both):

```tsx
{/* QUANTITY — shared by BC and non-BC */}
{renderListRow(
  "Quantity",
  runsizeOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
  runsizeUuid,
  setRunsizeUuid,
  isBusinessCards,
)}

{/* TURNAROUND TIME — shared */}
{renderListRow(
  "Turnaround Time",
  turnaroundOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
  turnaroundUuid,
  setTurnaroundUuid,
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify in browser — Silk BC field order**

Navigate to `http://localhost:3001/print/silk-cards`.

Verify field order top to bottom:
1. Project Name / P.O.
2. Size (clean names)
3. Shape (dropdown — "Rectangle" selected, even if only 1 option)
4. Stock ("16PT C2S" dropdown)
5. Colorspec ("4/0" or similar)
6. Coating (dropdown)
7. SPOT UV SIDES (if available after selecting Coating = Spot UV)
8. Lamination ("Silk")
9. Scoring Options
10. Quantity
11. Turnaround Time

Verify "Majestic Type" and "Product Orientation" are **not** shown.

- [ ] **Step 7: Verify Radius of Corners conditional**

On the Silk BC page:
- Select Size = 1.5" x 3.5" (or any size)
- If Shape has "Round Corner" option, select it → verify "Radius of Corners" dropdown appears
- Switch back to "Rectangle" → verify "Radius of Corners" disappears

- [ ] **Step 8: Verify non-BC is unchanged**

Navigate to `/print/flyers-and-brochures` → verify field order is unchanged (Size, Stock, Coating, Shape, Sides, extra groups, Quantity, Turnaround).

- [ ] **Step 9: Commit**

```bash
git add components/print/product-configurator-client.tsx
git commit -m "feat(bc-calc): BC field order, Shape before Stock, extraGroups ordered, Radius of Corners conditional"
```

---

## Task 5: Job Samples checkbox + price integration

**Files:**
- Modify: `components/print/product-configurator-client.tsx`

**Interfaces:**
- Consumes: `extraGroups`, `selectedExtras`, `setSelectedExtras`, `isBusinessCards`, `bcOrderedExtras` (Task 4)
- Produces: Job Samples checkbox renders below extra groups; when checked, $9.99 is added to quote price via `extraUuids`

---

- [ ] **Step 1: Add `jobSamplesChecked` state**

Find the `const [projectName, setProjectName]` line added in Task 3. Add immediately after:

```ts
const [jobSamplesChecked, setJobSamplesChecked] = useState(false)
```

- [ ] **Step 2: Add `jobSamplesGroup` memo**

Find the `radiusGroup` memo added in Task 4. Add immediately after it:

```ts
// BC: "Job Samples" extra group — rendered as a checkbox, not a dropdown
const jobSamplesGroup = useMemo(
  () => isBusinessCards ? extraGroups.find((g) => /job.?sample/i.test(g.group_name)) : undefined,
  [extraGroups, isBusinessCards],
)
```

- [ ] **Step 3: Default Job Samples to unchecked in the extras-load effect**

Find the effect that calls `setSelectedExtras(defaults)` (inside the `productUuid` effect, around line ~533):

```ts
const defaults: Record<string, string> = {}
for (const g of extras) defaults[g.group_uuid] = g.options[0].option_uuid
setSelectedExtras(defaults)
```

Replace with:

```ts
const defaults: Record<string, string> = {}
for (const g of extras) {
  // Job Samples is opt-in via checkbox — default unchecked (empty = excluded from quote)
  if (isBusinessCards && /job.?sample/i.test(g.group_name)) {
    defaults[g.group_uuid] = ""
  } else {
    defaults[g.group_uuid] = g.options[0].option_uuid
  }
}
setSelectedExtras(defaults)
setJobSamplesChecked(false)   // ← reset checkbox when product changes
```

- [ ] **Step 4: Sync `jobSamplesChecked` → `selectedExtras`**

After the `selectedExtras`/`setSelectedExtras` state declarations (around line ~198), add a new effect:

```ts
// Keep selectedExtras in sync with the Job Samples checkbox so the live
// quote API receives (or excludes) the Job Samples option UUID automatically.
useEffect(() => {
  if (!isBusinessCards || !jobSamplesGroup) return
  setSelectedExtras((prev) => ({
    ...prev,
    [jobSamplesGroup.group_uuid]: jobSamplesChecked
      ? jobSamplesGroup.options[0]?.option_uuid || ""
      : "",
  }))
}, [jobSamplesChecked, jobSamplesGroup, isBusinessCards])
```

- [ ] **Step 5: Render Job Samples checkbox in the BC JSX block**

Inside the BC branch (`isBusinessCards ? (`) from Task 4, find the `{/* BC ORDERED EXTRAS */}` block. Add the Job Samples checkbox immediately AFTER the `bcOrderedExtras.map(...)` block, BEFORE Quantity:

```tsx
{/* JOB SAMPLES checkbox — BC only, opt-in, $9.99 added via quote API */}
{jobSamplesGroup && (
  <div className="flex items-center justify-between py-3 border-b border-slate-100">
    <label className="text-sm font-medium text-slate-700">Job Samples</label>
    <label className="flex items-center gap-2 cursor-pointer min-w-[220px]">
      <input
        type="checkbox"
        checked={jobSamplesChecked}
        onChange={(e) => setJobSamplesChecked(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[#e07b39] focus:ring-[#e07b39]"
      />
      <span className="text-sm text-slate-600">
        Sample of Completed Job (per set){" "}
        <span className="font-medium text-slate-800">+$9.99</span>
      </span>
    </label>
  </div>
)}
```

- [ ] **Step 6: Include `jobSamplesChecked` in `buildCartItem`**

Find `projectName: projectName || undefined,` added in Task 3. Add below it:

```ts
jobSamples: jobSamplesChecked || undefined,
```

Add `jobSamplesChecked` to the `buildCartItem` dependency array:

```ts
}, [
  productUuid,
  price,
  sizeUuid,
  colorspecUuid,
  runsizeUuid,
  turnaroundUuid,
  sizeList,
  colorspecOptions,
  runsizeOptions,
  turnaroundOptions,
  productName,
  categorySlug,
  selectedExtras,
  uploadedFile,
  projectName,
  jobSamplesChecked,   // ← add this
])
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Verify Job Samples in browser**

Navigate to `http://localhost:3001/print/silk-cards`.

Wait for the calculator to fully load (price shows).

1. Note the current price (e.g., $38.03)
2. Check the "Job Samples" checkbox
3. Wait ~1–2 seconds for the live quote to refresh
4. Verify the price increased (by approximately $9.99 — exact amount depends on 4over's quote response)
5. Uncheck → price returns to original

If the Job Samples checkbox does not appear: open DevTools → Console, check for errors. It means the `extraGroups` for this product don't include a "Job Samples" group — verify by checking `http://localhost:3001/api/4over/product-options?product_uuid=274b64d0-9fb2-4e3a-86f0-0b425163d468` in the browser and searching for "job" in the response.

- [ ] **Step 9: Final full verification — Silk BC end-to-end**

Navigate to `http://localhost:3001/print/silk-cards`. Verify the complete field list top to bottom:

| Field | Expected |
|-------|---------|
| Project Name / P.O. | Text input, placeholder "Name Your Project" |
| Size | Dropdown — no "(Oval)" or "(Fold Over)" suffixes |
| Shape | Dropdown — "Rectangle" pre-selected |
| Radius of Corners | Hidden (Rectangle selected) |
| Stock | Dropdown — "16PT C2S" |
| Colorspec | Dropdown — 4/0, 4/1, 4/4 options |
| Coating | Dropdown — Spot UV / No Coating |
| SPOT UV SIDES | Dropdown — appears only when Coating = Spot UV |
| Lamination | Dropdown — "Silk" |
| Scoring Options | Dropdown — "-" |
| Job Samples | Checkbox + "+$9.99" label |
| Quantity | Dropdown |
| Turnaround Time | Dropdown |
| Majestic Type | NOT shown |
| Product Orientation | NOT shown |

- [ ] **Step 10: Verify Standard BC**

Navigate to `http://localhost:3001/print/business-cards-standard/standard-business-cards`.

Verify: Project Name, Size (clean), Colorspec label, Shape dropdown, Quantity, Turnaround all appear. Non-BC products unaffected.

- [ ] **Step 11: Commit**

```bash
git add components/print/product-configurator-client.tsx
git commit -m "feat(bc-calc): Job Samples checkbox, opt-in price via quote API"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Project Name / P.O. — Task 3
- ✅ Size cleanup (strip Oval/FoldOver suffixes) — Task 2
- ✅ Shape as real dropdown before Stock — Task 4
- ✅ Radius of Corners conditional — Task 4
- ✅ Stock always-dropdown — Task 2
- ✅ Colorspec rename — Task 3
- ✅ Coating always-dropdown — Task 2
- ✅ SPOT UV SIDES ordered — Task 4 (comes via extraGroups, ordered by BC_GROUP_ORDER)
- ✅ Lamination ordered — Task 4
- ✅ Scoring Options ordered — Task 4
- ✅ Majestic Type hidden — Task 4 (BC_HIDDEN_EXTRA_NAMES)
- ✅ Product Orientation hidden — Task 4
- ✅ Job Samples checkbox + $9.99 — Task 5
- ✅ buildCartItem updated — Tasks 3 + 5
- ✅ Non-BC products unchanged — Tasks 2–5 all gate on `isBusinessCards`
- ✅ Both ProductConfiguratorClient call sites in page.tsx — Task 1 Steps 5–6
