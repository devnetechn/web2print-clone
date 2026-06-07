"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter, useSearchParams } from "next/navigation"

export function ProductFilters({ categories }: { categories: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get("category")

  const handleCategoryChange = (category: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams)
    if (checked) {
      params.set("category", category)
    } else {
      params.delete("category")
    }
    router.push(`/products?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="mb-3 font-semibold">Categories</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <label key={category} className="flex items-center gap-2">
                <Checkbox
                  checked={currentCategory === category}
                  onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                />
                <span className="text-sm">{category}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
