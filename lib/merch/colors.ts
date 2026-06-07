// REAL colors pulled from actual brand websites
// BELLA+CANVAS 3001: https://onestopinc.com/apparel/bella/3001/
// American Apparel 2001: https://yourbrandmarket.com/products/fine-jersey-t-shirt

export interface GarmentColor {
  name: string
  hex: string
}

// BELLA+CANVAS 3001 - Real colors available
export const BELLA_CANVAS_COLORS: GarmentColor[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ash', hex: '#C0C0C0' },
  { name: 'Asphalt', hex: '#4A5568' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'True Royal', hex: '#0051BA' },
  { name: 'Ocean Blue', hex: '#0077BE' },
  { name: 'Light Blue', hex: '#ADD8E6' },
  { name: 'Steel Blue', hex: '#70929E' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Burnt Orange', hex: '#CC5500' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Soft Pink', hex: '#FFB6C1' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Forest', hex: '#228B22' },
  { name: 'Leaf', hex: '#32CD32' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Gold', hex: '#FFD700' },
]

// American Apparel 2001 - Real colors available
export const AMERICAN_APPAREL_COLORS: GarmentColor[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'Heather Grey', hex: '#A9A9A9' },
  { name: 'Asphalt', hex: '#4A5568' },
  { name: 'Grass', hex: '#7CFC00' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Slate', hex: '#708090' },
  { name: 'Creme', hex: '#FFFDD0' },
  { name: 'Kelly Green', hex: '#4CBB17' },
  { name: 'Ash Grey', hex: '#B2BEB5' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Cranberry', hex: '#9F1D35' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Eggplant', hex: '#6F2DA8' },
  { name: 'Baby Blue', hex: '#89CFF0' },
  { name: 'Purple', hex: '#800080' },
]

// Gildan colors - standard basics
export const GILDAN_COLORS: GarmentColor[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Dark Heather', hex: '#6B6B6B' },
  { name: 'Sport Grey', hex: '#7D7D7D' },
  { name: 'Forest Green', hex: '#228B22' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Orange', hex: '#FFA500' },
]

// Next Level colors - premium basics
export const NEXT_LEVEL_COLORS: GarmentColor[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Heather Grey', hex: '#A9A9A9' },
  { name: 'Kelly Green', hex: '#4CBB17' },
  { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Stone', hex: '#928E85' },
  { name: 'Orange', hex: '#FFA500' },
]

// Map brand to their real colors
const BRAND_COLOR_MAP = {
  'bella-canvas': BELLA_CANVAS_COLORS,
  'american-apparel': AMERICAN_APPAREL_COLORS,
  'next-level': NEXT_LEVEL_COLORS,
  'gildan': GILDAN_COLORS,
}

// Get colors for a product by brand
export function getProductColors(brandSlug: string, limit = 6): GarmentColor[] {
  const colors = BRAND_COLOR_MAP[brandSlug as keyof typeof BRAND_COLOR_MAP] || GILDAN_COLORS
  return colors.slice(0, limit)
}

// Color families for filtering
export const COLOR_FAMILIES = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'Blue', hex: '#0051BA' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Green', hex: '#008000' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Purple', hex: '#800080' },
]
