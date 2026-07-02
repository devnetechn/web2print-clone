import { createClient } from "@/lib/supabase/server"
import { SLUG_TO_CATEGORY } from "@/lib/print/categories"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Edit } from "lucide-react"

export default async function ProductContentListPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from("product_content")
    .select("category_slug, updated_at")

  const contentMap = new Map((rows ?? []).map(r => [r.category_slug, r.updated_at as string]))
  const allSlugs = Object.keys(SLUG_TO_CATEGORY).sort()

  const withContent = allSlugs.filter(s => contentMap.has(s))
  const withoutContent = allSlugs.filter(s => !contentMap.has(s))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Content</h1>
          <p className="text-slate-600">
            Manage description, specs templates, and FAQs for each product category.
          </p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{allSlugs.length}</p>
            <p className="text-sm text-muted-foreground">Total Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{withContent.length}</p>
            <p className="text-sm text-muted-foreground">Have Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-slate-400">{withoutContent.length}</p>
            <p className="text-sm text-muted-foreground">Need Content</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Product Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {allSlugs.map(slug => {
              const cat = SLUG_TO_CATEGORY[slug]
              const updatedAt = contentMap.get(slug)
              return (
                <div key={slug} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        updatedAt ? "bg-green-500" : "bg-slate-300"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{cat?.name ?? slug}</p>
                      <p className="text-xs text-slate-500">
                        {cat?.parentLabel} / {slug}
                        {updatedAt && (
                          <> · Updated {new Date(updatedAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link href={`/admin/products/content/${slug}`}>
                      <Edit className="h-3.5 w-3.5" />
                      {updatedAt ? "Edit" : "Add"}
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
