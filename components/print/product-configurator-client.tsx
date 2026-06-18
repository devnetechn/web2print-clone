"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Share2, Palette, Upload, LayoutTemplate } from "lucide-react"
import Link from "next/link"

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
}

function dedupeList(items: ListItem[]): ListItem[] {
  const seen = new Set<string>()
  return items.filter((i) => {
    if (!i?.uuid || seen.has(i.uuid)) return false
    seen.add(i.uuid)
    return true
  })
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
}: ProductConfiguratorClientProps) {
  // Size / Stock / Coating lists from categoryproductslist
  const [sizeList, setSizeList] = useState<ListItem[]>([])
  const [stockList, setStockList] = useState<ListItem[]>([])
  const [coatingList, setCoatingList] = useState<ListItem[]>([])

  const [sizeUuid, setSizeUuid] = useState("")
  const [stockUuid, setStockUuid] = useState("")
  const [coatingUuid, setCoatingUuid] = useState("")

  const [productUuid, setProductUuid] = useState("")
  const [loadingList, setLoadingList] = useState(true)

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
      if (sizes.length > 0) setSizeUuid(sizes[0].uuid)
      setLoadingList(false)
    })
    return () => {
      active = false
    }
  }, [fetchList, categoryUuid])

  const resolveProduct = useCallback(
    (products: ProductOption[] | undefined) => {
      const list = products || []
      const allowed = list.filter(
        (p) => !allowedProductUuids || allowedProductUuids.includes(p.product_uuid),
      )
      return allowed[0]?.product_uuid || list[0]?.product_uuid || ""
    },
    [allowedProductUuids],
  )

  // When size changes -> reset downstream selections IMMEDIATELY, then load stocks.
  useEffect(() => {
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
      setStockUuid(stocks[0]?.uuid || "")
    })
  }, [sizeUuid, fetchList])

  // When stock changes -> reset coating/product IMMEDIATELY, then load coatings.
  useEffect(() => {
    if (!sizeUuid || !stockUuid) return
    const myReq = ++reqIdRef.current
    setCoatingList([])
    setCoatingUuid("")
    setProductUuid("")

    fetchList({ size_uuid: sizeUuid, stock_uuid: stockUuid }).then((data) => {
      if (reqIdRef.current !== myReq || !data) return
      const coatings = dedupeList(data.coating_list || [])
      setCoatingList(coatings)
      if (coatings.length > 0) {
        setCoatingUuid(coatings[0].uuid)
      } else {
        setProductUuid(resolveProduct(data.products))
      }
    })
  }, [sizeUuid, stockUuid, fetchList, resolveProduct])

  // When coating changes -> resolve product_uuid for the full valid triple
  useEffect(() => {
    if (!sizeUuid || !stockUuid || !coatingUuid) return
    const myReq = ++reqIdRef.current
    fetchList({ size_uuid: sizeUuid, stock_uuid: stockUuid, coating_uuid: coatingUuid }).then((data) => {
      if (reqIdRef.current !== myReq || !data) return
      setProductUuid(resolveProduct(data.products))
    })
  }, [sizeUuid, stockUuid, coatingUuid, fetchList, resolveProduct])

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
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingOptions(false)
      })
    return () => {
      active = false
    }
  }, [productUuid, categorySlug])

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

  // ---- renderers ----
  const renderListRow = (
    label: string,
    items: ListItem[],
    value: string,
    onChange: (v: string) => void,
  ) => {
    if (items.length === 0) return null
    if (items.length === 1) {
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
              {renderListRow("Coating", coatingList, coatingUuid, setCoatingUuid)}

              {loadingOptions && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}

              {/* SIDES (colorspec) */}
              {renderButtonRow("Sides", colorspecOptions, colorspecUuid, setColorspecUuid)}

              {/* EXTRA OPTION GROUPS (Orientation, Grommets, H-Stakes, Flute, ...) */}
              {extraGroups.map((g) =>
                renderButtonRow(
                  g.group_name,
                  g.options,
                  selectedExtras[g.group_uuid] || "",
                  (v) => setSelectedExtras((prev) => ({ ...prev, [g.group_uuid]: v })),
                ),
              )}

              {/* QUANTITY (runsize) */}
              {renderListRow(
                "Quantity",
                runsizeOptions.map((o) => ({ name: o.option_name, uuid: o.option_uuid })),
                runsizeUuid,
                setRunsizeUuid,
              )}

              {/* TURNAROUND TIME */}
              {renderButtonRow("Turnaround Time", turnaroundOptions, turnaroundUuid, setTurnaroundUuid)}

              {/* PRICE */}
              <div className="pt-4 flex items-center justify-end">
                {loadingPrice ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : price !== null ? (
                  <span className="text-2xl font-bold">
                    <span className="text-sm font-normal text-slate-500 mr-1">Total:</span>
                    <span className="text-[#e07b39]">${price.toFixed(2)}</span>
                  </span>
                ) : (
                  <p className="text-sm text-slate-400">{priceNote || "Select options to see pricing"}</p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 hover:border-[#e07b39] hover:text-[#e07b39] rounded px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <LayoutTemplate className="h-4 w-4" />
                  Browse Design
                </button>
                <Link
                  href={`/design-studio${productUuid ? `?product=${productUuid}` : ""}`}
                  className="flex items-center justify-center gap-2 bg-[#e07b39] hover:bg-[#c9692a] text-white rounded px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <Palette className="h-4 w-4" />
                  Custom Design
                </Link>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 hover:border-[#e07b39] hover:text-[#e07b39] rounded px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload Design
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Shipping Cost Estimation */}
      <Card className="border-slate-200 mt-4">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Shipping Cost Estimation</span>
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </CardContent>
      </Card>

      {/* Description / Templates tabs */}
      <div className="mt-6">
        <Tabs defaultValue="description">
          <TabsList className="w-full bg-transparent border-b border-slate-200 h-auto p-0 justify-start rounded-none">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#e07b39] data-[state=active]:text-[#e07b39] data-[state=active]:bg-transparent px-6 py-3"
            >
              Description
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#e07b39] data-[state=active]:text-[#e07b39] data-[state=active]:bg-transparent px-6 py-3"
            >
              Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="pt-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {productName} — high quality professional printing with premium materials.
            </p>
          </TabsContent>
          <TabsContent value="templates" className="pt-4">
            <p className="text-sm text-slate-500">Download templates for this product.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
