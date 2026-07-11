// Single source of truth for the print storefront's category structure.
// Both app/(storefront)/print/[category]/page.tsx (level 3 listing) and
// app/(storefront)/print/[category]/[typeSlug]/page.tsx (level 4 product page)
// import this instead of keeping their own duplicate copy — a prior duplicate
// map caused several subcategories (custom-boxes, roll-labels, stickers,
// adhesive-vinyl, t-shirts, tote-bags, mugs, buttons, eddm, header-cards) to
// silently skip title cleanup and breadcrumb on the product page.

export interface SubCategory {
  name: string
  uuid: string
  slug: string
  image: string
  // Some 4over categories (e.g. EndurACE, Akuafoil-style "brand" stocks) are
  // shared across multiple product types (Business Cards, Menus, Postcards,
  // Door Hangers, ...) under ONE category_uuid. When set, only products whose
  // description matches ALL of these keyword(s) are shown on this
  // subcategory's page. A single string is shorthand for [string].
  keyword?: string | string[]
  // When set, the product configurator defaults to this size instead of the
  // first alphabetical size from the API (e.g. "2\" x 3.5\"" for Standard BC).
  preferredSizeText?: string
}

// Matches a product description against one keyword: a plain substring match,
// except "business card" ALSO matches the standalone abbreviation "BC" (many
// 4over descriptions read "... Round Corner BC with ..." instead of spelling
// out "Business Cards").
function matchesKeyword(description: string, keyword: string): boolean {
  const lower = description.toLowerCase()
  if (lower.includes(keyword)) return true
  if (keyword === "business card" && /\bbc\b/i.test(description)) return true
  return false
}

// A product matches a subcategory's `keyword` only if it matches EVERY
// keyword listed (e.g. ["linen", "business card"] excludes "Linen Social
// Cards", which contains "linen" but not "business card").
export function matchesAllKeywords(description: string, keyword: string | string[]): boolean {
  const keywords = Array.isArray(keyword) ? keyword : [keyword]
  return keywords.every((k) => matchesKeyword(description, k))
}

