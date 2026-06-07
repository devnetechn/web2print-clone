import { notFound } from "next/navigation"
import { MerchProductDetail } from "@/components/merch/product-detail"
import { MERCH_PRODUCTS, PRINT_METHODS } from "@/lib/merch/products"

export default async function MerchProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Find product by ID
  const product = MERCH_PRODUCTS.find(p => p.id === id)

  if (!product) {
    notFound()
  }

  // Get related products from same category
  const relatedProducts = MERCH_PRODUCTS
    .filter(p => p.category.slug === product.category.slug && p.id !== id)
    .slice(0, 4)

  return (
    <MerchProductDetail 
      product={product} 
      printMethods={PRINT_METHODS} 
      relatedProducts={relatedProducts}
    />
  )
}
