import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAllProductsForCategory } from "@/lib/4over/client"
import { GROUPS, SLUG_TO_CATEGORY, SIZE_GROUPED_PARENTS, matchesAllKeywords } from "@/lib/print/categories"
import { resolveProductImage } from "@/lib/print/product-images"

// =====================================================================
// PRODUCT TYPE GROUPING RULES per spec
// Each rule: { label, slug, keywords[] } — match ANY keyword in description
// =====================================================================
// excludeSizePrefixes: optional list of literal size-dimension prefixes
// (e.g. "1.5\" X 7\"") to EXCLUDE from this rule's match even when its
// keywords otherwise match — for rules whose keyword is too broad (e.g.
// "14pt" matching every 14PT-stocked product in a shared category) and
// needs to exclude specific sizes that 4over.com's own retail listing for
// this exact type doesn't offer either (confirmed 2026-07-10, Postcards'
// 14pt/16pt: 1.5x7/2x7/2x8/2.5x8/2.5x8.5/2.75x8.5 exist in the wholesale
// API with genuine "14PT ... Postcards"/"16PT ... Postcards" text, but
// neither 4over.com/14pt-postcards nor /16pt-postcards lists them as a Size
// option — falls through to whatever LATER rule (or the catch-all) would
// otherwise have claimed the product).
interface TypeRule { label: string; slug: string; keywords: string[]; excludeSizePrefixes?: string[] }