export const GROUPS: Record<string, { label: string; subcategories: SubCategory[] }> = {
  "business-cards": {
    label: "Business Cards",
    subcategories: [
      // Named "Standard" (not bare "Business Cards") so the breadcrumb/grid
      // card doesn't repeat the parent's own name — Boss Dwayne flagged
      // "Business Cards > Business Cards" as looking like an accidental
      // duplicate. Same naming pattern as Standard Postcards/Presentation
      // Folder/Flat Flyers and Brochures elsewhere in this catalog.
      { name: "Standard Business Cards", uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", slug: "business-cards-standard", image: "/images/cat/business-cards/standard.jpg", preferredSizeText: '2" x 3.5"' },
      { name: "Raised Foil", uuid: "f30e7cbf-0e9a-4122-a5aa-3330887e4d9f", slug: "raised-foil", image: "/images/cat/business-cards/raised-foil.jpg", keyword: "business card" },
      { name: "Silk Cards", uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", slug: "silk-cards", image: "/images/cat/business-cards/silk.jpg", keyword: "business card" },
      { name: "Suede Cards", uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", slug: "suede-cards", image: "/images/cat/business-cards/suede.jpg", keyword: "business card" },
      { name: "Pearl Cards", uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", slug: "pearl-cards", image: "/images/cat/business-cards/pearl.jpg", keyword: "business card" },
      { name: "Natural Cards", uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", slug: "natural-cards", image: "/images/cat/business-cards/natural.jpg", keyword: "business card" },
      { name: "Painted Edge Cards", uuid: "b2d0278e-02e6-4861-99ba-951b66f2f1ed", slug: "painted-edge-cards", image: "/images/cat/business-cards/painted-edge.jpg", keyword: "business card" },
      { name: "Brown Kraft Cards", uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", slug: "brown-kraft-cards", image: "/images/cat/business-cards/brown-kraft.jpg", keyword: "business card" },
      { name: "Akuafoil", uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", slug: "akuafoil", image: "/images/cat/business-cards/akuafoil.jpg", keyword: "business card" },
      // "Linen Uncoated" business cards live INSIDE the generic Business Cards
      // (08a9625a) category, not the separate "Linen Uncoated" 4over category
      // (which turned out to contain only Greeting Cards — 0 business cards).
      { name: "Linen Uncoated", uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", slug: "linen-uncoated", image: "/images/cat/business-cards/linen-uncoated.jpg", keyword: ["linen", "business card"] },
      { name: "Plastic Cards", uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e", slug: "plastic-cards", image: "/images/cat/business-cards/plastic.jpg", keyword: "business card" },
      { name: "Dual Raised", uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2", slug: "dual-raised", image: "/images/cat/business-cards/dual-raised.png", keyword: "business card" },
      { name: "Raised Spot UV", uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f", slug: "raised-spot-uv", image: "/images/cat/business-cards/raised-spot-uv.jpg", keyword: "business card" },
      { name: "Foil Worx", uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", slug: "foil-worx", image: "/images/cat/business-cards/foil-worx.jpg", keyword: "business card" },
      { name: "EndurACE", uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", slug: "endurace-cards", image: "/images/cat/business-cards/endurace.jpg", keyword: "business card" },
      // Leaf/Oval/Fold-over are also nested inside the generic Business Cards
      // category (own product lines, no dedicated 4over category UUID).
      { name: "Leaf", uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", slug: "leaf-cards", image: "/images/cat/business-cards/leaf.jpg", keyword: "leaf" },
      { name: "Oval", uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", slug: "oval-cards", image: "/images/cat/business-cards/oval.jpg", keyword: "oval" },
      { name: "Fold-over", uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", slug: "fold-over-cards", image: "/images/cat/business-cards/fold-over.jpg", keyword: "fold over" },
    ],
  },
  "marketing-materials": {
    // 2026-07-10: renamed display label from "Marketing Materials" to
    // "Marketing Products" to match 4over.com's own top-nav wording exactly
    // (confirmed live) -- slug kept for URL stability.
    label: "Marketing Products",
    subcategories: [
      { name: "Flyers and Brochures", uuid: "4edd37b2-c6d5-4938-b6c7-35e09cd7bf76", slug: "flyers-and-brochures", image: "/images/cat/flyers-and-brochures.jpg" },
      { name: "Trading Cards", uuid: "b45e4b55-a3cd-4897-9506-69ba456189e7", slug: "trading-cards", image: "/images/categories/postcards.jpg" },
      { name: "Postcards", uuid: "6f4148e7-3842-4d8b-99f8-6d31c2f71883", slug: "postcards", image: "/images/cat/postcards.jpg" },
      { name: "Presentation Folders", uuid: "d69c91dd-f208-4736-a47b-a0a628d88103", slug: "presentation-folders", image: "/images/cat/presentation-folders.jpg" },
      // fourprintshop's literal /marketing-material/announcement-cards/products/
      // page is a FLAT grid of 10 product-type cards (Standard, Round Corner,
      // Akuafoil, Brown Kraft, Magnet, Natural, Painted Edge, Pearl, Silk,
      // Suede), all under this ONE subcategory — not 8 separate subcategory
      // entries (that was tried and reverted; see EXTRA_PRODUCT_SOURCES in
      // print/[category]/page.tsx, which pulls the other 7 materials' own
      // "brand stock" category UUIDs — the same ones used by their Business
      // Cards counterparts — into THIS listing instead).
      { name: "Announcement Cards", uuid: "62bdcc8e-316d-4e8f-b59c-c0ac6ee81516", slug: "announcement-cards", image: "/images/cat/announcement-cards.jpg" },
      { name: "Booklets", uuid: "8b570b5b-3ea9-4ea7-b869-dab31bb644d8", slug: "booklets", image: "/images/cat/booklets.jpg" },
      { name: "Calendars", uuid: "2e6a67e3-dd44-46c4-a183-e873b9f691a6", slug: "calendars", image: "/images/cat/calendars.jpg" },
      { name: "Catalogs", uuid: "8977fb0b-5ebc-47e3-bd74-132204c203ea", slug: "catalogs", image: "/images/cat/catalogs.jpg" },
      { name: "Counter Cards", uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3", slug: "counter-cards", image: "/images/cat/counter-cards.jpg" },
      { name: "Door Hangers", uuid: "5cacc269-e6a8-472d-91d6-792c4584cae8", slug: "door-hangers", image: "/images/cat/door-hangers.jpg" },
      { name: "Envelopes", uuid: "c908d53e-fb6d-427d-8d0b-61bba94b63d5", slug: "envelopes", image: "/images/cat/envelopes.jpg" },
      { name: "Event Tickets", uuid: "395c3c6f-a90b-4c0d-beb5-887313108d05", slug: "event-tickets", image: "/images/cat/event-tickets.jpg" },
      { name: "Greeting Cards", uuid: "85ded4d7-98f4-4ee4-9d83-79ad7b722ea8", slug: "greeting-cards", image: "/images/cat/greeting-cards.jpg" },
      { name: "Hang Tags", uuid: "56c6dd85-d838-4ca0-9f9d-e3a63e594f98", slug: "hang-tags", image: "/images/cat/hang-tags.jpg" },
      { name: "Letterheads", uuid: "5502b7a1-cffc-4069-bc2e-7171c86ebdb6", slug: "letterheads", image: "/images/cat/letterheads.jpg" },
      { name: "Magnets", uuid: "19a9a6c8-a8c8-4d0c-b4fc-8a231c1bdd53", slug: "magnets", image: "/images/cat/magnets.jpg" },
      { name: "Menus", uuid: "059ea2cb-f0c5-4853-9724-a8815a2f6b48", slug: "menus", image: "/images/cat/menus.jpg" },
      { name: "NCR Forms", uuid: "7509c656-ba8a-43d7-9e8f-afb30455ff11", slug: "ncr-forms", image: "/images/cat/ncr-forms.jpg" },
      { name: "Notepads", uuid: "9c3a2f3e-3ce0-4eb0-ae70-cd2a453f1e37", slug: "notepads", image: "/images/cat/notepads.jpg" },
      { name: "Posters", uuid: "e9db3435-dde9-442b-9957-2221fa4611c5", slug: "posters", image: "/images/cat/posters.jpg" },
      { name: "Rack Cards", uuid: "fafbcc3a-6196-479f-b589-c510f07372ef", slug: "rack-cards", image: "/images/cat/rack-cards.jpg" },
      { name: "Sell Sheets", uuid: "950d2eb7-d1ac-4a3c-b1b0-8c407ce635ed", slug: "sell-sheets", image: "/images/cat/sell-sheets.jpg" },
      // 2026-07-10: was completely missing -- 4over.com's own /marketing-
      // products listing shows it with 71 real products, confirmed via
      // direct DB query. Has no dedicated 4over category UUID of its own --
      // "Social Cards" text is scoped inside the SAME shared Business Cards
      // uuid (08a9625a) as Leaf/Oval/Fold-over above, plus the 7 brand-
      // material uuids (Foil Worx/Brown Kraft/Pearl/Akuafoil/Plastic/Suede/
      // Silk) merged in via EXTRA_PRODUCT_SOURCES, same pattern as
      // Announcement Cards.
      { name: "Social Cards", uuid: "08a9625a-4152-40cf-9007-b2bbb349efec", slug: "social-cards", image: "/images/cat/social-cards.jpg", keyword: "social card" },
      { name: "Table Tent Cards", uuid: "e2aa8867-357b-424c-b11d-11125e597cb2", slug: "table-tent-cards", image: "/images/cat/table-tent-cards.jpg" },
      { name: "Tear Off Cards", uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", slug: "tear-off-cards", image: "/images/cat/postcards.jpg" },
      // 2026-07-09: renamed from "EDDM" to match 4over.com's own top-level nav
      // label "Direct Mail Services" (a separate primary category there,
      // distinct from Marketing Products) -- see storefront-header.tsx's new
      // nav link pointing here.
      { name: "Direct Mail Services", uuid: "50a1f1a2-3567-4618-a703-074471472e8d", slug: "eddm", image: "/images/cat/postcards.jpg" },
      { name: "Header Cards", uuid: "a842ec1b-280d-4e13-aa74-18a2be824737", slug: "header-cards", image: "/images/cat/postcards.jpg" },
    ],
  },
  "signs-banners": {
    label: "Signs & Banners",
    // Structure mirrors the fourprintshop Signs & Banners page, mapped to the
    // real 4over API categories. 4over has a single "Banners with Stand"
    // category for both indoor and outdoor stands.
    subcategories: [
      { name: "Table Covers", uuid: "5f53c3d3-962a-4b18-8db8-a6a01ec31130", slug: "table-covers", image: "/images/signs/table-covers.jpg" },
      { name: "Rigid Signs", uuid: "9c475aac-62ea-4538-96e2-ab7e2ccb0a45", slug: "rigid-signs", image: "/images/signs/rigid-signs.jpg" },
      { name: "Wall Art", uuid: "b83112e8-ab2f-4f80-82ea-752c0a7d4f13", slug: "wall-arts", image: "/images/signs/wall-arts.jpg" },
      { name: "Outdoor Banners", uuid: "d9181764-0579-402f-bfc8-4ff65408886e", slug: "outdoor-banners", image: "/images/signs/outdoor-banners.jpg" },
      { name: "Indoor Banners", uuid: "35170807-4aa5-4d13-986f-c0e266a5d685", slug: "indoor-banners", image: "/images/signs/indoor-banners.jpg" },
      { name: "Flags", uuid: "04072d2d-8cc5-472f-bc1f-9243382992dc", slug: "flags", image: "/images/signs/flags.jpg" },
      // 4over's "2d084783..." Window Graphics category is a near-empty
      // subset containing ONLY the "8mil Clear" stock (18 entries, all the
      // same product) — its sibling "ae3afb44..." category (4over's own
      // description for it: "7mil Window Cling") is the REAL data: same
      // "8MILCLEAR" stock_uuid PLUS White/Perforated/Opaque, confirmed
      // exact stock_uuid matches against fourprintshop's own live Stock
      // dropdown for all 4 of its Window Graphics cards.
      { name: "Window Graphics", uuid: "ae3afb44-beb1-4fda-8b2c-3f940f005fc6", slug: "window-graphics", image: "/images/signs/window-graphics.jpg" },
      { name: "Wall Decals", uuid: "4bf65303-b799-4f45-b3d9-6cc105eb78a4", slug: "wall-decals", image: "/images/signs/wall-decals.jpg" },
      // Floor Graphics products (Aluminum/Flexible Vinyl, incl. a Circle
      // shape variant) are nested inside the same "Adhesive Vinyl" 4over
      // category as Wall Decals — scoped here via keyword (previously thought
      // unavailable in our sandbox; it isn't, it just has no own category).
      { name: "Floor Graphics", uuid: "4bf65303-b799-4f45-b3d9-6cc105eb78a4", slug: "floor-graphics", image: "/images/signs/wall-decals.jpg", keyword: "floor graphic" },
      { name: "Vehicle Magnets", uuid: "5b0ab4cc-8ab1-4377-b42d-d3db500a9e44", slug: "vehicle-magnets", image: "/images/signs/vehicle-magnets.jpg" },
      { name: "Banner Stands", uuid: "a98dc51f-d371-479a-8ebb-c65749065971", slug: "banner-stands", image: "/images/signs/banner-stands.jpg" },
      { name: "Displays", uuid: "cbef836a-a2f0-47a0-8cc7-67dee8a4b0ab", slug: "displays", image: "/images/signs/displays.jpg" },
    ],
  },
  "boxes-packaging": {
    label: "Boxes & Packaging",
    subcategories: [
      { name: "Packaging", uuid: "c11d8936-67ad-4b59-a48d-1683f42f055c", slug: "packaging", image: "/images/cat/packaging.jpg" },
      // Akuafoil box variants were briefly split into a separate "Majestic
      // Boxes" subcategory (2026-07-08 same day) after confirming 4over.com's
      // own Cube Boxes product page shows no Akuafoil option — but the user
      // decided (2026-07-08, later same day) to merge them back: one card
      // per box type, Akuafoil selectable inside that card's calculator
      // instead of a separate subcategory. Akuafoil variants differ from
      // plain by Stock (e.g. "18PT C1S" vs "14PT Uncoated") AND Colorspec
      // ("5/0 (4/0 with Foil on Front)" vs "4/0 (4 color front)") at the
      // SAME physical Size — the normal generic Stock/Colorspec cascade
      // dropdowns handle this natively once both uuids are in the same
      // card's sibling set (see CATEGORY_WORD_OVERRIDES["packaging"]'s
      // Akuafoil-strip rule) — no shapeList/extractShape mechanism needed,
      // unlike Wine Boxes' Handle merge.
      // CORRECTED (2026-07-08): this category's OWN official 4over name
      // (confirmed via GET /printproducts/categories/776a6fc9...) is
      // literally "Custom Boxes" — a genuinely different, fully-custom
      // product (option groups: Custom Box Style Four Panel/Tray Style/
      // Other, Custom Box Closure Tuck End/Beers Tray, Custom Box Die
      // Options, Custom Box Glue Options) from the real "Print & Trim
      // Boxes" (6 standard sizes 11x17/12x18/13x19/19x27/8.5x11/8.5x14,
      // just Stock/Coating/Colorspec — confirmed live on 4over.com's own
      // /print-and-trim-boxes page, which matches our SEPARATE "packaging"
      // > "Print and Trim Flat Sheets" card exactly, not this one). A prior
      // session's rename to "Print & Trim Boxes" here was based on
      // fourprintshop matching, not 4over.com — wrong product. Reverted to
      // 4over's own name; slug kept as "custom-boxes" (URL-only).
      { name: "Custom Boxes", uuid: "776a6fc9-b3fe-4ede-82e9-bbfccd51c293", slug: "custom-boxes", image: "/images/cat/custom-boxes.jpg" },
      // fourprintshop nests this under "Standard Packaging Tags & Cards"
      // alongside Bottleneck/Regular Hang Tags (and "Majestic Packaging
      // Tags & Cards" alongside the rest of Hang Tags' own materials) — per
      // the user's explicit choice, NOT duplicating Hang Tags here since
      // it's already correctly represented under Marketing Materials; this
      // is the one genuinely new item from that grouping.
      { name: "Header Cards", uuid: "a842ec1b-280d-4e13-aa74-18a2be824737", slug: "header-cards", image: "/images/cat/header-cards.jpg" },
    ],
  },
  "roll-labels-stickers": {
    label: "Roll Labels & Stickers",
    subcategories: [
      { name: "Roll Labels", uuid: "a2b13bce-0643-41ce-9a03-e21f9a92d7d4", slug: "roll-labels", image: "/images/cat/roll-labels.jpg" },
      { name: "Stickers", uuid: "7381a85e-5e48-4673-aa67-862dd6553ef0", slug: "stickers", image: "/images/cat/stickers.jpg" },
      // 4over.com's own /rolls-labels-stickers page (2026-07-08) lists
      // Bumper Stickers as its OWN 3rd subcategory (1 item), separate from
      // Stickers (6 items) — "4mil Bumper Stickers" shares the SAME
      // "Stickers" UUID, split out here via keyword; the "stickers" leaf
      // excludes "bumper" matches (see the `category === "stickers"`
      // filter in print/[category]/page.tsx and [typeSlug]/page.tsx) so the
      // two don't double-list.
      { name: "Bumper Stickers", uuid: "7381a85e-5e48-4673-aa67-862dd6553ef0", slug: "bumper-stickers", image: "/images/cat/stickers.jpg", keyword: "bumper" },
      // Removed "Adhesive Vinyl" — it pointed at the SAME UUID as Signs &
      // Banners' Floor Graphics/Wall Decals ("4bf65303..."), an unrelated
      // category misplaced here; fourprintshop's own Roll Labels & Stickers
      // structure has no such subcategory (its 5: Labels By Shape/By Stock,
      // Popular Stickers, Stickers By Shape, Bumper Stickers — all already
      // covered by Roll Labels/Stickers above; "Adhesive Vinyl Bumper
      // Sticker" there is just the material name, not this UUID).
    ],
  },
  "promo-products": {
    label: "Promo Products",
    subcategories: [
      { name: "T-Shirts", uuid: "faf66745-6fc0-493b-b8b0-f5f34acb3150", slug: "t-shirts", image: "/images/cat/t-shirts.jpg" },
      { name: "Tote Bags", uuid: "d94b61b1-11a9-44bc-9806-eb67fab2fb2f", slug: "tote-bags", image: "/images/cat/tote-bags.jpg" },
      { name: "Mugs", uuid: "bfd5e7d7-29e0-4508-bcc4-17ce5115c852", slug: "mugs", image: "/images/cat/mugs.jpg" },
      { name: "Buttons", uuid: "6a5ef04a-7143-444b-b4ed-f623204e7168", slug: "buttons", image: "/images/cat/buttons.jpg" },
    ],
  },
}

export interface FlatCategory {
  uuid: string
  name: string
  parentSlug: string
  parentLabel: string
  image: string
  keyword?: string | string[]
  preferredSizeText?: string
}

// Flat lookup: subcategory slug -> { uuid, name, parentSlug, parentLabel, image, keyword }
export const SLUG_TO_CATEGORY: Record<string, FlatCategory> = {}
for (const [groupSlug, group] of Object.entries(GROUPS)) {
  for (const sub of group.subcategories) {
    SLUG_TO_CATEGORY[sub.slug] = {
      uuid: sub.uuid,
      name: sub.name,
      parentSlug: groupSlug,
      parentLabel: group.label,
      image: sub.image,
      keyword: sub.keyword,
      preferredSizeText: sub.preferredSizeText,
    }
  }
}

// Parent categories where products differ mainly by size and should be
// grouped (one product, size chosen in the calculator).
export const SIZE_GROUPED_PARENTS = [
  "signs-banners",
  "business-cards",
  "marketing-materials",
  "boxes-packaging",
  "roll-labels-stickers",
  "promo-products",
]
