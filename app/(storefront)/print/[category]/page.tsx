import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getProducts } from "@/lib/4over/client"

// =====================================================================
// COMPLETE category_uuid mapping — all UUIDs from 4over API
// =====================================================================
interface SubCategory {
  name: string
  uuid: string
  slug: string
  image: string
}

const GROUPS: Record<string, { label: string; subcategories: SubCategory[] }> = {
  "business-cards": {
    label: "Business Cards",
    subcategories: [
      { name: "Business Cards", uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", slug: "business-cards-standard", image: "/images/categories/business-cards.jpg" },
      { name: "Raised Foil", uuid: "f30e7cbf-0e9a-4122-a5aa-3330887e4d9f", slug: "raised-foil", image: "/images/categories/business-cards.jpg" },
      { name: "Silk Cards", uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", slug: "silk-cards", image: "/images/categories/business-cards.jpg" },
      { name: "Suede Cards", uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", slug: "suede-cards", image: "/images/categories/business-cards.jpg" },
      { name: "Pearl Cards", uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", slug: "pearl-cards", image: "/images/categories/business-cards.jpg" },
      { name: "Natural Cards", uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", slug: "natural-cards", image: "/images/categories/business-cards.jpg" },
      { name: "Painted Edge Cards", uuid: "b2d0278e-02e6-4861-99ba-951b66f2f1ed", slug: "painted-edge-cards", image: "/images/categories/business-cards.jpg" },
      { name: "Brown Kraft Cards", uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", slug: "brown-kraft-cards", image: "/images/categories/business-cards.jpg" },
      { name: "Akuafoil", uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", slug: "akuafoil", image: "/images/categories/business-cards.jpg" },
      { name: "Linen Uncoated", uuid: "fd917dc0-a11f-4da5-98f4-e1e3de53e71c", slug: "linen-uncoated", image: "/images/categories/business-cards.jpg" },
      { name: "Plastic Cards", uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e", slug: "plastic-cards", image: "/images/categories/business-cards.jpg" },
      { name: "Dual Raised", uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2", slug: "dual-raised", image: "/images/categories/business-cards.jpg" },
      { name: "Raised Spot UV", uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f", slug: "raised-spot-uv", image: "/images/categories/business-cards.jpg" },
      { name: "Trading Cards", uuid: "b45e4b55-a3cd-4897-9506-69ba456189e7", slug: "trading-cards", image: "/images/categories/postcards.jpg" },
      { name: "Foil Worx", uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", slug: "foil-worx", image: "/images/categories/business-cards.jpg" },
    ],
  },
  "marketing-materials": {
    label: "Marketing Materials",
    subcategories: [
      { name: "Flyers and Brochures", uuid: "4edd37b2-c6d5-4938-b6c7-35e09cd7bf76", slug: "flyers-and-brochures", image: "/images/categories/flyers.jpg" },
      { name: "Postcards", uuid: "6f4148e7-3842-4d8b-99f8-6d31c2f71883", slug: "postcards", image: "/images/categories/postcards.jpg" },
      { name: "Presentation Folders", uuid: "d69c91dd-f208-4736-a47b-a0a628d88103", slug: "presentation-folders", image: "/images/categories/flyers.jpg" },
      { name: "Announcement Cards", uuid: "62bdcc8e-316d-4e8f-b59c-c0ac6ee81516", slug: "announcement-cards", image: "/images/categories/greeting-cards.jpg" },
      { name: "Booklets", uuid: "8b570b5b-3ea9-4ea7-b869-dab31bb644d8", slug: "booklets", image: "/images/categories/booklets.jpg" },
      { name: "Calendars", uuid: "2e6a67e3-dd44-46c4-a183-e873b9f691a6", slug: "calendars", image: "/images/categories/calendars.jpg" },
      { name: "Catalogs", uuid: "8977fb0b-5ebc-47e3-bd74-132204c203ea", slug: "catalogs", image: "/images/categories/booklets.jpg" },
      { name: "Counter Cards", uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3", slug: "counter-cards", image: "/images/categories/postcards.jpg" },
      { name: "Door Hangers", uuid: "5cacc269-e6a8-472d-91d6-792c4584cae8", slug: "door-hangers", image: "/images/categories/door-hangers.jpg" },
      { name: "Envelopes", uuid: "c908d53e-fb6d-427d-8d0b-61bba94b63d5", slug: "envelopes", image: "/images/categories/envelopes.jpg" },
      { name: "Event Tickets", uuid: "395c3c6f-a90b-4c0d-beb5-887313108d05", slug: "event-tickets", image: "/images/categories/event-tickets.jpg" },
      { name: "Greeting Cards", uuid: "85ded4d7-98f4-4ee4-9d83-79ad7b722ea8", slug: "greeting-cards", image: "/images/categories/greeting-cards.jpg" },
      { name: "Hang Tags", uuid: "56c6dd85-d838-4ca0-9f9d-e3a63e594f98", slug: "hang-tags", image: "/images/categories/door-hangers.jpg" },
      { name: "Letterheads", uuid: "5502b7a1-cffc-4069-bc2e-7171c86ebdb6", slug: "letterheads", image: "/images/categories/notepads.jpg" },
      { name: "Magnets", uuid: "19a9a6c8-a8c8-4d0c-b4fc-8a231c1bdd53", slug: "magnets", image: "/images/categories/magnets.jpg" },
      { name: "Menus", uuid: "059ea2cb-f0c5-4853-9724-a8815a2f6b48", slug: "menus", image: "/images/categories/menus.jpg" },
      { name: "NCR Forms", uuid: "7509c656-ba8a-43d7-9e8f-afb30455ff11", slug: "ncr-forms", image: "/images/categories/notepads.jpg" },
      { name: "Notepads", uuid: "9c3a2f3e-3ce0-4eb0-ae70-cd2a453f1e37", slug: "notepads", image: "/images/categories/notepads.jpg" },
      { name: "Posters", uuid: "e9db3435-dde9-442b-9957-2221fa4611c5", slug: "posters", image: "/images/categories/posters.jpg" },
      { name: "Rack Cards", uuid: "fafbcc3a-6196-479f-b589-c510f07372ef", slug: "rack-cards", image: "/images/categories/rack-cards.jpg" },
      { name: "Sell Sheets", uuid: "950d2eb7-d1ac-4a3c-b1b0-8c407ce635ed", slug: "sell-sheets", image: "/images/categories/sell-sheets.jpg" },
      { name: "Table Tent Cards", uuid: "e2aa8867-357b-424c-b11d-11125e597cb2", slug: "table-tent-cards", image: "/images/categories/table-tent.jpg" },
      { name: "Tear Off Cards", uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", slug: "tear-off-cards", image: "/images/categories/postcards.jpg" },
      { name: "EDDM", uuid: "50a1f1a2-3567-4618-a703-074471472e8d", slug: "eddm", image: "/images/categories/postcards.jpg" },
      { name: "Header Cards", uuid: "a842ec1b-280d-4e13-aa74-18a2be824737", slug: "header-cards", image: "/images/categories/postcards.jpg" },
    ],
  },
  "signs-banners": {
    label: "Signs & Banners",
    // Structure mirrors the fourprintshop Signs & Banners page, mapped to the
    // real 4over API categories. (Floor Graphics has no 4over category, so it's
    // omitted; 4over has a single "Banners with Stand" category for both indoor
    // and outdoor stands.)
    subcategories: [
      { name: "Table Covers", uuid: "5f53c3d3-962a-4b18-8db8-a6a01ec31130", slug: "table-covers", image: "/images/categories/posters.jpg" },
      { name: "Rigid Signs", uuid: "9c475aac-62ea-4538-96e2-ab7e2ccb0a45", slug: "rigid-signs", image: "/images/categories/posters.jpg" },
      { name: "Wall Arts", uuid: "b83112e8-ab2f-4f80-82ea-752c0a7d4f13", slug: "wall-arts", image: "/images/categories/posters.jpg" },
      { name: "Outdoor Banners", uuid: "d9181764-0579-402f-bfc8-4ff65408886e", slug: "outdoor-banners", image: "/images/categories/posters.jpg" },
      { name: "Indoor Banners", uuid: "35170807-4aa5-4d13-986f-c0e266a5d685", slug: "indoor-banners", image: "/images/categories/posters.jpg" },
      { name: "Flags", uuid: "04072d2d-8cc5-472f-bc1f-9243382992dc", slug: "flags", image: "/images/categories/posters.jpg" },
      { name: "Window Graphics", uuid: "2d084783-38ef-4a1c-a5fb-7ec8e78700cd", slug: "window-graphics", image: "/images/categories/posters.jpg" },
      { name: "Wall Decals", uuid: "4bf65303-b799-4f45-b3d9-6cc105eb78a4", slug: "wall-decals", image: "/images/categories/posters.jpg" },
      { name: "Vehicle Magnets", uuid: "5b0ab4cc-8ab1-4377-b42d-d3db500a9e44", slug: "vehicle-magnets", image: "/images/categories/magnets.jpg" },
      { name: "Banner Stands", uuid: "a98dc51f-d371-479a-8ebb-c65749065971", slug: "banner-stands", image: "/images/categories/posters.jpg" },
      { name: "Displays", uuid: "cbef836a-a2f0-47a0-8cc7-67dee8a4b0ab", slug: "displays", image: "/images/categories/posters.jpg" },
    ],
  },
  "boxes-packaging": {
    label: "Boxes & Packaging",
    subcategories: [
      { name: "Packaging", uuid: "c11d8936-67ad-4b59-a48d-1683f42f055c", slug: "packaging", image: "/images/categories/notepads.jpg" },
      { name: "Custom Boxes", uuid: "776a6fc9-b3fe-4ede-82e9-bbfccd51c293", slug: "custom-boxes", image: "/images/categories/notepads.jpg" },
    ],
  },
  "roll-labels-stickers": {
    label: "Roll Labels & Stickers",
    subcategories: [
      { name: "Roll Labels", uuid: "a2b13bce-0643-41ce-9a03-e21f9a92d7d4", slug: "roll-labels", image: "/images/categories/postcards.jpg" },
      { name: "Stickers", uuid: "7381a85e-5e48-4673-aa67-862dd6553ef0", slug: "stickers", image: "/images/categories/postcards.jpg" },
      { name: "Adhesive Vinyl", uuid: "4bf65303-b799-4f45-b3d9-6cc105eb78a4", slug: "adhesive-vinyl", image: "/images/categories/postcards.jpg" },
    ],
  },
  "promo-products": {
    label: "Promo Products",
    subcategories: [
      { name: "T-Shirts", uuid: "faf66745-6fc0-493b-b8b0-f5f34acb3150", slug: "t-shirts", image: "/images/categories/magnets.jpg" },
      { name: "Tote Bags", uuid: "d94b61b1-11a9-44bc-9806-eb67fab2fb2f", slug: "tote-bags", image: "/images/categories/magnets.jpg" },
      { name: "Mugs", uuid: "bfd5e7d7-29e0-4508-bcc4-17ce5115c852", slug: "mugs", image: "/images/categories/magnets.jpg" },
      { name: "Buttons", uuid: "6a5ef04a-7143-444b-b4ed-f623204e7168", slug: "buttons", image: "/images/categories/magnets.jpg" },
    ],
  },
}

// Build flat lookup: slug -> { uuid, name, parentSlug, parentLabel, image }
const SLUG_TO_CATEGORY: Record<string, { uuid: string; name: string; parentSlug: string; parentLabel: string; image: string }> = {}
for (const [groupSlug, group] of Object.entries(GROUPS)) {
  for (const sub of group.subcategories) {
    SLUG_TO_CATEGORY[sub.slug] = {
      uuid: sub.uuid,
      name: sub.name,
      parentSlug: groupSlug,
      parentLabel: group.label,
      image: sub.image,
    }
  }
}

// =====================================================================
// PRODUCT TYPE GROUPING RULES per spec
// Each rule: { label, slug, keywords[] } — match ANY keyword in description
// =====================================================================
interface TypeRule { label: string; slug: string; keywords: string[] }

const TYPE_RULES: Record<string, TypeRule[]> = {
  "flyers-and-brochures": [
    { label: "All Inclusive Flyers and Brochures", slug: "all-inclusive-flyers-and-brochures", keywords: ["all inclusive", "all-inclusive"] },
    { label: "EndurACE Flyers and Brochures", slug: "endurace-flyers-and-brochures", keywords: ["endurace"] },
    { label: "Flat Flyers and Brochures", slug: "flat-flyers-and-brochures", keywords: ["flat flyer", "flat brochure"] },
    { label: "Half-Fold Brochures", slug: "half-fold-brochures", keywords: ["half-fold", "half fold"] },
    { label: "Specialty Folds Brochures", slug: "specialty-folds-brochures", keywords: ["specialty fold", "specialty folds"] },
    { label: "Tearoff Flyers", slug: "tearoff-flyers", keywords: ["tear", "tearoff", "tear-off"] },
    { label: "Tri-Fold Brochures", slug: "tri-fold-brochures", keywords: ["tri-fold", "tri fold"] },
    { label: "Z-Fold Brochures", slug: "z-fold-brochures", keywords: ["z-fold", "z fold"] },
  ],
  "postcards": [
    { label: "All Inclusive Postcards", slug: "all-inclusive-postcards", keywords: ["all inclusive", "all-inclusive"] },
    { label: "EDDM Postcards", slug: "eddm-postcards", keywords: ["eddm"] },
    { label: "Raised Foil Postcards", slug: "raised-foil-postcards", keywords: ["raised foil", "dual raised", "raised spot"] },
    { label: "Standard Postcards", slug: "standard-postcards", keywords: [] }, // catch-all
  ],
  "business-cards-standard": [
    { label: "Round Corner Business Cards", slug: "round-corner-business-cards", keywords: ["round corner"] },
    { label: "Folded Business Cards", slug: "folded-business-cards", keywords: ["folded"] },
    { label: "Square Business Cards", slug: "square-business-cards", keywords: ["square"] },
    { label: "Standard Business Cards", slug: "standard-business-cards", keywords: [] }, // catch-all
  ],
  "presentation-folders": [
    { label: '9" x 12" Presentation Folder', slug: "9x12-presentation-folder", keywords: ["9\" x 12\"", "9x12", "9\" x12\"", "9\"x12"] },
    { label: '6" x 9" Presentation Folder', slug: "6x9-presentation-folder", keywords: ["6\" x 9\"", "6x9", "6\" x9\""] },
    { label: '5.25" x 10.5" Presentation Folder', slug: "5x10-presentation-folder", keywords: ["5.25", "5.25\"", "10.5"] },
    { label: '9" x 14.5" Presentation Folder', slug: "9x14-presentation-folder", keywords: ["9\" x 14.5\"", "9x14", "14.5"] },
    { label: "Glue-less Presentation Folder", slug: "glueless-presentation-folder", keywords: ["glue-less", "glueless", "glue less"] },
    { label: "Specialty Presentation Folders", slug: "specialty-presentation-folder", keywords: [] }, // catch-all for Silk, Natural, Pearl, Suede, Akuafoil
  ],
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

export default async function PrintCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const supabase = await createClient()

  // ============ GROUP PAGE (e.g. /print/marketing-materials) ============
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

  // Fetch ALL products in this category by UUID from DB first
  let { data: products } = await supabase
    .from("fourover_products")
    .select("product_uuid, product_description, product_code")
    .eq("category_uuid", leaf.uuid)

  // If no products in DB, fetch from 4over API and save to DB
  if (!products || products.length === 0) {
    console.log("[v0] No products in DB for", leaf.name, "- fetching from 4over API...")
    const apiResult = await getProducts(leaf.uuid, 200)
    if (apiResult.success && apiResult.data?.entities?.length > 0) {
      const apiProducts = apiResult.data.entities
      console.log("[v0] Got", apiProducts.length, "products from 4over API for", leaf.name)
      
      // Save to DB for future use
      const productsToInsert = apiProducts.map((p: any) => ({
        product_uuid: p.product_uuid,
        product_description: p.product_description,
        product_code: p.product_code,
        category_uuid: leaf.uuid,
        product_name: p.product_description,
        product_data: p,
      }))
      
      await supabase.from("fourover_products").upsert(productsToInsert, { onConflict: "product_uuid" })
      
      // Use the API products for this request
      products = apiProducts.map((p: any) => ({
        product_uuid: p.product_uuid,
        product_description: p.product_description,
        product_code: p.product_code,
      }))
    }
  }

  const productList = products || []

  // ---- If we have type grouping rules, show TYPE CARDS (level 3) ----
  const hasTypeRules = !!TYPE_RULES[category]

  if (hasTypeRules && productList.length > 0) {
    // Group products by type
    const typeMap = new Map<string, { rule: TypeRule; products: typeof productList; image: string }>()

    for (const product of productList) {
      const rule = classifyProduct(product.product_description, category)
      if (!rule) continue
      if (!typeMap.has(rule.slug)) {
        typeMap.set(rule.slug, { rule, products: [], image: leaf.image })
      }
      typeMap.get(rule.slug)!.products.push(product)
    }

    // Sort by rule order
    const rules = TYPE_RULES[category]
    const sortedTypes = rules
      .map(r => typeMap.get(r.slug))
      .filter(Boolean) as { rule: TypeRule; products: typeof productList; image: string }[]

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

        {productList.length > 0 ? (
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
              {productList.map((product) => {
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
                        <img src={leaf.image} alt={product.product_description} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
