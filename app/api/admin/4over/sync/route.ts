import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { fourOverClient } from "@/lib/4over/client"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request: Request) {
  try {
    // Use admin client with service role key for bulk inserts
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const reset = searchParams.get("reset") === "true"
    
    // If reset, delete all 4over data
    if (reset) {
      await supabase.from("product_options").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("products").delete().eq("print_provider", "4over")
      await supabase.from("fourover_markups").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    }
    
    // NOTE: /productsfeed and detailed endpoints (/colorspecs, /runsizes) return 404
    // Only /printproducts/products and /printproducts/categories work with current API credentials
    return await syncFromIndividualEndpoints(supabase)
    
  } catch (error) {
    return NextResponse.json({ error: "Sync failed: " + String(error) }, { status: 500 })
  }
}

// Sync using productsfeed (preferred - all data in one call)
async function syncFromProductsFeed(supabase: any, products: any[]) {
  let categoryCount = 0
  let productCount = 0
  let optionCount = 0
  const categories = new Set<string>()
  
  for (const product of products) {
    const productId = product.product_uuid
    if (!productId) continue
    
    const productName = product.product_description || product.product_name || "Unnamed Product"
    const productCode = product.product_code || ""
    const categoryName = product.category_name || product.category_description || "Print Products"
    categories.add(categoryName)
    
    // Save product
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("fourover_id", productId)
      .maybeSingle()
    
    let dbProductId: string
    
    if (existing) {
      await supabase.from("products").update({
        name: productName,
        description: productCode ? `SKU: ${productCode}` : "",
        category: categoryName,
        is_active: true
      }).eq("id", existing.id)
      dbProductId = existing.id
    } else {
      const { data: newProduct } = await supabase.from("products").insert({
        name: productName,
        description: productCode ? `SKU: ${productCode}` : "",
        category: categoryName,
        fourover_id: productId,
        base_price: 0,
        is_active: true,
        print_provider: "4over",
        provider_product_id: productId
      }).select("id").single()
      
      if (!newProduct) continue
      dbProductId = newProduct.id
    }
    
    productCount++
    
    // Save colorspecs as options
    if (product.colorspecs) {
      await supabase.from("product_options").delete().eq("product_id", dbProductId)
      
      const colorspecValues = product.colorspecs.map((c: any) => 
        `${c.colorspec_uuid}:${c.colorspec_name || c.colorspec_description || "Color"}`
      ).join("|")
      
      if (colorspecValues) {
        await supabase.from("product_options").insert({
          product_id: dbProductId,
          option_name: "Color Spec",
          option_value: colorspecValues,
          price_modifier: 0
        })
        optionCount++
      }
      
      // Extract runsizes from colorspecs
      for (const colorspec of product.colorspecs) {
        if (colorspec.runsizes) {
          const runsizeValues = colorspec.runsizes.map((r: any) =>
            `${r.runsize_uuid}:${r.runsize_quantity || r.runsize_name || "Qty"}`
          ).join("|")
          
          if (runsizeValues) {
            await supabase.from("product_options").insert({
              product_id: dbProductId,
              option_name: `Quantity (${colorspec.colorspec_name || "Color"})`,
              option_value: runsizeValues,
              price_modifier: 0
            })
            optionCount++
          }
          
          // Extract turnaround times from runsizes
          for (const runsize of colorspec.runsizes) {
            if (runsize.turnaroundtimes && runsize.turnaroundtimes.length > 0) {
              const turnaroundValues = runsize.turnaroundtimes.map((t: any) =>
                `${t.turnaroundtime_uuid}:${t.turnaroundtime_description || t.business_days + " days"}`
              ).join("|")
              
              // Get base price from first turnaround
              const firstTurnaround = runsize.turnaroundtimes[0]
              const basePrice = parseFloat(firstTurnaround?.base_price || firstTurnaround?.price || "0")
              
              if (basePrice > 0) {
                await supabase.from("products").update({ base_price: basePrice }).eq("id", dbProductId)
              }
            }
          }
        }
      }
    }
  }
  
  // Create markup entries for categories
  for (const categoryName of categories) {
    const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    
    const { data: existingMarkup } = await supabase
      .from("fourover_markups")
      .select("id")
      .eq("category", categorySlug)
      .maybeSingle()
    
    if (!existingMarkup) {
      await supabase.from("fourover_markups").insert({
        category: categorySlug,
        markup_type: "percentage",
        markup_value: 40,
        is_active: true
      })
    }
    categoryCount++
  }
  
  return NextResponse.json({
    success: true,
    message: `Synced ${categoryCount} categories, ${productCount} products, ${optionCount} options (via productsfeed)`,
    categories: categoryCount,
    products: productCount,
    options: optionCount
  })
}

