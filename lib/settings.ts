import { createAdminClient } from "@/lib/supabase/server"

// Lives here rather than beside the server actions because a "use server"
// module may only export async functions — a plain constant in there is a
// build error. app/actions/settings.ts imports it from this side.
export const FOUROVER_DEFAULT_PROFILE_KEY = "fourover_default_payment_profile"

// Server-internal reader, no admin session required — the Stripe webhook runs
// with no user at all. app/actions/settings.ts is the admin-gated counterpart
// used by the Settings UI.
//
// Falls back to the env var so a deployment configured the old way keeps
// working: the setting moved into the database so the owner could change the
// card without a redeploy, not because the env var became wrong.
export async function getFourOverPaymentProfile(): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", FOUROVER_DEFAULT_PROFILE_KEY)
      .maybeSingle()

    if (data?.value) return data.value
  } catch (err) {
    // A missing table (migration not run yet) must not stop a paid order from
    // being recorded — fall through to the env var rather than throwing.
    console.error("[settings] Could not read 4over default payment profile:", err)
  }

  return process.env.FOUROVER_DEFAULT_PAYMENT_PROFILE || null
}
