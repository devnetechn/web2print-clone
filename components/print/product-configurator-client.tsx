"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Fragment, type ChangeEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Share2, Palette, Upload, LayoutTemplate, ShoppingCart, Zap, FileText } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { uploadDesignFile } from "@/app/actions/design-upload"
import { translateCoatingName, translateStockName, translateColorspecName, translateBCSizeName, translateTurnaroundName } from "@/lib/4over/option-labels"

interface ListItem {
  name: string
  uuid: string
}

interface ProductOption {
  product_uuid: string
  product_code: string
  product_description: string
}

interface OptionItem {
  option_uuid: string
  option_name: string
  option_description?: string
}

interface Combination {
  colorspec_uuid: string
  colorspec: string
  runsize_uuid: string
  runsize: string
  turnaround_uuid: string
  turnaround: string
  price: number
}

// An "extra" option group (Orientation, Grommets, H-Stakes, Flute, etc.) that
// is not part of the size/colorspec/runsize/turnaround pricing axes but can add
// to the price via the live quote's options[] param.
interface ExtraGroup {
  group_uuid: string
  group_name: string
  options: OptionItem[]
}

interface ProductConfiguratorClientProps {
  categoryUuid: string
  categorySlug: string
  productName: string
  // optional: restrict to a set of product_uuids that belong to this type
  allowedProductUuids?: string[]
  // optional: hide these option-group names from the UI (lowercased match).
  // Hidden groups still use their default option in the live price, so the
  // quote stays correct — this only trims what the customer sees/selects.
  hiddenGroups?: string[]
  // optional: size-variant mode. When a product is one of several that differ
  // only by size (e.g. "10mm White Coroplast" in 10x10, 24x36, ...), pass the
  // variants here. The Size dropdown then selects a product directly (its value
  // IS a product_uuid) and the Size/Stock/Coating category cascade is skipped.
  sizeProducts?: { uuid: string; size: string }[]
  // optional: when the category mixes several distinct product lines under
  // ONE category_uuid (e.g. Boxes & Packaging: Cube Box, Wine Box, ... all
  // share one UUID, distinguished only by size), the normal cascade's default
  // "first size in the whole category" can land on the WRONG product line.
  // Anchoring to the clicked product's own size scopes Stock/Coating to just
  // that product line from the start, so they cascade correctly.
  initialSizeUuid?: string
  // optional: anchor the Stock dropdown too, for the SAME reason as
  // initialSizeUuid — TYPE_RULES categories (e.g. "All Inclusive Flyers and
  // Brochures") restrict allowedProductUuids to a specific sub-type within a
  // category that mixes many, but the cascade's default "first stock at this
  // size" can be a stock that sub-type doesn't even use (e.g. plain "60LB"
  // when All Inclusive only exists on "100GLB"/"100DB"/...). When that
  // happens getAllowedProducts() silently falls back to ANY product at that
  // stock — the page still shows a price, just for the WRONG product type.
  // Only applied while sizeUuid still equals initialSizeUuid (if the
  // customer manually changes Size afterward, this stock may not even exist
  // there, so the normal stocks[0] default takes back over).
  initialStockUuid?: string
  // optional: anchor Coating too — same reasoning one level further down the
  // cascade (a stock can have a coating this type doesn't use either). Only
  // applied while stockUuid still equals initialStockUuid.
  initialCoatingUuid?: string
  // optional: when the category contains many product lines, restrict the
  // Size dropdown to only these UUIDs (e.g. All-Inclusive Postcards within
  // the full postcards category, which otherwise showed every size from ALL
  // postcard types).
  filteredSizeUuids?: string[]
  // Raw lowercased descriptions of every product classified into THIS type
  // — used to filter Stock/Coating options FRESH every time a new list
  // comes back from the live cascade (whichever Size/Stock the user
  // currently has selected), by checking whether each option's raw code OR
  // translated display name appears in any of these descriptions. Recomputed
  // client-side rather than passed as a pre-filtered name list because a
  // filter built server-side from just ONE anchor size's own stock_list can
  // never include a stock/coating that only exists at a DIFFERENT (still
  // valid) size — confirmed 2026-07-09, Foil Worx Business Cards: "32PT
  // Uncoated" only appears in the raw stock_list at Size='2" x 3.5"', so a
  // filter computed while anchoring on a different size silently excluded
  // it even though the user could still pick that size from an already-
  // correctly-scoped Size dropdown. Without this at all, picking an out-of-
  // scope option used to silently resolve to a completely different product
  // — the true type has zero matches at that combo, so
  // getAllowedProducts()'s fallback returns the full unfiltered list instead
  // — confirmed wrong-price bug (2026-07-08, All-Inclusive Postcards).
  matchedProductTexts?: string[]
  isBusinessCards?: boolean
  isAllInclusive?: boolean
  isBanner?: boolean
  // Virtual fold-preset type cards (Tri Fold/Z Fold/Specialty Folds
  // Brochures) reuse their base type's own product set (e.g. "Flat Flyers
  // Brochures") but need to default one "extra" option group (Folding
  // Options) to a SPECIFIC value instead of the group's usual default —
  // see FOLDING_PRESET_TYPES in [typeSlug]/page.tsx for the full context.
  // Regex SOURCE strings, not RegExp objects — Server Components can't pass
  // RegExp instances to Client Components (confirmed: "Only plain objects...
  // can be passed... Classes or null prototypes are not supported").
  preferredExtraOption?: { groupNameMatch: string; optionNameMatch: string }
}

