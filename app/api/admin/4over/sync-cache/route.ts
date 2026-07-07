import { createAdminClient, requireAdmin } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getAllProductsForCategory } from "@/lib/4over/client"

// Force-refresh fourover_products cache for one or more category UUIDs.
// Usage: POST /api/admin/4over/sync-cache  body: { uuids: ["uuid1", "uuid2"] }
// Fetches all products from 4over API and upserts into fourover_products.
export async function POST(request: Request) {
  const { user, error: authError } = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: authError === "Not logged in" ? 401 : 403 })
  }

  const body = await request.json().catch(() => ({}))
  const uuids: string[] = Array.isArray(body.uuids) ? body.uuids : []
  if (uuids.length === 0) {
    return NextResponse.json({ error: "Provide { uuids: [\"uuid\", ...] } in the request body" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const results: Record<string, { synced: number; error?: string }> = {}

  for (const uuid of uuids) {
    const result = await getAllProductsForCategory(uuid)
    if (!result.success || !result.data?.entities) {
      results[uuid] = { synced: 0, error: result.error ?? "No data from 4over API" }
      continue
    }
    const entities = result.data.entities
    const toUpsert = entities.map((p: any) => ({
      product_uuid: p.product_uuid,
      product_description: p.product_description,
      product_code: p.product_code,
      category_uuid: uuid,
      product_name: p.product_description,
      product_data: p,
    }))
    const { error: upsertErr } = await supabase
      .from("fourover_products")
      .upsert(toUpsert, { onConflict: "product_uuid" })
    results[uuid] = { synced: entities.length, error: upsertErr?.message }
  }

  return NextResponse.json({ results })
}
