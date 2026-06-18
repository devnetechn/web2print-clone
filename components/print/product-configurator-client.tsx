"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Share2, Palette, Upload, LayoutTemplate, ShoppingCart } from "lucide-react"
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
  // optional: only show these option-group names in the UI (lowercased match).
  // Hidden groups still use their default option in the live price, so the
  // quote stays correct — this only trims what the customer sees/selects.
  allowedGroups?: string[]
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
  allowedGroups,
}: ProductConfiguratorClientProps) {
  // Lowercased allow-list of option-group names to display (null = show all).
  const allowedSet = useMemo(
    () => (allowedGroups ? new Set(allowedGroups.map((g) => g.toLowerCase().trim())) : null),
    [allowedGroups],
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

  // Add the current configuration to the print cart (localStorage "print_cart"),
  // matching the shape the /cart page reads.
  const addToCart = useCallback(() => {
    if (!productUuid || price == null) return
    const sizeName = sizeList.find((s) => s.uuid === sizeUuid)?.name
    const colorspecName = colorspecOptions.find((o) => o.option_uuid === colorspecUuid)?.option_name
    const runsizeName = runsizeOptions.find((o) => o.option_uuid === runsizeUuid)?.option_name
    const turnaroundName = turnaroundOptions.find((o) => o.option_uuid === turnaroundUuid)?.option_name
    const item = {
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
    }
    try {
      const existing = JSON.parse(localStorage.getItem("print_cart") || "[]")
      existing.push(item)
      localStorage.setItem("print_cart", JSON.stringify(existing))
      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    } catch {
      // ignore storage errors
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
  ])

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
              {(!allowedSet || allowedSet.has("coating")) &&
                renderListRow("Coating", coatingList, coatingUuid, setCoatingUuid)}

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

              {/* EXTRA OPTION GROUPS (Orientation, Grommets, H-Stakes, Flute, ...) */}
              {/* Hidden groups still use their default option in the live quote. */}
              {extraGroups
                .filter((g) => !allowedSet || allowedSet.has(g.group_name.toLowerCase().trim()))
                .map((g) => (
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

              {/* ADD TO CART */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={price == null}
                  className="w-full flex items-center justify-center gap-2 bg-[#2c327a] hover:bg-[#1a1f4e] disabled:opacity-50 text-white rounded px-4 py-3 text-sm font-semibold transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>
                {added && (
                  <p className="text-center text-sm text-green-600 mt-2">
                    Added to cart!{" "}
                    <Link href="/cart" className="underline font-medium">
                      View Cart
                    </Link>
                  </p>
                )}
              </div>
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
          <button
            type="button"
            className="w-full flex items-center gap-4 border border-slate-200 rounded-lg p-4 hover:border-[#e07b39] hover:shadow-sm transition-all text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e07b39]/10 text-[#e07b39] shrink-0">
              <Upload className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium text-slate-900">Upload Design</span>
              <span className="block text-xs text-slate-500">Upload your print-ready artwork</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
