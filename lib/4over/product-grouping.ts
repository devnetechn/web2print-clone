/**
 * Product Grouping Utility
 * 
 * Groups 4over products so that ALL variants of a product become ONE product card.
 * 
 * For example:
 * - "8.5" X 11" - 8 Page Booklet On 100LB DULL BOOK with Satin AQ"
 * - "5.5" X 8.5" - 12 Page Booklet On 100LB GLOSS BOOK with UV"
 * Both become ONE product: "Booklets" with size, pages, stock, coating as options.
 * 
 * For Business Cards:
 * - "2x3.5 14PT C2S Standard Business Cards"
 * - "3.5x2 16PT Gloss Standard Business Cards"
 * Become "Standard Business Cards" (one product)
 * 
 * - "2x3.5 14PT Suede Business Cards"
 * Becomes "Suede Business Cards" (separate product from Standard)
 */

export interface ProductVariant {
  product_uuid: string
  product_code: string
  product_description: string
  size?: string
  variant_info?: string
}

export interface GroupedProduct {
  base_name: string
  slug: string
  variants: ProductVariant[]
  sizes: string[]
  has_multiple_variants: boolean
}

/**
 * Product type detection - finds what type of product this is
 * Returns the canonical product type name for grouping
 */
const PRODUCT_TYPE_PATTERNS: { pattern: RegExp; groupName: string; hasQualifiers: boolean }[] = [
  // Business Cards - group by qualifier (Standard, Suede, Silk, etc.)
  { pattern: /business\s*cards?/i, groupName: 'Business Cards', hasQualifiers: true },
  
  // Postcards - group by stock type (14pt, Suede, Pearl, etc.) like 4over does
  { pattern: /postcard/i, groupName: 'Postcards', hasQualifiers: true },
  
  // Booklets - group by page count/stock type
  { pattern: /booklet/i, groupName: 'Booklets', hasQualifiers: true },
  
  // Brochures - group by fold type
  { pattern: /brochure/i, groupName: 'Brochures', hasQualifiers: true },
  
  // Flyers - group by stock type
  { pattern: /flyer/i, groupName: 'Flyers', hasQualifiers: true },
  
  // Products that should ALL be grouped into ONE product (no qualifiers)
  { pattern: /calendar/i, groupName: 'Calendars', hasQualifiers: false },
  { pattern: /catalog/i, groupName: 'Catalogs', hasQualifiers: false },
  { pattern: /counter\s*card/i, groupName: 'Counter Cards', hasQualifiers: false },
  { pattern: /door\s*hanger/i, groupName: 'Door Hangers', hasQualifiers: false },
  { pattern: /envelope/i, groupName: 'Envelopes', hasQualifiers: false },
  { pattern: /event\s*ticket/i, groupName: 'Event Tickets', hasQualifiers: false },
  { pattern: /greeting\s*card/i, groupName: 'Greeting Cards', hasQualifiers: false },
  { pattern: /hang\s*tag/i, groupName: 'Hang Tags', hasQualifiers: false },
  { pattern: /letterhead/i, groupName: 'Letterheads', hasQualifiers: false },
  { pattern: /magnet/i, groupName: 'Magnets', hasQualifiers: false },
  { pattern: /menu/i, groupName: 'Menus', hasQualifiers: false },
  { pattern: /ncr\s*form/i, groupName: 'NCR Forms', hasQualifiers: false },
  { pattern: /notepad/i, groupName: 'Notepads', hasQualifiers: false },
  { pattern: /poster/i, groupName: 'Posters', hasQualifiers: false },
  { pattern: /rack\s*card/i, groupName: 'Rack Cards', hasQualifiers: false },
  { pattern: /sell\s*sheet/i, groupName: 'Sell Sheets', hasQualifiers: false },
  { pattern: /social\s*card/i, groupName: 'Social Cards', hasQualifiers: false },
  { pattern: /table\s*tent/i, groupName: 'Table Tents', hasQualifiers: false },
  { pattern: /trading\s*card/i, groupName: 'Trading Cards', hasQualifiers: false },
  { pattern: /announcement\s*card/i, groupName: 'Announcement Cards', hasQualifiers: false },
  { pattern: /bookmark/i, groupName: 'Bookmarks', hasQualifiers: false },
  { pattern: /presentation\s*folder/i, groupName: 'Presentation Folders', hasQualifiers: false },
  
  // Signs & Banners
  { pattern: /window\s*cling/i, groupName: 'Window Cling', hasQualifiers: false },
  { pattern: /window\s*film/i, groupName: 'Window Film', hasQualifiers: false },
  { pattern: /perforated.*film/i, groupName: 'Perforated Window Film', hasQualifiers: false },
  { pattern: /vinyl\s*banner/i, groupName: 'Vinyl Banners', hasQualifiers: false },
  { pattern: /fabric\s*banner/i, groupName: 'Fabric Banners', hasQualifiers: false },
  { pattern: /retractable.*banner/i, groupName: 'Retractable Banners', hasQualifiers: false },
  { pattern: /banner/i, groupName: 'Banners', hasQualifiers: false },
  { pattern: /yard\s*sign/i, groupName: 'Yard Signs', hasQualifiers: false },
  { pattern: /coroplast/i, groupName: 'Coroplast Signs', hasQualifiers: false },
  { pattern: /foam\s*board/i, groupName: 'Foam Board Signs', hasQualifiers: false },
  { pattern: /acrylic\s*sign/i, groupName: 'Acrylic Signs', hasQualifiers: false },
  { pattern: /aluminum/i, groupName: 'Aluminum Signs', hasQualifiers: false },
  { pattern: /sign/i, groupName: 'Signs', hasQualifiers: false },
  
  // Labels & Stickers
  { pattern: /roll\s*label/i, groupName: 'Roll Labels', hasQualifiers: false },
  { pattern: /sticker/i, groupName: 'Stickers', hasQualifiers: false },
  { pattern: /label/i, groupName: 'Labels', hasQualifiers: false },
  
  // EDDM
  { pattern: /eddm/i, groupName: 'EDDM', hasQualifiers: false },
]