// Fallback: sync using individual endpoints
async function syncFromIndividualEndpoints(supabase: any) {
  // Step 1: Sync categories
  const categoriesResult = await fourOverClient.getCategories()
  let categoryCount = 0
  const categoryMap: Record<string, string> = {}
  
  if (categoriesResult.success && categoriesResult.data) {
    const categories = categoriesResult.data.entities || []
    
    for (const category of categories) {
      const categoryName = category.category_name || "unknown"
      const categoryId = category.category_uuid
      const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
      
      if (categoryId) categoryMap[categoryId] = categoryName
      
      const { data: existingMarkup } = await supabase
        .from("fourover_markups")
        .select("id")
        .eq("category", categorySlug)
        .maybeSingle()
      
      if (!existingMarkup) {
        await supabase.from("fourover_markups").insert({
          category: categorySlug,
          markup_type: "percentage",
          markup_value: 40,
          is_active: true
        })
      }
      categoryCount++
    }
  }
  
  // Step 2: Fetch ALL products by category (the correct way per 4over docs)
  // The /printproducts/products endpoint has broken pagination, so we fetch by category
  await delay(500)
  console.log("[v0] Fetching all products by category...")
  const productsResult = await fourOverClient.getAllProductsByCategory()
  
  console.log("[v0] Products by category response:", JSON.stringify(productsResult).slice(0, 500))
  
  if (!productsResult.success || !productsResult.data) {
    return NextResponse.json({ 
      error: "Failed to fetch products: " + (productsResult.error || "Unknown"),
      categories: categoryCount
    }, { status: 400 })
  }
  
  const products = productsResult.data.entities || []
  console.log("[v0] Found", products.length, "total unique products from all categories")
  let productCount = 0
  let optionCount = 0
  
  // Process products in batches to avoid rate limits
  const BATCH_SIZE = 10
  const BATCH_DELAY = 1000 // 1 second between batches
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const productId = product.product_uuid
    if (!productId) continue
    
    const productName = product.product_description || "Unnamed Product"
    const productCode = product.product_code || ""
    // Category info is attached by getAllProductsByCategory
    const categoryName = product._category_name || categoryMap[product.category_uuid] || "Print Products"
    
    // Add delay every BATCH_SIZE products to avoid rate limits
    if (i > 0 && i % BATCH_SIZE === 0) {
      console.log("[v0] Processed", i, "products, waiting to avoid rate limit...")
      await delay(BATCH_DELAY)
    }
    
    // Check if product exists by fourover_id
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("fourover_id", productId)
      .maybeSingle()
    
    let dbProductId: string | null = null
    
    if (existing) {
      // Update existing product
      const { error: updateError } = await supabase.from("products").update({
        name: productName,
        description: productCode ? `SKU: ${productCode}` : "",
        category: categoryName,
        is_active: true
      }).eq("id", existing.id)
      
      if (updateError) {
        console.log("[v0] Failed to update product:", productId, updateError.message)
      }
      dbProductId = existing.id
    } else {
      // Insert new product with retry on rate limit
      let retries = 3
      while (retries > 0) {
        await delay(100) // Small delay before each insert
        
        const insertResult = await supabase.from("products").insert({
          name: productName,
          description: productCode ? `SKU: ${productCode}` : "",
          category: categoryName,
          fourover_id: productId,
          base_price: 0,
          is_active: true,
          print_provider: "4over",
          provider_product_id: productId
        }).select("id").single()
        
        // Check for rate limit in data (Supabase returns 429 in data.error sometimes)
        const isRateLimited = insertResult.error?.code === "429" || 
                             (insertResult.data as any)?.error?.code === "429"
        
        if (isRateLimited && retries > 1) {
          console.log("[v0] Rate limited, waiting 2s before retry...")
          await delay(2000)
          retries--
          continue
        }
        
        if (insertResult.error) {
          console.log("[v0] Insert error for", productId, ":", insertResult.error.message)
          break
        }
        
        if (insertResult.data && (insertResult.data as any).id) {
          dbProductId = (insertResult.data as any).id
        }
        break
      }
    }
    
    // Skip if we still don't have a valid database product ID
    if (!dbProductId) {
      continue
    }
    
    productCount++
    
    // Fetch base prices - this endpoint WORKS and includes colorspec/runsize data
    // /productoptiongroups returns 404, so we extract options from baseprices
    await delay(600)
    
    try {
      const basePricesResult = await fourOverClient.getProductBasePrices(productId)
      
      if (basePricesResult.success && basePricesResult.data) {
        const prices = basePricesResult.data.entities || []
        
        if (Array.isArray(prices) && prices.length > 0) {
          // Delete old options for this product
          await supabase.from("product_options").delete().eq("product_id", dbProductId)
          
          // Extract unique colorspecs from prices
          const colorspecMap = new Map<string, string>()
          const runsizeMap = new Map<string, string>()
          let lowestPrice = Infinity
          
          for (const price of prices) {
            // Track colorspecs
            if (price.colorspec_uuid && price.colorspec) {
              colorspecMap.set(price.colorspec_uuid, price.colorspec)
            }
            // Track runsizes
            if (price.runsize_uuid && price.runsize) {
              runsizeMap.set(price.runsize_uuid, price.runsize)
            }
            // Track lowest price
            const basePrice = parseFloat(price.product_baseprice || price.base_price || "0")
            if (basePrice > 0 && basePrice < lowestPrice) {
              lowestPrice = basePrice
            }
          }
          
          // Save colorspecs as option
          if (colorspecMap.size > 0) {
            const colorspecValues = Array.from(colorspecMap.entries())
              .map(([uuid, name]) => `${uuid}:${name}`)
              .join("|")
            
            await supabase.from("product_options").insert({
              product_id: dbProductId,
              option_name: "Color Spec",
              option_value: colorspecValues,
              price_modifier: 0
            })
            optionCount++
          }
          
          // Save runsizes as option
          if (runsizeMap.size > 0) {
            const runsizeValues = Array.from(runsizeMap.entries())
              .map(([uuid, qty]) => `${uuid}:${qty}`)
              .join("|")
            
            await supabase.from("product_options").insert({
              product_id: dbProductId,
              option_name: "Quantity",
              option_value: runsizeValues,
              price_modifier: 0
            })
            optionCount++
          }
          
          // Update product with lowest base price
          if (lowestPrice < Infinity) {
            await supabase.from("products").update({ base_price: lowestPrice }).eq("id", dbProductId)
          }
        }
      }
    } catch (e) {
      console.log("[v0] Error fetching prices for product", productId, ":", e)
    }
  }
  
  return NextResponse.json({ 
    success: true, 
    message: `Synced ${categoryCount} categories, ${productCount} products, ${optionCount} options`,
    categories: categoryCount,
    products: productCount,
    options: optionCount
  })
}
