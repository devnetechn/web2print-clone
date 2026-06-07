import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    let supabase
    try {
      supabase = await createClient()
    } catch {
      return NextResponse.json({ markups: [], error: "Database connection failed" }, { status: 200 })
    }
    
    let result
    try {
      result = await supabase
        .from("fourover_markups")
        .select("*")
        .order("category")
    } catch {
      // Rate limit or network error during query
      return NextResponse.json({ markups: [], error: "Rate limited - please refresh" }, { status: 200 })
    }
    
    const { data: markups, error } = result || { data: null, error: null }
    
    if (error) {
      return NextResponse.json({ markups: [], error: error.message || "Query failed" }, { status: 200 })
    }
    
    return NextResponse.json({ markups: markups || [] })
  } catch {
    return NextResponse.json({ markups: [], error: "Unexpected error - please refresh" }, { status: 200 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { id, markup_value } = await request.json()
    
    const { error } = await supabase
      .from("fourover_markups")
      .update({ markup_value, updated_at: new Date().toISOString() })
      .eq("id", id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating markup:", error)
    return NextResponse.json({ error: "Failed to update markup" }, { status: 500 })
  }
}
