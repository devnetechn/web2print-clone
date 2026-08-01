import { createClient } from "@/lib/supabase/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Handles signup confirmation / password reset / magic link emails via a
// token_hash, verified entirely server-side. Unlike /auth/callback's `code`
// exchange (which needs a PKCE verifier stored in the browser that started
// the flow), this works from any browser or device — required since
// customers routinely open the confirmation email on a different
// browser/device than the one they signed up on.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = new URL(searchParams.get("next") || "/", origin).toString()

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(next)
    }
  }

  return NextResponse.redirect(`${origin}/account/login?error=auth-failed`)
}
