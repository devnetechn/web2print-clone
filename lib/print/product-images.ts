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
}

export function resolveProductImage(subcategorySlug: string, productName: string, fallback: string): string {
  const rules = RULES[subcategorySlug]
  if (!rules) return fallback
  for (const rule of rules) {
    if (rule.test.test(productName)) return rule.image
  }
  return fallback
}
