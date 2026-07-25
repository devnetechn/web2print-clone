"use server"

import { createAdminClient, requireAdmin, createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Managing who can reach /admin, and resetting their credentials, previously
// meant opening the Supabase dashboard - the Admin Users tab was a mock-up.
//
// Every action here starts with requireAdmin() for the reason spelled out in
// lib/supabase/server.ts:33-36: server actions are directly callable endpoints,
// so a logged-in customer who knows the name of one of these could otherwise
// hand themselves admin or reset the owner's password.

// Long enough that a stolen list of hashes is not worth grinding, short enough
// that nobody writes it on a sticky note. Supabase's own floor is 6, which is
// too low for an account that can issue refunds and charge the client's card.
const MIN_PASSWORD_LENGTH = 10

export type AdminUser = {
  id: string
  email: string
  full_name: string | null
  created_at: string
  is_self: boolean
}

export async function listAdminUsers(): Promise<{ users: AdminUser[]; error: string | null }> {
  const { user, error } = await requireAdmin()
  if (error) return { users: [], error }

  const admin = createAdminClient()
  const { data, error: queryError } = await admin
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("is_admin", true)
    .order("created_at", { ascending: true })

  if (queryError) return { users: [], error: queryError.message }

  return {
    users: (data || []).map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      created_at: row.created_at,
      is_self: row.id === user!.id,
    })),
    error: null,
  }
}

export async function changeAdminPassword(
  userId: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await requireAdmin()
  if (error) return { success: false, error }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }

  const admin = createAdminClient()

  // Only accounts that already hold admin can be targeted here. Without this,
  // the tab would double as a way to reset any customer's password, which is
  // not what an "Admin Users" screen should be able to do.
  const { data: target } = await admin.from("profiles").select("is_admin").eq("id", userId).single()
  if (!target?.is_admin) {
    return { success: false, error: "That account is not an admin" }
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (updateError) return { success: false, error: updateError.message }

  return { success: true }
}

export async function changeAdminEmail(
  userId: string,
  newEmail: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await requireAdmin()
  if (error) return { success: false, error }

  const email = newEmail.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address" }
  }

  const admin = createAdminClient()

  const { data: target } = await admin.from("profiles").select("is_admin").eq("id", userId).single()
  if (!target?.is_admin) {
    return { success: false, error: "That account is not an admin" }
  }

  // email_confirm skips the usual "click the link in your inbox" round trip.
  // An admin changing another admin's address has already established who they
  // are; leaving it unconfirmed would lock the account out of its own login.
  const { error: authError } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true })
  if (authError) return { success: false, error: authError.message }

  // profiles.email is a copy of the auth address and is what every admin
  // screen reads. Leaving it stale would show the old address everywhere.
  const { error: profileError } = await admin.from("profiles").update({ email }).eq("id", userId)
  if (profileError) return { success: false, error: profileError.message }

  revalidatePath("/admin/settings")
  return { success: true }
}

export async function grantAdmin(targetEmail: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await requireAdmin()
  if (error) return { success: false, error }

  const email = targetEmail.trim().toLowerCase()
  if (!email) return { success: false, error: "Enter an email address" }

  const admin = createAdminClient()

  // Deliberately does not create the account. Signing someone up on their
  // behalf means picking a password for them and sending it somewhere, which
  // is how shared credentials start - they sign up on the storefront first.
  const { data: profile } = await admin.from("profiles").select("id, is_admin").eq("email", email).single()

  if (!profile) {
    return { success: false, error: "No account with that email. They need to sign up on the site first." }
  }
  if (profile.is_admin) {
    return { success: false, error: "That account is already an admin" }
  }

  const { error: updateError } = await admin.from("profiles").update({ is_admin: true }).eq("id", profile.id)
  if (updateError) return { success: false, error: updateError.message }

  revalidatePath("/admin/settings")
  return { success: true }
}

export async function revokeAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireAdmin()
  if (error) return { success: false, error }

  // Removing your own access logs you out of the screen you are standing on,
  // and the fix requires the Supabase dashboard.
  if (userId === user!.id) {
    return { success: false, error: "You cannot remove your own admin access" }
  }

  const admin = createAdminClient()

  // With no admins left, nobody can grant admin back from inside the app -
  // recovering means editing the profiles table by hand in Supabase.
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", true)
  if ((count ?? 0) <= 1) {
    return { success: false, error: "Cannot remove the last admin" }
  }

  const { error: updateError } = await admin.from("profiles").update({ is_admin: false }).eq("id", userId)
  if (updateError) return { success: false, error: updateError.message }

  revalidatePath("/admin/settings")
  return { success: true }
}

// Separate from changeAdminPassword because the two differ in an important
// way: Supabase verifies the current session here, so it stays valid after the
// change instead of leaving the admin holding a session for old credentials.
export async function changeOwnPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await requireAdmin()
  if (error) return { success: false, error }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }

  const supabase = await createClient()
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return { success: false, error: updateError.message }

  return { success: true }
}
