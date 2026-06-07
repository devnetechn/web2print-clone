// Florida TShirts 2025 Pricing - Fully Functional Calculator

// ============================================
// SCREEN PRINTING PRICING
// ============================================
// Per piece per location pricing
export const SCREEN_PRINT_PRICING = {
  // [minQty, maxQty]: { colors: price }
  tiers: [
    { min: 24, max: 35, prices: { 1: 1.74, 2: 1.99, 3: 2.15 } },
    { min: 36, max: 71, prices: { 1: 1.37, 2: 1.56, 3: 1.72, 4: 1.88 } },
    { min: 72, max: 143, prices: { 1: 1.13, 2: 1.34, 3: 1.54, 4: 1.60, 5: 1.71, 6: 1.81 }, extraColor: 0.15 },
    { min: 144, max: 239, prices: { 1: 1.05, 2: 1.31, 3: 1.42, 4: 1.58, 5: 1.65, 6: 1.70 }, extraColor: 0.15 },
    { min: 240, max: 359, prices: { 1: 0.99, 2: 1.15, 3: 1.36, 4: 1.42, 5: 1.52, 6: 1.63 }, extraColor: 0.15 },
    { min: 360, max: 499, prices: { 1: 0.94, 2: 1.10, 3: 1.16, 4: 1.26, 5: 1.36, 6: 1.47 }, extraColor: 0.10 },
    { min: 500, max: 1199, prices: { 1: 0.77, 2: 0.89, 3: 0.93, 4: 0.98, 5: 1.10, 6: 1.15 }, extraColor: 0.10 },
    { min: 1200, max: 2499, prices: { 1: 0.60, 2: 0.70, 3: 0.80, 4: 0.85, 5: 0.90, 6: 0.95 }, extraColor: 0.10 },
    { min: 2500, max: 4999, prices: { 1: 0.41, 2: 0.48, 3: 0.59, 4: 0.64, 5: 0.69, 6: 0.74 }, extraColor: 0.10 },
    { min: 5000, max: 9999, prices: { 1: 0.35, 2: 0.43, 3: 0.53, 4: 0.59, 5: 0.64, 6: 0.69 }, extraColor: 0.10 },
    { min: 10000, max: Infinity, prices: { 1: 0.33, 2: 0.42, 3: 0.51, 4: 0.56, 5: 0.62, 6: 0.66 }, extraColor: 0.10 },
  ],
  minimums: {
    '1-3colors': 24,
    '4colors': 36,
    '5+colors': 72,
  },
  orderMinimum: 75, // per print location
  setupFees: {
    spotColorScreen: 10,
    spotColorFilm: 8, // per color
    simulatedProcess: 20, // per color
    fourColorProcessScreens: 20, // 72 pc min
    fourColorProcessFilm: 10,
  },
  additionalCharges: {
    sweatshirtsHoodies: 1.10,
    jackets: 1.20,
    masksNeckGaiters: 0.15,
    towelsInfantShorts: 0.15,
    nylonMeshPoly: 0.15,
    onAbovePocket: 0.15,
    bagsSleevesLegAprons: 0.30,
    metallicInk: 0.30,
    stretchPolyBlockerSofthand: 0.15,
    flashingDarkGarments: 0.20,
  },
};

// ============================================
// EMBROIDERY PRICING
// ============================================
export const EMBROIDERY_PRICING = {
  // Base price for up to 5999 stitches
  tiers: [
    { min: 6, max: 6, basePrice: 4.50, per1000Extra: 0.50 },
    { min: 7, max: 12, basePrice: 3.50, per1000Extra: 0.45 },
    { min: 13, max: 24, basePrice: 3.20, per1000Extra: 0.40 },
    { min: 25, max: 60, basePrice: 2.95, per1000Extra: 0.35 },
    { min: 61, max: 120, basePrice: 2.65, per1000Extra: 0.30 },
    { min: 121, max: 249, basePrice: 2.40, per1000Extra: 0.30 },
    { min: 250, max: Infinity, basePrice: 2.30, per1000Extra: 0.25 },
  ],
  baseStitches: 5999,
  minimum: 6,
  orderMinimum: 40,
  setupFees: {
    digitizing: 40, // up to 2 changes
    sewoutSample: 20, // up to 15k stitches
  },
  additionalCharges: {
    beaniesFleeceSolvy: 0.50,
    personalization: 0.50,
    individualBagging: 0.75,
    '3dPuff': 10, // $10-$20
    embTapeEdits: 5, // up to 2 revisions
    metallicThread: 0.25, // $0.25-$0.30
  },
};

