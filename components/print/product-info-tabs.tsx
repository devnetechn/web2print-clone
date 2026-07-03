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

// Option group names handled explicitly in the specs render (or irrelevant display-only
// groups) — excluded from the generic extraGroups list so we don't show them twice
const CASCADE_HANDLED = new Set([
  "size", "stock", "coating", "shape", "runsize", "sheets per pad",
  "product color", "button shape options", "button backing options",
  "product type", "product category",
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
    if (tab === "specs" && (specsState.status === "idle" || specsState.status === "error")) {
      loadSpecs()
    }
  }

  const loadSpecs = async () => {
    setSpecsState({ status: "loading" })
    try {
      const r1 = await fetch(
        `/api/4over/categoryproductslist?category_uuid=${encodeURIComponent(categoryUuid)}`
      )
      if (!r1.ok) throw new Error("categoryproductslist failed")
      const d1 = await r1.json()
      if (!d1.success) throw new Error("cascade failed")

      const firstProductUuid: string | null = d1.data?.products?.[0]?.product_uuid ?? null

      if (!firstProductUuid) {
        setSpecsState({ status: "done", sizes: [], stocks: [], coatings: [], colorspecs: [], turnaround: [], extraGroups: [] })
        return
      }

      const r2 = await fetch(
        `/api/4over/product-options?product_uuid=${encodeURIComponent(firstProductUuid)}`
      )
      if (!r2.ok) throw new Error("product-options failed")
      const d2 = await r2.json()

      let sizes: string[] = []
      let stocks: string[] = []
      let coatings: string[] = []
      let colorspecs: string[] = []
      let turnaround: string[] = []
      const extraGroups: SpecGroup[] = []

      for (const g of (d2.optionGroups ?? []) as any[]) {
        const nameRaw: string = g.product_option_group_name ?? ""
        const nameNorm = nameRaw.toLowerCase().trim()
        // Normalize "Turn-Around" / "Turn Around" → "turnaround"
        const nameKey = nameNorm.replace(/[-\s]+/g, "")
        const opts: any[] = g.options ?? []

        if (nameNorm === "size") {
          const raw = opts.map(o => (o.option_name ?? "").trim()).filter(Boolean)
          sizes = isBusinessCards
            ? [...new Map(raw.map(s => [cleanBCSize(s).toLowerCase(), cleanBCSize(s)])).values()]
            : raw
        } else if (nameNorm === "stock") {
          stocks = opts.map(o => (o.option_name ?? "").trim()).filter(Boolean)
        } else if (nameNorm === "coating") {
          coatings = opts.map(o => (o.option_name ?? "").trim()).filter(Boolean)
        } else if (nameNorm === "colorspec") {
          colorspecs = opts.map(o => (o.option_name ?? "").trim()).filter(Boolean)
        } else if (nameKey === "turnaround") {
          // option_name is a raw numeric ID; option_description is the human label
          const seen = new Set<string>()
          turnaround = opts
            .map(o => ((o.option_description ?? o.option_name ?? "").trim()))
            .filter(v => { if (!v || seen.has(v)) return false; seen.add(v); return true })
        } else if (!CASCADE_HANDLED.has(nameNorm) && opts.length > 0) {
          extraGroups.push({
            name: nameRaw,
            options: opts.map(o => (o.option_name ?? "").trim()).filter(Boolean),
          })
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
                  aria-expanded={openTemplates.has(i)}
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
                  aria-expanded={openFaqs.has(i)}
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
