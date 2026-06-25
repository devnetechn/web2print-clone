"use server"

import { createClient } from "@/lib/supabase/server"

export async function validateCoupon(code: string, subtotal: number) {
  if (!code.trim()) {
    return { valid: false, error: "Enter a coupon code" }
  }

  const supabase = await createClient()
  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", code.trim())
    .single()

  if (error || !coupon) {
    return { valid: false, error: "Invalid coupon code" }
  }
  if (!coupon.active) {
    return { valid: false, error: "This coupon is no longer active" }
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "This coupon has expired" }
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: "This coupon has reached its usage limit" }
  }
  if (subtotal < Number(coupon.min_order_amount || 0)) {
    return { valid: false, error: `Minimum order of $${Number(coupon.min_order_amount).toFixed(2)} required` }
  }

  const discount =
    coupon.discount_type === "fixed"
      ? Math.min(Number(coupon.discount_value), subtotal)
      : subtotal * (Number(coupon.discount_value) / 100)

  return { valid: true, discount, discountType: coupon.discount_type, discountValue: Number(coupon.discount_value) }
}

export async function createCoupon(data: {
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minOrderAmount?: number
  maxUses?: number | null
  expiresAt?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("coupons").insert({
    code: data.code.trim().toUpperCase(),
    discount_type: data.discountType,
    discount_value: data.discountValue,
    min_order_amount: data.minOrderAmount || 0,
    max_uses: data.maxUses || null,
    expires_at: data.expiresAt || null,
  })
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function toggleCouponActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("coupons").update({ active, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function deleteCoupon(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("coupons").delete().eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
