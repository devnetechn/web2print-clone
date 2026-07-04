// Maps raw 4over API option codes → human-readable display labels matching
// the exact names shown on 4over.com's price calculator.
// The wholesale API (categoryproductslist / baseprices) returns short codes;
// this table expands them so our storefront matches 4over's retail labels.

// ─── COATING ──────────────────────────────────────────────────────────────────
// API returns: AQ, SA, UC, UV (and variants)
// 4over.com shows: Aqueous Coating, Satin Aqueous, No Coating, UV on 4-color side
const COATING_LABELS: Record<string, string> = {
  AQ: "Aqueous Coating",
  SA: "Satin Aqueous",
  SAT: "Satin Aqueous",
  UC: "No Coating",
  UV: "UV Coating",
  GUV: "UV on 4-color side",
  UVF: "UV Coating Front Only",
  UVFR: "UV Coating Front Only",
  UVBK: "UV Coating Back Only",
  UVFS: "UV Coating Front Only",
  MF: "Matte",
  MAT: "Matte",
  MATT: "Matte",
  MATTE: "Matte",
  DF: "Dull Finish",
  "MATTE/DULL": "Matte/Dull Finish",
  ST: "Soft Touch",
  SUV: "Spot UV",
  SPUV: "Spot UV",
  SPUVFR: "Spot UV Front Only",
  SPUVBK: "Spot UV Back Only",
  NC: "No Coating",
  NONE: "No Coating",
  "N/A": "No Coating",
  "NO COATING": "No Coating",
  GLM: "Gloss Lamination",
  VLM: "Velvet Lamination",
}

