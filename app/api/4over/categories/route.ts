import { NextResponse } from "next/server"
import { getCategories, getAllCategories } from "@/lib/4over/client"

// Get ALL categories from 4over (using proper max/offset pagination)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const max = searchParams.get("max")
  const offset = searchParams.get("offset")
  
  try {
    // If specific max/offset requested, return just that page
    if (max || offset) {
      const result = await getCategories(
        max ? parseInt(max) : 100,
        offset ? parseInt(offset) : 0
      )
      return NextResponse.json({
        
        max: max ? parseInt(max) : 100,
        offset: offset ? parseInt(offset) : 0,
        ...result
      })
    }
    
    // Fetch ALL categories using the new function
    const result = await getAllCategories()
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    const allCategories = result.data || []
    
    return NextResponse.json({
      success: true,
      total: allCategories.length,
      categories: allCategories.map((c: any) => ({
        uuid: c.category_uuid,
        name: c.category_description,
        slug: c.category_description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "")
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
