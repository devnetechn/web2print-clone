import { createHmac, createHash } from "crypto"

// Base URL is not a secret, so a sensible default is fine.
const FOUROVER_BASE_URL = process.env.FOUROVER_API_URL || "https://api.4over.com"

// Credentials are resolved at call time (not at import time) so a missing
// env var fails the actual request with a clear error instead of crashing the
// build or a module import. No hardcoded fallback keys — secrets must come from
// the environment only (.env.local locally, project env vars in production).
function getCredentials(): { publicKey: string; privateKey: string } {
  const publicKey = process.env.FOUROVER_PUBLIC_KEY
  const privateKey = process.env.FOUROVER_API_SECRET
  if (!publicKey || !privateKey) {
    throw new Error(
      "Missing 4over credentials. Set FOUROVER_PUBLIC_KEY and FOUROVER_API_SECRET in your environment (.env.local or your hosting provider's env vars).",
    )
  }
  return { publicKey, privateKey }
}

interface FourOverResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Generate signature for 4over API
// Per docs: hash_hmac("sha256", HTTP_METHOD, hash('sha256', $privateKey))
// PHP hash_hmac(algo, data, key) -> Node createHmac(algo, key).update(data)
function generateSignature(httpMethod: string): string {
  const { privateKey } = getCredentials()
  const upperMethod = httpMethod.toUpperCase()
  // First: hash the private key with SHA256
  const hashedPrivateKey = createHash("sha256").update(privateKey).digest("hex")
  // Then: HMAC-SHA256 with HTTP method as the data, hashed private key as the key
  const signature = createHmac("sha256", hashedPrivateKey).update(upperMethod).digest("hex")
  return signature
}

// Generate authentication query string for GET/DELETE requests
function getAuthParams(httpMethod: string = "GET"): string {
  const { publicKey } = getCredentials()
  const signature = generateSignature(httpMethod)
  return `apikey=${publicKey}&signature=${signature}`
}

// Generate auth headers for POST/PUT/PATCH requests
function getAuthHeaders(httpMethod: string = "POST"): Record<string, string> {
  const { publicKey } = getCredentials()
  const signature = generateSignature(httpMethod)
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "publicapikey": publicKey,
    "signature": signature,
  }
}

// ============================================
// PRODUCTS FEED - Get all products with options in fewer calls
// ============================================

