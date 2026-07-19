import { createClient } from "@/lib/supabase/server"
import { getPaymentProfiles } from "@/lib/4over/client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await getPaymentProfiles()

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch payment profiles" }, { status: 502 })
    }

    return NextResponse.json({ profiles: result.data?.entities || [] })
  } catch (error) {
    console.error("[4over] Error fetching payment profiles:", error)
    return NextResponse.json({ error: "Failed to fetch payment profiles" }, { status: 500 })
  }
}
