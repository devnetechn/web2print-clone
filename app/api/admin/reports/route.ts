import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = parseInt(searchParams.get("range") || "30")

    const supabase = await createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - range)
    const startDateStr = startDate.toISOString()

    const prevStartDate = new Date()
    prevStartDate.setDate(prevStartDate.getDate() - range * 2)
    const prevStartDateStr = prevStartDate.toISOString()

    // Current period data
    const { data: currentOrders } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", startDateStr)
      .eq("payment_status", "paid")

    // Previous period data for comparison
    const { data: prevOrders } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", prevStartDateStr)
      .lt("created_at", startDateStr)
      .eq("payment_status", "paid")

    // New customers
    const { count: newCustomers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDateStr)

    const { count: prevNewCustomers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevStartDateStr)
      .lt("created_at", startDateStr)

    // Calculate metrics
    const totalRevenue = currentOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0
    const prevRevenue = prevOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0
    const totalOrders = currentOrders?.length || 0
    const prevOrderCount = prevOrders?.length || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const prevAOV = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

    // Calculate percentage changes
    const revenueChange = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0
    const ordersChange = prevOrderCount > 0 ? Math.round(((totalOrders - prevOrderCount) / prevOrderCount) * 100) : 0
    const aovChange = prevAOV > 0 ? Math.round(((averageOrderValue - prevAOV) / prevAOV) * 100) : 0
    const customersChange = (prevNewCustomers || 0) > 0 
      ? Math.round((((newCustomers || 0) - (prevNewCustomers || 0)) / (prevNewCustomers || 1)) * 100) 
      : 0

    // Generate daily sales data
    const dailySales = []
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const dayOrders = currentOrders?.filter(
        (o) => o.created_at.split("T")[0] === dateStr
      ) || []
      dailySales.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: dayOrders.length,
      })
    }

    // Get order items for product analysis
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_name, total_price, quantity")

    // Top products
    const productMap = new Map<string, { revenue: number; orders: number }>()
    orderItems?.forEach((item) => {
      const existing = productMap.get(item.product_name) || { revenue: 0, orders: 0 }
      productMap.set(item.product_name, {
        revenue: existing.revenue + Number(item.total_price),
        orders: existing.orders + 1,
      })
    })
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Orders by status
    const { data: allOrders } = await supabase.from("orders").select("status")
    const statusMap = new Map<string, number>()
    allOrders?.forEach((o) => {
      statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1)
    })
    const ordersByStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status: status.charAt(0).toUpperCase() + status.slice(1), count }))
      .sort((a, b) => b.count - a.count)

    // Revenue by category
    const { data: products } = await supabase.from("products").select("name, category")
    const categoryMap = new Map<string, number>()
    orderItems?.forEach((item) => {
      const product = products?.find((p) => p.name === item.product_name)
      const category = product?.category || "Other"
      categoryMap.set(category, (categoryMap.get(category) || 0) + Number(item.total_price))
    })
    const revenueByCategory = Array.from(categoryMap.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      newCustomers: newCustomers || 0,
      revenueChange,
      ordersChange,
      aovChange,
      customersChange,
      dailySales,
      topProducts,
      ordersByStatus,
      revenueByCategory,
    })
  } catch (error) {
    console.error("Reports error:", error)
    return NextResponse.json({
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      newCustomers: 0,
      revenueChange: 0,
      ordersChange: 0,
      aovChange: 0,
      customersChange: 0,
      dailySales: [],
      topProducts: [],
      ordersByStatus: [],
      revenueByCategory: [],
    })
  }
}