const TYPE_RULES: Record<string, TypeRule[]> = {
  // fourprintshop lists 8 types here; our sandbox data only has products
  // for 4 of them (verified — EndurACE/Specialty Folds/Tri-Fold/Z-Fold are
  // confirmed absent: checked all 402 raw entries in this category for
  // "fold"/"tear"/"endurace"/"panel"/"brochure" wording, AND the dedicated
  // EndurACE category (d3010094, also used by EndurACE Business Cards) for
  // any Flyer/Brochure-shaped entries — zero matches anywhere; a genuine
  // catalog gap, the same pattern as Circle/Magnet Business Cards). "Flat"
  // is the TRUE catch-all (its old "flat flyer"/"flat brochure" keywords
  // never matched anything — the data has no "flat" wording at all, just
  // plain "Flyers"/"Flyer on..." with no fold pattern) so it must be LAST:
  // classifyProduct() is order-dependent and a catch-all earlier in the
  // array would swallow Half-Fold/Tearoff's products before they're checked.
  // 4over.com/marketing-products/flyers-brochures lists 17 product types.
  // Order: most specific first. EDDM/Direct Mail variants checked before
  // their broader fold-type siblings to avoid misclassification.
  "flyers-and-brochures": [
    { label: "All Inclusive Flyers Brochures",               slug: "all-inclusive-flyers-brochures",              keywords: ["all inclusive", "all-inclusive"] },
    // "EDDM Full Service - Half Folds"/"EDDM Print Only - Half Folds" removed
    // 2026-07-09: confirmed 0 live products anywhere in the EDDM uuid contain
    // "half fold" text, AND no product's own "Folding Options" ever offers a
    // half-fold choice (only "Tri-Fold / Letter Fold") -- genuine account gap,
    // not a code issue. Deliberately NOT re-added as a keyword-matched rule:
    // classifyProduct() OR-matches keywords, so a rule like ["eddm","half fold"]
    // would match on "eddm" ALONE and silently steal every other EDDM product
    // (flyers, postcards, sell sheets) into this dead type instead of leaving
    // them correctly classified elsewhere.
    // "EDDM Full Service - Flyers" and "EDDM Flyers - Print Only" originally
    // required "full service"/"print only" text that NEVER appears in any of
    // the 55 genuine EDDM flyer descriptions (confirmed via raw API) -- both
    // entries silently matched 0 products, and every real EDDM flyer fell
    // through into the "Flat Flyers Brochures" catch-all instead. The true
    // differentiator is "EDDM Service Option" (Full Service/Print Only), a
    // genuine single-product option group. This "-base" entry classifies the
    // shared product pool only -- it's excluded from the visible card grid
    // (see the sortedTypes filter below) in favor of 2 OPTION_PRESET_TYPES
    // virtual cards that pre-select Full Service / Print Only respectively,
    // per Boss Dwayne's explicit request to keep them as 2 separate findable
    // cards matching 4over.com's own literal listing (not merged into one
    // card behind a dropdown, which was the first, wrong attempt at this).
    { label: "EDDM Flyers",                                 slug: "eddm-flyers-base",                          keywords: ["eddm"] },
    // "Direct Mail *" (6 entries) removed 2026-07-09: confirmed 0 live products
    // contain "direct mail" text anywhere in this category (account gap). The
    // "...Coated" variant was additionally an ACTIVE bug, not just dead: its
    // ["direct mail","coated"] keywords are OR-matched by classifyProduct(), and
    // "coated" is a substring of "uncoated" -- so it was silently absorbing 17
    // genuine "70lb Premium Uncoated Text" flyers (nothing to do with Direct Mail)
    // under a wrong "Direct Mail...Coated" label. Removing lets them fall through
    // to the correct "Flat Flyers Brochures" catch-all instead.
    // "Specialty Folds Brochures"/"Z Fold Brochures"/"Tri Fold Brochures" are
    // NOT separate keyword-matched TYPE_RULES entries (2026-07-09 correction —
    // previously wrongly flagged "account gap: 0 live matches" here, based on
    // searching for "tri fold"/"z fold"/"specialty fold" literal TEXT in
    // descriptions, which genuinely doesn't exist). The real differentiator
    // is 4over's own "Folding Options" calculator field on "Flat Flyers
    // Brochures" itself (confirmed live: Tri-Fold / Letter Fold, Z-Fold,
    // Gatefold, Double Gatefold, French Fold, Roll Fold, Double Parallel
    // Fold, Reverse Double Parallel Fold, Half-Fold and then Tri-Fold are ALL
    // real options there) — Boss Dwayne flagged these as "missing" because
    // burying 11 fold choices inside a card literally named "Flat" isn't
    // discoverable. Fixed via FOLDING_PRESET_TYPES below: 3 virtual cards
    // that reuse Flat Flyers Brochures' own product set but pre-select the
    // matching Folding Option, giving each fold type its own findable card
    // (matching 4over.com's own separate listings) without duplicating data.
    { label: "Half Fold Brochures",                          slug: "half-fold-brochures",                       keywords: ["half-fold", "half fold", "folds to"] },
    { label: "EndurACE Flyers and Brochures",               slug: "endurace-flyers-and-brochures",             keywords: ["endurace"] }, // account gap: EndurACE uuid has no flyer/brochure products
    { label: "Tearoff Flyers",                              slug: "tearoff-flyers",                            keywords: ["tear", "tearoff", "tear-off"] },
    { label: "Flat Flyers Brochures",                        slug: "flat-flyers-brochures",                     keywords: [] }, // catch-all
  ],
  // 4over.com/marketing-products/postcards lists 25 product types.
  // Brand-stock materials (Silk/Suede/Pearl/etc.) live in their own shared
  // UUIDs — pulled in via EXTRA_PRODUCT_SOURCES below. Order is critical:
  // more specific keywords must come before broader ones (e.g. "rsvp" before
  // "dual raised", "raised foil" before "foil", "eddm full service" before "eddm").
  "postcards": [
    { label: "All-Inclusive Postcards",       slug: "all-inclusive-postcards",       keywords: ["all inclusive", "all-inclusive"] },
    // "EDDM Full Service Postcards"/"EDDM Print Only Postcards" removed
    // 2026-07-09: confirmed via raw API that none of the 63 genuine EDDM
    // postcard products contain "full service"/"print only" text anywhere
    // (same root cause as Flyers & Brochures' identical EDDM split -- see
    // [[flyers-brochures-audit]]). 2026-07-09: split into 2
    // OPTION_PRESET_TYPES virtual cards (Full Service / Print Only,
    // pre-selecting "EDDM Service Option") per Boss Dwayne's request to
    // match 4over.com's separate listings -- this "-base" entry only
    // classifies the shared product pool, excluded from the visible grid.
    { label: "EDDM Postcards",               slug: "eddm-postcards-base",          keywords: ["eddm"] },
    { label: "Dual Raised RSVP",             slug: "dual-raised-rsvp-postcards",   keywords: ["rsvp"] }, // account gap: 0 live matches
    { label: "Dual Raised Postcards",        slug: "dual-raised-postcards",        keywords: ["dual raised"] },
    { label: "Raised Foil Postcards",        slug: "raised-foil-postcards",        keywords: ["raised foil"] },
    { label: "Raised Spot UV Postcards",     slug: "raised-spot-uv-postcards",     keywords: ["raised spot"] },
    // 2026-07-09: was ["foil worx"] only -- confirmed 0 of the 40 genuine
    // Foil Worx postcard products contain that literal phrase, all say
    // "...Foiled Postcards" instead (same pattern as Trading Cards' own
    // Foil Worx entry). All 40 were silently landing on 14pt/16pt-postcards
    // instead (whichever bare stock-pt rule they reached first).
    { label: "Foil Worx Postcards",          slug: "foil-worx-postcards",          keywords: ["foil worx", "foiled"] },
    { label: "Tearoff Postcards",            slug: "tearoff-postcards",            keywords: ["tear"] },
    { label: "Painted-Edge Postcards",       slug: "painted-edge-postcards",       keywords: ["painted-edge", "painted edge"] },
    { label: "EndurACE Postcards",           slug: "endurace-postcards",           keywords: ["endurace"] },
    { label: "Akuafoil Postcards",           slug: "akuafoil-postcards",           keywords: ["akuafoil"] },
    { label: "Brown Kraft Postcards",        slug: "brown-kraft-postcards",        keywords: ["brown kraft", "kraft"] },
    { label: "Suede Postcards",              slug: "suede-postcards",              keywords: ["suede"] },
    { label: "Silk Postcards",               slug: "silk-postcards",               keywords: ["silk"] },
    { label: "Pearl Postcards",              slug: "pearl-postcards",              keywords: ["pearl"] },
    { label: "Natural Postcards",            slug: "natural-postcards",            keywords: ["natural"] },
    { label: "Linen Uncoated Postcards",     slug: "linen-uncoated-postcards",     keywords: ["linen"] },
    { label: "Plastic Postcards",            slug: "plastic-postcards",            keywords: ["plastic"] },
    { label: "Magnet Postcards",             slug: "magnet-postcards",             keywords: ["magnet"] }, // account gap: 0 live matches in the Magnets uuid
    { label: "100LB Gloss Cover Postcards",  slug: "100lb-gloss-cover-postcards",  keywords: ["100lb gloss cover"] },
    // excludeSizePrefixes (2026-07-10): these sizes genuinely exist for
    // 14PT/16PT/18PT in the wholesale API ("1.5\" X 7\" 14PT ... Postcards"
    // etc, confirmed via raw productsfeed) but 4over.com's own retail page
    // for the matching type doesn't list them as a Size option — falls
    // through to "Standard Postcards" (catch-all) instead. NOT a shared
    // list across the 3 -- confirmed each type's exclusions differ (e.g.
    // 18PT's own listing DOES include "2.75\" x 8.5\"", which 14PT/16PT's
    // listings do NOT).
    { label: "18pt Postcards",               slug: "18pt-postcards",               keywords: ["18pt"], excludeSizePrefixes: ['2" X 8"', '2.125" X 5.5"', '2.75" X 4.25"', '3.66" X 4.25"', '3.667" X 8.5"'] },
    { label: "16PT Postcards",               slug: "16pt-postcards",               keywords: ["16pt"], excludeSizePrefixes: ['1.5" X 7"', '2" X 7"', '2" X 8"', '2.5" X 8"', '2.5" X 8.5"', '2.75" X 8.5"', '3.66" X 4.25"'] },
    { label: "14pt Postcards",               slug: "14pt-postcards",               keywords: ["14pt"], excludeSizePrefixes: ['1.5" X 7"', '2" X 7"', '2" X 8"', '2.5" X 8"', '2.5" X 8.5"', '2.75" X 8.5"'] },
    { label: "Direct Mail Postcards",        slug: "direct-mail-postcards",        keywords: ["direct mail"] }, // account gap: 0 live matches (same as Flyers & Brochures' identical gap)
    { label: "Standard Postcards",           slug: "standard-postcards",           keywords: [] }, // catch-all
  ],
  // 2026-07-10: new category (was completely missing from the site, see
  // [[footer-broken-links-fix]]'s follow-up finding). 4over.com's own
  // /marketing-products/social-cards lists exactly 3 types: Social Cards,
  // Foil Worx Social Cards, Akuafoil Social Cards. Confirmed via direct DB
  // query: Brown Kraft/Pearl/Plastic/Suede/Silk (5 more brand materials
  // that DO have live data) are NOT separate cards on 4over.com's own
  // listing -- they merge into the plain "Social Cards" catch-all, same as
  // several Business Cards materials merge into Stock options elsewhere.
  // "Foil Worx" raw text says "Foiled" (same pattern as Trading Cards/
  // Postcards' own Foil Worx entries). Round Corner appears as a raw-text
  // variant across multiple materials but isn't its own card on 4over.com
  // either -- falls into whichever material card it belongs to.
  "social-cards": [
    { label: "Foil Worx Social Cards", slug: "foil-worx-social-cards", keywords: ["foiled", "foil worx"] },
    { label: "Akuafoil Social Cards", slug: "akuafoil-social-cards", keywords: ["akuafoil"] },
    { label: "Social Cards", slug: "standard-social-cards", keywords: [] }, // catch-all
  ],
  // Round Corner/Oval/Fold Over used to be separate types here, but per
  // fourprintshop's literal reference (the Standard Business Cards page's own
  // Shape dropdown includes Rectangle/Rounded 2/Rounded 4/Oval, and its Size
  // dropdown includes the Fold Over-only "2\" x 7\"") they're all variants of
  // ONE product, not separate ones — see ProductConfiguratorClient's
  // shapeList/shapeUuid for how Shape becomes switchable once everything
  // shares one allowedProductUuids pool. ("Folded"/"Square" keywords matched
  // zero real products — confirmed via the live category data — so they were
  // dead rules to begin with, not a second merge worth preserving.)
  "business-cards-standard": [
    { label: "Standard Business Cards", slug: "standard-business-cards", keywords: [] }, // catch-all (now the only rule)
  ],
  // CRITICAL FIX (2026-07-08): these 11 brand-material Business Card
  // subcategories (Suede/Silk/Pearl/Natural/Painted Edge/Brown Kraft/
  // Akuafoil/Linen Uncoated/Raised Spot UV/Raised Foil/EndurACE) had NO
  // TYPE_RULES entry at all — unlike "business-cards-standard" above (whose
  // single catch-all entry is what routes it through the hasTypeRules
  // branch with the real Size→Stock→Coating→Shape live cascade). Without
  // one, [typeSlug]/page.tsx's `typeRules.length > 0` check was false, so
  // these fell through to the generic SIZE_GROUPED_PARENTS branch instead —
  // which (correctly, for OTHER categories like Hang Tags where every size
  // really is a standalone product) treats different sizes as directly-
  // switchable uuids via `sizeProducts`/`sizeVariantMode`, entirely
  // bypassing the categoryproductslist cascade. Confirmed live (Playwright
  // network trace): these pages made zero `/api/4over/categoryproductslist`
  // calls, so Stock/Coating never populated and Shape (e.g. Suede's
  // Rectangle/Square/Rounded 2/Rounded 4 Corners, Painted Edge's Square/
  // Rectangle — both genuinely selectable per 4over.com) was NOT
  // selectable at all, unlike Standard Business Cards which already worked
  // correctly.
  //
  // IMPORTANT: unlike "business-cards-standard" (whose 08a9625a uuid is
  // ALSO shared with Leaf/Oval/Fold-over — all genuinely business cards, so
  // a catch-all is safe there), most of these 10 brand-material uuids are
  // ALSO the exact same uuid used by the matching Greeting Cards material
  // (see greeting-cards' EXTRA_PRODUCT_SOURCES: Silk/Suede/Pearl/Natural/
  // Brown Kraft/Akuafoil/Raised Foil/Raised Spot UV all reuse these same
  // uuids). A first attempt using an empty catch-all keywords:[] here
  // caused every Greeting Card sharing the uuid to leak into the Business
  // Card listing/Size dropdown too (confirmed live: Suede's Size dropdown
  // showed irrelevant sizes like 11"x17", 8.5"x11" — Greeting Card/Postcard
  // dimensions). Fixed by requiring "business card" in the description,
  // same as these GROUPS entries' own `keyword: "business card"` prop.
  // "linen-uncoated" shares 08a9625a instead (with Standard/Leaf/Oval/
  // Fold-over, which ALSO say "business card") so it needs "linen" instead
  // to actually discriminate within that shared uuid.
  "raised-foil": [{ label: "Raised Foil Business Cards", slug: "raised-foil-business-cards", keywords: ["business card"] }],
  "silk-cards": [{ label: "Silk Business Cards", slug: "silk-business-cards", keywords: ["business card"] }],
  "suede-cards": [{ label: "Suede Business Cards", slug: "suede-business-cards", keywords: ["business card"] }],
  "pearl-cards": [{ label: "Pearl Business Cards", slug: "pearl-business-cards", keywords: ["business card"] }],
  "natural-cards": [{ label: "Natural Business Cards", slug: "natural-business-cards", keywords: ["business card"] }],
  "painted-edge-cards": [{ label: "Painted Edge Business Cards", slug: "painted-edge-business-cards", keywords: ["business card"] }],
  "brown-kraft-cards": [{ label: "Brown Kraft Business Cards", slug: "brown-kraft-business-cards", keywords: ["business card"] }],
  akuafoil: [{ label: "Akuafoil Business Cards", slug: "akuafoil-business-cards", keywords: ["business card"] }],
  "linen-uncoated": [{ label: "Linen Uncoated Business Cards", slug: "linen-uncoated-business-cards", keywords: ["linen"] }],
  "raised-spot-uv": [{ label: "Raised Spot UV Business Cards", slug: "raised-spot-uv-business-cards", keywords: ["business card"] }],
  "endurace-cards": [{ label: "EndurACE Business Cards", slug: "endurace-business-cards", keywords: ["business card"] }],
  // Same fix, same reason — "dual-raised" had no TYPE_RULES entry either,
  // and its uuid's 2 raw products ("...with Two Raised Foils on Front
  // only" vs "...with Raised Spot UV and Raised Foil on Front only") were
  // each producing their OWN level-3 card via the generic stripSize/
  // groupKey title-grouping (2 distinct titles = 2 distinct cards).
  // 4over.com's own /dual-raised-business-cards is ONE unified calculator
  // (single Size/Stock, one Colorspec list spanning both foil-only and
  // foil+spot-UV combos, "Raised Spot UV Side" only relevant for one of
  // them) — so this needs the SAME single-catch-all merge, with the
  // Foil-only vs Spot-UV+Foil distinction becoming a selectable option via
  // extractShape() (see product-configurator-client.tsx), the same pattern
  // used for Wine Box Handle / Akuafoil Material.
  "dual-raised": [{ label: "Dual Raised Business Cards", slug: "dual-raised-business-cards", keywords: ["business card"] }],
  // Same fix again — Foil Worx/Plastic/Leaf/Fold-over also had no
  // TYPE_RULES entry, so their siblings (differing only by Stock, or by a
  // Round-Corner/Spot-UV/Gold-Foil variant handled via extractShape) each
  // produced their OWN level-3 card instead of ONE calculator, unlike
  // 4over.com's own single unified page for each of these.
  "foil-worx": [{ label: "Foil Worx Business Cards", slug: "foil-worx-business-cards", keywords: ["business card"] }],
  "plastic-cards": [{ label: "Plastic Business Cards", slug: "plastic-business-cards", keywords: ["business card"] }],
  // Leaf/Fold-over share 08a9625a with Standard Business Cards (which ALSO
  // says "business card") — need "leaf"/"fold over" to actually discriminate.
  "leaf-cards": [{ label: "Leaf Business Cards", slug: "leaf-business-cards", keywords: ["leaf"] }],
  "fold-over-cards": [{ label: "Fold-over Business Cards", slug: "fold-over-business-cards", keywords: ["fold over"] }],
  // 4over.com/marketing-products/presentation-folder lists 10 product types.
  // Material-specific rules MUST come before size rules: product descriptions
  // contain both material AND size (e.g. "5.25\" x 10.5\" 14pt Natural Uncoated
  // Presentation Folder") — checking size first would swallow material cards.
  // Silk/Suede/Akuafoil live in their own brand-stock UUIDs → EXTRA_PRODUCT_SOURCES.
  // 4over splits standard folders by SIZE (9x12 / 9x14.5 / 5.25x10.5 / 6x9)
  // as separate product cards — matched here.
  "presentation-folders": [
    { label: "Silk Presentation Folder",         slug: "silk-presentation-folder",        keywords: ["silk"] },
    { label: "Suede Presentation Folder",        slug: "suede-presentation-folder",       keywords: ["suede"] },
    { label: "Akuafoil Presentation Folder",     slug: "akuafoil-presentation-folder",    keywords: ["akuafoil"] },
    { label: "Natural Presentation Folder",      slug: "natural-presentation-folder",     keywords: ["natural"] },
    { label: "Pearl Presentation Folder",        slug: "pearl-presentation-folder",       keywords: ["pearl"] },
    { label: "Glue Less 9x12 Presentation Folder", slug: "glueless-presentation-folder", keywords: ["glue-less", "glueless", "glue less"] },
    { label: "9x12 Presentation Folder",         slug: "9x12-presentation-folder",        keywords: ['9" x 12"', "9x12"] },
    { label: "9x14.5 Presentation Folder",       slug: "9x14-presentation-folder",        keywords: ['9" x 14.5"', "9x14"] },
    { label: "5.25x10.5 Presentation Folder",    slug: "5x10-presentation-folder",        keywords: ['5.25" x 10.5"', "5.25x10"] },
    { label: "6x9 Presentation Folder",          slug: "6x9-presentation-folder",         keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /marketing-material/door-hangers/products/ lists
  // EndurACE/Standard/Tearoff — confirmed our sandbox has all 3, just split
  // across categories (EndurACE: 1 entry in the EndurACE UUID; Tearoff: 22
  // entries in the Tear Off Cards UUID; both merged in via
  // EXTRA_PRODUCT_SOURCES below). "Die Cut" in the door-hangers UUID's own
  // wording is NOT a real 4th type — door hangers are inherently die-cut
  // (the keyhole slot), fourprintshop has no separate "Die Cut" card, and
  // the word is inconsistently present/absent across otherwise-identical
  // siblings (same 4over data-quality pattern as Calendars' "Saddle Stitch").
  // 4over.com/marketing-products/catalogs lists 2 product types.
  catalogs: [
    { label: "Saddle Stitch Catalogs", slug: "saddle-stitch-catalogs", keywords: ["saddle", "saddle stitch"] },
    { label: "Perfect Bound Catalogs", slug: "perfect-bound-catalogs", keywords: [] }, // catch-all
  ],
  // 4over.com/marketing-products/booklets lists 6 product types.
  // "Gloss Cover" must come before "Gloss" to avoid misclassification.
  // "Premium Opaque" covers both 60LB and 70LB opaque stocks.
  // 4over.com/marketing-products/calendars lists 7 product types.
  // Binding-specific types (Spiral/Hard-Cover) must come before size-based
  // splits to avoid misclassification. Size-based cards match 4over's layout
  // (12x12 / 8.5x11 / 11x8.5 / 9x12); Self-Cover is the catch-all.
  calendars: [
    { label: "Spiral Bind Calendars",  slug: "spiral-bind-calendars",  keywords: ["spiral"] },
    { label: "Hard-Cover Calendars",   slug: "hard-cover-calendars",   keywords: ["hard cover", "hard-cover", "hardcover"] },
    { label: "12x12 Calendars",        slug: "12x12-calendars",        keywords: ['12" x 12"', "12x12"] },
    { label: "11x8.5 Calendars",       slug: "11x8-5-calendars",       keywords: ['11" x 8.5"', "11x8.5"] },
    { label: "9x12 Calendars",         slug: "9x12-calendars",         keywords: ['9" x 12"', "9x12"] },
    { label: "8.5x11 Calendars",       slug: "8-5x11-calendars",       keywords: ['8.5" x 11"', "8.5x11"] },
    { label: "Self-Cover Calendars",   slug: "self-cover-calendars",   keywords: [] }, // catch-all
  ],
  booklets: [
    { label: "Matte Book Uncoated Booklets",      slug: "matte-book-uncoated-booklets",    keywords: ["matte"] },
    { label: "Dull Book with Satin AQ Booklets",  slug: "dull-book-satin-aq-booklets",     keywords: ["dull"] },
    { label: "Gloss Cover with AQ Booklets",      slug: "gloss-cover-aq-booklets",         keywords: ["gloss cover"] },
    { label: "Premium Opaque Uncoated Booklets",  slug: "premium-opaque-uncoated-booklets",keywords: ["opaque", "premium opaque", "60lb", "70lb"] },
    { label: "Direct Mail Booklets",              slug: "direct-mail-booklets",            keywords: ["direct mail"] },
    { label: "Gloss Booklets",                    slug: "gloss-booklets",                  keywords: [] }, // catch-all (Gloss Book)
  ],
  "door-hangers": [
    { label: "EndurACE Door Hangers", slug: "endurace-door-hangers", keywords: ["endurace"] },
    { label: "Tearoff Door Hangers", slug: "tearoff-door-hangers", keywords: ["tear"] },
    { label: "Standard Door Hangers", slug: "standard-door-hangers", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /marketing-material/envelopes/products/ groups
  // by PRINT METHOD/feature (Blank/Digital/Variable Addressing), not by
  // stock — confirmed live: "Blank Envelopes"' own Stock dropdown covers
  // 60LB Premium Opaque + 70LB Linen + 70LB Premium Opaque together, and
  // "Offset Envelopes" has the SAME 3 stocks (the generic/non-blank,
  // non-digital print). "Linen"/"Natural" only become their OWN card when
  // NEITHER Blank nor Digital nor Variable Addressing applies — order
  // matters: e.g. "Blank ENVELOPE on 70lb Linen..." must hit Blank before
  // the Linen rule gets a chance, and "...Natural...w/Variable Addressing"
  // must hit Variable Addressing before Natural.
  // 4over.com/marketing-products/greeting-cards lists 13 product types.
  // Specialty stocks (Silk/Pearl/Natural/etc.) come from EXTRA_PRODUCT_SOURCES.
  // Specific types must come before the catch-all; Dual Raised/Raised Foil/
  // Raised Spot UV before plain "raised" so they don't fall into wrong buckets.
  // ORDER MATTERS: "Raised Foil"/"Raised Spot UV"/"Dual Raised" must all be
  // checked BEFORE the plain material names (Suede/Silk/Pearl/etc.) — 4over
  // genuinely has combo products like "16PT Suede Greeting Cards w/ Raised
  // Foil on Front only" that contain BOTH a material word AND a raised-
  // finish word. classifyProduct() returns on the FIRST keyword match, so
  // with "suede" checked before "raised foil" this combo silently landed on
  // the "Suede Greeting Cards" card instead of its own "Raised Foil
  // Greeting Cards" card (confirmed 2026-07-08: made Raised Foil Greeting
  // Cards' only real product — 1 total, at 7"x10" — invisible, since its
  // level-3 card never appeared at all despite the product genuinely
  // existing and being correctly pulled via EXTRA_PRODUCT_SOURCES).
  "greeting-cards": [
    { label: "Dual Raised Greeting Cards",              slug: "dual-raised-greeting-cards",          keywords: ["dual raised"] },
    { label: "Raised Foil Greeting Cards",              slug: "raised-foil-greeting-cards",          keywords: ["raised foil"] },
    { label: "Raised Spot UV Greeting Cards",           slug: "raised-spot-uv-greeting-cards",       keywords: ["raised spot"] },
    { label: "Cards with Gift Card Holder Greeting Cards", slug: "gift-card-holder-greeting-cards",  keywords: ["gift card", "slit"] },
    { label: "100lb Cover Linen Greeting Cards",        slug: "linen-greeting-cards",                keywords: ["linen"] },
    { label: "100lb Gloss Cover Greeting Cards",        slug: "gloss-cover-greeting-cards",          keywords: ["gloss cover"] },
    { label: "Pearl Greeting Cards",                    slug: "pearl-greeting-cards",                keywords: ["pearl"] },
    { label: "Silk Greeting Cards",                     slug: "silk-greeting-cards",                 keywords: ["silk"] },
    { label: "Natural Greeting Cards",                  slug: "natural-greeting-cards",              keywords: ["natural"] },
    { label: "Suede Greeting Cards",                    slug: "suede-greeting-cards",                keywords: ["suede"] },
    { label: "Brown Kraft Greeting Cards",              slug: "brown-kraft-greeting-cards",          keywords: ["brown kraft", "kraft"] },
    { label: "Akuafoil Greeting Cards",                 slug: "akuafoil-greeting-cards",             keywords: ["akuafoil"] },
    { label: "Standard Greeting Cards",                 slug: "standard-greeting-cards",             keywords: [] }, // catch-all
  ],
  // 4over.com/marketing-products/event-tickets lists 2 product types.
  "event-tickets": [
    { label: "Variable Numbering Event Tickets", slug: "variable-numbering-event-tickets", keywords: ["variable", "numbered", "numbering"] },
    { label: "Standard Event Tickets",           slug: "standard-event-tickets",           keywords: [] }, // catch-all
  ],
  envelopes: [
    { label: "Remittance Envelopes",          slug: "remittance-envelopes",          keywords: ["remittance"] },
    { label: "Blank Envelopes",               slug: "blank-envelopes",               keywords: ["blank"] },
    { label: "Digital Envelopes",             slug: "digital-envelopes",             keywords: ["digital"] },
    { label: "Variable Addressing Envelopes", slug: "variable-addressing-envelopes", keywords: ["variable"] },
    { label: "Linen Uncoated Envelopes",      slug: "linen-uncoated-envelopes",      keywords: ["linen"] },
    { label: "Natural Envelopes",             slug: "natural-envelopes",             keywords: ["natural"] },
    { label: "Offset Envelopes",              slug: "offset-envelopes",              keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /marketing-material/hang-tags/products/ is an
  // 11-card grid — confirmed live: "Regular Hang Tags" merges 14PT/16PT
  // C2S/18PT C1S (Stock) + Rectangle/Rounded-4-Corners (Shape) into ONE
  // card; "Bottleneck"/"Akuafoil"/etc are each their own card with no
  // overlap (Bottleneck's own Coating list has no Akuafoil option, so a
  // Bottle-Neck-shaped Akuafoil entry belongs under Akuafoil, not
  // Bottleneck — hence Akuafoil checked first). "Foiled" must be checked
  // before "Silk": Foil Worx's own wording is "Silk Laminated Foiled Hang
  // Tags", which would otherwise misclassify as Silk.
  "hang-tags": [
    { label: "Dual Raised Hang Tags",    slug: "dual-raised-hang-tags",    keywords: ["dual raised"] },
    { label: "Akuafoil Hang Tags",       slug: "akuafoil-hang-tags",       keywords: ["akuafoil"] },
    { label: "Foil Worx Hang Tags",      slug: "foil-worx-hang-tags",      keywords: ["foiled"] },
    { label: "Bottleneck Hang Tags",     slug: "bottleneck-hang-tags",     keywords: ["bottle neck", "bottleneck"] },
    { label: "Brown Kraft Hang Tags",    slug: "brown-kraft-hang-tags",    keywords: ["brown kraft"] },
    { label: "Natural Hang Tags",        slug: "natural-hang-tags",        keywords: ["natural"] },
    { label: "Pearl Hang Tags",          slug: "pearl-hang-tags",          keywords: ["pearl"] },
    { label: "Plastic Hang Tags",        slug: "plastic-hang-tags",        keywords: ["plastic"] },
    { label: "Raised Spot UV Hang Tags", slug: "raised-spot-uv-hang-tags", keywords: ["raised spot"] },
    { label: "Silk Hang Tags",           slug: "silk-hang-tags",           keywords: ["silk"] },
    { label: "Suede Hang Tags",          slug: "suede-hang-tags",          keywords: ["suede"] },
    { label: "Regular Hang Tags",        slug: "regular-hang-tags",        keywords: [] }, // catch-all
  ],
  magnets: [
    { label: "Car Door Magnets",           slug: "car-door-magnets",           keywords: ["car magnet", "vehicle"] },
    { label: "Magnet Postcards",           slug: "magnet-postcards",           keywords: ["postcard"] },
    { label: "Oval Magnets",              slug: "oval-magnets",               keywords: ["oval"] },
    { label: "Magnet Announcement Cards", slug: "magnet-announcement-cards",  keywords: ["announcement"] },
    { label: "Magnet Business Cards",     slug: "magnet-business-cards",      keywords: ["business card"] },
    { label: "Standard Magnets",          slug: "standard-magnets",           keywords: [] }, // catch-all
  ],
  // 4over.com's own /marketing-products/posters lists 7 types: Rally Signs,
  // Gloss Cover, Photo Gloss, Backlit, Blockout, Dull Book, Gloss Book.
  // "Rally Signs" is a confirmed genuine account gap -- 0 "rally" matches
  // anywhere in the entire fourover_products table, not just this category
  // (see also the Silk Trading Cards comment above, same situation). "Dull
  // Book Posters" = "100LB Dull Book" stock (label renamed 2026-07-10 from
  // "Matte-Finish Posters" to match 4over.com's own naming exactly -- slug
  // kept as "matte-finish-posters" for URL stability). "Photo Gloss Posters"
  // = the dedicated "8mil Photo Poster - Gloss" stock (raw wording in this
  // account is just "8mil Poster", no "Photo"/"Gloss" words at all).
  // Backlit/Blockout/Photo Gloss all live OUTSIDE this category's own UUID —
  // merged in via EXTRA_PRODUCT_SOURCES below. Backlit's own descriptions
  // are pure product_code ("9MILBACKLIT-POSTER-12X15", a 4over data gap) —
  // classifyProduct() matches keywords as a SUBSTRING of the raw text
  // (".includes()"), so "backlit" still matches inside "9milbacklit-..."
  // fine; no reconstruction needed since TYPE_RULES cards are titled from
  // TYPE_LABELS below, never from the raw description.
  posters: [
    { label: "Backlit Posters",     slug: "backlit-posters",     keywords: ["backlit"] },
    { label: "Blockout Posters",    slug: "blockout-posters",    keywords: ["blockout"] },
    { label: "Photo Gloss Posters", slug: "photo-gloss-posters", keywords: ["8mil"] },
    { label: "Dull Book Posters", slug: "matte-finish-posters", keywords: ["dull"] },
    { label: "Gloss Cover Posters", slug: "gloss-cover-posters", keywords: ["gloss cover"] },
    { label: "Gloss Book Posters",  slug: "gloss-book-posters",  keywords: [] }, // catch-all
  ],
  // 4over.com shows 2 cards: "Standard Rack Cards" (both 3.5x8.5 + 4x9) and
  // "Akuafoil Rack Cards". Akuafoil must classify first so it isn't swallowed
  // by the Standard catch-all.
  "rack-cards": [
    { label: "Akuafoil Rack Cards", slug: "akuafoil-rack-cards", keywords: ["akuafoil"] },
    { label: "Standard Rack Cards", slug: "standard-rack-cards", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /marketing-material/sell-sheets/products/ is a
  // 6-card grid, ALL brand-stock materials (Akuafoil/Brown Kraft/EndurACE/
  // Pearl/Silk/Suede) — confirmed live, every one of them genuinely has
  // "Sell Sheets" matches in the SAME shared brand-stock categories as
  // Business/Trading/Announcement Cards' own materials (merged in via
  // EXTRA_PRODUCT_SOURCES below). Sell Sheets' OWN UUID has zero brand-
  // stock matches — only plain 14PT/16PT/18PT stocks fourprintshop's
  // reference doesn't show at all; kept as a 7th "Standard" catch-all
  // rather than discarded, since it's genuine API data.
  "sell-sheets": [
    { label: "Akuafoil Sell Sheets", slug: "akuafoil-sell-sheets", keywords: ["akuafoil"] },
    { label: "Brown Kraft Sell Sheets", slug: "brown-kraft-sell-sheets", keywords: ["brown kraft"] },
    { label: "EndurACE Sell Sheets", slug: "endurace-sell-sheets", keywords: ["endurace"] },
    // 2026-07-09: "EDDM Full Service - Sell Sheets"/"EDDM Sell Sheets - Print
    // Only" (2 separate 4over.com listings) were missing entirely -- worse,
    // the EDDM uuid wasn't even pulled into this category's EXTRA_PRODUCT_
    // SOURCES at all, so its 45 genuine EDDM Sell Sheets products were never
    // fetched in the first place (same 2-layer bug found in Flyers &
    // Brochures/Postcards -- see [[flyers-brochures-audit]]/[[postcards-audit]]).
    // Split into 2 OPTION_PRESET_TYPES virtual cards (Full Service / Print
    // Only) per Boss Dwayne's request -- this "-base" entry only classifies
    // the shared product pool, excluded from the visible grid.
    { label: "EDDM Sell Sheets", slug: "eddm-sell-sheets-base", keywords: ["eddm"] },
    { label: "Pearl Sell Sheets", slug: "pearl-sell-sheets", keywords: ["pearl"] },
    { label: "Silk Sell Sheets", slug: "silk-sell-sheets", keywords: ["silk"] },
    { label: "Suede Sell Sheets", slug: "suede-sell-sheets", keywords: ["suede"] },
    // 2026-07-10: renamed from "Standard" to "Common" -- confirmed live,
    // 4over.com's own H1 for this catch-all bucket is literally "Common
    // Sell Sheets" (https://4over.com/common-sell-sheets).
    { label: "Common Sell Sheets", slug: "standard-sell-sheets", keywords: [] }, // catch-all
    // "Direct Mail Sell Sheets" not added -- confirmed 0 live matches
    // anywhere in the main Sell Sheets uuid (account gap, same as
    // Flyers/Postcards' identical Direct Mail gap).
  ],
  // fourprintshop's literal /marketing-material/table-tent/products/ is a
  // 4-card grid — confirmed live: SIZE splits the plain stocks (4x6 / 5x5.5,
  // each merging 14PT/14PT MATTE/14PT Uncoated/100LB Gloss Cover — fourprint-
  // shop's own Stock dropdown for "4x6 Table Tent" doesn't list MATTE
  // separately, so it's folded in as just another stock there, same as
  // every other merged category this session), while "Natural"/"Pearl"
  // Table Tents are each their OWN single card spanning BOTH sizes (data
  // lives in the SAME shared Natural/Pearl categories as Business/
  // Announcement Cards' own materials) — must classify before the size
  // split, same reasoning as Akuafoil Rack Cards above.
  "table-tent-cards": [
    { label: "Natural Table Tents", slug: "natural-table-tents", keywords: ["natural"] },
    { label: "Pearl Table Tents", slug: "pearl-table-tents", keywords: ["pearl"] },
    { label: "4x6 Table Tent", slug: "4x6-table-tent", keywords: ['4" x 6"'] },
    { label: "5x5.5 Table Tent", slug: "5x5-5-table-tent", keywords: [] }, // catch-all
  ],
  // No fourprintshop reference for this category (it's a pure 4over backend
  // bucket mixing 3 genuinely different product types — Door Hangers,
  // Flyers, and Postcards, each "with tear-off perforation"). Per the
  // user's explicit instruction: just ONE card per product type, full stop
  // — every Stock (100LB Gloss Book/Cover, 14PT/16PT/18PT C1S, etc.)
  // selectable inside that one card's live Size/Stock/Coating cascade,
  // same as every other TYPE_RULES category.
  "tear-off-cards": [
    { label: "Door Hangers with Tear-Off Perforation", slug: "door-hangers-tear-off", keywords: ["door hangers"] },
    { label: "Flyers with Tear-Off Perforation", slug: "flyers-tear-off", keywords: ["flyers"] },
    { label: "Postcards with Tear-Off Perforation", slug: "postcards-tear-off", keywords: [] }, // catch-all
  ],
  // 2026-07-10: rebuilt against 4over.com's own actual `/direct-mail-services`
  // page (the earlier version of this comment cited "fourprintshop", the
  // stale pre-Boss-Dwayne reference site — see [[client-demo-reference-was-fourprintshop-not-v0]]).
  // 4over.com's real page is a 16-card grid: 8 EDDM cards (4 product types x
  // Full Service/Print Only) + 8 non-EDDM "Direct Mail *" cards. Confirmed
  // via direct DB query: the 8 "Direct Mail *" cards are a genuine account
  // gap (0 "direct mail" matches anywhere in the whole account, matching the
  // identical gap already documented in flyers-and-brochures/postcards above)
  // -- not reproduced here. The 8 EDDM cards reduce to 3 real product-type
  // buckets in this uuid's own data (Postcards/Sell Sheets/Flyers -- "Half
  // Folds" and "Booklet" have 0 matching text, they're not separate data,
  // "Half Folds" is 4over's own name for the general Flyers line on this
  // overview page specifically). Verified clean 3-way split across all 165
  // raw entries (63 Postcards / 45 Sell Sheets / 55 Flyers + 2 unmatched
  // Flyers, zero leftover). These "-base" entries only classify the shared
  // product pools -- excluded from the visible grid in favor of the 6
  // OPTION_PRESET_TYPES virtual cards below (Full Service / Print Only per
  // type), matching 4over.com's own literal 2-cards-per-type split, same
  // mechanism already used by flyers-and-brochures/postcards/sell-sheets.
  eddm: [
    { label: "EDDM Postcards", slug: "eddm-postcards-base", keywords: ["postcards"] },
    { label: "EDDM Sell Sheets", slug: "eddm-sell-sheets-base", keywords: ["sell sheets"] },
    { label: "EDDM Flyers", slug: "eddm-flyers-base", keywords: [] }, // catch-all
  ],
  // 4over.com's /signs-banners/display-events/table-covers page (the
  // canonical reference) is a 2-card grid: "Tablecloths", "Table Runners" —
  // label renamed from "Table Cloths" to match (2026-07-08). Covers all 4
  // sizes (68x132, 68x156, 90x132, 90x156); "Table Runners" covers all 5
  // widths. All 4 Tablecloth entries in this account have pure product_code
  // descriptions ("9OZPOLY-TABLETHROW-68X132") with NO clean sibling to
  // reconstruct from (every one of them is equally code-like) — handled in
  // [typeSlug]/page.tsx with a targeted regex instead of the generic
  // reconstructCodeLikeDescriptions helper. Not needed here: classification
  // below matches "tablethrow" as a raw substring fine, and this level-3
  // page's card title comes from the static label, never the raw
  // description.
  "table-covers": [
    { label: "Tablecloths", slug: "table-cloths", keywords: ["tablethrow"] },
    { label: "Table Runners", slug: "table-runners", keywords: [] }, // catch-all
  ],
  // 4over's /signs-banners/signs-banners-signs/wall-art has 3 products.
  // Mounted Canvas: UUID b83112e8. Acrylic Signs: UUID 7ad1aae9 (EXTRA).
  // Aluminum Dye Sub: UUID d157e6f2 (Aluminum) via EXTRA_PRODUCT_SOURCES.
  "wall-arts": [
    { label: "Clear Acrylic Signs", slug: "clear-acrylic-signs", keywords: ["acrylic"] },
    { label: "Aluminum Dye Sub", slug: "aluminum-dye-sub", keywords: ["dye sub", "dye sublimation", "dye-sub"] },
    { label: "Mounted Canvas", slug: "mounted-canvas", keywords: ["canvas"] },
  ],
  // fourprintshop's literal /signs-banners/rigid-signs/products/ is a
  // 9-card grid — confirmed live: 7 of these 9 (10mm/4mm/3mm/Rider/Foam
  // Core/Aluminum Heavy Duty/Aluminum Sandwich Board) genuinely exist in
  // this sandbox. "High Quantity Coro" (4mm White Coroplast, just a
  // different quantity tier) and "Real Estate Post" (3mm PVC, fixed 18x24
  // for H-Stake mounting) are confirmed ABSENT from both rigid-signs' own
  // UUID and the dedicated Aluminum UUID — not fabricated, simply omitted.
  // "Styrene Signs" and "Gator Board" (Black+White merged into one card)
  // are genuine extras this sandbox has that fourprintshop's own page
  // doesn't show — kept rather than discarded, consistent with every other
  // genuine-extra decision this session. "Coroplast Rider Signs" must be
  // checked before "4mm Coroplast Signs" (broader match) — every Rider
  // entry is ALSO "4mm White Coroplast" stock.
  "rigid-signs": [
    { label: "10mm Coroplast Signs", slug: "10mm-coroplast-signs", keywords: ["10mm"] },
    { label: "Rider Signs", slug: "coroplast-rider-signs", keywords: ["rider"] },
    { label: "4mm Coroplast Signs", slug: "4mm-coroplast-signs", keywords: ["4mm white coroplast"] },
    { label: "3mm PVC Signs", slug: "3mm-pvc-signs", keywords: ["3mm white pvc signs"] },
    { label: "Foam Core Signs", slug: "foam-core-signs", keywords: ["foamcore", "foam core"] },
    { label: "Aluminum Heavy Duty", slug: "aluminum-heavy-duty", keywords: ["heavy duty"] },
    { label: "Single and Double Sided Aluminum Sandwich Board", slug: "aluminum-sandwich-board", keywords: ["sandwich board"] },
    { label: "Styrene Signs", slug: "styrene-signs", keywords: ["styrene"] },
    { label: "Gator Board Signs", slug: "gator-board-signs", keywords: [] }, // catch-all
  ],
  // 4over.com's own /signs-banners/banners-flags/outdoor-banners page (the
  // canonical reference per client 2026-07-07 — "just look at what 4 over
  // had... name same way", NOT fourprintshop) is a 4-card grid: Scrim Vinyl
  // Banners, 18oz Single Sided Blockout Banner, 18oz Double Sided Blockout
  // Banner, Mesh Banners. Live API investigation (2026-07-08) confirmed
  // this account's own "Outdoor Banner" category UUID has ZERO blockout
  // entries (522 raw: 139 Mesh / 382 Scrim / 1 Banner Stand, verified via
  // direct API call, not just cache) — the 18oz Blockout line actually
  // lives inside the "Indoor Banner" category UUID (its raw descriptions
  // say "...18oz Blockout Indoor Vinyl Banner" even though 4over.com's own
  // site lists it under OUTDOOR, not indoor — a mislabeled/cross-listed
  // 4over data quirk, not a sync gap). Single vs Double Sided is NOT a
  // separate product — confirmed via productsfeed: both are just the
  // existing Colorspec option (4/0 vs 4/4) on the SAME product_uuid, so one
  // merged card is correct per the duplicate-variants-belong-in-calculator
  // rule. Pulled in via EXTRA_PRODUCT_SOURCES below; simulated in Node
  // against live data first — clean 4-way split, 580 total, zero leftover
  // (139 Mesh / 382 Scrim / 58 Blockout / 1 Stand).
  "outdoor-banners": [
    { label: "Mesh Banners", slug: "mesh-banners", keywords: ["mesh"] },
    { label: "Scrim Vinyl Banners", slug: "scrim-vinyl-banners", keywords: ["13oz outdoor vinyl banner"] },
    { label: "18oz Blockout Banner", slug: "18oz-blockout-banner", keywords: ["18oz"] },
    { label: "Banner Stand Kit", slug: "banner-stand-kit", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /signs-banners/indoor-banners/products/ is a
  // 5-card grid. Only 2 of these (Premium Vinyl/15oz Blockout) live in this
  // category's own UUID once the 18oz Blockout entries are excluded (moved
  // to outdoor-banners above — see that entry's comment). "Artist Canvas"
  // and "Premium Polyester Banners" were INITIALLY assumed absent (this
  // sandbox's own UUID has zero matches for either), but checking each
  // fourprintshop product page's live Stock dropdown value+uuid revealed
  // both actually live in the SAME shared "Fabric Banners" category
  // (stock_uuid "a33cb149..." for Artist Canvas / "cc846f34..." for
  // Premium Polyester — exact matches, confirmed via direct stock_uuid
  // comparison, not just wording) — merged in via EXTRA_PRODUCT_SOURCES
  // below. Canvas/Polyester checked first since they're the more specific
  // keywords. 18oz Blockout entries are EXCLUDED from this category's own
  // productList (see the `category === "indoor-banners"` filter below) and
  // reassigned to outdoor-banners instead — see that entry's comment for
  // why. Confirmed clean 4-way split across 450 combined raw entries (160
  // Canvas / 140 Polyester / 87 10mil / 63 15oz, zero leftover).
  "indoor-banners": [
    { label: "Artist Canvas", slug: "artist-canvas", keywords: ["artist canvas"] },
    { label: "Premium Polyester Banners", slug: "premium-polyester-banners", keywords: ["premium polyester banner"] },
    { label: "Premium Vinyl Banners", slug: "premium-vinyl-banners", keywords: ["10mil"] },
    { label: "15oz Blockout Indoor Vinyl Banner", slug: "15oz-blockout-indoor-vinyl-banner", keywords: [] }, // catch-all (18oz already excluded)
  ],
  // fourprintshop's literal /signs-banners/flags/products/ is a 3-card grid
  // (Feather/Pole/Teardrop Flags) — confirmed live: this sandbox's own
  // "Feather Flag" entries weren't merging into one card under the old
  // sizeGrouped path (5 sizes: 8ft/10ft/12ft Regular/12ft Jumbo/15ft, all
  // single linear dimensions with no "WxH" pattern at all, so the generic
  // groupKey/stripSize machinery had nothing to strip), hence the move to
  // TYPE_RULES here. All 12 raw entries split cleanly by shape word
  // (5 Feather / 3 Pole / 4 Teardrop, zero leftover) — single shared stock
  // ("3OZPOLY") across all of them.
  flags: [
    { label: "Feather Flags", slug: "feather-flags", keywords: ["feather"] },
    { label: "Pole Flags", slug: "pole-flags", keywords: ["pole"] },
    { label: "Teardrop Flags", slug: "teardrop-flags", keywords: [] }, // catch-all
  ],
  // 4over.com's own /signs-banners/graphics/window-graphics page (the
  // canonical reference, not fourprintshop) is a 5-card grid: Digital Clear
  // Window Clings, See-Through Perforated Window Vinyl Graphic, Opaque
  // Window Graphics, Standard White Window Clings, Clear Window Clings.
  // This category's own UUID (ae3afb44) has a clean 4-way split across all
  // 1485 raw entries (414 White / 240 Clear / 826 Perforated / 5 Opaque,
  // zero leftover) — but the 5th, "Digital Clear Window Clings", was
  // MISSING (2026-07-08 fix): it lives in a SEPARATE "Window Clings"
  // category UUID (2d084783, 18 raw "8 mil Digital Clear Window Cling"
  // entries, genuinely distinct from the 240 plain "8mil Clear Window
  // Cling" entries in ae3afb44 — confirmed via live API, not a duplicate).
  // An earlier session dismissed 2d084783 as a "near-empty redundant
  // subset" and dropped it entirely — that was wrong; it's a real 5th
  // product 4over.com lists separately. Pulled in via EXTRA_PRODUCT_SOURCES
  // below, checked BEFORE the "clear" rule since its own description also
  // contains the word "clear". One stray "8.5\" X 11\" 7mil Window Cling"
  // entry (in ae3afb44) is missing the word "White" entirely (4over data
  // gap, product_code confirms it's the same "7MIL" stock) — "white"
  // classification also checks the bare "7mil" keyword to catch it. Labels
  // renamed to match 4over.com's exact wording (was "Standard Clings:
  // Clear/White").
  "window-graphics": [
    { label: "Digital Clear Window Clings", slug: "digital-clear-window-clings", keywords: ["digital"] },
    { label: "See-Through Perforated Window Vinyl Graphic", slug: "see-through-perforated-window-vinyl-graphic", keywords: ["perforated"] },
    { label: "Opaque Window Graphics", slug: "opaque-window-graphics", keywords: ["opaque"] },
    { label: "Clear Window Clings", slug: "clear-window-clings", keywords: ["clear"] },
    { label: "Standard White Window Clings", slug: "standard-white-window-clings", keywords: [] }, // catch-all (White + the "7mil" gap entry)
  ],
  // fourprintshop's literal /signs-banners/wall-decals/products/ is a
  // 2-card grid (High Tack Adhesive Vinyl, Low Tack Vinyl Wall Decals).
  // Wall Decals shares its OWN "Adhesive Vinyl" UUID with Floor Graphics
  // (978 raw entries total) but had NO keyword filter at the categories.ts
  // level — confirmed live: it was showing Floor Graphics' own cards mixed
  // in. Deliberately NO catch-all here — anything that isn't "high tack" or
  // "wall" (i.e. every Floor Graphics entry) returns null from
  // classifyProduct() and gets excluded from this category entirely,
  // exactly the same way a missing catch-all already works elsewhere.
  // Covers all but 1 of the 978 raw entries (482 High Tack / 347 Wall / 148
  // Floor Graphics, explicit keyword match) — the 1 leftover stray
  // "8MIL-AVLT-14X62" code-like entry shares its product_code prefix with
  // dozens of clean "8mil Low Tack Wall Graphic" siblings, so the existing
  // generic reconstructCodeLikeDescriptions() call already fixes it before
  // classification runs, and it naturally falls into "wall" too.
  "wall-decals": [
    { label: "High Tack Adhesive Vinyl", slug: "high-tack-adhesive-vinyl", keywords: ["high tack"] },
    { label: "Low Tack Vinyl Wall Decals", slug: "low-tack-vinyl-wall-decals", keywords: ["wall"] },
  ],
  // 2026-07-10: was a flat sizeGrouped listing with no TYPE_RULES -- 5 cards
  // rendered but titled from raw, sometimes code-like text (one card was
  // literally "13OZOUTDOOR-BANNER", a pure product_code, no image at all).
  // 4over.com's real /signs-banners/display-events/{indoor,outdoor}-banner-
  // stands pages list 6 types: Standard Retractable, Deluxe Single-Sided
  // Retractable, X-Style Collapsible (indoor), X-Style Collapsible Outdoor,
  // Telescopic Backdrop, Deluxe Double-Sided Retractable. Confirmed via
  // direct DB query: only 11 raw rows exist total, collapsing to these 4
  // real product lines + 1 code-like group -- "Deluxe Double-Sided" has 0
  // "double" matches anywhere, a confirmed account gap. "Deluxe" raw text
  // has a genuine 4over typo ("Retarctable"), harmless since the card title
  // comes from the static label below, not the raw description. The 6
  // code-like "13OZOUTDOOR-BANNER-WxH" entries (36x60 up to 95x96, much
  // larger than the other stands' 24x60/33x80/47x80) have no descriptive
  // text at all -- labeled "Telescopic Backdrop" as the best fit (backdrop-
  // scale sizes, and it's the only 4over.com type left unaccounted for),
  // but this is INFERRED from size range, not confirmed via explicit
  // product text -- flag for re-verification if a 4over rep can confirm.
  "banner-stands": [
    { label: "Deluxe Single-Sided Retractable Banner Stands", slug: "deluxe-single-sided-retractable-banner-stands", keywords: ["deluxe"] },
    { label: "X-Style Collapsible Outdoor Banner Stands", slug: "x-style-collapsible-outdoor-banner-stands", keywords: ["13oz outdoor banner with economy"] },
    { label: "X-Style Collapsible Banner Stands", slug: "x-style-collapsible-banner-stands", keywords: ["economy collapsible"] },
    { label: "Standard Retractable Banner Stands", slug: "standard-retractable-banner-stands", keywords: ["retractable banner with stand"] },
    { label: "Telescopic Backdrop Banner Stands", slug: "telescopic-backdrop-banner-stands", keywords: [] }, // catch-all (code-like entries)
  ],
  // fourprintshop's literal /signs-banners/displays/products/ is a 6-card
  // grid spanning 4 DIFFERENT 4over categories — confirmed live: "Event
  // Tents"/"Fan Cutout"/"Foam Core Counter Cards"/"White PVC Counter Cards"
  // all live in their OWN dedicated categories (Event Tents, Fan Cutouts,
  // Counter Cards respectively — the latter two materials, confirmed
  // matching wording), merged in via EXTRA_PRODUCT_SOURCES below; only
  // "Tabletop"/"Fabric Tube Displays" actually live in Displays' own UUID.
  // "Silicon Edge Graphic Display" ALSO lives in Displays' own UUID but
  // isn't on fourprintshop's 6-card page at all — a genuine extra, kept
  // rather than discarded, same as every other genuine-extra decision this
  // session. Confirmed clean 7-way split across all 19 combined raw
  // entries (3 Tabletop / 3 Fabric Tube / 5 Silicon Edge / 1 Event Tent /
  // 1 Fan Cutout / 3 Foam Core / 3 White PVC, zero leftover) — no catch-all
  // needed, every type has an explicit, non-overlapping keyword.
  displays: [
    { label: "Tabletop Displays", slug: "tabletop-displays", keywords: ["tabletop"] },
    { label: "Fabric Tube Displays", slug: "fabric-tube-displays", keywords: ["fabric tube"] },
    { label: "Silicon Edge Graphic Display", slug: "silicon-edge-graphic-display", keywords: ["silicon edge"] },
    { label: "Event Tents", slug: "event-tents", keywords: ["event tent"] },
    { label: "Fan Cutout", slug: "fan-cutout", keywords: ["fan cutout"] },
    { label: "Foam Core Counter Cards", slug: "foam-core-counter-cards", keywords: ["foam core"] },
    { label: "White PVC Counter Cards", slug: "white-pvc-counter-cards", keywords: ["pvc"] },
  ],
  // 4over.com shows 11 trading card types. Specialty stocks (Akuafoil, Brown
  // Kraft, Natural, Pearl, Suede, Foil Worx) come from EXTRA_PRODUCT_SOURCES;
  // main UUID provides 14pt, 16pt, 18pt, and 100lb Cover Linen. Silk Trading
  // Cards appears on 4over retail but is absent from the wholesale API (zero
  // results across all checked UUIDs — same situation as Rally Signs/Posters).
  // Akuafoil before "16pt": raw desc reads "16PT Trading Cards with Akuafoil".
  // Brown Kraft before "18pt": raw desc reads "18PT Uncoated Brown Kraft...".
  "trading-cards": [
    { label: "Akuafoil Trading Cards",         slug: "akuafoil-trading-cards",          keywords: ["akuafoil"] },
    { label: "Brown Kraft Trading Cards",       slug: "brown-kraft-trading-cards",       keywords: ["brown kraft", "kraft"] },
    { label: "Foil Worx Trading Cards",         slug: "foil-worx-trading-cards",         keywords: ["foil worx", "foiled"] },
    { label: "Natural Trading Cards",           slug: "natural-trading-cards",           keywords: ["natural"] },
    { label: "Pearl Trading Cards",             slug: "pearl-trading-cards",             keywords: ["pearl"] },
    // 2026-07-09: "Silk Trading Cards" was missing entirely (present on
    // 4over.com, its EXTRA_PRODUCT_SOURCES uuid was already being pulled in
    // below) -- with no keyword rule to claim it, every Silk product silently
    // fell through to the "14pt Trading Cards" catch-all instead of forming
    // its own card.
    { label: "Silk Trading Cards",              slug: "silk-trading-cards",              keywords: ["silk"] },
    { label: "Suede Trading Cards",             slug: "suede-trading-cards",             keywords: ["suede"] },
    { label: "100lb Cover Linen Trading Cards", slug: "100lb-cover-linen-trading-cards", keywords: ["linen"] },
    { label: "18pt Trading Cards",              slug: "18pt-trading-cards",              keywords: ["18pt"] },
    { label: "16pt Trading Cards",              slug: "16pt-trading-cards",              keywords: ["16pt"] },
    { label: "14pt Trading Cards",              slug: "14pt-trading-cards",              keywords: [] }, // catch-all
  ],
}

// Virtual type-cards that don't classify a DIFFERENT set of products the way
// TYPE_RULES does — they reuse a "base" type's own product set, but pre-
// select a specific value in one of that base type's "extra" calculator
// option groups (Folding Options, EDDM Service Option, etc), and get their
// own findable card with the right label/slug instead of being buried
// inside a dropdown or merged away. Kept in sync with [typeSlug]/page.tsx's
// own copy (same duplicate-map pattern as TYPE_RULES/TYPE_KEYWORDS
// throughout this file).
// 2026-07-09: renamed from FOLDING_PRESET_TYPES — originally built only for
// Tri Fold/Z Fold/Specialty Folds Brochures, then reused for EDDM Full
// Service/Print Only after Boss Dwayne confirmed (via WhatsApp video +
// follow-up) he wants those presented as 2 SEPARATE findable cards matching
// 4over.com's own literal listing, not merged into one card with a dropdown
// (the earlier merge decision in [[flyers-brochures-audit]]/[[postcards-audit]]/
// [[sell-sheets-audit]] was wrong for this specific case — those categories'
// merged "EDDM X" TYPE_RULES entries were removed and replaced by the 2
// split presets below).
const OPTION_PRESET_TYPES: Record<string, { label: string; slug: string; baseSlug: string; optionGroupMatch: RegExp; optionMatch: RegExp }[]> = {
  "flyers-and-brochures": [
    { label: "EDDM Full Service - Flyers", slug: "eddm-full-service-flyers", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Flyers - Print Only", slug: "eddm-flyers-print-only", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
    // 2026-07-10: 4over.com's own /marketing-products/flyers-brochures page
    // lists FOUR EDDM cards, not 2 -- these 2 "Half Folds" entries use
    // different photos than the "Flyers" pair above but draw from the
    // exact same "eddm-flyers-base" pool (confirmed 0 "half fold" text
    // anywhere in the raw data) -- 4over's own retail site lists the same
    // wholesale product twice under 2 display names. Reuses the identical
    // slugs/labels already built for the /print/eddm category's own Half
    // Folds pair (same underlying data, same TYPE_LABELS/TYPE_IMAGES).
    { label: "EDDM Full Service - Half Folds", slug: "eddm-full-service-half-folds", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Print Only - Half Folds", slug: "eddm-print-only-half-folds", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
    { label: "Tri Fold Brochures", slug: "tri-fold-brochures", baseSlug: "flat-flyers-brochures", optionGroupMatch: /folding/i, optionMatch: /^Tri-Fold/i },
    { label: "Z Fold Brochures", slug: "z-fold-brochures", baseSlug: "flat-flyers-brochures", optionGroupMatch: /folding/i, optionMatch: /^Z-Fold/i },
    // Everything else that isn't Flat/Half-Fold/Tri-Fold/Z-Fold — matches
    // 4over.com's own "Specialty Folds Brochures" grouping (Gatefold, Double
    // Gatefold, French Fold, Roll Fold, Double Parallel Fold, Reverse Double
    // Parallel Fold, Half-Fold and then Tri-Fold).
    { label: "Specialty Folds Brochures", slug: "specialty-folds-brochures", baseSlug: "flat-flyers-brochures", optionGroupMatch: /folding/i, optionMatch: /gatefold|french fold|roll fold|parallel fold|half-fold and then/i },
  ],
  postcards: [
    { label: "EDDM Full Service Postcards", slug: "eddm-full-service-postcards", baseSlug: "eddm-postcards-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Postcards Print Only", slug: "eddm-print-only-postcards", baseSlug: "eddm-postcards-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
  ],
  "sell-sheets": [
    { label: "EDDM Full Service Sell Sheets", slug: "eddm-full-service-sell-sheets", baseSlug: "eddm-sell-sheets-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Sell Sheets Print Only", slug: "eddm-print-only-sell-sheets", baseSlug: "eddm-sell-sheets-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
  ],
  // 2026-07-10: the eddm category's own /direct-mail-services overview page.
  // Postcards/Sell Sheets pairs reuse the SAME slugs (and therefore the same
  // TYPE_LABELS/TYPE_IMAGES entries) as postcards'/sell-sheets' own EDDM
  // cards above -- TYPE_LABELS is a flat, category-unaware Record<string,
  // string>, so giving these a different label under a different slug here
  // risked an inconsistent/colliding lookup for no real benefit (same
  // product, same service). Only "Half Folds" is genuinely new (4over.com's
  // own name for the Flyers pair on THIS specific overview page).
  eddm: [
    { label: "EDDM Full Service Postcards", slug: "eddm-full-service-postcards", baseSlug: "eddm-postcards-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Postcards Print Only", slug: "eddm-print-only-postcards", baseSlug: "eddm-postcards-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
    { label: "EDDM Full Service Sell Sheets", slug: "eddm-full-service-sell-sheets", baseSlug: "eddm-sell-sheets-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Sell Sheets Print Only", slug: "eddm-print-only-sell-sheets", baseSlug: "eddm-sell-sheets-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
    { label: "EDDM Full Service - Half Folds", slug: "eddm-full-service-half-folds", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Print Only - Half Folds", slug: "eddm-print-only-half-folds", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
  ],
}

// Some subcategories' product-type cards span MULTIPLE 4over categories, not
// just their own leaf.uuid — fourprintshop's literal reference page for
// Announcement Cards is a flat 10-card grid (Standard, Round Corner,
// Akuafoil, Brown Kraft, Magnet, Natural, Painted Edge, Pearl, Silk, Suede),
// but only Standard+Round Corner live in announcement-cards' own category
// (62bdcc8e); the other 7 materials are nested inside the SAME shared
// "brand stock" categories already used by their Business Cards counterparts
// (verified live: Akuafoil 25 matches, Suede 20, Silk/Pearl/Natural 8 each,
// Brown Kraft 5, Painted Edge 3, Magnet 4 in the dedicated Magnets category).
// Extra sources are merged into productList BEFORE groupKey-grouping, so they
// show up as ordinary product-type cards alongside the primary category's —
// each retains its OWN real category_uuid (set when cached), so clicking
// through still scopes Stock/Coating/sibling-matching correctly per material.
const EXTRA_PRODUCT_SOURCES: Record<string, { uuid: string; keyword: string | string[] }[]> = {
  // "Tearoff Flyers" data lives in the dedicated Tear Off Cards category
  // (f3b51933, also used by the tear-off-cards subcategory) — its own
  // "Flyers with tear-off perforation..." entries, not flyers-and-brochures'
  // own UUID (which has zero "tear" matches). This works for TYPE_RULES
  // categories too: productList is built once, with extra sources merged in,
  // BEFORE classifyProduct() buckets it into type cards.
  "flyers-and-brochures": [
    { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", keyword: ["flyer", "tear-off perforation"] }, // Tearoff Flyers
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: ["flyer", "brochure"] }, // EndurACE -- 0 live matches (account gap: this uuid only has BCs/Door Hangers/Menus/Mini Menus/Postcards/Sell Sheets, no Flyers/Brochures)
    // Was `["flyer", "brochure", "half fold"]` (matchesAllKeywords = AND) --
    // confirmed 2026-07-09 that NO product in this uuid contains "brochure"
    // text at all, so the AND of all 3 was permanently false and this entire
    // source silently contributed 0 products, no matter what TYPE_RULES said.
    { uuid: "50a1f1a2-3567-4618-a703-074471472e8d", keyword: "flyer" }, // EDDM Flyers (excludes the uuid's EDDM Postcards/Sell Sheets, which don't say "flyer")
  ],
  // "Tearoff Door Hangers" (Tear Off Cards UUID) + "EndurACE Door Hangers"
  // (EndurACE UUID, same one used by EndurACE Business Cards/Flyers) — see
  // the matching comment on door-hangers' TYPE_RULES entry.
  "door-hangers": [
    { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", keyword: "door hanger" },
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: "door hanger" },
  ],
  // Greeting Cards specialty stocks live in shared brand-stock UUIDs
  // (same pattern as Announcement Cards / Postcards / Hang Tags).
  "greeting-cards": [
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "greeting card" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "greeting card" }, // Suede
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "greeting card" }, // Pearl
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: "greeting card" }, // Natural
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "greeting card" }, // Brown Kraft
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "greeting card" }, // Akuafoil
    { uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2", keyword: "greeting card" }, // Dual Raised
    { uuid: "f30e7cbf-0e9a-4122-a5aa-3330887e4d9f", keyword: "greeting card" }, // Raised Foil
    { uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f", keyword: "greeting card" }, // Raised Spot UV
  ],
  // "Variable Addressing Envelopes" data lives in the dedicated "Variable
  // Data" category (f5e2f7e8) — envelopes' own UUID has zero "variable"
  // matches.
  envelopes: [{ uuid: "f5e2f7e8-0ba8-47a6-964d-3ec6dddef2cb", keyword: "envelope" }],
  // Brand-stock materials (same shared categories as Business Cards/Trading
  // Cards/Announcement Cards) plus Plastic/Raised Spot UV (same shared
  // categories as their Business Cards counterparts).
  "hang-tags": [
    { uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2", keyword: "hang tag" }, // Dual Raised
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "hang tag" }, // Akuafoil
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "hang tag" }, // Brown Kraft
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: "hang tag" }, // Natural
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "hang tag" }, // Pearl
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "hang tag" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "hang tag" }, // Suede
    { uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", keyword: "hang tag" }, // Foil Worx
    { uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e", keyword: "hang tag" }, // Plastic
    { uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f", keyword: "hang tag" }, // Raised Spot UV
  ],
  // Car Door Magnets live under Signs & Banners (vehicle-magnets UUID) but
  // 4over.com lists them under Marketing Products > Magnets too. 2026-07-10:
  // was `keyword: "car door"` -- 0 live matches, confirmed this uuid's 17
  // products all say "30mil Car Magnet" (no "Door" in the text at all), so
  // the keyword was permanently false and this source silently contributed
  // 0 products no matter what TYPE_RULES said.
  magnets: [
    { uuid: "5b0ab4cc-8ab1-4377-b42d-d3db500a9e44", keyword: "car magnet" }, // Car Door Magnets
  ],
  // Mini Menus live in the shared EndurACE (d3010094) and Brown Kraft
  // (ee4f8eed) brand-stock UUIDs, not menus' own UUID (059ea2cb) — same
  // "shared brand category, own UUID has none" pattern as Sell Sheets/Rack
  // Cards above. Confirmed live 2026-07-10 while investigating "Common
  // Menus" (a genuine account gap, no alternative anywhere in the account).
  menus: [
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: "mini menu" }, // EndurACE
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "mini menu" }, // Brown Kraft
  ],
  // "Backlit Posters" (dedicated UUID, raw product_code descriptions — see
  // the matching comment on posters' TYPE_RULES entry) + "Blockout"/"Photo
  // Gloss" (both nested inside the SAME "Large Posters" UUID).
  posters: [
    { uuid: "8294ed4d-4d8c-4bea-966e-d3ad56913e74", keyword: "poster" }, // Backlit
    { uuid: "393c5a2d-8be0-4134-9161-aa35fdc60685", keyword: "poster" }, // Large Posters (Blockout + 8mil/Photo Gloss)
  ],
  // Akuafoil Rack Cards' data lives in the SAME shared Akuafoil category as
  // Business/Trading/Announcement Cards' own Akuafoil material — described
  // as "...Postcards with Akuafoil..." there (4over's own labeling quirk,
  // same as rack-cards' own UUID using "Postcards" wording too). Scoped by
  // BOTH "akuafoil" AND the exact size text so this doesn't also pull in
  // unrelated Akuafoil Postcards at OTHER sizes (4x6, 5x7, etc).
  "rack-cards": [
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: ["akuafoil", '3.5" x 8.5"'] },
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: ["akuafoil", '4" x 9"'] },
  ],
  "sell-sheets": [
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: ["akuafoil", "sell sheet"] },
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: ["brown kraft", "sell sheet"] },
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: ["endurace", "sell sheet"] },
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: ["pearl", "sell sheet"] },
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: ["silk", "sell sheet"] },
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: ["suede", "sell sheet"] },
    // 2026-07-09: was missing entirely -- the EDDM uuid's 45 genuine Sell
    // Sheets products were never fetched into this category at all. See
    // matching TYPE_RULES comment above.
    { uuid: "50a1f1a2-3567-4618-a703-074471472e8d", keyword: "sell sheet" },
  ],
  "table-tent-cards": [
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: ["natural", "table tent"] },
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: ["pearl", "table tent"] },
  ],
  "wall-arts": [
    { uuid: "7ad1aae9-741d-40f5-b3dc-6d75524878ce", keyword: "acrylic" }, // Clear Acrylic Signs
    { uuid: "d157e6f2-ee47-4373-a1b4-8ebc18b40561", keyword: "dye-sub" }, // Aluminum Dye Sub
  ],
  // Scoped to JUST Heavy Duty/Sandwich Board, not a bare "aluminum" match —
  // this UUID also has an "Aluminum - Dye-Sublimation" stock fourprintshop's
  // own page doesn't show, which would otherwise fall through to the
  // Gator Board catch-all below.
  "rigid-signs": [
    { uuid: "d157e6f2-ee47-4373-a1b4-8ebc18b40561", keyword: "heavy duty" },
    { uuid: "d157e6f2-ee47-4373-a1b4-8ebc18b40561", keyword: "sandwich board" },
  ],
  "indoor-banners": [
    { uuid: "a8e3e0a3-695d-4a34-8143-ba363bd0dc97", keyword: "artist canvas" },
    { uuid: "a8e3e0a3-695d-4a34-8143-ba363bd0dc97", keyword: "premium polyester banner" },
  ],
  // 18oz Blockout lives in the "Indoor Banner" category UUID's raw data
  // (mislabeled — see outdoor-banners' TYPE_RULES comment) but 4over.com
  // displays it under Outdoor Banners, not Indoor.
  "outdoor-banners": [
    { uuid: "35170807-4aa5-4d13-986f-c0e266a5d685", keyword: "18oz" },
  ],
  // "Digital Clear Window Clings" lives in a separate "Window Clings"
  // category UUID, not window-graphics' own — see that TYPE_RULES entry's
  // comment.
  "window-graphics": [
    { uuid: "2d084783-38ef-4a1c-a5fb-7ec8e78700cd", keyword: "digital" },
  ],
  displays: [
    { uuid: "de3d843a-b802-4ec5-826f-1b230a17ce3a", keyword: "event tent" }, // Event Tents
    { uuid: "fa7e5e9e-6985-41f9-b29d-aedd771b94e7", keyword: "fan cutout" }, // Fan Cutouts
    { uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3", keyword: "foam core" }, // Counter Cards
    { uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3", keyword: "pvc" }, // Counter Cards
  ],
  // Silk/Suede/Akuafoil Presentation Folders live in their own brand-stock UUIDs.
  "presentation-folders": [
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "presentation folder" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "presentation folder" }, // Suede
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "presentation folder" }, // Akuafoil
  ],
  // Brand-stock materials for postcards live in their own shared category UUIDs
  // (same pattern as Announcement Cards/Trading Cards/Sell Sheets). Tearoff
  // Postcards live in the Tear Off Cards UUID; Magnet Postcards in Magnets UUID;
  // EDDM variants in the EDDM UUID.
  "postcards": [
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "postcard" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "postcard" }, // Suede
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "postcard" }, // Pearl
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: "postcard" }, // Natural
    { uuid: "b2d0278e-02e6-4861-99ba-951b66f2f1ed", keyword: "postcard" }, // Painted Edge
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "postcard" }, // Brown Kraft
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "postcard" }, // Akuafoil
    { uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2", keyword: "postcard" }, // Dual Raised
    { uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f", keyword: "postcard" }, // Raised Spot UV
    { uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", keyword: "postcard" }, // Foil Worx
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: "postcard" }, // EndurACE
    { uuid: "f30e7cbf-0e9a-4122-a5aa-3330887e4d9f", keyword: "postcard" }, // Raised Foil
    { uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e", keyword: "postcard" }, // Plastic
    { uuid: "19a9a6c8-a8c8-4d0c-b4fc-8a231c1bdd53", keyword: "postcard" }, // Magnets (Magnet Postcards)
    { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", keyword: "postcard" }, // Tear Off Cards (Tearoff Postcards)
    { uuid: "50a1f1a2-3567-4618-a703-074471472e8d", keyword: "postcard" }, // EDDM (EDDM variants)
  ],
  "announcement-cards": [
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "announcement" }, // Akuafoil
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "announcement" }, // Brown Kraft
    { uuid: "19a9a6c8-a8c8-4d0c-b4fc-8a231c1bdd53", keyword: "announcement" }, // Magnet
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: "announcement" }, // Natural
    { uuid: "b2d0278e-02e6-4861-99ba-951b66f2f1ed", keyword: "announcement" }, // Painted Edge
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "announcement" }, // Pearl
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "announcement" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "announcement" }, // Suede
  ],
  // 2026-07-10: new category, same EXTRA_PRODUCT_SOURCES pattern as
  // Announcement Cards above -- confirmed via direct DB query, 71 raw
  // "social card" matches across these 8 uuids total (including the
  // primary Business Cards uuid 08a9625a, scoped via categories.ts'
  // keyword field there).
  "social-cards": [
    { uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", keyword: "social card" }, // Foil Worx
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "social card" }, // Brown Kraft
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "social card" }, // Pearl
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "social card" }, // Akuafoil
    { uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e", keyword: "social card" }, // Plastic
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "social card" }, // Suede
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "social card" }, // Silk
  ],
  // fourprintshop's literal /marketing-material/trading-cards/products/ is a
  // flat 11-card grid (100lb Cover Linen/14pt/16pt/18pt/Akuafoil/Brown Kraft/
  // Foil Worx/Natural/Pearl/Silk/Suede) — same "brand stock materials live in
  // the SAME shared categories as their Business Cards counterparts" pattern
  // as Announcement Cards (verified live: Akuafoil 5 matches, Silk 4, Foil
  // Worx 5, Brown Kraft/Natural/Pearl/Suede 1 each).
  "trading-cards": [
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "trading card" }, // Akuafoil
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "trading card" }, // Brown Kraft
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: "trading card" }, // Natural
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "trading card" }, // Pearl
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "trading card" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "trading card" }, // Suede
    { uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", keyword: "trading card" }, // Foil Worx
  ],
}