// ============================================
// DTF (Direct-to-Film) PRICING
// ============================================
export const DTF_PRICING = {
  // Small: up to 5"x5", Large: up to 14"x16"
  tiers: [
    { min: 1, max: 5, small: 5.45, large: 10.23 },
    { min: 6, max: 11, small: 6.25, large: 11.29 },
    { min: 12, max: 23, small: 7.30, large: 12.68 },
    { min: 24, max: 47, small: 7.95, large: 13.49 },
    { min: 48, max: 143, small: 9.35, large: 15.14 },
    { min: 144, max: 300, small: 10.40, large: 16.74 },
    { min: 301, max: Infinity, small: 11.40, large: 18.83 },
  ],
  sheets: {
    '22x12': 3.45,
    '22x24': 3.95,
    '22x36': 4.55,
  },
  minimum: 1, // no minimum
  orderMinimum: 25,
  setupFee: 0, // no setups
  additionalCharges: {
    onPocketOrSleeves: 0.50,
    hatsBagsMaterial: 0.50,
    sheetPrepFee: 5,
  },
};

// ============================================
// ART / DESIGN CHARGES
// ============================================
export const ART_CHARGES = {
  simpleDesign: 30,
  complexDesign: 75,
  mockUp: 25, // up to 2 revisions
  pantoneColorMatch: 15, // per color
  simProcessSeps: 20,
  colorChanges: 10, // per location, 24 pc min
  sortingSeparating: 10, // per box
  samplePrint: 8, // per color per location
  dropShipping: 20, // per location, max 20 locations
  unbagging: 0.15, // per pack
  numbering: 0.25, // per digit (heat transfer)
  playerNames: 0.15, // heat transfer
  insideTagPrints: 0.15, // min 48 pcs + setups ($50 setup)
  insideTagSetup: 50,
};

// ============================================
// CALCULATOR FUNCTIONS
// ============================================

export interface ScreenPrintQuote {
  quantity: number;
  colors: number;
  locations: number;
  garmentType: 'standard' | 'hoodie' | 'jacket' | 'poly' | 'pocket';
  includeSetup: boolean;
}

