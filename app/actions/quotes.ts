"use server"

import { createClient } from "@/lib/supabase/server"

export async function submitQuoteRequest({
  fullName,
  email,
  phone,
  companyName,
  quoteTitle,
  description,
  quantity,
  referenceFileUrl,
}: {
  fullName: string
  email: string
  phone?: string
  companyName?: string
  quoteTitle: string
  description: string
  quantity?: string
  referenceFileUrl?: string
}) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  const { error } = await supabase.from("custom_quote_requests").insert({
    customer_id: userData.user?.id || null,
    full_name: fullName,
    email,
    phone: phone || null,
    company_name: companyName || null,
    quote_title: quoteTitle,
    description,
    quantity: quantity || null,
    reference_file_url: referenceFileUrl || null,
    status: "new",
  })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function updateQuoteRequest({
  id,
  status,
  quotedPrice,
  adminNotes,
}: {
  id: string
  status: "new" | "quoted" | "accepted" | "declined"
  quotedPrice?: number | null
  adminNotes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("custom_quote_requests")
    .update({
      status,
      quoted_price: quotedPrice ?? null,
      admin_notes: adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function updateApparelQuoteRequest({
  id,
  status,
  quotedPrice,
  internalNotes,
}: {
  id: string
  status: "pending" | "quoted" | "approved" | "in_production" | "completed" | "cancelled"
  quotedPrice?: number | null
  internalNotes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("quote_requests")
    .update({
      status,
      quoted_price: quotedPrice ?? null,
      internal_notes: internalNotes ?? null,
      ...(status === "quoted" ? { quoted_at: new Date().toISOString() } : {}),
      ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
