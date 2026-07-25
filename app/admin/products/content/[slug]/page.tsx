import { createClient } from "@/lib/supabase/server"
import { SLUG_TO_CATEGORY } from "@/lib/print/categories"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ContentEditForm } from "@/components/admin/content-edit-form"
import type { ProductContent } from "@/lib/print/product-content"

export default async function ProductContentEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!SLUG_TO_CATEGORY[slug]) notFound()

  const supabase = await createClient()
  const { data: content } = await supabase
    .from("product_content")
    .select("*")
    .eq("category_slug", slug)
    .maybeSingle<ProductContent>()

  const cat = SLUG_TO_CATEGORY[slug]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/admin/products/content"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Product Content
        </Link>
        <h1 className="text-3xl font-bold">{cat.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {cat.parentLabel} · <code className="bg-slate-100 px-1 rounded">{slug}</code>
        </p>
      </div>

      <ContentEditForm slug={slug} initialContent={content ?? null} />
    </div>
  )
}
