// Garment weights (in ounces) per piece - from manufacturer specs
export const GARMENT_WEIGHTS: Record<string, number> = {
  // Gildan T-Shirts
  'g-5000': 5.3,    // Heavy Cotton Tee
  'g-64000': 4.5,   // Softstyle Tee
  'g-3000': 5.3,    // Heavy Cotton Tank
  'g-2300': 6.0,    // Ultra Cotton Pocket Tee
  'g-2400': 6.0,    // Ultra Cotton Long Sleeve
  'g-5300': 5.3,    // Heavy Cotton Long Sleeve Pocket
  'g-64400': 4.5,   // Softstyle Long Sleeve
  // Gildan Hoodies & Sweatshirts
  'g-18000': 8.0,   // Heavy Blend Crewneck Sweatshirt
  'g-18200': 8.0,   // Heavy Blend Hoodie
  'g-18600': 8.0,   // Heavy Blend Full-Zip Hoodie
  'g-sf000': 7.2,   // Softstyle Fleece Crewneck
  'g-8800': 5.6,    // DryBlend Jersey Polo
  
  // Next Level
  'nl-3600': 4.3,   // Cotton Crew
  'nl-3600sw': 4.3, // Sueded Crew
  'nl-6210': 4.3,   // CVC Crew
  'nl-3310': 4.3,   // Boyfriend Tee
  'nl-6051': 4.0,   // Tri-Blend Crew
  'nl-6411': 4.3,   // Sueded Long Sleeve
  'nl-9000': 6.5,   // French Terry Hoodie
  'nl-9001': 6.5,   // French Terry Raglan Hoodie
  'nl-9300': 8.0,   // PCH Pullover Hoodie
  'nl-7410': 4.3,   // Inspired Dye Long Sleeve
  
  // BELLA+CANVAS
  'bc-3001': 4.2,   // Unisex Jersey Tee
  'bc-3001cvc': 4.2, // Unisex Heather CVC Tee
  'bc-3413': 3.8,   // Unisex Triblend Tee
  'bc-3005': 4.2,   // Unisex Jersey V-Neck
  'bc-3200': 4.2,   // 3/4-Sleeve Baseball Tee
  'bc-3415': 3.8,   // Unisex Triblend V-Neck
  'bc-3501': 4.2,   // Long Sleeve Jersey Tee
  'bc-3501cvc': 4.2, // Long Sleeve CVC Tee
  'bc-3513': 3.8,   // Triblend Long Sleeve
  'bc-3719': 7.0,   // Fleece Pullover Hoodie
  'bc-3739': 7.0,   // Full-Zip Hoodie
  'bc-3901': 7.0,   // Sponge Fleece Crewneck
  'bc-3945': 7.0,   // Drop Shoulder Crewneck
  
  // American Apparel
  'aa-2001': 4.3,   // Fine Jersey Tee
  'aa-2001cvc': 4.3, // Fine Jersey CVC Tee
  'aa-1301': 6.0,   // Heavyweight Tee
  'aa-1304': 6.0,   // Heavyweight Pocket Tee
  'aa-2007': 4.3,   // Fine Jersey Long Sleeve
  'aa-2003cvc': 4.3, // Fine Jersey V-Neck
  'aa-9001': 10.0,  // California Fleece Hoodie
  'aa-9410': 8.0,   // Vintage Fleece Pullover Hoodie
  'aa-rf491': 8.5,  // ReFlex Fleece Pullover Hoodie
}

// Packaging weight per item
const PACKAGING_WEIGHT = 0.3 // ounces per item

// Get weight for a product
export function getGarmentWeight(productId: string): number {
  return GARMENT_WEIGHTS[productId] || 4.5 // default to average
}

// Calculate total shipping weight (actual + packaging)
export function calculateShippingWeight(productId: string, quantity: number): number {
  const garmentWeight = getGarmentWeight(productId)
  const totalWeight = (garmentWeight + PACKAGING_WEIGHT) * quantity
  return totalWeight
}