// Per-TYPE-card images (real fourprintshop product photos) for TYPE_RULES
// categories — without this every type card under one subcategory shares
// the SAME generic leaf.image, since classifyProduct() only sorts by text
// pattern, not by a distinct photo per type.
const TYPE_IMAGES: Record<string, Record<string, string>> = {
  // 2026-07-10: was missing entirely, same recurring symptom. "11x8-5" and
  // "hard-cover" and "self-cover" (catch-all) are confirmed genuine account
  // gaps (0 live matches -- no product anywhere in this account's 22
  // Calendars mentions "Hard Cover" or a landscape "11\" X 8.5\"" dimension)
  // so these 3 images are unused right now, downloaded anyway for when/if
  // the account gap is resolved.
  calendars: {
    "12x12-calendars": "/images/cat/calendars/12x12.jpg",
    "8-5x11-calendars": "/images/cat/calendars/8-5x11.jpg",
    "spiral-bind-calendars": "/images/cat/calendars/spiral-bind.jpg",
    "11x8-5-calendars": "/images/cat/calendars/11x8-5.jpg",
    "9x12-calendars": "/images/cat/calendars/9x12.jpg",
    "hard-cover-calendars": "/images/cat/calendars/hard-cover.jpg",
    "self-cover-calendars": "/images/cat/calendars/self-cover.jpg",
  },
  // 2026-07-10: was missing entirely -- same symptom as Trading Cards/
  // Postcards/Booklets below. Downloaded directly from 4over.com's own CDN
  // (all 10 types confirmed exact match against their live listing).
  "presentation-folders": {
    "silk-presentation-folder": "/images/cat/presentation-folders/silk.jpg",
    "suede-presentation-folder": "/images/cat/presentation-folders/suede.jpg",
    "akuafoil-presentation-folder": "/images/cat/presentation-folders/akuafoil.jpg",
    "natural-presentation-folder": "/images/cat/presentation-folders/natural.jpg",
    "pearl-presentation-folder": "/images/cat/presentation-folders/pearl.jpg",
    "glueless-presentation-folder": "/images/cat/presentation-folders/glueless.jpg",
    "9x12-presentation-folder": "/images/cat/presentation-folders/9x12.jpg",
    "9x14-presentation-folder": "/images/cat/presentation-folders/9x14.jpg",
    "5x10-presentation-folder": "/images/cat/presentation-folders/5x10.jpg",
    "6x9-presentation-folder": "/images/cat/presentation-folders/6x9.jpg",
  },
  // 2026-07-09: was missing entirely -- every Booklets type card fell back
  // to the generic parent image, same symptom class as Trading Cards/
  // Postcards below. Root cause here was different and took much longer to
  // find: booklets DOES have a TYPE_RULES entry (`booklets: [...]`, written
  // with a bare/unquoted key), so it takes the hasTypeRules branch and reads
  // from THIS map -- a `resolveProductImage()` per-product image mechanism
  // ALSO exists with a "booklets" entry in lib/print/product-images.ts, but
  // that mechanism is only reachable from the OTHER (sizeGrouped, no
  // TYPE_RULES) branch, so it was silently dead code for this category the
  // whole time. Don't confuse the two mechanisms for any category -- check
  // whether `TYPE_RULES[category]` has an entry (quoted OR bare key) FIRST
  // before assuming a category's images come from resolveProductImage().
  booklets: {
    "matte-book-uncoated-booklets": "/images/cat/booklets/matte-book-uncoated.png",
    "dull-book-satin-aq-booklets": "/images/cat/booklets/dull-book-satin-aq.jpg",
    "gloss-cover-aq-booklets": "/images/cat/booklets/gloss-cover-aq.jpg",
    "premium-opaque-uncoated-booklets": "/images/cat/booklets/premium-opaque-uncoated.jpg",
    "gloss-booklets": "/images/cat/booklets/gloss.jpg",
  },
  // 2026-07-10: replaced the 2026-07-09 stand-in (reused Business Cards/
  // Flyers & Brochures material photos) with 4over.com's own actual postcard
  // product images, downloaded from their CDN and hosted locally (same
  // no-hotlinking pattern as every other TYPE_IMAGES entry) after the user
  // asked to match the real site's pictures directly. "14pt"/"18pt" share
  // 4over's own "standard-postcards.jpg" (their site does too); Dual Raised/
  // Dual Raised RSVP use .png since that's the source format on 4over's CDN.
  "postcards": {
    "all-inclusive-postcards": "/images/cat/postcards/all-inclusive.jpg",
    "eddm-full-service-postcards": "/images/cat/postcards/eddm-full-service.jpg",
    "eddm-print-only-postcards": "/images/cat/postcards/eddm-print-only.jpg",
    "dual-raised-rsvp-postcards": "/images/cat/postcards/dual-raised-rsvp.png",
    "dual-raised-postcards": "/images/cat/postcards/dual-raised.png",
    "raised-foil-postcards": "/images/cat/postcards/raised-foil.jpg",
    "raised-spot-uv-postcards": "/images/cat/postcards/raised-spot-uv.jpg",
    "foil-worx-postcards": "/images/cat/postcards/foil-worx.jpg",
    "tearoff-postcards": "/images/cat/postcards/tearoff.jpg",
    "painted-edge-postcards": "/images/cat/postcards/painted-edge.jpg",
    "endurace-postcards": "/images/cat/postcards/endurace.jpg",
    "akuafoil-postcards": "/images/cat/postcards/akuafoil.jpg",
    "brown-kraft-postcards": "/images/cat/postcards/brown-kraft.jpg",
    "suede-postcards": "/images/cat/postcards/suede.jpg",
    "silk-postcards": "/images/cat/postcards/silk.jpg",
    "pearl-postcards": "/images/cat/postcards/pearl.jpg",
    "natural-postcards": "/images/cat/postcards/natural.jpg",
    "linen-uncoated-postcards": "/images/cat/postcards/linen-uncoated.jpg",
    "plastic-postcards": "/images/cat/postcards/plastic.jpg",
    "magnet-postcards": "/images/cat/postcards/magnet.jpg",
    "100lb-gloss-cover-postcards": "/images/cat/postcards/100lb-gloss-cover.jpg",
    "18pt-postcards": "/images/cat/postcards/standard.jpg",
    "16pt-postcards": "/images/cat/postcards/16pt.jpg",
    "14pt-postcards": "/images/cat/postcards/standard.jpg",
    "direct-mail-postcards": "/images/cat/postcards/direct-mail.jpg",
    "standard-postcards": "/images/cat/postcards/standard.jpg",
  },
  "social-cards": {
    "foil-worx-social-cards": "/images/cat/social-cards/foil-worx.jpg",
    "akuafoil-social-cards": "/images/cat/social-cards/akuafoil.jpg",
    "standard-social-cards": "/images/cat/social-cards/standard.jpg",
  },
  // 2026-07-10: was missing entirely -- both cards shared the generic
  // parent image.
  catalogs: {
    "saddle-stitch-catalogs": "/images/cat/catalogs/saddle-stitch.jpg",
    "perfect-bound-catalogs": "/images/cat/catalogs/perfect-bound.jpg",
  },
  // 2026-07-09: was missing entirely -- every Trading Cards type card fell
  // back to the parent subcategory's own generic image, so all 11 cards
  // showed the SAME picture despite distinct per-material photos already
  // existing on disk (public/images/cat/trading-cards/*.jpg).
  "trading-cards": {
    "akuafoil-trading-cards": "/images/cat/trading-cards/akuafoil.jpg",
    "brown-kraft-trading-cards": "/images/cat/trading-cards/brown-kraft.jpg",
    "foil-worx-trading-cards": "/images/cat/trading-cards/foil-worx.jpg",
    "natural-trading-cards": "/images/cat/trading-cards/natural.jpg",
    "pearl-trading-cards": "/images/cat/trading-cards/pearl.jpg",
    "silk-trading-cards": "/images/cat/trading-cards/silk.jpg",
    "suede-trading-cards": "/images/cat/trading-cards/suede.jpg",
    "100lb-cover-linen-trading-cards": "/images/cat/trading-cards/100lb-cover-linen.jpg",
    "18pt-trading-cards": "/images/cat/trading-cards/18pt.jpg",
    "16pt-trading-cards": "/images/cat/trading-cards/16pt.jpg",
    "14pt-trading-cards": "/images/cat/trading-cards/14pt.jpg",
  },
  "flyers-and-brochures": {
    "all-inclusive-flyers-brochures": "/images/cat/flyers-and-brochures/all-inclusive.jpg",
    "half-fold-brochures": "/images/cat/flyers-and-brochures/half-fold.jpg",
    "tearoff-flyers": "/images/cat/flyers-and-brochures/tearoff.jpg",
    "flat-flyers-brochures": "/images/cat/flyers-and-brochures/flat.jpg",
    "eddm-full-service-flyers": "/images/cat/flyers-and-brochures/eddm-full-service.jpg",
    "eddm-flyers-print-only": "/images/cat/flyers-and-brochures/eddm-print-only.jpg",
    "eddm-full-service-half-folds": "/images/cat/eddm/full-service-half-folds.jpg",
    "eddm-print-only-half-folds": "/images/cat/eddm/print-only-half-folds.jpg",
    "tri-fold-brochures": "/images/cat/flyers-and-brochures/tri-fold.jpg",
    "z-fold-brochures": "/images/cat/flyers-and-brochures/z-fold.jpg",
    "specialty-folds-brochures": "/images/cat/flyers-and-brochures/specialty-folds.jpg",
    "endurace-flyers-and-brochures": "/images/cat/flyers-and-brochures/endurace.jpg",
  },
  envelopes: {
    "remittance-envelopes": "/images/cat/envelopes/remittance.png", // 2026-07-10: was missing (unquoted TYPE_RULES key, same trap as Booklets -- see [[booklets-audit]])
    "blank-envelopes": "/images/cat/envelopes/blank.jpg",
    "digital-envelopes": "/images/cat/envelopes/digital.jpg",
    "variable-addressing-envelopes": "/images/cat/envelopes/variable-addressing.jpg",
    "linen-uncoated-envelopes": "/images/cat/envelopes/linen-uncoated.jpg",
    "natural-envelopes": "/images/cat/envelopes/natural.jpg",
    "offset-envelopes": "/images/cat/envelopes/offset.jpg",
  },
  "hang-tags": {
    // 2026-07-10: was missing entirely, same recurring symptom.
    "dual-raised-hang-tags": "/images/cat/hang-tags/dual-raised.png",
    "akuafoil-hang-tags": "/images/cat/hang-tags/akuafoil.jpg",
    "foil-worx-hang-tags": "/images/cat/hang-tags/foil-worx.jpg",
    "bottleneck-hang-tags": "/images/cat/hang-tags/bottleneck.jpg",
    "brown-kraft-hang-tags": "/images/cat/hang-tags/brown-kraft.jpg",
    "natural-hang-tags": "/images/cat/hang-tags/natural.jpg",
    "pearl-hang-tags": "/images/cat/hang-tags/pearl.jpg",
    "plastic-hang-tags": "/images/cat/hang-tags/plastic.jpg",
    "raised-spot-uv-hang-tags": "/images/cat/hang-tags/raised-spot-uv.jpg",
    "silk-hang-tags": "/images/cat/hang-tags/silk.jpg",
    "suede-hang-tags": "/images/cat/hang-tags/suede.jpg",
    "regular-hang-tags": "/images/cat/hang-tags/regular.jpg",
  },
  posters: {
    "backlit-posters": "/images/cat/posters/backlit.jpg",
    "blockout-posters": "/images/cat/posters/blockout.jpg",
    "photo-gloss-posters": "/images/cat/posters/photo-gloss.jpg",
    "matte-finish-posters": "/images/cat/posters/matte-finish.jpg",
    "gloss-cover-posters": "/images/cat/posters/gloss-cover.jpg",
    "gloss-book-posters": "/images/cat/posters/gloss-book.jpg",
  },
  // 2026-07-10: keys were stale ("3-5-x-8-5-standard-rack-cards"/"4-x-9-
  // standard-rack-cards" from before Standard was merged into one catch-all
  // card) so the real "standard-rack-cards" slug fell back to the generic
  // parent image. Also replaced both photos -- neither was actually from
  // 4over.com (100-150KB unrelated stock photos vs 4over's real ~13-15KB
  // CDN thumbnails, same bug class as [[posters-audit]]).
  "rack-cards": {
    "akuafoil-rack-cards": "/images/cat/rack-cards/akuafoil.jpg",
    "standard-rack-cards": "/images/cat/rack-cards/standard.jpg",
  },
  // 2026-07-10: was missing entirely, same recurring symptom -- all 12
  // cards shared one generic parent image. "Cards with Gift Card Holder"
  // has no entry -- confirmed genuine account gap (0 live matches).
  "greeting-cards": {
    "dual-raised-greeting-cards": "/images/cat/greeting-cards/dual-raised.png",
    "raised-foil-greeting-cards": "/images/cat/greeting-cards/raised-foil.jpg",
    "raised-spot-uv-greeting-cards": "/images/cat/greeting-cards/raised-spot-uv.jpg",
    "linen-greeting-cards": "/images/cat/greeting-cards/linen.jpg",
    "gloss-cover-greeting-cards": "/images/cat/greeting-cards/gloss-cover.jpg",
    "pearl-greeting-cards": "/images/cat/greeting-cards/pearl.jpg",
    "silk-greeting-cards": "/images/cat/greeting-cards/silk.jpg",
    "natural-greeting-cards": "/images/cat/greeting-cards/natural.jpg",
    "suede-greeting-cards": "/images/cat/greeting-cards/suede.jpg",
    "brown-kraft-greeting-cards": "/images/cat/greeting-cards/brown-kraft.jpg",
    "akuafoil-greeting-cards": "/images/cat/greeting-cards/akuafoil.jpg",
    "standard-greeting-cards": "/images/cat/greeting-cards/standard.jpg",
  },
  "sell-sheets": {
    "akuafoil-sell-sheets": "/images/cat/sell-sheets/akuafoil.jpg",
    "brown-kraft-sell-sheets": "/images/cat/sell-sheets/brown-kraft.jpg",
    "endurace-sell-sheets": "/images/cat/sell-sheets/endurace.jpg",
    "pearl-sell-sheets": "/images/cat/sell-sheets/pearl.jpg",
    "silk-sell-sheets": "/images/cat/sell-sheets/silk.jpg",
    "suede-sell-sheets": "/images/cat/sell-sheets/suede.jpg",
    // 2026-07-10: was pointing at the generic parent image -- no dedicated
    // photo existed for this catch-all card at all.
    "standard-sell-sheets": "/images/cat/sell-sheets/common.jpg",
    "eddm-full-service-sell-sheets": "/images/cat/sell-sheets/eddm-full-service.jpg",
    "eddm-print-only-sell-sheets": "/images/cat/sell-sheets/eddm-print-only.jpg",
  },
  "table-tent-cards": {
    "natural-table-tents": "/images/cat/table-tent-cards/natural.jpg",
    "pearl-table-tents": "/images/cat/table-tent-cards/pearl.jpg",
    "4x6-table-tent": "/images/cat/table-tent-cards/4x6.jpg",
    "5x5-5-table-tent": "/images/cat/table-tent-cards/5x5.5.jpg",
  },
  // 2026-07-10: was using generic parent-category fallback images for 2 of
  // 3 cards. 4over.com actually has dedicated "Tearoff Door Hangers"/
  // "Tearoff Postcards" product pages with their own real photos (Tearoff
  // Flyers' was already correctly downloaded) -- fetched the Door Hangers
  // one fresh from 4over's CDN, and reused Postcards' own tearoff.jpg
  // (already downloaded during the postcards image-fix round).
  "tear-off-cards": {
    "door-hangers-tear-off": "/images/cat/door-hangers/tearoff.jpg",
    "flyers-tear-off": "/images/cat/flyers-and-brochures/tearoff.jpg",
    "postcards-tear-off": "/images/cat/postcards/tearoff.jpg",
  },
  // 2026-07-10: was missing entirely -- all 3 cards shared the generic
  // parent image. "tearoff-door-hangers" reuses the same photo already
  // downloaded for tear-off-cards' own "door-hangers-tear-off" card (same
  // underlying product).
  "door-hangers": {
    "endurace-door-hangers": "/images/cat/door-hangers/endurace.jpg",
    "tearoff-door-hangers": "/images/cat/door-hangers/tearoff.jpg",
    "standard-door-hangers": "/images/cat/door-hangers/standard.jpg",
  },
  // 2026-07-10: rebuilt for the 6 new OPTION_PRESET_TYPES cards (was 3 old
  // "-base" slugs pointing at generic parent images, no longer rendered
  // directly). Postcards/Sell Sheets pairs reuse the exact same photos
  // already downloaded for postcards'/sell-sheets' own EDDM cards; Half
  // Folds pair downloaded fresh from 4over.com's own /direct-mail-services
  // CDN images.
  eddm: {
    "eddm-full-service-postcards": "/images/cat/postcards/eddm-full-service.jpg",
    "eddm-print-only-postcards": "/images/cat/postcards/eddm-print-only.jpg",
    "eddm-full-service-sell-sheets": "/images/cat/sell-sheets/eddm-full-service.jpg",
    "eddm-print-only-sell-sheets": "/images/cat/sell-sheets/eddm-print-only.jpg",
    "eddm-full-service-half-folds": "/images/cat/eddm/full-service-half-folds.jpg",
    "eddm-print-only-half-folds": "/images/cat/eddm/print-only-half-folds.jpg",
  },
  "table-covers": {
    "table-cloths": "/images/cat/table-covers/table-cloth.jpg",
    "table-runners": "/images/cat/table-covers/table-runners.jpg",
  },
  // 2026-07-10: was missing entirely -- all 3 cards shared the generic
  // parent image. Downloaded real photos from 4over.com's CDN.
  "wall-arts": {
    "clear-acrylic-signs": "/images/cat/wall-arts/clear-acrylic.jpg",
    "aluminum-dye-sub": "/images/cat/wall-arts/aluminum-dye-sub.jpg",
    "mounted-canvas": "/images/cat/wall-arts/mounted-canvas.jpg",
  },
  // 2026-07-10: all 9 photos replaced -- none were actually from 4over.com
  // (same non-4over-stock-photo bug class as posters/rack-cards/etc), and
  // Styrene/Gator Board were missing entirely (fell back to the generic
  // parent image). "Sidewalk Signs" and "Real Estate Post" (2 more of
  // 4over.com's own 13-item rigid-signs listing) confirmed genuine account
  // gaps via direct DB query -- 0 matches anywhere in the whole account.
  "rigid-signs": {
    "10mm-coroplast-signs": "/images/cat/rigid-signs/10mm-coroplast.jpg",
    "coroplast-rider-signs": "/images/cat/rigid-signs/coroplast-rider.png",
    "4mm-coroplast-signs": "/images/cat/rigid-signs/4mm-coroplast.jpg",
    "3mm-pvc-signs": "/images/cat/rigid-signs/3mm-pvc.jpg",
    "foam-core-signs": "/images/cat/rigid-signs/foam-core.jpg",
    "aluminum-heavy-duty": "/images/cat/rigid-signs/aluminum-heavy-duty.jpg",
    "aluminum-sandwich-board": "/images/cat/rigid-signs/aluminum-sandwich-board.jpg",
    "styrene-signs": "/images/cat/rigid-signs/styrene-signs.jpg",
    "gator-board-signs": "/images/cat/rigid-signs/gator-board-signs.jpg",
  },
  "outdoor-banners": {
    "mesh-banners": "/images/cat/outdoor-banners/mesh.jpg",
    "scrim-vinyl-banners": "/images/cat/outdoor-banners/scrim-vinyl.jpg",
    "18oz-blockout-banner": "/images/cat/indoor-banners/blockout.jpg",
    "banner-stand-kit": "/images/signs/banner-stands.jpg",
  },
  "indoor-banners": {
    "artist-canvas": "/images/cat/indoor-banners/artist-canvas.jpg",
    "premium-polyester-banners": "/images/cat/indoor-banners/premium-polyester.jpg",
    "premium-vinyl-banners": "/images/cat/indoor-banners/premium-vinyl.jpg",
    "15oz-blockout-indoor-vinyl-banner": "/images/cat/indoor-banners/blockout.jpg",
  },
  flags: {
    "feather-flags": "/images/cat/flags/feather.jpg",
    "pole-flags": "/images/cat/flags/pole.jpg",
    "teardrop-flags": "/images/cat/flags/teardrop.jpg",
  },
  // 2026-07-10: all 5 photos replaced -- none were actually from 4over.com
  // (same non-4over-stock-photo bug class as posters/rack-cards/etc). Also
  // fixed "digital-clear-window-clings" sharing "clear-window-clings"' own
  // image -- 4over.com shows these as 2 visually distinct products with 2
  // distinct photos, not a shared one.
  "window-graphics": {
    "digital-clear-window-clings": "/images/cat/window-graphics/digital-clear.jpg",
    "see-through-perforated-window-vinyl-graphic": "/images/cat/window-graphics/perforated.jpg",
    "opaque-window-graphics": "/images/cat/window-graphics/opaque.jpg",
    "clear-window-clings": "/images/cat/window-graphics/clear.jpg",
    "standard-white-window-clings": "/images/cat/window-graphics/white.jpg",
  },
  "wall-decals": {
    "high-tack-adhesive-vinyl": "/images/cat/wall-decals/high-tack.jpg",
    "low-tack-vinyl-wall-decals": "/images/cat/wall-decals/low-tack.jpg",
  },
  "banner-stands": {
    "deluxe-single-sided-retractable-banner-stands": "/images/cat/banner-stands/deluxe-single-sided.jpg",
    "x-style-collapsible-outdoor-banner-stands": "/images/cat/banner-stands/x-style-outdoor.jpg",
    "x-style-collapsible-banner-stands": "/images/cat/banner-stands/x-style-indoor.jpg",
    "standard-retractable-banner-stands": "/images/cat/banner-stands/standard-retractable.jpg",
    "telescopic-backdrop-banner-stands": "/images/cat/banner-stands/telescopic-backdrop.jpg",
  },
  displays: {
    "tabletop-displays": "/images/cat/displays/tabletop.jpg",
    "fabric-tube-displays": "/images/cat/displays/fabric-tube.jpg",
    // 2026-07-11: was falling back to the generic parent image -- "Silicon
    // Edge" has no direct product page on 4over.com's CURRENT site (it's
    // been rebranded there as "SEG Frame Displays"/"Silicone Edge
    // Graphics"), but that current listing's own real photo shows the
    // identical product (fabric graphic panel + frame), so reused it.
    "silicon-edge-graphic-display": "/images/cat/displays/silicon-edge.jpg",
    "event-tents": "/images/cat/displays/event-tents.jpg",
    "fan-cutout": "/images/cat/displays/fan-cutout.jpg",
    "foam-core-counter-cards": "/images/cat/displays/foam-core-counter.jpg",
    "white-pvc-counter-cards": "/images/cat/displays/white-pvc-counter.jpg",
  },
  // 2026-07-10: was missing entirely, same recurring symptom. "standard-
  // event-tickets" is a confirmed genuine account gap (all 35 products in
  // this account's category are "with Variable Numbering" -- no plain
  // Standard/non-numbered ticket line exists), so only 1 of 2 images is
  // used right now.
  "event-tickets": {
    "variable-numbering-event-tickets": "/images/cat/event-tickets/variable-numbering.jpg",
  },
  // 2026-07-10: was missing entirely, same recurring symptom. "Magnet
  // Postcards" and "Magnet Business Cards" (2 of 4over.com's 7 listed
  // types) are confirmed genuine account gaps -- 0 "magnet" text matches
  // anywhere in the postcards or business-cards category UUIDs -- so only
  // 4 images are used right now.
  magnets: {
    "car-door-magnets": "/images/cat/magnets/car-door.jpg",
    "oval-magnets": "/images/cat/magnets/oval.jpg",
    "magnet-announcement-cards": "/images/cat/magnets/announcement.jpg",
    "standard-magnets": "/images/cat/magnets/standard-uv.jpg",
  },
}

