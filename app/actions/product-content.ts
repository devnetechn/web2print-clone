"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient, requireAdmin } from "@/lib/supabase/server"
import type { FAQ, FilePrepInfo, TemplateLink } from "@/lib/print/product-content"

export type SaveContentPayload = {
  description: string
  faqs: FAQ[]
  template_file_prep: FilePrepInfo | null
  template_urls: TemplateLink[]
}

export async function saveProductContent(
  slug: string,
  payload: SaveContentPayload
): Promise<{ success: boolean; error?: string }> {
  const { user, error: authError } = await requireAdmin()
  if (!user) {
    return { success: false, error: authError ?? "Unauthorized" }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("product_content")
    .upsert(
      {
        category_slug: slug,
        description: payload.description || null,
        faqs: payload.faqs,
        template_file_prep: payload.template_file_prep,
        template_urls: payload.template_urls,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "category_slug" }
    )

  if (error) return { success: false, error: error.message }

  // Invalidate storefront pages that show this content
  revalidatePath(`/print`, "layout")
  revalidatePath(`/admin/products/content/${slug}`)

  return { success: true }
}
