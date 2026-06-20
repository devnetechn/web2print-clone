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
  "flyers-and-brochures": [
    { label: "All Inclusive Flyers and Brochures", slug: "all-inclusive-flyers-and-brochures", keywords: ["all inclusive", "all-inclusive"] },
    // "Folds to WxH" is how this sandbox's only 2 single-fold entries are
    // worded (4over filed them as "4 Page Booklet", but a 4-page document
    // folded once IS structurally a half-fold brochure).
    { label: "Half-Fold Brochures", slug: "half-fold-brochures", keywords: ["half-fold", "half fold", "folds to"] },
    { label: "Tearoff Flyers", slug: "tearoff-flyers", keywords: ["tear", "tearoff", "tear-off"] },
    { label: "Flat Flyers and Brochures", slug: "flat-flyers-and-brochures", keywords: [] }, // catch-all
  ],
  "postcards": [
    { label: "All Inclusive Postcards", slug: "all-inclusive-postcards", keywords: ["all inclusive", "all-inclusive"] },
    { label: "EDDM Postcards", slug: "eddm-postcards", keywords: ["eddm"] },
    { label: "Raised Foil Postcards", slug: "raised-foil-postcards", keywords: ["raised foil", "dual raised", "raised spot"] },
    { label: "Standard Postcards", slug: "standard-postcards", keywords: [] }, // catch-all
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
  // Stock-name rules (Natural/Pearl/Glue-less) MUST come before the size
  // rules below: classifyProduct() takes the FIRST matching rule, and every
  // product's description also contains its own size (e.g. "5.25\" x 10.5\"
  // 14pt Natural Uncoated Presentation Folder") — checking size first would
  // swallow every Natural/Pearl/Glue-less product into a size bucket before
  // ever reaching its real type, leaving those cards empty (and hidden).
  // fourprintshop's reference (4over-stable.fourprintshop.com/marketing-
  // material/presentation-folders/products/) also lists Silk/Suede/Akuafoil
  // Presentation Folders — confirmed NOT present anywhere in this sandbox's
  // single "Presentation Folders" 4over category (28 products, checked all),
  // a genuine catalog gap rather than a miscategorization.
  "presentation-folders": [
    { label: "Natural Presentation Folder", slug: "natural-presentation-folder", keywords: ["natural"] },
    { label: "Pearl Presentation Folder", slug: "pearl-presentation-folder", keywords: ["pearl"] },
    { label: "Glue-less Presentation Folder", slug: "glueless-presentation-folder", keywords: ["glue-less", "glueless", "glue less"] },
    { label: '9" x 12" Presentation Folder', slug: "9x12-presentation-folder", keywords: ["9\" x 12\"", "9x12", "9\" x12\"", "9\"x12"] },
    { label: '6" x 9" Presentation Folder', slug: "6x9-presentation-folder", keywords: ["6\" x 9\"", "6x9", "6\" x9\""] },
    { label: '5.25" x 10.5" Presentation Folder', slug: "5x10-presentation-folder", keywords: ["5.25", "5.25\"", "10.5"] },
    { label: '9" x 14.5" Presentation Folder', slug: "9x14-presentation-folder", keywords: ["9\" x 14.5\"", "9x14", "14.5"] },
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
    { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", keyword: ["flyer", "tear-off perforation"] },
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
// elsewhere on the product (Scoring, Variable Numbering).
const SCORING_SUFFIX = /,?\s*(flat\s*-\s*no\s+scoring|scoring\s+included)\.?\s*$/i
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
const FILLER_WORDS = new Set(["with", "on", "the", "a", "an", "and", "for", "of", "to", "&", "in", "w", "calendar", "saddle", "stitch"])
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
    let { data: rows } = await supabase
      .from("fourover_products")
      .select("product_uuid, product_description, product_code")
      .eq("category_uuid", categoryUuid)

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
  let productList = leaf.keyword
    ? products.filter((p) => matchesAllKeywords(p.product_description, leaf.keyword!))
    : products

  const extraSources = EXTRA_PRODUCT_SOURCES[category]
  if (extraSources && extraSources.length > 0) {
    const extraLists = await Promise.all(
      extraSources.map(async (src) => {
        const rows = await fetchCategoryProducts(src.uuid, `${leaf.name} (extra: ${src.uuid})`)
        return rows.filter((p) => matchesAllKeywords(p.product_description, src.keyword))
      }),
    )
    productList = [...productList, ...extraLists.flat()]
  }

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
          let name = stripSize(p.product_description || "", isBusinessCards) || p.product_description
          let key = groupKey(p.product_description || "", isBusinessCards) || name.toLowerCase()
          if (isBoxesPackaging) {
            name = name.replace(BOX_THICKNESS_PREFIX, "").trim() || name
            key = key.replace(/\b\d+pt\b/g, "").replace(/\s{2,}/g, " ").trim()
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
