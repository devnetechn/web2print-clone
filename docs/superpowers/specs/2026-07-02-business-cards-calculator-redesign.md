# Business Cards Calculator — Match 4over Field Structure

**Date:** 2026-07-02
**Branch:** security/4over-env-vars
**Scope:** All Business Card product types (Silk, Standard, Suede, Pearl, etc.)
**Goal:** Make our price calculator match 4over's Silk Business Cards calculator field structure exactly.

---

## Background

4over's Silk Business Cards calculator has these fields (confirmed live via Playwright):

| Field | Type | Options |
|-------|------|---------|
| Project Name / P.O. | Text input | Free text |
| Size | Dropdown | 1.5"×3.5", 1.75"×3.5", 2"×2", 2"×3", 2"×3.5", 2"×7", 2.125"×3.375", 2.5"×2.5", 3.5"×4" |
| Shape | Dropdown | Rectangle, Rounded 2 Corners, Rounded 4 Corners, Oval |
| Radius of Corners | Dropdown (conditional) | Rounded 1/8", Rounded 1/4" — only when Shape is rounded |
| Stock | Dropdown | 16PT C2S (1 option for Silk) |
| Colorspec | Dropdown | 4/0, 4/1, 4/4 (4 color both sides) |
| Coating | Dropdown | Spot UV, No Coating |
| SPOT UV SIDES | Dropdown (conditional) | Spot UV Front, Spot UV Both Sides, Spot UV Back Full UV on the Front — only when Coating = Spot UV |
| Lamination | Dropdown | Silk (1 option for Silk BC) |
| Scoring Options | Dropdown | - (1 option for Silk BC) |
| Job Samples | Checkbox | Sample of Completed Job (per set) +$9.99 |
| Digital Proofs | Checkbox/Dropdown | PDF Proofs (per set) +$5.00 |

Our site was missing: Project Name/P.O., clean Size labels, Shape as a proper dropdown before Stock, Radius of Corners, Coating always visible, SPOT UV SIDES, Job Samples checkbox. "Sides" was also mislabeled (should be "Colorspec").

---

## Approach

**Approach A: Add `isBusinessCards` prop to existing `ProductConfiguratorClient`.**

Rationale: all the pricing cascade logic (Size→Stock→Coating→product→baseprices→quote) stays intact. Only the display layer and new UI state change. Lowest risk, single file for main changes.

Files changed: **2 files**
- `components/print/product-configurator-client.tsx` — main changes
- `app/(storefront)/print/[category]/[typeSlug]/page.tsx` — pass new prop

---

## Detailed Design

### 1. New Prop

```ts
// ProductConfiguratorClientProps
isBusinessCards?: boolean
```

Passed from `[typeSlug]/page.tsx` which already computes `isBusinessCards` on line ~965.

---

### 2. New State

```ts
const [projectName, setProjectName] = useState("")
const [jobSamplesChecked, setJobSamplesChecked] = useState(false)
```

`projectName` is saved to the cart item. `jobSamplesChecked` adds $9.99 to displayed price and passes the Job Samples option UUID to the quote API.

---

### 3. Size Cleanup (BC only)

**Problem:** Our `sizeList` from the 4over API includes shape suffixes that 4over's own website does not show:
- `2" X 3.5" (Oval)` → should be `2" X 3.5"`
- `2" X 7" (Fold Over)` → should be `2" X 7"`
- `3.5" X 4" (Fold Over)` → should be `3.5" X 4"`

**Fix:** When `isBusinessCards=true`, before rendering the Size dropdown:
1. Strip `(Oval)`, `(Fold Over)`, `(Round Corner/s)` suffixes from display names
2. Deduplicate by cleaned name — keep first occurrence's UUID (Rectangle = primary cascade entry)

This is display-layer only. The underlying UUID used in the cascade is unchanged. Oval/Round Corner still appear as Shape options after cascade resolution via `shapeList`.

```ts
function cleanBCSizeList(items: ListItem[]): ListItem[] {
  const SHAPE_SUFFIX = /\s*\((Oval|Fold Over|Round Corners?)\)\s*$/i
  const seen = new Set<string>()
  return items
    .map(item => ({ ...item, name: item.name.replace(SHAPE_SUFFIX, "").trim() }))
    .filter(item => {
      const key = item.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
```

---

### 4. Field Order (BC-specific JSX block)

When `isBusinessCards=true`, render fields in this order:

