// Maps 4over API categories to parent categories based on 4over.com website structure
// This allows us to display products in a hierarchy like the 4over website

export interface CategoryGroup {
  name: string
  slug: string
  description: string
  icon?: string
  subcategories: string[] // Lowercase normalized names from 4over API
}

// Parent categories matching 4over.com navigation exactly
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Majestic Products",
    slug: "majestic-products",
    description: "Premium finishes including raised foil, spot UV, and specialty effects",
    icon: "sparkles",
    subcategories: [
      // These are non-business-card majestic products
      "raised foil postcards",
      "raised foil flyers",
      "raised spot uv postcards",
      "raised spot uv flyers",
      "dual raised postcards",
      "dual raised flyers",
      "akuafoil postcards",
      "akuafoil flyers",
      "foil worx postcards",
      "foil worx flyers",
    ]
  },
  {
    name: "Business Cards",
    slug: "business-cards",
    description: "Professional business cards in various styles and finishes",
    icon: "credit-card",
    subcategories: [
      // All 21 business card types from 4over.com
      "standard business cards",
      "business cards",
      "dual raised business cards",
      "suede business cards",
      "silk business cards",
      "raised spot uv business cards",
      "painted edge business cards",
      "foil worx business cards",
      "raised foil business cards",
      "linen uncoated business cards",
      "brown kraft business cards",
      "natural business cards",
      "endurace business cards",
      "pearl business cards",
      "fold-over business cards",
      "foldover business cards",
      "plastic business cards",
      "magnet business cards",
      "leaf business cards",
      "oval business cards",
      "circle business cards",
      "akuafoil business cards",
      // Legacy/partial matches
      "pearl cards",
      "silk cards",
      "suede cards",
      "natural cards",
      "plastic cards",
      "painted edge cards",
      "brown kraft cards",
      "linen uncoated",
    ]
  },
  {
    name: "Marketing Products",
    slug: "marketing-products",
    description: "Postcards, flyers, brochures and more for your marketing needs",
    icon: "megaphone",
    subcategories: [
      "postcards",
      "flyers and brochures",
      "presentation folders",
      "announcement cards",
      "booklets",
      "bookmarks",
      "calendars",
      "catalogs",
      "counter cards",
      "door hangers",
      "envelope",
      "envelopes",
      "event tickets",
      "greeting cards",
      "hang tags",
      "letterheads",
      "magnets",
      "menus",
      "ncr forms",
      "notepads",
      "posters",
      "large posters",
      "rack cards",
      "sell sheets",
      "social cards",
      "table tent",
      "table tent cards",
      "trading cards",
      "tear off cards",
      "header cards",
    ]
  },
  {
    name: "Signs & Banners",
    slug: "signs-banners",
    description: "Indoor and outdoor signage, banners, and displays",
    icon: "flag",
    subcategories: [
      "signs",
      "acrylic signs",
      "sidewalk signs",
      "indoor banner",
      "outdoor banner",
      "fabric banners",
      "banners with stand",
      "flags",
      "adhesive vinyl",
      "8mil window cling",
      "7mil window cling",
      "window cling",
      "perforated window film",
      "aluminum",
      "backlit posters",
      "mounted canvas",
      "displays",
      "event tents",
      "table covers",
      "fan cutouts",
      "car magnets",
    ]
  },
  {
    name: "Boxes & Packaging",
    slug: "boxes-packaging",
    description: "Custom boxes and product packaging solutions",
    icon: "package",
    subcategories: [
      "packaging",
      "custom boxes",
      "boxes",
    ]
  },
  {
    name: "Roll Labels & Stickers",
    slug: "roll-labels-stickers",
    description: "Custom roll labels and sticker printing",
    icon: "tag",
    subcategories: [
      "roll labels",
      "stickers",
      "buttons",
    ]
  },
  {
    name: "Promo Products",
    slug: "promo-products",
    description: "Promotional items and branded merchandise",
    icon: "gift",
    subcategories: [
      "promotional products",
      "t-shirts",
      "tote bags",
      "mugs",
    ]
  },
  {
    name: "Direct Mail Services",
    slug: "direct-mail-services",
    description: "EDDM and direct mail marketing solutions",
    icon: "mail",
    subcategories: [
      "eddm",
      "mailing services",
      "variable data",
    ]
  },
]

// Categories to hide completely (internal/system categories)
export const HIDDEN_CATEGORIES = [
  "proofs",
  "additional hardware", 
  "sample request",
  "inventory items",
  "marketplace",
  "endurace",
]

// Get parent category for a subcategory name
export function getParentCategory(subcategoryName: string): CategoryGroup | null {
  const normalizedName = subcategoryName.toLowerCase().trim()
  
  // Check if it's a hidden category
  if (HIDDEN_CATEGORIES.includes(normalizedName)) {
    return null
  }
  
  // Special handling: anything with "business cards" in the name goes to Business Cards
  if (normalizedName.includes("business card")) {
    return CATEGORY_GROUPS.find(g => g.slug === "business-cards") || null
  }
  
  // Exact match first
  for (const group of CATEGORY_GROUPS) {
    const found = group.subcategories.some(sub => sub === normalizedName)
    if (found) return group
  }
  
  // Partial match - check if name contains or is contained by subcategory
  for (const group of CATEGORY_GROUPS) {
    const found = group.subcategories.some(
      sub => normalizedName.includes(sub) || sub.includes(normalizedName)
    )
    if (found) return group
  }
  
  return null
}

// Get all parent category names
export function getParentCategoryNames(): string[] {
  return CATEGORY_GROUPS.map(g => g.name)
}

// Get parent category by slug
export function getParentCategoryBySlug(slug: string): CategoryGroup | null {
  return CATEGORY_GROUPS.find(g => g.slug === slug) || null
}

// Group products by parent category
export function groupProductsByParentCategory(products: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}
  const other: any[] = []
  
  // Initialize groups
  for (const group of CATEGORY_GROUPS) {
    grouped[group.name] = []
  }
  
  for (const product of products) {
    const productCategory = product.category || ""
    const parent = getParentCategory(productCategory)
    
    if (parent) {
      grouped[parent.name].push(product)
    } else {
      other.push(product)
    }
  }
  
  // Add "Other" if there are uncategorized products
  if (other.length > 0) {
    grouped["Other Products"] = other
  }
  
  // Remove empty groups
  for (const key of Object.keys(grouped)) {
    if (grouped[key].length === 0) {
      delete grouped[key]
    }
  }
  
  return grouped
}

// Get icon name for a category
export function getCategoryIcon(categoryName: string): string {
  const parent = getParentCategory(categoryName)
  return parent?.icon || "printer"
}
