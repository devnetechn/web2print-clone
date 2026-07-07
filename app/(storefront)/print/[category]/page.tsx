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
interface TypeRule { label: string; slug: string; keywords: string[] }

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
    { label: "All Inclusive Flyers and Brochures",          slug: "all-inclusive-flyers-and-brochures",          keywords: ["all inclusive", "all-inclusive"] },
    { label: "EDDM Full Service - Half Folds",              slug: "eddm-full-service-half-folds",               keywords: ["eddm full service", "eddm", "half fold"] },
    { label: "EDDM Print Only - Half Folds",                slug: "eddm-print-only-half-folds",                keywords: ["eddm print only", "eddm", "half fold"] },
    { label: "EDDM Full Service - Flyers",                  slug: "eddm-full-service-flyers",                  keywords: ["eddm full service", "eddm"] },
    { label: "EDDM Flyers - Print Only",                    slug: "eddm-flyers-print-only",                    keywords: ["eddm print only", "eddm"] },
    { label: "Direct Mail Half Fold Flyers and Brochures",  slug: "direct-mail-half-fold-flyers",              keywords: ["direct mail", "half fold"] },
    { label: "Direct Mail Tri Fold Flyers and Brochures",   slug: "direct-mail-tri-fold-flyers",               keywords: ["direct mail", "tri fold"] },
    { label: "Direct Mail Specialty Folds Flyers",          slug: "direct-mail-specialty-folds-flyers",        keywords: ["direct mail", "specialty"] },
    { label: "Direct Mail Flyers Brochures Coated",         slug: "direct-mail-flyers-coated",                 keywords: ["direct mail", "coated"] },
    { label: "Direct Mail Flyers Brochures Uncoated",       slug: "direct-mail-flyers-uncoated",               keywords: ["direct mail", "uncoated"] },
    { label: "Direct Mail Flyers and Brochures",            slug: "direct-mail-flyers",                        keywords: ["direct mail"] },
    { label: "Specialty Folds Brochures",                   slug: "specialty-folds-brochures",                 keywords: ["specialty fold", "gatefold", "gate fold", "accordion", "french fold"] },
    { label: "Z Fold Brochures",                            slug: "z-fold-brochures",                          keywords: ["z fold", "z-fold", "zfold"] },
    { label: "Tri Fold Brochures",                          slug: "tri-fold-brochures",                        keywords: ["tri fold", "tri-fold", "trifold"] },
    { label: "Half-Fold Brochures",                         slug: "half-fold-brochures",                       keywords: ["half-fold", "half fold", "folds to"] },
    { label: "EndurACE Flyers and Brochures",               slug: "endurace-flyers-and-brochures",             keywords: ["endurace"] },
    { label: "Tearoff Flyers",                              slug: "tearoff-flyers",                            keywords: ["tear", "tearoff", "tear-off"] },
    { label: "Flat Flyers and Brochures",                   slug: "flat-flyers-and-brochures",                 keywords: [] }, // catch-all
  ],
  // 4over.com/marketing-products/postcards lists 25 product types.
  // Brand-stock materials (Silk/Suede/Pearl/etc.) live in their own shared
  // UUIDs — pulled in via EXTRA_PRODUCT_SOURCES below. Order is critical:
  // more specific keywords must come before broader ones (e.g. "rsvp" before
  // "dual raised", "raised foil" before "foil", "eddm full service" before "eddm").
  "postcards": [
    { label: "All Inclusive Postcards",       slug: "all-inclusive-postcards",       keywords: ["all inclusive", "all-inclusive"] },
    { label: "EDDM Full Service Postcards",   slug: "eddm-full-service-postcards",   keywords: ["eddm full service", "full service"] },
    { label: "EDDM Print Only Postcards",     slug: "eddm-print-only-postcards",     keywords: ["eddm print only", "print only"] },
    { label: "EDDM Postcards",               slug: "eddm-postcards",               keywords: ["eddm"] },
    { label: "Dual Raised RSVP",             slug: "dual-raised-rsvp-postcards",   keywords: ["rsvp"] },
    { label: "Dual Raised Postcards",        slug: "dual-raised-postcards",        keywords: ["dual raised"] },
    { label: "Raised Foil Postcards",        slug: "raised-foil-postcards",        keywords: ["raised foil"] },
    { label: "Raised Spot UV Postcards",     slug: "raised-spot-uv-postcards",     keywords: ["raised spot"] },
    { label: "Foil Worx Postcards",          slug: "foil-worx-postcards",          keywords: ["foil worx"] },
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
    { label: "Magnet Postcards",             slug: "magnet-postcards",             keywords: ["magnet"] },
    { label: "100LB Gloss Cover Postcards",  slug: "100lb-gloss-cover-postcards",  keywords: ["100lb gloss cover"] },
    { label: "18pt Postcards",               slug: "18pt-postcards",               keywords: ["18pt"] },
    { label: "16PT Postcards",               slug: "16pt-postcards",               keywords: ["16pt"] },
    { label: "14pt Postcards",               slug: "14pt-postcards",               keywords: ["14pt"] },
    { label: "Direct Mail Postcards",        slug: "direct-mail-postcards",        keywords: ["direct mail"] },
    { label: "Standard Postcards",           slug: "standard-postcards",           keywords: [] }, // catch-all
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
  // 4over.com/marketing-products/booklets lists 6 product types.
  // "Gloss Cover" must come before "Gloss" to avoid misclassification.
  // "Premium Opaque" covers both 60LB and 70LB opaque stocks.
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
  envelopes: [
    { label: "Blank Envelopes", slug: "blank-envelopes", keywords: ["blank"] },
    { label: "Digital Envelopes", slug: "digital-envelopes", keywords: ["digital"] },
    { label: "Variable Addressing Envelopes", slug: "variable-addressing-envelopes", keywords: ["variable"] },
    { label: "Linen Uncoated Envelopes", slug: "linen-uncoated-envelopes", keywords: ["linen"] },
    { label: "Natural Envelopes", slug: "natural-envelopes", keywords: ["natural"] },
    { label: "Offset Envelopes", slug: "offset-envelopes", keywords: [] }, // catch-all
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
    { label: "Akuafoil Hang Tags", slug: "akuafoil-hang-tags", keywords: ["akuafoil"] },
    { label: "Foil Worx Hang Tags", slug: "foil-worx-hang-tags", keywords: ["foiled"] },
    { label: "Bottleneck Hang Tags", slug: "bottleneck-hang-tags", keywords: ["bottle neck", "bottleneck"] },
    { label: "Brown Kraft Hang Tags", slug: "brown-kraft-hang-tags", keywords: ["brown kraft"] },
    { label: "Natural Hang Tags", slug: "natural-hang-tags", keywords: ["natural"] },
    { label: "Pearl Hang Tags", slug: "pearl-hang-tags", keywords: ["pearl"] },
    { label: "Plastic Hang Tags", slug: "plastic-hang-tags", keywords: ["plastic"] },
    { label: "Raised Spot UV Hang Tags", slug: "raised-spot-uv-hang-tags", keywords: ["raised spot"] },
    { label: "Silk Hang Tags", slug: "silk-hang-tags", keywords: ["silk"] },
    { label: "Suede Hang Tags", slug: "suede-hang-tags", keywords: ["suede"] },
    { label: "Regular Hang Tags", slug: "regular-hang-tags", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /marketing-material/posters/products/ is a
  // 6-card grid — confirmed live: "Gloss Book Posters" is 100LB Gloss Book
  // ONLY (does NOT merge 80LB like Booklets did), "Matte-Finish Posters" =
  // "100LB Dull Book" stock, "Photo Gloss Posters" = the dedicated "8mil
  // Photo Poster - Gloss" stock (raw wording in this sandbox is just "8mil
  // Poster", no "Photo"/"Gloss" words at all). Backlit/Blockout/Photo Gloss
  // all live OUTSIDE this category's own UUID — merged in via
  // EXTRA_PRODUCT_SOURCES below. Backlit's own descriptions are pure
  // product_code ("9MILBACKLIT-POSTER-12X15", a 4over data gap — even
  // fourprintshop's OWN Backlit product page is broken/sizeless live) —
  // classifyProduct() matches keywords as a SUBSTRING of the raw text
  // (".includes()"), so "backlit" still matches inside "9milbacklit-..."
  // fine; no reconstruction needed since TYPE_RULES cards are titled from
  // TYPE_LABELS below, never from the raw description.
  posters: [
    { label: "Backlit Posters", slug: "backlit-posters", keywords: ["backlit"] },
    { label: "Blockout Posters", slug: "blockout-posters", keywords: ["blockout"] },
    { label: "Photo Gloss Posters", slug: "photo-gloss-posters", keywords: ["8mil"] },
    { label: "Matte-Finish Posters", slug: "matte-finish-posters", keywords: ["dull"] },
    { label: "Gloss Cover Posters", slug: "gloss-cover-posters", keywords: ["gloss cover"] },
    { label: "Gloss Book Posters", slug: "gloss-book-posters", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /marketing-material/rack-cards/products/ is a
  // 3-card grid — confirmed live: SIZE is the top-level split for "Standard"
  // (3.5x8.5 / 4x9, each merging its own 14PT/16PT/18PT C1S stocks), while
  // "Akuafoil Rack Cards" is its OWN single card spanning BOTH sizes (its
  // own Size dropdown covers 3.5x8.5 AND 4x9, Stock fixed at 16PT C2S) — so
  // Akuafoil must classify FIRST, before the size split, or it'd get
  // swallowed into whichever Standard size matches.
  "rack-cards": [
    { label: "Akuafoil Rack Cards", slug: "akuafoil-rack-cards", keywords: ["akuafoil"] },
    { label: "3.5 x 8.5 Standard Rack Cards", slug: "3-5-x-8-5-standard-rack-cards", keywords: ['3.5" x 8.5"'] },
    { label: "4 x 9 Standard Rack Cards", slug: "4-x-9-standard-rack-cards", keywords: [] }, // catch-all
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
    { label: "Pearl Sell Sheets", slug: "pearl-sell-sheets", keywords: ["pearl"] },
    { label: "Silk Sell Sheets", slug: "silk-sell-sheets", keywords: ["silk"] },
    { label: "Suede Sell Sheets", slug: "suede-sell-sheets", keywords: ["suede"] },
    { label: "Standard Sell Sheets", slug: "standard-sell-sheets", keywords: [] }, // catch-all
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
  // Same situation as tear-off-cards above: fourprintshop has no standalone
  // "EDDM" category at all (only an "EDDM - Postcards" sub-card nested
  // under its own Postcards category) — this is a pure 4over backend
  // bucket mixing 3 genuinely different product types (Flyers/Postcards/
  // Sell Sheets, all "EDDM"). Verified clean 3-way split across all 158
  // raw entries (63 Postcards / 45 Sell Sheets / 50 Flyers, zero leftover)
  // — Flyers checked last since roughly a third of its own entries are
  // missing the word "Flyer" entirely (4over data gap, e.g. "100LB EDDM
  // Gloss Cover With AQ" with no type word), so it can only be expressed
  // as the catch-all once Postcards/Sell Sheets are ruled out. One card
  // per type per the user's instruction, Stock/Weight fully selectable in
  // the calculator.
  eddm: [
    { label: "EDDM Postcards", slug: "eddm-postcards", keywords: ["postcards"] },
    { label: "EDDM Sell Sheets", slug: "eddm-sell-sheets", keywords: ["sell sheets"] },
    { label: "EDDM Flyers", slug: "eddm-flyers", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /signs-banners/table-covers/products/ is a
  // 2-card grid — confirmed live: "Table cloths" (4over's own internal
  // productcategory label is "Table Throws") covers all 4 sizes (68x132,
  // 68x156, 90x132, 90x156), "Table Runners" covers all 5 widths. All 4
  // Table Cloth entries in this sandbox have pure product_code
  // descriptions ("9OZPOLY-TABLETHROW-68X132") with NO clean sibling to
  // reconstruct from (every one of them is equally code-like) — handled in
  // [typeSlug]/page.tsx with a targeted regex instead of the generic
  // reconstructCodeLikeDescriptions helper. Not needed here: classification
  // below matches "tablethrow" as a raw substring fine, and this level-3
  // page's card title comes from the static label, never the raw
  // description.
  "table-covers": [
    { label: "Table Cloths", slug: "table-cloths", keywords: ["tablethrow"] },
    { label: "Table Runners", slug: "table-runners", keywords: [] }, // catch-all
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
    { label: "Coroplast Rider Signs", slug: "coroplast-rider-signs", keywords: ["rider"] },
    { label: "4mm Coroplast Signs", slug: "4mm-coroplast-signs", keywords: ["4mm white coroplast"] },
    { label: "3mm PVC Signs", slug: "3mm-pvc-signs", keywords: ["3mm white pvc signs"] },
    { label: "Foam Core Signs", slug: "foam-core-signs", keywords: ["foamcore", "foam core"] },
    { label: "Aluminum Heavy Duty", slug: "aluminum-heavy-duty", keywords: ["heavy duty"] },
    { label: "Aluminum Sandwich Board", slug: "aluminum-sandwich-board", keywords: ["sandwich board"] },
    { label: "Styrene Signs", slug: "styrene-signs", keywords: ["styrene"] },
    { label: "Gator Board Signs", slug: "gator-board-signs", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /signs-banners/outdoor-banners/products/ is a
  // 2-card grid (Mesh Banners, Scrim Vinyl Banners — confirmed live, stock
  // "13oz Scrim Vinyl - Outdoor" matches our own "13oz Outdoor Vinyl
  // Banner" wording) — confirmed clean 3-way split across all 522 raw
  // entries (139 Mesh / 382 Scrim Vinyl / 1 Banner Stand Kit, zero
  // leftover). The single "13oz Scrim Vinyl with Telescopic Backdrop
  // Banner Stand" entry is a genuinely different bundled product (banner +
  // stand hardware, not just a material variant) that fourprintshop's own
  // page doesn't show — kept as a 3rd card rather than discarded, same as
  // every other genuine-extra decision this session.
  "outdoor-banners": [
    { label: "Mesh Banners", slug: "mesh-banners", keywords: ["mesh"] },
    { label: "Scrim Vinyl Banners", slug: "scrim-vinyl-banners", keywords: ["13oz outdoor vinyl banner"] },
    { label: "Banner Stand Kit", slug: "banner-stand-kit", keywords: [] }, // catch-all
  ],
  // fourprintshop's literal /signs-banners/indoor-banners/products/ is a
  // 5-card grid. Only 3 of these (Premium Vinyl/15oz Blockout/18oz
  // Blockout) live in this category's own UUID — "Artist Canvas" and
  // "Premium Polyester Banners" were INITIALLY assumed absent (this
  // sandbox's own UUID has zero matches for either), but checking each
  // fourprintshop product page's live Stock dropdown value+uuid revealed
  // both actually live in the SAME shared "Fabric Banners" category
  // (stock_uuid "a33cb149..." for Artist Canvas / "cc846f34..." for
  // Premium Polyester — exact matches, confirmed via direct stock_uuid
  // comparison, not just wording) — merged in via EXTRA_PRODUCT_SOURCES
  // below. Confirmed clean 5-way split across all 508 combined raw entries
  // (160 Canvas / 140 Polyester / 87 10mil / 63 15oz / 58 18oz, zero
  // leftover) — Canvas/Polyester checked first since they're the more
  // specific keywords.
  "indoor-banners": [
    { label: "Artist Canvas", slug: "artist-canvas", keywords: ["artist canvas"] },
    { label: "Premium Polyester Banners", slug: "premium-polyester-banners", keywords: ["premium polyester banner"] },
    { label: "Premium Vinyl Banners", slug: "premium-vinyl-banners", keywords: ["10mil"] },
    { label: "15oz Blockout Indoor Vinyl Banner", slug: "15oz-blockout-indoor-vinyl-banner", keywords: ["15oz"] },
    { label: "18oz Blockout Indoor Vinyl Banner", slug: "18oz-blockout-indoor-vinyl-banner", keywords: [] }, // catch-all
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
  // fourprintshop's literal /signs-banners/window-graphics/products/ is a
  // 4-card grid (Opaque/See-Through Perforated/Standard Clings Clear/White)
  // — confirmed clean 4-way split across all 1485 raw entries (414 White /
  // 240 Clear / 826 Perforated / 5 Opaque, zero leftover). One stray "8.5\"
  // X 11\" 7mil Window Cling" entry is missing the word "White" entirely
  // (4over data gap, product_code confirms it's the same "7MIL" stock) —
  // "white" classification also checks the bare "7mil" keyword to catch it.
  "window-graphics": [
    { label: "See-Through Perforated Window Vinyl Graphic", slug: "see-through-perforated-window-vinyl-graphic", keywords: ["perforated"] },
    { label: "Opaque Window Graphics", slug: "opaque-window-graphics", keywords: ["opaque"] },
    { label: "Standard Clings: Clear", slug: "standard-clings-clear", keywords: ["clear"] },
    { label: "Standard Clings: White", slug: "standard-clings-white", keywords: [] }, // catch-all (White + the "7mil" gap entry)
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
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: ["flyer", "brochure"] }, // EndurACE
    { uuid: "50a1f1a2-3567-4618-a703-074471472e8d", keyword: ["flyer", "brochure", "half fold"] }, // EDDM variants
  ],
  // "Tearoff Door Hangers" (Tear Off Cards UUID) + "EndurACE Door Hangers"
  // (EndurACE UUID, same one used by EndurACE Business Cards/Flyers) — see
  // the matching comment on door-hangers' TYPE_RULES entry.
  "door-hangers": [
    { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", keyword: "door hanger" },
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: "door hanger" },
  ],
  // "Variable Addressing Envelopes" data lives in the dedicated "Variable
  // Data" category (f5e2f7e8) — envelopes' own UUID has zero "variable"
  // matches.
  envelopes: [{ uuid: "f5e2f7e8-0ba8-47a6-964d-3ec6dddef2cb", keyword: "envelope" }],
  // Brand-stock materials (same shared categories as Business Cards/Trading
  // Cards/Announcement Cards) plus Plastic/Raised Spot UV (same shared
  // categories as their Business Cards counterparts).
  "hang-tags": [
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
  ],
  "table-tent-cards": [
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: ["natural", "table tent"] },
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: ["pearl", "table tent"] },
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
  "flyers-and-brochures": {
    "all-inclusive-flyers-and-brochures": "/images/cat/flyers-and-brochures/all-inclusive.jpg",
    "half-fold-brochures": "/images/cat/flyers-and-brochures/half-fold.jpg",
    "tearoff-flyers": "/images/cat/flyers-and-brochures/tearoff.jpg",
    "flat-flyers-and-brochures": "/images/cat/flyers-and-brochures/flat.jpg",
  },
  envelopes: {
    "blank-envelopes": "/images/cat/envelopes/blank.jpg",
    "digital-envelopes": "/images/cat/envelopes/digital.jpg",
    "variable-addressing-envelopes": "/images/cat/envelopes/variable-addressing.jpg",
    "linen-uncoated-envelopes": "/images/cat/envelopes/linen-uncoated.jpg",
    "natural-envelopes": "/images/cat/envelopes/natural.jpg",
    "offset-envelopes": "/images/cat/envelopes/offset.jpg",
  },
  "hang-tags": {
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
  "rack-cards": {
    "akuafoil-rack-cards": "/images/cat/rack-cards/akuafoil.jpg",
    "3-5-x-8-5-standard-rack-cards": "/images/cat/rack-cards/standard-3.5x8.5.jpg",
    "4-x-9-standard-rack-cards": "/images/cat/rack-cards/standard-4x9.jpg",
  },
  "sell-sheets": {
    "akuafoil-sell-sheets": "/images/cat/sell-sheets/akuafoil.jpg",
    "brown-kraft-sell-sheets": "/images/cat/sell-sheets/brown-kraft.jpg",
    "endurace-sell-sheets": "/images/cat/sell-sheets/endurace.jpg",
    "pearl-sell-sheets": "/images/cat/sell-sheets/pearl.jpg",
    "silk-sell-sheets": "/images/cat/sell-sheets/silk.jpg",
    "suede-sell-sheets": "/images/cat/sell-sheets/suede.jpg",
    "standard-sell-sheets": "/images/cat/sell-sheets.jpg",
  },
  "table-tent-cards": {
    "natural-table-tents": "/images/cat/table-tent-cards/natural.jpg",
    "pearl-table-tents": "/images/cat/table-tent-cards/pearl.jpg",
    "4x6-table-tent": "/images/cat/table-tent-cards/4x6.jpg",
    "5x5-5-table-tent": "/images/cat/table-tent-cards/5x5.5.jpg",
  },
  // No per-stock fourprintshop photos exist for this category (no reference
  // page at all) — reusing the SAME real generic photo per product type,
  // consistent with each type's own existing image elsewhere on the site
  // (door-hangers.jpg, postcards.jpg, and flyers-and-brochures' own
  // tearoff.jpg, sourced from this exact same UUID).
  "tear-off-cards": {
    "door-hangers-tear-off": "/images/cat/door-hangers.jpg",
    "flyers-tear-off": "/images/cat/flyers-and-brochures/tearoff.jpg",
    "postcards-tear-off": "/images/cat/postcards.jpg",
  },
  eddm: {
    "eddm-postcards": "/images/cat/postcards.jpg",
    "eddm-sell-sheets": "/images/cat/sell-sheets.jpg",
    "eddm-flyers": "/images/cat/flyers-and-brochures.jpg",
  },
  "table-covers": {
    "table-cloths": "/images/cat/table-covers/table-cloth.jpg",
    "table-runners": "/images/cat/table-covers/table-runners.jpg",
  },
  "rigid-signs": {
    "10mm-coroplast-signs": "/images/cat/rigid-signs/10mm-coroplast.jpg",
    "coroplast-rider-signs": "/images/cat/rigid-signs/coroplast-rider.jpg",
    "4mm-coroplast-signs": "/images/cat/rigid-signs/4mm-coroplast.jpg",
    "3mm-pvc-signs": "/images/cat/rigid-signs/3mm-pvc.jpg",
    "foam-core-signs": "/images/cat/rigid-signs/foam-core.jpg",
    "aluminum-heavy-duty": "/images/cat/rigid-signs/aluminum-heavy-duty.jpg",
    "aluminum-sandwich-board": "/images/cat/rigid-signs/aluminum-sandwich-board.jpg",
    "styrene-signs": "/images/signs/rigid-signs.jpg",
    "gator-board-signs": "/images/signs/rigid-signs.jpg",
  },
  "outdoor-banners": {
    "mesh-banners": "/images/cat/outdoor-banners/mesh.jpg",
    "scrim-vinyl-banners": "/images/cat/outdoor-banners/scrim-vinyl.jpg",
    "banner-stand-kit": "/images/signs/banner-stands.jpg",
  },
  "indoor-banners": {
    "artist-canvas": "/images/cat/indoor-banners/artist-canvas.jpg",
    "premium-polyester-banners": "/images/cat/indoor-banners/premium-polyester.jpg",
    "premium-vinyl-banners": "/images/cat/indoor-banners/premium-vinyl.jpg",
    "15oz-blockout-indoor-vinyl-banner": "/images/cat/indoor-banners/blockout.jpg",
    "18oz-blockout-indoor-vinyl-banner": "/images/cat/indoor-banners/blockout.jpg",
  },
  flags: {
    "feather-flags": "/images/cat/flags/feather.jpg",
    "pole-flags": "/images/cat/flags/pole.jpg",
    "teardrop-flags": "/images/cat/flags/teardrop.jpg",
  },
  "window-graphics": {
    "see-through-perforated-window-vinyl-graphic": "/images/cat/window-graphics/perforated.jpg",
    "opaque-window-graphics": "/images/cat/window-graphics/opaque.jpg",
    "standard-clings-clear": "/images/cat/window-graphics/clear.jpg",
    "standard-clings-white": "/images/cat/window-graphics/white.jpg",
  },
  "wall-decals": {
    "high-tack-adhesive-vinyl": "/images/cat/wall-decals/high-tack.jpg",
    "low-tack-vinyl-wall-decals": "/images/cat/wall-decals/low-tack.jpg",
  },
  displays: {
    "tabletop-displays": "/images/cat/displays/tabletop.jpg",
    "fabric-tube-displays": "/images/cat/displays/fabric-tube.jpg",
    "silicon-edge-graphic-display": "/images/signs/displays.jpg",
    "event-tents": "/images/cat/displays/event-tents.jpg",
    "fan-cutout": "/images/cat/displays/fan-cutout.jpg",
    "foam-core-counter-cards": "/images/cat/displays/foam-core-counter.jpg",
    "white-pvc-counter-cards": "/images/cat/displays/white-pvc-counter.jpg",
  },
}

// Classify a product description into a type slug for a given category
function classifyProduct(description: string, categorySlug: string): TypeRule | null {
  const rules = TYPE_RULES[categorySlug]
  if (!rules) return null
  const lower = description.toLowerCase()
  // Try each rule in order (last rule with empty keywords is catch-all)
  for (const rule of rules) {
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
  "custom-boxes": [
    [/^18PTC1S-CPBXNC-([\d.]+)X([\d.]+)$/i, '$1" X $2" Print and Trim Boxes with No Coating'],
    [/^18PTC1S-CPBXSPUVFR-([\d.]+)X([\d.]+)$/i, '$1" X $2" Print and Trim Boxes with Spot UV on the front only, No UV Coating on the back'],
    [/^18PTC1S-CPBXUV-([\d.]+)X([\d.]+)$/i, '$1" X $2" Print and Trim Boxes with Full UV on the front only, No UV Coating on the back'],
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
  "announcement-cards": [[/\buncoated\s+(?=(?:round\s*corners?|ovals?|fold\s*overs?)?\s*announcement\s+cards)/gi, ""]],
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
            {group.subcategories.map((sub) => (
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
    // PostgREST's default max-rows caps a single .select() at 1000 — kept
    // in sync with [typeSlug]/page.tsx's same fix; see that file's comment
    // (Window Graphics' shared "ae3afb44..." category has 1485 products,
    // silently dropping its 5 Opaque entries past row 1000).
    let rows: { product_uuid: string; product_description: string; product_code: string }[] = []
    const PAGE_SIZE = 1000
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page } = await supabase
        .from("fourover_products")
        .select("product_uuid, product_description, product_code")
        .eq("category_uuid", categoryUuid)
        .range(from, from + PAGE_SIZE - 1)
      if (!page || page.length === 0) break
      rows = rows.concat(page)
      if (page.length < PAGE_SIZE) break
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

    // Sort by rule order
    const rules = TYPE_RULES[category]
    const sortedTypes = rules
      .map(r => typeMap.get(r.slug))
      .filter(Boolean) as { rule: TypeRule; products: typeof productList; image: string }[]

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
