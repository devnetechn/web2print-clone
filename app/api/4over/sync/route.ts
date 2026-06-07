import { NextResponse } from "next/server"
import {
  getCategories,
  getAllProducts,
  getProductOptionGroups,
  getProductBasePrices,
  getProductsFeed
} from "@/lib/4over/client"

// This endpoint fetches all 4over data and returns it organized
// In production, this would be cached in a database

export async function GET() {
  try {
    console.log("[v0] Starting 4over data sync...")

    // Step 1: Get all categories
    console.log("[v0] Fetching categories...")
    const categoriesResult = await getCategories()
    if (!categoriesResult.success) {
      return NextResponse.json({ error: "Failed to fetch categories", details: categoriesResult.error }, { status: 500 })
    }
    const categories = categoriesResult.data

    // Step 2: Get products feed (hydrated with full details)
    console.log("[v0] Fetching products feed...")
    const productsFeedResult = await getProductsFeed(1)
    
    // Step 3: Get all products list
    console.log("[v0] Fetching all products...")
    const productsResult = await getAllProducts(1, 500)

    // Organize data by category
    const organizedData = {
      sync_date: new Date().toISOString(),
      categories: categories,
      products: productsResult.success ? productsResult.data : [],
      products_feed: productsFeedResult.success ? productsFeedResult.data : null,
      summary: {
        total_categories: Array.isArray(categories) ? categories.length : 0,
        total_products: productsResult.success && Array.isArray(productsResult.data) ? productsResult.data.length : 0
      }
    }

    // Find specific products we care about
    const products = productsResult.success && Array.isArray(productsResult.data) ? productsResult.data : []
    
    // Search for flyers and postcards
    const flyers = products.filter((p: any) => {
      const desc = (p.product_description || p.name || "").toLowerCase()
      return desc.includes("flyer") || desc.includes("all inclusive flyer")
    })

    const postcards = products.filter((p: any) => {
      const desc = (p.product_description || p.name || "").toLowerCase()
      return desc.includes("postcard") || desc.includes("all inclusive postcard")
    })

    return NextResponse.json({
      success: true,
      data: organizedData,
      found: {
        flyers: flyers.slice(0, 10),
        postcards: postcards.slice(0, 10)
      }
    })
  } catch (error) {
    console.error("[v0] Sync error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
