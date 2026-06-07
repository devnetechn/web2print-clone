import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"

type Product = {
  id: string
  name: string
  description: string | null
  category: string
  base_price: number
  image_url: string | null
  turnaround_days: number | null
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold">No products found</h3>
          <p className="text-slate-600">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-lg">
          <div className="aspect-square bg-slate-100">
            {product.image_url ? (
              <img
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-16 w-16 text-slate-400" />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <div className="mb-1 text-xs font-medium text-blue-600">{product.category}</div>
            <h3 className="mb-2 text-lg font-bold">{product.name}</h3>
            <p className="mb-3 line-clamp-2 text-sm text-slate-600">{product.description}</p>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-slate-900">${Number(product.base_price).toFixed(2)}</span>
                <span className="text-sm text-slate-600"> starting</span>
              </div>
              {product.turnaround_days && (
                <span className="text-xs text-slate-600">{product.turnaround_days} day turnaround</span>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Button asChild className="w-full">
              <Link href={`/products/${product.id}`}>View Details</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