```
1.  Project Name / P.O.   ← new text input (above Size)
2.  Size                  ← existing, cleaned display names
3.  Shape                 ← moved up (currently renders AFTER Coating)
4.  Radius of Corners     ← from extraGroups, shown only when Shape ≠ Rectangle/Oval
5.  Stock                 ← existing
6.  Colorspec             ← renamed from "Sides"
7.  Coating               ← existing
8.  SPOT UV SIDES         ← from extraGroups, existing data, reordered
9.  Lamination            ← from extraGroups, existing data, reordered
10. Scoring Options       ← from extraGroups, existing data, reordered
11. [remaining extras]    ← any other extraGroups not in the ordered list
12. Job Samples           ← new checkbox (below extra groups)
13. Additional Options    ← existing (Digital Proofs)
14. Quantity
15. Turnaround Time
```

Non-BC products keep the existing field order unchanged.

---

### 5. Always-Dropdown for BC

`renderListRow` currently renders a static display box when `items.length === 1`. For BC, all fields must be real `<Select>` dropdowns even with 1 option (e.g., Stock="16PT C2S", Lamination="Silk").

Add `forceDropdown?: boolean` parameter to `renderListRow`:

```ts
const renderListRow = (
  label: string,
  items: ListItem[],
  value: string,
  onChange: (v: string) => void,
  forceDropdown = false,  // ← new
) => {
  if (items.length === 0) return null
  if (items.length === 1 && !forceDropdown) {
    // existing static box
  }
  // existing dropdown
}
```

When `isBusinessCards=true`, all BC field calls pass `forceDropdown={true}`.

---

### 6. extraGroups Ordering for BC

`visibleExtraGroups` currently renders in API response order. For BC, split into:

```ts
const BC_GROUP_ORDER = ["spot uv sides", "lamination", "scoring options"]
const BC_HIDDEN_GROUPS = ["majestic type", "product orientation"]
```

Render ordered BC groups first, then remaining visible extras. `Majestic Type` and `Product Orientation` are hidden for BC (not shown on 4over's UI).

`Radius of Corners` from extraGroups is shown only when current `shapeUuid` resolves to a rounded shape (i.e., `extractShape(shapeDesc)` includes "Round"). When Shape = Rectangle or Oval, Radius of Corners is hidden.

---

### 7. Job Samples Checkbox

Detect from `extraGroups`: look for a group whose name matches `/job.?sample/i`.

```ts
const jobSamplesGroup = extraGroups.find(g => /job.?sample/i.test(g.group_name))
const jobSamplesOptionUuid = jobSamplesGroup?.options[0]?.option_uuid
```

Render as checkbox with label "Sample of Completed Job (per set) +$9.99".

Price effect:
- If `jobSamplesChecked && jobSamplesOptionUuid`: include UUID in `extraUuids` → passes to the live quote API which returns the correct price with samples included.
- Displayed price comes from the quote API response (already handles extras via `options[]`).

---

### 8. Label Rename

When `isBusinessCards=true`:
- "Sides" → **"Colorspec"**

---

### 9. Cart Item Update

`buildCartItem` includes new fields:

```ts
{
  ...existing fields,
  projectName: projectName || undefined,
  jobSamples: jobSamplesChecked,
}
```

---

## What Does NOT Change

- The pricing cascade logic: Size → Stock → Coating → product_uuid → baseprices → quote
- Non-BC product pages (signs, banners, folders, etc.) — unchanged
- `sizeProducts` mode for sign-type pages — unchanged
- `shapeList` resolution (Rectangle/Oval/Round Corner detected after product_uuid resolved)
- The quote API call signature (Job Samples UUID goes via existing `options[]` param)

---

## Out of Scope

- 4over's 2-step "Product Options → Sets & Shipping" flow — Boss Dwayne did not request this
- "Add to Favorites" button — not requested
- Converting "Digital Proofs" (Additional Options) to a checkbox — keeping it as the existing extraGroup dropdown for now; it functions correctly already
- "2.5" x 2.5"" size — will appear automatically if the 4over API returns it for the BC category; no special handling needed

## Implementation Notes

- **Radius of Corners** comes from `extraGroups` (a product option group on the resolved `product_uuid`), NOT a separate product_uuid cascade step. Show/hide it based on whether the current `shapeUuid` resolves to a rounded shape.
- **Job Samples group name** from the 4over API may differ slightly (`"job samples"`, `"job sample"`, etc.) — use `/job.?sample/i` regex to match it safely.
- **"2.5" x 2.5""** — this size may be Oval-only in the BC category. After deduplication by clean name, it will appear if the API returns it at the Rectangle/default path.