// ─── STOCK ────────────────────────────────────────────────────────────────────
// API returns short codes like 14PT, 14PTUC, 100GLB, 100DB, etc.
// 4over.com shows full descriptive names.
const STOCK_LABELS: Record<string, string> = {
  // ── Business Card stocks ──
  "14PT": "14PT C2S",
  "14PTUC": "14PT Uncoated",
  "14PTC2S": "14PT C2S",
  "14PTGLS": "14PT C2S",
  "16PT": "16PT C2S",
  "16PTC2S": "16PT C2S",
  "18PT": "18PT C1S",
  "18PTC1S": "18PT C1S",
  // ── Flyer / Brochure stocks ──
  // Gloss
  "100GLB": "100LB Gloss Book",
  "100GLC": "100LB Gloss Cover",
  "100GLBC": "100LB Gloss Cover",
  "80GLB": "80LB Gloss Book",
  "80GLC": "80LB Gloss Cover",
  "70GLB": "70LB Gloss Book",
  // Matte / Dull
  "100DB": "100LB Dull Book",
  "100MTTB": "100LB Matte Book",
  "100MB": "100LB Matte Book",
  "80DB": "80LB Dull Book",
  "80MB": "80LB Matte Book",
  "80MTTB": "80LB Matte Book",
  // Uncoated / Opaque text
  "60LB": "60LB Premium Opaque",
  "60LBT": "60LB Premium Opaque",
  "60PO": "60LB Premium Opaque",
  "70LB": "70LB Premium Opaque",
  "70LBT": "70LB Premium Opaque",
  "70PO": "70LB Premium Opaque",
  "80LB": "80LB Book",
  "80LBT": "80LB Text",
  "90LBT": "90LB Text",
  "100LB": "100LB Cover",
  "100LBT": "100LB Text",
  "100CVR": "100LB Cover",
  // Specialty
  "KRAFT": "Brown Kraft",
  "LINEN": "Linen Uncoated",
  "SILK": "Silk",
  "SUEDE": "Suede",
  "PEARL": "Pearl",
  "PLASTIC": "Plastic",
  "AKUAFOIL": "Akuafoil",
  "ENDURANCE": "EndurACE",
  "ENDURANCE ACE": "EndurACE",
  // ── Specialty Business Card stocks ──
  "14PTPM": "14PT Pearl Metallic",
  "14PTNT": "14PT Natural",
  "32PTUC": "32PT Uncoated",
  "18PTUCKRAFT": "18PT Uncoated Kraft",
  "10PT": "10PT",
  "CNP": "Crack 'N' Peel",
  // ── Plastic Cards ──
  "20PTCL": "20PT Clear Plastic",
  "20PTFR": "20PT Frosted Plastic",
  "20PTWH": "20PT White Plastic",
  "20PTPM": "20PT Pearl/Metallic Plastic",
  // ── Linen/Natural/Pearl text stocks ──
  "100LB COVER LINEN": "100LB Linen Cover",
  "60LB UNCOATED TEXT": "60LB Uncoated Text",
  "70LB LINEN": "70LB Linen",
  "70LB NATURAL": "70LB Natural",
  "70LB PEARL": "70LB Pearl",
  // ── Envelope / NCR / misc paper stocks ──
  "24LB": "24LB Bond",
  "20LB2P": "20LB 2-Part NCR",
  "20LB3P": "20LB 3-Part NCR",
  // ── Magnetic ──
  "MAGNET": "Magnetic",
  "30MIL": "30mil Magnetic",
  // ── Rigid Signs ──
  "3PVC": "3mm PVC",
  "316FC": "3/16 Foam Core",
  "4CORO": "4mm White Coroplast",
  "10CORO": "10mm White Coroplast",
  "15STYRENE": "0.015 inch White Styrene",
  "316GATORBLACK": '3/16" Black Gator Board',
  "316GATORWHITE": '3/16" White Gator Board',
  // ── Banners & Flags ──
  "8OZMESH": "8oz Mesh",
  "13OZOUTDOOR": "13oz Outdoor Vinyl",
  "10MIL": "10mil",
  "15OZBLOCKOUT": "15oz Blockout",
  "18OZBLOCKOUT": "18oz Blockout",
  "17MIL": "17mil",
  "3OZPOLY": "3oz Polyester",
  // ── Window Graphics & Decals ──
  "6MIL": "6mil Vinyl",
  "6MIL7030": "6mil See Through Vinyl",
  "7MIL": "7mil White",
  "8MIL": "8mil Vinyl",
  "8MILCLEAR": "8mil Clear",
  "8MILOPAQ": "8mil Opaque Window Graphics",
  // ── Wall Decals / Floor Graphics ──
  "4MIL": "4mil Vinyl",
  "4MILFLOOR": "4mil Floor Vinyl",
  "4MILPAV": "4mil Pavement Vinyl",
  "4MILPAVMATT": "4mil Pavement Matte",
  "20MILALU": "20mil Aluminum",
  // ── Table Covers / Displays ──
  "9OZPOLY": "9oz Polyester",
  "74OZPOLY": "74oz Polyester",
  // ── Roll Labels ──
  "BSLR": "Bright Silver",
  "CLEAR BOPP": "Clear BOPP",
  "WHITE BOPP": "White BOPP",
  "EGGSHELL": "Eggshell Felt",
  "SEMI-GLOSS": "Semi-Gloss",
  // ── Promo Products ──
  "T-SHIRT": "T-Shirt",
  "6OZCTBL": "6oz Cotton Tote (Black)",
  "6OZCTNU": "6oz Cotton Tote (Natural)",
  "6OZCTRD": "6oz Cotton Tote (Red)",
  "CRM11WH": "11oz White Mug",
  "CRM15WH": "15oz White Mug",
  "BUTTON": "Button",
}

// ─── COLORSPEC ────────────────────────────────────────────────────────────────
// 4over.com shows: "4/4 (4 color both sides)", "4/0 (4 color front)", "4/1"
// API returns the slash notation; we expand it to match.
const COLORSPEC_LABELS: Record<string, string> = {
  "4/4": "4/4 (4 color both sides)",
  "4/0": "4/0 (4 color front)",
  "4/1": "4/1",
  "1/0": "1/0 (black front only)",
  "1/1": "1/1 (black both sides)",
  "2/2": "2/2 (two color both sides)",
  "2/0": "2/0 (two color front)",
}

export function translateCoatingName(name: string): string {
  const upper = name.trim().toUpperCase()
  return COATING_LABELS[upper] ?? name
}

export function translateStockName(name: string): string {
  const upper = name.trim().toUpperCase()
  return STOCK_LABELS[upper] ?? name
}

export function translateColorspecName(name: string): string {
  const trimmed = name.trim()
  return COLORSPEC_LABELS[trimmed] ?? name
}
