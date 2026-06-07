import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getProductFeed, getProducts } from "@/lib/4over/client"
import { ProductConfiguratorClient } from "@/components/print/product-configurator-client"

// Same SLUG_TO_CATEGORY and TYPE_RULES as parent — imported via inline constants
// (Next.js doesn't allow importing from sibling page files, so we duplicate the lookup data)

const SLUG_TO_CATEGORY: Record<string, { uuid: string; name: string; parentSlug: string; parentLabel: string; image: string }> = {
  "business-cards-standard": { uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", name: "Business Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "raised-foil": { uuid: "f30e7cbf-0e9a-4122-a5aa-3330887e4d9f", name: "Raised Foil", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "silk-cards": { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", name: "Silk Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "suede-cards": { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", name: "Suede Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "pearl-cards": { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", name: "Pearl Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "natural-cards": { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", name: "Natural Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "painted-edge-cards": { uuid: "b2d0278e-02e6-4861-99ba-951b66f2f1ed", name: "Painted Edge Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "brown-kraft-cards": { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", name: "Brown Kraft Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "akuafoil": { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", name: "Akuafoil", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "linen-uncoated": { uuid: "fd917dc0-a11f-4da5-98f4-e1e3de53e71c", name: "Linen Uncoated", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "plastic-cards": { uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e", name: "Plastic Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "dual-raised": { uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2", name: "Dual Raised", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "raised-spot-uv": { uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f", name: "Raised Spot UV", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "trading-cards": { uuid: "b45e4b55-a3cd-4897-9506-69ba456189e7", name: "Trading Cards", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/postcards.jpg" },
  "foil-worx": { uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", name: "Foil Worx", parentSlug: "business-cards", parentLabel: "Business Cards", image: "/images/categories/business-cards.jpg" },
  "flyers-and-brochures": { uuid: "4edd37b2-c6d5-4938-b6c7-35e09cd7bf76", name: "Flyers and Brochures", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/flyers.jpg" },
  "postcards": { uuid: "6f4148e7-3842-4d8b-99f8-6d31c2f71883", name: "Postcards", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/postcards.jpg" },
  "presentation-folders": { uuid: "d69c91dd-f208-4736-a47b-a0a628d88103", name: "Presentation Folders", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/flyers.jpg" },
  "announcement-cards": { uuid: "62bdcc8e-316d-4e8f-b59c-c0ac6ee81516", name: "Announcement Cards", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/greeting-cards.jpg" },
  "booklets": { uuid: "8b570b5b-3ea9-4ea7-b869-dab31bb644d8", name: "Booklets", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/booklets.jpg" },
  "calendars": { uuid: "2e6a67e3-dd44-46c4-a183-e873b9f691a6", name: "Calendars", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/calendars.jpg" },
  "catalogs": { uuid: "8977fb0b-5ebc-47e3-bd74-132204c203ea", name: "Catalogs", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/booklets.jpg" },
  "counter-cards": { uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3", name: "Counter Cards", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/postcards.jpg" },
  "door-hangers": { uuid: "5cacc269-e6a8-472d-91d6-792c4584cae8", name: "Door Hangers", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/door-hangers.jpg" },
  "envelopes": { uuid: "c908d53e-fb6d-427d-8d0b-61bba94b63d5", name: "Envelopes", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/envelopes.jpg" },
  "event-tickets": { uuid: "395c3c6f-a90b-4c0d-beb5-887313108d05", name: "Event Tickets", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/event-tickets.jpg" },
  "greeting-cards": { uuid: "85ded4d7-98f4-4ee4-9d83-79ad7b722ea8", name: "Greeting Cards", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/greeting-cards.jpg" },
  "hang-tags": { uuid: "56c6dd85-d838-4ca0-9f9d-e3a63e594f98", name: "Hang Tags", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/door-hangers.jpg" },
  "letterheads": { uuid: "5502b7a1-cffc-4069-bc2e-7171c86ebdb6", name: "Letterheads", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/notepads.jpg" },
  "magnets": { uuid: "19a9a6c8-a8c8-4d0c-b4fc-8a231c1bdd53", name: "Magnets", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/magnets.jpg" },
  "menus": { uuid: "059ea2cb-f0c5-4853-9724-a8815a2f6b48", name: "Menus", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/menus.jpg" },
  "ncr-forms": { uuid: "7509c656-ba8a-43d7-9e8f-afb30455ff11", name: "NCR Forms", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/notepads.jpg" },
  "notepads": { uuid: "9c3a2f3e-3ce0-4eb0-ae70-cd2a453f1e37", name: "Notepads", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/notepads.jpg" },
  "posters": { uuid: "e9db3435-dde9-442b-9957-2221fa4611c5", name: "Posters", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/posters.jpg" },
  "rack-cards": { uuid: "fafbcc3a-6196-479f-b589-c510f07372ef", name: "Rack Cards", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/rack-cards.jpg" },
  "sell-sheets": { uuid: "950d2eb7-d1ac-4a3c-b1b0-8c407ce635ed", name: "Sell Sheets", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/sell-sheets.jpg" },
  "table-tent-cards": { uuid: "e2aa8867-357b-424c-b11d-11125e597cb2", name: "Table Tent Cards", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/table-tent.jpg" },
  "tear-off-cards": { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", name: "Tear Off Cards", parentSlug: "marketing-materials", parentLabel: "Marketing Materials", image: "/images/categories/postcards.jpg" },
  "outdoor-banners": { uuid: "d9181764-0579-402f-bfc8-4ff65408886e", name: "Outdoor Banners", parentSlug: "signs-banners", parentLabel: "Signs & Banners", image: "/images/categories/posters.jpg" },
  "acrylic-signs": { uuid: "7ad1aae9-741d-40f5-b3dc-6d75524878ce", name: "Acrylic Signs", parentSlug: "signs-banners", parentLabel: "Signs & Banners", image: "/images/categories/posters.jpg" },
  "large-posters": { uuid: "393c5a2d-8be0-4134-9161-aa35fdc60685", name: "Large Posters", parentSlug: "signs-banners", parentLabel: "Signs & Banners", image: "/images/categories/posters.jpg" },
  "sidewalk-signs": { uuid: "900a16a6-7836-4546-b8c5-3b1678c0287e", name: "Sidewalk Signs", parentSlug: "signs-banners", parentLabel: "Signs & Banners", image: "/images/categories/posters.jpg" },
  "packaging": { uuid: "c11d8936-67ad-4b59-a48d-1683f42f055c", name: "Packaging", parentSlug: "boxes-packaging", parentLabel: "Boxes & Packaging", image: "/images/categories/notepads.jpg" },
}

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
  "business-cards-standard": {
    "round-corner-business-cards": ["round corner"],
    "folded-business-cards": ["folded"],
    "square-business-cards": ["square"],
    "standard-business-cards": [], // catch-all
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
  "round-corner-business-cards": "Round Corner Business Cards",
  "folded-business-cards": "Folded Business Cards",
  "square-business-cards": "Square Business Cards",
  "standard-business-cards": "Standard Business Cards",
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

    const productName = product.product_description || "Product"
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
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">{productName}</h1>
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
            <div className="aspect-square bg-slate-100 rounded flex items-center justify-center">
              <img src={leaf?.image || "/images/products/product-default.jpg"} alt={productName} className="w-full h-full object-cover rounded" />
            </div>
            <ProductConfiguratorClient
              categoryUuid={leaf?.uuid || ""}
              categorySlug={category}
              productName={productName}
              allowedProductUuids={[product.product_uuid]}
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
    const apiResult = await getProducts(categoryUuid, 200)
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

  // Filter to this type using keyword matching
  const keywords = TYPE_KEYWORDS[category]?.[typeSlug] || []
  const typeLabel = TYPE_LABELS[typeSlug] || typeSlug.replace(/-/g, " ")

  const matchedProducts = (allProducts || []).filter(p => {
    const lower = p.product_description.toLowerCase()
    if (keywords.length === 0) return true // catch-all
    return keywords.some(k => lower.includes(k))
  }).sort((a, b) => a.product_description.localeCompare(b.product_description))

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

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{typeLabel}</h1>

        {matchedProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 mb-4">No products found.</p>
            <Link href={`/print/${category}`} className="text-[#e42a27] hover:underline">Back to {leaf?.name}</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
            {/* Left: product image */}
            <div className="aspect-square bg-slate-100 rounded overflow-hidden sticky top-8">
              <img
                src={leaf?.image || "/images/products/product-default.jpg"}
                alt={typeLabel}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right: configurator driven live by categoryproductslist + productquote */}
            <div>
              <ProductConfiguratorClient
                categoryUuid={categoryUuid}
                categorySlug={category}
                productName={typeLabel}
                allowedProductUuids={matchedProducts.map((p) => p.product_uuid)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
