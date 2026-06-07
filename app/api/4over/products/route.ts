import { NextResponse } from "next/server"
import { fourOverClient } from "@/lib/4over/client"
import { applyMarkup } from "@/lib/4over/markup"

// GET: List all products or products by category
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category")
    const all = searchParams.get("all")
    const productId = searchParams.get("id")
    
    // Get single product with options
    if (productId) {
      const [optionGroups, basePrices] = await Promise.all([
        fourOverClient.getProductOptionGroups(productId),
        fourOverClient.getProductBasePrices(productId),
      ])
      
      return NextResponse.json({
        success: true,
        data: {
          product_uuid: productId,
          optionGroups: optionGroups.data,
          basePrices: basePrices.data,
        }
      })
    }
    
    // Get all products (paginated from all categories)
    if (all === "true") {
      const result = await fourOverClient.getAllProductsByCategory()
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 })
      }
      return NextResponse.json(result)
    }
    
    // Get products by category
    if (categoryId) {
      const result = await fourOverClient.getProducts(categoryId)
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 })
      }
      return NextResponse.json(result)
    }
    
    // Default: return first page of products
    const result = await fourOverClient.getAllProducts(1, 50)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json(result)
    
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// POST: Get pricing quote for a product configuration
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      product_uuid, 
      colorspec_uuid, 
      runsize_uuid, 
      turnaroundtime_uuid, 
      options,
      applyMarkupToPrice = true,
      markupCategory = "default"
    } = body
    
    // Validate required fields
    if (!product_uuid || !colorspec_uuid || !runsize_uuid || !turnaroundtime_uuid) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required fields: product_uuid, colorspec_uuid, runsize_uuid, turnaroundtime_uuid" 
      }, { status: 400 })
    }
    
    // Get quote from 4over
    const result = await fourOverClient.getProductQuote({
      product_uuid,
      colorspec_uuid,
      runsize_uuid,
      turnaroundtime_uuid,
      options: options || []
    })
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    // Apply markup to price if requested
    const data = result.data
    if (applyMarkupToPrice && data?.price) {
      data.original_price = data.price
      data.price = applyMarkup(data.price, markupCategory)
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
