import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getProductFeed, getAllProductsForCategory, getCategoryProductsList } from "@/lib/4over/client"
import { ProductConfiguratorClient } from "@/components/print/product-configurator-client"
import { SLUG_TO_CATEGORY, SIZE_GROUPED_PARENTS, matchesAllKeywords } from "@/lib/print/categories"
import { resolveProductImage } from "@/lib/print/product-images"
import { ProductInfoTabs } from "@/components/print/product-info-tabs"
import type { ProductContent } from "@/lib/print/product-content"

// Only includes TYPE_RULES (hasTypeRules) categories — the OTHER entries in
// print/[category]/page.tsx's EXTRA_PRODUCT_SOURCES (e.g. announcement-cards)
// are for SIZE_GROUPED leaf listings, handled entirely by that file; this
// page's TYPE_KEYWORDS branch below never runs for them.
const EXTRA_PRODUCT_SOURCES: Record<string, { uuid: string; keyword: string | string[] }[]> = {
  "flyers-and-brochures": [
    { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", keyword: ["flyer", "tear-off perforation"] },
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: ["flyer", "brochure"] }, // EndurACE -- 0 live matches (account gap)
    { uuid: "50a1f1a2-3567-4618-a703-074471472e8d", keyword: "flyer" }, // EDDM Flyers -- see print/[category]/page.tsx's matching entry for why this is a single keyword, not ["flyer","brochure","half fold"]
  ],
  "door-hangers": [
    { uuid: "f3b51933-ab79-4073-a13d-de03a8cf5cb1", keyword: "door hanger" },
    { uuid: "d3010094-1b2c-4a72-846e-47a0ba37a0b8", keyword: "door hanger" },
  ],
  envelopes: [{ uuid: "f5e2f7e8-0ba8-47a6-964d-3ec6dddef2cb", keyword: "envelope" }],
  // 2026-07-08: was missing here entirely (present in print/[category]/
  // page.tsx) — every "greeting-cards" typeSlug silently showed the SAME
  // unfiltered product list (TYPE_KEYWORDS also missing — see that fix)
  // since none of these brand-stock sources were even fetched.
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
  "hang-tags": [
    // 2026-07-08: "Dual Raised" was missing here (present in print/[category]/
    // page.tsx's own EXTRA_PRODUCT_SOURCES) — caused "Dual Raised Hang Tags"
    // to show correctly as a card on the level-3 listing but resolve to "No
    // products found" when clicked, since THIS page's own product-fetch never
    // queried that UUID at all. Duplicate-list-sync hazard already flagged in
    // lib/print/categories.ts's own top comment — kept in sync now.
    { uuid: "4221cd91-1aec-4d6e-88e9-b573a011edb2", keyword: "hang tag" },
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "hang tag" },
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "hang tag" },
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: "hang tag" },
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "hang tag" },
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "hang tag" },
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "hang tag" },
    { uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", keyword: "hang tag" },
    { uuid: "b151fc42-a248-40cd-99a9-b81e8f034e9e", keyword: "hang tag" },
    { uuid: "c47d69ba-872e-4a3a-8318-e40fce02d41f", keyword: "hang tag" },
  ],
  posters: [
    { uuid: "8294ed4d-4d8c-4bea-966e-d3ad56913e74", keyword: "poster" },
    { uuid: "393c5a2d-8be0-4134-9161-aa35fdc60685", keyword: "poster" },
  ],
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
    { uuid: "50a1f1a2-3567-4618-a703-074471472e8d", keyword: "sell sheet" }, // 2026-07-09: was missing -- see matching TYPE_RULES comment in print/[category]/page.tsx
  ],
  "table-tent-cards": [
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: ["natural", "table tent"] },
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: ["pearl", "table tent"] },
  ],
  "wall-arts": [
    { uuid: "7ad1aae9-741d-40f5-b3dc-6d75524878ce", keyword: "acrylic" }, // Clear Acrylic Signs
    { uuid: "d157e6f2-ee47-4373-a1b4-8ebc18b40561", keyword: "dye-sub" }, // Aluminum Dye Sub
  ],
  "rigid-signs": [
    { uuid: "d157e6f2-ee47-4373-a1b4-8ebc18b40561", keyword: "heavy duty" },
    { uuid: "d157e6f2-ee47-4373-a1b4-8ebc18b40561", keyword: "sandwich board" },
  ],
  "indoor-banners": [
    { uuid: "a8e3e0a3-695d-4a34-8143-ba363bd0dc97", keyword: "artist canvas" },
    { uuid: "a8e3e0a3-695d-4a34-8143-ba363bd0dc97", keyword: "premium polyester banner" },
  ],
  // Kept in sync with print/[category]/page.tsx — 18oz Blockout lives in
  // the "Indoor Banner" category UUID's raw data but 4over.com displays it
  // under Outdoor Banners.
  "outdoor-banners": [
    { uuid: "35170807-4aa5-4d13-986f-c0e266a5d685", keyword: "18oz" },
  ],
  // Kept in sync with print/[category]/page.tsx — Digital Clear Window
  // Clings lives in a separate "Window Clings" category UUID.
  "window-graphics": [
    { uuid: "2d084783-38ef-4a1c-a5fb-7ec8e78700cd", keyword: "digital" },
  ],
  displays: [
    { uuid: "de3d843a-b802-4ec5-826f-1b230a17ce3a", keyword: "event tent" },
    { uuid: "fa7e5e9e-6985-41f9-b29d-aedd771b94e7", keyword: "fan cutout" },
    { uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3", keyword: "foam core" },
    { uuid: "eb56fa2f-3aa7-4479-82d5-80449018a9a3", keyword: "pvc" },
  ],
  // Kept in sync with EXTRA_PRODUCT_SOURCES in print/[category]/page.tsx —
  // specialty stocks for presentation folders live in shared brand-stock UUIDs.
  "presentation-folders": [
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "presentation folder" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "presentation folder" }, // Suede
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "presentation folder" }, // Akuafoil
  ],
  // Kept in sync with EXTRA_PRODUCT_SOURCES in print/[category]/page.tsx —
  // brand-stock materials for postcards live in shared category UUIDs.
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
  // Kept in sync with EXTRA_PRODUCT_SOURCES in print/[category]/page.tsx —
  // specialty stocks for trading cards live in shared brand-stock UUIDs.
  "trading-cards": [
    { uuid: "c5e697c7-0abd-4ca4-8ca4-44ac9872b569", keyword: "trading card" }, // Akuafoil
    { uuid: "ee4f8eed-8dd6-4d16-8e2d-758d33e54381", keyword: "trading card" }, // Brown Kraft
    { uuid: "eec8345b-cfb4-4e5f-a0f4-60289fdd39ae", keyword: "trading card" }, // Natural
    { uuid: "4cb9f549-5376-4d43-8530-b04632d026a8", keyword: "trading card" }, // Pearl
    { uuid: "6040759e-7cdb-4279-af4c-91f7c702e121", keyword: "trading card" }, // Silk
    { uuid: "819a2ebe-ce5a-495a-bb67-e23a28b8ace0", keyword: "trading card" }, // Suede
    { uuid: "db1e2442-0a86-49ea-8a2d-74c8a5091490", keyword: "trading card" }, // Foil Worx
  ],
  // Kept in sync with EXTRA_PRODUCT_SOURCES in print/[category]/page.tsx —
  // Car Door Magnets live under vehicle-magnets UUID. 2026-07-10: was
  // `keyword: "car door"`, 0 live matches (real text is "30mil Car Magnet").
  magnets: [
    { uuid: "5b0ab4cc-8ab1-4377-b42d-d3db500a9e44", keyword: "car magnet" }, // Car Door Magnets
  ],
}

