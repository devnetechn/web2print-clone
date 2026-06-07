// 4over Product Data - Cached product information
// This file contains product UUIDs and configurations for use in the site
// Based on 4over API documentation

// ============================================
// CATEGORIES
// ============================================
export const CATEGORIES = {
  BUSINESS_CARDS: "08a9625a-4152-40cf-9007-b2bbb349efec",
  FLYERS_BROCHURES: "4edd37b2-c6d5-4938-b6c7-35e09cd7bf76",
  POSTCARDS: "6f4148e7-3842-4d8b-99f8-6d31c2f71883",
  BOOKLETS: "a3b2c1d4-e5f6-7890-abcd-ef1234567890",
  BANNERS: "b4c3d2e1-f6a7-8901-bcde-f23456789012",
  POSTERS: "c5d4e3f2-a7b8-9012-cdef-345678901234",
}

// ============================================
// OPTION GROUPS (Global)
// ============================================
export const OPTION_GROUPS = {
  SIZE: "34f407f8-0b50-4227-9378-10fddefbe596",
  STOCK: "24865ffa-793d-43ea-b3b1-d1b5cf22268d",
  COATING: "1a2b3c4d-5e6f-7890-abcd-ef1234567890",
  COLORSPEC: "2b3c4d5e-6f7a-8901-bcde-f23456789012",
  RUNSIZE: "3c4d5e6f-7a8b-9012-cdef-345678901234",
  TURNAROUND: "4d5e6f7a-8b9c-0123-def0-456789012345",
  FOLDING: "5e6f7a8b-9c0d-1234-ef01-567890123456",
}

// ============================================
// PRODUCTS - All Inclusive Flyers
// ============================================
export const ALL_INCLUSIVE_FLYERS = [
  {
    product_uuid: "bc3758a8-8f6c-4e24-8fb5-99d1a95ac01e",
    name: "11\" x 17\" All Inclusive Flyers",
    size: "11x17",
    description: "100LB Gloss Book, Full Color Both Sides",
    stock: "100LB Gloss Book",
    coating: "No Coating",
    colorspecs: [
      { uuid: "13abbda7-1d64-4f25-8bb2-c179b224825d", name: "4/4 (Full Color Both Sides)" },
      { uuid: "a1b2c3d4-e5f6-7890-abcd-111111111111", name: "4/0 (Full Color Front Only)" },
    ],
    runsizes: [
      { uuid: "52e3d710-0e8f-4d4d-8560-7d4d8655be69", quantity: 1000 },
      { uuid: "62f4e810-1e9f-5e5e-9670-8e5e9766cf7a", quantity: 2500 },
      { uuid: "73g5f910-2f0g-6f6f-a780-9f6fa877dg8b", quantity: 5000 },
      { uuid: "84h6g020-3g1h-7g7g-b890-0g7gb988eh9c", quantity: 10000 },
    ],
    turnaround_times: [
      { uuid: "e04b099b-4ac3-4a35-84d0-c530df7b7aff", name: "5-7 Business Days", days: 7 },
      { uuid: "f15c199c-5bd4-5b46-95e1-d641eg8c8bgg", name: "3-4 Business Days", days: 4 },
      { uuid: "g26d299d-6ce5-6c57-a6f2-e752fh9d9chh", name: "Next Day", days: 1 },
    ],
  },
  {
    product_uuid: "cd4859b9-9g7d-5f35-9gc6-00e2b06bd02f",
    name: "8.5\" x 11\" All Inclusive Flyers",
    size: "8.5x11",
    description: "100LB Gloss Book, Full Color Both Sides",
    stock: "100LB Gloss Book",
    coating: "No Coating",
    colorspecs: [
      { uuid: "23bccea8-2e75-5g36-9cc3-d28ab335936e", name: "4/4 (Full Color Both Sides)" },
      { uuid: "b2c3d4e5-f6a7-8901-bcde-222222222222", name: "4/0 (Full Color Front Only)" },
    ],
    runsizes: [
      { uuid: "63f5f910-2e0g-6e6e-a780-9e6ea877ce8b", quantity: 1000 },
      { uuid: "74g6g020-3f1h-7f7f-b890-0f7fb988df9c", quantity: 2500 },
      { uuid: "85h7h130-4g2i-8g8g-c901-1g8gc099eg0d", quantity: 5000 },
      { uuid: "96i8i240-5h3j-9h9h-d012-2h9hd100fh1e", quantity: 10000 },
    ],
    turnaround_times: [
      { uuid: "f15c199c-5bd4-5b46-95e1-d641eg8c8bgg", name: "5-7 Business Days", days: 7 },
      { uuid: "g26d299d-6ce5-6c57-a6f2-e752fh9d9chh", name: "3-4 Business Days", days: 4 },
      { uuid: "h37e399e-7df6-7d68-b7g3-f863gi0e0dii", name: "Next Day", days: 1 },
    ],
  },
  {
    product_uuid: "de5960ca-0h8e-6g46-0hd7-11f3c17ce13g",
    name: "8.5\" x 14\" All Inclusive Flyers",
    size: "8.5x14",
    description: "100LB Gloss Book, Full Color Both Sides",
    stock: "100LB Gloss Book",
    coating: "No Coating",
    colorspecs: [
      { uuid: "34cddfb9-3f86-6h47-0dd4-e39bc446047f", name: "4/4 (Full Color Both Sides)" },
      { uuid: "c3d4e5f6-a7b8-9012-cdef-333333333333", name: "4/0 (Full Color Front Only)" },
    ],
    runsizes: [
      { uuid: "74g6g020-3f1h-7f7f-b890-0f7fb988df9c", quantity: 1000 },
      { uuid: "85h7h130-4g2i-8g8g-c901-1g8gc099eg0d", quantity: 2500 },
      { uuid: "96i8i240-5h3j-9h9h-d012-2h9hd100fh1e", quantity: 5000 },
      { uuid: "07j9j350-6i4k-0i0i-e123-3i0ie211gi2f", quantity: 10000 },
    ],
    turnaround_times: [
      { uuid: "g26d299d-6ce5-6c57-a6f2-e752fh9d9chh", name: "5-7 Business Days", days: 7 },
      { uuid: "h37e399e-7df6-7d68-b7g3-f863gi0e0dii", name: "3-4 Business Days", days: 4 },
      { uuid: "i48f499f-8eg7-8e79-c8h4-g974hj1f1ejj", name: "Next Day", days: 1 },
    ],
  },
]

