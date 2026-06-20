import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getProductFeed, getAllProductsForCategory, getCategoryProductsList } from "@/lib/4over/client"
import { ProductConfiguratorClient } from "@/components/print/product-configurator-client"
import { SLUG_TO_CATEGORY, SIZE_GROUPED_PARENTS } from "@/lib/print/categories"
import { resolveProductImage } from "@/lib/print/product-images"

// Type rules — keywords that identify a product type within a category
const TYPE_KEYWORDS: Record<string, Record<string, string[]>> = {
  "flyers-and-brochures": {
    "all-inclusive-flyers-and-brochures": ["all inclusive", "all-inclusive"],
    "endurace-flyers-and-brochures": ["endurace"],
    "flat-flyers-and-brochures": ["flat flyer", "flat brochure"],
    "half-fold-brochures": ["half-fold", "half fold"],
    "specialty-folds-brochures": ["specialty fold", "specialty folds"],
    "tearoff-flyers": ["tear", "tearoff", "tear-off"],
    "tri-fold-brochures": ["tri-fold", "tri fold"],
    "z-fold-brochures": ["z-fold", "z fold"],
  },
  "postcards": {
    "all-inclusive-postcards": ["all inclusive", "all-inclusive"],
    "eddm-postcards": ["eddm"],
    "raised-foil-postcards": ["raised foil", "dual raised", "raised spot"],
    "standard-postcards": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES — see that
  // file's comment for why Round Corner/Oval/Fold Over no longer get their
  // own type (they're Shape/Size variants of one product now).
  "business-cards-standard": {
    "standard-business-cards": [], // catch-all (now the only rule)
  },
  // Order matters — see the matching comment in print/[category]/page.tsx
  // (Natural/Pearl/Glue-less must be checked before the size keywords, since
  // every product's description also contains its own size).
  "presentation-folders": {
    "natural-presentation-folder": ["natural"],
    "pearl-presentation-folder": ["pearl"],
    "glueless-presentation-folder": ["glue-less", "glueless", "glue less"],
    "9x12-presentation-folder": ["9\" x 12\"", "9x12"],
    "6x9-presentation-folder": ["6\" x 9\"", "6x9"],
    "5x10-presentation-folder": ["5.25", "10.5"],
    "9x14-presentation-folder": ["9\" x 14.5\"", "14.5"],
  },
}

// Type slug -> display label
const TYPE_LABELS: Record<string, string> = {
  "all-inclusive-flyers-and-brochures": "All Inclusive Flyers and Brochures",
  "endurace-flyers-and-brochures": "EndurACE Flyers and Brochures",
  "flat-flyers-and-brochures": "Flat Flyers and Brochures",
  "half-fold-brochures": "Half-Fold Brochures",
  "specialty-folds-brochures": "Specialty Folds Brochures",
  "tearoff-flyers": "Tearoff Flyers",
  "tri-fold-brochures": "Tri-Fold Brochures",
  "z-fold-brochures": "Z-Fold Brochures",
  "all-inclusive-postcards": "All Inclusive Postcards",
  "eddm-postcards": "EDDM Postcards",
  "raised-foil-postcards": "Raised Foil Postcards",
  "standard-postcards": "Standard Postcards",
  "standard-business-cards": "Standard Business Cards",
  "natural-presentation-folder": "Natural Presentation Folder",
  "pearl-presentation-folder": "Pearl Presentation Folder",
  "glueless-presentation-folder": "Glue-less Presentation Folder",
  "9x12-presentation-folder": '9" x 12" Presentation Folder',
  "6x9-presentation-folder": '6" x 9" Presentation Folder',
  "5x10-presentation-folder": '5.25" x 10.5" Presentation Folder',
  "9x14-presentation-folder": '9" x 14.5" Presentation Folder',
}

// Signs & Banners: hide these technical/redundant option groups from the price
// calculator (Coating, Orientation, Flute, H-Stakes). Everything else relevant
// to each product (Grommets, Shape, Pole Pockets, Hems, D-Rings, Rope, Velcro,
// ...) still shows. Hidden groups keep their default in the live price.
const SIGNS_HIDDEN_GROUPS = ["coating", "product orientation", "flute directions", "h-stakes"]

// Variant dimensions: NxN and NxNxN (boxes) sizes AND page counts ("8 Page").
const SIZE_DIM = /\d+(?:\.\d+)?\s*["”']?\s*[xX×]\s*\d+(?:\.\d+)?\s*["”']?(?:\s*[xX×]\s*\d+(?:\.\d+)?\s*["”']?)?/g
const PAGE_DIM = /\b\d+\s*(?:inside\s+)?pages?\b/gi
// Linear (single-axis) dimensions using ft/in units instead of a bare NxN
// pattern (e.g. "Feather Flag - 10ft -", "Pole Flag - 3ft x 2ft -", "Table
// Runner - 24\" Width") — SIZE_DIM only matches bare-number NxN.
const LINEAR_DIM = /\d+(?:\.\d+)?\s*(?:ft|in|inch(?:es)?)\.?(?:\s*[xX×]\s*\d+(?:\.\d+)?\s*(?:ft|in|inch(?:es)?)\.?)?\b|\d+(?:\.\d+)?\s*["”']\s*(?:width|wide|height|tall)\b/gi
// "Booklet On"/"Brochure On" etc. is Print Method — already its own calculator
// dropdown (fourprintshop's product-type cards never show it in the title).
const PRINT_METHOD_PREFIX = /^[\s\-–—]*(Brochure|Booklet|Flyer|Postcard)s?\s+(On|on)\s+/
// Coating/Finishing phrase anchored on an explicit "with"/"w/" (Spot/Full
// connector words allowed in between) — already its own calculator dropdown.
// Anchoring on "with" keeps unrelated "with ..." text intact (e.g. "Dual
// Raised ... with Raised Spot UV and Raised Foil on Front only", a product-
// defining name, not a removable finish). Deliberately has NO "akuafoil"
// group — kept in sync with the same constant in print/[category]/page.tsx;
// see that file's comment for why ("Akuafoil" must stay product identity,
// not get inconsistently eaten as part of the removable coating phrase).
const COATING_WITH = /[\s,]+(?:with|wih|w\/)\s*(no\s+)?(satin\s+)?(spot\s+|full\s+)?(\d+\s*mil\s+)?(gloss\s+|matte\s+)?(uncoated|coated\b|aq\b|coating|uv|lamination)\b.*$/i
// "Without Coating" — kept in sync with print/[category]/page.tsx.
const WITHOUT_COATING_SUFFIX = /\s+without\s+coating\s*$/i
// Boxes print "Uncoated"/"Coated" as a standalone trailing word with no
// "with" at all (e.g. "14PT Cube Box Uncoated").
const COATING_TRAILING = /[\s,]+(uncoated|coated)\s*$/i
// "Matte/Dull Finish" middle modifier, "UV on N-color side(s)"/"on the front
// only" trailing phrase with no preceding "with", and Binding/Finishing
// add-ons (Scoring, Variable Numbering) already exposed elsewhere on the
// product — same Coating-dropdown concept as above, different sentence
// patterns seen on marketing-materials categories (Announcement Cards, Sell
// Sheets, Greeting Cards, Event Tickets, ...).
const MATTE_DULL_MIDDLE = /\s*matte\s*\/\s*dull\s+finish\s*/gi
// "with (Satin) AQ" as a MIDDLE modifier before the product name continues
// (e.g. "14PT with AQ Fold Over Business Card Scoring Included") — must be
// stripped in place, not via COATING_WITH's trailing ".*$". "wih" tolerates
// a 4over typo.
// Negative lookahead excludes "AQ on both/front/back ..." — see the sibling
// comment in print/[category]/page.tsx for the full explanation.
const AQ_MIDDLE = /\s*(?:with|wih)\s+(satin\s+)?aq(?!\s*on\s+(the\s+)?(both|front|back)\b)\s*/gi
// Negative lookbehind protects "Raised Spot UV" (a Majestic product-line
// name) from being mistaken for this removable-finish phrase — see the
// sibling comment in print/[category]/page.tsx for the full explanation.
const UV_SIDES_SUFFIX = /[\s,]+(full\s+|spot\s+)?(?<!raised\s(?:spot\s)?)uv\s+on\s+(the\s+)?(front\s+only|\d*-?color\s+side\s*\(?s\)?)\b.*$/i
// The "front only" vs "both sides" placement suffix for Raised Foil/Raised
// Spot UV (the cases UV_SIDES_SUFFIX's lookbehind deliberately skips, since
// "Raised Spot UV" itself is product-identity text, not a removable finish).
// This is a calculator-level placement choice too — see stripDimsOnly's
// comment for why merging these specific siblings is safe.
const RAISED_SIDE_SUFFIX = /\s+on\s+(both\s+sides|front\s+only|the\s+front|the\s+back)\s*$/i
const SCORING_SUFFIX = /,?\s*(flat\s*-\s*no\s+scoring|scoring\s+included)\.?\s*$/i
const VARIABLE_SUFFIX = /\s+with\s+variable\s+numbering\s*$/i
// Envelope industry size codes ("#9", "#10", "#6 3/4", "A2", "A6", "A7", "A9")
// are a redundant synonym for the physical dimension already in the name.
const ENVELOPE_CODE = /\(?#\d+(?:\s+\d+\/\d+)?\)?\s*|\bA\d{1,2}\b\s*/g
// Safety net: a dangling trailing "with" left over when a middle modifier
// (e.g. MATTE_DULL_MIDDLE) was removed but its preceding "with" wasn't.
const TRAILING_WITH = /[\s,]+with\s*$/i
// Boxes & Packaging only: leading "14PT "/"18PT " thickness prefix — see the
// matching comment in print/[category]/page.tsx.
const BOX_THICKNESS_PREFIX = /^\d+\s*pt\s+/i

// Normalizes a physical-dimension string for matching against
// categoryproductslist's size_list "name" field (e.g. "2.75\" X 2.75\" X
// 2.75\"" vs "2.75\" x 2.75\"").
function normalizeSizeText(s: string): string {
  return s.toLowerCase().replace(/[”'']/g, '"').replace(/\s+/g, " ").trim()
}

// Strips an outer "(...)" left unbalanced after an inner code (e.g. the
// envelope size code above) was removed from inside it.
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

// Business Cards only: Round Corner/Oval/Fold Over are Shape/Size variants of
// one product now — kept in sync with the same constant in
// print/[category]/page.tsx (see that file's comment for the full rationale).
const SHAPE_WORDS = /\b(round\s*corners?|ovals?|fold\s*overs?)\b\s*/gi

// Strip ONLY the size/page dimension — used for the size-SIBLING match key
// (same printed product, different dimension only). Keeping Print Method and
// Coating intact here is deliberate: stripping them would make e.g. "18PT
// Cube Box with Akuafoil" and "18PT Cube Box Uncoated" look like the same
// "sibling" at the same size, hiding one of them and breaking the live
// Stock/Coating cascade (sizeVariantMode skips it once siblings are found).
// RAISED_SIDE_SUFFIX/SHAPE_WORDS (Business Cards only) are the deliberate
// exceptions: Majestic business-card lines (Raised Foil/Raised Spot UV) sell
// the "front only" vs "both sides" placement, and Standard/Silk/Suede/...
// sell Round Corner/Oval/Fold Over, as fully separate product_uuids with
// IDENTICAL Stock+Coating (verified — see
// [[duplicate-variants-belong-in-calculator]]), so treating them as sibling
// "sizes" is safe and lets the Size dropdown switch between them.
function stripDimsOnly(desc: string, isBusinessCards = false): string {
  let s = (desc || "")
    .replace(SIZE_DIM, " ")
    .replace(LINEAR_DIM, " ")
    .replace(PAGE_DIM, " ")
    .replace(RAISED_SIDE_SUFFIX, "")
  if (isBusinessCards) {
    s = s
      .replace(SHAPE_WORDS, " ")
      .replace(/\bBC\b/g, "Business Cards")
      .replace(/\bCard\b/g, "Cards")
      .replace(/\bbusiness\s+cards\s+with\s+(\w+)\s+lamination\b/gi, (_m, mat) => `${mat.charAt(0).toUpperCase()}${mat.slice(1)} Laminated Business Cards`)
      .replace(/\blamination\b/gi, "Laminated")
  }
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/\s*-\s*-\s*/g, " - ")
    .replace(/^[\s\-–—]+/, "")
    .replace(/[\s\-–—]+$/, "")
    .trim()
}

// Product name with the variant dimension AND Print Method/Coating wording
// removed (those are calculator dropdowns) — used for the DISPLAY title only.
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
    // see the matching comment in print/[category]/page.tsx.
    .replace(SCORING_SUFFIX, "")
    .replace(VARIABLE_SUFFIX, "")
    .replace(TRAILING_WITH, "")
  if (isBusinessCards) {
    s = s
      .replace(SHAPE_WORDS, " ")
      .replace(/\bBC\b/g, "Business Cards")
      .replace(/\bCard\b/g, "Cards")
      .replace(/\bbusiness\s+cards\s+with\s+(\w+)\s+lamination\b/gi, (_m, mat) => `${mat.charAt(0).toUpperCase()}${mat.slice(1)} Laminated Business Cards`)
      .replace(/\blamination\b/gi, "Laminated")
      // SHAPE_WORDS may have left a dangling "with" — see the matching
      // comment in print/[category]/page.tsx.
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

// The first variant label found, e.g. '11" X 17" X 5"' or '8 Page'. Also
// appends the Raised Foil/Spot UV placement phrase (see RAISED_SIDE_SUFFIX)
// or Shape word (Business Cards only) when present — those siblings share
// the SAME physical size (e.g. both '2" X 3.5"'), so the bare SIZE_DIM match
// alone would tie and collide in the caller's bySize Map, silently dropping
// one variant entirely.
function extractSize(desc: string, isBusinessCards = false): string {
  const side = (desc || "").match(RAISED_SIDE_SUFFIX)
  const shape = isBusinessCards ? (desc || "").match(SHAPE_WORDS) : null
  const suffix = side?.[0] || shape?.[0]
  const suffixLabel = suffix ? " (" + suffix.trim().replace(/\b\w/g, (c) => c.toUpperCase()) + ")" : ""
  const dim = (desc || "").match(SIZE_DIM)
  if (dim) return dim[0].replace(/\s+/g, " ").trim() + suffixLabel
  const pg = (desc || "").match(/\b\d+\s*(?:inside\s+)?pages?\b/i)
  if (pg) return pg[0].replace(/\s+/g, " ").trim() + suffixLabel
  if (suffix) return suffixLabel.slice(2, -1)
  return "Standard"
}

// "calendar"/"saddle"/"stitch" included to stay in sync with the same set in
// print/[category]/page.tsx — see that file's comment for why.
const FILLER_WORDS = new Set(["with", "on", "the", "a", "an", "and", "for", "of", "to", "&", "in", "w", "calendar", "saddle", "stitch"])
// Business Cards only — kept in sync with print/[category]/page.tsx's
// FILLER_WORDS_BC (see that file's comment for why lamination wording needs
// to be ignored here too).
const FILLER_WORDS_BC = new Set([...FILLER_WORDS, "lamination", "laminated", "velvet", "soft", "scoring", "included"])

// Normalized SIBLING key: same printed product (Print Method + Coating kept),
// different size/page only. Used to find the size variants of ONE specific
// product — NOT for display (see stripSize) and NOT for the level-3 card
// dedup in print/[category]/page.tsx (see that file's own groupKey, which
// deliberately strips Print Method/Coating to collapse those into one card).
function groupKey(desc: string, isBusinessCards = false): string {
  const fillers = isBusinessCards ? FILLER_WORDS_BC : FILLER_WORDS
  return stripDimsOnly(desc, isBusinessCards)
    .toLowerCase()
    .replace(/[.,/()]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !fillers.has(w))
    .sort()
    .join(" ")
}

export default async function ProductTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; typeSlug: string }>
  searchParams: Promise<{ uuid?: string }>
}) {
  const { category, typeSlug } = await params
  const { uuid } = await searchParams
  const supabase = await createClient()

  const leaf = SLUG_TO_CATEGORY[category]

  // ---- If uuid is provided, go directly to individual product calculator ----
  if (uuid) {
    const { data: productData } = await supabase
      .from("fourover_products")
      .select("*")
      .eq("product_uuid", uuid)
      .single()

    const product = productData
    if (!product) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <Link href={`/print/${category}`} className="text-[#e42a27] hover:underline">Back to Category</Link>
          </div>
        </div>
      )
    }

    const { data: dbOptionGroups } = await supabase
      .from("fourover_option_groups")
      .select("*")
      .eq("product_uuid", product.product_uuid)
      .order("option_group_order", { ascending: true })

    let optionGroups = dbOptionGroups?.map(g => ({
      product_option_group_uuid: g.option_group_uuid,
      product_option_group_name: g.option_group_name,
      product_option_group_order: g.option_group_order,
      options: g.options || [],
    })) || []

    if (optionGroups.length === 0) {
      const result = await getProductFeed(product.product_uuid)
      if (result.success) {
        const apiProduct = result.data?.entities?.[0] || result.data?.[0] || result.data || {}
        optionGroups = apiProduct.product_option_groups || []
      }
    }

    let productName = product.product_description || "Product"
    const isBoxesPackaging = leaf?.parentSlug === "boxes-packaging"
    // Excludes oval-cards/fold-over-cards — see the matching comment in
    // print/[category]/page.tsx for why.
    const isBusinessCards = leaf?.parentSlug === "business-cards" && category !== "oval-cards" && category !== "fold-over-cards"
    // Signs & Banners: drop the leading size from the title (size is chosen in
    // the calculator), and group all same-stock size variants so the Size
    // dropdown switches between them.
    let sizeProducts: { uuid: string; size: string }[] | undefined
    let initialSizeUuid: string | undefined
    if (leaf?.parentSlug && SIZE_GROUPED_PARENTS.includes(leaf.parentSlug)) {
      const baseName = stripSize(productName, isBusinessCards)
      if (baseName) productName = baseName
      if (isBoxesPackaging) {
        productName = productName.replace(BOX_THICKNESS_PREFIX, "").trim() || productName
      }
      const catUuid = product.category_uuid || leaf?.uuid
      if (catUuid && isBoxesPackaging) {
        // Anchor the configurator's initial Size to THIS product's own
        // dimension (not categoryproductslist's size_list[0], which could
        // belong to a completely different box style sharing this category
        // UUID) so the normal Stock/Coating cascade scopes correctly from
        // the start — see the prop's doc comment for the full rationale.
        const sizeText = normalizeSizeText(extractSize(product.product_description || ""))
        const listResult = await getCategoryProductsList({ category_uuid: catUuid })
        if (listResult.success) {
          const match = listResult.data?.size_list?.find((s) => normalizeSizeText(s.name) === sizeText)
          initialSizeUuid = match?.uuid
        }
      } else if (catUuid && baseName) {
        const { data: siblings } = await supabase
          .from("fourover_products")
          .select("product_uuid, product_description")
          .eq("category_uuid", catUuid)
        const baseKey = groupKey(product.product_description || "", isBusinessCards)
        const variants = (siblings || [])
          .filter((p: any) => groupKey(p.product_description || "", isBusinessCards) === baseKey)
          .map((p: any) => ({ uuid: p.product_uuid as string, size: extractSize(p.product_description || "", isBusinessCards) }))
        const bySize = new Map<string, { uuid: string; size: string }>()
        for (const v of variants) if (!bySize.has(v.size)) bySize.set(v.size, v)
        const list = [...bySize.values()].sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
        if (list.length > 1) sizeProducts = list
      }
    }
    const typeLabel = TYPE_LABELS[typeSlug] || typeSlug.replace(/-/g, " ")

    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-slate-200 py-2 px-4">
          <div className="container mx-auto">
            <p className="text-sm text-slate-500">
              <Link href="/" className="hover:text-[#e42a27]">Home</Link>
              <span className="mx-2">&gt;</span>
              {leaf && <><Link href={`/print/${leaf.parentSlug}`} className="hover:text-[#e42a27]">{leaf.parentLabel}</Link><span className="mx-2">&gt;</span></>}
              {leaf && <><Link href={`/print/${category}`} className="hover:text-[#e42a27]">{leaf.name}</Link><span className="mx-2">&gt;</span></>}
              <span className="text-[#e07b39]">{productName}</span>
            </p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">{productName}</h1>
          <div className="grid lg:grid-cols-[1fr_minmax(0,640px)] gap-8 items-start">
            <div>
              <div className="aspect-square w-full max-w-[360px] bg-slate-100 rounded overflow-hidden border border-slate-200">
                <img
                  src={resolveProductImage(category, productName, leaf?.image || "/images/products/product-default.jpg")}
                  alt={productName}
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Description / Templates (left column, under image) */}
              <div className="mt-6 max-w-[360px]">
                <div className="border-b border-slate-200 flex gap-6">
                  <span className="border-b-2 border-[#e07b39] text-[#e07b39] py-2 text-sm font-medium">Description</span>
                  <span className="text-slate-500 py-2 text-sm">Templates</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mt-3">
                  {productName} — high quality professional printing with premium materials, durable and
                  weather-resistant for both indoor and outdoor use.
                </p>
              </div>
            </div>
            <ProductConfiguratorClient
              categoryUuid={product.category_uuid || leaf?.uuid || ""}
              categorySlug={category}
              productName={productName}
              allowedProductUuids={[product.product_uuid]}
              hiddenGroups={leaf?.parentSlug === "signs-banners" ? SIGNS_HIDDEN_GROUPS : undefined}
              sizeProducts={sizeProducts}
              initialSizeUuid={initialSizeUuid}
            />
          </div>
        </div>
      </div>
    )
  }

  // ---- No uuid: show all products for this TYPE as the size/stock selector ----
  // Fetch all products in the parent category
  const categoryUuid = leaf?.uuid
  if (!categoryUuid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Link href="/print" className="text-[#e42a27] hover:underline">Back to Print Products</Link>
        </div>
      </div>
    )
  }

  let { data: allProducts } = await supabase
    .from("fourover_products")
    .select("product_uuid, product_description, product_code")
    .eq("category_uuid", categoryUuid)

  // If no products in DB, fetch from 4over API
  if (!allProducts || allProducts.length === 0) {
    console.log("[v0] No products in DB for category", categoryUuid, "- fetching from 4over API...")
    const apiResult = await getAllProductsForCategory(categoryUuid)
    if (apiResult.success && apiResult.data?.entities?.length > 0) {
      const apiProducts = apiResult.data.entities
      console.log("[v0] Got", apiProducts.length, "products from 4over API")
      
      // Save to DB for future use
      const productsToInsert = apiProducts.map((p: any) => ({
        product_uuid: p.product_uuid,
        product_description: p.product_description,
        product_code: p.product_code,
        category_uuid: categoryUuid,
        product_name: p.product_description,
        product_data: p,
      }))
      
      await supabase.from("fourover_products").upsert(productsToInsert, { onConflict: "product_uuid" })
      
      allProducts = apiProducts.map((p: any) => ({
        product_uuid: p.product_uuid,
        product_description: p.product_description,
        product_code: p.product_code,
      }))
    }
  }

  // Filter to this type using keyword matching. Classification is ORDER-
  // DEPENDENT (first matching rule in TYPE_KEYWORDS[category] wins) so this
  // stays consistent with classifyProduct() in print/[category]/page.tsx —
  // otherwise a later/broader rule (e.g. a size keyword that's also present
  // in an earlier rule's products, like "5.25\" x 10.5\" ... Natural ...")
  // would double-match products that actually belong to an earlier type.
  const typeRules = Object.entries(TYPE_KEYWORDS[category] || {})
  const typeLabel = TYPE_LABELS[typeSlug] || typeSlug.replace(/-/g, " ")

  function classifyType(description: string): string | null {
    const lower = description.toLowerCase()
    for (const [slug, kws] of typeRules) {
      if (kws.length === 0) return slug // catch-all
      if (kws.some((k) => lower.includes(k))) return slug
    }
    return null // no rule matched and no catch-all — matches old behavior (excluded from every type)
  }

  const matchedProducts = (allProducts || [])
    .filter((p) => (typeRules.length === 0 ? true : classifyType(p.product_description) === typeSlug))
    .sort((a, b) => a.product_description.localeCompare(b.product_description))

  // Get option groups for the FIRST product (they share the same option structure)
  // Size selector will be derived from the list of matched products
  const firstProduct = matchedProducts[0]
  let optionGroups: any[] = []

  if (firstProduct) {
    const { data: dbOptionGroups } = await supabase
      .from("fourover_option_groups")
      .select("*")
      .eq("product_uuid", firstProduct.product_uuid)
      .order("option_group_order", { ascending: true })

    optionGroups = dbOptionGroups?.map(g => ({
      product_option_group_uuid: g.option_group_uuid,
      product_option_group_name: g.option_group_name,
      product_option_group_order: g.option_group_order,
      options: g.options || [],
    })) || []

    if (optionGroups.length === 0) {
      const result = await getProductFeed(firstProduct.product_uuid)
      if (result.success) {
        const apiProduct = result.data?.entities?.[0] || result.data?.[0] || result.data || {}
        optionGroups = apiProduct.product_option_groups || []
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-200 py-2 px-4">
        <div className="container mx-auto">
          <p className="text-sm text-slate-500">
            <Link href="/" className="hover:text-[#e42a27]">Home</Link>
            <span className="mx-2">&gt;</span>
            {leaf && <><Link href={`/print/${leaf.parentSlug}`} className="hover:text-[#e42a27]">{leaf.parentLabel}</Link><span className="mx-2">&gt;</span></>}
            {leaf && <><Link href={`/print/${category}`} className="hover:text-[#e42a27]">{leaf.name}</Link><span className="mx-2">&gt;</span></>}
            <span className="text-[#e07b39]">{typeLabel}</span>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{typeLabel}</h1>

        {matchedProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 mb-4">No products found.</p>
            <Link href={`/print/${category}`} className="text-[#e42a27] hover:underline">Back to {leaf?.name}</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_minmax(0,640px)] gap-8 items-start">
            {/* Left: product image */}
            <div className="aspect-square w-full max-w-[360px] bg-slate-100 rounded overflow-hidden border border-slate-200 sticky top-8">
              <img
                src="/images/products/product-default.jpg"
                alt={typeLabel}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Right: configurator driven live by categoryproductslist + productquote */}
            <div>
              <ProductConfiguratorClient
                categoryUuid={categoryUuid}
                categorySlug={category}
                productName={typeLabel}
                allowedProductUuids={matchedProducts.map((p) => p.product_uuid)}
                hiddenGroups={leaf?.parentSlug === "signs-banners" ? SIGNS_HIDDEN_GROUPS : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
