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
  "rigid-signs": [
    { test: /coroplast.*rider|rider.*coroplast/i, image: "/images/signs/rigid-signs/coroplast-rider.jpg" },
    { test: /10mm.*coroplast/i, image: "/images/signs/rigid-signs/10mm-coroplast.jpg" },
    { test: /4mm.*coroplast/i, image: "/images/signs/rigid-signs/4mm-coroplast.jpg" },
    { test: /gator/i, image: "/images/signs/rigid-signs/foam-core.jpg" },
    { test: /foam\s*core|foamcore|foam\s*board/i, image: "/images/signs/rigid-signs/foam-core.jpg" },
    { test: /styrene/i, image: "/images/signs/rigid-signs/3mm-pvc.jpg" },
    { test: /pvc/i, image: "/images/signs/rigid-signs/3mm-pvc.jpg" },
    { test: /aluminum.*sandwich|sandwich.*board/i, image: "/images/signs/rigid-signs/aluminum-sandwich-board.jpg" },
    { test: /aluminum/i, image: "/images/signs/rigid-signs/aluminum-heavy-duty.jpg" },
    { test: /real\s*estate|\bpost\b/i, image: "/images/signs/rigid-signs/real-estate-post.jpg" },
    { test: /high\s*quantity|high-quantity\s*coro/i, image: "/images/signs/rigid-signs/high-quantity-coro.jpg" },
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
