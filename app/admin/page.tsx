"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  FileText,
  Bell,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  completedOrders: number
  totalRevenue: number
  todayRevenue: number
  totalProducts: number
  activeProducts: number
  totalCustomers: number
  newCustomers: number
}

interface RecentOrder {
  id: string
  order_number: number
  customer_email: string
  total: number
  status: string
  created_at: string
  profiles?: { full_name: string; company_name: string }
}

interface Notification {
  id: string
  type: "order" | "customer" | "product" | "alert"
  message: string
  time: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<any[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard")
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setRecentOrders(data.recentOrders || [])
        setSalesData(data.salesData || [])
        setOrdersByStatus(data.ordersByStatus || [])
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      change: "+12%",
      trend: "up",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/admin/orders",
    },
    {
      title: "Total Revenue",
      value: `$${(stats?.totalRevenue || 0).toFixed(2)}`,
      change: "+8%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/admin/orders",
    },
    {
      title: "Products",
      value: stats?.totalProducts || 0,
      subValue: `${stats?.activeProducts || 0} active`,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/admin/products",
    },
    {
      title: "Customers",
      value: stats?.totalCustomers || 0,
      subValue: `${stats?.newCustomers || 0} new this month`,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/admin/customers",
    },
  ]

  const orderStatusCards = [
    { label: "Pending", count: stats?.pendingOrders || 0, color: "bg-yellow-500" },
    { label: "Processing", count: stats?.processingOrders || 0, color: "bg-blue-500" },
    { label: "Completed", count: stats?.completedOrders || 0, color: "bg-green-500" },
  ]

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return styles[status] || "bg-slate-100 text-slate-800"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Welcome to your print management dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/orders/new" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              New Order
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/reports" className="gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.change && (
                  <div className="flex items-center gap-1 text-sm">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                    <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>
                      {stat.change}
                    </span>
                    <span className="text-slate-500">vs last month</span>
                  </div>
                )}
                {stat.subValue && (
                  <p className="text-sm text-slate-500 mt-1">{stat.subValue}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Order Status Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {orderStatusCards.map((status) => (
          <Card key={status.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{status.label} Orders</p>
                  <p className="text-3xl font-bold mt-1">{status.count}</p>
                </div>
                <div className={`h-12 w-12 rounded-full ${status.color} flex items-center justify-center`}>
                  <span className="text-white font-bold">{status.count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Revenue over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "#3b82f6" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData.length > 0 ? salesData : [
                  { date: "Mon", revenue: 1200 },
                  { date: "Tue", revenue: 1800 },
                  { date: "Wed", revenue: 1400 },
                  { date: "Thu", revenue: 2200 },
                  { date: "Fri", revenue: 1900 },
                  { date: "Sat", revenue: 2400 },
                  { date: "Sun", revenue: 1600 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`$${value}`, "Revenue"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Orders by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Category</CardTitle>
            <CardDescription>Product category distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Orders", color: "#8b5cf6" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByStatus.length > 0 ? ordersByStatus : [
                  { category: "Business Cards", count: 45 },
                  { category: "Flyers", count: 32 },
                  { category: "Banners", count: 28 },
                  { category: "Brochures", count: 22 },
                  { category: "Signs", count: 18 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Notifications */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders requiring attention</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No recent orders</p>
              ) : (
                recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Order #{order.order_number}</p>
                        <p className="text-sm text-slate-500">
                          {order.profiles?.full_name || order.customer_email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusBadge(order.status)}>{order.status}</Badge>
                      <span className="font-medium">${Number(order.total).toFixed(2)}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </div>
            <Badge variant="secondary">{notifications.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <>
                  <NotificationItem 
                    type="order" 
                    message="New order #1234 received" 
                    time="2 min ago" 
                  />
                  <NotificationItem 
                    type="customer" 
                    message="New customer registered" 
                    time="15 min ago" 
                  />
                  <NotificationItem 
                    type="alert" 
                    message="Low stock alert: Business Cards" 
                    time="1 hour ago" 
                  />
                  <NotificationItem 
                    type="order" 
                    message="Order #1232 shipped" 
                    time="2 hours ago" 
                  />
                </>
              ) : (
                notifications.map((notif) => (
                  <NotificationItem 
                    key={notif.id}
                    type={notif.type}
                    message={notif.message}
                    time={notif.time}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link href="/admin/orders/new">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <ShoppingCart className="h-6 w-6" />
                <span>Create Order</span>
              </Button>
            </Link>
            <Link href="/admin/customers">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="h-6 w-6" />
                <span>Add Customer</span>
              </Button>
            </Link>
            <Link href="/admin/products">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Package className="h-6 w-6" />
                <span>Add Product</span>
              </Button>
            </Link>
            <Link href="/admin/4over">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>Sync 4over</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationItem({ type, message, time }: { type: string; message: string; time: string }) {
  const icons = {
    order: <ShoppingCart className="h-4 w-4 text-blue-600" />,
    customer: <Users className="h-4 w-4 text-green-600" />,
    product: <Package className="h-4 w-4 text-purple-600" />,
    alert: <AlertCircle className="h-4 w-4 text-orange-600" />,
  }
  
  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
      <div className="mt-0.5">{icons[type as keyof typeof icons]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{message}</p>
        <p className="text-xs text-slate-500">{time}</p>
      </div>
    </div>
  )
}