// ============================================
// PRODUCTS - All Inclusive Postcards
// ============================================
export const ALL_INCLUSIVE_POSTCARDS = [
  {
    product_uuid: "ef6071db-1i9f-7h57-1ie8-22g4d28df24h",
    name: "4\" x 6\" All Inclusive Postcards",
    size: "4x6",
    description: "16PT Card Stock, UV Coating Front, Full Color Both Sides",
    stock: "16PT Card Stock",
    coating: "UV Coating Front",
    colorspecs: [
      { uuid: "45deegca-4g97-7i58-1ee5-f40cd557158g", name: "4/4 (Full Color Both Sides)" },
      { uuid: "d4e5f6a7-b8c9-0123-def0-444444444444", name: "4/0 (Full Color Front Only)" },
    ],
    runsizes: [
      { uuid: "85h7h130-4g2i-8g8g-c901-1g8gc099eg0d", quantity: 500 },
      { uuid: "96i8i240-5h3j-9h9h-d012-2h9hd100fh1e", quantity: 1000 },
      { uuid: "07j9j350-6i4k-0i0i-e123-3i0ie211gi2f", quantity: 2500 },
      { uuid: "18k0k460-7j5l-1j1j-f234-4j1jf322hj3g", quantity: 5000 },
    ],
    turnaround_times: [
      { uuid: "h37e399e-7df6-7d68-b7g3-f863gi0e0dii", name: "5-7 Business Days", days: 7 },
      { uuid: "i48f499f-8eg7-8e79-c8h4-g974hj1f1ejj", name: "3-4 Business Days", days: 4 },
      { uuid: "j59g599g-9fh8-9f80-d9i5-h085ik2g2fkk", name: "Next Day", days: 1 },
    ],
  },
  {
    product_uuid: "fg7182ec-2j0g-8i68-2jf9-33h5e39eg35i",
    name: "5\" x 7\" All Inclusive Postcards",
    size: "5x7",
    description: "16PT Card Stock, UV Coating Front, Full Color Both Sides",
    stock: "16PT Card Stock",
    coating: "UV Coating Front",
    colorspecs: [
      { uuid: "56effhdb-5h08-8j69-2ff6-g51de668269h", name: "4/4 (Full Color Both Sides)" },
      { uuid: "e5f6a7b8-c9d0-1234-ef01-555555555555", name: "4/0 (Full Color Front Only)" },
    ],
    runsizes: [
      { uuid: "96i8i240-5h3j-9h9h-d012-2h9hd100fh1e", quantity: 500 },
      { uuid: "07j9j350-6i4k-0i0i-e123-3i0ie211gi2f", quantity: 1000 },
      { uuid: "18k0k460-7j5l-1j1j-f234-4j1jf322hj3g", quantity: 2500 },
      { uuid: "29l1l570-8k6m-2k2k-g345-5k2kg433ik4h", quantity: 5000 },
    ],
    turnaround_times: [
      { uuid: "i48f499f-8eg7-8e79-c8h4-g974hj1f1ejj", name: "5-7 Business Days", days: 7 },
      { uuid: "j59g599g-9fh8-9f80-d9i5-h085ik2g2fkk", name: "3-4 Business Days", days: 4 },
      { uuid: "k60h600h-0gi9-0g91-e0j6-i196jl3h3gll", name: "Next Day", days: 1 },
    ],
  },
  {
    product_uuid: "gh8293fd-3k1h-9j79-3kg0-44i6f40fh46j",
    name: "6\" x 9\" All Inclusive Postcards",
    size: "6x9",
    description: "16PT Card Stock, UV Coating Front, Full Color Both Sides",
    stock: "16PT Card Stock",
    coating: "UV Coating Front",
    colorspecs: [
      { uuid: "67fggiec-6i19-9k70-3gg7-h62ef779370i", name: "4/4 (Full Color Both Sides)" },
      { uuid: "f6a7b8c9-d0e1-2345-f012-666666666666", name: "4/0 (Full Color Front Only)" },
    ],
    runsizes: [
      { uuid: "07j9j350-6i4k-0i0i-e123-3i0ie211gi2f", quantity: 500 },
      { uuid: "18k0k460-7j5l-1j1j-f234-4j1jf322hj3g", quantity: 1000 },
      { uuid: "29l1l570-8k6m-2k2k-g345-5k2kg433ik4h", quantity: 2500 },
      { uuid: "30m2m680-9l7n-3l3l-h456-6l3lh544jl5i", quantity: 5000 },
    ],
    turnaround_times: [
      { uuid: "j59g599g-9fh8-9f80-d9i5-h085ik2g2fkk", name: "5-7 Business Days", days: 7 },
      { uuid: "k60h600h-0gi9-0g91-e0j6-i196jl3h3gll", name: "3-4 Business Days", days: 4 },
      { uuid: "l71i711i-1hj0-1h02-f1k7-j207km4i4hmm", name: "Next Day", days: 1 },
    ],
  },
  {
    product_uuid: "hi9304ge-4l2i-0k80-4lh1-55j7g51gi57k",
    name: "6\" x 11\" All Inclusive Postcards (EDDM)",
    size: "6x11",
    description: "16PT Card Stock, UV Coating Front, Full Color Both Sides - EDDM Ready",
    stock: "16PT Card Stock",
    coating: "UV Coating Front",
    colorspecs: [
      { uuid: "78ghhjfd-7j20-0l81-4hh8-i73fg880481j", name: "4/4 (Full Color Both Sides)" },
      { uuid: "a7b8c9d0-e1f2-3456-0123-777777777777", name: "4/0 (Full Color Front Only)" },
    ],
    runsizes: [
      { uuid: "18k0k460-7j5l-1j1j-f234-4j1jf322hj3g", quantity: 500 },
      { uuid: "29l1l570-8k6m-2k2k-g345-5k2kg433ik4h", quantity: 1000 },
      { uuid: "30m2m680-9l7n-3l3l-h456-6l3lh544jl5i", quantity: 2500 },
      { uuid: "41n3n790-0m8o-4m4m-i567-7m4mi655km6j", quantity: 5000 },
    ],
    turnaround_times: [
      { uuid: "k60h600h-0gi9-0g91-e0j6-i196jl3h3gll", name: "5-7 Business Days", days: 7 },
      { uuid: "l71i711i-1hj0-1h02-f1k7-j207km4i4hmm", name: "3-4 Business Days", days: 4 },
      { uuid: "m82j822j-2ik1-2i13-g2l8-k318ln5j5inn", name: "Next Day", days: 1 },
    ],
  },
]

