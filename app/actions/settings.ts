"use server"

import { createAdminClient, requireAdmin } from "@/lib/supabase/server"
import { FOUROVER_DEFAULT_PROFILE_KEY } from "@/lib/settings"
import { revalidatePath } from "next/cache"

// Settings the owner can change without a redeploy. Reads and writes go
// through the service-role client because app_settings has RLS on with no
// policies - see scripts/018_app_settings.sql for why.

export async function getFourOverDefaultProfile(): Promise<{ token: string | null; error: string | null }> {
  const { error } = await requireAdmin()
  if (error) return { token: null, error }

  const admin = createAdminClient()
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", FOUROVER_DEFAULT_PROFILE_KEY)
    .maybeSingle()

  return { token: data?.value || null, error: null }
}

export async function setFourOverDefaultProfile(
  token: string | null,
): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireAdmin()
  if (error) return { success: false, error }

  const admin = createAdminClient()
  const { error: upsertError } = await admin.from("app_settings").upsert(
    {
      key: FOUROVER_DEFAULT_PROFILE_KEY,
      // Empty string and null both mean "off", but storing null keeps the
      // "unset" case unambiguous for the reader in lib/settings.ts.
      value: token || null,
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    },
    { onConflict: "key" },
  )

  if (upsertError) return { success: false, error: upsertError.message }

  revalidatePath("/admin/settings")
  return { success: true }
}