// Kept in sync with TYPE_IMAGES in print/[category]/page.tsx.
const TYPE_IMAGES: Record<string, Record<string, string>> = {
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES.calendars
  calendars: {
    "12x12-calendars": "/images/cat/calendars/12x12.jpg",
    "8-5x11-calendars": "/images/cat/calendars/8-5x11.jpg",
    "spiral-bind-calendars": "/images/cat/calendars/spiral-bind.jpg",
    "11x8-5-calendars": "/images/cat/calendars/11x8-5.jpg",
    "9x12-calendars": "/images/cat/calendars/9x12.jpg",
    "hard-cover-calendars": "/images/cat/calendars/hard-cover.jpg",
    "self-cover-calendars": "/images/cat/calendars/self-cover.jpg",
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES.presentation-folders
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
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES.booklets
  // -- see that entry's comment for the resolveProductImage() confusion
  // this fixed (2026-07-09).
  booklets: {
    "matte-book-uncoated-booklets": "/images/cat/booklets/matte-book-uncoated.jpg",
    "dull-book-satin-aq-booklets": "/images/cat/booklets/dull-book-satin-aq.jpg",
    "gloss-cover-aq-booklets": "/images/cat/booklets/gloss-cover-aq.jpg",
    "premium-opaque-uncoated-booklets": "/images/cat/booklets/premium-opaque-uncoated.jpg",
    "gloss-booklets": "/images/cat/booklets/gloss.jpg",
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES.postcards
  // -- 2026-07-10: now 4over.com's own actual postcard photos, downloaded
  // and hosted locally, see that entry's comment for the full story.
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
    "tri-fold-brochures": "/images/cat/flyers-and-brochures/tri-fold.jpg",
    "z-fold-brochures": "/images/cat/flyers-and-brochures/z-fold.jpg",
    "specialty-folds-brochures": "/images/cat/flyers-and-brochures/specialty-folds.jpg",
    "endurace-flyers-and-brochures": "/images/cat/flyers-and-brochures/endurace.jpg",
  },
  envelopes: {
    "remittance-envelopes": "/images/cat/envelopes/remittance.png",
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
  // 2026-07-10: both photos replaced -- neither was actually from 4over.com
  // (100-150KB unrelated stock photos vs 4over's real ~13-15KB CDN
  // thumbnails, same bug class as [[posters-audit]]).
  "rack-cards": {
    "akuafoil-rack-cards": "/images/cat/rack-cards/akuafoil.jpg",
    "standard-rack-cards": "/images/cat/rack-cards/standard.jpg",
  },
  "sell-sheets": {
    "akuafoil-sell-sheets": "/images/cat/sell-sheets/akuafoil.jpg",
    "brown-kraft-sell-sheets": "/images/cat/sell-sheets/brown-kraft.jpg",
    "endurace-sell-sheets": "/images/cat/sell-sheets/endurace.jpg",
    "pearl-sell-sheets": "/images/cat/sell-sheets/pearl.jpg",
    "silk-sell-sheets": "/images/cat/sell-sheets/silk.jpg",
    "suede-sell-sheets": "/images/cat/sell-sheets/suede.jpg",
    "standard-sell-sheets": "/images/cat/sell-sheets.jpg",
    "eddm-full-service-sell-sheets": "/images/cat/sell-sheets/eddm-full-service.jpg",
    "eddm-print-only-sell-sheets": "/images/cat/sell-sheets/eddm-print-only.jpg",
  },
  "table-tent-cards": {
    "natural-table-tents": "/images/cat/table-tent-cards/natural.jpg",
    "pearl-table-tents": "/images/cat/table-tent-cards/pearl.jpg",
    "4x6-table-tent": "/images/cat/table-tent-cards/4x6.jpg",
    "5x5-5-table-tent": "/images/cat/table-tent-cards/5x5.5.jpg",
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES["tear-off-cards"].
  "tear-off-cards": {
    "door-hangers-tear-off": "/images/cat/door-hangers/tearoff.jpg",
    "flyers-tear-off": "/images/cat/flyers-and-brochures/tearoff.jpg",
    "postcards-tear-off": "/images/cat/postcards/tearoff.jpg",
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES.eddm.
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
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES["wall-arts"].
  "wall-arts": {
    "clear-acrylic-signs": "/images/cat/wall-arts/clear-acrylic.jpg",
    "aluminum-dye-sub": "/images/cat/wall-arts/aluminum-dye-sub.jpg",
    "mounted-canvas": "/images/cat/wall-arts/mounted-canvas.jpg",
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES["rigid-signs"].
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
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES["window-graphics"].
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
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES["banner-stands"].
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
    "silicon-edge-graphic-display": "/images/signs/displays.jpg",
    "event-tents": "/images/cat/displays/event-tents.jpg",
    "fan-cutout": "/images/cat/displays/fan-cutout.jpg",
    "foam-core-counter-cards": "/images/cat/displays/foam-core-counter.jpg",
    "white-pvc-counter-cards": "/images/cat/displays/white-pvc-counter.jpg",
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES["event-tickets"].
  "event-tickets": {
    "variable-numbering-event-tickets": "/images/cat/event-tickets/variable-numbering.jpg",
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_IMAGES.magnets.
  magnets: {
    "car-door-magnets": "/images/cat/magnets/car-door.jpg",
    "oval-magnets": "/images/cat/magnets/oval.jpg",
    "magnet-announcement-cards": "/images/cat/magnets/announcement.jpg",
    "standard-magnets": "/images/cat/magnets/standard-uv.jpg",
  },
}

// Type rules — keywords that identify a product type within a category
const TYPE_KEYWORDS: Record<string, Record<string, string[]>> = {
  // 2026-07-08 CRITICAL FIX: "catalogs", "event-tickets", and "greeting-cards"
  // were missing from this map ENTIRELY. classifyType()'s caller treats a
  // missing/empty entry as "no type rules" and skips filtering altogether
  // (`typeRules.length === 0 ? true : ...`) — every type-slug under these 3
  // categories silently showed the SAME unfiltered product list (whichever
  // sorted first alphabetically), not an error, just the WRONG product/price
  // with no visible sign anything was wrong. Kept in sync with
  // print/[category]/page.tsx's TYPE_RULES now.
  catalogs: {
    "saddle-stitch-catalogs": ["saddle", "saddle stitch"],
    "perfect-bound-catalogs": [], // catch-all
  },
  "event-tickets": {
    "variable-numbering-event-tickets": ["variable", "numbered", "numbering"],
    "standard-event-tickets": [], // catch-all
  },
  // ORDER MATTERS: kept in sync with print/[category]/page.tsx's TYPE_RULES
  // — see that file's comment for why Raised Foil/Raised Spot UV must be
  // checked before the plain material names (Suede/Silk/Pearl/etc).
  "greeting-cards": {
    "dual-raised-greeting-cards": ["dual raised"],
    "raised-foil-greeting-cards": ["raised foil"],
    "raised-spot-uv-greeting-cards": ["raised spot"],
    "gift-card-holder-greeting-cards": ["gift card", "slit"],
    "linen-greeting-cards": ["linen"],
    "gloss-cover-greeting-cards": ["gloss cover"],
    "pearl-greeting-cards": ["pearl"],
    "silk-greeting-cards": ["silk"],
    "natural-greeting-cards": ["natural"],
    "suede-greeting-cards": ["suede"],
    "brown-kraft-greeting-cards": ["brown kraft", "kraft"],
    "akuafoil-greeting-cards": ["akuafoil"],
    "standard-greeting-cards": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES — see that
  // file's comment for why EndurACE/Specialty Folds/Tri-Fold/Z-Fold were
  // removed (confirmed zero matches anywhere) and Flat moved to last (the
  // true catch-all).
  "flyers-and-brochures": {
    "all-inclusive-flyers-brochures": ["all inclusive", "all-inclusive"],
    // EDDM Full Service/Print Only Half-Folds removed (2026-07-09, account gap).
    // "eddm-flyers-base" classifies the shared EDDM Flyers product pool for
    // OPTION_PRESET_TYPES' 2 split cards (Full Service / Print Only) to draw
    // from — see the matching comment in print/[category]/page.tsx.
    "eddm-flyers-base": ["eddm"],
    // "direct-mail-*" (6 entries) removed 2026-07-09: confirmed 0 live products
    // anywhere in this category contain "direct mail" text — account gap. The
    // "...coated" variant was additionally an ACTIVE bug (OR-matched "coated"
    // is a substring of "uncoated", silently absorbing 17 unrelated plain
    // flyers) — see the matching TYPE_RULES comment in print/[category]/page.tsx.
    "specialty-folds-brochures": ["specialty fold", "gatefold", "gate fold", "accordion", "french fold"],
    "z-fold-brochures": ["z fold", "z-fold", "zfold"],
    "tri-fold-brochures": ["tri fold", "tri-fold", "trifold"],
    "half-fold-brochures": ["half-fold", "half fold", "folds to"],
    "endurace-flyers-and-brochures": ["endurace"],
    "tearoff-flyers": ["tear", "tearoff", "tear-off"],
    "flat-flyers-brochures": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx TYPE_RULES for postcards —
  // order is critical: more specific keywords before broader ones.
  "postcards": {
    "all-inclusive-postcards": ["all inclusive", "all-inclusive"],
    // "eddm-postcards-base" classifies the shared EDDM Postcards product pool
    // (all 63 genuine EDDM postcards) for OPTION_PRESET_TYPES' 2 split cards
    // (Full Service / Print Only) -- see matching comment in print/[category]/page.tsx.
    "eddm-postcards-base": ["eddm"],
    "dual-raised-rsvp-postcards": ["rsvp"],
    "dual-raised-postcards": ["dual raised"],
    "raised-foil-postcards": ["raised foil"],
    "raised-spot-uv-postcards": ["raised spot"],
    "foil-worx-postcards": ["foil worx", "foiled"], // 2026-07-09: was missing "foiled" -- see matching TYPE_RULES comment
    "tearoff-postcards": ["tear"],
    "painted-edge-postcards": ["painted-edge", "painted edge"],
    "endurace-postcards": ["endurace"],
    "akuafoil-postcards": ["akuafoil"],
    "brown-kraft-postcards": ["brown kraft", "kraft"],
    "suede-postcards": ["suede"],
    "silk-postcards": ["silk"],
    "pearl-postcards": ["pearl"],
    "natural-postcards": ["natural"],
    "linen-uncoated-postcards": ["linen"],
    "plastic-postcards": ["plastic"],
    "magnet-postcards": ["magnet"],
    "100lb-gloss-cover-postcards": ["100lb gloss cover"],
    "18pt-postcards": ["18pt"],
    "16pt-postcards": ["16pt"],
    "14pt-postcards": ["14pt"],
    "direct-mail-postcards": ["direct mail"],
    "standard-postcards": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES — see that
  // file's comment for why Round Corner/Oval/Fold Over no longer get their
  // own type (they're Shape/Size variants of one product now).
  "business-cards-standard": {
    "standard-business-cards": [], // catch-all (now the only rule)
  },
  // Kept in sync with print/[category]/page.tsx — see that file's comment
  // for the full root-cause/fix rationale (missing TYPE_RULES entries were
  // silently disabling the Stock/Coating/Shape cascade for these 11
  // categories) AND why these use a "business card"/"linen" keyword rather
  // than an empty catch-all (most of these uuids are shared with Greeting
  // Cards' matching brand material — a catch-all let Greeting Card sizes
  // leak into the Business Card Size dropdown).
  "raised-foil": { "raised-foil-business-cards": ["business card"] },
  "silk-cards": { "silk-business-cards": ["business card"] },
  "suede-cards": { "suede-business-cards": ["business card"] },
  "pearl-cards": { "pearl-business-cards": ["business card"] },
  "natural-cards": { "natural-business-cards": ["business card"] },
  "painted-edge-cards": { "painted-edge-business-cards": ["business card"] },
  "brown-kraft-cards": { "brown-kraft-business-cards": ["business card"] },
  akuafoil: { "akuafoil-business-cards": ["business card"] },
  "linen-uncoated": { "linen-uncoated-business-cards": ["linen"] },
  "raised-spot-uv": { "raised-spot-uv-business-cards": ["business card"] },
  "endurace-cards": { "endurace-business-cards": ["business card"] },
  "dual-raised": { "dual-raised-business-cards": ["business card"] },
  "foil-worx": { "foil-worx-business-cards": ["business card"] },
  "plastic-cards": { "plastic-business-cards": ["business card"] },
  "leaf-cards": { "leaf-business-cards": ["leaf"] },
  "fold-over-cards": { "fold-over-business-cards": ["fold over"] },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES for presentation-folders —
  // specialty stocks first, then size-based splits, catch-all last.
  "presentation-folders": {
    "silk-presentation-folder": ["silk"],
    "suede-presentation-folder": ["suede"],
    "akuafoil-presentation-folder": ["akuafoil"],
    "natural-presentation-folder": ["natural"],
    "pearl-presentation-folder": ["pearl"],
    "glueless-presentation-folder": ["glue-less", "glueless", "glue less"],
    "9x12-presentation-folder": ['9" x 12"', "9x12"],
    "9x14-presentation-folder": ['9" x 14.5"', "9x14"],
    "5x10-presentation-folder": ['5.25" x 10.5"', "5.25x10"],
    "6x9-presentation-folder": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES — see that
  // file's comment for why "Die Cut" isn't a 4th type here.
  "door-hangers": {
    "endurace-door-hangers": ["endurace"],
    "tearoff-door-hangers": ["tear"],
    "standard-door-hangers": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES — see that
  // file's comment for why this is PRINT-METHOD-classified, not stock.
  envelopes: {
    "remittance-envelopes": ["remittance"],
    "blank-envelopes": ["blank"],
    "digital-envelopes": ["digital"],
    "variable-addressing-envelopes": ["variable"],
    "linen-uncoated-envelopes": ["linen"],
    "natural-envelopes": ["natural"],
    "offset-envelopes": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES — see that
  // file's comment for why Akuafoil/Foiled are checked before Bottleneck/
  // Silk.
  "hang-tags": {
    "dual-raised-hang-tags": ["dual raised"],
    "akuafoil-hang-tags": ["akuafoil"],
    "foil-worx-hang-tags": ["foiled"],
    "bottleneck-hang-tags": ["bottle neck", "bottleneck"],
    "brown-kraft-hang-tags": ["brown kraft"],
    "natural-hang-tags": ["natural"],
    "pearl-hang-tags": ["pearl"],
    "plastic-hang-tags": ["plastic"],
    "raised-spot-uv-hang-tags": ["raised spot"],
    "silk-hang-tags": ["silk"],
    "suede-hang-tags": ["suede"],
    "regular-hang-tags": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES — see that
  // file's comment for the full rationale.
  posters: {
    "backlit-posters": ["backlit"],
    "blockout-posters": ["blockout"],
    "photo-gloss-posters": ["8mil"],
    "matte-finish-posters": ["dull"],
    "gloss-cover-posters": ["gloss cover"],
    "gloss-book-posters": [], // catch-all
  },
  "rack-cards": {
    "akuafoil-rack-cards": ["akuafoil"],
    "standard-rack-cards": [], // catch-all (was previously split into 3.5x8.5 and 4x9)
  },
  "sell-sheets": {
    "akuafoil-sell-sheets": ["akuafoil"],
    "brown-kraft-sell-sheets": ["brown kraft"],
    "endurace-sell-sheets": ["endurace"],
    "eddm-sell-sheets-base": ["eddm"], // classifies the shared pool for OPTION_PRESET_TYPES' 2 split cards -- see matching TYPE_RULES comment in print/[category]/page.tsx
    "pearl-sell-sheets": ["pearl"],
    "silk-sell-sheets": ["silk"],
    "suede-sell-sheets": ["suede"],
    "standard-sell-sheets": [], // catch-all
  },
  "table-tent-cards": {
    "natural-table-tents": ["natural"],
    "pearl-table-tents": ["pearl"],
    "4x6-table-tent": ['4" x 6"'],
    "5x5-5-table-tent": [], // catch-all
  },
  "tear-off-cards": {
    "door-hangers-tear-off": ["door hangers"],
    "flyers-tear-off": ["flyers"],
    "postcards-tear-off": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_RULES.eddm.
  eddm: {
    "eddm-postcards-base": ["postcards"],
    "eddm-sell-sheets-base": ["sell sheets"],
    "eddm-flyers-base": [], // catch-all
  },
  // "table cloth" not "tablethrow" — this file's targeted reconstruction
  // above (right before classification) already renamed the raw
  // "9OZPOLY-TABLETHROW-..." text to "Table Cloth - 9oz Premium
  // Polyester - ...", unlike print/[category]/page.tsx which classifies
  // straight off the untouched raw text.
  "table-covers": {
    "table-cloths": ["table cloth"],
    "table-runners": [], // catch-all
  },
  "wall-arts": {
    "clear-acrylic-signs": ["acrylic"],
    "aluminum-dye-sub": ["dye sub", "dye sublimation", "dye-sub"],
    "mounted-canvas": ["canvas"],
  },
  "rigid-signs": {
    "10mm-coroplast-signs": ["10mm"],
    "coroplast-rider-signs": ["rider"],
    "4mm-coroplast-signs": ["4mm white coroplast"],
    "3mm-pvc-signs": ["3mm white pvc signs"],
    "foam-core-signs": ["foamcore", "foam core"],
    "aluminum-heavy-duty": ["heavy duty"],
    "aluminum-sandwich-board": ["sandwich board"],
    "styrene-signs": ["styrene"],
    "gator-board-signs": [], // catch-all
  },
  "outdoor-banners": {
    "mesh-banners": ["mesh"],
    "scrim-vinyl-banners": ["13oz outdoor vinyl banner"],
    "18oz-blockout-banner": ["18oz"],
    "banner-stand-kit": [], // catch-all
  },
  "indoor-banners": {
    "artist-canvas": ["artist canvas"],
    "premium-polyester-banners": ["premium polyester banner"],
    "premium-vinyl-banners": ["10mil"],
    "15oz-blockout-indoor-vinyl-banner": [], // catch-all (18oz already excluded)
  },
  flags: {
    "feather-flags": ["feather"],
    "pole-flags": ["pole"],
    "teardrop-flags": [], // catch-all
  },
  "window-graphics": {
    "digital-clear-window-clings": ["digital"],
    "see-through-perforated-window-vinyl-graphic": ["perforated"],
    "opaque-window-graphics": ["opaque"],
    "clear-window-clings": ["clear"],
    "standard-white-window-clings": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx — see that file's comment.
  // Deliberately NO catch-all: Floor Graphics shares this same UUID and
  // must classify to null (excluded) here, not get absorbed into either
  // Wall Decals card.
  "wall-decals": {
    "high-tack-adhesive-vinyl": ["high tack"],
    "low-tack-vinyl-wall-decals": ["wall"],
  },
  // Kept in sync with print/[category]/page.tsx's own TYPE_RULES["banner-stands"].
  "banner-stands": {
    "deluxe-single-sided-retractable-banner-stands": ["deluxe"],
    "x-style-collapsible-outdoor-banner-stands": ["13oz outdoor banner with economy"],
    "x-style-collapsible-banner-stands": ["economy collapsible"],
    "standard-retractable-banner-stands": ["retractable banner with stand"],
    "telescopic-backdrop-banner-stands": [], // catch-all (code-like entries)
  },
  displays: {
    "tabletop-displays": ["tabletop"],
    "fabric-tube-displays": ["fabric tube"],
    "silicon-edge-graphic-display": ["silicon edge"],
    "event-tents": ["event tent"],
    "fan-cutout": ["fan cutout"],
    "foam-core-counter-cards": ["foam core"],
    "white-pvc-counter-cards": ["pvc"],
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES for booklets —
  // "Gloss Cover" before "Gloss" to avoid misclassification.
  booklets: {
    "matte-book-uncoated-booklets": ["matte"],
    "dull-book-satin-aq-booklets": ["dull"],
    "gloss-cover-aq-booklets": ["gloss cover"],
    "premium-opaque-uncoated-booklets": ["opaque", "premium opaque", "60lb", "70lb"],
    "direct-mail-booklets": ["direct mail"],
    "gloss-booklets": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES for calendars —
  // binding types (Spiral/Hard-Cover) before size-based splits.
  calendars: {
    "spiral-bind-calendars": ["spiral"],
    "hard-cover-calendars": ["hard cover", "hard-cover", "hardcover"],
    "12x12-calendars": ['12" x 12"', "12x12"],
    "11x8-5-calendars": ['11" x 8.5"', "11x8.5"],
    "9x12-calendars": ['9" x 12"', "9x12"],
    "8-5x11-calendars": ['8.5" x 11"', "8.5x11"],
    "self-cover-calendars": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES for trading-cards —
  // Akuafoil/Brown Kraft before 16pt/18pt to avoid misclassification.
  "trading-cards": {
    "akuafoil-trading-cards": ["akuafoil"],
    "brown-kraft-trading-cards": ["brown kraft", "kraft"],
    "foil-worx-trading-cards": ["foil worx", "foiled"],
    "natural-trading-cards": ["natural"],
    "pearl-trading-cards": ["pearl"],
    "silk-trading-cards": ["silk"], // 2026-07-09: was missing -- see matching TYPE_RULES comment in print/[category]/page.tsx
    "suede-trading-cards": ["suede"],
    "100lb-cover-linen-trading-cards": ["linen"],
    "18pt-trading-cards": ["18pt"],
    "16pt-trading-cards": ["16pt"],
    "14pt-trading-cards": [], // catch-all
  },
  // Kept in sync with print/[category]/page.tsx's TYPE_RULES for magnets.
  magnets: {
    "car-door-magnets": ["car magnet", "vehicle"],
    "magnet-postcards": ["postcard"],
    "oval-magnets": ["oval"],
    "magnet-announcement-cards": ["announcement"],
    "magnet-business-cards": ["business card"],
    "standard-magnets": [], // catch-all
  },
}

// Kept in sync with print/[category]/page.tsx's own OPTION_PRESET_TYPES —
// see that map's comment for the full explanation.
const OPTION_PRESET_TYPES: Record<string, { label: string; slug: string; baseSlug: string; optionGroupMatch: RegExp; optionMatch: RegExp }[]> = {
  "flyers-and-brochures": [
    { label: "EDDM Full Service - Flyers", slug: "eddm-full-service-flyers", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Flyers - Print Only", slug: "eddm-flyers-print-only", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
    { label: "Tri Fold Brochures", slug: "tri-fold-brochures", baseSlug: "flat-flyers-brochures", optionGroupMatch: /folding/i, optionMatch: /^Tri-Fold/i },
    { label: "Z Fold Brochures", slug: "z-fold-brochures", baseSlug: "flat-flyers-brochures", optionGroupMatch: /folding/i, optionMatch: /^Z-Fold/i },
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
  eddm: [
    { label: "EDDM Full Service Postcards", slug: "eddm-full-service-postcards", baseSlug: "eddm-postcards-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Postcards Print Only", slug: "eddm-print-only-postcards", baseSlug: "eddm-postcards-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
    { label: "EDDM Full Service Sell Sheets", slug: "eddm-full-service-sell-sheets", baseSlug: "eddm-sell-sheets-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Sell Sheets Print Only", slug: "eddm-print-only-sell-sheets", baseSlug: "eddm-sell-sheets-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
    { label: "EDDM Full Service - Half Folds", slug: "eddm-full-service-half-folds", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Full Service$/i },
    { label: "EDDM Print Only - Half Folds", slug: "eddm-print-only-half-folds", baseSlug: "eddm-flyers-base", optionGroupMatch: /eddm service/i, optionMatch: /^Print Only$/i },
  ],
}

// Type slug -> display label
const TYPE_LABELS: Record<string, string> = {
  "saddle-stitch-catalogs": "Saddle Stitch Catalogs",
  "perfect-bound-catalogs": "Perfect Bound Catalogs",
  "variable-numbering-event-tickets": "Variable Numbering Event Tickets",
  "standard-event-tickets": "Standard Event Tickets",
  "dual-raised-greeting-cards": "Dual Raised Greeting Cards",
  "gift-card-holder-greeting-cards": "Cards with Gift Card Holder Greeting Cards",
  "linen-greeting-cards": "100lb Cover Linen Greeting Cards",
  "gloss-cover-greeting-cards": "100lb Gloss Cover Greeting Cards",
  "pearl-greeting-cards": "Pearl Greeting Cards",
  "silk-greeting-cards": "Silk Greeting Cards",
  "raised-spot-uv-greeting-cards": "Raised Spot UV Greeting Cards",
  "natural-greeting-cards": "Natural Greeting Cards",
  "suede-greeting-cards": "Suede Greeting Cards",
  "brown-kraft-greeting-cards": "Brown Kraft Greeting Cards",
  "raised-foil-greeting-cards": "Raised Foil Greeting Cards",
  "akuafoil-greeting-cards": "Akuafoil Greeting Cards",
  "standard-greeting-cards": "Standard Greeting Cards",
  "all-inclusive-flyers-brochures": "All Inclusive Flyers Brochures",
  "specialty-folds-brochures": "Specialty Folds Brochures",
  "z-fold-brochures": "Z Fold Brochures",
  "tri-fold-brochures": "Tri Fold Brochures",
  "endurace-flyers-and-brochures": "EndurACE Flyers and Brochures",
  "flat-flyers-brochures": "Flat Flyers Brochures",
  "half-fold-brochures": "Half Fold Brochures",
  "tearoff-flyers": "Tearoff Flyers",
  "eddm-full-service-flyers": "EDDM Full Service - Flyers",
  "eddm-flyers-print-only": "EDDM Flyers - Print Only",
  "eddm-full-service-sell-sheets": "EDDM Full Service Sell Sheets",
  "eddm-print-only-sell-sheets": "EDDM Sell Sheets Print Only",
  "eddm-full-service-half-folds": "EDDM Full Service - Half Folds",
  "eddm-print-only-half-folds": "EDDM Print Only - Half Folds",
  "all-inclusive-postcards": "All-Inclusive Postcards",
  "eddm-full-service-postcards": "EDDM Full Service Postcards",
  "eddm-print-only-postcards": "EDDM Postcards Print Only",
  "eddm-postcards": "EDDM Postcards",
  "dual-raised-rsvp-postcards": "Dual Raised RSVP",
  "dual-raised-postcards": "Dual Raised Postcards",
  "raised-foil-postcards": "Raised Foil Postcards",
  "raised-spot-uv-postcards": "Raised Spot UV Postcards",
  "foil-worx-postcards": "Foil Worx Postcards",
  "tearoff-postcards": "Tearoff Postcards",
  "painted-edge-postcards": "Painted-Edge Postcards",
  "endurace-postcards": "EndurACE Postcards",
  "akuafoil-postcards": "Akuafoil Postcards",
  "brown-kraft-postcards": "Brown Kraft Postcards",
  "suede-postcards": "Suede Postcards",
  "silk-postcards": "Silk Postcards",
  "pearl-postcards": "Pearl Postcards",
  "natural-postcards": "Natural Postcards",
  "linen-uncoated-postcards": "Linen Uncoated Postcards",
  "plastic-postcards": "Plastic Postcards",
  "magnet-postcards": "Magnet Postcards",
  "100lb-gloss-cover-postcards": "100LB Gloss Cover Postcards",
  "18pt-postcards": "18pt Postcards",
  "16pt-postcards": "16PT Postcards",
  "14pt-postcards": "14pt Postcards",
  "direct-mail-postcards": "Direct Mail Postcards",
  "standard-postcards": "Standard Postcards",
  "standard-business-cards": "Standard Business Cards",
  "raised-foil-business-cards": "Raised Foil Business Cards",
  "silk-business-cards": "Silk Business Cards",
  "suede-business-cards": "Suede Business Cards",
  "pearl-business-cards": "Pearl Business Cards",
  "natural-business-cards": "Natural Business Cards",
  "painted-edge-business-cards": "Painted Edge Business Cards",
  "brown-kraft-business-cards": "Brown Kraft Business Cards",
  "akuafoil-business-cards": "Akuafoil Business Cards",
  "linen-uncoated-business-cards": "Linen Uncoated Business Cards",
  "raised-spot-uv-business-cards": "Raised Spot UV Business Cards",
  "endurace-business-cards": "EndurACE Business Cards",
  "dual-raised-business-cards": "Dual Raised Business Cards",
  "foil-worx-business-cards": "Foil Worx Business Cards",
  "plastic-business-cards": "Plastic Business Cards",
  "leaf-business-cards": "Leaf Business Cards",
  "fold-over-business-cards": "Fold-over Business Cards",
  "silk-presentation-folder": "Silk Presentation Folder",
  "suede-presentation-folder": "Suede Presentation Folder",
  "akuafoil-presentation-folder": "Akuafoil Presentation Folder",
  "natural-presentation-folder": "Natural Presentation Folder",
  "pearl-presentation-folder": "Pearl Presentation Folder",
  "glueless-presentation-folder": "Glue Less 9x12 Presentation Folder",
  "9x12-presentation-folder": "9x12 Presentation Folder",
  "9x14-presentation-folder": "9x14.5 Presentation Folder",
  "5x10-presentation-folder": "5.25x10.5 Presentation Folder",
  "6x9-presentation-folder": "6x9 Presentation Folder",
  "endurace-door-hangers": "EndurACE Door Hangers",
  "tearoff-door-hangers": "Tearoff Door Hangers",
  "standard-door-hangers": "Standard Door Hangers",
  "remittance-envelopes": "Remittance Envelopes",
  "blank-envelopes": "Blank Envelopes",
  "digital-envelopes": "Digital Envelopes",
  "variable-addressing-envelopes": "Variable Addressing Envelopes",
  "linen-uncoated-envelopes": "Linen Uncoated Envelopes",
  "natural-envelopes": "Natural Envelopes",
  "offset-envelopes": "Offset Envelopes",
  "dual-raised-hang-tags": "Dual Raised Hang Tags",
  "akuafoil-hang-tags": "Akuafoil Hang Tags",
  "foil-worx-hang-tags": "Foil Worx Hang Tags",
  "bottleneck-hang-tags": "Bottleneck Hang Tags",
  "brown-kraft-hang-tags": "Brown Kraft Hang Tags",
  "natural-hang-tags": "Natural Hang Tags",
  "pearl-hang-tags": "Pearl Hang Tags",
  "plastic-hang-tags": "Plastic Hang Tags",
  "raised-spot-uv-hang-tags": "Raised Spot UV Hang Tags",
  "silk-hang-tags": "Silk Hang Tags",
  "suede-hang-tags": "Suede Hang Tags",
  "regular-hang-tags": "Regular Hang Tags",
  "backlit-posters": "Backlit Posters",
  "blockout-posters": "Blockout Posters",
  "photo-gloss-posters": "Photo Gloss Posters",
  "matte-finish-posters": "Dull Book Posters",
  "gloss-cover-posters": "Gloss Cover Posters",
  "gloss-book-posters": "Gloss Book Posters",
  "matte-book-uncoated-booklets": "Matte Book Uncoated Booklets",
  "dull-book-satin-aq-booklets": "Dull Book with Satin AQ Booklets",
  "gloss-cover-aq-booklets": "Gloss Cover with AQ Booklets",
  "premium-opaque-uncoated-booklets": "Premium Opaque Uncoated Booklets",
  "direct-mail-booklets": "Direct Mail Booklets",
  "gloss-booklets": "Gloss Booklets",
  "spiral-bind-calendars": "Spiral Bind Calendars",
  "hard-cover-calendars": "Hard-Cover Calendars",
  "12x12-calendars": "12x12 Calendars",
  "11x8-5-calendars": "11x8.5 Calendars",
  "9x12-calendars": "9x12 Calendars",
  "8-5x11-calendars": "8.5x11 Calendars",
  "self-cover-calendars": "Self-Cover Calendars",
  "akuafoil-trading-cards": "Akuafoil Trading Cards",
  "brown-kraft-trading-cards": "Brown Kraft Trading Cards",
  "foil-worx-trading-cards": "Foil Worx Trading Cards",
  "natural-trading-cards": "Natural Trading Cards",
  "pearl-trading-cards": "Pearl Trading Cards",
  "silk-trading-cards": "Silk Trading Cards",
  "suede-trading-cards": "Suede Trading Cards",
  "100lb-cover-linen-trading-cards": "100lb Cover Linen Trading Cards",
  "18pt-trading-cards": "18pt Trading Cards",
  "16pt-trading-cards": "16pt Trading Cards",
  "14pt-trading-cards": "14pt Trading Cards",
  "car-door-magnets": "Car Door Magnets",
  "oval-magnets": "Oval Magnets",
  "magnet-announcement-cards": "Magnet Announcement Cards",
  "magnet-business-cards": "Magnet Business Cards",
  "standard-magnets": "Standard Magnets",
  "akuafoil-rack-cards": "Akuafoil Rack Cards",
  "standard-rack-cards": "Standard Rack Cards",
  "akuafoil-sell-sheets": "Akuafoil Sell Sheets",
  "brown-kraft-sell-sheets": "Brown Kraft Sell Sheets",
  "endurace-sell-sheets": "EndurACE Sell Sheets",
  "pearl-sell-sheets": "Pearl Sell Sheets",
  "silk-sell-sheets": "Silk Sell Sheets",
  "suede-sell-sheets": "Suede Sell Sheets",
  "standard-sell-sheets": "Standard Sell Sheets",
  "natural-table-tents": "Natural Table Tents",
  "pearl-table-tents": "Pearl Table Tents",
  "4x6-table-tent": "4x6 Table Tent",
  "5x5-5-table-tent": "5x5.5 Table Tent",
  "door-hangers-tear-off": "Door Hangers with Tear-Off Perforation",
  "flyers-tear-off": "Flyers with Tear-Off Perforation",
  "postcards-tear-off": "Postcards with Tear-Off Perforation",
  "eddm-sell-sheets": "EDDM Sell Sheets",
  "eddm-flyers": "EDDM Flyers",
  "trading-cards": "Trading Cards",
  "table-cloths": "Tablecloths",
  "table-runners": "Table Runners",
  "clear-acrylic-signs": "Clear Acrylic Signs",
  "aluminum-dye-sub": "Aluminum Dye Sub",
  "mounted-canvas": "Mounted Canvas",
  "10mm-coroplast-signs": "10mm Coroplast Signs",
  "coroplast-rider-signs": "Rider Signs",
  "4mm-coroplast-signs": "4mm Coroplast Signs",
  "3mm-pvc-signs": "3mm PVC Signs",
  "foam-core-signs": "Foam Core Signs",
  "aluminum-heavy-duty": "Aluminum Heavy Duty",
  "aluminum-sandwich-board": "Single and Double Sided Aluminum Sandwich Board",
  "styrene-signs": "Styrene Signs",
  "gator-board-signs": "Gator Board Signs",
  "mesh-banners": "Mesh Banners",
  "scrim-vinyl-banners": "Scrim Vinyl Banners",
  "18oz-blockout-banner": "18oz Blockout Banner",
  "banner-stand-kit": "Banner Stand Kit",
  "artist-canvas": "Artist Canvas",
  "premium-polyester-banners": "Premium Polyester Banners",
  "premium-vinyl-banners": "Premium Vinyl Banners",
  "15oz-blockout-indoor-vinyl-banner": "15oz Blockout Indoor Vinyl Banner",
  "feather-flags": "Feather Flags",
  "pole-flags": "Pole Flags",
  "teardrop-flags": "Teardrop Flags",
  "digital-clear-window-clings": "Digital Clear Window Clings",
  "see-through-perforated-window-vinyl-graphic": "See-Through Perforated Window Vinyl Graphic",
  "opaque-window-graphics": "Opaque Window Graphics",
  "clear-window-clings": "Clear Window Clings",
  "standard-white-window-clings": "Standard White Window Clings",
  "high-tack-adhesive-vinyl": "High Tack Adhesive Vinyl",
  "low-tack-vinyl-wall-decals": "Low Tack Vinyl Wall Decals",
  "deluxe-single-sided-retractable-banner-stands": "Deluxe Single-Sided Retractable Banner Stands",
  "x-style-collapsible-outdoor-banner-stands": "X-Style Collapsible Outdoor Banner Stands",
  "x-style-collapsible-banner-stands": "X-Style Collapsible Banner Stands",
  "standard-retractable-banner-stands": "Standard Retractable Banner Stands",
  "telescopic-backdrop-banner-stands": "Telescopic Backdrop Banner Stands",
  "tabletop-displays": "Tabletop Displays",
  "fabric-tube-displays": "Fabric Tube Displays",
  "silicon-edge-graphic-display": "Silicon Edge Graphic Display",
  "event-tents": "Event Tents",
  "fan-cutout": "Fan Cutout",
  "foam-core-counter-cards": "Foam Core Counter Cards",
  "white-pvc-counter-cards": "White PVC Counter Cards",
}

// Signs & Banners: hide these technical/redundant option groups from the price
// calculator (Coating, Orientation, Flute, H-Stakes). Everything else relevant
// to each product (Grommets, Shape, Pole Pockets, Hems, D-Rings, Rope, Velcro,
// ...) still shows. Hidden groups keep their default in the live price.
const SIGNS_HIDDEN_GROUPS = ["coating", "product orientation", "flute directions", "h-stakes"]
// Postcards: hide wholesale-only mailing/distribution options not relevant to print-only orders.
// "Mailing Service" and "Postage Class" are also excluded from the quote via configurator logic.
const POSTCARDS_HIDDEN_GROUPS = ["mailing service", "postage class", "product orientation", "remainders extras", "additional options"]
// All other products: hide the same wholesale-only groups that add cost or clutter.
// These groups are still excluded from the quote via configurator defaults logic, but
// hiding them prevents confusion for customers who shouldn't see mailing/postage options.
const GENERAL_HIDDEN_GROUPS = ["mailing service", "postage class", "product orientation", "remainders extras", "additional options"]
// All-inclusive (flyers/brochures/trading-cards): also hide print method — but still need
// all of the wholesale-only groups from GENERAL_HIDDEN_GROUPS.
const ALL_INCLUSIVE_HIDDEN_GROUPS = [...GENERAL_HIDDEN_GROUPS, "print method"]

// Kept in sync with print/[category]/page.tsx's FLAT_SIZE_PAREN.
const FLAT_SIZE_PAREN = /\(\s*flat\s+size\s*:?[^)]*\)\s*/gi
// Kept in sync with print/[category]/page.tsx's CODE_LIKE_DESCRIPTION /
// reconstructCodeLikeDescriptions — see that file's comment for why.
const CODE_LIKE_DESCRIPTION = /^([A-Z0-9.]+(?:-[A-Z0-9.]+)*)-([\d.]+)X([\d.]+)$/i
function reconstructCodeLikeDescriptions<T extends { product_description: string; product_code?: string }>(
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
// Kept in sync with print/[category]/page.tsx's SCORING_SUFFIX — see that
// file's comment for why "Die Cut and " needs to be consumed here too.
const SCORING_SUFFIX = /,?\s*(die\s+cut\s+and\s+)?(flat\s*-\s*no\s+scoring|scoring\s+included)\.?\s*$/i
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
// 2.75\"" vs "2.75\" x 2.75\""). Quote marks AND any whitespace around "x"
// are stripped entirely, not just normalized — Aluminum's own raw
// descriptions ("Aluminum Heavy Duty .080in. White - 10X10") never carry
// quote marks or spacing around the dimension at all, while the live
// size_list still names the same size "10\" x 10\"". Without this, the
// 3-level anchor's startsWith() check never matches, silently falling
// through to the unanchored default — confirmed: "Aluminum Heavy Duty"
// was resolving prices for "Aluminum Sandwich Board" instead (same
// category_uuid, no anchor to tell them apart).
function normalizeSizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/["”']/g, "")
    .replace(/\s*x\s*/g, "x")
    .replace(/\s+/g, " ")
    .trim()
}

// Plain .startsWith() is the right call for size_list entries that carry a
// descriptive suffix the bare dimension doesn't have (e.g. "8.5x22-4page"
// for Half-Fold Brochures' 4-page fold pattern) — but stripping quote marks
// above also strips the boundary that used to stop "12x12" from matching as
// a prefix of "12x120" (the quote after "12" used to block it; confirmed
// this silently mismatched Floor Graphics' "12\" x 12\"" to size_list's
// "12\" x 120\""). Require the next character (if any) to be a non-digit,
// so a same-prefix LONGER number can never pass as a match.
function sizeStartsWith(normalizedName: string, sizeText: string): boolean {
  if (!normalizedName.startsWith(sizeText)) return false
  const next = normalizedName[sizeText.length]
  return next === undefined || !/[0-9]/.test(next)
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
    // see the matching comment in print/[category]/page.tsx.
    .replace(SCORING_SUFFIX, "")
    .replace(VARIABLE_SUFFIX, "")
    .replace(TRAILING_WITH, "")
    // Kept in sync with print/[category]/page.tsx's stripSize — see that
    // file's comment for why (4over's inconsistent Tag/Tent/Sheet pluralization).
    .replace(/\bTag\b/g, "Tags")
    .replace(/\bTent\b/g, "Tents")
    .replace(/\bSheet\b/g, "Sheets")
    .replace(/\bSell\s+Sheets\s+[Oo]n\s+(.+)$/, "$1 Sell Sheets")
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

// For signs-banners type pages: build a sizeProducts list directly from the
// matched products so the Size dropdown shows only THIS sign type's sizes
// (not all 120+ from the whole rigid-signs category) and bypasses the live
// Stock/Coating cascade entirely (which shows raw 4over stock codes like
// "10CORO", "316GATORBLACK" that are meaningless to customers).
// For sign types with multiple products at the same dimension (Gator Board
// has Black/White variants), includes the color in the size label so no
// variant is silently dropped.
function buildSignSizeProducts(products: { product_uuid: string; product_description: string }[]): { uuid: string; size: string }[] {
  const withDim = products.map((p) => {
    const dim = p.product_description.match(SIZE_DIM)
    let baseSize = dim ? dim[0].replace(/\s+/g, " ").trim() : ""
    // Normalize bare "NXN" codes (no quotes/spaces) from Aluminum Heavy Duty
    // descriptions → "N\" x N\"" for consistent display.
    if (baseSize && /^\d+(?:\.\d+)?[xX×]\d+(?:\.\d+)?$/.test(baseSize)) {
      const [w, h] = baseSize.split(/[xX×]/)
      baseSize = `${w}" x ${h}"`
    }
    if (!baseSize) {
      // Fallback for "N' x N'" foot-mark format not matched by SIZE_DIM's
      // quote character class (event tents: "10' x 10' Aluminum ...").
      // Use [^\w\s] to match any punctuation/quote as a unit marker.
      const feetMatch = p.product_description.match(/\d+(?:\.\d+)?\s*[^\w\s]\s*[xX×]\s*\d+(?:\.\d+)?\s*[^\w\s]?/)
      if (feetMatch) baseSize = feetMatch[0].trim()
    }
    if (!baseSize) {
      // Fallback for "Type - Size - Material" descriptions (flags, banner stands)
      // where the size uses linear/ft units that SIZE_DIM doesn't match.
      // e.g. "Feather Flag - 12ft Jumbo - 3oz Polyester" → "12ft Jumbo"
      const parts = p.product_description.split(/\s*-\s*/)
      if (parts.length >= 3) {
        const sizeCandidate = parts.slice(1, -1).find((s) => /\d/.test(s))
        if (sizeCandidate) baseSize = sizeCandidate.trim()
      }
    }
    if (!baseSize) baseSize = "Standard"
    return { uuid: p.product_uuid, desc: p.product_description, baseSize }
  })
  const byBase = new Map<string, typeof withDim>()
  for (const item of withDim) {
    const key = item.baseSize.toLowerCase()
    const list = byBase.get(key) || []
    list.push(item)
    byBase.set(key, list)
  }
  const result: { uuid: string; size: string }[] = []
  for (const group of byBase.values()) {
    if (group.length === 1) {
      result.push({ uuid: group[0].uuid, size: group[0].baseSize })
    } else {
      for (const item of group) {
        const afterDim = item.desc.replace(SIZE_DIM, "").replace(/^[\s\-–—]+/, "").trim()
        const colorMatch = afterDim.match(/\b(black|white|red|blue|clear|opaque)\b/i)
        const qualifier = colorMatch ? colorMatch[0] : afterDim.split(/[\s\-–]+/)[0] || ""
        result.push({ uuid: item.uuid, size: qualifier ? `${item.baseSize} (${qualifier})` : item.baseSize })
      }
    }
  }
  return result.sort((a, b) => {
    const aW = parseFloat(a.size)
    const bW = parseFloat(b.size)
    return aW !== bW ? aW - bW : a.size.localeCompare(b.size)
  })
}

// Kept in sync with print/[category]/page.tsx's CATEGORY_WORD_OVERRIDES —
// see that file's comment for why.
const CATEGORY_WORD_OVERRIDES: Record<string, [RegExp, string][]> = {
  // Kept in sync with print/[category]/page.tsx — see that file's comment.
  // 2026-07-10: raw product text says "30mil Car Magnet" but 4over.com's own
  // marketing/nav name for this exact product is "Car Door Magnets".
  "vehicle-magnets": [[/30mil\s+Car\s+Magnet/i, "Car Door Magnets"]],
  "tote-bags": [
    [/\b(blue|natural|red)\b\s*(?=with)/gi, ""],
    [
      /\s*with\s*[\d.]+(?:\.\d+)?\s*["']?\s*[xX]\s*[\d.]+(?:\.\d+)?\s*["']?\s*Print Area\s*on\s*6OZ\s*Cotton\s*Canvas\s*$/i,
      "",
    ],
  ],
  mugs: [
    [/,\s*\d+oz\s*/gi, " "],
    [/\s*with\s*wraparound\s*image,?\s*/gi, " "],
    [/,?\s*[\d.]+(?:\.\d+)?\s*["']?\s*[xX]\s*[\d.]+(?:\.\d+)?\s*["']?\s*print\s*area\s*$/i, ""],
  ],
  buttons: [
    [/^[\d.]+(?:\.\d+)?\s*["']?\s*(?:[xX]\s*[\d.]+(?:\.\d+)?\s*["']?)?\s*/, ""],
    [/\b(round|diamond shaped|square|rectangle)\b\s*/gi, ""],
    [/\s*with\s*(locking safety pin|magnet backing)\s*$/i, ""],
  ],
  "t-shirts": [
    [/\b(black|blue|gray|grey|red|white)\b\s*(?=w\/|with)/gi, ""],
    [/\s*(?:with|w\/)\s*[\d.]+(?:\.\d+)?\s*["']?\s*[xX]\s*[\d.]+(?:\.\d+)?\s*["']?\s*Print Area\s*$/i, ""],
  ],
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
  // Renamed from "Print and Trim Boxes" (2026-07-08) — kept in sync with
  // print/[category]/page.tsx, see that file's comment for why.
  "custom-boxes": [
    [/^18PTC1S-CPBXNC-([\d.]+)X([\d.]+)$/i, '$1" X $2" Custom Boxes with No Coating'],
    [/^18PTC1S-CPBXSPUVFR-([\d.]+)X([\d.]+)$/i, '$1" X $2" Custom Boxes with Spot UV on the front only, No UV Coating on the back'],
    [/^18PTC1S-CPBXUV-([\d.]+)X([\d.]+)$/i, '$1" X $2" Custom Boxes with Full UV on the front only, No UV Coating on the back'],
  ],
  // Kept in sync with print/[category]/page.tsx's CATEGORY_WORD_OVERRIDES["packaging"] — see that file's comment for why.
  packaging: [
    [/\s+with\s+Akuafoil\b/gi, " "],
    [/\b\d+BC\s+Box\b/gi, "Business Card Boxes"],
    [/\s+with\s+Handle,?\s*/gi, " "],
    [/\bWine\s+Box\b/gi, "Wine Boxes"],
    [/\bTuck\s+Box\b/gi, "Roll End Tuck Top Boxes"],
    [/\bSales\s+Box\b/gi, "Sales Presentation Boxes"],
    [/\bCube\s+Box\b/gi, "Cube Boxes"],
    [/\bGolf\s+Ball\s+Box\b/gi, "Golf Ball Boxes"],
  ],
  "header-cards": [
    [/\buncoated\s+(?=header\s+cards)/gi, ""],
    [/\bmatte\s*\/\s*dull\s+finish\s+(?=header\s+cards)/gi, ""],
  ],
  "floor-graphics": [[/\s*-\s*Circle\b/gi, ""]],
  "counter-cards": [[/\bsigns\b/gi, "Counter Cards with Easel Backs"]],
  "calendars": [[/\(\s*\d+\s*inside\s+pages?\s+\d+:\d+\s+plus\s+\d+\s+page\s+cover\s+\d+:\d+\s*\)/gi, "On 100LB GLOSS BOOK"]],
  "trading-cards": [
    [/\b\d+pt\s+(?:uncoated\s+|silk\s+laminated\s+)?(?=foiled\s+trading\s+cards)/gi, ""],
    [/\bfoiled\s+trading\s+cards\b/gi, "Foil Worx Trading Cards"],
    [/\buncoated\s+(?=trading\s+cards)/gi, ""],
  ],
  "announcement-cards": [[/\buncoated\s+(?=(?:round\s*corners?|ovals?|fold\s*overs?)?\s*announcement\s+cards)/gi, ""]],
  // Same Foil Worx naming pattern as Trading Cards — Foil Worx UUID has
  // "14PT Uncoated Foiled Postcards"; strip the stock prefix so all foiled
  // stocks merge into one card, then rename to match 4over's label.
  "postcards": [
    [/\b\d+pt\s+(?:uncoated\s+|silk\s+laminated\s+)?(?=foiled\s+postcards?)/gi, ""],
    [/\bfoiled\s+postcards?\b/gi, "Foil Worx Postcards"],
  ],
  "booklets": [[/\b(?:60lb|70lb|80lb|100lb)\s+(?=(?:gloss\s*book|gloss\s*cover|matte\s*book)\b)/gi, ""]],
  "greeting-cards": [
    [/\buncoated\s+(?=greeting\s+cards)/gi, ""],
    [/\bGreeting\s+Cards\s+[Oo]n\s+(\d+\s*pt)\b/gi, "$1 Greeting Cards"],
    [/\b\d+\s*pt\s*(?:c1s)?\s+(?=(?:matte\s*\/\s*dull\s+finish\s+)?greeting\s+cards)/gi, ""],
  ],
  letterheads: [
    [/\bLETTERHEAD\s+on\s+60LB\s+Opaque\s+Text\b/gi, "Blank Letterheads"],
    [/\bLETTERHEAD\s+on\s+70lb\s+LINEN\b/gi, "Linen Uncoated Letterheads"],
    [/\bLETTERHEAD\s+on\s+70lb\s+Premium\s+Uncoated\s+Text\b/gi, "Premium Opaque Letterheads"],
  ],
  "ncr-forms": [
    [/\b2\s*Part\s+NCR\s+Forms\s+with\s+Wraparound\s+Cover\s*-?\s*Qty\s*50\s*per\s*book\b/gi, "2-part NCR Form Pads w Wraparound Cover"],
    [/\b3\s*Part\s+NCR\s+Forms\s+with\s+Wraparound\s+Cover\s*-?\s*Qty\s*35\s*per\s*book\b/gi, "3-part NCR Form Pads w Wraparound Cover"],
    [/\b2\s*Part\s+NCR\s+Forms\b/gi, "2-part NCR Forms w Variable Numbering"],
    [/\b3\s*Part\s+NCR\s+Forms\b/gi, "3-part NCR Forms w Variable Numbering"],
  ],
  notepads: [
    [/\b\d+\s*Sheet\s+(?=Notepad)/gi, ""],
    [/\bNotepad\s+on\s+60LB\s+Opaque\s+Text\s+with\s+Chipboard\s+Backer\b/gi, "Premium Opaque Notepads"],
    [/\bNotepad\s+on\s+70LB\s+Premium\s+Uncoated\s+Text\s+with\s+Chipboard\s+Backer\b/gi, "Premium Opaque Notepads"],
    [/\bNotepad\s+on\s+70LB\s+LINEN\s+Uncoated\s+Text\s+with\s+Chipboard\s+Backer\b/gi, "Linen Notepads"],
  ],
}
const CATEGORY_ENSURE_SUFFIX: Record<string, { test: RegExp; suffix: string }> = {}

// "calendar"/"saddle"/"stitch"/"eddm" included to stay in sync with the same
// set in print/[category]/page.tsx — see that file's comment for why.
const FILLER_WORDS = new Set(["with", "on", "the", "a", "an", "and", "for", "of", "to", "&", "in", "w", "calendar", "saddle", "stitch", "eddm"])
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

  const { data: productContent } = await supabase
    .from("product_content")
    .select("*")
    .eq("category_slug", category)
    .maybeSingle<ProductContent>()

  const leaf = SLUG_TO_CATEGORY[category]

  // ---- If uuid is provided, go directly to individual product calculator ----
  if (uuid) {
    const { data: productData } = await supabase
      .from("fourover_products")
      .select("*")
      .eq("product_uuid", uuid)
      .single()

    const product = productData
    // A handful of SKUs have no real product_description — 4over's data
    // falls back to literally the product_code (see print/[category]/
    // page.tsx's reconstructCodeLikeDescriptions for the full story). Only
    // queried when this ONE product needs it (rare), unlike that file which
    // reconstructs the whole list at once.
    if (product && CODE_LIKE_DESCRIPTION.test(product.product_description)) {
      const m = product.product_code?.match(CODE_LIKE_DESCRIPTION)
      if (m) {
        const { data: siblings } = await supabase
          .from("fourover_products")
          .select("product_description, product_code")
          .eq("category_uuid", product.category_uuid)
          .like("product_code", `${m[1]}-%`)
        const [reconstructed] = reconstructCodeLikeDescriptions([
          { product_description: product.product_description, product_code: product.product_code },
          ...(siblings || []),
        ])
        product.product_description = reconstructed.product_description
      }
    }
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
    // Despite the name, also covers Announcement Cards' EXTRA-sourced
    // materials only (product.category_uuid differs from this category's
    // own leaf.uuid) — see print/[category]/page.tsx's _extraSourced
    // comment for why the PRIMARY uuid's Standard/Round Corner must stay
    // un-merged (2 genuinely separate cards, confirmed live).
    const isBusinessCards =
      (leaf?.parentSlug === "business-cards" && category !== "oval-cards" && category !== "fold-over-cards") ||
      ((category === "announcement-cards" || category.endsWith("-announcement-cards")) &&
        product.category_uuid !== leaf?.uuid) ||
      category === "floor-graphics"
    const isAllInclusive = typeSlug.includes("all-inclusive") || category === "flyers-and-brochures" || category === "trading-cards"
    // Signs & Banners: drop the leading size from the title (size is chosen in
    // the calculator), and group all same-stock size variants so the Size
    // dropdown switches between them.
    let sizeProducts: { uuid: string; size: string }[] | undefined
    let initialSizeUuid: string | undefined
    let initialStockUuid: string | undefined
    let initialCoatingUuid: string | undefined
    let allowedProductUuidsOverride: string[] | undefined
    let filteredSizeUuids: string[] | undefined
    if (leaf?.parentSlug && SIZE_GROUPED_PARENTS.includes(leaf.parentSlug)) {
      // Applied BEFORE stripSize, not after: some overrides (e.g. Calendars'
      // missing-stock-name parenthetical) target a pattern that an EARLIER
      // stripSize regex (PAGE_DIM, which also matches bare "N page"/"N
      // pages" substrings) would partially eat into first, leaving a
      // mangled remnant the override's own regex no longer matches.
      for (const [pattern, replacement] of CATEGORY_WORD_OVERRIDES[category] || []) {
        productName = productName.replace(pattern, replacement)
      }
      const baseName = stripSize(productName, isBusinessCards)
      if (baseName) productName = baseName
      if (isBoxesPackaging) {
        productName = productName.replace(BOX_THICKNESS_PREFIX, "").trim() || productName
      }
      // Kept in sync with print/[category]/page.tsx's "Standard
      // Announcement Cards" merge — see that file's comment for why.
      if (
        category === "announcement-cards" &&
        product.category_uuid === leaf?.uuid &&
        !/round\s*corner/i.test(product.product_description || "")
      ) {
        productName = productName.replace(BOX_THICKNESS_PREFIX, "Standard ").trim() || productName
      }
      // Kept in sync with print/[category]/page.tsx's Greeting Cards merge
      // — the PT prefix is already stripped entirely by CATEGORY_WORD_
      // OVERRIDES above (not just reduced to a leading "Npt " BOX_THICKNESS_
      // PREFIX match), so this renames the bare result directly.
      if (category === "greeting-cards" && productName === "Greeting Cards") {
        productName = "Standard Greeting Cards"
      }
      const ensureSuffix = CATEGORY_ENSURE_SUFFIX[category]
      if (ensureSuffix && !ensureSuffix.test.test(productName)) {
        productName = productName + ensureSuffix.suffix
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
        // CRITICAL FIX (2026-07-08): "Packaging" and "Majestic Boxes" share
        // ONE category UUID across 8+ genuinely different box types (Cube/
        // Wine/Sales/Tuck/Golf Ball/Business Card/Pillow/Print & Trim
        // Boxes) — the generic live cascade's Size dropdown (fetchList({})
        // with no filters) shows EVERY size across ALL of them mixed
        // together, unscoped. Confirmed live: picking Sales Box's
        // "11.75x1x10" size while viewing the Cube Boxes page kept "Cube
        // Boxes" as the H1 but silently resolved productUuid/price to a
        // Sales Box — a real wrong-product/wrong-price bug, not cosmetic.
        // Fix: rebuild each row's card title using the EXACT SAME pipeline
        // that built the level-3 card grid (CATEGORY_WORD_OVERRIDES →
        // stripSize → BOX_THICKNESS_PREFIX strip) and keep only the rows
        // whose title matches this card's — i.e. this card's true
        // siblings. filteredSizeUuids scopes the visible Size dropdown;
        // allowedProductUuidsOverride scopes the final resolution so
        // getAllowedProducts() never falls back to the WRONG unfiltered
        // list. Also fixes Wine Boxes' "with Handle" merge as a side
        // effect — both variants already produce the identical "Wine
        // Boxes" title, so extractShape()'s shapeList mechanism (which
        // needs both sibling uuids up front) now sees them too.
        const overrides = CATEGORY_WORD_OVERRIDES[category] || []
        const titleFor = (desc: string) => {
          let n = overrides.reduce((d, [pattern, replacement]) => d.replace(pattern, replacement), desc)
          n = stripSize(n, false) || n
          n = n.replace(BOX_THICKNESS_PREFIX, "").trim() || n
          return n
        }
        const { data: allBoxRows } = await supabase
          .from("fourover_products")
          .select("product_uuid, product_description")
          .eq("category_uuid", catUuid)
        const siblings = (allBoxRows || []).filter(
          (p) => titleFor(p.product_description || "") === productName,
        )
        if (siblings.length > 0) {
          allowedProductUuidsOverride = siblings.map((p) => p.product_uuid)
          const siblingSizeTexts = new Set(
            siblings.map((p) => normalizeSizeText(extractSize(p.product_description || ""))),
          )
          filteredSizeUuids = (listResult.data?.size_list || [])
            .filter((s) => siblingSizeTexts.has(normalizeSizeText(s.name)))
            .map((s) => s.uuid)
        }
      } else if (catUuid && baseName) {
        // Same 1000-row PostgREST cap as fetchCategoryProducts above — this
        // query shares Window Graphics' "ae3afb44..." category (1485 rows),
        // so an unpaginated .select() here risks the same silent truncation
        // bug, just affecting the anchor's sibling/Size-dropdown computation
        // instead of the level-4 product list.
        let siblingsRaw: { product_uuid: string; product_description: string; product_code: string }[] = []
        for (let from = 0; ; from += 1000) {
          const { data: page } = await supabase
            .from("fourover_products")
            .select("product_uuid, product_description, product_code")
            .eq("category_uuid", catUuid)
            .range(from, from + 999)
          if (!page || page.length === 0) break
          siblingsRaw = siblingsRaw.concat(page)
          if (page.length < 1000) break
        }
        // Applied to RAW descriptions before computing groupKey, same as
        // print/[category]/page.tsx's productList loop — otherwise whichever
        // sibling happens to win as the clicked representative determines
        // baseKey, and an UN-overridden mislabeled sibling (e.g. Counter
        // Cards' one "...Signs" outlier, or Calendars' missing-stock-name
        // entries) silently drops out of this Size dropdown depending on
        // which uuid the customer happened to land on — not a real fix, just
        // a coincidence of which sibling won the level-3 merge.
        const overrides = CATEGORY_WORD_OVERRIDES[category] || []
        const applyOverrides = (desc: string) => overrides.reduce((d, [pattern, replacement]) => d.replace(pattern, replacement), desc)
        const siblings = reconstructCodeLikeDescriptions(siblingsRaw || []).map((p: any) => ({
          ...p,
          product_description: applyOverrides(p.product_description || ""),
        }))
        // "Standard Announcement Cards" merges 14PT+16PT — kept in sync with
        // print/[category]/page.tsx's matching block. Siblings here are
        // already scoped to catUuid === product.category_uuid, so when the
        // clicked product is a primary-uuid "Standard" entry, this can never
        // pull in an extra-sourced material's own stock differences.
        const stripStandardPt =
          category === "announcement-cards" &&
          product.category_uuid === leaf?.uuid &&
          !/round\s*corner/i.test(product.product_description || "")
        // Booklets' weight merge (CATEGORY_WORD_OVERRIDES strips 60/70/80/
        // 100LB before "Gloss Book"/"Gloss Cover"/"Matte Book") is ALSO
        // genuinely multi-dimensional (size × page count × weight) for the
        // same reason — Dull Book/Premium Opaque aren't merged (each is one
        // weight only, confirmed live), so this only flags the merged ones.
        const isMergedBookletWeight = category === "booklets" && /gloss\s*book|gloss\s*cover|matte\s*book/i.test(product.product_description || "")
        // Greeting Cards' "14PT"/"16PT"/"18PT C1S"/"Greeting Cards on 100LB
        // Gloss Cover" cards each already merge SEVERAL coatings (AQ/UV/
        // Matte/No Coating/Uncoated) at every size — genuinely multi-
        // dimensional (size × coating) for the same reason as the others
        // above, so it needs the live cascade too, not just the ones this
        // session's "Uncoated" middle-modifier fix newly merged in.
        const isGreetingCards = category === "greeting-cards"
        // Notepads' merge spans Stock (Premium Opaque: 60LB+70LB) AND Sheet
        // Count (25/50, resolved via extractShape()'s shapeList mechanism,
        // which only ever populates within the live cascade) — sizeProducts
        // mode would bypass the live cascade entirely and the Sheet Count
        // picker would never appear.
        const isNotepads = category === "notepads"
        // Floor Graphics' Rectangle/Circle merge is the exact same pattern
        // as Notepads' Sheet Count — genuinely 2D (Size × Shape), resolved
        // via extractShape()'s shapeList mechanism, which only ever
        // populates within the live cascade. sizeProducts mode's bySize Map
        // dedupes ONE uuid per size, arbitrarily dropping whichever shape
        // didn't win — confirmed: that left the Shape field stuck showing
        // "Rectangle" even at sizes (12x12, 24x24, 36x36, 48x48) where a
        // Circle product genuinely exists too.
        const isFloorGraphics = category === "floor-graphics"
        // T-Shirts' garment types each merge 2-5 Color variants that ALL
        // share the same single Size/Stock/Coating (confirmed: T-Shirts'
        // own category_uuid has exactly 1 size, 1 stock, 1 coating total) —
        // bySize below would dedupe to a single entry regardless (every
        // color variant extracts the SAME size text), so this flag mainly
        // ensures allowedProductUuidsOverride carries all of a garment
        // type's color siblings instead of just the one clicked uuid,
        // letting extractShape()'s color recognition expose a Color picker.
        const isTShirts = category === "t-shirts"
        // Buttons merges Size × Shape (Round/Diamond/Square/Rectangle) ×
        // Backing (Locking Safety Pin/Magnet) — genuinely multi-dimensional
        // for the same reason as Floor Graphics' Shape merge, resolved via
        // the same extractShape() shapeList mechanism (extended below to
        // also recognize Shape/Backing words).
        const isButtons = category === "buttons"
        // Tote Bags merges 3 Color stocks (Blue/Natural/Red) that ALL share
        // the same single size — bySize would dedupe to one entry
        // regardless, so this just ensures allowedProductUuidsOverride
        // carries all 3 siblings, letting the live cascade's normal Stock
        // dropdown (not shapeList — Color is a real stock_uuid here, no
        // extractShape() involvement needed) resolve to any of the 3.
        const isToteBags = category === "tote-bags"
        const useLiveCascadeAnchor =
          stripStandardPt || isMergedBookletWeight || isGreetingCards || isNotepads || isFloorGraphics || isTShirts || isButtons || isToteBags
        const computeKey = (desc: string) => {
          const k = groupKey(desc, isBusinessCards)
          return stripStandardPt ? k.replace(/\b\d+pt\b/g, "").replace(/\s{2,}/g, " ").trim() : k
        }
        const baseKey = computeKey(applyOverrides(product.product_description || ""))
        const variants = siblings
          .filter((p: any) => computeKey(p.product_description || "") === baseKey)
          .map((p: any) => ({ uuid: p.product_uuid as string, size: extractSize(p.product_description || "", isBusinessCards) }))
        // Keyed lowercase: 4over's own casing for the same dimension isn't
        // consistent ("2.5\" X 3.5\"" vs "2.5\" x 3.5\"" on different
        // stocks of the same product) — without normalizing, those show up
        // as TWO identical-looking "Size" dropdown entries instead of
        // deduping to one.
        const bySize = new Map<string, { uuid: string; size: string }>()
        for (const v of variants) if (!bySize.has(v.size.toLowerCase())) bySize.set(v.size.toLowerCase(), v)
        const list = [...bySize.values()].sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
        if (!useLiveCascadeAnchor && list.length > 1) {
          // The real distinguishing factor between variants here IS Size
          // (e.g. Hang Tags' plain sizes) — sizeProducts mode (direct
          // uuid-per-size switching) is the right fit, skipping the live
          // cascade entirely.
          sizeProducts = list
        } else {
          // Either genuinely multi-dimensional (e.g. "Standard Announcement
          // Cards" is 5 sizes × 2 stocks, confirmed live on fourprintshop —
          // sizeProducts mode models Size as the ONLY switchable dimension,
          // so deduping by size would silently drop whichever stock/weight
          // didn't win the dedup at each size), OR this clicked product is
          // the ONLY size in its merged group (e.g. "2-part NCR Form Pads w
          // Wraparound Cover" only exists at 8.5x11 — its "Plain" sibling
          // at 5.5x8.5 has a genuinely different groupKey and correctly
          // never reached `variants`). Either way, without anchoring, the
          // live cascade's default size_list[0]/stock_list[0] (first
          // alphabetically across the WHOLE category_uuid) can land on a
          // totally different product line sharing this category_uuid —
          // confirmed on NCR Forms: it silently resolved to "2 Part" when
          // the customer clicked "3 Part with Wraparound Cover", same bug
          // class as Boxes & Packaging, just not caught there originally.
          // Use the SAME live-cascade + allowedProductUuids + 3-level
          // anchor approach as TYPE_RULES categories (e.g. All Inclusive
          // Flyers), which natively supports independent Size AND Stock
          // dropdowns — allowedProductUuidsOverride is the full merged
          // group when one exists, or just this one clicked product when
          // it's the sole representative of its group.
          allowedProductUuidsOverride = useLiveCascadeAnchor ? variants.map((v) => v.uuid) : [product.product_uuid]
          // Buttons' single-dimension entries ("1\" Round Promotional
          // Buttons...", no "AxB" pattern) never match SIZE_DIM alone —
          // same gap as the TYPE_KEYWORDS branch's Table Runners fix below,
          // just not previously hit in THIS (sizeGrouped) branch since no
          // prior category here had a bare single-dimension size.
          const dimMatch =
            (product.product_description || "").match(SIZE_DIM) ||
            (product.product_description || "").match(/\d+(?:\.\d+)?\s*["”']/)
          // A bare single-dimension match (no "AxB") normalizes to a lone
          // number ("1") — too ambiguous as a startsWith prefix since it
          // ALSO matches "1.25x1.25" (the boundary char after "1" is "."
          // there, which sizeStartsWith's non-digit check happily allows).
          // Doubling it into "1x1" makes the prefix match exact-or-nothing.
          const dimText = dimMatch?.[0] || ""
          const sizeText = dimText
            ? dimText.includes("x") || dimText.includes("X")
              ? normalizeSizeText(dimText)
              : normalizeSizeText(`${dimText}x${dimText}`)
            : ""
          const listResult = sizeText ? await getCategoryProductsList({ category_uuid: catUuid }) : null
          if (listResult?.success) {
            const sizeMatch = listResult.data?.size_list?.find((s) => sizeStartsWith(normalizeSizeText(s.name), sizeText))
            if (sizeMatch) {
              initialSizeUuid = sizeMatch.uuid
              const stockListResult = await getCategoryProductsList({ category_uuid: catUuid, size_uuid: sizeMatch.uuid })
              const stocks = stockListResult.success ? stockListResult.data?.stock_list || [] : []
              const allowedUuids = new Set(allowedProductUuidsOverride)
              // Each categoryproductslist round-trip costs ~350-950ms (4over
              // sandbox API latency, not our own CPU) — probing stocks one
              // at a time, awaiting each before trying the next, made this
              // anchor block dominate page load for any category with more
              // than 1-2 stocks (confirmed: T-Shirts' SSR took ~2.9s warm,
              // matching ~4 sequential round-trips). Firing every stock (and
              // every coating within it) in parallel up front, then picking
              // the lowest-index hit, gets the same "first stock, first
              // coating" result in the time of the SLOWEST single request
              // instead of the SUM of all of them.
              const stockResults = await Promise.all(
                stocks.map((stock) => getCategoryProductsList({ category_uuid: catUuid, size_uuid: sizeMatch.uuid, stock_uuid: stock.uuid })),
              )
              const noCoatingHitIdx = stockResults.findIndex(
                (stockResult, i) =>
                  stockResult.success &&
                  (stockResult.data?.coating_list || []).length === 0 &&
                  (stockResult.data?.products || []).some((p: any) => allowedUuids.has(p.product_uuid)),
              )
              if (noCoatingHitIdx >= 0) {
                initialStockUuid = stocks[noCoatingHitIdx].uuid
              } else {
                const coatingProbeMeta: { stockIdx: number; coatingIdx: number }[] = []
                const coatingProbePromises = stockResults.flatMap((stockResult, stockIdx) => {
                  if (!stockResult.success) return []
                  const coatings = stockResult.data?.coating_list || []
                  return coatings.map((coating, coatingIdx) => {
                    coatingProbeMeta.push({ stockIdx, coatingIdx })
                    return getCategoryProductsList({
                      category_uuid: catUuid,
                      size_uuid: sizeMatch.uuid,
                      stock_uuid: stocks[stockIdx].uuid,
                      coating_uuid: coatings[coatingIdx].uuid,
                    })
                  })
                })
                const coatingProbes = await Promise.all(coatingProbePromises)
                let bestHit = -1
                for (let i = 0; i < coatingProbes.length; i++) {
                  const probe = coatingProbes[i]
                  if (!probe.success || !(probe.data?.products || []).some((p: any) => allowedUuids.has(p.product_uuid))) continue
                  if (bestHit === -1 || coatingProbeMeta[i].stockIdx < coatingProbeMeta[bestHit].stockIdx) bestHit = i
                }
                if (bestHit >= 0) {
                  const { stockIdx, coatingIdx } = coatingProbeMeta[bestHit]
                  initialStockUuid = stocks[stockIdx].uuid
                  initialCoatingUuid = (stockResults[stockIdx].data?.coating_list || [])[coatingIdx]?.uuid
                }
              }
            }
          }
        }
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
              {leaf && leaf.name !== productName && <><Link href={`/print/${category}`} className="hover:text-[#e42a27]">{leaf.name}</Link><span className="mx-2">&gt;</span></>}
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
              <div className="mt-6">
                <ProductInfoTabs
                  categoryUuid={product.category_uuid || leaf?.uuid || ""}
                  productUuid={product.product_uuid}
                  productName={productName}
                  content={productContent ?? null}
                  isBusinessCards={isBusinessCards}
                />
              </div>
            </div>
            <ProductConfiguratorClient
              categoryUuid={product.category_uuid || leaf?.uuid || ""}
              categorySlug={category}
              productName={productName}
              allowedProductUuids={allowedProductUuidsOverride || [product.product_uuid]}
              filteredSizeUuids={filteredSizeUuids}
              isBanner={["indoor-banners","outdoor-banners","rigid-signs","window-graphics","vehicle-magnets"].includes(category)}
              hiddenGroups={
                leaf?.parentSlug === "signs-banners" ? SIGNS_HIDDEN_GROUPS :
                isAllInclusive ? ALL_INCLUSIVE_HIDDEN_GROUPS :
                category === "postcards" ? POSTCARDS_HIDDEN_GROUPS :
                GENERAL_HIDDEN_GROUPS
              }
              sizeProducts={sizeProducts}
              initialSizeUuid={initialSizeUuid}
              initialStockUuid={initialStockUuid}
              initialCoatingUuid={initialCoatingUuid}
              isBusinessCards={isBusinessCards}
              isAllInclusive={isAllInclusive}
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

  async function fetchCategoryProducts(uuid: string) {
    // Paginate by ACTUAL rows returned per page — see [category]/page.tsx comment.
    let rows: { product_uuid: string; product_description: string; product_code: string }[] = []
    const PAGE_SIZE = 1000
    let from = 0
    while (true) {
      const { data: page } = await supabase
        .from("fourover_products")
        .select("product_uuid, product_description, product_code")
        .eq("category_uuid", uuid)
        .range(from, from + PAGE_SIZE - 1)
      if (!page || page.length === 0) break
      rows = rows.concat(page)
      from += page.length
    }

    if (!rows || rows.length === 0) {
      console.log("[v0] No products in DB for category", uuid, "- fetching from 4over API...")
      const apiResult = await getAllProductsForCategory(uuid)
      if (apiResult.success && apiResult.data?.entities?.length > 0) {
        const apiProducts = apiResult.data.entities
        console.log("[v0] Got", apiProducts.length, "products from 4over API")

        const productsToInsert = apiProducts.map((p: any) => ({
          product_uuid: p.product_uuid,
          product_description: p.product_description,
          product_code: p.product_code,
          category_uuid: uuid,
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
    // Tag every row with the uuid it was actually queried from — a type
    // sourced entirely from an EXTRA_PRODUCT_SOURCES entry (e.g. "EndurACE
    // Door Hangers") lives in a DIFFERENT real category_uuid than this page's
    // own `categoryUuid` (leaf.uuid). Without this, the configurator's live
    // Size/Stock/Coating cascade queries the WRONG category — its
    // allowedProductUuids filter then silently falls back to ANY product
    // reachable there, the same "looks fine, prices the wrong item" bug
    // fixed earlier for All Inclusive Flyers/Postcards, just one layer up
    // (wrong UUID entirely, not just the wrong stock within the right one).
    return (rows || []).map((r) => ({ ...r, category_uuid: uuid }))
  }

  let allProducts: { product_uuid: string; product_description: string; product_code: string; category_uuid: string }[] =
    await fetchCategoryProducts(categoryUuid)

  // Kept in sync with print/[category]/page.tsx's matching filter — see
  // that file's comment for why.
  if (category === "rigid-signs") {
    allProducts = allProducts.filter((p) => !matchesAllKeywords(p.product_description, "counter card"))
  }

  // Kept in sync with print/[category]/page.tsx's matching filter — 18oz
  // Blockout entries live in indoor-banners' own UUID but 4over.com
  // displays them under Outdoor Banners; excluded here, re-added to
  // outdoor-banners via EXTRA_PRODUCT_SOURCES below.
  if (category === "indoor-banners") {
    allProducts = allProducts.filter((p) => !matchesAllKeywords(p.product_description, "18oz"))
  }

  // Kept in sync with print/[category]/page.tsx's matching filter —
  // Stickers and Bumper Stickers share the SAME UUID, split by "bumper".
  if (category === "stickers") {
    allProducts = allProducts.filter((p) => !matchesAllKeywords(p.product_description, "bumper"))
  }

  // Kept in sync with EXTRA_PRODUCT_SOURCES in print/[category]/page.tsx —
  // see that file's comment for why ("Tearoff Flyers"' real data lives in
  // the Tear Off Cards category, not flyers-and-brochures' own).
  const extraSources = EXTRA_PRODUCT_SOURCES[category]
  if (extraSources && extraSources.length > 0) {
    const extraLists = await Promise.all(
      extraSources.map(async (src) => {
        const rows = await fetchCategoryProducts(src.uuid)
        return rows.filter((p) => matchesAllKeywords(p.product_description, src.keyword))
      }),
    )
    allProducts = [...allProducts, ...extraLists.flat()]
  }
  // Posters' "Backlit"/"Gloss Book" sources both contain a handful of pure-
  // product_code descriptions (see reconstructCodeLikeDescriptions' own
  // comment) — without this, classifyProduct() still buckets them
  // correctly (the raw code happens to contain no OTHER type's keyword
  // either), but the 3-level anchor below extracts a SIZE_DIM with no
  // quote marks ("11.5X17.5") that never matches the live size_list's
  // quoted names ("11.5\" x 17.5\""), silently failing to anchor at all —
  // confirmed: that left "Gloss Book Posters" resolving to a "100LB Dull
  // Book" product on the unanchored default.
  // Table Covers' "Table Cloths" type has the same code-like-description
  // gap, but ALL 4 of its own entries are equally code-like — no clean
  // sibling exists for reconstructCodeLikeDescriptions to template from.
  // Targeted regex instead, parsing the code pattern directly (confirmed
  // against fourprintshop's own live Size dropdown: 68x132/68x156/90x132/
  // 90x156, all 4 present). MUST run BEFORE reconstructCodeLikeDescriptions
  // below, not after — 2 of these 4 raw descriptions have trailing \r\n
  // garbage ("9OZPOLY-TABLETHROW-90X132\r\n") that makes
  // CODE_LIKE_DESCRIPTION's strict `$` anchor fail to recognize them as
  // code-like, so the generic function mistook ONE of them for a genuine
  // clean template and used it (whitespace garbage and all) to "fix" the
  // other, otherwise-already-clean entries — producing a mangled hybrid
  // ("9OZPOLY-TABLETHROW-68\" x 132\"") that matched neither "table cloth"
  // nor anything else, silently falling into the Table Runners catch-all
  // and resolving prices for the wrong product line. Fixing this category's
  // own entries FIRST means reconstructCodeLikeDescriptions has nothing
  // code-like left here to find a bad template for.
  allProducts = allProducts.map((p) => {
    const m = p.product_description.match(/^9OZPOLY-TABLETHROW-(\d+)X(\d+)\s*$/i)
    return m ? { ...p, product_description: `Table Cloth - 9oz Premium Polyester - ${m[1]}" x ${m[2]}"` } : p
  })
  // Posters' "Backlit"/"Gloss Book" sources both contain a handful of pure-
  // product_code descriptions (see reconstructCodeLikeDescriptions' own
  // comment) — without this, classifyProduct() still buckets them
  // correctly (the raw code happens to contain no OTHER type's keyword
  // either), but the 3-level anchor below extracts a SIZE_DIM with no
  // quote marks ("11.5X17.5") that never matches the live size_list's
  // quoted names ("11.5\" x 17.5\""), silently failing to anchor at all —
  // confirmed: that left "Gloss Book Posters" resolving to a "100LB Dull
  // Book" product on the unanchored default.
  allProducts = reconstructCodeLikeDescriptions(allProducts)

  // Filter to this type using keyword matching. Classification is ORDER-
  // DEPENDENT (first matching rule in TYPE_KEYWORDS[category] wins) so this
  // stays consistent with classifyProduct() in print/[category]/page.tsx —
  // otherwise a later/broader rule (e.g. a size keyword that's also present
  // in an earlier rule's products, like "5.25\" x 10.5\" ... Natural ...")
  // would double-match products that actually belong to an earlier type.
  const typeRules = Object.entries(TYPE_KEYWORDS[category] || {})
  const typeLabel = TYPE_LABELS[typeSlug] || typeSlug.replace(/-/g, " ")

  // Kept in sync with print/[category]/page.tsx's own TypeRule.excludeSizePrefixes
  // -- see that entry's comment for the full explanation (2026-07-10, Postcards).
  const EXCLUDE_SIZE_PREFIXES: Record<string, Record<string, string[]>> = {
    postcards: {
      "16pt-postcards": ['1.5" X 7"', '2" X 7"', '2" X 8"', '2.5" X 8"', '2.5" X 8.5"', '2.75" X 8.5"', '3.66" X 4.25"'],
      "14pt-postcards": ['1.5" X 7"', '2" X 7"', '2" X 8"', '2.5" X 8"', '2.5" X 8.5"', '2.75" X 8.5"'],
      "18pt-postcards": ['2" X 8"', '2.125" X 5.5"', '2.75" X 4.25"', '3.66" X 4.25"', '3.667" X 8.5"'],
    },
  }

  function classifyType(description: string): string | null {
    const lower = description.toLowerCase()
    const excludeMap = EXCLUDE_SIZE_PREFIXES[category]
    for (const [slug, kws] of typeRules) {
      if (excludeMap?.[slug]?.some((p) => description.startsWith(p))) continue
      if (kws.length === 0) return slug // catch-all
      if (kws.some((k) => lower.includes(k))) return slug
    }
    return null // no rule matched and no catch-all — matches old behavior (excluded from every type)
  }

  // Option-preset virtual types (EDDM Full Service/Print Only, Tri Fold/Z
  // Fold/Specialty Folds Brochures) classify against their BASE type's slug
  // (same product set as e.g. "Flat Flyers Brochures" or the internal
  // "eddm-flyers-base"), not their own — see OPTION_PRESET_TYPES' comment.
  const optionPreset = OPTION_PRESET_TYPES[category]?.find((p) => p.slug === typeSlug)
  const classifySlug = optionPreset ? optionPreset.baseSlug : typeSlug

  const matchedProducts = (allProducts || [])
    .filter((p) => (typeRules.length === 0 ? true : classifyType(p.product_description) === classifySlug))
    .sort((a, b) => a.product_description.localeCompare(b.product_description))

  // Get option groups for the FIRST product (they share the same option structure)
  // Size selector will be derived from the list of matched products
  const firstProduct = matchedProducts[0]
  // Raw lowercased descriptions of every product classified into THIS type —
  // handed to the client so it can filter Stock/Coating options by name
  // freshly every time it fetches a NEW list for whichever Size the user
  // has currently selected, rather than relying on a server-computed
  // snapshot tied to one specific anchor size. Confirmed necessary
  // (2026-07-09, Foil Worx Business Cards): a stock/coating filter computed
  // from just one candidateSize's own raw stock_list can never include a
  // stock that only exists at a DIFFERENT (still valid, still selectable)
  // size — e.g. Foil Worx's "32PT Uncoated" stock only appears in the raw
  // stock_list at Size="2\" x 3.5\"", so a filter built while the anchor
  // probe was examining a different size silently excluded it, even though
  // the text-matching logic itself was correct.
  const matchedProductTexts = matchedProducts.map((p) => p.product_description.toLowerCase())
  let optionGroups: any[] = []

  // A type sourced entirely from an EXTRA_PRODUCT_SOURCES entry (e.g.
  // "EndurACE Door Hangers") has its REAL data in a different category_uuid
  // than this page's own `categoryUuid` (leaf.uuid) — every fetched row
  // carries its actual source uuid (tagged in fetchCategoryProducts above),
  // so use THAT for the live cascade instead of always leaf.uuid. See
  // fetchCategoryProducts' comment for the bug this avoids.
  const effectiveCategoryUuid = firstProduct?.category_uuid || categoryUuid

  // Anchor Size+Stock to a combo this TYPE's own products actually use —
  // the live cascade's default ("first size, then first stock at that size")
  // can land on a stock this type doesn't use at all (e.g. "All Inclusive
  // Flyers and Brochures" only exists on "100GLB"/"100DB"/... stocks, but
  // the category's first stock alphabetically is plain "60LB"). When that
  // happens, ProductConfiguratorClient's allowedProductUuids filter silently
  // falls back to ANY product at that stock — the page still shows a price,
  // just for the wrong product type. See initialStockUuid's doc comment.
  const isSignsBanners = leaf?.parentSlug === "signs-banners"
  const isBusinessCardsType = (leaf?.parentSlug === "business-cards" &&
    category !== "oval-cards" && category !== "fold-over-cards") || category === "floor-graphics"
  const isAllInclusiveType = typeSlug.includes("all-inclusive") || category === "flyers-and-brochures" || category === "trading-cards"
  let initialSizeUuid: string | undefined
  let initialStockUuid: string | undefined
  let initialCoatingUuid: string | undefined
  let filteredSizeUuids: string[] | undefined
  // Same reasoning as filteredSizeUuids, extended to Stock/Coating: without
  // this, e.g. All-Inclusive Postcards' Stock/Coating dropdowns showed every
  // stock/coating from the whole "Postcards" category (6 stocks, 5 coatings)
  // instead of just the 2 stocks / 3 coatings this type actually uses —
  // confirmed (2026-07-08) as a genuine WRONG-PRICE bug, not just a cosmetic
  // one: picking one of the unscoped options (e.g. "Aqueous Coating", which
  // no real All-Inclusive product uses) hits getAllowedProducts()'s
  // `allowed.length > 0 ? allowed : list` fallback in
  // product-configurator-client.tsx, which silently returns the FULL
  // unfiltered product list and resolves to a completely different postcard
  // type (confirmed: selecting it made a "Scoring Options" field appear —
  // that field belongs to a different postcard type entirely, not All-
  // Inclusive). Computed below from the SAME stock/coating probe results the
  // initialStockUuid/initialCoatingUuid resolution already fetches, so this
  // costs no extra API calls.
  // Stock/Coating filtering itself now lives entirely client-side, driven
  // by `matchedProductTexts` above — see that declaration's comment. The
  // stock/coating probing below is still needed to resolve
  // initialStockUuid/initialCoatingUuid (which combo to anchor the page on).
  // Signs-banners uses sizeProducts mode (Size dropdown → direct product_uuid),
  // so the live-cascade anchor (initialSizeUuid/Stock/Coating) is not needed
  // and the expensive 4over API probe calls below can be skipped entirely.
  if (!isSignsBanners && typeRules.length > 0 && firstProduct) {
    // Bare SIZE_DIM match only — NOT extractSize(), whose RAISED_SIDE_SUFFIX
    // suffix-appending (for Raised Foil's Size-dropdown disambiguation) would
    // misfire here on an unrelated COATING phrase that happens to also end in
    // "on both sides" (e.g. "...100LB GLOSS BOOK with AQ on both sides"),
    // appending "(On Both Sides)" to the size and breaking the size_list
    // lookup below for no reason — this anchor only needs the bare dimension.
    // Table Runners' own description ("Table Runner - 9oz Premium
    // Polyester - 24\" Width") only states ONE dimension — SIZE_DIM (which
    // requires a "WxH" pattern) never matches, leaving this anchor a no-op
    // and the live cascade's unanchored default silently landing on a
    // completely different product line (Table Cloths, sharing the same
    // category_uuid and stock). The live size_list, confirmed, names this
    // SAME product "24\" x 84\"" (4over fills in the implicit depth there
    // even though the description never mentions it) — so falling back to
    // just the width number + quote is enough for startsWith() below to
    // still find it.
    const dimMatch = firstProduct.product_description.match(SIZE_DIM) || firstProduct.product_description.match(/\d+(?:\.\d+)?\s*["”']/)
    const sizeText = dimMatch ? normalizeSizeText(dimMatch[0]) : ""
    const listResult = await getCategoryProductsList({ category_uuid: effectiveCategoryUuid })
    if (listResult?.success) {
      // For non-catch-all TYPE_KEYWORDS types, restrict the SIZE dropdown to
      // only sizes that the matched products actually use. The live
      // Stock/Coating cascade still runs normally — only the visible size list
      // is narrowed (e.g. All-Inclusive Postcards: 4 sizes, not 50+).
      // Catalogs' "size" isn't just WxH — Saddle Stitch and Perfect Bound
      // catalogs share the SAME two bare dimensions ("8.5x11"/"5.5x8.5") but
      // occupy DIFFERENT page-count ranges (Saddle Stitch: 8-52 pages,
      // Perfect Bound: 28-92), and the live size_list names each entry
      // "8.5\" x 11\"- 36 page" (page count is part of the size identity).
      // Bare SIZE_DIM extraction (below, dimension only) can never
      // distinguish these — confirmed wrong-price bug (2026-07-09): Saddle
      // Stitch Catalogs' Size dropdown showed all 42 combos from BOTH
      // catalog types, and picking a Perfect-Bound-only page count (e.g.
      // "8.5\" x 11\"- 92 page") silently resolved to a real Perfect Bound
      // product ("Binding Type: Perfect Bound") while still on the Saddle
      // Stitch page. Grabbing the trailing "-N page"/"-N Page" suffix when
      // present (most descriptions have it right after the dimension: '8.5"
      // X 11" -40 Page Saddle Stitch...') makes the extracted size identity
      // as specific as the size_list's own naming, so the exact-match below
      // correctly discriminates; categories without this suffix pattern are
      // unaffected (the optional group just doesn't match anything).
      const SIZE_DIM_WITH_PAGE = new RegExp(SIZE_DIM.source + "\\s*-?\\s*\\d+\\s*page", "i")
      const extractSizeIdentity = (desc: string) => desc.match(SIZE_DIM_WITH_PAGE)?.[0] || desc.match(SIZE_DIM)?.[0]
      // Was gated on `currentTypeKws.length > 0` (skip catch-all types) —
      // removed that gate: a catch-all's matchedProducts is ALREADY the
      // correctly-classified narrower set (everything NOT claimed by an
      // earlier, more specific rule; classifyProduct() checks rules in
      // order), so it's just as safe to scope Size from it as any other
      // type. Confirmed as a real gap (2026-07-09): Perfect Bound Catalogs
      // (Catalogs' own catch-all) kept showing all 42 sizes from BOTH
      // catalog types even after fixing Saddle Stitch's non-catch-all
      // filtering above — the guard was skipping it specifically because it
      // has no keywords, not because narrowing would be wrong for it.
      // firstProduct being truthy (checked above) guarantees at least one
      // matchedProducts entry, so this can't collapse to an accidental
      // "show everything" via an empty result.
      if (!isSignsBanners) {
        const matchedSizeTexts = new Set(
          matchedProducts
            .map((p) => extractSizeIdentity(p.product_description))
            .filter(Boolean)
            .map((s) => normalizeSizeText(s!).replace(/\s*-\s*/g, "-"))
        )
        filteredSizeUuids = (listResult.data?.size_list || [])
          .filter((s) => matchedSizeTexts.has(normalizeSizeText(s.name).replace(/\s*-\s*/g, "-")))
          .map((s) => s.uuid)
      }

      // startsWith, not exact equality: some size_list entries carry a
      // descriptive suffix the bare dimension doesn't have (e.g. "8.5\" x
      // 22\"- 4 page" for Half-Fold Brochures' 4-page fold pattern).
      // If the category declares a preferredSizeText (e.g. '2" x 3.5"' for
      // Standard BC), that size wins over the first-alphabetical-product size.
      const preferredSizeEntry = leaf?.preferredSizeText
        ? listResult.data?.size_list?.find((s) => sizeStartsWith(normalizeSizeText(s.name), normalizeSizeText(leaf.preferredSizeText!)))
        : undefined
      const sizeMatch = preferredSizeEntry
        ?? (sizeText ? listResult.data?.size_list?.find((s) => sizeStartsWith(normalizeSizeText(s.name), sizeText)) : undefined)
      const allowedUuids = new Set(matchedProducts.map((p) => p.product_uuid))
      // Flags' own description states a LINEAR size ("Feather Flag - 10ft -
      // 3oz Polyester") that has ZERO textual correlation to the live
      // size_list's literal WxH name ("32\" x 99\"") — there's no dimension
      // text to extract at all, so sizeMatch is never found. Try the
      // text-matched size first when one exists (the common, cheap case for
      // every other category), then fall back to trying EVERY size in the
      // category sequentially — stopping at the first one whose Stock (and
      // Coating, if any) actually resolves to a product this type uses.
      const candidateSizes = sizeMatch
        ? [sizeMatch, ...(listResult.data?.size_list || []).filter((s) => s.uuid !== sizeMatch.uuid)]
        : listResult.data?.size_list || []
      // Sequential over candidate sizes AND stocks (stop at the first hit),
      // parallel over each stock's own coatings — a stock can ALSO have a
      // coating this type doesn't use (e.g. "All Inclusive Postcards" exists
      // on "14PT" stock, but not every coating "14PT" offers), so the
      // stock-level products (no coating filter) aren't a reliable enough
      // check on their own.
      // Each categoryproductslist round-trip costs ~350-950ms (4over sandbox
      // API latency) — probing stocks one at a time within a size, awaiting
      // each before trying the next, made this anchor block a major chunk of
      // page load for any category with more than 1-2 stocks per size.
      // Firing every stock (and every coating within it) in parallel, then
      // picking the lowest-index hit, gets the same "first stock, first
      // coating" result in the time of the SLOWEST single request instead
      // of the SUM of all of them. The outer sizes loop stays sequential —
      // sizeMatch puts the real candidate first, so it's the only iteration
      // that runs for every category except Flags-style brute force.
      outer: for (const candidateSize of candidateSizes) {
        const stockListResult = await getCategoryProductsList({ category_uuid: effectiveCategoryUuid, size_uuid: candidateSize.uuid })
        const stocks = stockListResult.success ? stockListResult.data?.stock_list || [] : []
        const stockResults = await Promise.all(
          stocks.map((stock) => getCategoryProductsList({ category_uuid: effectiveCategoryUuid, size_uuid: candidateSize.uuid, stock_uuid: stock.uuid })),
        )
        const noCoatingHitIdx = stockResults.findIndex(
          (stockResult) =>
            stockResult.success &&
            (stockResult.data?.coating_list || []).length === 0 &&
            (stockResult.data?.products || []).some((p: any) => allowedUuids.has(p.product_uuid)),
        )
        if (noCoatingHitIdx >= 0) {
          initialSizeUuid = candidateSize.uuid
          initialStockUuid = stocks[noCoatingHitIdx].uuid
          break outer
        }
        const coatingProbeMeta: { stockIdx: number; coatingIdx: number }[] = []
        const coatingProbePromises = stockResults.flatMap((stockResult, stockIdx) => {
          if (!stockResult.success) return []
          const coatings = stockResult.data?.coating_list || []
          return coatings.map((coating, coatingIdx) => {
            coatingProbeMeta.push({ stockIdx, coatingIdx })
            return getCategoryProductsList({
              category_uuid: effectiveCategoryUuid,
              size_uuid: candidateSize.uuid,
              stock_uuid: stocks[stockIdx].uuid,
              coating_uuid: coatings[coatingIdx].uuid,
            })
          })
        })
        const coatingProbes = await Promise.all(coatingProbePromises)
        let bestHit = -1
        for (let i = 0; i < coatingProbes.length; i++) {
          const probe = coatingProbes[i]
          if (!probe.success || !(probe.data?.products || []).some((p: any) => allowedUuids.has(p.product_uuid))) continue
          if (bestHit === -1 || coatingProbeMeta[i].stockIdx < coatingProbeMeta[bestHit].stockIdx) bestHit = i
        }
        if (bestHit >= 0) {
          const { stockIdx, coatingIdx } = coatingProbeMeta[bestHit]
          initialSizeUuid = candidateSize.uuid
          initialStockUuid = stocks[stockIdx].uuid
          initialCoatingUuid = (stockResults[stockIdx].data?.coating_list || [])[coatingIdx]?.uuid
          break outer
        }
      }
    }
  }

  const signsSizeProducts = isSignsBanners && matchedProducts.length > 0
    ? buildSignSizeProducts(matchedProducts)
    : undefined

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
            {/* Skip the subcategory segment when it's the SAME label as the
                type (e.g. a single-type subcategory named "Standard X" whose
                only type is ALSO "Standard X") — showing both back-to-back
                reads as an accidental duplicate. */}
            {leaf && leaf.name !== typeLabel && <><Link href={`/print/${category}`} className="hover:text-[#e42a27]">{leaf.name}</Link><span className="mx-2">&gt;</span></>}
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
            {/* Left: product image + info tabs */}
            <div>
              <div className="aspect-square w-full max-w-[360px] bg-slate-100 rounded overflow-hidden border border-slate-200">
                <img
                  src={TYPE_IMAGES[category]?.[typeSlug] || leaf?.image || "/images/products/product-default.jpg"}
                  alt={typeLabel}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-6">
                <ProductInfoTabs
                  categoryUuid={effectiveCategoryUuid}
                  productUuid={firstProduct?.product_uuid}
                  productName={typeLabel}
                  content={productContent ?? null}
                  isBusinessCards={isBusinessCardsType}
                />
              </div>
            </div>

            {/* Right: configurator driven live by categoryproductslist + productquote */}
            <div>
              <ProductConfiguratorClient
                categoryUuid={effectiveCategoryUuid}
                categorySlug={category}
                productName={typeLabel}
                allowedProductUuids={matchedProducts.map((p) => p.product_uuid)}
                hiddenGroups={
                  isSignsBanners ? SIGNS_HIDDEN_GROUPS :
                  isAllInclusiveType ? ALL_INCLUSIVE_HIDDEN_GROUPS :
                  category === "postcards" ? POSTCARDS_HIDDEN_GROUPS :
                  GENERAL_HIDDEN_GROUPS
                }
                sizeProducts={signsSizeProducts}
                filteredSizeUuids={signsSizeProducts ? undefined : filteredSizeUuids}
                matchedProductTexts={signsSizeProducts ? undefined : matchedProductTexts}
                initialSizeUuid={signsSizeProducts ? undefined : initialSizeUuid}
                initialStockUuid={signsSizeProducts ? undefined : initialStockUuid}
                initialCoatingUuid={signsSizeProducts ? undefined : initialCoatingUuid}
                isBusinessCards={isBusinessCardsType}
                isAllInclusive={isAllInclusiveType}
                isBanner={["indoor-banners","outdoor-banners","rigid-signs","window-graphics","vehicle-magnets"].includes(category)}
                preferredExtraOption={optionPreset ? { groupNameMatch: optionPreset.optionGroupMatch.source, optionNameMatch: optionPreset.optionMatch.source } : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
