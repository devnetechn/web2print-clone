import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetailClient } from "@/components/storefront/product-detail-client"
import { getActiveProducts, getProductById, getProductOptions } from "@/lib/products/cache"
import { JsonLd } from "@/components/seo/json-ld"
import { canonical, productSchema } from "@/lib/seo"

// Check if string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

async function resolveProduct(id: string) {
  if (isUUID(id)) return await getProductById(id)
  const categoryName = id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  const allProducts = await getActiveProducts()
  return allProducts.find((p) => p.category?.toLowerCase() === categoryName.toLowerCase()) || null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await resolveProduct(id)
  if (!product) return { title: "Product Not Found" }
  const description =
    product.description ||
    `Order ${product.name} online at Web2Print USA — live pricing, premium quality, and fast nationwide shipping.`
  return {
    title: product.name,
    description,
    ...canonical(`/products/${id}`),
    openGraph: {
      title: `${product.name} | Web2Print USA`,
      description,
      url: `/products/${id}`,
      ...(product.image ? { images: [{ url: product.image, alt: product.name }] } : {}),
    },
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await resolveProduct(id)

  if (!product) {
    notFound()
  }

  const options = await getProductOptions(product.id)

  return (
    <>
      <JsonLd
        data={productSchema({
          name: product.name,
          description:
            product.description ||
            `Order ${product.name} online at Web2Print USA — live pricing, premium quality, and fast nationwide shipping.`,
          image: product.image || undefined,
          path: `/products/${id}`,
          price: product.base_price || undefined,
        })}
      />
      <ProductDetailClient product={product} options={options} />
    </>
  )
}
