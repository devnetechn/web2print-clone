"use client"

import { useMemo, useState } from "react"
import { Search, FileDown, ImageIcon } from "lucide-react"
import type { TemplateCategory } from "@/lib/print/templates"

function downloadHref(src: string) {
  return `/api/templates/download?src=${encodeURIComponent(src)}`
}

export function TemplateBrowser({ category }: { category: TemplateCategory }) {
  const [query, setQuery] = useState("")
  const [activeProduct, setActiveProduct] = useState<string>("all")

  const q = query.trim().toLowerCase()

  const visibleProducts = useMemo(() => {
    return category.products
      .filter(p => activeProduct === "all" || p.product === activeProduct)
      .map(p => {
        if (!q) return p
        // filter sizes/variants by query
        const sizes = p.sizes
          .map(s => {
            const sizeMatch = s.size.toLowerCase().includes(q) || p.product.toLowerCase().includes(q)
            const variants = sizeMatch
              ? s.variants
              : s.variants.filter(v => v.variant.toLowerCase().includes(q))
            return { ...s, variants }
          })
          .filter(s => s.variants.length > 0)
        return { ...p, sizes }
      })
      .filter(p => p.sizes.length > 0)
  }, [category.products, activeProduct, q])

  const totalShown = visibleProducts.reduce(
    (a, p) => a + p.sizes.reduce((b, s) => b + s.variants.length, 0),
    0,
  )

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${category.name} templates by size or style...`}
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:border-[#e07b39] focus:outline-none focus:ring-1 focus:ring-[#e07b39]"
            aria-label="Search templates"
          />
        </div>

        {category.products.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveProduct("all")}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                activeProduct === "all"
                  ? "bg-[#2c327a] text-white border-[#2c327a]"
                  : "bg-white text-slate-600 border-slate-300 hover:border-[#2c327a]"
              }`}
            >
              All Products
            </button>
            {category.products.map(p => (
              <button
                key={p.product}
                onClick={() => setActiveProduct(p.product)}
                className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                  activeProduct === p.product
                    ? "bg-[#2c327a] text-white border-[#2c327a]"
                    : "bg-white text-slate-600 border-slate-300 hover:border-[#2c327a]"
                }`}
              >
                {p.product}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-500">
          {totalShown.toLocaleString()} template{totalShown === 1 ? "" : "s"}
          {q ? ` matching “${query}”` : ""}
        </p>
      </div>

      {/* Results */}
      {visibleProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500">
          No templates match your search.
        </div>
      ) : (
        <div className="space-y-8">
          {visibleProducts.map(product => (
            <div key={product.product}>
              {category.products.length > 1 && (
                <h2 className="text-lg font-semibold text-slate-900 mb-3">{product.product}</h2>
              )}
              <div className="space-y-4">
                {product.sizes.map(size => (
                  <div
                    key={size.size}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                      <h3 className="text-sm font-semibold text-slate-800">{size.size}</h3>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {size.variants.map((v, i) => (
                        <li
                          key={`${v.variant}-${i}`}
                          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="text-sm text-slate-700">{v.variant}</span>
                          <div className="flex flex-wrap gap-2">
                            {v.eps && (
                              <a
                                href={downloadHref(v.eps)}
                                className="inline-flex items-center gap-1.5 rounded border border-[#2c327a] text-[#2c327a] hover:bg-[#2c327a] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
                              >
                                <FileDown className="w-3.5 h-3.5" /> EPS
                              </a>
                            )}
                            {v.jpg && (
                              <a
                                href={downloadHref(v.jpg)}
                                className="inline-flex items-center gap-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium px-3 py-1.5 transition-colors"
                              >
                                <ImageIcon className="w-3.5 h-3.5" /> JPG
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
