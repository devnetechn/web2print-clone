import { createClient } from "@/lib/supabase/server"
import { sendNewCustomerToCRM } from "@/app/actions/crm"
import { NextResponse } from "next/server"

// Supabase redirects here after a Google/Facebook OAuth login or an email
// confirmation link, with a one-time `code` to exchange for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const user = data.user
      // OAuth has no separate "sign up" step — Supabase creates the account
      // on first login. created_at and last_sign_in_at land within the same
      // request only the very first time; on every later login,
      // created_at stays fixed while last_sign_in_at moves forward.
      const isFirstLogin = user && Math.abs(new Date(user.created_at).getTime() - new Date(user.last_sign_in_at || 0).getTime()) < 10_000
      if (isFirstLogin) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || ""
        const phone = user.user_metadata?.phone || user.phone || ""
        // Awaited — returning the redirect response right after an
        // un-awaited call let the route handler finish (and the request
        // lifecycle end) before the CRM fetch actually went out.
        await sendNewCustomerToCRM({ fullName: name, email: user.email || "", phone })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth-failed`)
}
