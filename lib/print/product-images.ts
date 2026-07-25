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
  // must be checked before the generic men's "premium" rule. 2026-07-10:
  // the 3 "genuine extras not on fourprintshop's own page" (Men Short
  // Sleeve Tee/Long Sleeve Tee/Tank Top) actually DO exist as real,
  // separate products on 4over.com (the canonical reference) -- confirmed
  // live at mens-short-sleeve-t-shirts / mens-long-sleeve-t-shirts /
  // mens-tank-top, each with its own real photo. Added real image rules
  // for all 3 instead of leaving them on the generic fallback.
  "t-shirts": [
    { test: /kids/i, image: "/images/cat/t-shirts/kids.jpg" },
    { test: /ladies|slim\s*fit/i, image: "/images/cat/t-shirts/women-premium.jpg" },
    { test: /tank/i, image: "/images/cat/t-shirts/men-tank-top.jpg" },
    { test: /long\s*sleeve/i, image: "/images/cat/t-shirts/men-long-sleeve.jpg" },
    { test: /premium/i, image: "/images/cat/t-shirts/men-premium.jpg" },
    { test: /short\s*sleeve/i, image: "/images/cat/t-shirts/men-short-sleeve.jpg" },
  ],
  "floor-graphics": [
    { test: /aluminum/i, image: "/images/cat/floor-graphics/aluminum.jpg" },
    { test: /vinyl/i, image: "/images/cat/floor-graphics/vinyl.jpg" },
  ],
  // 2026-07-10: 3 of these (business-card/tuck/sales) never matched --
  // print/[category]/page.tsx's own CATEGORY_WORD_OVERRIDES.packaging
  // renames the raw text ("250BC Box" -> "Business Card Boxes", "Tuck Box"
  // -> "Roll End Tuck Top Boxes", "Sales Box" -> "Sales Presentation
  // Boxes") BEFORE resolveProductImage() ever sees productName, so these
  // regexes were checking for substrings ("250bc", "tuck box", "sales
  // box") that no longer existed in the post-rename text they actually
  // received. Widened to match the renamed text instead.
  packaging: [
    { test: /business\s*card/i, image: "/images/cat/packaging/business-card-boxes.jpg" },
    { test: /cube\s*box/i, image: "/images/cat/packaging/cube-boxes.jpg" },
    { test: /golf\s*ball/i, image: "/images/cat/packaging/golf-ball-boxes.jpg" },
    { test: /pillow\s*box/i, image: "/images/cat/packaging/pillow-boxes.jpg" },
    { test: /print\s*and\s*trim|print\s*&\s*trim/i, image: "/images/cat/packaging/print-trim-boxes.jpg" },
    { test: /tuck/i, image: "/images/cat/packaging/tuck-top-boxes.jpg" },
    { test: /sales/i, image: "/images/cat/packaging/sales-presentation-boxes.jpg" },
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
    { test: /2-part.*wraparound|wraparound.*2-part/i, image: "/images/cat/ncr-forms/2part-wraparound.png" },
    { test: /3-part.*wraparound|wraparound.*3-part/i, image: "/images/cat/ncr-forms/3part-wraparound.jpg" },
    { test: /2-part/i, image: "/images/cat/ncr-forms/2part-variable.jpg" },
    { test: /3-part/i, image: "/images/cat/ncr-forms/3part-variable.jpg" },
  ],
  notepads: [
    { test: /linen/i, image: "/images/cat/notepads/linen.jpg" },
    { test: /premium\s*opaque/i, image: "/images/cat/notepads/premium-opaque.jpg" },
  ],
  // 2026-07-10: was missing entirely, same recurring symptom. Reuses the
  // same 2 photos already downloaded for TYPE_IMAGES["displays"] (this
  // category's 2 products are the same White PVC/Foam Core Counter Cards
  // that also appear as Displays type-cards, just under a different leaf).
  "counter-cards": [
    { test: /foam\s*core/i, image: "/images/cat/displays/foam-core-counter.jpg" },
    { test: /pvc/i, image: "/images/cat/displays/white-pvc-counter.jpg" },
  ],
  // 2026-07-10: was missing entirely, same recurring symptom. Reuses the
  // same photo already downloaded for magnets' own "Car Door Magnets" card
  // (same underlying product/UUID, just also listed under Signs & Banners).
  "vehicle-magnets": [{ test: /car/i, image: "/images/cat/magnets/car-door.jpg" }],
  // 2026-07-10: was missing entirely, same recurring symptom. "By Shape"
  // (Square/Custom/Oval/Circle/Rectangle) is a confirmed genuine account
  // gap -- see [[roll-labels-stickers-audit]] -- so only these 5 "By
  // Stock" material images are used.
  "roll-labels": [
    { test: /clear\s*bopp/i, image: "/images/cat/roll-labels/clear-bopp.jpg" },
    { test: /white\s*bopp/i, image: "/images/cat/roll-labels/white-bopp.jpg" },
    { test: /eggshell/i, image: "/images/cat/roll-labels/eggshell-felt.jpg" },
    { test: /bright\s*silver/i, image: "/images/cat/roll-labels/bright-silver.jpg" },
    { test: /semi.?gloss/i, image: "/images/cat/roll-labels/semi-gloss.jpg" },
  ],
  // 2026-07-10: was missing entirely, same recurring symptom. "Matte Vinyl"
  // and "Oval" have no live CDN source -- confirmed genuinely distinct
  // products not on 4over.com's current 6-item public Stickers page (Matte
  // Vinyl uses a different material than their paper-based "Standard
  // Stickers"; Oval isn't listed there at all) -- left on the generic
  // fallback since there's nothing to download.
  stickers: [
    { test: /round\s*corner/i, image: "/images/cat/stickers/round-corner.jpg" },
    { test: /round/i, image: "/images/cat/stickers/round.jpg" },
    { test: /rectangle/i, image: "/images/cat/stickers/rectangle.jpg" },
    { test: /leaf/i, image: "/images/cat/stickers/leaf.jpg" },
  ],
  // 2026-07-10: was missing entirely, same recurring symptom. "Common
  // Menus" is a confirmed genuine account gap (0 live products under this
  // uuid) -- see [[menus-audit]] -- so only these 3 real types are needed.
  menus: [
    { test: /endurace/i, image: "/images/cat/menus/endurace.jpg" },
    { test: /brown\s*kraft/i, image: "/images/cat/menus/brown-kraft.jpg" },
    { test: /natural/i, image: "/images/cat/menus/natural.jpg" },
  ],
  // 2026-07-10: was missing entirely -- own leaf/category key, separate
  // from "stickers" above despite sharing the same UUID.
  "bumper-stickers": [{ test: /bumper/i, image: "/images/cat/stickers/bumper.jpg" }],
}

export function resolveProductImage(subcategorySlug: string, productName: string, fallback: string): string {
  const rules = RULES[subcategorySlug]
  if (!rules) return fallback
  for (const rule of rules) {
    if (rule.test.test(productName)) return rule.image
  }
  return fallback
}
