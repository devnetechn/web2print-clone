"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

interface Product {
  product_uuid: string
  product_description: string
  product_code: string
  slug: string
  href: string
}

interface ProductsListingClientProps {
  products: Product[]
  category: string
  currentSort: string
  categoryUuid: string
}

export function ProductsListingClient({ products, currentSort, categoryUuid }: ProductsListingClientProps) {
  const router = useRouter()

  const handleSortChange = (newSort: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('sort', newSort)
    router.push(url.pathname + url.search)
  }

  return (
    <>
      {/* Sort Dropdown */}
      <div className="mb-6 flex items-center gap-2">
        <label htmlFor="sort" className="text-sm font-medium text-slate-700">Sort By:</label>
        <select
          id="sort"
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e42a27]"
        >
          <option value="popularity">Popularity</option>
          <option value="newest">Newest</option>
          <option value="a-z">A to Z</option>
          <option value="z-a">Z to A</option>
        </select>
      </div>

      {/* Products Grid - 2 columns matching 4over */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product) => (
            <div key={product.product_uuid} className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                {product.product_description}
              </h2>

              <div className="flex justify-center">
                <Link
                  href={product.href}
                  className="inline-flex items-center gap-1 bg-[#e07b39] hover:bg-[#c9692a] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
                >
                  View details <span className="text-base leading-none">›</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">No products found in this category.</p>
          <Link href="/print" className="text-[#e42a27] hover:underline">
            Back to all categories
          </Link>
        </div>
      )}
    </>
  )
}
