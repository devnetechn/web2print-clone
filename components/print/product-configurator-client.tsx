"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Fragment, type ChangeEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Share2, Palette, Upload, LayoutTemplate, ShoppingCart, Zap, FileText } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { uploadDesignFile } from "@/app/actions/design-upload"

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
  isBusinessCards?: boolean
}

function dedupeList(items: ListItem[]): ListItem[] {
  const seen = new Set<string>()
  return items.filter((i) => {
    if (!i?.uuid || seen.has(i.uuid)) return false
    seen.add(i.uuid)
    return true
  })
}

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

// Business Cards (and similar) sell Round Corner/Oval as separate
// product_uuids at the same Size+Stock+Coating, distinguished only by this
// wording in the description — used to label the Shape dropdown options.
function extractShape(desc: string): string {
  // Notepads' "25 Sheet"/"50 Sheet Notepad..." pair resolves to 2 distinct
  // product_uuids at the same Size+Stock+Coating, the exact same ambiguity
  // pattern as Round Corner/Oval/Fold Over — just a sheet count instead of
  // a shape. Checked first since it's mutually exclusive with the others.
  const sheetMatch = desc.match(/\b(\d+)\s*sheets?\b/i)
  if (sheetMatch) return `${sheetMatch[1]} Sheets`
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
  // T-Shirts' garment types (e.g. "Men Short Sleeve Tee") resolve to 2-5
  // distinct product_uuids at the same Size+Stock+Coating, distinguished
  // only by a color word right before "with"/"w/" Print Area — the exact
  // same ambiguity pattern, just Color instead of Shape.
  const colorMatch = desc.match(/\b(black|blue|gray|grey|red|white)\b\s*(?=w\/|with)/i)
  if (colorMatch) return colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1).toLowerCase()
  return "Rectangle"
}

// Option groups handled by the dedicated size/colorspec/runsize/turnaround
// pricing axes (or that are display-only/internal) — excluded from the generic
// "extra options" rendering so we don't show them twice.
const HANDLED_GROUP_NAMES = new Set([
  "product type",
  "product category",
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
  isBusinessCards = false,
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isPreviewableImage = uploadedFile?.contentType.startsWith("image/") && uploadedFile.contentType !== "image/tiff"

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
      const sizes = dedupeList(data.size_list || [])
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
      const stocks = dedupeList(data.stock_list || [])
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
  }, [sizeUuid, fetchList, sizeVariantMode, resolveProduct, initialSizeUuid, initialStockUuid])

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

    fetchList({ size_uuid: sUuid, stock_uuid: stockUuid }).then((data) => {
      if (reqIdRef.current !== myReq || !data) return
      const coatings = dedupeList(data.coating_list || [])
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
  }, [stockUuid, fetchList, resolveProduct, initialSizeUuid, initialStockUuid, initialCoatingUuid])

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
        const shapes = allowed.map((p) => ({ uuid: p.product_uuid, shape: extractShape(p.product_description) }))
        setShapeList(shapes)
        setShapeUuid(shapes[0].uuid)
        setProductUuid(shapes[0].uuid)
      } else {
        setShapeList([])
        setShapeUuid("")
        setProductUuid(allowed[0]?.product_uuid || "")
      }
    })
  }, [coatingUuid, fetchList, getAllowedProducts])

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
        for (const g of extras) defaults[g.group_uuid] = g.options[0].option_uuid
        setSelectedExtras(defaults)
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
      const shapeLikeGroups = ["shape", "sheets per pad", "product color", "button shape options", "button backing options"]
      if (shapeLikeGroups.includes(name) && shapeList.length > 1) return false
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [extraGroups, hiddenSet, shapeList])

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
              {/* SIZE */}
              {renderListRow("Size", sizeList, sizeUuid, setSizeUuid)}

              {/* STOCK */}
              {renderListRow("Stock", stockList, stockUuid, setStockUuid)}

              {/* COATING */}
              {(!hiddenSet || !hiddenSet.has("coating")) &&
                renderListRow("Coating", coatingList, coatingUuid, setCoatingUuid)}

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

              {/* SIDES (colorspec) */}
              {renderListRow(
                "Sides",
                colorspecOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
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

              {/* QUANTITY (runsize) */}
              {renderListRow(
                "Quantity",
                runsizeOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
                runsizeUuid,
                setRunsizeUuid,
              )}

              {/* TURNAROUND TIME */}
              {renderListRow(
                "Turnaround Time",
                turnaroundOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
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
