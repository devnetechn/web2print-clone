// Default markup percentages by product category
// You can adjust these in the admin dashboard
export const DEFAULT_MARKUPS: Record<string, number> = {
  "business-cards": 0.40,      // 40% markup
  "postcards": 0.40,
  "flyers": 0.35,
  "brochures": 0.35,
  "banners": 0.50,
  "signs": 0.50,
  "posters": 0.45,
  "booklets": 0.40,
  "stickers": 0.45,
  "labels": 0.45,
  "apparel": 0.50,
  "promotional": 0.55,
  "default": 0.40,             // Default 40% markup
}

import { getCategoryBySlug } from "@/lib/4over-config"

// Apply markup to 4over wholesale price -> retail price.
// Preferred model: per-category markupMultiplier from lib/4over-config.ts
// (retail = wholesale * multiplier). Falls back to the legacy percentage map.
export function applyMarkup(
  fourOverPrice: number,
  category?: string,
  customMarkup?: number
): number {
  let markedUpPrice: number

  if (customMarkup != null) {
    // customMarkup is a percentage (e.g. 0.4 = +40%)
    markedUpPrice = fourOverPrice * (1 + customMarkup)
  } else {
    const configured = category ? getCategoryBySlug(category) : undefined
    if (configured) {
      markedUpPrice = fourOverPrice * configured.markupMultiplier
    } else {
      const markup = DEFAULT_MARKUPS[category || "default"] ?? DEFAULT_MARKUPS.default
      markedUpPrice = fourOverPrice * (1 + markup)
    }
  }

  // Round to 2 decimal places
  return Math.round(markedUpPrice * 100) / 100
}

// Calculate your profit
export function calculateProfit(
  fourOverPrice: number,
  sellingPrice: number
): number {
  return Math.round((sellingPrice - fourOverPrice) * 100) / 100
}

// Get markup percentage from prices
export function getMarkupPercentage(
  fourOverPrice: number,
  sellingPrice: number
): number {
  if (fourOverPrice === 0) return 0
  return Math.round(((sellingPrice - fourOverPrice) / fourOverPrice) * 100)
}
