"use client"

import { useMemo, useState } from "react"
import { Download, FileImage, FileText, ImageIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TemplateProduct, TemplateSize } from "@/lib/print/templates"

// Builds the routed, self-hosted download URL (mirrors 4over -> Vercel Blob on
// first hit, serves from Blob forever after). Mirrors the pattern already used
// by the standalone template browser.
function downloadHref(src: string, filename: string): string {
  return `/api/templates/download?src=${encodeURIComponent(src)}&filename=${encodeURIComponent(filename)}`
}

function safeName(product: string, size: string, variant: string, ext: string): string {
  const base = [product, size, variant]
    .filter(Boolean)
    .join("-")
    .replace(/["]/g, "in")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase()
  return `${base}.${ext}`
}

// Parses a trim size like `4.25" x 5.5"` into inch dimensions so we can show the
// print-ready size that INCLUDES the industry-standard 1/8" (0.125") bleed on
// every edge. Returns null for non-inch/irregular sizes (e.g. banners in feet).
function parseInches(size: string): { w: number; h: number } | null {
  const m = size.match(/([\d.]+)\s*"?\s*[x×]\s*([\d.]+)\s*"?/i)
  if (!m) return null
  const w = Number.parseFloat(m[1])
  const h = Number.parseFloat(m[2])
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null
  return { w, h }
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
}

export function ProductTemplatesPanel({ product }: { product: TemplateProduct | null }) {
  const sizes = product?.sizes ?? []
  const [sizeIdx, setSizeIdx] = useState(0)
  const selected: TemplateSize | undefined = sizes[sizeIdx]

  const dims = useMemo(() => (selected ? parseInches(selected.size) : null), [selected])

  if (!product || !sizes.length) {
    return <p className="text-sm text-slate-500">Design templates for this product are coming soon.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Ready to create your design?</h3>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
          Pick your size, preview the layout, then download a print-ready template to design in your
          favorite software. Every template is built to spec with the correct bleed and trim marks.
        </p>
      </div>

      {/* Size selector */}
      <div className="max-w-xs">
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Size</label>
        <Select value={String(sizeIdx)} onValueChange={(v) => setSizeIdx(Number(v))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map((s, i) => (
              <SelectItem key={i} value={String(i)}>
                {s.size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview: cut size + bleed */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="mx-auto flex aspect-[4/3] max-w-sm items-center justify-center rounded border-2 border-dashed border-slate-300 bg-white">
          <div className="text-center text-sm text-slate-600">
            <ImageIcon className="mx-auto mb-2 h-6 w-6 text-slate-400" aria-hidden="true" />
            <p className="font-medium text-slate-800">{selected?.size}</p>
            {dims ? (
              <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                <p>Final Cut Size: {fmt(dims.w)}&quot; x {fmt(dims.h)}&quot;</p>
                <p>
                  With Bleed: {fmt(dims.w + 0.25)}&quot; x {fmt(dims.h + 0.25)}&quot;
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Print-ready with 1/8&quot; bleed</p>
            )}
          </div>
        </div>
      </div>

      {/* Download rows — one per variant, EPS + JPG */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Download Template
        </h4>
        <div className="divide-y overflow-hidden rounded-lg border">
          {selected?.variants.map((v, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium text-slate-800">
                {v.variant || selected.size}
              </span>
              <div className="flex flex-wrap gap-2">
                {v.eps && (
                  <a
                    href={downloadHref(v.eps, safeName(product.product, selected.size, v.variant, "eps"))}
                    className="inline-flex items-center gap-1.5 rounded border border-[#e07b39] px-3 py-1.5 text-xs font-medium text-[#e07b39] transition-colors hover:bg-[#e07b39] hover:text-white"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    EPS
                  </a>
                )}
                {v.jpg && (
                  <a
                    href={downloadHref(v.jpg, safeName(product.product, selected.size, v.variant, "jpg"))}
                    className="inline-flex items-center gap-1.5 rounded border border-[#2c327a] px-3 py-1.5 text-xs font-medium text-[#2c327a] transition-colors hover:bg-[#2c327a] hover:text-white"
                  >
                    <FileImage className="h-3.5 w-3.5" aria-hidden="true" />
                    JPG
                  </a>
                )}
                {!v.eps && !v.jpg && (
                  <span className="text-xs text-slate-400">Unavailable</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Files download to your device — design, then upload your artwork at checkout.
        </p>
      </div>
    </div>
  )
}
