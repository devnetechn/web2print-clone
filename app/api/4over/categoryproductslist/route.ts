import { NextRequest, NextResponse } from "next/server"
import { getCategoryProductsList } from "@/lib/4over/client"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoryUuid = searchParams.get("category_uuid")
  
  if (!categoryUuid) {
    return NextResponse.json({ 
      success: false, 
      error: "Missing category_uuid parameter" 
    }, { status: 400 })
  }
  
  const result = await getCategoryProductsList({
    category_uuid: categoryUuid,
    size_uuid: searchParams.get("size_uuid") || undefined,
    stock_uuid: searchParams.get("stock_uuid") || undefined,
    coating_uuid: searchParams.get("coating_uuid") || undefined,
    filter: searchParams.get("filter") as 'size' | 'stock' | 'coating' | undefined,
  })
  
  if (!result.success) {
    // 404 "No products found ... with the selected filters" is an expected
    // empty-result state, not a hard error. Return empty lists so the client
    // can keep its current selection instead of crashing.
    const err = String(result.error || "")
    if (err.includes("404") || err.toLowerCase().includes("no products found")) {
      return NextResponse.json({
        success: true,
        data: { size_list: [], stock_list: [], coating_list: [], products: [] },
        empty: true,
      })
    }
    return NextResponse.json({ 
      success: false, 
      error: result.error 
    })
  }
  
  return NextResponse.json({
    success: true,
    data: result.data
  })
}
