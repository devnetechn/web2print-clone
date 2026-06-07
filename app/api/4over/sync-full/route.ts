import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  getAllCategories, 
  getProducts, 
  getProductsFeed, 
  getProductBasePrices 
} from "@/lib/4over/client"

// Only sync these categories
const ALLOWED_CATEGORIES = [
  "flyer", "brochure", "postcard", "banner", "sign", "packaging",
  "eddm", "menu", "ticket", "presentation folder", "business card",
  "letterhead", "stationery", "booklet", "catalog", "poster"
]

function isAllowedCategory(name: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return ALLOWED_CATEGORIES.some(cat => lower.includes(cat))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const startTime = Date.now()
  
  // Get which step to run from query params (for chunked processing)
  const { searchParams } = new URL(request.url)
  const step = searchParams.get("step") || "categories"
  const page = parseInt(searchParams.get("page") || "1")
  
  console.log("[v0] Sync step:", step, "page:", page)
  
  try {
    // STEP 1: Sync categories
    if (step === "categories") {
      console.log("[v0] Fetching categories from 4over API...")
      const catResult = await getAllCategories()
      
      if (!catResult.success || !catResult.data) {
        console.log("[v0] Categories fetch FAILED:", catResult.error)
        return NextResponse.json({ 
          success: false, 
          error: `Categories fetch failed: ${catResult.error}` 
        }, { status: 500 })
      }
      
      const allCategories = catResult.data
      console.log("[v0] Got", allCategories.length, "total categories from API")
      
      // Filter to allowed categories
      const filtered = allCategories.filter((cat: any) => {
        const name = cat.product_category_name || cat.category_name || cat.name || ""
        return isAllowedCategory(name)
      })
      
      console.log("[v0] Filtered to", filtered.length, "allowed categories")
      
      // Prepare batch data for single insert
      const categoryRows = filtered.map((cat: any) => {
        const uuid = cat.product_category_uuid || cat.category_uuid || cat.id
        const name = cat.product_category_name || cat.category_name || cat.name
        return {
          category_uuid: uuid,
          category_name: name,
          parent_category_uuid: cat.parent_category_uuid || null,
          category_order: cat.product_category_order || 0,
          synced_at: new Date().toISOString()
        }
      }).filter((row: any) => row.category_uuid) // Remove any without UUID
      
      console.log("[v0] Inserting", categoryRows.length, "categories in batch")
      
      // Single batch upsert
      const { error, count } = await supabase
        .from("fourover_categories")
        .upsert(categoryRows, { onConflict: "category_uuid", count: "exact" })
      
      if (error) {
        console.log("[v0] Batch category upsert error:", error.message)
        return NextResponse.json({ 
          success: false, 
          error: `Categories save failed: ${error.message}` 
        }, { status: 500 })
      }
      
      console.log("[v0] Saved", count || categoryRows.length, "categories to database")
      
      return NextResponse.json({
        success: true,
        step: "categories",
        message: `Synced ${count || categoryRows.length} categories`,
        nextStep: "products",
        nextPage: 1
      })
    }
    
    // STEP 2: Sync products BY CATEGORY (not productsfeed which returns all products)
    if (step === "products") {
      // Get the next category to sync products from (use page as category index)
      const { data: categories } = await supabase
        .from("fourover_categories")
        .select("category_uuid, category_name")
        .order("category_order", { ascending: true })
      
      if (!categories || categories.length === 0) {
        return NextResponse.json({
          success: true,
          step: "products",
          message: "No categories to sync products from - run categories sync first",
          complete: true
        })
      }
      
      const categoryIndex = page - 1 // page 1 = category index 0
      
      if (categoryIndex >= categories.length) {
        console.log("[v0] All categories synced!")
        return NextResponse.json({
          success: true,
          step: "products",
          message: `All ${categories.length} categories synced`,
          complete: true
        })
      }
      
      const category = categories[categoryIndex]
      console.log("[v0] Syncing products for category", categoryIndex + 1, "of", categories.length, ":", category.category_name, "UUID:", category.category_uuid)
      
      // Fetch products for this category
      const prodResult = await getProducts(category.category_uuid, 200)
      
      if (!prodResult.success && (prodResult.error?.includes("Rate") || prodResult.error?.includes("Too"))) {
        console.log("[v0] Rate limited on category", category.category_name)
        return NextResponse.json({
          success: true,
          step: "products",
          message: `Rate limited on ${category.category_name} - retrying`,
          nextStep: "products",
          nextPage: page, // Same page to retry
          rateLimited: true
        })
      }
      
      const products = prodResult.success && prodResult.data?.entities ? prodResult.data.entities : []
      console.log("[v0] Got", products.length, "products for category", category.category_name)
      
      if (products.length > 0) {
        // Prepare batch arrays
        const productRows = products.map((product: any) => ({
          product_uuid: product.product_uuid,
          product_code: product.product_code || null,
          product_description: product.product_description || null,
          product_name: product.product_description || product.product_code || null,
          category_uuid: category.category_uuid,
          product_data: product,
          synced_at: new Date().toISOString()
        })).filter((row: any) => row.product_uuid)
        
        const optionGroupRows: any[] = []
        for (const product of products) {
          const groups = product.product_option_groups || []
          for (const group of groups) {
            if (!group.product_option_group_uuid) continue
            optionGroupRows.push({
              product_uuid: product.product_uuid,
              option_group_uuid: group.product_option_group_uuid,
              option_group_name: group.product_option_group_name || "",
              option_group_order: group.product_option_group_order || 0,
              options: group.product_options || [],
              synced_at: new Date().toISOString()
            })
          }
        }
        
        console.log("[v0] Batch inserting", productRows.length, "products and", optionGroupRows.length, "option groups")
        
        // Batch insert products
        if (productRows.length > 0) {
          const { error: prodError } = await supabase
            .from("fourover_products")
            .upsert(productRows, { onConflict: "product_uuid" })
          if (prodError) console.log("[v0] Products error:", prodError.message)
        }
        
        // Batch insert option groups  
        if (optionGroupRows.length > 0) {
          const { error: groupError } = await supabase
            .from("fourover_option_groups")
            .upsert(optionGroupRows, { onConflict: "product_uuid,option_group_uuid" })
          if (groupError) console.log("[v0] Option groups error:", groupError.message)
        }
      }
      
      return NextResponse.json({
        success: true,
        step: "products",
        message: `Category ${categoryIndex + 1}/${categories.length}: ${category.category_name} (${products.length} products)`,
        nextStep: "products",
        nextPage: page + 1,
        progress: Math.round(((categoryIndex + 1) / categories.length) * 100)
      })
    }
    
    // STEP 3: Sync base prices
    if (step === "prices") {
      // Get products that don't have prices yet (limit to 20 per call)
      const { data: products } = await supabase
        .from("fourover_products")
        .select("product_uuid")
        .limit(20)
      
      if (!products || products.length === 0) {
        return NextResponse.json({
          success: true,
          step: "prices",
          message: "No products to price",
          complete: true
        })
      }
      
      let savedPrices = 0
      
      for (const product of products) {
        await new Promise(r => setTimeout(r, 300)) // Rate limit
        
        const priceResult = await getProductBasePrices(product.product_uuid)
        
        if (!priceResult.success || !priceResult.data) continue
        
        const prices = priceResult.data.entities || priceResult.data || []
        
        for (const price of prices) {
          if (!price.runsize_uuid || !price.colorspec_uuid) continue
          
          await supabase.from("fourover_base_prices").upsert({
            product_uuid: product.product_uuid,
            runsize_uuid: price.runsize_uuid,
            runsize: parseInt(price.runsize) || 0,
            colorspec_uuid: price.colorspec_uuid,
            colorspec: price.colorspec || null,
            product_baseprice: parseFloat(price.product_baseprice) || 0,
            turnaroundtime_uuid: price.turnaroundtime_uuid || null,
            turnaroundtime: price.turnaroundtime || null,
            synced_at: new Date().toISOString()
          }, { onConflict: "product_uuid,runsize_uuid,colorspec_uuid" })
          
          savedPrices++
        }
        
        // Check timeout
        if (Date.now() - startTime > 25000) {
          return NextResponse.json({
            success: true,
            step: "prices",
            message: `Saved ${savedPrices} prices (timeout approaching)`,
            nextStep: "prices",
            nextPage: page + 1
          })
        }
      }
      
      return NextResponse.json({
        success: true,
        step: "prices",
        message: `Saved ${savedPrices} prices`,
        nextStep: "prices",
        nextPage: page + 1
      })
    }
    
    return NextResponse.json({ success: false, error: "Unknown step" }, { status: 400 })
    
  } catch (error) {
    console.log("[v0] Sync error:", String(error))
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// GET - Check status and counts
export async function GET() {
  const supabase = await createClient()
  
  try {
    const { count: categoryCount, error: catError } = await supabase
      .from("fourover_categories")
      .select("*", { count: "exact", head: true })
    
    if (catError) {
      return NextResponse.json({
        success: false,
        tablesExist: false,
        message: "Tables may not exist"
      })
    }
    
    const { count: productCount } = await supabase
      .from("fourover_products")
      .select("*", { count: "exact", head: true })
    
    const { count: priceCount } = await supabase
      .from("fourover_base_prices")
      .select("*", { count: "exact", head: true })
    
    const { data: syncData } = await supabase
      .from("fourover_sync_status")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
    
    return NextResponse.json({
      success: true,
      tablesExist: true,
      counts: {
        categories: categoryCount || 0,
        products: productCount || 0,
        prices: priceCount || 0
      },
      latestSync: syncData?.[0] || null
    })
  } catch {
    return NextResponse.json({
      success: false,
      tablesExist: false,
      message: "Tables may not exist"
    })
  }
}
