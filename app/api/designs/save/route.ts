import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { design_name, product_id, design_data, thumbnail_url } = body

    const { data, error } = await supabase
      .from("saved_designs")
      .insert({
        user_id: user.id,
        product_id,
        design_name,
        design_data,
        thumbnail_url,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, design: data })
  } catch (error) {
    console.error("Error saving design:", error)
    return NextResponse.json({ error: "Failed to save design" }, { status: 500 })
  }
}
