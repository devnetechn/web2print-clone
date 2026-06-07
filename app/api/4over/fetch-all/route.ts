import { NextResponse } from "next/server"
import { 
  getCategories, 
  getAllProducts,
  getProductOptionGroups,
  getProductBasePrices
} from "@/lib/4over/client"

// Fetch all 4over data and return organized structure
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const maxPages = parseInt(searchParams.get("pages") || "20") // Get up to 20 pages by default
  
  try {
    // Step 1: Get ALL categories (paginated)
    const allCategories: any[] = []
    let catPage = 1
    while (true) {
      const categoriesResult = await getCategories(catPage)
      if (!categoriesResult.success) {
        return NextResponse.json({ error: "Failed to fetch categories", details: categoriesResult.error }, { status: 500 })
      }
      const cats = categoriesResult.data?.entities || categoriesResult.data || []
      if (cats.length === 0) break
      allCategories.push(...cats)
      catPage++
      if (catPage > 10) break // Safety limit
    }
    
    // Step 2: Get ALL products (paginated - get up to maxPages pages)
    const allProducts: any[] = []
    for (let page = 1; page <= maxPages; page++) {
      const productsResult = await getAllProducts(page, 100)
      if (productsResult.success && productsResult.data?.entities) {
        allProducts.push(...productsResult.data.entities)
      }
      // Stop if no more products
      if (!productsResult.data?.entities?.length || productsResult.data.entities.length < 100) break
    }
    
    // Step 3: Deduplicate products by UUID
    const uniqueProducts = new Map<string, any>()
    for (const product of allProducts) {
      if (!uniqueProducts.has(product.product_uuid)) {
        uniqueProducts.set(product.product_uuid, product)
      }
    }
    const deduplicatedProducts = Array.from(uniqueProducts.values())
    
    // Step 4: Organize products by category
    const productsByCategory: Record<string, any[]> = {}
    
    for (const product of deduplicatedProducts) {
      // Categories might be a URL string or array - handle both
      let categoryUuids: string[] = []
      if (typeof product.categories === 'string') {
        // It's a URL - we need to extract category from product or skip
        categoryUuids = []
      } else if (Array.isArray(product.categories)) {
        categoryUuids = product.categories
      }
      
      // Also check product code for category hints
      const code = product.product_code || ""
      const desc = product.product_description || ""
      
      // Map products to categories based on description/code
      for (const cat of allCategories) {
        const catName = cat.category_description.toLowerCase()
        const descLower = desc.toLowerCase()
        
        if (
          (catName.includes("flyer") && (descLower.includes("flyer") || descLower.includes("brochure"))) ||
          (catName.includes("postcard") && descLower.includes("postcard")) ||
          (catName.includes("business card") && descLower.includes("business card")) ||
          (catName.includes("banner") && descLower.includes("banner")) ||
          (catName.includes("poster") && descLower.includes("poster")) ||
          (catName.includes("door hanger") && descLower.includes("door hanger")) ||
          (catName.includes("letterhead") && descLower.includes("letterhead")) ||
          (catName.includes("menu") && descLower.includes("menu")) ||
          (catName.includes("magnet") && descLower.includes("magnet")) ||
          (catName.includes("ticket") && descLower.includes("ticket")) ||
          (catName.includes("calendar") && descLower.includes("calendar")) ||
          (catName.includes("hang tag") && descLower.includes("hang tag")) ||
          (catName.includes("eddm") && descLower.includes("eddm")) ||
          (catName.includes("vinyl") && descLower.includes("vinyl")) ||
          (catName.includes("acrylic") && descLower.includes("acrylic"))
        ) {
          if (!productsByCategory[cat.category_uuid]) {
            productsByCategory[cat.category_uuid] = []
          }
          productsByCategory[cat.category_uuid].push({
            product_uuid: product.product_uuid,
            product_code: product.product_code,
            product_description: product.product_description
          })
        }
      }
    }
    
    // Step 5: Build organized data structure
    const organizedData = {
      fetched_at: new Date().toISOString(),
      categories: allCategories.map((cat: any) => ({
        category_uuid: cat.category_uuid,
        category_description: cat.category_description,
        slug: cat.category_description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
        product_count: productsByCategory[cat.category_uuid]?.length || 0
      })),
      products_by_category: productsByCategory,
      total_products: deduplicatedProducts.length,
      total_categories: allCategories.length
    }
    
    return NextResponse.json(organizedData)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