/**
 * Stock/material qualifiers for products - creates SEPARATE products per stock type
 * Based on 4over's actual product organization (see postcards, business cards, etc.)
 */
const STOCK_QUALIFIERS = [
  // Stock weights (common across all products)
  '14pt',
  '16pt',
  '18pt',
  '10pt',
  '100lb gloss cover',
  '100lb gloss',
  '100lb matte',
  '100lb dull',
  '80lb gloss',
  '80lb matte',
  '70lb',
  
  // Premium materials
  'suede',
  'silk',
  'pearl',
  'natural',
  'plastic',
  'brown kraft',
  'kraft',
  'linen uncoated',
  'linen',
  'metallic',
  
  // Special finishes
  'akuafoil',
  'foil worx',
  'raised foil',
  'raised spot uv',
  'dual raised',
  'spot uv',
  'painted edge',
  'painted-edge',
  
  // Durability options
  'endurace',
  'endurance',
  
  // Special types
  'magnet',
  'tearoff',
  'all-inclusive',
  'all inclusive',
  'eddm',
  
  // Business card specific
  'standard',
  'fold-over',
  'foldover',
  'folded',
  'leaf',
  'oval',
  'circle',
  'uncoated',
  'gloss',
  'matte',
]

/**
 * Booklet qualifiers - based on 4over's 6 booklet product types
 * NOT page counts - those are options in the calculator
 */
const BOOKLET_QUALIFIERS = [
  // Stock/coating combinations that create separate products
  'matte book uncoated',
  'matte uncoated',
  'dull book with satin aq',
  'dull book satin',
  'dull satin',
  'gloss cover with aq',
  'gloss cover aq',
  'gloss aq',
  'premium opaque uncoated',
  'premium opaque',
  'gloss',  // Just "Gloss Booklets"
  'direct mail',
]

/**
 * Brochure qualifiers - fold types
 */
const BROCHURE_QUALIFIERS = [
  'tri-fold',
  'trifold',
  'bi-fold',
  'bifold',
  'z-fold',
  'zfold',
  'gate fold',
  'gatefold',
  'accordion',
  'half fold',
  'roll fold',
]

/**
 * Detect the product type and return the grouping key
 */
function getProductGroupKey(description: string): string {
  const lowerDesc = description.toLowerCase()
  
  for (const { pattern, groupName, hasQualifiers } of PRODUCT_TYPE_PATTERNS) {
    if (pattern.test(lowerDesc)) {
      if (hasQualifiers) {
        // Find the appropriate qualifier based on product type
        const qualifier = findProductQualifier(lowerDesc, groupName)
        if (qualifier) {
          return `${qualifier} ${groupName}`
        }
        // Default naming if no qualifier found
        if (groupName === 'Business Cards') return 'Standard Business Cards'
        if (groupName === 'Postcards') return '14pt Postcards'
        if (groupName === 'Booklets') return 'Standard Booklets'
        if (groupName === 'Brochures') return 'Standard Brochures'
        if (groupName === 'Flyers') return 'Standard Flyers'
        return groupName
      }
      return groupName
    }
  }
  
  // Fallback: use the description as-is (no grouping)
  return description
}

/**
 * Find the qualifier for a product based on its type
 */
