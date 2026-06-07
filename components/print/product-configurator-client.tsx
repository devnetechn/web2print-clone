"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Share2 } from "lucide-react"

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
  }, [fetchList])

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
  // Clearing stock/coating/product synchronously prevents the product-resolution
  // effect from firing with a stale (size+oldStock+oldCoating) combo -> 404.
  useEffect(() => {
    if (!sizeUuid) return
    const myReq = ++reqIdRef.current
    // Synchronous reset so no downstream effect runs with stale values
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
        // No coating choices for this size+stock -> products already resolve here
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
        // Default to the first valid combination
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

  // Derive dependent dropdown options from the valid-combination matrix.
  // Colorspec (Sides) is the top-level choice; Quantity is filtered by colorspec;
  // Turnaround is filtered by colorspec + runsize. This guarantees every
  // selectable combination is valid, so the price lookup never 409s.
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
    // Sort by numeric quantity when possible
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

  // Price comes directly from the matched combination in the matrix.
  // Fall back to a live quote only if the matrix has no price (rare).
  useEffect(() => {
    if (!productUuid || !colorspecUuid || !runsizeUuid || !turnaroundUuid) {
      setPrice(null)
      return
    }
    const match = combinations.find(
      (c) =>
        c.colorspec_uuid === colorspecUuid &&
        c.runsize_uuid === runsizeUuid &&
        c.turnaround_uuid === turnaroundUuid,
    )
    if (match && match.price > 0) {
      setPrice(match.price)
      setPriceNote(null)
      return
    }

    // Fallback: live quote
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
    fetch(`/api/4over/quote?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        if (data.success && data.price != null) {
          setPrice(data.price)
        } else {
          setPrice(null)
          setPriceNote("This combination is not available. Try different options.")
        }
      })
      .catch(() => {
        if (active) {
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
  }, [productUuid, colorspecUuid, runsizeUuid, turnaroundUuid, combinations, categorySlug])

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

  const renderOptionRow = (
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
      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="border-slate-200 min-w-[220px]">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {items.map((opt) => (
              <SelectItem key={opt.option_uuid} value={opt.option_uuid}>
                {opt.option_name || opt.option_description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              {renderOptionRow("Sides", colorspecOptions, colorspecUuid, setColorspecUuid)}

              {/* QUANTITY (runsize) */}
              {renderOptionRow("Quantity", runsizeOptions, runsizeUuid, setRunsizeUuid)}

              {/* TURNAROUND TIME */}
              {renderOptionRow("Turnaround Time", turnaroundOptions, turnaroundUuid, setTurnaroundUuid)}

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
