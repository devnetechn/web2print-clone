// Per-product-type images for subcategory leaves where one shared category
// image isn't good enough (e.g. Rigid Signs has visually distinct materials —
// Coroplast vs PVC vs Aluminum vs Foam Core). Sourced from fourprintshop.com's
// product photos (same as the rest of public/images — confirm rights before
// public production use). Rules are checked in order, most specific first, so
// a more specific match (e.g. "Coroplast Rider") wins over a generic one
// (e.g. "Coroplast").

interface ImageRule {
  test: RegExp
  image: string
}

const RULES: Record<string, ImageRule[]> = {
  // "Ladies Slim Fit Short Sleeve Premium Tee" contains "premium" too, so it
  // must be checked before the generic men's "premium" rule. The 3 genuine
  // extras not on fourprintshop's own Apparel page (Men Short Sleeve Tee/
  // Long Sleeve Tee/Tank Top) fall through to the generic fallback image.
  "t-shirts": [
    { test: /kids/i, image: "/images/cat/t-shirts/kids.jpg" },
    { test: /ladies|slim\s*fit/i, image: "/images/cat/t-shirts/women-premium.jpg" },
    { test: /premium/i, image: "/images/cat/t-shirts/men-premium.jpg" },
  ],
  "floor-graphics": [
    { test: /aluminum/i, image: "/images/cat/floor-graphics/aluminum.jpg" },
    { test: /vinyl/i, image: "/images/cat/floor-graphics/vinyl.jpg" },
  ],
  packaging: [
    { test: /250bc|500bc/i, image: "/images/cat/packaging/business-card-boxes.jpg" },
    { test: /cube\s*box/i, image: "/images/cat/packaging/cube-boxes.jpg" },
    { test: /golf\s*ball/i, image: "/images/cat/packaging/golf-ball-boxes.jpg" },
    { test: /pillow\s*box/i, image: "/images/cat/packaging/pillow-boxes.jpg" },
    { test: /print\s*and\s*trim|print\s*&\s*trim/i, image: "/images/cat/packaging/print-trim-boxes.jpg" },
    { test: /tuck\s*box/i, image: "/images/cat/packaging/tuck-top-boxes.jpg" },
    { test: /sales\s*box/i, image: "/images/cat/packaging/sales-presentation-boxes.jpg" },
    { test: /wine\s*box/i, image: "/images/cat/packaging/wine-boxes.jpg" },
  ],
  "trading-cards": [
    { test: /akuafoil/i, image: "/images/cat/trading-cards/akuafoil.jpg" },
    { test: /brown\s*kraft/i, image: "/images/cat/trading-cards/brown-kraft.jpg" },
    { test: /foil\s*worx/i, image: "/images/cat/trading-cards/foil-worx.jpg" },
    { test: /natural/i, image: "/images/cat/trading-cards/natural.jpg" },
    { test: /pearl/i, image: "/images/cat/trading-cards/pearl.jpg" },
    { test: /silk/i, image: "/images/cat/trading-cards/silk.jpg" },
    { test: /suede/i, image: "/images/cat/trading-cards/suede.jpg" },
    { test: /linen/i, image: "/images/cat/trading-cards/100lb-cover-linen.jpg" },
    { test: /18pt/i, image: "/images/cat/trading-cards/18pt.jpg" },
    { test: /16pt/i, image: "/images/cat/trading-cards/16pt.jpg" },
    { test: /14pt/i, image: "/images/cat/trading-cards/14pt.jpg" },
  ],
  "announcement-cards": [
    { test: /akuafoil/i, image: "/images/cat/announcement-cards/akuafoil.jpg" },
    { test: /brown\s*kraft/i, image: "/images/cat/announcement-cards/brown-kraft.jpg" },
    { test: /magnet/i, image: "/images/cat/announcement-cards/magnet.jpg" },
    { test: /natural/i, image: "/images/cat/announcement-cards/natural.jpg" },
    { test: /painted\s*edge/i, image: "/images/cat/announcement-cards/painted-edge.jpg" },
    { test: /pearl/i, image: "/images/cat/announcement-cards/pearl.jpg" },
    { test: /silk/i, image: "/images/cat/announcement-cards/silk.jpg" },
    { test: /suede/i, image: "/images/cat/announcement-cards/suede.jpg" },
    // Round Corner checked before the generic "Standard" catch-all below.
    { test: /round\s*corner/i, image: "/images/cat/announcement-cards/round-corner.jpg" },
    { test: /standard|announcement\s+cards/i, image: "/images/cat/announcement-cards/standard.jpg" },
  ],
  booklets: [
    { test: /dull\s*book/i, image: "/images/cat/booklets/dull-book-satin-aq.jpg" },
    { test: /gloss\s*cover/i, image: "/images/cat/booklets/gloss-cover-aq.jpg" },
    { test: /gloss\s*book/i, image: "/images/cat/booklets/gloss.jpg" },
    { test: /matte\s*book/i, image: "/images/cat/booklets/matte-book-uncoated.jpg" },
    { test: /premium|opaque/i, image: "/images/cat/booklets/premium-opaque-uncoated.jpg" },
  ],
  letterheads: [
    { test: /linen/i, image: "/images/cat/letterheads/linen-uncoated.jpg" },
    { test: /premium\s*opaque/i, image: "/images/cat/letterheads/premium-opaque.jpg" },
    { test: /blank/i, image: "/images/cat/letterheads/blank.jpg" },
  ],
  "ncr-forms": [
    { test: /2-part.*wraparound|wraparound.*2-part/i, image: "/images/cat/ncr-forms/2part-wraparound.jpg" },
    { test: /3-part.*wraparound|wraparound.*3-part/i, image: "/images/cat/ncr-forms/3part-wraparound.jpg" },
    { test: /2-part/i, image: "/images/cat/ncr-forms/2part-variable.jpg" },
    { test: /3-part/i, image: "/images/cat/ncr-forms/3part-variable.jpg" },
  ],
  notepads: [
    { test: /linen/i, image: "/images/cat/notepads/linen.jpg" },
    { test: /premium\s*opaque/i, image: "/images/cat/notepads/premium-opaque.jpg" },
  ],
}

export function resolveProductImage(subcategorySlug: string, productName: string, fallback: string): string {
  const rules = RULES[subcategorySlug]
  if (!rules) return fallback
  for (const rule of rules) {
    if (rule.test.test(productName)) return rule.image
  }
  return fallback
}