// Get categories with proper pagination (max/offset per 4over docs)
// Default: max=20, offset=0
export async function getCategories(max: number = 100, offset: number = 0): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/categories?${getAuthParams("GET")}&max=${max}&offset=${offset}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get ALL categories (fetches all pages using max/offset)
export async function getAllCategories(): Promise<FourOverResponse<any[]>> {
  try {
    const allCategories: any[] = []
    let offset = 0
    const max = 100
    
    while (true) {
      const result = await getCategories(max, offset)
      if (!result.success) {
        return { success: false, error: result.error }
      }
      
      const cats = result.data?.entities || result.data || []
      if (cats.length === 0) break
      
      allCategories.push(...cats)
      
      // If we got less than max, we've reached the end
      if (cats.length < max) break
      
      offset += max
      
      // Safety limit
      if (offset > 2000) break
    }
    
    return { success: true, data: allCategories }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get products with proper pagination (max/offset per 4over docs)
export async function getAllProducts(max: number = 100, offset: number = 0): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products?${getAuthParams("GET")}&max=${max}&offset=${offset}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get ALL products with pagination and deduplication using max/offset
// Keeps fetching until we get an empty page or hit safety limit
export async function getAllProductsPaginated(): Promise<FourOverResponse<any>> {
  try {
    const seenIds = new Set<string>()
    const allProducts: any[] = []
    let offset = 0
    const max = 100
    let hasMore = true
    let duplicateCount = 0
    let pageCount = 0
    
    while (hasMore) {
      pageCount++
      const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products?${getAuthParams("GET")}&max=${max}&offset=${offset}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        // If rate limited, return what we have so far
        if (response.status === 429) {
          console.log("[4over] Rate limited on page", pageCount, "- returning", allProducts.length, "products")
          break
        }
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }
      
      // Parse JSON with error handling
      let data
      try {
        const text = await response.text()
        if (!text || text.trim() === '') {
          console.log("[4over] Empty response on page", pageCount)
          hasMore = false
          break
        }
        data = JSON.parse(text)
      } catch (parseError) {
        console.log("[4over] JSON parse error on page", pageCount, "-", String(parseError))
        // Return what we have so far
        break
      }
      
      const products = data.entities || []
      
      if (products.length === 0) {
        hasMore = false
      } else {
        let newProductsThisPage = 0
        for (const product of products) {
          const productId = product.product_uuid
          if (productId && !seenIds.has(productId)) {
            seenIds.add(productId)
            allProducts.push(product)
            newProductsThisPage++
          } else {
            duplicateCount++
          }
        }
        
        // If we got less than max, we've reached the end
        if (products.length < max) {
          hasMore = false
        } else {
          offset += max
          // Rate limit - wait between pages
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
      
      // Safety limit - max 10000 products
      if (offset > 10000) hasMore = false
    }
    
    console.log("[v0] Pagination complete:", allProducts.length, "unique products,", duplicateCount, "duplicates skipped")
    return { success: true, data: { entities: allProducts, total: allProducts.length } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get products by category with pagination
export async function getProducts(categoryId: string, max: number = 100, offset: number = 0): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/categories/${categoryId}/products?${getAuthParams("GET")}&max=${max}&offset=${offset}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get ALL products for one category (loops pages) — some categories (e.g.
// Custom Boxes: 792 products) exceed a single max=200 page, silently hiding
// everything past the cutoff (entire coating variants missing) if callers use
// a single getProducts() call instead.
export async function getAllProductsForCategory(categoryId: string): Promise<FourOverResponse<{ entities: any[] }>> {
  try {
    const all: any[] = []
    let offset = 0
    const max = 200
    while (true) {
      const result = await getProducts(categoryId, max, offset)
      if (!result.success) return { success: false, error: result.error }
      const entities = result.data?.entities || result.data || []
      if (entities.length === 0) break
      all.push(...entities)
      if (entities.length < max) break
      offset += max
      if (offset > 5000) break // safety limit
    }
    return { success: true, data: { entities: all } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get ALL products by fetching from ALL categories (the correct way per 4over docs)
// The /printproducts/products endpoint has broken pagination, so we fetch by category instead
export async function getAllProductsByCategory(): Promise<FourOverResponse<any>> {
  try {
    // Step 1: Get all categories
    const categoriesResult = await getCategories()
    if (!categoriesResult.success || !categoriesResult.data) {
      return { success: false, error: "Failed to fetch categories: " + categoriesResult.error }
    }
    
    const categories = categoriesResult.data.entities || []
    console.log("[v0] Found", categories.length, "categories, fetching products from each...")
    
    const seenIds = new Set<string>()
    const allProducts: any[] = []
    
    // Step 2: Fetch products from each category
    for (const category of categories) {
      const categoryId = category.category_uuid
      if (!categoryId) continue
      
      // Rate limit between requests
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const productsResult = await getProducts(categoryId)
      if (productsResult.success && productsResult.data) {
        const products = productsResult.data.entities || []
        
        let newCount = 0
        for (const product of products) {
          const productId = product.product_uuid
          if (productId && !seenIds.has(productId)) {
            seenIds.add(productId)
            // Add category info to product
            product._category_uuid = categoryId
            product._category_name = category.category_name
            allProducts.push(product)
            newCount++
          }
        }
        console.log("[v0] Category", category.category_name, ":", products.length, "products,", newCount, "new")
      }
    }
    
    console.log("[v0] Total unique products from all categories:", allProducts.length)
    return { success: true, data: { entities: allProducts, total: allProducts.length } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get product option groups - returns Size, Stock, Coating, Colorspec, Runsizes, Turnaround-times, finishing options
// CORRECT endpoint per docs: /printproducts/products/{uuid}/productoptiongroups (no underscore)
export async function getProductOptionGroups(productId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products/${productId}/productoptiongroups?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get product base prices - returns base prices for all runsizes and colorspecs
// CORRECT endpoint per docs: /printproducts/products/{uuid}/baseprices
// Uses max/offset pagination per 4over docs
export async function getProductBasePrices(productId: string): Promise<FourOverResponse<any>> {
  try {
    // Use max=1000 (4over pagination param, not count)
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products/${productId}/baseprices?${getAuthParams("GET")}&max=1000&offset=0`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    
    // Log the total count if available
    const entities = data.entities || data || []
    console.log("[v0] getProductBasePrices returned", Array.isArray(entities) ? entities.length : 'N/A', "prices")
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get product colorspecs (e.g., 4/4, 4/0, 4/1) - may not work, use getProductOptionGroups instead
export async function getProductColorspecs(productId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products/${productId}/colorspecs?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get product run sizes (quantities) for a specific colorspec
export async function getProductRunsizes(productId: string, colorspecId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products/${productId}/colorspecs/${colorspecId}/runsizes?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get product turnaround times for a specific colorspec + runsize
export async function getProductTurnarounds(productId: string, colorspecId: string, runsizeId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products/${productId}/colorspecs/${colorspecId}/runsizes/${runsizeId}/turnaroundtimes?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get product options (finishing, mailing, etc.)
export async function getProductOptions(productId: string, colorspecId: string, runsizeId: string, turnaroundId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/products/${productId}/colorspecs/${colorspecId}/runsizes/${runsizeId}/turnaroundtimes/${turnaroundId}/options?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// CATEGORY PRODUCTS LIST - Filter products by category with size/stock/coating
// ============================================
// CATEGORY PRODUCTS LIST - Filter products by size, stock, coating
// Returns size_list, stock_list, coating_list, and filtered products
// ============================================

export interface CategoryProductsListParams {
  category_uuid: string
  size_uuid?: string
  stock_uuid?: string
  coating_uuid?: string
  filter?: 'size' | 'stock' | 'coating'
}

export interface CategoryProductsListResponse {
  size_list: Array<{ name: string; uuid: string }>
  stock_list: Array<{ name: string; uuid: string }>
  coating_list: Array<{ name: string; uuid: string }>
  products: Array<{
    product_uuid: string
    product_code: string
    product_description: string
  }>
}

// Get filtered products and available options for a category
export async function getCategoryProductsList(params: CategoryProductsListParams): Promise<FourOverResponse<CategoryProductsListResponse>> {
  try {
    const queryParams = new URLSearchParams()
    queryParams.set('category_uuid', params.category_uuid)
    if (params.size_uuid) queryParams.set('size_uuid', params.size_uuid)
    if (params.stock_uuid) queryParams.set('stock_uuid', params.stock_uuid)
    if (params.coating_uuid) queryParams.set('coating_uuid', params.coating_uuid)
    if (params.filter) queryParams.set('filter', params.filter)
    
    const response = await fetch(
      `${FOUROVER_BASE_URL}/printproducts/categoryproductslist?${getAuthParams("GET")}&${queryParams.toString()}`,
      {
        method: "GET",
        headers: { "Accept": "application/json" },
      }
    )
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// OPTION GROUPS - Global option groups (Size, Stock, Coating, Colorspec, Runsize, Folding, etc.)
// ============================================

// Get all option groups (Size, Stock, Coating, Colorspec, Runsize, Folding Options, etc.)
export async function getOptionGroups(): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/optiongroups?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get options within an option group (e.g., all sizes, all stocks, all coatings)
export async function getOptionGroupOptions(optionGroupUuid: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/optiongroups/${optionGroupUuid}/options?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get option prices for a specific product option
// Used for finishing options like Bundling, Folding, etc. that have additional prices
export async function getProductOptionPrices(params: {
  product_uuid: string
  option_group_uuid: string
  option_uuid: string
}): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(
      `${FOUROVER_BASE_URL}/printproducts/products/${params.product_uuid}/optiongroups/${params.option_group_uuid}/options/${params.option_uuid}/prices?${getAuthParams("GET")}`,
      {
        method: "GET",
        headers: { "Accept": "application/json" },
      }
    )
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// PRODUCTS FEED - Bulk data retrieval (fewer API calls)
// Per docs: "hydrated version of product details" - reduces number of API calls
// ============================================

// Get products feed - paginated list of all products with full details
// Endpoint: /printproducts/productsfeed
export async function getProductsFeed(page?: number): Promise<FourOverResponse<any>> {
  try {
    let url = `${FOUROVER_BASE_URL}/printproducts/productsfeed?${getAuthParams("GET")}`
    if (page) url += `&page=${page}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    
    // Parse JSON with error handling
    const text = await response.text()
    if (!text || text.trim() === '') {
      return { success: true, data: { entities: [] } } // Empty response = no more data
    }
    
    try {
      const data = JSON.parse(text)
      return { success: true, data }
    } catch (parseError) {
      // Check if it's rate limited or error message
      if (text.includes("Too many requests") || text.includes("rate limit")) {
        return { success: false, error: "Rate limited - wait and retry" }
      }
      return { success: false, error: `JSON parse error: ${String(parseError).substring(0, 100)}` }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get single product feed with all options, prices, turnaround times
// Returns complete product data in one call
export async function getProductFeed(productUuid: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/productsfeed?${getAuthParams("GET")}&product_uuid=${productUuid}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    
    // Parse JSON with error handling
    const text = await response.text()
    if (!text || text.trim() === '') {
      return { success: false, error: "Empty response from API" }
    }
    
    try {
      const data = JSON.parse(text)
      return { success: true, data }
    } catch (parseError) {
      return { success: false, error: `JSON parse error: ${String(parseError).substring(0, 100)}` }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// PRICING / QUOTES
// ============================================

// Get product quote (live pricing)
// Required: product_uuid, colorspec_uuid, runsize_uuid, turnaroundtime_uuid
// Optional: options array of option_uuids
export async function getProductQuote(params: {
  product_uuid: string
  colorspec_uuid: string
  runsize_uuid: string
  turnaroundtime_uuid: string
  options?: string[]
}): Promise<FourOverResponse<any>> {
  try {
    const queryParams = new URLSearchParams({
      product_uuid: params.product_uuid,
      colorspec_uuid: params.colorspec_uuid,
      runsize_uuid: params.runsize_uuid,
      turnaroundtime_uuid: params.turnaroundtime_uuid,
    })
    if (params.options && params.options.length > 0) {
      params.options.forEach(opt => queryParams.append("options[]", opt))
    }
    
    const response = await fetch(`${FOUROVER_BASE_URL}/printproducts/productquote?${getAuthParams("GET")}&${queryParams.toString()}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// SHIPPING
// ============================================

// Validate address - per docs: POST /addressvalidation with shipping_address object
export async function validateAddress(address: {
  address: string
  city: string
  state: string
  country: string
  zipcode: string
}): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/addressvalidation?${getAuthParams("POST")}`, {
      method: "POST",
      headers: { ...getAuthHeaders("POST"), "Content-Type": "application/json" },
      body: JSON.stringify({ shipping_address: address }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get shipping quote - per docs: POST /shippingquote
// Returns box_weight, box_count, shipping options with prices, facilities, etc.
export async function getShippingQuote(params: {
  product_info: {
    product_uuid: string
    runsize_uuid: string
    turnaround_uuid: string
    colorspec_uuid: string
    option_uuids?: string[]
    sets?: number
  }
  shipping_address: {
    address: string
    address2?: string
    city: string
    state: string
    country: string
    zipcode: string
  }
  bypass_address_validation?: boolean
}): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/shippingquote?${getAuthParams("POST")}`, {
      method: "POST",
      headers: { ...getAuthHeaders("POST"), "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// FILE REQUIREMENTS
// ============================================

// Get file requirements for a product/options combination
// Returns file types needed (fr=Front, bk=Back, fm=Front mask, etc.)
export async function getFileRequirements(products: Array<{
  product_uuid: string
  option_uuids: string[]
}>): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/requirements/products?${getAuthParams("POST")}`, {
      method: "POST",
      headers: { ...getAuthHeaders("POST"), "Content-Type": "application/json" },
      body: JSON.stringify({ products }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// PRODUCT SEARCH
// ============================================

// Search products by option UUIDs
// More option UUIDs = more precise results
export async function searchProducts(optionUuids: string[]): Promise<FourOverResponse<any>> {
  try {
    const queryParams = new URLSearchParams()
    optionUuids.forEach(uuid => queryParams.append("option_uuids[]", uuid))
    
    const response = await fetch(`${FOUROVER_BASE_URL}/products_search?${getAuthParams("GET")}&${queryParams.toString()}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// ORDERS - Per 4over API Documentation
// ============================================

// Job structure for order submission
export interface FourOverJob {
  product_uuid: string
  runsize_uuid: string
  turnaroundtime_uuid?: string // Optional - defaults to shortest free turnaround
  colorspec_uuid: string
  option_uuids: string[] // Required but can be empty array
  dropship: boolean
  sets?: number // For group shipping - multiple sets with different files
  skip_files?: boolean // If true, files can be submitted later
  files?: {
    [setKey: string]: { // e.g. "set_001", "set_002"
      job_name: string
      files: {
        fr?: string // Front - URL or file_uuid
        bk?: string // Back - URL or file_uuid
        fm?: string // Front mask
        bm?: string // Back mask
        ffm?: string // Front foil mask
        bfm?: string // Back foil mask
        cm?: string // Cut mask
        cvr?: string // Cover
        multipagepdf?: string // Multi-page PDF
        [key: string]: string | undefined
      }
    }
  }
  ship_to: {
    company?: string
    firstname?: string
    lastname?: string
    email?: string
    phone: string
    address: string
    address2?: string
    city: string
    state: string
    zipcode: string
    country: string
  }
  ship_from?: { // Required if dropship is true
    company?: string
    firstname?: string
    lastname?: string
    email?: string
    phone: string
    address: string
    address2?: string
    city: string
    state: string
    zipcode: string
    country: string
  }
  shipper: {
    shipping_method: string // e.g. "FREE UPS Ground"
    shipping_code: string // e.g. "03f"
  }
  ship_from_facility?: string // Leave blank for closest facility
}

// Submit order to 4over - POST /orders
export async function submitOrder(orderData: {
  order_id: string // Customer's order ID (required)
  is_test_order?: boolean // Test orders don't go to production
  display_breakdown_prices?: "job" | "order" | "all" // Get cost breakdowns
  coupon_code?: string // One coupon per order
  skip_conformation?: boolean // Skip email confirmation
  jobs: FourOverJob[]
  payment?: {
    profile_token: string // From /paymentprofiles
    requested_amount?: number // Calculated internally if omitted
  }
}): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/orders?${getAuthParams("POST")}`, {
      method: "POST",
      headers: { ...getAuthHeaders("POST"), "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get order/job status - GET /orders/{job_id}/status
export async function getOrderStatus(jobId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/orders/${jobId}/status?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get tracking info - GET /orders/{job_id}/tracking
export async function getTracking(jobId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/orders/${jobId}/tracking?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Cancel order/job - DELETE /orders/{job_id}
// Note: Jobs can only be canceled before "Batch Imposition" status
export async function cancelOrder(jobId: string): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/orders/${jobId}?${getAuthParams("DELETE")}`, {
      method: "DELETE",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Attach files to a job - POST /jobs/{job_id}/files
// For jobs placed with skip_files=true
export async function attachFilesToJob(jobId: string, files: {
  fr?: string // Front URL or file_uuid
  bk?: string // Back URL or file_uuid
  [key: string]: string | undefined
}[]): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/jobs/${jobId}/files?${getAuthParams("POST")}`, {
      method: "POST",
      headers: { ...getAuthHeaders("POST"), "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get payment profiles - GET /paymentprofiles
// Returns saved credit cards for the account
export async function getPaymentProfiles(): Promise<FourOverResponse<any>> {
  try {
    const response = await fetch(`${FOUROVER_BASE_URL}/paymentprofiles?${getAuthParams("GET")}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Alias for backward compatibility
export const getProductPricing = getProductQuote
export const getShippingQuotes = getShippingQuote

// Export as object for convenience
export const fourOverClient = {
  // Categories & Products
  getCategories,
  getAllCategories,
  getAllProducts,
  getAllProductsPaginated,
  getAllProductsByCategory,
  getProducts,
  getAllProductsForCategory,
  getProductOptionGroups,
  getProductBasePrices,
  getProductColorspecs,
  getProductRunsizes,
  getProductTurnarounds,
  getProductOptions,
  // Products Feed (bulk)
  getProductsFeed,
  getProductFeed,
  // Pricing
  getProductQuote,
  getProductPricing, // alias
  // Shipping
  validateAddress,
  getShippingQuote,
  getShippingQuotes, // alias
  // Category Products List
  getCategoryProductsList,
  // Option Groups
  getOptionGroups,
  getOptionGroupOptions,
  getProductOptionPrices,
  // File Requirements
  getFileRequirements,
  // Product Search
  searchProducts,
  // Orders
  submitOrder,
  getOrderStatus,
  getTracking,
  cancelOrder,
  attachFilesToJob,
  getPaymentProfiles,
}
