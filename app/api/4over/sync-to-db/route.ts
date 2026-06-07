import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  getCategories, 
  getAllProducts as get4overProducts,
  getProductOptionGroups,
  getProductBasePrices 
} from "@/lib/4over/client"

// Sync 4over products to Supabase database
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Step 1: Fetch categories from 4over
    console.log("[v0] Fetching 4over categories...")
    const categoriesResult = await getCategories()
    
    if (!categoriesResult.success) {
      return NextResponse.json({ error: "Failed to fetch categories", details: categoriesResult.error }, { status: 500 })
    }

    const categories = categoriesResult.data || []
    console.log(`[v0] Found ${categories.length} categories`)

    // Step 2: Fetch all products
    console.log("[v0] Fetching 4over products...")
    const productsResult = await get4overProducts(1, 500)
    
    if (!productsResult.success) {
      return NextResponse.json({ error: "Failed to fetch products", details: productsResult.error }, { status: 500 })
    }

    const products = productsResult.data || []
    console.log(`[v0] Found ${products.length} products`)

    // Step 3: Insert/update products in Supabase
    let inserted = 0
    let updated = 0
    let errors: string[] = []

    for (const product of products) {
      try {
        // Get base prices for this product
        const pricesResult = await getProductBasePrices(product.product_uuid)
        const basePrices = pricesResult.success ? pricesResult.data : []
        
        // Find minimum price
        let minPrice = 0
        if (Array.isArray(basePrices) && basePrices.length > 0) {
          const prices = basePrices.map((p: any) => parseFloat(p.price || p.base_price || 0)).filter(p => p > 0)
          minPrice = prices.length > 0 ? Math.min(...prices) : 0
        }

        // Map 4over product to our schema
        const productData = {
          fourover_product_uuid: product.product_uuid,
          name: product.product_description || product.name,
          description: product.product_description,
          category: product.category_name || product.category,
          base_price: minPrice,
          is_active: true,
          source: "4over",
          metadata: {
            fourover_uuid: product.product_uuid,
            fourover_code: product.product_code,
            stock: product.stock,
            coating: product.coating,
            size: product.size,
          }
        }

        // Check if product exists
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("fourover_product_uuid", product.product_uuid)
          .single()

        if (existing) {
          // Update
          await supabase
            .from("products")
            .update(productData)
            .eq("id", existing.id)
          updated++
        } else {
          // Insert
          await supabase
            .from("products")
            .insert(productData)
          inserted++
        }
      } catch (err) {
        errors.push(`Product ${product.product_uuid}: ${String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_fetched: products.length,
        inserted,
        updated,
        errors: errors.length
      },
      errors: errors.slice(0, 10) // Only return first 10 errors
    })

  } catch (error) {
    console.error("[v0] Sync error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET - Show sync status / preview what would be synced
export async function GET() {
  try {
    // Fetch from 4over
    const categoriesResult = await getCategories()
    const productsResult = await get4overProducts(1, 100)

    const categories = categoriesResult.success ? categoriesResult.data : []
    const products = productsResult.success ? productsResult.data : []

    // Filter for flyers and postcards
    const flyers = products.filter((p: any) => {
      const desc = (p.product_description || p.name || "").toLowerCase()
      return desc.includes("flyer")
    })

    const postcards = products.filter((p: any) => {
      const desc = (p.product_description || p.name || "").toLowerCase()
      return desc.includes("postcard")
    })

    return NextResponse.json({
      message: "4over Data Preview - POST to this endpoint to sync to database",
      data: {
        categories_count: categories.length,
        categories: categories.slice(0, 20),
        products_count: products.length,
        products_sample: products.slice(0, 5),
        flyers_found: flyers.length,
        flyers: flyers.slice(0, 5),
        postcards_found: postcards.length,
        postcards: postcards.slice(0, 5)
      }
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
