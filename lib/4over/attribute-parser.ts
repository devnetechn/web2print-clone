/**
 * Parse 4over product descriptions to extract individual attributes
 * 
 * Example descriptions:
 * - "4.25" X 5.5" 14PT Uncoated Announcement Cards, FLAT - No Scoring"
 * - "5.5" X 8.5" 16PT Matte/Dull Finish Announcement Cards, FLAT - No Scoring"
 * - "4" x 6" 14PT C2S Postcards Gloss UV"
 * 
 * We need to extract: SIZE, STOCK, FINISH/COATING, SCORING, etc.
 */

export interface ParsedAttributes {
  size: string | null
  stock: string | null
  coating: string | null
  scoring: string | null
  colorspec: string | null
  other: string[]
}

export interface ExtractedOptions {
  sizes: string[]
  stocks: string[]
  coatings: string[]
  scorings: string[]
  // Map from attribute combination key to variant info
  variantMap: Map<string, { uuid: string; code: string; description: string }>
}

// Size pattern: dimensions like 4.25" X 5.5", 4x6, 5.5x8.5, etc.
const SIZE_PATTERN = /^(\d+(?:\.\d+)?[""]?\s*[xX]\s*\d+(?:\.\d+)?[""]?)/

// Stock patterns
const STOCK_PATTERNS = [
  /\b(\d+PT\s*(?:C2S|C1S|Uncoated|Natural|Gloss|Matte|Pearl|Metallic|EnduraACE|Kraft)?)/i,
  /\b(\d+LB\s*(?:Gloss|Matte|Dull|Cover|Text|Book|Linen)?(?:\s*(?:Gloss|Matte|Dull|Cover|Text|Book|Linen))?)/i,
  /\b(Brown\s*Kraft)/i,
  /\b(Suede)/i,
  /\b(Silk)/i,
  /\b(Pearl)/i,
  /\b(Plastic)/i,
  /\b(Linen\s*Uncoated)/i,
  /\b(Akuafoil)/i,
  /\b(EndurACE)/i,
]

// Coating/Finish patterns
const COATING_PATTERNS = [
  /\b(Gloss\s*UV)/i,
  /\b(Matte\/Dull\s*Finish)/i,
  /\b(Matte\s*Finish)/i,
  /\b(Dull\s*Finish)/i,
  /\b(Satin\s*AQ)/i,
  /\b(Gloss\s*AQ)/i,
  /\b(UV\s*on\s*\d+-color\s*side(?:\(s\))?)/i,
  /\b(Spot\s*UV)/i,
  /\b(Soft\s*Touch)/i,
  /\b(No\s*Coating)/i,
  /\b(Uncoated)/i,
]

// Scoring patterns
const SCORING_PATTERNS = [
  /\b(FLAT\s*-\s*No\s*Scoring)/i,
  /\b(FLAT)/i,
  /\b(No\s*Scoring)/i,
  /\b(With\s*Scoring)/i,
  /\b(Scored)/i,
]

/**
 * Parse a single product description into attributes
 */
export function parseProductDescription(description: string): ParsedAttributes {
  const result: ParsedAttributes = {
    size: null,
    stock: null,
    coating: null,
    scoring: null,
    colorspec: null,
    other: []
  }
  
  // Extract size (always at the beginning)
  const sizeMatch = description.match(SIZE_PATTERN)
  if (sizeMatch) {
    result.size = normalizeSize(sizeMatch[1])
  }
  
  // Extract stock
  for (const pattern of STOCK_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      result.stock = normalizeStock(match[1])
      break
    }
  }
  
  // Extract coating
  for (const pattern of COATING_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      result.coating = match[1].trim()
      break
    }
  }
  
  // Extract scoring
  for (const pattern of SCORING_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      result.scoring = match[1].trim()
      break
    }
  }
  
  return result
}

/**
 * Normalize size string for consistent comparison
 */
function normalizeSize(size: string): string {
  // Standardize format: remove extra spaces, use lowercase x
  return size
    .replace(/["" ]/g, '')
    .replace(/[xX]/, ' x ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize stock string
 */
function normalizeStock(stock: string): string {
  return stock.replace(/\s+/g, ' ').trim()
}

/**
 * Extract all unique options from a list of product variants
 */
export function extractOptionsFromVariants(variants: Array<{
  product_uuid: string
  product_code: string
  product_description: string
}>): ExtractedOptions {
  const sizes = new Set<string>()
  const stocks = new Set<string>()
  const coatings = new Set<string>()
  const scorings = new Set<string>()
  const variantMap = new Map<string, { uuid: string; code: string; description: string }>()
  
  for (const variant of variants) {
    const parsed = parseProductDescription(variant.product_description)
    
    if (parsed.size) sizes.add(parsed.size)
    if (parsed.stock) stocks.add(parsed.stock)
    if (parsed.coating) coatings.add(parsed.coating)
    if (parsed.scoring) scorings.add(parsed.scoring)
    
    // Create lookup key from all attributes
    const key = createVariantKey(parsed)
    variantMap.set(key, {
      uuid: variant.product_uuid,
      code: variant.product_code,
      description: variant.product_description
    })
  }
  
  return {
    sizes: sortSizes(Array.from(sizes)),
    stocks: Array.from(stocks).sort(),
    coatings: Array.from(coatings).sort(),
    scorings: Array.from(scorings).sort(),
    variantMap
  }
}

/**
 * Create a unique key from parsed attributes
 */
export function createVariantKey(attrs: ParsedAttributes): string {
  return [
    attrs.size || '',
    attrs.stock || '',
    attrs.coating || '',
    attrs.scoring || ''
  ].join('|').toLowerCase()
}

/**
 * Find variant UUID matching selected attributes
 */
export function findMatchingVariant(
  options: ExtractedOptions,
  selectedSize: string | null,
  selectedStock: string | null,
  selectedCoating: string | null,
  selectedScoring: string | null
): { uuid: string; code: string; description: string } | null {
  const key = [
    selectedSize || '',
    selectedStock || '',
    selectedCoating || '',
    selectedScoring || ''
  ].join('|').toLowerCase()
  
  return options.variantMap.get(key) || null
}

/**
 * Sort sizes naturally (4x6 before 5x7 before 8.5x11)
 */
function sortSizes(sizes: string[]): string[] {
  return sizes.sort((a, b) => {
    // Extract first dimension for comparison
    const aNum = parseFloat(a.split('x')[0])
    const bNum = parseFloat(b.split('x')[0])
    if (aNum !== bNum) return aNum - bNum
    
    // If first dim is same, compare second
    const aNum2 = parseFloat(a.split('x')[1] || '0')
    const bNum2 = parseFloat(b.split('x')[1] || '0')
    return aNum2 - bNum2
  })
}