function findProductQualifier(lowerDesc: string, productType: string): string | null {
  let qualifiers: string[] = []
  
  // Choose qualifier list based on product type
  if (productType === 'Booklets') {
    // For booklets, try page count first, then stock
    const pageQualifier = findQualifierFromList(lowerDesc, BOOKLET_QUALIFIERS)
    if (pageQualifier) return pageQualifier
    qualifiers = STOCK_QUALIFIERS
  } else if (productType === 'Brochures') {
    // For brochures, try fold type first, then stock
    const foldQualifier = findQualifierFromList(lowerDesc, BROCHURE_QUALIFIERS)
    if (foldQualifier) return foldQualifier
    qualifiers = STOCK_QUALIFIERS
  } else {
    // For postcards, business cards, flyers - use stock qualifiers
    qualifiers = STOCK_QUALIFIERS
  }
  
  return findQualifierFromList(lowerDesc, qualifiers)
}

/**
 * Find a qualifier from a list in the description
 */
function findQualifierFromList(lowerDesc: string, qualifiers: string[]): string | null {
  // Check multi-word qualifiers first (more specific)
  const multiWordQualifiers = qualifiers.filter(q => q.includes(' ') || q.includes('-'))
  for (const qualifier of multiWordQualifiers) {
    if (lowerDesc.includes(qualifier.toLowerCase())) {
      return formatQualifier(qualifier)
    }
  }
  
  // Then check single-word qualifiers
  const singleWordQualifiers = qualifiers.filter(q => !q.includes(' ') && !q.includes('-'))
  for (const qualifier of singleWordQualifiers) {
    // Match as word boundary to avoid partial matches
    const regex = new RegExp(`\\b${qualifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(lowerDesc)) {
      return formatQualifier(qualifier)
    }
  }
  
  return null
}

/**
 * Format a qualifier for display (proper capitalization)
 */
function formatQualifier(qualifier: string): string {
  // Handle special cases
  if (qualifier.toLowerCase() === '14pt') return '14pt'
  if (qualifier.toLowerCase() === '16pt') return '16PT'
  if (qualifier.toLowerCase() === '18pt') return '18pt'
  if (qualifier.toLowerCase() === '10pt') return '10PT'
  if (qualifier.toLowerCase().includes('lb')) {
    // "100lb gloss cover" -> "100LB Gloss Cover"
    return qualifier.split(' ').map((w, i) => {
      if (w.toLowerCase().includes('lb')) return w.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    }).join(' ')
  }
  
  // Title case for other qualifiers
  return qualifier.split(/[\s-]/).map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ')
}

/**
 * Extract variant info (size, stock, coating, etc.) for display in dropdown
 */
function extractVariantInfo(description: string): string {
  // Just return the full description - the configurator will parse it
  return description
}

/**
 * Group products by their product type
 */
export function groupProducts(products: any[]): GroupedProduct[] {
  const groups = new Map<string, ProductVariant[]>()
  
  console.log("[v0] groupProducts called with", products.length, "products")
  
  for (const product of products) {
    const description = product.product_description || ''
    const groupKey = getProductGroupKey(description)
    
    // Debug first few new groups
    if (groups.size < 5 && !groups.has(groupKey)) {
      console.log("[v0] New group:", groupKey, "from:", description)
    }
    
    const variant: ProductVariant = {
      product_uuid: product.product_uuid,
      product_code: product.product_code,
      product_description: description,
      size: extractVariantInfo(description),
      variant_info: description
    }
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(variant)
  }
  
  // Convert to array of GroupedProduct
  const groupedProducts: GroupedProduct[] = []
  
  for (const [groupName, variants] of groups) {
    // Create slug from group name
    const slug = groupName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
    // Extract all unique variant descriptions for size dropdown
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))] as string[]
    
    groupedProducts.push({
      base_name: groupName,
      slug,
      variants,
      sizes,
      has_multiple_variants: variants.length > 1
    })
  }
  
  // Sort by base name
  groupedProducts.sort((a, b) => a.base_name.localeCompare(b.base_name))
  
  console.log("[v0] groupProducts result:", groupedProducts.length, "groups")
  console.log("[v0] Group names:", groupedProducts.map(g => `${g.base_name} (${g.variants.length} variants)`))
  
  return groupedProducts
}

// Legacy exports for compatibility
export function extractBaseName(productDescription: string): string {
  return getProductGroupKey(productDescription)
}

export function extractSize(productDescription: string): string | null {
  return productDescription
}

export function getGroupingKey(productDescription: string): string {
  return getProductGroupKey(productDescription)
}

export function getVariantUuids(group: GroupedProduct): string[] {
  return group.variants.map(v => v.product_uuid)
}