// Classify a product description into a type slug for a given category
function classifyProduct(description: string, categorySlug: string): TypeRule | null {
  const rules = TYPE_RULES[categorySlug]
  if (!rules) return null
  const lower = description.toLowerCase()
  // Try each rule in order (last rule with empty keywords is catch-all)
  for (const rule of rules) {
    if (rule.excludeSizePrefixes?.some((p) => description.startsWith(p))) continue
    if (rule.keywords.length === 0) return rule // catch-all
    if (rule.keywords.some(k => lower.includes(k))) return rule
  }
  return rules[rules.length - 1] // fallback to last (catch-all)
}

// Table Tent Cards' "(Flat Size: 4 X 16.25)" parenthetical states the
// unfolded/pre-fold dimension — redundant once the folded/usable SIZE_DIM is
// already shown right before it, and SIZE_DIM alone only eats the numbers
// inside, leaving a near-empty "(Flat Size: )" behind. Strip the whole thing
// first so there's nothing left for the later "drop empty parens" cleanup to
// even need to catch.
const FLAT_SIZE_PAREN = /\(\s*flat\s+size\s*:?[^)]*\)\s*/gi
// Variant dimensions removed to get the "stock/type" name used to group
// same-product-different-size variants. Covers NxN and NxNxN (boxes) sizes
// AND booklet/catalog page counts ("8 Page", "12 Pages").
const SIZE_DIM = /\d+(?:\.\d+)?\s*["”']?\s*[xX×]\s*\d+(?:\.\d+)?\s*["”']?(?:\s*[xX×]\s*\d+(?:\.\d+)?\s*["”']?)?/g
const PAGE_DIM = /\b\d+\s*(?:inside\s+)?pages?\b/gi
// Linear (single-axis) dimensions using ft/in units instead of a bare NxN
// pattern (e.g. signs/banners: "Feather Flag - 10ft -", "Pole Flag - 3ft x
// 2ft -", "Table Runner - 24\" Width") — SIZE_DIM only matches bare-number
// NxN, so these would otherwise stay baked into the title as distinct cards.
const LINEAR_DIM = /\d+(?:\.\d+)?\s*(?:ft|in|inch(?:es)?)\.?(?:\s*[xX×]\s*\d+(?:\.\d+)?\s*(?:ft|in|inch(?:es)?)\.?)?\b|\d+(?:\.\d+)?\s*["”']\s*(?:width|wide|height|tall)\b/gi
// "Booklet On"/"Brochure On" etc. is Print Method — already its own calculator
// dropdown (fourprintshop's product-type cards never show it in the title).
const PRINT_METHOD_PREFIX = /^[\s\-–—]*(Brochure|Booklet|Flyer|Postcard)s?\s+(On|on)\s+/
// Coating/Finishing phrase anchored on an explicit "with"/"w/" (Spot/Full
// connector words allowed in between) — already its own calculator dropdown.
// Anchoring on "with" (not matching mid-phrase) keeps unrelated "with ..."
// text intact, e.g. "Banner Stand With Hardware" or "Dual Raised ... with
// Raised Spot UV and Raised Foil on Front only" (a product-defining name,
// not a removable finish). Deliberately has NO "akuafoil" group: "Akuafoil"
// is product identity (distinguishes it from the plain, non-Akuafoil card),
// not a removable finish — an earlier version let this regex's own greedy
// match start AT "with Akuafoil" and swallow it together with whatever
// coating phrase followed, which inconsistently dropped "Akuafoil" from the
// merged title depending on the exact trailing wording (e.g. kept it for
// "...with Akuafoil With No UV" but ate it for "...with Akuafoil With UV
// Coating", since only the latter's "With" + trigger word happened to match
// starting from the EARLIER "with"). Without the group, this regex can only
// match starting at the LATER "with/w/ <coating-trigger>" that comes AFTER
// "Akuafoil", so "Akuafoil" is preserved every time.
const COATING_WITH = /[\s,]+(?:with|wih|w\/)\s*(no\s+)?(satin\s+)?(spot\s+|full\s+)?(\d+\s*mil\s+)?(gloss\s+|matte\s+)?(uncoated|coated\b|aq\b|coating|uv|lamination)\b.*$/i
// "Without Coating" (used by a handful of Akuafoil sizes instead of the more
// common "With No UV") — COATING_WITH can't catch this: "with" is glued to
// "out" as one word ("Without"), and "Coating" only follows after "out", not
// immediately after an optional-modifier sequence the way "With No UV" does.
const WITHOUT_COATING_SUFFIX = /\s+without\s+coating\s*$/i
// Boxes print "Uncoated"/"Coated" as a standalone trailing word with no
// "with" at all (e.g. "14PT Cube Box Uncoated") — safe to strip since it's
// always the literal last word.
const COATING_TRAILING = /[\s,]+(uncoated|coated)\s*$/i
// "Matte/Dull Finish" appears as a middle modifier with no "with" at all
// (e.g. "16PT Matte/Dull Finish Announcement Cards") — strip it in place
// rather than at an anchor, since the product name continues after it.
const MATTE_DULL_MIDDLE = /\s*matte\s*\/\s*dull\s+finish\s*/gi
// "with (Satin) AQ" also appears as a MIDDLE modifier before the product name
// continues (e.g. "14PT with AQ Fold Over Business Card Scoring Included") —
// must be stripped in place (not via COATING_WITH's trailing ".*$", which
// would eat the rest of the product name too). "wih" tolerates a 4over typo.
// Negative lookahead excludes "AQ on both/front/back ..." — that's the FULL
// trailing coating phrase (COATING_WITH already handles it via its greedy
// ".*$"); without this exclusion AQ_MIDDLE fires first and strips just
// "with AQ", leaving "on both sides" dangling with no "with" left for
// COATING_WITH to anchor on.
const AQ_MIDDLE = /\s*(?:with|wih)\s+(satin\s+)?aq(?!\s*on\s+(the\s+)?(both|front|back)\b)\s*/gi
// "UV on 4-color side(s)" / "UV on the front only" with no preceding "with"
// (COATING_WITH only fires when "with"/"w/" is present) — same Coating
// dropdown concept, just a different sentence pattern for this category.
// Negative lookbehind protects "Raised Spot UV" (a Majestic product-line name,
// e.g. "Dual Raised ... with Raised Spot UV and Raised Foil on Front only" or
// "Suede Business Cards with Raised Spot UV on Front only") from being
// mistaken for this removable-finish phrase — UV_SIDES_SUFFIX's anchor is
// plain whitespace (unlike COATING_WITH's mandatory "with"), so without the
// lookbehind it could start matching right after "Raised", skipping "with".
const UV_SIDES_SUFFIX = /[\s,]+(full\s+|spot\s+)?(?<!raised\s(?:spot\s)?)uv\s+on\s+(the\s+)?(front\s+only|\d*-?color\s+side\s*\(?s\)?)\b.*$/i
// The "front only" vs "both sides" placement suffix for Raised Foil/Raised
// Spot UV (the cases UV_SIDES_SUFFIX's lookbehind deliberately skips) — kept
// in sync with the same constant in [typeSlug]/page.tsx.
const RAISED_SIDE_SUFFIX = /\s+on\s+(both\s+sides|front\s+only|the\s+front|the\s+back)\s*$/i
// Binding/Finishing add-ons already exposed as calculator dropdowns/checkboxes
// elsewhere on the product (Scoring, Variable Numbering). The optional "Die
// Cut and " is Table Tent Cards-specific: AQ_MIDDLE (which runs earlier in
// the chain) already strips "with AQ" as a MIDDLE modifier before this suffix
// regex gets a chance to anchor from "with AQ" through end-of-string, so
// without consuming "Die Cut and" here too, it's left stranded once this
// regex removes just ", Scoring Included" — every Table Tent Cards entry is
// both die-cut AND scored, so the phrase carries no distinguishing info.
const SCORING_SUFFIX = /,?\s*(die\s+cut\s+and\s+)?(flat\s*-\s*no\s+scoring|scoring\s+included)\.?\s*$/i
const VARIABLE_SUFFIX = /\s+with\s+variable\s+numbering\s*$/i
// Envelope industry size codes ("#9", "#10", "#6 3/4", "A2", "A6", "A7", "A9")
// are a redundant synonym for the physical dimension already in the name —
// strip them like a size, leaving the process/stock name (Blank/Digital/...).
const ENVELOPE_CODE = /\(?#\d+(?:\s+\d+\/\d+)?\)?\s*|\bA\d{1,2}\b\s*/g
// Boxes & Packaging only (see isBoxesPackaging below): leading "14PT "/"18PT "
// thickness prefix, once the box-style name continues after it.
const BOX_THICKNESS_PREFIX = /^\d+\s*pt\s+/i
// Safety net: a dangling trailing "with" left over when a middle modifier
// (e.g. MATTE_DULL_MIDDLE on "... with Matte/Dull Finish") was removed but
// its preceding "with" wasn't. No legitimate product name ends in just "with".
const TRAILING_WITH = /[\s,]+with\s*$/i

// Strips an outer "(...)" that's left unbalanced after an inner code (e.g.
// the envelope size code above) was removed from inside it.
function balanceParens(s: string): string {
  let str = s
  const opens = (str.match(/\(/g) || []).length
  const closes = (str.match(/\)/g) || []).length
  if (closes > opens) {
    let diff = closes - opens
    while (diff > 0 && str.endsWith(")")) {
      str = str.slice(0, -1).trim()
      diff--
    }
  } else if (opens > closes) {
    let diff = opens - closes
    while (diff > 0 && str.startsWith("(")) {
      str = str.slice(1).trim()
      diff--
    }
  }
  return str
}

// A handful of SKUs have NO real product_description at all — 4over's own
// data falls back to literally the product_code (e.g. Posters'
// "100GLB-PSUC-11.5X17.5" instead of "11.5\" x 17.5\" Posters on 100LB Gloss
// Book With No AQ" — confirmed by its OWN sibling sizes "100GLB-PSUC-11X17"/
// "...-12X18" having normal wording). Reconstruct it from a sibling sharing
// the same code prefix (the part before the trailing "-NUMxNUM" size
// segment), splicing in this product's own size.
const CODE_LIKE_DESCRIPTION = /^([A-Z0-9.]+(?:-[A-Z0-9.]+)*)-([\d.]+)X([\d.]+)$/i
function reconstructCodeLikeDescriptions<T extends { product_description: string; product_code: string }>(
  products: T[],
): T[] {
  const templates = new Map<string, string>()
  for (const p of products) {
    if (CODE_LIKE_DESCRIPTION.test(p.product_description)) continue
    const m = p.product_code?.match(CODE_LIKE_DESCRIPTION)
    if (m && !templates.has(m[1])) templates.set(m[1], p.product_description)
  }
  return products.map((p) => {
    const m = p.product_description.match(CODE_LIKE_DESCRIPTION)
    if (!m) return p
    const template = templates.get(m[1])
    if (!template) return p
    const newSize = `${m[2]}" x ${m[3]}"`
    const templateSize = template.match(SIZE_DIM)
    const newDesc = templateSize ? template.replace(templateSize[0], newSize) : `${newSize} ${template}`
    return { ...p, product_description: newDesc }
  })
}

// Business Cards: Round Corner/Oval/Fold Over are Shape/Size variants of one
// product now (see the matching comment on the business-cards-standard
// TYPE_RULES entry below and ProductConfiguratorClient's shapeList) — strip
// them from the card title/groupKey so e.g. Silk's 4 cards collapse to 1,
// alongside the EXISTING per-product Shape dropdown that lets the user pick
// Round Corner there. Scoped to isBusinessCards (see displayList below) so
// other categories that also use this word ("Round Corner Hang Tags") are
// untouched — that's a separate, not-yet-reviewed structural question.
const SHAPE_WORDS = /\b(round\s*corners?|ovals?|fold\s*overs?)\b\s*/gi

function stripSize(desc: string, isBusinessCards = false): string {
  let s = (desc || "")
    .replace(FLAT_SIZE_PAREN, " ")
    .replace(MATTE_DULL_MIDDLE, " ")
    .replace(AQ_MIDDLE, " ")
    .replace(SIZE_DIM, " ")
    .replace(LINEAR_DIM, " ")
    .replace(ENVELOPE_CODE, " ")
    .replace(PAGE_DIM, " ")
    .replace(PRINT_METHOD_PREFIX, "")
    .replace(WITHOUT_COATING_SUFFIX, "")
    .replace(COATING_WITH, "")
    .replace(COATING_TRAILING, "")
    .replace(UV_SIDES_SUFFIX, "")
    .replace(RAISED_SIDE_SUFFIX, "")
    // Scoring/Variable-numbering must strip AFTER the coating phrases above —
    // "Scoring Included w/ Spot UV on both sides" only has "Scoring Included"
    // at the END (where this regex anchors) once COATING_WITH has already
    // removed the trailing "w/ Spot UV..." part.
    .replace(SCORING_SUFFIX, "")
    .replace(VARIABLE_SUFFIX, "")
    .replace(TRAILING_WITH, "")
    // 4over's data is occasionally inconsistent about pluralizing the
    // product-type noun (e.g. "16PT Round Corner Hang Tag with..." vs every
    // other sibling's "...Hang Tags", "14PT Table Tent..." vs "...Table
    // Tents", "Sell Sheet On 14PT..." vs "14PT ...Sell Sheets") — normalize
    // to plural so these don't show up as extra near-duplicate cards instead
    // of merging with their real siblings. groupKey() sorts tokens, so word
    // ORDER ("Sell Sheet On X" vs "X Sell Sheets") doesn't matter once the
    // word forms match.
    .replace(/\bTag\b/g, "Tags")
    .replace(/\bTent\b/g, "Tents")
    .replace(/\bSheet\b/g, "Sheets")
    // Reorder so the merged card's displayed title (picked by length, see
    // "prefer longer name" below) reads like its siblings' "X Sell Sheets"
    // instead of backwards as "Sell Sheets On X" — same idea as the Business
    // Cards lamination reorder below, just for a different category.
    .replace(/\bSell\s+Sheets\s+[Oo]n\s+(.+)$/, "$1 Sell Sheets")
  if (isBusinessCards) {
    s = s
      .replace(SHAPE_WORDS, " ")
      .replace(/\bBC\b/g, "Business Cards")
      .replace(/\bCard\b/g, "Cards")
      // "Oval Business Cards with silk lamination" word-orders the material
      // AFTER "Business Cards" (every other entry puts it before, e.g. "Silk
      // Laminated Business Cards") — reorder so the merged card's title
      // (picked by length, see "prefer longer name" below) doesn't read
      // backwards on the rare entry that happens to win.
      .replace(/\bbusiness\s+cards\s+with\s+(\w+)\s+lamination\b/gi, (_m, mat) => `${mat.charAt(0).toUpperCase()}${mat.slice(1)} Laminated Business Cards`)
      .replace(/\blamination\b/gi, "Laminated")
      // SHAPE_WORDS just removed "Round Corners"/"Oval"/"Fold Over" — if that
      // was the LAST thing in the string (e.g. "... Business cards with
      // Round Corners"), "with" is now dangling and TRAILING_WITH already ran.
      .replace(TRAILING_WITH, "")
  }
  s = s
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*-\s*-\s*/g, " - ")
    .replace(/^[\s\-–—]+/, "")
    .replace(/[\s\-–—]+$/, "")
    .trim()
  return balanceParens(s)
}

const CATEGORY_WORD_OVERRIDES: Record<string, [RegExp, string][]> = {
  // 2026-07-10: raw product text says "30mil Car Magnet" but 4over.com's own
  // marketing/nav name for this exact product is "Car Door Magnets".
  "vehicle-magnets": [[/30mil\s+Car\s+Magnet/i, "Car Door Magnets"]],
  // Tote Bags' 3 raw entries are 3 color stocks (6OZCTBL/6OZCTNU/6OZCTRD)
  // all at the SAME single size — confirmed live, fourprintshop's own
  // "Tote Bags" page is ONE card with Color as a Stock dropdown (Blue/
  // Natural/Red), not 3 separate cards. Since all 3 share one size,
  // bySize's dedup can't tell them apart on size alone — needs
  // useLiveCascadeAnchor (like T-Shirts' Color) so the Stock dropdown's
  // live cascade gets all 3 sibling uuids, not just the one clicked.
  "tote-bags": [
    [/\b(blue|natural|red)\b\s*(?=with)/gi, ""],
    [
      /\s*with\s*[\d.]+(?:\.\d+)?\s*["']?\s*[xX]\s*[\d.]+(?:\.\d+)?\s*["']?\s*Print Area\s*on\s*6OZ\s*Cotton\s*Canvas\s*$/i,
      "",
    ],
  ],
  // Mugs' 2 raw entries are 2 DIFFERENT stocks (CRM11WH/CRM15WH) at 2
  // different print-area sizes — confirmed live, fourprintshop's own
  // "Mugs" page is ONE card with both as plain Stock/Size cascade options
  // (no Shape-style ambiguity: each size maps to exactly one product), not
  // 2 separate cards split by oz capacity.
  mugs: [
    [/,\s*\d+oz\s*/gi, " "],
    [/\s*with\s*wraparound\s*image,?\s*/gi, " "],
    [/,?\s*[\d.]+(?:\.\d+)?\s*["']?\s*[xX]\s*[\d.]+(?:\.\d+)?\s*["']?\s*print\s*area\s*$/i, ""],
  ],
  // Buttons' 11 raw entries are ALL one stock ("BUTTON") differing only by
  // Size × Shape (Round/Diamond/Square/Rectangle) × Backing (Locking Safety
  // Pin/Magnet) — confirmed live, fourprintshop's own "Buttons" page is a
  // SINGLE card with separate Shape and Backing calculator dropdowns (both
  // currently showing just 1 default option each, but genuinely present as
  // their own <select> fields), not a card per shape/backing combo. The
  // leading-size strip handles BOTH "AxB" ("2\" x 2\" Diamond...") and bare
  // single-dimension ("1\" Round...") forms in one pattern.
  buttons: [
    [/^[\d.]+(?:\.\d+)?\s*["']?\s*(?:[xX]\s*[\d.]+(?:\.\d+)?\s*["']?)?\s*/, ""],
    [/\b(round|diamond shaped|square|rectangle)\b\s*/gi, ""],
    [/\s*with\s*(locking safety pin|magnet backing)\s*$/i, ""],
  ],
  // T-Shirts' 15 raw entries are 6 garment types × 2-5 colors each (Black/
  // Blue/Gray/Red/White) — confirmed live, fourprintshop's own "Apparel"
  // page shows ONE card per garment type with Color as a picker, not a
  // separate card per color. Stripping the color word here (only directly
  // before "with"/"w/", so it can't eat a color word that's genuinely part
  // of a garment name) plus the trailing "with/w/ <size> Print Area" phrase
  // (which otherwise left a stray "w/" vs "with" wording difference behind
  // after SIZE_DIM strips just the dimension) collapses each garment type
  // to one groupKey. Color itself becomes a calculator option via
  // extractShape()'s color recognition (component-side).
  "t-shirts": [
    [/\b(black|blue|gray|grey|red|white)\b\s*(?=w\/|with)/gi, ""],
    [/\s*(?:with|w\/)\s*[\d.]+(?:\.\d+)?\s*["']?\s*[xX]\s*[\d.]+(?:\.\d+)?\s*["']?\s*Print Area\s*$/i, ""],
  ],
  // fourprintshop's "Stickers By Shape" cards are title-cased (Round
  // Corner/Round/Leaf Stickers); 4over's own raw text for these specific
  // shapes is ALL-CAPS ("ROUND CORNER Stickers"...), while a few sibling
  // entries already use proper case ("Oval Stickers") — normalizing here
  // so both forms merge into one card per shape instead of splitting by
  // casing. "Round" must run after "Round Corner" (negative lookahead
  // guards it too) so "ROUND CORNER" doesn't partially become "Round
  // CORNER". The last rule renames the shape-less default entries
  // ("Stickers with UV"/"with NO UV", no shape word at all) to "Rectangle
  // Stickers" to match fourprintshop's own naming for that card.
  stickers: [
    [/\bOVAL\b/g, "Oval"],
    [/\bROUND CORNER\b/g, "Round Corner"],
    [/\bROUND\b(?!\s+CORNER)/g, "Round"],
    [/\bLEAF\b/g, "Leaf"],
    [
      /^([\d.]+(?:\.\d+)?\s*["']?\s*[xX]\s*[\d.]+(?:\.\d+)?\s*["']?)\s*Stickers\s+with\s+(NO\s+)?UV\s*$/i,
      "$1 Rectangle Stickers with $2UV",
    ],
  ],
  // All 792 raw entries are pure product_code ("18PTC1S-CPBXNC-10X10") —
  // see this category's comment in lib/print/categories.ts. No clean
  // sibling exists anywhere to reconstruct from (the generic
  // reconstructCodeLikeDescriptions helper needs one), so this rebuilds
  // the description directly from the 3 known coating-suffix codes;
  // stripSize/groupKey's existing COATING_WITH stripping then merges all
  // 3 into one card. NO "18PT C1S" prefix in the rebuilt text on purpose —
  // fourprintshop's own card is titled bare "Print & Trim Boxes" with no
  // stock qualifier (only one Stock value exists anyway), and Boxes &
  // Packaging's BOX_THICKNESS_PREFIX stripping below only eats a leading
  // "{digit}PT " — it doesn't know about a trailing "C1S", so including it
  // here left a stray "C1S Print and Trim Boxes" card title. The 3rd
  // pattern matches "CPBXUV" not "CPBXUVFR" — confirmed live, this
  // category's own product_description field drops the trailing "FR" that
  // product_code still has for that one variant (a 4over data
  // inconsistency between the two fields, not a typo on this end).
  // Renamed from "Print and Trim Boxes" (2026-07-08) — see this category's
  // GROUPS comment in lib/print/categories.ts for why: 4over's own official
  // category name is "Custom Boxes", a different product.
  "custom-boxes": [
    [/^18PTC1S-CPBXNC-([\d.]+)X([\d.]+)$/i, '$1" X $2" Custom Boxes with No Coating'],
    [/^18PTC1S-CPBXSPUVFR-([\d.]+)X([\d.]+)$/i, '$1" X $2" Custom Boxes with Spot UV on the front only, No UV Coating on the back'],
    [/^18PTC1S-CPBXUV-([\d.]+)X([\d.]+)$/i, '$1" X $2" Custom Boxes with Full UV on the front only, No UV Coating on the back'],
  ],
  // "Packaging" (Standard Boxes). Renames confirmed against 4over's own
  // internal "Product Category" field per product (via productsfeed,
  // 2026-07-08) — the raw product_description uses shorter/singular
  // wording than what 4over.com's retail site (and their own API category
  // field) actually calls each product.
  //   Business Card Boxes: 250BC/500BC x 14/16/18PT are 6 distinct
  //   product_uuids at genuinely different physical box dimensions (not a
  //   coating variant) — 4over's own Product Category field returns
  //   "Business Card Boxes" for ALL of them. Stripped here so they collapse
  //   to ONE groupKey/card; extractShape() in product-configurator-client
  //   reads the ORIGINAL raw description (not this rewritten title) to
  //   expose the 250-vs-500 + thickness choice as a selector, matching
  //   4over.com's own "Business Card Box Size" dropdown.
  //   Wine Boxes: "with Handle" is a genuinely separate product_uuid at the
  //   SAME size/stock (confirmed live: 4over.com's own "Handle Options"
  //   dropdown, "No Handle (Tuck Top)" / "With Handle") — stripped here so
  //   both merge into one card; extractShape() again reads the raw
  //   description to expose Handle as a selector.
  //   Akuafoil ("...with Akuafoil uncoated" etc., 2026-07-08): user decided
  //   to merge these into the SAME card as the plain box (not a separate
  //   "Majestic Boxes" subcategory) — differs from plain by Stock (e.g.
  //   "18PT C1S" vs "14PT Uncoated") AND Colorspec ("5/0 (4/0 with Foil on
  //   Front)" vs "4/0") at the SAME Size, so the normal generic Stock/
  //   Colorspec cascade dropdowns handle it natively once both uuids share
  //   this card's groupKey — no shapeList/extractShape needed. Stripped
  //   FIRST so later box-type renames below match cleanly regardless of
  //   whether "with Akuafoil" was present.
  packaging: [
    [/\s+with\s+Akuafoil\b/gi, " "],
    [/\b\d+BC\s+Box\b/gi, "Business Card Boxes"],
    [/\s+with\s+Handle,?\s*/gi, " "],
    [/\bWine\s+Box\b/gi, "Wine Boxes"],
    [/\bTuck\s+Box\b/gi, "Roll End Tuck Top Boxes"],
    [/\bSales\s+Box\b/gi, "Sales Presentation Boxes"],
    [/\bCube\s+Box\b/gi, "Cube Boxes"],
    [/\bGolf\s+Ball\s+Box\b/gi, "Golf Ball Boxes"],
    // 2026-07-11: raw text says "Print and Trim Flat Sheets" but 4over.com's
    // own H1 for this exact product is "Print & Trim Boxes" (confirmed live
    // at https://4over.com/print-and-trim-boxes) -- same bug class as
    // vehicle-magnets/announcement-cards' raw-SKU-vs-public-name mismatches.
    [/Print\s+and\s+Trim\s+Flat\s+Sheets/gi, "Print & Trim Boxes"],
  ],
  // 21 raw entries, all just 14PT — 3 coating variants ("with Full UV",
  // "Matte/Dull Finish", "Uncoated") merge into one "14PT Header Cards"
  // card with Coating as the calculator option, same pattern as every
  // other "Uncoated"/"Matte/Dull Finish" middle-modifier strip this
  // session (Trading/Announcement/Greeting Cards).
  "header-cards": [
    [/\buncoated\s+(?=header\s+cards)/gi, ""],
    [/\bmatte\s*\/\s*dull\s+finish\s+(?=header\s+cards)/gi, ""],
  ],
  // fourprintshop's own "Vinyl Floor Graphics" page confirms a real "Shape"
  // calculator dropdown (currently just showing "Rectangle" at its default
  // size, but the field genuinely exists) — "4mil Flexible Vinyl Floor
  // Graphics - Circle" is the SAME stock, just the Circle shape variant.
  // Stripped so groupKey merges it with the plain entry; extractShape() in
  // product-configurator-client.tsx now recognizes "circle" too, so the
  // merged card's live cascade exposes Rectangle/Circle as a Shape picker
  // the same way Hang Tags/Announcement Cards already do.
  "floor-graphics": [[/\s*-\s*Circle\b/gi, ""]],
  // One "5.5\" x 8.5\" - 3mm White PVC Signs" entry is mislabeled — every
  // other 3mm White PVC size/coating combo says "Counter Cards with Easel
  // Backs" — a 4over typo, not a genuinely different product.
  "counter-cards": [[/\bsigns\b/gi, "Counter Cards with Easel Backs"]],
  // "(20 Inside pages 4:4 plus 4 page cover 4:4)" entries are missing the
  // stock name entirely — confirmed via product_code: every one of these
  // shares the SAME "100GLB-..." prefix as its normally-worded "Saddle
  // Stitch Calendar On 100LB GLOSS BOOK" siblings, just with a different
  // coating. The page-count info is redundant (already in the leading
  // "N Page" PAGE_DIM token), so replace the whole parenthetical with the
  // missing stock name instead of just stripping it.
  "calendars": [[/\(\s*\d+\s*inside\s+pages?\s+\d+:\d+\s+plus\s+\d+\s+page\s+cover\s+\d+:\d+\s*\)/gi, "On 100LB GLOSS BOOK"]],
  // fourprintshop's literal "Foil Worx Trading Cards" page (confirmed live)
  // has ONE Stock dropdown covering BOTH "14PT Uncoated" and "16PT C2S" —
  // unlike plain (non-material) Trading Cards, where 14pt/16pt/18pt ARE
  // separate top-level cards because the bare card thickness IS the product
  // line. For the Foiled material specifically, strip the stock-name prefix
  // before "Foiled Trading Cards" so all stocks merge into one card, then
  // rename "Foiled" to match fourprintshop's "Foil Worx" naming.
  "trading-cards": [
    [/\b\d+pt\s+(?:uncoated\s+|silk\s+laminated\s+)?(?=foiled\s+trading\s+cards)/gi, ""],
    [/\bfoiled\s+trading\s+cards\b/gi, "Foil Worx Trading Cards"],
    // "Uncoated" sits as a MIDDLE modifier here ("14PT Uncoated Trading
    // Cards"), not the trailing position the existing coating regexes
    // anchor on — without stripping it, this is the only "14PT" stock
    // variant that fails to merge with its "No Coating"/AQ/UV siblings.
    // Also strips it from "Natural Uncoated Trading Cards" etc., which is
    // safe: "Natural" alone already identifies that card, "Uncoated" there
    // adds no distinguishing information (it's just Natural stock's
    // inherent finish, the same way 14PT plain trading cards' is).
    [/\buncoated\s+(?=trading\s+cards)/gi, ""],
  ],
  // Same middle-modifier issue as Trading Cards' "Uncoated", here on
  // "14PT Uncoated Announcement Cards" specifically (its 16PT siblings have
  // no such word, since they're already coated by their UV/AQ/Matte option).
  // The lookahead allows an optional Shape word in between ("...Uncoated
  // Round Corner Announcement Cards") since this runs BEFORE stripSize's own
  // SHAPE_WORDS removal for the extra-sourced materials — without it, only
  // the non-Round-Corner half of e.g. Natural's products gets the word
  // stripped, leaving 2 near-duplicate "Natural Announcement Cards" cards.
  "announcement-cards": [
    [/\buncoated\s+(?=(?:round\s*corners?|ovals?|fold\s*overs?)?\s*announcement\s+cards)/gi, ""],
    // 2026-07-11: raw product text says "Indoor Announcement Magnet" but
    // 4over.com's own marketing/nav name for this exact product is "Magnet
    // Announcement Cards" (confirmed live at
    // https://4over.com/magnet-announcement-cards) -- same bug class as
    // vehicle-magnets above.
    [/Indoor\s+Announcement\s+Magnet/i, "Magnet Announcement Cards"],
  ],
  // Same Foil Worx naming pattern as Trading Cards: Foil Worx UUID has
  // "14PT Uncoated Foiled Postcards" etc. — strip the stock prefix so all
  // foiled stocks merge into one card, then rename to match 4over's label.
  "postcards": [
    [/\b\d+pt\s+(?:uncoated\s+|silk\s+laminated\s+)?(?=foiled\s+postcards?)/gi, ""],
    [/\bfoiled\s+postcards?\b/gi, "Foil Worx Postcards"],
  ],
  // fourprintshop's literal page (confirmed live) merges paper WEIGHT into a
  // Stock dropdown for Gloss Book/Gloss Cover/Matte Book specifically —
  // "Gloss Booklets" page's own Stock dropdown lists BOTH "80LB Gloss Book"
  // and "100LB Gloss Book". Dull Book and Premium Opaque/Uncoated Text are
  // NOT merged this way (confirmed: their own pages show only ONE weight
  // each) — the lookahead only matches the 3 stock names that actually do.
  "booklets": [[/\b(?:60lb|70lb|80lb|100lb)\s+(?=(?:gloss\s*book|gloss\s*cover|matte\s*book)\b)/gi, ""]],
  // Same middle-modifier issue as Trading Cards/Announcement Cards'
  // "Uncoated" — "14PT Uncoated Greeting Cards" has no coating phrase to
  // strip via the trailing-anchored regexes, so it never merged with its
  // "14PT Greeting Cards with AQ/UV/Matte/No Coating" siblings.
  "greeting-cards": [
    [/\buncoated\s+(?=greeting\s+cards)/gi, ""],
    // One "Greeting Cards on 16PT with Satin AQ..." entry word-orders the
    // stock AFTER "Greeting Cards" (every other 16PT sibling puts it
    // before: "16PT Greeting Cards with...") — reorder so the merged card's
    // displayed title (picked by length) doesn't read backwards just
    // because the "on" wording happens to be longer. Scoped to PT stock
    // names specifically so "Greeting Cards on 100LB Gloss Cover" (already
    // consistent across all its siblings) is untouched.
    [/\bGreeting\s+Cards\s+[Oo]n\s+(\d+\s*pt)\b/gi, "$1 Greeting Cards"],
    // 14PT/16PT/18PT C1S are all plain (non-Linen, non-Gloss-Cover) card
    // stock — merge into ONE card, Stock chosen in the calculator, instead
    // of one card per thickness. Linen/Gloss Cover stay separate (different
    // stock FAMILY, not just a thickness number). Renamed to "Standard"
    // below (after stripSize removes the leading size, since this set of
    // overrides runs on the raw, still-sized description) to match the
    // same catch-all naming used for Announcement Cards/Door Hangers/
    // Presentation Folders/Postcards elsewhere in this catalog. The
    // lookahead tolerates an optional "Matte/Dull Finish" in between (e.g.
    // "14PT Matte/Dull Finish Greeting Cards") — without it, that one
    // coating variant's PT prefix survives unstripped and it's left behind
    // as its own near-duplicate card once stripSize removes "Matte/Dull
    // Finish" from everything else.
    [/\b\d+\s*pt\s*(?:c1s)?\s+(?=(?:matte\s*\/\s*dull\s+finish\s+)?greeting\s+cards)/gi, ""],
  ],
  // Display-only renames to match fourprintshop's naming — confirmed live,
  // fourprintshop's own "Blank Letterheads" page's Stock dropdown actually
  // covers all 3 of these stocks together (and "Linen"/"Premium Opaque" are
  // each ALSO their own separate, overlapping card there) — per explicit
  // instruction, we keep the current clean 3-cards-by-stock split instead of
  // replicating that overlap, just renamed to read the same way.
  letterheads: [
    [/\bLETTERHEAD\s+on\s+60LB\s+Opaque\s+Text\b/gi, "Blank Letterheads"],
    [/\bLETTERHEAD\s+on\s+70lb\s+LINEN\b/gi, "Linen Uncoated Letterheads"],
    [/\bLETTERHEAD\s+on\s+70lb\s+Premium\s+Uncoated\s+Text\b/gi, "Premium Opaque Letterheads"],
  ],
  // Display-only renames to match fourprintshop's naming — confirmed live,
  // same 4-card structure (2-part/3-part x plain/Wraparound-Cover), just
  // worded differently. The Wraparound-specific patterns must run BEFORE
  // the bare "N Part NCR Forms" ones below, or those would match the
  // Wraparound entries' own "2 Part NCR Forms" prefix first and leave a
  // mangled partial rename.
  "ncr-forms": [
    [/\b2\s*Part\s+NCR\s+Forms\s+with\s+Wraparound\s+Cover\s*-?\s*Qty\s*50\s*per\s*book\b/gi, "2-part NCR Form Pads w Wraparound Cover"],
    [/\b3\s*Part\s+NCR\s+Forms\s+with\s+Wraparound\s+Cover\s*-?\s*Qty\s*35\s*per\s*book\b/gi, "3-part NCR Form Pads w Wraparound Cover"],
    [/\b2\s*Part\s+NCR\s+Forms\b/gi, "2-part NCR Forms w Variable Numbering"],
    [/\b3\s*Part\s+NCR\s+Forms\b/gi, "3-part NCR Forms w Variable Numbering"],
  ],
  // fourprintshop's literal page (confirmed live) merges Sheet Count (25/50)
  // AND, for Premium Opaque specifically, BOTH weights (60LB Opaque + 70LB
  // Premium Uncoated) into ONE card each — "Premium Opaque Notepads"' own
  // Stock dropdown lists "60LB Premium Opaque"+"70LB Premium Opaque"
  // together, and its "Sheets Per Pad" dropdown covers 25+50. Linen stays
  // its own single-stock card. Sheet Count itself isn't a Stock/Coating
  // cascade dimension — it resolves to 2 distinct product_uuids at the
  // SAME Size+Stock+Coating, so it's exposed via the same shapeList
  // mechanism as Round Corner/Oval/Fold Over (see extractShape()).
  notepads: [
    // Stripped FIRST: the full-phrase renames below anchor on "Notepad"
    // immediately preceding "on ...", and stripping "25 Sheet "/"50 Sheet "
    // after the rename would no longer find "Sheet" directly before
    // "Notepad" (the rename has already moved "Notepads" to the end).
    [/\b\d+\s*Sheet\s+(?=Notepad)/gi, ""],
    [/\bNotepad\s+on\s+60LB\s+Opaque\s+Text\s+with\s+Chipboard\s+Backer\b/gi, "Premium Opaque Notepads"],
    [/\bNotepad\s+on\s+70LB\s+Premium\s+Uncoated\s+Text\s+with\s+Chipboard\s+Backer\b/gi, "Premium Opaque Notepads"],
    [/\bNotepad\s+on\s+70LB\s+LINEN\s+Uncoated\s+Text\s+with\s+Chipboard\s+Backer\b/gi, "Linen Notepads"],
  ],
}
const CATEGORY_ENSURE_SUFFIX: Record<string, { test: RegExp; suffix: string }> = {}

// Filler words ignored when grouping so word-order/punctuation variants of the
// same product merge (e.g. "Matte/Dull Finish Cards" == "Cards with MATTE/DULL
// FINISH"). Meaningful words (front/back/both/uv/aq/14pt/...) are kept.
// "calendar"/"saddle"/"stitch" are here because 4over's own Calendars data is
// inconsistent about including them (e.g. one stock's entries are "Saddle
// Stitch Calendar On 100LB GLOSS BOOK", but the same stock at one size is
// missing "Saddle Stitch", and a "(4:4 plus cover 4:4)" stock is missing
// "Calendar" on some sizes) — without ignoring them, those typo'd entries
// show up as extra near-duplicate cards instead of merging with their real
// siblings. Confirmed safe elsewhere: Catalogs also has "Saddle Stitch" but
// always alongside a genuinely different binding ("Perfect Bound") that's
// distinguished by ITS OWN tokens, not by saddle/stitch's presence.
// "eddm" is here for the same reason: one EDDM Postcards size/coating combo
// is missing the "EDDM" word entirely (4over typo), which without ignoring
// it would show up as an extra "16PT Postcards" card alongside the correctly
// worded "16PT EDDM Postcards" siblings — safe to ignore everywhere since
// the STOCK weight/finish words (100LB/70LB/Matte/...) are what actually
// distinguish different EDDM products, not the literal word "EDDM".
const FILLER_WORDS = new Set(["with", "on", "the", "a", "an", "and", "for", "of", "to", "&", "in", "w", "calendar", "saddle", "stitch", "eddm"])
// Business Cards only: "Soft Velvet Lamination"/"Silk Lamination" wording is
// sometimes dropped entirely on a handful of sizes (the same kind of 4over
// data inconsistency as Calendars' "Saddle Stitch") — ignoring these tokens
// when isBusinessCards lets that stock's other (fully-worded) siblings absorb
// it instead of leaving it as an extra near-duplicate card.
// "scoring"/"included": Fold Over is inherently scored, so "Scoring Included"
// carries no distinguishing information once Round Corner/Oval/Fold Over are
// all one product — without ignoring it, Fold Over's stripDimsOnly-based
// sibling key (which deliberately doesn't strip Coating/Scoring suffixes —
// see that function's comment) gets 2 extra tokens that the Rectangle/Round
// Corner/Oval siblings don't have, so it fails to match them.
const FILLER_WORDS_BC = new Set([...FILLER_WORDS, "lamination", "laminated", "velvet", "soft", "scoring", "included"])

// Normalized grouping key: drop size, lowercase, strip punctuation, remove
// filler words, sort the remaining tokens.
function groupKey(desc: string, isBusinessCards = false): string {
  const fillers = isBusinessCards ? FILLER_WORDS_BC : FILLER_WORDS
  return stripSize(desc, isBusinessCards)
    .toLowerCase()
    .replace(/[.,/()]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !fillers.has(w))
    .sort()
    .join(" ")
}

export default async function PrintCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  // ============ GROUP PAGE (e.g. /print/marketing-materials) ============
  // Pure static cards — no Supabase needed, so this renders even if the DB
  // env vars aren't configured.
  const group = GROUPS[category]
  if (group) {
    // 2026-07-11: Boss Dwayne explicit feedback — 4over.com's own
    // /boxes-packaging page shows all 19 individual PRODUCTS directly in one
    // flat grid (confirmed live), not 3 subcategory tiles requiring an extra
    // click. Scoped to boxes-packaging only (the other 5 parent pages also
    // do this on 4over.com, but weren't part of this specific request — see
    // [[boxes-packaging-flat-listing]] memory for the full investigation).
    // Each entry links to its own REAL existing page (Packaging/Hang Tags/
    // Header Cards leaves already have correct data+images+pricing,
    // verified in prior audits) — this is purely a landing-page shortcut,
    // no new product data. Hang Tags' Plastic material is excluded: 4over's
    // own flat listing doesn't include it either (matches their page
    // exactly, not our full 12-type /print/hang-tags list).
    const boxesPackagingFlatItems =
      category === "boxes-packaging"
        ? [
            { name: "Business Card Boxes", href: "/print/packaging/business-card-boxes", image: "/images/cat/packaging/business-card-boxes.jpg" },
            { name: "Roll End Tuck Top Boxes", href: "/print/packaging/roll-end-tuck-top-boxes", image: "/images/cat/packaging/tuck-top-boxes.jpg" },
            { name: "Sales Presentation Boxes", href: "/print/packaging/sales-presentation-boxes", image: "/images/cat/packaging/sales-presentation-boxes.jpg" },
            { name: "Golf Ball Boxes", href: "/print/packaging/golf-ball-boxes", image: "/images/cat/packaging/golf-ball-boxes.jpg" },
            { name: "Wine Boxes", href: "/print/packaging/wine-boxes", image: "/images/cat/packaging/wine-boxes.jpg" },
            { name: "Cube Boxes", href: "/print/packaging/cube-boxes", image: "/images/cat/packaging/cube-boxes.jpg" },
            { name: "Print & Trim Boxes", href: "/print/packaging/print-trim-boxes", image: "/images/cat/packaging/print-trim-boxes.jpg" },
            { name: "Dual Raised Hang Tags", href: "/print/hang-tags/dual-raised-hang-tags", image: "/images/cat/hang-tags/dual-raised.png" },
            { name: "Pearl Hang Tags", href: "/print/hang-tags/pearl-hang-tags", image: "/images/cat/hang-tags/pearl.jpg" },
            { name: "Silk Hang Tags", href: "/print/hang-tags/silk-hang-tags", image: "/images/cat/hang-tags/silk.jpg" },
            { name: "Brown Kraft Hang Tags", href: "/print/hang-tags/brown-kraft-hang-tags", image: "/images/cat/hang-tags/brown-kraft.jpg" },
            { name: "Bottleneck Hang Tags", href: "/print/hang-tags/bottleneck-hang-tags", image: "/images/cat/hang-tags/bottleneck.jpg" },
            { name: "Suede Hang Tags", href: "/print/hang-tags/suede-hang-tags", image: "/images/cat/hang-tags/suede.jpg" },
            { name: "Foil Worx Hang Tags", href: "/print/hang-tags/foil-worx-hang-tags", image: "/images/cat/hang-tags/foil-worx.jpg" },
            { name: "Natural Hang Tags", href: "/print/hang-tags/natural-hang-tags", image: "/images/cat/hang-tags/natural.jpg" },
            { name: "Regular Hang Tags", href: "/print/hang-tags/regular-hang-tags", image: "/images/cat/hang-tags/regular.jpg" },
            { name: "Akuafoil Hang Tags", href: "/print/hang-tags/akuafoil-hang-tags", image: "/images/cat/hang-tags/akuafoil.jpg" },
            { name: "Raised Spot UV Hang Tags", href: "/print/hang-tags/raised-spot-uv-hang-tags", image: "/images/cat/hang-tags/raised-spot-uv.jpg" },
            { name: "Header Cards", href: "/print/header-cards", image: "/images/cat/header-cards.jpg" },
          ]
        : null

    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-slate-200 py-2 px-4">
          <div className="container mx-auto">
            <p className="text-sm text-slate-500">
              <Link href="/" className="hover:text-[#e42a27]">Home</Link>
              <span className="mx-2">&gt;</span>
              <span className="text-[#e07b39]">{group.label}</span>
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{group.label}</h1>
          <hr className="border-slate-200 mb-8" />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {boxesPackagingFlatItems
              ? boxesPackagingFlatItems.map((item) => (
                  <div key={item.href} className="group text-center">
                    <Link href={item.href}>
                      <div className="aspect-square bg-slate-100 mb-3 overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    </Link>
                    <h2 className="text-sm font-semibold text-slate-900 mb-3">{item.name}</h2>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 bg-[#e07b39] hover:bg-[#c9692a] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
                    >
                      View details <span className="text-base leading-none">&rsaquo;</span>
                    </Link>
                  </div>
                ))
              : group.subcategories.map((sub) => (
                  <div key={sub.slug} className="group text-center">
                    <Link href={`/print/${sub.slug}`}>
                      <div className="aspect-square bg-slate-100 mb-3 overflow-hidden">
                        <img src={sub.image} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    </Link>
                    <h2 className="text-sm font-semibold text-slate-900 mb-3">{sub.name}</h2>
                    <Link
                      href={`/print/${sub.slug}`}
                      className="inline-flex items-center gap-1 bg-[#e07b39] hover:bg-[#c9692a] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
                    >
                      View details <span className="text-base leading-none">&rsaquo;</span>
                    </Link>
                  </div>
                ))}
          </div>
        </div>
      </div>
    )
  }

  // ============ LEAF SUBCATEGORY PAGE (e.g. /print/flyers-and-brochures) ============
  const leaf = SLUG_TO_CATEGORY[category]
  if (!leaf) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Link href="/print" className="text-[#e42a27] hover:underline">Back to Print Products</Link>
        </div>
      </div>
    )
  }

  // Fetch ALL products in a category by UUID — DB cache first, live 4over API
  // (+ cache write-through) if nothing's cached yet.
  const supabase = await createClient()
  async function fetchCategoryProducts(categoryUuid: string, label: string) {
    // Paginate by ACTUAL rows returned per page, not by PAGE_SIZE: Supabase's
    // SSR PostgREST may cap responses well below PAGE_SIZE even when more rows
    // exist. Stepping by PAGE_SIZE skips the gap, losing products (e.g.
    // outdoor-banners: 522 total, 200 cap → gap rows 200-521 all dropped).
    // Break only on an empty page — a partial page may be a server cap, not end.
    let rows: { product_uuid: string; product_description: string; product_code: string }[] = []
    const PAGE_SIZE = 1000
    let from = 0
    while (true) {
      const { data: page } = await supabase
        .from("fourover_products")
        .select("product_uuid, product_description, product_code")
        .eq("category_uuid", categoryUuid)
        .range(from, from + PAGE_SIZE - 1)
      if (!page || page.length === 0) break
      rows = rows.concat(page)
      from += page.length
    }

    if (!rows || rows.length === 0) {
      console.log("[v0] No products in DB for", label, "- fetching from 4over API...")
      const apiResult = await getAllProductsForCategory(categoryUuid)
      if (apiResult.success && apiResult.data?.entities?.length > 0) {
        const apiProducts = apiResult.data.entities
        console.log("[v0] Got", apiProducts.length, "products from 4over API for", label)

        const productsToInsert = apiProducts.map((p: any) => ({
          product_uuid: p.product_uuid,
          product_description: p.product_description,
          product_code: p.product_code,
          category_uuid: categoryUuid,
          product_name: p.product_description,
          product_data: p,
        }))

        await supabase.from("fourover_products").upsert(productsToInsert, { onConflict: "product_uuid" })

        rows = apiProducts.map((p: any) => ({
          product_uuid: p.product_uuid,
          product_description: p.product_description,
          product_code: p.product_code,
        }))
      }
    }
    return rows || []
  }

  const products = await fetchCategoryProducts(leaf.uuid, leaf.name)
  let productList: (typeof products[number] & { _extraSourced?: boolean })[] = leaf.keyword
    ? products.filter((p) => matchesAllKeywords(p.product_description, leaf.keyword!))
    : products

  // rigid-signs' own "Signs" UUID has exactly 1 "3mm White PVC Counter
  // Cards with Easel Backs" entry mixed in — already correctly listed
  // under Counter Cards' own UUID too, and fourprintshop's Rigid Signs
  // page never shows it. Drop it here so it doesn't surface as (or get
  // absorbed into) a rigid-signs card.
  if (category === "rigid-signs") {
    productList = productList.filter((p) => !matchesAllKeywords(p.product_description, "counter card"))
  }

  // indoor-banners' own "Indoor Banner" UUID contains 18oz Blockout entries
  // that 4over.com actually displays under Outdoor Banners (see
  // outdoor-banners' TYPE_RULES comment) — exclude here so they don't also
  // surface as (or get absorbed into) an indoor-banners card; they're
  // re-added to outdoor-banners via EXTRA_PRODUCT_SOURCES instead.
  if (category === "indoor-banners") {
    productList = productList.filter((p) => !matchesAllKeywords(p.product_description, "18oz"))
  }

  // "Stickers" and "Bumper Stickers" share the SAME "Stickers" UUID — 4over.com
  // lists Bumper Stickers as its own subcategory (see that GROUPS entry's
  // comment in lib/print/categories.ts).
  if (category === "stickers") {
    productList = productList.filter((p) => !matchesAllKeywords(p.product_description, "bumper"))
  }

  const extraSources = EXTRA_PRODUCT_SOURCES[category]
  if (extraSources && extraSources.length > 0) {
    const extraLists = await Promise.all(
      extraSources.map(async (src) => {
        const rows = await fetchCategoryProducts(src.uuid, `${leaf.name} (extra: ${src.uuid})`)
        // Tagged so Round Corner can be treated differently per source below
        // (announcement-cards mixes the PRIMARY uuid's plain Standard/Round
        // Corner — 2 genuinely separate cards, confirmed live: Standard's
        // Stock dropdown is 14PT+16PT/Rectangle-only, Round Corner's is
        // 16PT-only/Rounded-only — with EXTRA-sourced materials like Silk,
        // where Round Corner IS just a Shape option within their one card).
        return rows.filter((p) => matchesAllKeywords(p.product_description, src.keyword)).map((p) => ({ ...p, _extraSourced: true }))
      }),
    )
    productList = [...productList, ...extraLists.flat()]
  }
  productList = reconstructCodeLikeDescriptions(productList)

  // ---- If we have type grouping rules, show TYPE CARDS (level 3) ----
  const hasTypeRules = !!TYPE_RULES[category]

  if (hasTypeRules && productList.length > 0) {
    // Group products by type
    const typeMap = new Map<string, { rule: TypeRule; products: typeof productList; image: string }>()

    for (const product of productList) {
      const rule = classifyProduct(product.product_description, category)
      if (!rule) continue
      if (!typeMap.has(rule.slug)) {
        typeMap.set(rule.slug, { rule, products: [], image: TYPE_IMAGES[category]?.[rule.slug] || leaf.image })
      }
      typeMap.get(rule.slug)!.products.push(product)
    }

    // Sort by rule order. "-base" slugs (e.g. "eddm-flyers-base") only exist
    // to classify a shared product pool for OPTION_PRESET_TYPES below to draw
    // from — excluded from the visible grid since their own split preset
    // cards (Full Service/Print Only, etc) are what should actually show.
    // EXCEPTION: "flat-flyers-brochures" is ALSO its own genuine visible
    // card on 4over.com's own /marketing-products/flyers-brochures listing
    // ("Flat Flyers and Brochures", the very first item) -- unlike EDDM's
    // base (never shown bare, only as Full Service/Print Only), the fold
    // presets (Tri Fold/Z Fold/Specialty Folds) are IN ADDITION TO the
    // plain/unfolded version, not a replacement for it. Confirmed live
    // 2026-07-10.
    const presetBaseSlugs = new Set(
      (OPTION_PRESET_TYPES[category] || [])
        .map((p) => p.baseSlug)
        .filter((slug) => slug !== "flat-flyers-brochures"),
    )
    const rules = TYPE_RULES[category]
    const sortedTypes = rules
      .map(r => typeMap.get(r.slug))
      .filter((entry): entry is { rule: TypeRule; products: typeof productList; image: string } => !!entry && !presetBaseSlugs.has(entry.rule.slug))

    // Append virtual option-preset cards (EDDM Full Service/Print Only, Tri
    // Fold/Z Fold/Specialty Folds Brochures) — same product set as their
    // base type, own findable card. See OPTION_PRESET_TYPES' own comment.
    for (const preset of OPTION_PRESET_TYPES[category] || []) {
      const baseEntry = typeMap.get(preset.baseSlug)
      if (baseEntry) {
        sortedTypes.push({
          rule: { label: preset.label, slug: preset.slug, keywords: [] },
          products: baseEntry.products,
          image: TYPE_IMAGES[category]?.[preset.slug] || baseEntry.image,
        })
      }
    }

    // Only one type with products (e.g. business-cards-standard now that
    // Round Corner/Oval/Fold Over no longer fork off their own type) — skip
    // straight to it, same rationale as the single-product redirect below.
    if (sortedTypes.length === 1) {
      redirect(`/print/${category}/${sortedTypes[0].rule.slug}`)
    }

    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-slate-200 py-2 px-4">
          <div className="container mx-auto">
            <p className="text-sm text-slate-500">
              <Link href="/" className="hover:text-[#e42a27]">Home</Link>
              <span className="mx-2">&gt;</span>
              <Link href={`/print/${leaf.parentSlug}`} className="hover:text-[#e42a27]">{leaf.parentLabel}</Link>
              <span className="mx-2">&gt;</span>
              <span className="text-[#e07b39]">{leaf.name}</span>
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{leaf.name}</h1>
          <hr className="border-slate-200 mb-6" />

          <div className="flex justify-end mb-6">
            <select className="border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-700 bg-white">
              <option>Popularity</option>
              <option>Newest</option>
              <option>A to Z</option>
              <option>Z to A</option>
            </select>
          </div>

          {/* 4-column grid of product TYPE cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {sortedTypes.map(({ rule, image }) => (
              <div key={rule.slug} className="group text-center">
                <Link href={`/print/${category}/${rule.slug}`}>
                  <div className="aspect-square bg-slate-100 mb-3 overflow-hidden">
                    <img
                      src={image}
                      alt={rule.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </Link>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 text-balance">{rule.label}</h3>
                <Link
                  href={`/print/${category}/${rule.slug}`}
                  className="inline-flex items-center gap-1 bg-[#e07b39] hover:bg-[#c9692a] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
                >
                  View details <span className="text-base leading-none">&rsaquo;</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---- No type rules — show individual products directly (level 3 = level 4) ----
  // For Signs & Banners and Business Cards the products differ only by size, so
  // group them by the size-stripped name and show ONE card per stock/type —
  // size is chosen later in the price calculator.
  const sizeGrouped = SIZE_GROUPED_PARENTS.includes(leaf.parentSlug)
  // Boxes & Packaging: 4over's "14PT"/"18PT" thickness prefix is, per the
  // client's literal demo (fourprintshop's Standard Boxes shows one card per
  // box STYLE — Cube/Wine/Pillow/... — with thickness as a Stock dropdown),
  // also a calculator-level distinction, not a card-level one — unlike other
  // categories (Business Cards, Hang Tags, ...) where we've kept thickness as
  // a card distinguisher. Scoped here so those other categories are untouched.
  const isBoxesPackaging = leaf.parentSlug === "boxes-packaging"
  // Excludes oval-cards/fold-over-cards themselves: those subcategories'
  // entire identity IS that shape word (keyword-filtered to ONLY oval/fold-
  // over entries) — stripping it would leave their card titles reading just
  // "Business Cards" with no hint of which subcategory they're even on.
  // Despite the name, also covers Announcement Cards: fourprintshop's own
  // Silk/Pearl/Natural Announcement Cards pages have the SAME Shape dropdown
  // (Rectangle/Rounded 4 Corners) merging in Round Corner, confirmed live —
  // it's the identical "Round Corner is a Shape variant, not its own
  // product" pattern as Business Cards, just under a different parent.
  const isBusinessCards =
    (leaf.parentSlug === "business-cards" && category !== "oval-cards" && category !== "fold-over-cards") ||
    category === "announcement-cards" || category.endsWith("-announcement-cards")
  const displayList = sizeGrouped
    ? (() => {
        const groups = new Map<string, { product_uuid: string; product_description: string }>()
        for (const p of productList) {
          // Applied to the RAW description, before stripSize/groupKey, so a
          // mislabeled word (e.g. Counter Cards' one "...Signs" outlier) gets
          // merged into the SAME group as its correctly-worded siblings, not
          // just relabeled in place as its own separate card.
          let rawDesc = p.product_description || ""
          for (const [pattern, replacement] of CATEGORY_WORD_OVERRIDES[category] || []) {
            rawDesc = rawDesc.replace(pattern, replacement)
          }
          // For announcement-cards specifically, Shape-merging only applies
          // to the EXTRA-sourced materials (Silk/Pearl/...) — the PRIMARY
          // uuid's plain "Standard"/"Round Corner" are confirmed (live,
          // fourprintshop) to be 2 genuinely separate cards: Standard's
          // Stock dropdown is 14PT+16PT/Rectangle-only, Round Corner's is
          // 16PT-only/Rounded-only — different stock AVAILABILITY, not just
          // a Shape pick within one card.
          const useShapeMerge = isBusinessCards && (category !== "announcement-cards" || p._extraSourced)
          let name = stripSize(rawDesc, useShapeMerge) || rawDesc
          let key = groupKey(rawDesc, useShapeMerge) || name.toLowerCase()
          if (isBoxesPackaging) {
            name = name.replace(BOX_THICKNESS_PREFIX, "").trim() || name
            key = key.replace(/\b\d+pt\b/g, "").replace(/\s{2,}/g, " ").trim()
          }
          // "Standard Announcement Cards" merges 14PT+16PT the same way
          // Boxes & Packaging merges thickness — confirmed live, its Stock
          // dropdown covers both. Scoped to non-extra-sourced, non-Round-
          // Corner only: Round Corner is 16PT-only (a real stock-
          // availability difference, not just a number to ignore), and the
          // extra-sourced materials' OWN stock differences (Silk/Suede/...)
          // are untouched by this category-specific rule.
          if (category === "announcement-cards" && !p._extraSourced && !/round\s*corner/i.test(rawDesc)) {
            name = name.replace(BOX_THICKNESS_PREFIX, "Standard ").trim() || name
            key = key.replace(/\b\d+pt\b/g, "").replace(/\s{2,}/g, " ").trim()
          }
          // Greeting Cards' 14PT/16PT/18PT C1S merge already happens via
          // CATEGORY_WORD_OVERRIDES stripping the PT prefix from rawDesc
          // before groupKey() runs — this just renames the resulting bare
          // "Greeting Cards" to match the "Standard X" naming used for the
          // same pattern elsewhere (Announcement Cards/Door Hangers/...).
          if (category === "greeting-cards" && name === "Greeting Cards") {
            name = "Standard Greeting Cards"
          }
          const ensureSuffix = CATEGORY_ENSURE_SUFFIX[category]
          if (ensureSuffix && !ensureSuffix.test.test(name)) {
            name = name + ensureSuffix.suffix
          }
          // Prefer the longer/more complete name (and its own uuid, so the
          // configurator page that loads from THIS uuid shows a matching H1)
          // as the merged card's representative — 4over's data inconsistencies
          // (see the FILLER_WORDS comment above) mean the first-encountered
          // sibling isn't always the best-worded one.
          const existing = groups.get(key)
          if (!existing || name.length > existing.product_description.length) {
            groups.set(key, { product_uuid: p.product_uuid, product_description: name })
          }
        }
        return [...groups.values()]
      })()
    : productList

  // A subcategory with only ONE product/stock has nothing worth browsing —
  // skip straight to its price calculator instead of a one-card gallery.
  if (sizeGrouped && displayList.length === 1) {
    const only = displayList[0]
    const slug = only.product_description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 60)
    redirect(`/print/${category}/${slug}?uuid=${only.product_uuid}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-200 py-2 px-4">
        <div className="container mx-auto">
          <p className="text-sm text-slate-500">
            <Link href="/" className="hover:text-[#e42a27]">Home</Link>
            <span className="mx-2">&gt;</span>
            <Link href={`/print/${leaf.parentSlug}`} className="hover:text-[#e42a27]">{leaf.parentLabel}</Link>
            <span className="mx-2">&gt;</span>
            <span className="text-[#e07b39]">{leaf.name}</span>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{leaf.name}</h1>
        <hr className="border-slate-200 mb-6" />

        {displayList.length > 0 ? (
          <>
            <div className="flex justify-end mb-6">
              <select className="border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-700 bg-white">
                <option>Popularity</option>
                <option>Newest</option>
                <option>A to Z</option>
                <option>Z to A</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {displayList.map((product) => {
                const slug = product.product_description
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/-+/g, "-")
                  .replace(/^-|-$/g, "")
                  .substring(0, 60)
                return (
                  <div key={product.product_uuid} className="group text-center">
                    <Link href={`/print/${category}/${slug}?uuid=${product.product_uuid}`}>
                      <div className="aspect-square bg-slate-100 mb-3 overflow-hidden">
                        <img
                          src={resolveProductImage(category, product.product_description, leaf.image)}
                          alt={product.product_description}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 text-balance">{product.product_description}</h3>
                    <Link
                      href={`/print/${category}/${slug}?uuid=${product.product_uuid}`}
                      className="inline-flex items-center gap-1 bg-[#e07b39] hover:bg-[#c9692a] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
                    >
                      View details <span className="text-base leading-none">&rsaquo;</span>
                    </Link>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500 mb-4">No products found in this category.</p>
            <Link href={`/print/${leaf.parentSlug}`} className="text-[#e42a27] hover:underline">
              Back to {leaf.parentLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
