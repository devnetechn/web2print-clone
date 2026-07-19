import { notFound } from "next/navigation"
import { ProductDetailClient } from "@/components/storefront/product-detail-client"
import { getActiveProducts, getProductById, getProductOptions } from "@/lib/products/cache"

// Check if string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let product = null

  // Try to find by UUID first, then by slug/category
  if (isUUID(id)) {
    product = await getProductById(id)
  } else {
    // Try to find by category slug (e.g., "business-cards" -> "Business Cards")
    const categoryName = id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    const allProducts = await getActiveProducts()
    product = allProducts.find((p) => p.category?.toLowerCase() === categoryName.toLowerCase()) || null
  }

  if (!product) {
    notFound()
  }

  const options = await getProductOptions(product.id)

  return <ProductDetailClient product={product} options={options} />
}