export function calculateScreenPrintPrice(params: ScreenPrintQuote): {
  pricePerPiece: number;
  setupCost: number;
  totalPrintCost: number;
  minimumMet: boolean;
  error?: string;
} {
  const { quantity, colors, locations, garmentType, includeSetup } = params;
  
  // Check minimums
  let minRequired = 24;
  if (colors >= 5) minRequired = 72;
  else if (colors === 4) minRequired = 36;
  
  if (quantity < minRequired) {
    return {
      pricePerPiece: 0,
      setupCost: 0,
      totalPrintCost: 0,
      minimumMet: false,
      error: `Minimum ${minRequired} pieces required for ${colors} color(s)`,
    };
  }
  
  // Find tier
  const tier = SCREEN_PRINT_PRICING.tiers.find(t => quantity >= t.min && quantity <= t.max);
  if (!tier) {
    return { pricePerPiece: 0, setupCost: 0, totalPrintCost: 0, minimumMet: false, error: 'Invalid quantity' };
  }
  
  // Get base price for colors
  let pricePerPiece = 0;
  const maxColorInTier = Math.max(...Object.keys(tier.prices).map(Number));
  
  if (colors <= maxColorInTier) {
    pricePerPiece = tier.prices[colors as keyof typeof tier.prices] || 0;
  } else if (tier.extraColor) {
    // Calculate extra colors beyond 6
    pricePerPiece = tier.prices[6] + ((colors - 6) * tier.extraColor);
  } else {
    return { pricePerPiece: 0, setupCost: 0, totalPrintCost: 0, minimumMet: false, error: `${colors} colors not available for this quantity` };
  }
  
  // Add garment type surcharges
  if (garmentType === 'hoodie') pricePerPiece += SCREEN_PRINT_PRICING.additionalCharges.sweatshirtsHoodies;
  if (garmentType === 'jacket') pricePerPiece += SCREEN_PRINT_PRICING.additionalCharges.jackets;
  if (garmentType === 'poly') pricePerPiece += SCREEN_PRINT_PRICING.additionalCharges.nylonMeshPoly;
  if (garmentType === 'pocket') pricePerPiece += SCREEN_PRINT_PRICING.additionalCharges.onAbovePocket;
  
  // Multiply by locations
  const totalPricePerPiece = pricePerPiece * locations;
  
  // Calculate setup costs
  let setupCost = 0;
  if (includeSetup) {
    setupCost = (SCREEN_PRINT_PRICING.setupFees.spotColorScreen + 
                 (SCREEN_PRINT_PRICING.setupFees.spotColorFilm * colors)) * locations;
  }
  
  const totalPrintCost = (totalPricePerPiece * quantity) + setupCost;
  
  return {
    pricePerPiece: totalPricePerPiece,
    setupCost,
    totalPrintCost,
    minimumMet: true,
  };
}

export interface EmbroideryQuote {
  quantity: number;
  stitchCount: number;
  locations: number;
  includeDigitizing: boolean;
  is3dPuff: boolean;
}

export function calculateEmbroideryPrice(params: EmbroideryQuote): {
  pricePerPiece: number;
  setupCost: number;
  totalEmbroideryyCost: number;
  minimumMet: boolean;
  error?: string;
} {
  const { quantity, stitchCount, locations, includeDigitizing, is3dPuff } = params;
  
  if (quantity < EMBROIDERY_PRICING.minimum) {
    return {
      pricePerPiece: 0,
      setupCost: 0,
      totalEmbroideryyCost: 0,
      minimumMet: false,
      error: `Minimum ${EMBROIDERY_PRICING.minimum} pieces required for embroidery`,
    };
  }
  
  // Find tier
  const tier = EMBROIDERY_PRICING.tiers.find(t => quantity >= t.min && quantity <= t.max);
  if (!tier) {
    return { pricePerPiece: 0, setupCost: 0, totalEmbroideryyCost: 0, minimumMet: false, error: 'Invalid quantity' };
  }
  
  // Calculate price based on stitch count
  let pricePerPiece = tier.basePrice;
  if (stitchCount > EMBROIDERY_PRICING.baseStitches) {
    const extraThousands = Math.ceil((stitchCount - EMBROIDERY_PRICING.baseStitches) / 1000);
    pricePerPiece += extraThousands * tier.per1000Extra;
  }
  
  // Add 3D puff if selected
  if (is3dPuff) pricePerPiece += 10;
  
  // Multiply by locations
  const totalPricePerPiece = pricePerPiece * locations;
  
  // Calculate setup costs
  let setupCost = 0;
  if (includeDigitizing) {
    setupCost = EMBROIDERY_PRICING.setupFees.digitizing * locations;
  }
  
  const totalEmbroideryyCost = (totalPricePerPiece * quantity) + setupCost;
  
  return {
    pricePerPiece: totalPricePerPiece,
    setupCost,
    totalEmbroideryyCost,
    minimumMet: true,
  };
}

export interface DTFQuote {
  quantity: number;
  size: 'small' | 'large';
  locations: number;
}

