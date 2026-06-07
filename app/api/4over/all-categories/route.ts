import { NextResponse } from "next/server"
import { getAllCategories } from "@/lib/4over/client"

// Product categories we surface in the storefront. Matching is case-insensitive
// and substring-based so slight naming differences in 4over still match.
const TARGET_CATEGORIES = [
  "Business Cards",
  "Flyers and Brochures",
  "Postcards",
  "Door Hangers",
  "Rack Cards",
  "Posters",
  "Large Posters",
  "Presentation Folders",
  "Booklets",
  "Banners",
  "Outdoor Banner",
  "Indoor Banner",
  "Stickers",
  "Labels",
  "Magnets",
  "Notepads",
  "Event Tickets",
  "Calendars",
  "Table Tent",
  "Sell Sheets",
]

export async function GET() {
  const result = await getAllCategories()

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 })
  }

  const all = result.data || []

  const relevant = all.filter((c: any) => {
    const name = String(c?.category_name || "").toLowerCase()
    return TARGET_CATEGORIES.some((t) => name.includes(t.toLowerCase()))
  })

  return NextResponse.json({
    success: true,
    total: all.length,
    relevantCount: relevant.length,
    relevant,
    all,
  })
}