function translateList<T extends { name: string }>(list: T[], translator: (n: string) => string): T[] {
  const seen = new Set<string>()
  return list
    .map((i) => ({ ...i, name: translator(i.name) }))
    .filter((i) => {
      const key = i.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function dedupeList(items: ListItem[]): ListItem[] {
  const seen = new Set<string>()
  return items.filter((i) => {
    if (!i?.uuid || seen.has(i.uuid)) return false
    seen.add(i.uuid)
    return true
  })
}

// Checks a raw option name against a set of matched-product descriptions,
// trying BOTH the bare code ("14PTUC") and its translated display name
// ("14PT Uncoated") — some raw codes appear literally in descriptions
// ("16PT" in "...16PT C2S..."), others are concatenated abbreviations that
// never do (confirmed 2026-07-09, Foil Worx Business Cards: "14PTUC" never
// matches the description's spaced-out "14PT Uncoated").
function matchesAnyText(rawName: string, translated: string, texts: string[]): boolean {
  const bare = rawName.toLowerCase()
  const label = translated.toLowerCase()
  return texts.some((t) => t.includes(bare) || t.includes(label))
}

// Shape suffixes baked into size names by the 4over API (e.g. "2\" X 3.5\" (Oval)").
// For BC, Oval/FoldOver/RoundCorner are Shape options, not size variants — strip them
// and deduplicate so the Size dropdown shows clean dimensions matching 4over's UI.
const BC_SHAPE_SUFFIX = /\s*\((Oval|Fold\s*Over|Round\s*Corners?)\)\s*$/i

function cleanBCSizeList(items: ListItem[]): ListItem[] {
  const seen = new Set<string>()
  return items
    .map((item) => {
      const stripped = item.name.replace(BC_SHAPE_SUFFIX, "").trim()
      return { ...item, name: translateBCSizeName(stripped) }
    })
    .filter((item) => {
      const key = item.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// Business Cards (and similar) sell Round Corner/Oval as separate
// product_uuids at the same Size+Stock+Coating, distinguished only by this
// wording in the description — used to label the Shape dropdown options.
function extractShape(desc: string): string {
  return extractShapeCore(desc)
}

// Silk/Suede/Foil Worx-style Business Cards sell each Spot UV side
// (front/back/both) as its own product_uuid at the same Size+Stock+
// Coating+Shape, exactly matching 4over.com's own separate "Spot UV Sides"
// dropdown (Spot UV Front / Spot UV Both Sides / Spot UV Back Full UV on
// the Front) — kept as its own axis rather than folded into Shape so the
// UI matches 4over.com's literal 2-field layout. See where this is used
// (spotUvSideList effect) for how it combines with Shape to resolve the
// final product_uuid.
function extractSpotUvSide(desc: string): string | null {
  const m = desc.match(/spot\s*uv\s*on\s*(both\s*sides|the\s*back|the\s*front)/i)
  if (!m) return null
  const side = m[1].toLowerCase()
  return side.includes("both") ? "Spot UV Both Sides" : side.includes("back") ? "Spot UV Back" : "Spot UV Front"
}

function extractShapeCore(desc: string): string {
  // Notepads' "25 Sheet"/"50 Sheet Notepad..." pair resolves to 2 distinct
  // product_uuids at the same Size+Stock+Coating, the exact same ambiguity
  // pattern as Round Corner/Oval/Fold Over — just a sheet count instead of
  // a shape. Checked first since it's mutually exclusive with the others.
  const sheetMatch = desc.match(/\b(\d+)\s*sheets?\b/i)
  if (sheetMatch) return `${sheetMatch[1]} Sheets`
  // Wine Boxes: "with Handle" resolves to a genuinely separate product_uuid
  // at the SAME Size+Stock+Coating (confirmed live: 4over.com's own "Handle
  // Options" dropdown, "No Handle (Tuck Top)" / "With Handle") — checked
  // before the generic shape checks since "Wine Box" text never matches any
  // of them anyway, but this keeps the pairing explicit rather than falling
  // through to the "Rectangle" default.
  // Boxes & Packaging's Akuafoil variants (Cube/Wine/Sales/Tuck/Golf Ball/
  // Business Card/Pillow/Print & Trim Boxes) resolve to a genuinely
  // separate product_uuid at the same Size — sometimes also at the same
  // Stock+Coating (e.g. "18PT Cube Box Uncoated" vs "...with Akuafoil
  // uncoated" both land on Stock=18PT C1S/Coating=No Coating), which is
  // exactly this ambiguity pattern. User decided (2026-07-08) to merge
  // these into one card with Akuafoil as a calculator pick rather than a
  // separate "Majestic Boxes" subcategory. Wine Box is checked first and
  // combines with Handle since it has BOTH dimensions independently (4
  // real combos exist: plain, Handle, Akuafoil, Handle+Akuafoil).
  if (/wine\s*box/i.test(desc)) {
    const handle = /with\s+handle/i.test(desc) ? "With Handle" : "No Handle (Tuck Top)"
    return /akuafoil/i.test(desc) ? `${handle} + Akuafoil` : handle
  }
  // Boxes & Packaging's Akuafoil variants have no OTHER shape distinction
  // (Cube/Sales/Golf Ball/etc. box types never say "Round Corner"/"Oval"),
  // so "Akuafoil" itself is the real differentiator there — matches the
  // merge decision above. Akuafoil BUSINESS CARDS are different: that
  // subcategory's own product-options data has a genuine Shape group
  // (Rectangle/Round Corner/Square, confirmed via productsfeed — same real
  // shapes as every other Business Card material) with Akuafoil already
  // shown separately via its own "Foil" extra-options field, so returning
  // "Akuafoil" here for a "Round Corner Business Cards w/ Akuafoil..."
  // description would wrongly swallow the Round Corner distinction (2026-
  // 07-08 bug: Akuafoil BC's Shape dropdown got stuck on "Akuafoil" for
  // every combo, hiding 70 real Round Corner siblings). Scoped to box
  // context (mirrors the "box(es)" check further below) so this still
  // fires correctly for Cube/Sales/etc + Akuafoil, but Business Cards fall
  // through to the real Round Corner/Square/Rectangle checks below instead.
  if (/akuafoil/i.test(desc) && /\bbox(es)?\b|flat sheets/i.test(desc)) return "Akuafoil"
  // Dual Raised Business Cards: only 2 raw products, same Size/Stock, same
  // "Business Card" wording — differ only in whether the second raised
  // element is another Foil or a Raised Spot UV (matches 4over.com's own
  // unified Dual Raised calculator, which exposes this as part of its
  // Colorspec choices + a separate Raised Spot UV Side field).
  if (/dual\s*raised/i.test(desc)) {
    return /raised\s*spot\s*uv/i.test(desc) ? "Raised Spot UV + Foil" : "Two Raised Foils"
  }
  // Raised Spot UV Business Cards: 2 raw products, same Size/Stock/Coating,
  // differ only in "Raised Spot UV Front" vs "...on both sides" — 4over.com's
  // own "Raised Spot UV Side" field. Confirmed bug (2026-07-09): this text
  // never matched any earlier check, so both variants fell through to the
  // generic "Rectangle" default, collapsing to ONE indistinguishable Shape
  // entry — the "Raised Spot UV Side" extra-options group (sourced from
  // whichever ONE sibling happened to resolve first, same architecture flaw
  // as the old "Spot UV Sides" bug on Silk/Suede) then only ever showed a
  // single static value instead of a real switcher between the two.
  if (/raised\s*spot\s*uv/i.test(desc)) {
    return /both\s*sides/i.test(desc) ? "Raised Spot UV Both Sides" : "Raised Spot UV Front"
  }
  if (/round\s*corner/i.test(desc)) return "Round Corner"
  if (/\boval\b/i.test(desc)) return "Oval"
  if (/fold\s*over/i.test(desc)) return "Fold Over"
  if (/\bcircle\b/i.test(desc)) return "Circle"
  // Buttons: at most ONE of Shape or Backing varies for any given size (3"
  // Round has both a Locking-pin and a Magnet variant — Magnet checked
  // first so that pair differentiates as "Round" vs "Magnet Backing"
  // rather than both collapsing to "Round"; 2"x2" has Diamond vs Square,
  // checked next, no Backing variation there).
  if (/magnet\s*backing/i.test(desc)) return "Magnet Backing"
  if (/diamond\s*shaped/i.test(desc)) return "Diamond"
  if (/\bsquare\b/i.test(desc)) return "Square"
  if (/\brectangle\b/i.test(desc)) return "Rectangle"
  if (/\bround\b/i.test(desc)) return "Round"
  // Business Cards at square dimensions (e.g. "2\" X 2\"", "2.5\" X 2.5\"")
  // never say "Square" in the description text at all — confirmed via
  // productsfeed, 4over's OWN per-product "Shape" option group says
  // "Square" for these, but that's only available per-uuid (an extra fetch
  // per sibling), not in bulk from categoryproductslist. Detecting it from
  // the leading WxH dimension instead keeps this in sync with 4over's real
  // classification without that extra cost — without this, e.g. Silk at
  // 2"x2" fell through to the generic "Rectangle" default below, which
  // disagreed with the product's own real Shape metadata.
  // Excludes box(es)/flat sheets context: a box's leading dimensions are
  // WxHxD (e.g. Cube Boxes' "2.75\" x 2.75\" x 2.75\""), and a cube's first
  // two numbers being equal doesn't mean "Square" in the Business-Card
  // sense — confirmed regression (2026-07-08): Cube Boxes' Material field
  // briefly showed "Square" instead of "Standard" until this exclusion was
  // added, since the WxH-equality check alone can't tell a business-card
  // shape from a box's plan dimensions.
  const dimMatch = !/\bbox(es)?\b|flat sheets/i.test(desc)
    ? desc.match(/^(\d+(?:\.\d+)?)\s*["”']?\s*[Xx]\s*(\d+(?:\.\d+)?)\s*["”']?/)
    : null
  if (dimMatch && Math.abs(parseFloat(dimMatch[1]) - parseFloat(dimMatch[2])) < 0.001) return "Square"
  // T-Shirts' garment types (e.g. "Men Short Sleeve Tee") resolve to 2-5
  // distinct product_uuids at the same Size+Stock+Coating, distinguished
  // only by a color word right before "with"/"w/" Print Area — the exact
  // same ambiguity pattern, just Color instead of Shape.
  const colorMatch = desc.match(/\b(black|blue|gray|grey|red|white)\b\s*(?=w\/|with)/i)
  if (colorMatch) return colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1).toLowerCase()
  // Non-Akuafoil Boxes & Packaging products would otherwise fall through to
  // the generic "Rectangle" default below — clearer paired with "Akuafoil"
  // as "Standard" (matches 4over's own "Product Type: Standard" vs
  // "Product Type: Majestic" distinction, confirmed via productsfeed).
  if (/\bbox(es)?\b|flat sheets/i.test(desc)) return "Standard"
  return "Rectangle"
}

// Option groups handled by the dedicated size/colorspec/runsize/turnaround
// pricing axes (or that are display-only/internal) — excluded from the generic
// "extra options" rendering so we don't show them twice.
const HANDLED_GROUP_NAMES = new Set([
  "product type",
  "product category",
  // 2026-07-10: 4over's own API returns this group as bare "Category" (not
  // "Product Category" like the entry above already anticipated) for
  // Majestic-brand products (Akuafoil/Foil Worx/etc) -- its single option's
  // option_prices_list is always genuinely empty ("product group as a
  // category option" per its own description, pure metadata, not a real
  // priceable choice). Was slipping through into extraGroups, getting
  // auto-selected as a default, and sent to the quote API -- which broke
  // pricing entirely (returned $0, silently resolving to an unrelated
  // "Akuafoil Products" bucket item with no price data of its own).
  // Confirmed reproducible on Presentation Folders' Akuafoil card; likely
  // affects every Majestic-brand product across every category.
  "category",
  "short side (inches)",
  "long side (inches)",
  "size",
  "stock",
  "coating",
  "colorspec",
  "runsize",
  "turn-around",
  "turnaround",
  "turn around",
  "handling fee",
])

// BC-specific extra group ordering (rendered in this order before remaining groups)
const BC_GROUP_ORDER = ["spot uv sides", "lamination", "scoring options"]
// Extra groups hidden from BC UI (not shown on 4over's calculator)
const BC_HIDDEN_EXTRA_NAMES = new Set(["majestic type", "product orientation"])
// BC extra groups that are rendered separately (not via the generic extras loop)
const BC_SEPARATE_EXTRA_NAMES = /^(radius of corners|job.?sample)/i
// All-Inclusive: extra groups rendered as checkboxes (not via the generic extras loop)
const AI_SEPARATE_EXTRA_NAMES = /^(job.?sample|digital.?proof|pdf.?proof)/i

// Parse "2' x 3'", '2" x 3"', "2 ft x 3 ft" → { width, height }
function parseBannerSizeParts(size: string): { width: string; height: string } | null {
  const match = size.match(/^(.+?)\s+[xX×]\s+(.+)$/)
  if (!match) return null
  return { width: match[1].trim(), height: match[2].trim() }
}

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
  filteredSizeUuids,
  matchedProductTexts,
  isBusinessCards = false,
  isAllInclusive = false,
  isBanner = false,
  preferredExtraOption,
}: ProductConfiguratorClientProps) {
  const router = useRouter()
  const sizeVariantMode = !!(sizeProducts && sizeProducts.length > 0)
  // Lowercased set of option-group names to HIDE (null = show all).
  const hiddenSet = useMemo(
    () => (hiddenGroups ? new Set(hiddenGroups.map((g) => g.toLowerCase().trim())) : null),
    [hiddenGroups],
  )
  // Size / Stock / Coating lists from categoryproductslist
  const [sizeList, setSizeList] = useState<ListItem[]>([])
  const [stockList, setStockList] = useState<ListItem[]>([])
  const [coatingList, setCoatingList] = useState<ListItem[]>([])

  const [sizeUuid, setSizeUuid] = useState("")
  const [stockUuid, setStockUuid] = useState("")
  const [coatingUuid, setCoatingUuid] = useState("")

  const [productUuid, setProductUuid] = useState("")
  const [loadingList, setLoadingList] = useState(true)

  // Shape variants (Rectangle/Round Corner/Oval/...): when the resolved
  // Size+Stock+Coating triple still matches MULTIPLE allowedProductUuids
  // (e.g. Business Cards mixes Standard/Round Corner/Oval as separate
  // product_uuids at the same size/stock/coating), expose them as a
  // switchable "Shape" dropdown instead of silently picking the first and
  // hiding the rest. See the "coating changed" effect below.
  const [shapeList, setShapeList] = useState<{ uuid: string; shape: string }[]>([])
  const [shapeUuid, setShapeUuid] = useState("")
  // Raw sibling pool behind shapeList (uuid+description), kept so the Spot
  // UV Sides effect below can re-filter to "siblings matching the CURRENTLY
  // selected shape" and build its own independent switchable list — see
  // extractSpotUvSide()'s comment for why this is a second axis rather than
  // folded into Shape.
  const [rawShapeProducts, setRawShapeProducts] = useState<{ uuid: string; description: string }[]>([])
  const [spotUvSideList, setSpotUvSideList] = useState<{ uuid: string; side: string }[]>([])
  const [spotUvSideUuid, setSpotUvSideUuid] = useState("")

  // Valid combinations (colorspec/runsize/turnaround + price) from baseprices
  const [combinations, setCombinations] = useState<Combination[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const [colorspecUuid, setColorspecUuid] = useState("")
  const [runsizeUuid, setRunsizeUuid] = useState("")
  const [turnaroundUuid, setTurnaroundUuid] = useState("")

  // Extra option groups (Orientation, Grommets, H-Stakes, Flute, ...) + selection
  const [extraGroups, setExtraGroups] = useState<ExtraGroup[]>([])
  const [selectedExtras, setSelectedExtras] = useState<Record<string, string>>({})

  const [price, setPrice] = useState<number | null>(null)
  const [priceNote, setPriceNote] = useState<string | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)

  // Shipping estimation
  const [shipOpen, setShipOpen] = useState(false)
  const [shipZip, setShipZip] = useState("")
  const [shipLoading, setShipLoading] = useState(false)
  const [shipOptions, setShipOptions] = useState<{ code: string; service: string; price: number; estimatedDays: number | null }[]>([])
  const [shipError, setShipError] = useState<string | null>(null)

  const [added, setAdded] = useState(false)

  // Uploaded artwork (PDF/AI/EPS/JPG/PNG/TIFF) for this configuration —
  // carried through to the cart item so it shows up in cart/checkout and
  // later in the admin order view, matching the reference backend's
  // "Upload Design" + order-thumbnail flow.
  const [uploadedFile, setUploadedFile] = useState<{ fileName: string; url: string; path: string; contentType: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("")

  // Banner-specific: separate Width + Height selectors
  const [bannerWidth, setBannerWidth] = useState("")
  const [bannerHeight, setBannerHeight] = useState("")
  const [jobSamplesChecked, setJobSamplesChecked] = useState(false)
  const [digitalProofsChecked, setDigitalProofsChecked] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isPreviewableImage = uploadedFile?.contentType.startsWith("image/") && uploadedFile.contentType !== "image/tiff"

  // Unique widths derived from sizeProducts (banner mode only)
  const bannerWidthItems = useMemo<ListItem[]>(() => {
    if (!isBanner) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const sp of (sizeProducts || [])) {
      const parsed = parseBannerSizeParts(sp.size)
      if (!parsed || seen.has(parsed.width)) continue
      seen.add(parsed.width)
      out.push(parsed.width)
    }
    out.sort((a, b) => parseFloat(a) - parseFloat(b))
    return out.map((w) => ({ uuid: w, name: w }))
  }, [isBanner, sizeProducts])

  // Heights available for the currently selected width (banner mode only)
  const bannerHeightItems = useMemo<ListItem[]>(() => {
    if (!isBanner || !bannerWidth) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const sp of (sizeProducts || [])) {
      const parsed = parseBannerSizeParts(sp.size)
      if (!parsed || parsed.width !== bannerWidth || seen.has(parsed.height)) continue
      seen.add(parsed.height)
      out.push(parsed.height)
    }
    out.sort((a, b) => parseFloat(a) - parseFloat(b))
    return out.map((h) => ({ uuid: h, name: h }))
  }, [isBanner, bannerWidth, sizeProducts])

  // Initialize banner width/height from first sizeProduct
  useEffect(() => {
    if (!isBanner || !sizeProducts?.length) return
    const parsed = parseBannerSizeParts(sizeProducts[0].size)
    if (!parsed) return
    if (!bannerWidth) setBannerWidth(parsed.width)
    if (!bannerHeight) setBannerHeight(parsed.height)
  }, [isBanner, sizeProducts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset height when width changes if current height is no longer available
  useEffect(() => {
    if (!isBanner || !bannerWidth || !sizeProducts?.length) return
    const available = (sizeProducts)
      .map((sp) => parseBannerSizeParts(sp.size))
      .filter((p): p is { width: string; height: string } => p !== null && p.width === bannerWidth)
      .map((p) => p.height)
      .sort((a, b) => parseFloat(a) - parseFloat(b))
    if (available.length > 0 && !available.includes(bannerHeight)) {
      setBannerHeight(available[0])
    }
  }, [bannerWidth, isBanner, sizeProducts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve product uuid from selected width + height
  useEffect(() => {
    if (!isBanner || !bannerWidth || !bannerHeight || !sizeProducts?.length) return
    const match = sizeProducts.find((sp) => {
      const parsed = parseBannerSizeParts(sp.size)
      return parsed && parsed.width === bannerWidth && parsed.height === bannerHeight
    })
    if (match) setSizeUuid(match.uuid)
  }, [isBanner, bannerWidth, bannerHeight, sizeProducts]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelected = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadDesignFile(formData)
      if (result.success) {
        setUploadedFile({ fileName: result.fileName!, url: result.url!, path: result.path!, contentType: result.contentType! })
      } else {
        setUploadError(result.error || "Upload failed")
      }
    } catch {
      setUploadError("Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }, [])

  // Monotonic request id: only the response from the most recent cascade
  // request is allowed to update state. Prevents a stale (size+oldStock+oldCoating)
  // request from overwriting the correct selection and triggering a 404.
  const reqIdRef = useRef(0)

  // Fetch categoryproductslist with current selections
  const fetchList = useCallback(
    async (params: { size_uuid?: string; stock_uuid?: string; coating_uuid?: string }) => {
      const qs = new URLSearchParams({ category_uuid: categoryUuid })
      if (params.size_uuid) qs.set("size_uuid", params.size_uuid)
      if (params.stock_uuid) qs.set("stock_uuid", params.stock_uuid)
      if (params.coating_uuid) qs.set("coating_uuid", params.coating_uuid)

      const res = await fetch(`/api/4over/categoryproductslist?${qs.toString()}`)
      const json = await res.json()
      if (!json.success) return null
      return json.data as {
        size_list?: ListItem[]
        stock_list?: ListItem[]
        coating_list?: ListItem[]
        products?: ProductOption[]
      }
    },
    [categoryUuid],
  )

  // Initial load: get all sizes
  useEffect(() => {
    // Size-variant mode: the Size dropdown picks a product directly.
    if (sizeVariantMode) {
      const sizes = (sizeProducts || []).map((p) => ({ name: p.size, uuid: p.uuid }))
      setSizeList(sizes)
      setSizeUuid((prev) => prev || sizes[0]?.uuid || "")
      setLoadingList(false)
      return
    }
    if (!categoryUuid) {
      setLoadingList(false)
      return
    }
    let active = true
    setLoadingList(true)
    fetchList({}).then((data) => {
      if (!active || !data) {
        setLoadingList(false)
        return
      }
      const allSizes = dedupeList(data.size_list || [])
      const sizes = filteredSizeUuids && filteredSizeUuids.length > 0
        ? allSizes.filter((s) => filteredSizeUuids!.includes(s.uuid))
        : allSizes
      setSizeList(sizes)
      if (sizes.length > 0) {
        const anchored = initialSizeUuid && sizes.some((s) => s.uuid === initialSizeUuid)
        setSizeUuid(anchored ? initialSizeUuid! : sizes[0].uuid)
      }
      setLoadingList(false)
    })
    return () => {
      active = false
    }
  }, [fetchList, categoryUuid, sizeVariantMode, sizeProducts, initialSizeUuid])

  // In size-variant mode the selected "size" IS the product_uuid.
  useEffect(() => {
    if (sizeVariantMode && sizeUuid) setProductUuid(sizeUuid)
  }, [sizeVariantMode, sizeUuid])

  // Sizes whose resolved product returned no base prices — skip them so we never
  // leave the customer on a dead "Select options to see pricing" default.
  const triedSizesRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    triedSizesRef.current = new Set()
  }, [categoryUuid])
  // Latest size selection/list, read inside the baseprices effect WITHOUT making
  // it a dependency (adding sizeUuid as a dep would re-run baseprices on every
  // size change with a stale productUuid and burn through all sizes).
  const sizeUuidRef = useRef("")
  const sizeListRef = useRef<ListItem[]>([])
  useEffect(() => {
    sizeUuidRef.current = sizeUuid
  }, [sizeUuid])
  useEffect(() => {
    sizeListRef.current = sizeList
  }, [sizeList])
  // Latest stock selection, read inside the coating-resolve effect WITHOUT
  // making it a dependency — see that effect for why.
  const stockUuidRef = useRef("")
  useEffect(() => {
    stockUuidRef.current = stockUuid
  }, [stockUuid])

  const getAllowedProducts = useCallback(
    (products: ProductOption[] | undefined) => {
      const list = products || []
      const allowed = list.filter(
        (p) => !allowedProductUuids || allowedProductUuids.includes(p.product_uuid),
      )
      return allowed.length > 0 ? allowed : list
    },
    [allowedProductUuids],
  )

  const resolveProduct = useCallback(
    (products: ProductOption[] | undefined) => getAllowedProducts(products)[0]?.product_uuid || "",
    [getAllowedProducts],
  )

  // When size changes -> reset downstream selections IMMEDIATELY, then load stocks.
  useEffect(() => {
    if (sizeVariantMode) return // size-variant mode resolves the product directly
    if (!sizeUuid) return
    const myReq = ++reqIdRef.current
    setStockList([])
    setStockUuid("")
    setCoatingList([])
    setCoatingUuid("")
    setProductUuid("")

    fetchList({ size_uuid: sizeUuid }).then((data) => {
      if (reqIdRef.current !== myReq || !data) return
      const allStocks = dedupeList(data.stock_list || [])
      const stocks = matchedProductTexts && matchedProductTexts.length > 0
        ? allStocks.filter((s) => matchesAnyText(s.name, translateStockName(s.name), matchedProductTexts!))
        : allStocks
      setStockList(stocks)
      if (stocks.length > 0) {
        const anchored =
          initialStockUuid && sizeUuid === initialSizeUuid && stocks.some((s) => s.uuid === initialStockUuid)
        setStockUuid(anchored ? initialStockUuid! : stocks[0].uuid)
      } else {
        // No stock dimension for this size — resolve the product directly so the
        // cascade doesn't dead-end (e.g. some EDDM sizes return products at the
        // size level with no stock/coating step).
        setStockUuid("")
        setProductUuid(resolveProduct(data.products))
      }
    })
  }, [sizeUuid, fetchList, sizeVariantMode, resolveProduct, initialSizeUuid, initialStockUuid, matchedProductTexts])

  // When stock changes -> reset coating/product IMMEDIATELY, then load coatings.
  // Reads sizeUuid via ref rather than as a dependency: sizeUuid is ALSO in
  // the upstream "size changed" effect's dep array, so a size change re-runs
  // THIS effect too, in the same flush, before stockUuid has actually been
  // reset to "" — using the still-stale stockUuid from the previous size
  // (whenever that stale uuid happens to also be valid for the new size,
  // e.g. the same "14PT" stock name resolving to the same uuid at multiple
  // sizes) and resolving coatings/product for the WRONG size. Same race
  // pattern as the size/stock refs above one level down the cascade.
  useEffect(() => {
    const sUuid = sizeUuidRef.current
    if (!sUuid || !stockUuid) return
    const myReq = ++reqIdRef.current
    setCoatingList([])
    setCoatingUuid("")
    setProductUuid("")

    fetchList({ size_uuid: sUuid, stock_uuid: stockUuid }).then(async (data) => {
      if (reqIdRef.current !== myReq || !data) return
      const allCoatings = dedupeList(data.coating_list || [])
      // API-verified, NOT text-matched: coating_list names are abbreviated
      // 4over codes ("AQ", "UVFR", "MATT"...) that don't reliably appear in
      // product descriptions even once translated to their display name
      // (confirmed: "UV Coating Front Only" never matches a description
      // phrased "...with Full UV on the front only..."), unlike Stock codes
      // which usually do. Verifying by actually resolving each candidate
      // coating and checking the result against allowedProductUuids is
      // slower (one extra request per coating) but correct regardless of
      // how a coating's raw code or label happens to be worded.
      let coatings = allCoatings
      if (allowedProductUuids && allowedProductUuids.length > 0 && allCoatings.length > 0) {
        const verifications = await Promise.all(
          allCoatings.map((c) => fetchList({ size_uuid: sUuid, stock_uuid: stockUuid, coating_uuid: c.uuid })),
        )
        if (reqIdRef.current !== myReq) return
        coatings = allCoatings.filter((_, i) =>
          (verifications[i]?.products || []).some((p) => allowedProductUuids!.includes(p.product_uuid)),
        )
        if (coatings.length === 0) coatings = allCoatings
      }
      setCoatingList(coatings)
      if (coatings.length > 0) {
        const anchored =
          initialCoatingUuid &&
          sUuid === initialSizeUuid &&
          stockUuid === initialStockUuid &&
          coatings.some((c) => c.uuid === initialCoatingUuid)
        setCoatingUuid(anchored ? initialCoatingUuid! : coatings[0].uuid)
      } else {
        setProductUuid(resolveProduct(data.products))
      }
    })
  }, [stockUuid, fetchList, resolveProduct, initialSizeUuid, initialStockUuid, initialCoatingUuid, allowedProductUuids])

  // When coating changes -> resolve product_uuid for the full valid triple.
  // Reads size/stock via refs rather than as dependencies: stockUuid (and
  // sizeUuid) are ALSO in the upstream "stock changed"/"size changed"
  // effects' dep arrays, so a stock/size change re-runs THIS effect too, in
  // the same flush, before coatingUuid has actually been reset — using the
  // still-stale coatingUuid from the previous stock/coating and resolving
  // the wrong product. Triggering only on a genuine coatingUuid change (its
  // reset to "" is filtered out by the guard below) avoids that race.
  useEffect(() => {
    const sUuid = sizeUuidRef.current
    const stUuid = stockUuidRef.current
    if (!sUuid || !stUuid || !coatingUuid) return
    const myReq = ++reqIdRef.current
    fetchList({ size_uuid: sUuid, stock_uuid: stUuid, coating_uuid: coatingUuid }).then((data) => {
      if (reqIdRef.current !== myReq || !data) return
      const allowed = getAllowedProducts(data.products)
      if (allowed.length > 1) {
        setRawShapeProducts(allowed.map((p) => ({ uuid: p.product_uuid, description: p.product_description })))
        const seen = new Set<string>()
        const shapes: { uuid: string; shape: string }[] = []
        for (const p of allowed) {
          const shape = extractShape(p.product_description)
          if (seen.has(shape)) continue
          seen.add(shape)
          shapes.push({ uuid: p.product_uuid, shape })
        }
        setShapeList(shapes)
        setShapeUuid(shapes[0].uuid)
        // productUuid + spotUvSideList get resolved by the effect below,
        // keyed off shapeUuid — not set here, since the first sibling for a
        // shape isn't necessarily the right one once Spot UV Side also varies.
      } else {
        setShapeList([])
        setShapeUuid("")
        setRawShapeProducts([])
        setSpotUvSideList([])
        setSpotUvSideUuid("")
        setProductUuid(allowed[0]?.product_uuid || "")
      }
    })
  }, [coatingUuid, fetchList, getAllowedProducts])

  // Second axis: once a Shape is picked, find its siblings (same Shape,
  // different Spot UV Side) and expose them as their own switchable
  // dropdown, matching 4over.com's separate Shape / Spot UV Sides fields
  // instead of collapsing both into one. Resolves the final productUuid
  // from whichever (shape, side) pair is currently selected.
  useEffect(() => {
    if (!shapeUuid || rawShapeProducts.length === 0) return
    const currentShape = shapeList.find((s) => s.uuid === shapeUuid)?.shape
    if (!currentShape) return
    const siblings = rawShapeProducts.filter((p) => extractShape(p.description) === currentShape)
    const seen = new Set<string>()
    const sides: { uuid: string; side: string }[] = []
    for (const p of siblings) {
      const side = extractSpotUvSide(p.description)
      if (!side || seen.has(side)) continue
      seen.add(side)
      sides.push({ uuid: p.uuid, side })
    }
    if (sides.length > 1) {
      setSpotUvSideList(sides)
      setSpotUvSideUuid(sides[0].uuid)
      setProductUuid(sides[0].uuid)
    } else {
      setSpotUvSideList([])
      setSpotUvSideUuid("")
      setProductUuid(siblings[0]?.uuid || shapeUuid)
    }
  }, [shapeUuid, rawShapeProducts, shapeList])

  // When product_uuid resolved -> load valid combination matrix from baseprices
  useEffect(() => {
    if (!productUuid) return
    let active = true
    setLoadingOptions(true)
    fetch(`/api/4over/baseprices?product_uuid=${productUuid}&category=${encodeURIComponent(categorySlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const combos: Combination[] = data.combinations || []
        setCombinations(combos)
        if (combos.length > 0) {
          setColorspecUuid(combos[0].colorspec_uuid)
          setRunsizeUuid(combos[0].runsize_uuid)
          setTurnaroundUuid(combos[0].turnaround_uuid)
        } else {
          setColorspecUuid("")
          setRunsizeUuid("")
          setTurnaroundUuid("")
          // This product has no base prices (a 4over data quirk on some SKUs,
          // e.g. EDDM's first couple of sizes). Advance to the next untried
          // size so the customer lands on a working price instead of a dead
          // "Select options to see pricing". Decided here — where combos are
          // known for THIS product — to avoid skipping on stale state.
          const curSize = sizeUuidRef.current
          const sizes = sizeListRef.current
          if (!sizeVariantMode && sizes.length > 1) {
            triedSizesRef.current.add(curSize)
            const next = sizes.find((s) => !triedSizesRef.current.has(s.uuid))
            if (next && next.uuid !== curSize) {
              // Clear downstream selections in the SAME update batch as the size
              // change so the stock/coating effects' guards block them from
              // firing with the previous size's stock/coating (which would win
              // the reqId race and discard the new size's stock list).
              setStockUuid("")
              setCoatingUuid("")
              setProductUuid("")
              setSizeUuid(next.uuid)
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingOptions(false)
      })
    return () => {
      active = false
    }
  }, [productUuid, categorySlug, sizeVariantMode])

  // When product_uuid resolved -> load the product's full option groups and keep
  // the "extra" ones (Orientation, Grommets, H-Stakes, Flute, ...) as button rows.
  useEffect(() => {
    if (!productUuid) {
      setExtraGroups([])
      setSelectedExtras({})
      return
    }
    let active = true
    fetch(`/api/4over/product-options?product_uuid=${productUuid}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const groups: any[] = data.optionGroups || []
        const extras: ExtraGroup[] = groups
          .filter((g) => {
            const name = String(g.product_option_group_name || "").toLowerCase().trim()
            const opts = g.options || []
            return !HANDLED_GROUP_NAMES.has(name) && opts.length > 0
          })
          .map((g) => {
            // dedupe options by uuid
            const seen = new Set<string>()
            const options: OptionItem[] = []
            for (const o of g.options || []) {
              const uuid = o.option_uuid
              if (!uuid || seen.has(uuid)) continue
              seen.add(uuid)
              options.push({ option_uuid: uuid, option_name: o.option_name || o.option_description || "" })
            }
            return {
              group_uuid: g.product_option_group_uuid,
              group_name: g.product_option_group_name,
              options,
            }
          })
          .filter((g) => g.options.length > 0)

        setExtraGroups(extras)
        // Default each extra to its first option
        const defaults: Record<string, string> = {}
        for (const g of extras) {
          const hasPdfProof = /job.?sample|digital.?proof|pdf.?proof/i.test(g.group_name) ||
            g.options.some((o) => /job.?sample|digital.?proof|pdf.?proof/i.test(o.option_name))
          const preferredOpt =
            preferredExtraOption && new RegExp(preferredExtraOption.groupNameMatch, "i").test(g.group_name)
              ? g.options.find((o) => new RegExp(preferredExtraOption.optionNameMatch, "i").test(o.option_name))
              : undefined
          if (preferredOpt) {
            // Virtual fold-preset type card (Tri Fold/Z Fold/Specialty Folds
            // Brochures etc) — override this group's usual default with the
            // option matching this card's specific fold type.
            defaults[g.group_uuid] = preferredOpt.option_uuid
          } else if (hasPdfProof) {
            // Proof add-ons: always opt-in, never auto-selected (adds cost)
            defaults[g.group_uuid] = ""
          } else if (/mailing.?service|postage.?class/i.test(g.group_name)) {
            // Mailing/postage services add significant cost — excluded from print-only quotes
            defaults[g.group_uuid] = ""
          } else if (/folding.?option|fold.?type/i.test(g.group_name)) {
            // Prefer "FLAT - No Folding" over alphabetically-first fold type so flat
            // flyer pages don't default to "Accordion Fold".
            const flatOpt = g.options.find((o) => /\bflat\b/i.test(o.option_name))
            defaults[g.group_uuid] = flatOpt ? flatOpt.option_uuid : g.options[0].option_uuid
          } else {
            defaults[g.group_uuid] = g.options[0].option_uuid
          }
        }
        setSelectedExtras(defaults)
        setJobSamplesChecked(false)
        setDigitalProofsChecked(false)
      })
      .catch(() => {
        if (active) {
          setExtraGroups([])
          setSelectedExtras({})
        }
      })
    return () => {
      active = false
    }
  }, [productUuid])

  // Derive dependent dropdown options from the valid-combination matrix.
  const colorspecOptions = useMemo<OptionItem[]>(() => {
    const seen = new Set<string>()
    const out: OptionItem[] = []
    for (const c of combinations) {
      if (!seen.has(c.colorspec_uuid)) {
        seen.add(c.colorspec_uuid)
        out.push({ option_uuid: c.colorspec_uuid, option_name: c.colorspec })
      }
    }
    return out
  }, [combinations])

  const runsizeOptions = useMemo<OptionItem[]>(() => {
    const seen = new Set<string>()
    const out: OptionItem[] = []
    for (const c of combinations) {
      if (c.colorspec_uuid !== colorspecUuid) continue
      if (!seen.has(c.runsize_uuid)) {
        seen.add(c.runsize_uuid)
        out.push({ option_uuid: c.runsize_uuid, option_name: c.runsize })
      }
    }
    return out.sort((a, b) => Number(a.option_name) - Number(b.option_name))
  }, [combinations, colorspecUuid])

  const turnaroundOptions = useMemo<OptionItem[]>(() => {
    const seen = new Set<string>()
    const out: OptionItem[] = []
    for (const c of combinations) {
      if (c.colorspec_uuid !== colorspecUuid || c.runsize_uuid !== runsizeUuid) continue
      if (!seen.has(c.turnaround_uuid)) {
        seen.add(c.turnaround_uuid)
        out.push({ option_uuid: c.turnaround_uuid, option_name: c.turnaround })
      }
    }
    return out
  }, [combinations, colorspecUuid, runsizeUuid])

  // Keep runsize valid when colorspec changes
  useEffect(() => {
    if (runsizeOptions.length === 0) return
    if (!runsizeOptions.some((o) => o.option_uuid === runsizeUuid)) {
      setRunsizeUuid(runsizeOptions[0].option_uuid)
    }
  }, [runsizeOptions, runsizeUuid])

  // Keep turnaround valid when colorspec/runsize changes
  useEffect(() => {
    if (turnaroundOptions.length === 0) return
    if (!turnaroundOptions.some((o) => o.option_uuid === turnaroundUuid)) {
      setTurnaroundUuid(turnaroundOptions[0].option_uuid)
    }
  }, [turnaroundOptions, turnaroundUuid])

  // Live price = quote with the selected colorspec/runsize/turnaround + all extra
  // option_uuids (Grommets, H-Stakes, ...). Falls back to the matrix base price.
  const extraUuids = useMemo(
    () => Object.values(selectedExtras).filter(Boolean),
    [selectedExtras],
  )

  useEffect(() => {
    if (!productUuid || !colorspecUuid || !runsizeUuid || !turnaroundUuid) {
      setPrice(null)
      return
    }
    const baseMatch = combinations.find(
      (c) =>
        c.colorspec_uuid === colorspecUuid &&
        c.runsize_uuid === runsizeUuid &&
        c.turnaround_uuid === turnaroundUuid,
    )
    // Immediate placeholder from the matrix while the live quote loads.
    if (baseMatch && baseMatch.price > 0) setPrice(baseMatch.price)

    let active = true
    setLoadingPrice(true)
    setPriceNote(null)
    const qs = new URLSearchParams({
      product_uuid: productUuid,
      colorspec_uuid: colorspecUuid,
      runsize_uuid: runsizeUuid,
      turnaround_uuid: turnaroundUuid,
      category: categorySlug,
    })
    for (const uuid of extraUuids) qs.append("options", uuid)

    fetch(`/api/4over/quote?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        if (data.success && data.price != null) {
          setPrice(data.price)
          setPriceNote(null)
        } else if (baseMatch && baseMatch.price > 0) {
          setPrice(baseMatch.price)
        } else {
          setPrice(null)
          setPriceNote("This combination is not available. Try different options.")
        }
      })
      .catch(() => {
        if (active && !(baseMatch && baseMatch.price > 0)) {
          setPrice(null)
          setPriceNote("Unable to load pricing")
        }
      })
      .finally(() => {
        if (active) setLoadingPrice(false)
      })
    return () => {
      active = false
    }
  }, [productUuid, colorspecUuid, runsizeUuid, turnaroundUuid, extraUuids, combinations, categorySlug])

  // Estimate shipping from 4over for the current selection + a destination ZIP.
  const calculateShipping = useCallback(async () => {
    if (!productUuid || !colorspecUuid || !runsizeUuid || !turnaroundUuid || !shipZip) return
    setShipLoading(true)
    setShipError(null)
    setShipOptions([])
    try {
      const res = await fetch("/api/4over/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_info: {
            product_uuid: productUuid,
            runsize_uuid: runsizeUuid,
            turnaround_uuid: turnaroundUuid,
            colorspec_uuid: colorspecUuid,
            option_uuids: Object.values(selectedExtras).filter(Boolean),
            sets: 1,
          },
          shipping_address: { address: "N/A", city: "N/A", state: "", country: "US", zipcode: shipZip },
          bypass_address_validation: true,
        }),
      })
      const data = await res.json()
      if (data.success && data.options?.length) {
        setShipOptions(data.options)
      } else {
        setShipError("No shipping options for this ZIP code.")
      }
    } catch {
      setShipError("Unable to calculate shipping.")
    } finally {
      setShipLoading(false)
    }
  }, [productUuid, colorspecUuid, runsizeUuid, turnaroundUuid, shipZip, selectedExtras])

  // Shared by "Add to Cart" and "Buy Now" — builds the localStorage
  // "print_cart" item the /cart page reads, returns null if nothing's
  // resolved yet (Add to Cart and Buy Now are both disabled in that case).
  const buildCartItem = useCallback(() => {
    if (!productUuid || price == null) return null
    const sizeName = sizeList.find((s) => s.uuid === sizeUuid)?.name
    const colorspecName = colorspecOptions.find((o) => o.option_uuid === colorspecUuid)?.option_name
    const runsizeName = runsizeOptions.find((o) => o.option_uuid === runsizeUuid)?.option_name
    const turnaroundName = turnaroundOptions.find((o) => o.option_uuid === turnaroundUuid)?.option_name
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
      projectName: projectName || undefined,
      jobSamples: jobSamplesChecked || undefined,
      designFile: uploadedFile
        ? { fileName: uploadedFile.fileName, url: uploadedFile.url, contentType: uploadedFile.contentType }
        : undefined,
    }
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
    jobSamplesChecked,
  ])

  // Both Add to Cart and Buy Now require a logged-in account before
  // touching the cart at all — sends the customer to login/register with
  // a `next` back to this exact product+selection so they land right back
  // here (cart write still hasn't happened yet) once they're signed in.
  const requireAuth = useCallback(async () => {
    const { data } = await createClient().auth.getUser()
    if (data.user) return true
    router.push(`/account/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    return false
  }, [router])

  // Add the current configuration to the print cart and stay on the page —
  // for customers who want to keep configuring other products before
  // checking out.
  const addToCart = useCallback(async () => {
    const item = buildCartItem()
    if (!item) return
    if (!(await requireAuth())) return
    try {
      const existing = JSON.parse(localStorage.getItem("print_cart") || "[]")
      existing.push(item)
      localStorage.setItem("print_cart", JSON.stringify(existing))
      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    } catch {
      // ignore storage errors
    }
  }, [buildCartItem, requireAuth])

  // Same cart write as Add to Cart, but skips straight to the Shipping step
  // instead of staying on the product page — for the common "just this one
  // thing" order, matching printfast.ca's "Buy now" shortcut.
  const buyNow = useCallback(async () => {
    const item = buildCartItem()
    if (!item) return
    if (!(await requireAuth())) return
    try {
      const existing = JSON.parse(localStorage.getItem("print_cart") || "[]")
      existing.push(item)
      localStorage.setItem("print_cart", JSON.stringify(existing))
    } catch {
      // ignore storage errors
    }
    router.push("/checkout/shipping")
  }, [buildCartItem, requireAuth, router])

  // Extra groups to actually display: apply the allow-list and de-duplicate by
  // name (the productsfeed can repeat a group like "Foil Color"). Hidden/dup
  // groups still keep their default selection in selectedExtras for pricing.
  const visibleExtraGroups = useMemo(() => {
    const seen = new Set<string>()
    return extraGroups.filter((g) => {
      const name = g.group_name.toLowerCase().trim()
      if (hiddenSet && hiddenSet.has(name)) return false
      // The dedicated Shape dropdown below replaces this group's normally-
      // fixed single value once there's more than one shape to pick from —
      // also covers Notepads' "Sheets Per Pad" group, T-Shirts' "Product
      // Color" group, and Buttons' "Button Shape Options"/"Button Backing
      // Options" groups, which extractShape() repurposes for the exact same
      // Round-Corner-style ambiguity.
      const shapeLikeGroups = ["shape", "sheets per pad", "product color", "button shape options", "button backing options", "handle options"]
      if (shapeLikeGroups.includes(name) && shapeList.length > 1) return false
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [extraGroups, hiddenSet, shapeList])

  // BC: group for "Radius of Corners" — shown conditionally based on Shape
  const radiusGroup = useMemo(
    () => isBusinessCards ? extraGroups.find((g) => /radius.*corner/i.test(g.group_name)) : undefined,
    [extraGroups, isBusinessCards],
  )

  // BC + AI: "Job Samples" extra group — rendered as a checkbox, not a dropdown
  const jobSamplesGroup = useMemo(
    () => (isBusinessCards || isAllInclusive) ? extraGroups.find((g) => /job.?sample/i.test(g.group_name)) : undefined,
    [extraGroups, isBusinessCards, isAllInclusive],
  )

  // AI: "Digital Proofs" extra group — rendered as a checkbox
  const digitalProofsGroup = useMemo(
    () => isAllInclusive ? extraGroups.find((g) => /digital.?proof|pdf.?proof/i.test(g.group_name)) : undefined,
    [extraGroups, isAllInclusive],
  )

  // Keep selectedExtras in sync with the Job Samples checkbox so the live
  // quote API receives (or excludes) the Job Samples option UUID automatically.
  useEffect(() => {
    if ((!isBusinessCards && !isAllInclusive) || !jobSamplesGroup) return
    setSelectedExtras((prev) => ({
      ...prev,
      [jobSamplesGroup.group_uuid]: jobSamplesChecked
        ? jobSamplesGroup.options[0]?.option_uuid || ""
        : "",
    }))
  }, [jobSamplesChecked, jobSamplesGroup, isBusinessCards, isAllInclusive])

  // AI: keep selectedExtras in sync with the Digital Proofs checkbox
  useEffect(() => {
    if (!isAllInclusive || !digitalProofsGroup) return
    setSelectedExtras((prev) => ({
      ...prev,
      [digitalProofsGroup.group_uuid]: digitalProofsChecked
        ? digitalProofsGroup.options[0]?.option_uuid || ""
        : "",
    }))
  }, [digitalProofsChecked, digitalProofsGroup, isAllInclusive])

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
      if (hiddenSet && hiddenSet.has(name)) return false
      if (BC_SEPARATE_EXTRA_NAMES.test(g.group_name)) return false
      const shapeLikeGroups = ["shape", "sheets per pad", "product color", "button shape options", "button backing options", "handle options"]
      // >0, not >1: the dedicated Shape row below always renders as a real
      // dropdown once shapeList is non-empty (forceDropdown=true), even
      // with just 1 entry (e.g. Silk at a Square-only combo) — so the raw
      // extra-options group with the same name is redundant either way,
      // not just when there's more than one to switch between.
      if (shapeLikeGroups.includes(name) && shapeList.length > 0) return false
      // Silk/Suede/etc: the dedicated Spot UV Sides dropdown (built from
      // spotUvSideList, rendered right after Shape/Radius) replaces this
      // group once it's active — this "Spot UV Sides" extra-options group
      // is otherwise just a static single value belonging to whichever
      // sibling happens to be resolved, not an actual switcher.
      if (name === "spot uv sides" && spotUvSideList.length > 0) return false
      // Raised Spot UV Business Cards specifically: Shape now carries the
      // real Front/Both-Sides switch (see extractShapeCore()), so THIS
      // group is redundant — but ONLY when Shape is genuinely playing that
      // role. Deliberately NOT a blanket "raised spot uv side" name check:
      // Dual Raised Business Cards has its OWN separate "Raised Spot UV
      // Side" group (confirmed present on 4over.com's real calculator too,
      // alongside "Raised Foil Side") that describes something Shape
      // DOESN'T cover there (Shape instead switches between "Two Raised
      // Foils"/"Raised Spot UV + Foil") — hiding it unconditionally for
      // every category with this group name was a regression caught during
      // this same fix's own verification.
      if (name === "raised spot uv side" && shapeList.some((s) => /^raised spot uv (front|both sides)$/i.test(s.shape))) return false
      if (g.options.length === 0) return false
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [isBusinessCards, extraGroups, shapeList, spotUvSideList, hiddenSet])

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

  // AI: extra groups excluding separately-rendered (Job Samples, Digital Proofs)
  const aiVisibleExtras = useMemo(() => {
    if (!isAllInclusive) return []
    return visibleExtraGroups.filter((g) => !AI_SEPARATE_EXTRA_NAMES.test(g.group_name))
  }, [isAllInclusive, visibleExtraGroups])

  // ---- renderers ----
  const renderListRow = (
    label: string,
    items: ListItem[],
    value: string,
    onChange: (v: string) => void,
    forceDropdown = false,
  ) => {
    if (items.length === 0) return null
    if (items.length === 1 && !forceDropdown) {
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

  // Button-style chooser (matches the reference storefront for choice options).
  const renderButtonRow = (
    label: string,
    items: OptionItem[],
    value: string,
    onChange: (v: string) => void,
  ) => {
    if (items.length === 0) return null
    if (items.length === 1) {
      return (
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <label className="text-sm font-medium text-slate-700">{label}</label>
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 min-w-[220px] text-center">
            {items[0].option_name || items[0].option_description}
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-start justify-between py-3 border-b border-slate-100 gap-4">
        <label className="text-sm font-medium text-slate-700 pt-1">{label}</label>
        <div className="flex flex-wrap gap-2 justify-end max-w-[300px]">
          {items.map((opt) => {
            const active = opt.option_uuid === value
            return (
              <button
                key={opt.option_uuid}
                type="button"
                onClick={() => onChange(opt.option_uuid)}
                className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                  active
                    ? "border-[#e07b39] bg-[#e07b39] text-white"
                    : "border-slate-300 text-slate-700 hover:border-[#e07b39]"
                }`}
              >
                {opt.option_name || opt.option_description}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Price Calculator</h2>
        <button className="text-[#e07b39] hover:text-[#c9692a] text-sm flex items-center gap-1">
          <Share2 className="h-4 w-4" />
          Share Product
        </button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-0">
          {loadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {isBusinessCards ? (
                <>
                  {/* ── BC FIELD ORDER (matches 4over) ── */}

                  {/* PROJECT NAME / P.O. */}
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

                  {/* SIZE */}
                  {renderListRow("Size", cleanBCSizeList(sizeList), sizeUuid, setSizeUuid, true)}

                  {/* SHAPE — shown before Stock for BC (same data as non-BC shapeList) */}
                  {renderListRow(
                    shapeList.some((s) => /^raised spot uv (front|both sides)$/i.test(s.shape))
                      ? "Raised Spot UV Side"
                      : shapeList.some((s) => /raised\s*(foil|spot)/i.test(s.shape))
                        ? "Foil / Spot UV"
                        : "Shape",
                    shapeList.map((s) => ({ name: s.shape, uuid: s.uuid })),
                    shapeUuid,
                    (uuid) => setShapeUuid(uuid),
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

                  {/* SPOT UV SIDES — second axis alongside Shape (Silk/Suede/etc.),
                      matches 4over.com's own separate Front/Back/Both Sides dropdown. */}
                  {spotUvSideList.length > 0 && renderListRow(
                    "Spot UV Sides",
                    spotUvSideList.map((s) => ({ name: s.side, uuid: s.uuid })),
                    spotUvSideUuid,
                    (uuid) => { setSpotUvSideUuid(uuid); setProductUuid(uuid) },
                    true,
                  )}

                  {/* STOCK */}
                  {renderListRow("Stock", translateList(stockList, translateStockName), stockUuid, setStockUuid, true)}

                  {loadingOptions && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  )}

                  {/* COLORSPEC */}
                  {renderListRow(
                    "Colorspec",
                    colorspecOptions.map((o) => ({ name: translateColorspecName(o.option_name), uuid: o.option_uuid })),
                    colorspecUuid,
                    setColorspecUuid,
                    true,
                  )}

                  {/* COATING */}
                  {renderListRow("Coating", translateList(coatingList, translateCoatingName), coatingUuid, setCoatingUuid, true)}

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

                  {/* JOB SAMPLES checkbox — BC only, opt-in, +$9.99 via quote API */}
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
                </>
              ) : isAllInclusive ? (
                <>
                  {/* ── ALL-INCLUSIVE FIELD ORDER (matches 4over) ── */}

                  {/* PROJECT NAME / P.O. */}
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

                  {/* SIZE */}
                  {renderListRow("Size", sizeList, sizeUuid, setSizeUuid)}

                  {/* STOCK */}
                  {renderListRow("Stock", translateList(stockList, translateStockName), stockUuid, setStockUuid)}

                  {/* COLORSPEC */}
                  {renderListRow(
                    "Colorspec",
                    colorspecOptions.map((o) => ({ name: translateColorspecName(o.option_name), uuid: o.option_uuid })),
                    colorspecUuid,
                    setColorspecUuid,
                  )}

                  {/* COATING */}
                  {renderListRow("Coating", translateList(coatingList, translateCoatingName), coatingUuid, setCoatingUuid)}

                  {loadingOptions && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  )}

                  {/* EXTRA GROUPS (Folding Options etc. — Product Orientation + Print Method hidden via hiddenGroups) */}
                  {aiVisibleExtras.map((g) => (
                    <Fragment key={g.group_uuid}>
                      {renderListRow(
                        g.group_name,
                        g.options.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
                        selectedExtras[g.group_uuid] || "",
                        (v) => setSelectedExtras((prev) => ({ ...prev, [g.group_uuid]: v })),
                      )}
                    </Fragment>
                  ))}

                  {/* JOB SAMPLES checkbox */}
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

                  {/* DIGITAL PROOFS checkbox */}
                  {digitalProofsGroup && (
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <label className="text-sm font-medium text-slate-700">Digital Proofs</label>
                      <label className="flex items-center gap-2 cursor-pointer min-w-[220px]">
                        <input
                          type="checkbox"
                          checked={digitalProofsChecked}
                          onChange={(e) => setDigitalProofsChecked(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[#e07b39] focus:ring-[#e07b39]"
                        />
                        <span className="text-sm text-slate-600">
                          PDF Proofs (per set){" "}
                          <span className="font-medium text-slate-800">+$5.00</span>
                        </span>
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* ── NON-BC FIELD ORDER ── */}

                  {/* PROJECT NAME / P.O. */}
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

                  {/* SIZE — or WIDTH + HEIGHT for banners */}
                  {isBanner ? (
                    <>
                      {renderListRow("Width", bannerWidthItems, bannerWidth, setBannerWidth, true)}
                      {renderListRow("Height", bannerHeightItems, bannerHeight, setBannerHeight, true)}
                      {bannerWidth && bannerHeight && (
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                          <label className="text-sm font-medium text-slate-700">Your Dimensions</label>
                          <span className="text-sm text-slate-600 min-w-[220px] text-center">
                            {bannerWidth} × {bannerHeight}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    renderListRow("Size", sizeList, sizeUuid, setSizeUuid)
                  )}

                  {/* STOCK */}
                  {renderListRow("Stock", translateList(stockList, translateStockName), stockUuid, setStockUuid)}

                  {/* COATING */}
                  {(!hiddenSet || !hiddenSet.has("coating")) &&
                    renderListRow("Coating", translateList(coatingList, translateCoatingName), coatingUuid, setCoatingUuid)}

                  {/* SHAPE (Rectangle/Round Corner/Oval/...) — only shown when the
                      resolved Size+Stock+Coating still matches more than one
                      product_uuid; selecting a value sets productUuid directly,
                      bypassing baseprices/quote re-resolution since these are
                      already known sibling uuids. */}
                  {renderListRow(
                    /^\d+\s*Sheets$/.test(shapeList[0]?.shape || "")
                      ? "Sheets Per Pad"
                      : /^(black|blue|gray|grey|red|white)$/i.test(shapeList[0]?.shape || "")
                        ? "Color"
                        : shapeList.some((s) => /akuafoil/i.test(s.shape))
                          ? "Material"
                          : /handle/i.test(shapeList[0]?.shape || "")
                            ? "Handle Options"
                            : "Shape",
                    shapeList.map((s) => ({ name: s.shape, uuid: s.uuid })),
                    shapeUuid,
                    (uuid) => {
                      setShapeUuid(uuid)
                      setProductUuid(uuid)
                    },
                  )}

                  {loadingOptions && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  )}

                  {/* COLORSPEC */}
                  {renderListRow(
                    "Colorspec",
                    colorspecOptions.map((o) => ({ name: translateColorspecName(o.option_name), uuid: o.option_uuid })),
                    colorspecUuid,
                    setColorspecUuid,
                  )}

                  {/* EXTRA OPTION GROUPS (Orientation, Grommets, Lamination, Foil Color, ...) */}
                  {/* Hidden/duplicate groups still use their default option in the live quote. */}
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
                turnaroundOptions.map((o) => ({ name: translateTurnaroundName(o.option_name), uuid: o.option_uuid })),
                turnaroundUuid,
                setTurnaroundUuid,
              )}

              {/* PRICE */}
              <div className="pt-4 flex items-center justify-end">
                {loadingPrice ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : price !== null ? (
                  <span className="text-2xl font-bold">
                    <span className="text-sm font-normal text-slate-500 mr-1">Total:</span>
                    <span className="text-[#078c7a]">${price.toFixed(2)}</span>
                  </span>
                ) : (
                  <p className="text-sm text-slate-400">{priceNote || "Select options to see pricing"}</p>
                )}
              </div>

              {/* BUY NOW / ADD TO CART */}
              <div className="pt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={buyNow}
                  disabled={price == null}
                  className="flex items-center justify-center gap-2 bg-[#e42a27] hover:bg-[#c42020] disabled:opacity-50 text-white rounded px-4 py-3 text-sm font-semibold transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Buy Now
                </button>
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={price == null}
                  className="flex items-center justify-center gap-2 bg-[#2c327a] hover:bg-[#1a1f4e] disabled:opacity-50 text-white rounded px-4 py-3 text-sm font-semibold transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>
              </div>
              {added && (
                <p className="text-center text-sm text-green-600 mt-2">
                  Added to cart!{" "}
                  <Link href="/cart" className="underline font-medium">
                    View Cart
                  </Link>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Shipping Cost Estimation */}
      <Card className="border-slate-200 mt-4">
        <button
          type="button"
          onClick={() => setShipOpen((o) => !o)}
          className="w-full p-4 flex items-center justify-between"
        >
          <span className="text-sm font-medium text-slate-700">Shipping Cost Estimation</span>
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${shipOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {shipOpen && (
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex gap-2">
              <input
                value={shipZip}
                onChange={(e) => setShipZip(e.target.value)}
                placeholder="Enter ZIP code"
                className="flex-1 h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#e07b39]"
              />
              <button
                type="button"
                onClick={calculateShipping}
                disabled={shipLoading || !shipZip || !productUuid}
                className="flex items-center justify-center bg-[#e07b39] hover:bg-[#c9692a] disabled:opacity-50 text-white rounded px-4 text-sm font-medium min-w-[90px]"
              >
                {shipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calculate"}
              </button>
            </div>
            {shipError && <p className="text-xs text-red-500 mt-2">{shipError}</p>}
            {shipOptions.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {shipOptions.map((o) => (
                  <div
                    key={o.code}
                    className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5 last:border-0"
                  >
                    <span className="text-slate-600">
                      {o.service}
                      {o.estimatedDays ? ` (${o.estimatedDays} day${o.estimatedDays > 1 ? "s" : ""})` : ""}
                    </span>
                    <span className="font-medium text-slate-900">${o.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* What would you like to do? */}
      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-900 mb-3">What would you like to do?</h3>
        <div className="space-y-3">
          <Link
            href={`/design-studio${productUuid ? `?product=${productUuid}` : ""}`}
            className="flex items-center gap-4 border border-slate-200 rounded-lg p-4 hover:border-[#e07b39] hover:shadow-sm transition-all"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e07b39]/10 text-[#e07b39] shrink-0">
              <Palette className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium text-slate-900">Custom Design</span>
              <span className="block text-xs text-slate-500">Design online in our Design Studio</span>
            </span>
          </Link>
          <button
            type="button"
            className="w-full flex items-center gap-4 border border-slate-200 rounded-lg p-4 hover:border-[#e07b39] hover:shadow-sm transition-all text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e07b39]/10 text-[#e07b39] shrink-0">
              <LayoutTemplate className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium text-slate-900">Browse Design</span>
              <span className="block text-xs text-slate-500">Choose from our template collection</span>
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.ai,.eps,.indd,.jpg,.jpeg,.png,.tif,.tiff"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center gap-4 border border-slate-200 rounded-lg p-4 hover:border-[#e07b39] hover:shadow-sm transition-all text-left disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e07b39]/10 text-[#e07b39] shrink-0 overflow-hidden">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPreviewableImage ? (
                <img src={uploadedFile!.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </span>
            <span>
              <span className="block font-medium text-slate-900">
                {uploading ? "Uploading..." : uploadedFile ? "Replace Design File" : "Upload Design"}
              </span>
              <span className="block text-xs text-slate-500">
                {uploadedFile ? uploadedFile.fileName : "Upload your print-ready artwork"}
              </span>
            </span>
          </button>
          {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
          {uploadedFile && !uploading && (
            <div className="border border-slate-200 rounded-lg p-3">
              {isPreviewableImage ? (
                <img
                  src={uploadedFile.url}
                  alt={uploadedFile.fileName}
                  className="w-full max-h-64 object-contain rounded bg-slate-50"
                />
              ) : (
                <div className="flex items-center gap-3 bg-slate-50 rounded p-3">
                  <FileText className="h-8 w-8 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-600 truncate">{uploadedFile.fileName}</span>
                </div>
              )}
              <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                <Upload className="h-3.5 w-3.5" />
                File ready — it will be attached when you Add to Cart or Buy Now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