// Calculate dimensional weight (DIM = L × W × H / 166)
// Standard t-shirt box: 12" × 10" × 2"
export function calculateDimensionalWeight(): number {
  const length = 12
  const width = 10
  const height = 2
  const dimWeight = (length * width * height) / 166
  return dimWeight // ~1.45 oz per shirt in box
}

// Get billable weight (whichever is greater: actual or dimensional)
export function getBillableWeight(productId: string, quantity: number): number {
  const actualWeight = calculateShippingWeight(productId, quantity)
  const dimWeightPerItem = calculateDimensionalWeight()
  const totalDimWeight = dimWeightPerItem * quantity
  
  return Math.max(actualWeight, totalDimWeight)
}

// USPS Priority Mail rates (flat rate priority)
// Based on weight tiers as of 2025
export const USPS_RATES = {
  '0-1': { price: 15.99, days: '1-3 business days' },
  '1-2': { price: 17.99, days: '1-3 business days' },
  '2-3': { price: 19.99, days: '1-3 business days' },
  '3-5': { price: 24.99, days: '1-3 business days' },
  '5-10': { price: 32.99, days: '2-3 business days' },
  '10-20': { price: 42.99, days: '2-3 business days' },
  '20-70': { price: 62.99, days: '2-3 business days' },
}

// UPS Ground rates (average domestic - varies by zone)
export const UPS_RATES = {
  '0-1': { price: 12.99, days: '5-7 business days' },
  '1-2': { price: 14.99, days: '5-7 business days' },
  '2-3': { price: 16.99, days: '5-7 business days' },
  '3-5': { price: 20.99, days: '3-5 business days' },
  '5-10': { price: 28.99, days: '3-5 business days' },
  '10-20': { price: 38.99, days: '3-5 business days' },
  '20-70': { price: 54.99, days: '3-5 business days' },
}

// UPS 2-Day
export const UPS_2DAY_RATES = {
  '0-1': { price: 28.99, days: '2 business days' },
  '1-2': { price: 32.99, days: '2 business days' },
  '2-3': { price: 36.99, days: '2 business days' },
  '3-5': { price: 44.99, days: '2 business days' },
  '5-10': { price: 62.99, days: '2 business days' },
  '10-20': { price: 84.99, days: '2 business days' },
  '20-70': { price: 124.99, days: '2 business days' },
}

// Get weight bracket key
function getWeightBracket(weightInOz: number): string {
  const weightInLbs = weightInOz / 16
  
  if (weightInLbs <= 1) return '0-1'
  if (weightInLbs <= 2) return '1-2'
  if (weightInLbs <= 3) return '2-3'
  if (weightInLbs <= 5) return '3-5'
  if (weightInLbs <= 10) return '5-10'
  if (weightInLbs <= 20) return '10-20'
  return '20-70'
}

// Calculate shipping cost and delivery time
export function calculateShipping(
  productId: string,
  quantity: number,
  method: 'standard' | 'express' | 'overnight'
): { cost: number; days: string; weight: number } {
  const billableWeight = getBillableWeight(productId, quantity)
  const bracket = getWeightBracket(billableWeight)
  
  let rateTable
  switch (method) {
    case 'standard':
      rateTable = UPS_RATES
      break
    case 'express':
      rateTable = UPS_2DAY_RATES
      break
    case 'overnight':
      // Overnight is 30% more than 2-day
      rateTable = UPS_2DAY_RATES
      break
  }
  
  const rate = rateTable[bracket as keyof typeof rateTable] || { price: 54.99, days: '5-7 business days' }
  let cost = rate.price
  
  // Add overnight premium
  if (method === 'overnight') {
    cost = cost * 1.5 // 50% premium
  }
  
  return {
    cost,
    days: rate.days,
    weight: billableWeight,
  }
}

// Get shipping rates for all options
export function getAllShippingRates(productId: string, quantity: number) {
  return {
    standard: calculateShipping(productId, quantity, 'standard'),
    express: calculateShipping(productId, quantity, 'express'),
    overnight: calculateShipping(productId, quantity, 'overnight'),
  }
}
