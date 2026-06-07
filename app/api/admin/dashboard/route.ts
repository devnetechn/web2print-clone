import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all stats in parallel
    const [
      totalOrdersRes,
      pendingOrdersRes,
      processingOrdersRes,
      completedOrdersRes,
      revenueRes,
      todayRevenueRes,
      totalProductsRes,
      activeProductsRes,
      totalCustomersRes,
      newCustomersRes,
      recentOrdersRes,
    ] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["processing", "production"]),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("orders").select("total").eq("payment_status", "paid"),
      supabase.from("orders").select("total").eq("payment_status", "paid").gte("created_at", new Date().toISOString().split("T")[0]),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("orders").select(`
        id,
        order_number,
        customer_email,
        total,
        status,
        created_at,
        profiles:customer_id (full_name, company_name)
      `).order("created_at", { ascending: false }).limit(10),
    ])

    const totalRevenue = revenueRes.data?.reduce((sum, order) => sum + Number(order.total), 0) || 0
    const todayRevenue = todayRevenueRes.data?.reduce((sum, order) => sum + Number(order.total), 0) || 0

    const stats = {
      totalOrders: totalOrdersRes.count || 0,
      pendingOrders: pendingOrdersRes.count || 0,
      processingOrders: processingOrdersRes.count || 0,
      completedOrders: completedOrdersRes.count || 0,
      totalRevenue,
      todayRevenue,
      totalProducts: totalProductsRes.count || 0,
      activeProducts: activeProductsRes.count || 0,
      totalCustomers: totalCustomersRes.count || 0,
      newCustomers: newCustomersRes.count || 0,
    }

    // Generate sales data for last 7 days
    const salesData = []
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      salesData.push({
        date: days[date.getDay()],
        revenue: Math.floor(Math.random() * 2000) + 500, // Placeholder - would calculate from real data
      })
    }

    // Orders by category (placeholder)
    const ordersByStatus = [
      { category: "Business Cards", count: 45 },
      { category: "Flyers", count: 32 },
      { category: "Banners", count: 28 },
      { category: "Brochures", count: 22 },
      { category: "Signs", count: 18 },
    ]

    return NextResponse.json({
      stats,
      recentOrders: recentOrdersRes.data || [],
      salesData,
      ordersByStatus,
      notifications: [],
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({
      stats: {
        totalOrders: 0,
        pendingOrders: 0,
        processingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalProducts: 0,
        activeProducts: 0,
        totalCustomers: 0,
        newCustomers: 0,
      },
      recentOrders: [],
      salesData: [],
      ordersByStatus: [],
      notifications: [],
    })
  }
}
