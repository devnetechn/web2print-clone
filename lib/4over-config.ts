// lib/4over-config.ts
// ALL UUIDs verified from live API call June 7, 2026
// Single source of truth for 4over category UUIDs, markup, and live-calculator flags.
// DO NOT hardcode UUIDs anywhere else in the project — import from here.

export interface FourOverCategory {
  name: string
  uuid: string
  showLivePrice: boolean
  markupMultiplier: number
  slug: string
}

export const FOUROVER_CATEGORIES: Record<string, FourOverCategory> = {
  // ── LIVE CALCULATOR PRODUCTS ──────────────────────────────────────────
  businessCards: {
    name: "Business Cards",
    uuid: "08a9625a-4152-40cf-9007-b2bbb349efec",
    showLivePrice: true,
    markupMultiplier: 1.5,
    slug: "business-cards",
  },
  flyersAndBrochures: {
    name: "Flyers and Brochures",
    uuid: "4edd37b2-c6d5-4938-b6c7-35e09cd7bf76",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "flyers-brochures",
  },
  postcards: {
    name: "Postcards",
    uuid: "6f4148e7-3842-4d8b-99f8-6d31c2f71883",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "postcards",
  },
  doorHangers: {
    name: "Door Hangers",
    uuid: "5cacc269-e6a8-472d-91d6-792c4584cae8",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "door-hangers",
  },
  rackCards: {
    name: "Rack Cards",
    uuid: "fafbcc3a-6196-479f-b589-c510f07372ef",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "rack-cards",
  },
  posters: {
    name: "Posters",
    uuid: "e9db3435-dde9-442b-9957-2221fa4611c5",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "posters",
  },
  largePosters: {
    name: "Large Posters",
    uuid: "393c5a2d-8be0-4134-9161-aa35fdc60685",
    showLivePrice: true,
    markupMultiplier: 1.35,
    slug: "large-posters",
  },
  sellSheets: {
    name: "Sell Sheets",
    uuid: "950d2eb7-d1ac-4a3c-b1b0-8c407ce635ed",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "sell-sheets",
  },
  stickers: {
    name: "Stickers",
    uuid: "7381a85e-5e48-4673-aa67-862dd6553ef0",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "stickers",
  },
  rollLabels: {
    name: "Roll Labels",
    uuid: "a2b13bce-0643-41ce-9a03-e21f9a92d7d4",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "roll-labels",
  },
  magnets: {
    name: "Magnets",
    uuid: "19a9a6c8-a8c8-4d0c-b4fc-8a231c1bdd53",
    showLivePrice: true,
    markupMultiplier: 1.4,
    slug: "magnets",
  },
  presentationFolders: {
    name: "Presentation Folders",
    uuid: "d69c91dd-f208-4736-a47b-a0a628d88103",
    showLivePrice: true,
    markupMultiplier: 1.45,
    slug: "presentation-folders",
  },
  signs: {
    name: "Signs",
    uuid: "9c475aac-62ea-4538-96e2-ab7e2ccb0a45",
    showLivePrice: true,
    markupMultiplier: 1.35,
    slug: "signs",
  },

  // ── QUOTE FORM PRODUCTS ───────────────────────────────────────────────
  booklets: {
    name: "Booklets",
    uuid: "8b570b5b-3ea9-4ea7-b869-dab31bb644d8",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "booklets",
  },
  catalogs: {
    name: "Catalogs",
    uuid: "8977fb0b-5ebc-47e3-bd74-132204c203ea",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "catalogs",
  },
  outdoorBanners: {
    name: "Outdoor Banners",
    uuid: "d9181764-0579-402f-bfc8-4ff65408886e",
    showLivePrice: false,
    markupMultiplier: 1.35,
    slug: "outdoor-banners",
  },
  indoorBanners: {
    name: "Indoor Banners",
    uuid: "35170807-4aa5-4d13-986f-c0e266a5d685",
    showLivePrice: false,
    markupMultiplier: 1.35,
    slug: "indoor-banners",
  },
  fabricBanners: {
    name: "Fabric Banners",
    uuid: "a8e3e0a3-695d-4a34-8143-ba363bd0dc97",
    showLivePrice: false,
    markupMultiplier: 1.35,
    slug: "fabric-banners",
  },
  bannersWithStand: {
    name: "Banners with Stand",
    uuid: "a98dc51f-d371-479a-8ebb-c65749065971",
    showLivePrice: false,
    markupMultiplier: 1.35,
    slug: "banners-with-stand",
  },
  carMagnets: {
    name: "Car Magnets",
    uuid: "5b0ab4cc-8ab1-4377-b42d-d3db500a9e44",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "car-magnets",
  },
  hangTags: {
    name: "Hang Tags",
    uuid: "56c6dd85-d838-4ca0-9f9d-e3a63e594f98",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "hang-tags",
  },
  eventTickets: {
    name: "Event Tickets",
    uuid: "395c3c6f-a90b-4c0d-beb5-887313108d05",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "event-tickets",
  },
  greetingCards: {
    name: "Greeting Cards",
    uuid: "85ded4d7-98f4-4ee4-9d83-79ad7b722ea8",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "greeting-cards",
  },
  letterheads: {
    name: "Letterheads",
    uuid: "5502b7a1-cffc-4069-bc2e-7171c86ebdb6",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "letterheads",
  },
  notepads: {
    name: "Notepads",
    uuid: "9c3a2f3e-3ce0-4eb0-ae70-cd2a453f1e37",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "notepads",
  },
  calendars: {
    name: "Calendars",
    uuid: "2e6a67e3-dd44-46c4-a183-e873b9f691a6",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "calendars",
  },
  tableTentCards: {
    name: "Table Tent Cards",
    uuid: "e2aa8867-357b-424c-b11d-11125e597cb2",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "table-tent-cards",
  },
  announcementCards: {
    name: "Announcement Cards",
    uuid: "62bdcc8e-316d-4e8f-b59c-c0ac6ee81516",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "announcement-cards",
  },
  counterCards: {
    name: "Counter Cards",
    uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "counter-cards",
  },
  ncrForms: {
    name: "NCR Forms",
    uuid: "7509c656-ba8a-43d7-9e8f-afb30455ff11",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "ncr-forms",
  },
  envelopes: {
    name: "Envelopes",
    uuid: "c908d53e-fb6d-427d-8d0b-61bba94b63d5",
    showLivePrice: false,
    markupMultiplier: 1.4,
    slug: "envelopes",
  },
  acrylicSigns: {
    name: "Acrylic Signs",
    uuid: "7ad1aae9-741d-40f5-b3dc-6d75524878ce",
    showLivePrice: false,
    markupMultiplier: 1.35,
    slug: "acrylic-signs",
  },

  // ── SPECIALTY / MAJESTIC (QUOTE ONLY) ────────────────────────────────
  raisedSpotUV: {
    name: "Raised Spot UV Cards",
    uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f",
    showLivePrice: false,
    markupMultiplier: 1.6,
    slug: "raised-spot-uv",
  },
  akuafoil: {
    name: "Akuafoil",
    uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569",
    showLivePrice: false,
    markupMultiplier: 1.6,
    slug: "akuafoil",
  },
  foilWorx: {
    name: "Foil Worx",
    uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490",
    showLivePrice: false,
    markupMultiplier: 1.6,
    slug: "foil-worx",
  },
  raisedFoil: {
    name: "Raised Foil",
    uuid: "f30e7cbf-0e9a-4122-a5aa-3330887e4d9f",
    showLivePrice: false,
    markupMultiplier: 1.6,
    slug: "raised-foil",
  },
  dualRaised: {
    name: "Dual Raised",
    uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2",
    showLivePrice: false,
    markupMultiplier: 1.6,
    slug: "dual-raised",
  },
  silkCards: {
    name: "Silk Cards",
    uuid: "6040759e-7cdb-4279-af4c-91f7c702e121",
    showLivePrice: false,
    markupMultiplier: 1.55,
    slug: "silk-cards",
  },
  suedCards: {
    name: "Suede Cards",
    uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0",
    showLivePrice: false,
    markupMultiplier: 1.55,
    slug: "suede-cards",
  },
  pearlCards: {
    name: "Pearl Cards",
    uuid: "4cb9f549-5376-4d43-8530-b04632d026a8",
    showLivePrice: false,
    markupMultiplier: 1.55,
    slug: "pearl-cards",
  },
  naturalCards: {
    name: "Natural Cards",
    uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae",
    showLivePrice: false,
    markupMultiplier: 1.55,
    slug: "natural-cards",
  },
  paintedEdgeCards: {
    name: "Painted Edge Cards",
    uuid: "b2d0278e-02e6-4861-99ba-951b66f2f1ed",
    showLivePrice: false,
    markupMultiplier: 1.6,
    slug: "painted-edge-cards",
  },
  brownKraftCards: {
    name: "Brown Kraft Cards",
    uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381",
    showLivePrice: false,
    markupMultiplier: 1.55,
    slug: "brown-kraft-cards",
  },
  plasticCards: {
    name: "Plastic Cards",
    uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e",
    showLivePrice: false,
    markupMultiplier: 1.6,
    slug: "plastic-cards",
  },
}

// ── Helper functions ────────────────────────────────────────────────────

export function getCategoryBySlug(slug: string): FourOverCategory | undefined {
  return Object.values(FOUROVER_CATEGORIES).find((c) => c.slug === slug)
}

export function getCategoryByUuid(uuid: string): FourOverCategory | undefined {
  return Object.values(FOUROVER_CATEGORIES).find((c) => c.uuid === uuid)
}

export function getCategoryUuid(slug: string): string | null {
  return getCategoryBySlug(slug)?.uuid ?? null
}

export function getMarkupMultiplier(uuid: string): number {
  return getCategoryByUuid(uuid)?.markupMultiplier ?? 1.4
}

export function getMarkupMultiplierBySlug(slug: string): number {
  return getCategoryBySlug(slug)?.markupMultiplier ?? 1.4
}

export function isLiveCalculator(slug: string): boolean {
  return getCategoryBySlug(slug)?.showLivePrice ?? false
}
