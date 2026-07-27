import type { Metadata } from "next"
import Link from "next/link"
import { FileText, Download, ChevronRight } from "lucide-react"
import { templateCatalog, categorySlug, catalogStats } from "@/lib/print/templates"

export const metadata: Metadata = {
  title: "Free Design Templates | Web2Print USA Solutions",
  description:
    "Download free, print-ready design templates for business cards, postcards, banners, labels, and more. Available in EPS and JPG formats with correct bleed and safe zones.",
}

function countProduct(products: { sizes: { variants: unknown[] }[] }[]) {
  return products.reduce((a, p) => a + p.sizes.reduce((b, s) => b + s.variants.length, 0), 0)
}

export default function TemplatesIndexPage() {
  const stats = catalogStats()

  return (
    <main className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <section className="bg-[#2c327a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <nav className="text-xs text-white/70 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Templates</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-balance">Free Design Templates</h1>
          <p className="mt-3 max-w-2xl text-white/80 leading-relaxed text-pretty">
            Start your artwork the right way. Every template is built to our exact print
            specifications with proper bleed, trim, and safe zones. Download in fully editable{" "}
            <span className="font-semibold text-white">EPS</span> (vector) or reference{" "}
            <span className="font-semibold text-white">JPG</span> format.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-2xl font-bold">{stats.templates.toLocaleString()}</div>
              <div className="text-white/70">Templates</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.products}</div>
              <div className="text-white/70">Products</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.categories}</div>
              <div className="text-white/70">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold">EPS + JPG</div>
              <div className="text-white/70">Formats</div>
            </div>
          </div>
        </div>
      </section>

      {/* Category cards */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templateCatalog.map(cat => {
            const slug = categorySlug(cat.name)
            const templates = countProduct(cat.products)
            return (
              <Link
                key={slug}
                href={`/templates/${slug}`}
                className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-[#e07b39] hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#2c327a]/10 text-[#2c327a] group-hover:bg-[#e07b39] group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#e07b39] transition-colors" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{cat.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {cat.products.length} products · {templates.toLocaleString()} templates
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {cat.products.slice(0, 4).map(p => (
                    <span key={p.product} className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                      {p.product}
                    </span>
                  ))}
                  {cat.products.length > 4 && (
                    <span className="text-xs text-slate-400 px-1 py-0.5">
                      +{cat.products.length - 4} more
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* How-to strip */}
        <div className="mt-10 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-[#e07b39] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900">How to use these templates</h3>
              <ol className="mt-2 text-sm text-slate-600 leading-relaxed list-decimal list-inside space-y-1">
                <li>Pick your product and size, then download the EPS (editable vector) file.</li>
                <li>Design inside the safe zone and extend backgrounds to the bleed line.</li>
                <li>Save as a print-ready PDF and upload it when you place your order.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
