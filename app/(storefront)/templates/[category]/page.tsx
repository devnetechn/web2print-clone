import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { templateCatalog, categorySlug, getCategory } from "@/lib/print/templates"
import { TemplateBrowser } from "@/components/print/template-browser"

export function generateStaticParams() {
  return templateCatalog.map(c => ({ category: categorySlug(c.name) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = getCategory(category)
  if (!cat) return { title: "Templates" }
  return {
    title: `${cat.name} Templates | Web2Print USA Solutions`,
    description: `Download free print-ready ${cat.name} design templates in EPS and JPG formats, built to exact print specs with proper bleed and safe zones.`,
  }
}

export default async function TemplateCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const cat = getCategory(category)
  if (!cat) notFound()

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-[#2c327a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          <nav className="text-xs text-white/70 mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/templates" className="hover:text-white">Templates</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{cat.name}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-balance">{cat.name} Templates</h1>
          <p className="mt-2 text-sm text-white/80 max-w-2xl text-pretty">
            Free, print-ready templates with correct bleed and safe zones. Download the editable
            EPS or a JPG reference for any size below.
          </p>
        </div>
      </section>

      <TemplateBrowser category={cat} />
    </main>
  )
}