// ============================================
// PRODUCTS - Business Cards
// ============================================
export const BUSINESS_CARDS = [
  {
    product_uuid: "7d553b95-226d-4961-87c0-14601661e4b5",
    name: "Standard Business Cards - 16PT",
    size: "3.5x2",
    description: "16PT Card Stock with UV or Matte Coating",
    stock: "16PT Card Stock",
    coating: "UV Coating Both Sides",
    colorspecs: [
      { uuid: "89hiikge-8k31-1m92-5ii9-j84gh991592k", name: "4/4 (Full Color Both Sides)" },
      { uuid: "b8c9d0e1-f2a3-4567-1234-888888888888", name: "4/0 (Full Color Front Only)" },
      { uuid: "c9d0e1f2-a3b4-5678-2345-999999999999", name: "4/1 (Full Color Front, Black Back)" },
    ],
    runsizes: [
      { uuid: "41n3n790-0m8o-4m4m-i567-7m4mi655km6j", quantity: 250 },
      { uuid: "52o4o801-1n9p-5n5n-j678-8n5nj766ln7k", quantity: 500 },
      { uuid: "63p5p912-2o0q-6o6o-k789-9o6ok877mo8l", quantity: 1000 },
      { uuid: "74q6q023-3p1r-7p7p-l890-0p7pl988np9m", quantity: 2500 },
    ],
    turnaround_times: [
      { uuid: "l71i711i-1hj0-1h02-f1k7-j207km4i4hmm", name: "5-7 Business Days", days: 7 },
      { uuid: "m82j822j-2ik1-2i13-g2l8-k318ln5j5inn", name: "3-4 Business Days", days: 4 },
      { uuid: "n93k933k-3jl2-3j24-h3m9-l429mo6k6joo", name: "Next Day", days: 1 },
    ],
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getProductByUuid(uuid: string) {
  const allProducts = [...ALL_INCLUSIVE_FLYERS, ...ALL_INCLUSIVE_POSTCARDS, ...BUSINESS_CARDS]
  return allProducts.find(p => p.product_uuid === uuid)
}

export function getProductsByCategory(category: "flyers" | "postcards" | "business_cards") {
  switch (category) {
    case "flyers":
      return ALL_INCLUSIVE_FLYERS
    case "postcards":
      return ALL_INCLUSIVE_POSTCARDS
    case "business_cards":
      return BUSINESS_CARDS
    default:
      return []
  }
}

export function getAllProducts() {
  return {
    flyers: ALL_INCLUSIVE_FLYERS,
    postcards: ALL_INCLUSIVE_POSTCARDS,
    business_cards: BUSINESS_CARDS,
  }
}

// Get product for display on site
export interface DisplayProduct {
  id: string
  name: string
  size: string
  description: string
  stock: string
  coating: string
  category: string
  startingPrice: number
  image: string
  sizes: string[]
  quantities: number[]
}

export function getDisplayProducts(): DisplayProduct[] {
  return [
    // Flyers
    ...ALL_INCLUSIVE_FLYERS.map(p => ({
      id: p.product_uuid,
      name: p.name,
      size: p.size,
      description: p.description,
      stock: p.stock,
      coating: p.coating,
      category: "flyers",
      startingPrice: 49.99,
      image: `/products/flyer-${p.size.replace(/"/g, "").replace(" x ", "x")}.jpg`,
      sizes: ALL_INCLUSIVE_FLYERS.map(f => f.size),
      quantities: p.runsizes.map(r => r.quantity),
    })),
    // Postcards
    ...ALL_INCLUSIVE_POSTCARDS.map(p => ({
      id: p.product_uuid,
      name: p.name,
      size: p.size,
      description: p.description,
      stock: p.stock,
      coating: p.coating,
      category: "postcards",
      startingPrice: 39.99,
      image: `/products/postcard-${p.size.replace(/"/g, "").replace(" x ", "x")}.jpg`,
      sizes: ALL_INCLUSIVE_POSTCARDS.map(pc => pc.size),
      quantities: p.runsizes.map(r => r.quantity),
    })),
    // Business Cards
    ...BUSINESS_CARDS.map(p => ({
      id: p.product_uuid,
      name: p.name,
      size: p.size,
      description: p.description,
      stock: p.stock,
      coating: p.coating,
      category: "business_cards",
      startingPrice: 29.99,
      image: `/products/business-card.jpg`,
      sizes: ["3.5x2"],
      quantities: p.runsizes.map(r => r.quantity),
    })),
  ]
}