export function calculateDTFPrice(params: DTFQuote): {
  pricePerPiece: number;
  totalDTFCost: number;
  minimumMet: boolean;
} {
  const { quantity, size, locations } = params;
  
  // Find tier
  const tier = DTF_PRICING.tiers.find(t => quantity >= t.min && quantity <= t.max);
  if (!tier) {
    return { pricePerPiece: 0, totalDTFCost: 0, minimumMet: false };
  }
  
  const pricePerPiece = (size === 'small' ? tier.small : tier.large) * locations;
  const totalDTFCost = pricePerPiece * quantity;
  
  // Check order minimum
  const minimumMet = totalDTFCost >= DTF_PRICING.orderMinimum;
  
  return {
    pricePerPiece,
    totalDTFCost: Math.max(totalDTFCost, DTF_PRICING.orderMinimum),
    minimumMet,
  };
}

// ============================================
// FULL ORDER CALCULATOR
// ============================================

export interface OrderItem {
  productId: string;
  productName: string;
  baseCost: number; // garment cost
  quantity: number;
  printMethod: 'screenprint' | 'embroidery' | 'dtf';
  printDetails: {
    colors?: number;
    stitchCount?: number;
    size?: 'small' | 'large';
    locations: number;
    garmentType?: 'standard' | 'hoodie' | 'jacket' | 'poly' | 'pocket';
  };
}

export interface OrderQuote {
  items: {
    productName: string;
    quantity: number;
    garmentCost: number;
    printCost: number;
    totalItemCost: number;
    pricePerPiece: number;
  }[];
  subtotal: number;
  setupFees: number;
  artFees: number;
  grandTotal: number;
}

export function calculateFullOrder(
  items: OrderItem[],
  options: {
    includeSetup: boolean;
    includeDigitizing: boolean;
    artCharge?: number;
  }
): OrderQuote {
  let subtotal = 0;
  let setupFees = 0;
  
  const calculatedItems = items.map(item => {
    const garmentCost = item.baseCost * item.quantity;
    let printCost = 0;
    let itemSetup = 0;
    
    if (item.printMethod === 'screenprint') {
      const result = calculateScreenPrintPrice({
        quantity: item.quantity,
        colors: item.printDetails.colors || 1,
        locations: item.printDetails.locations,
        garmentType: item.printDetails.garmentType || 'standard',
        includeSetup: options.includeSetup,
      });
      printCost = result.totalPrintCost - result.setupCost;
      itemSetup = result.setupCost;
    } else if (item.printMethod === 'embroidery') {
      const result = calculateEmbroideryPrice({
        quantity: item.quantity,
        stitchCount: item.printDetails.stitchCount || 5000,
        locations: item.printDetails.locations,
        includeDigitizing: options.includeDigitizing,
        is3dPuff: false,
      });
      printCost = result.totalEmbroideryyCost - result.setupCost;
      itemSetup = result.setupCost;
    } else if (item.printMethod === 'dtf') {
      const result = calculateDTFPrice({
        quantity: item.quantity,
        size: item.printDetails.size || 'large',
        locations: item.printDetails.locations,
      });
      printCost = result.totalDTFCost;
    }
    
    const totalItemCost = garmentCost + printCost;
    subtotal += totalItemCost;
    setupFees += itemSetup;
    
    return {
      productName: item.productName,
      quantity: item.quantity,
      garmentCost,
      printCost,
      totalItemCost,
      pricePerPiece: totalItemCost / item.quantity,
    };
  });
  
  const artFees = options.artCharge || 0;
  
  return {
    items: calculatedItems,
    subtotal,
    setupFees,
    artFees,
    grandTotal: subtotal + setupFees + artFees,
  };
}

// Markup calculator for reseller pricing
export function applyMarkup(cost: number, markupPercent: number): number {
  return cost * (1 + markupPercent / 100);
}

export function calculateMargin(cost: number, sellPrice: number): number {
  return ((sellPrice - cost) / sellPrice) * 100;
}
