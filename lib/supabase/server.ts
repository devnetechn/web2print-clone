import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have proxy refreshing user sessions.
        }
      },
    },
  })
}

// Admin client with service role key - bypasses RLS, use only in server-side admin routes
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Server Actions are directly callable endpoints regardless of which page
// imports them - a logged-in customer can invoke an "admin" action just by
// knowing its name unless the action itself checks is_admin. This is that
// check, meant to be the first line of every admin-only action.
export async function requireAdmin(): Promise<
  { user: { id: string; email?: string }; error: null } | { user: null; error: string }
> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { user: null, error: "Not logged in" }
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single()
  if (!profile?.is_admin) {
    return { user: null, error: "Forbidden: admin access required" }
  }
  return { user: userData.user, error: null }
}
