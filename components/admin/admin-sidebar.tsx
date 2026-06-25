"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  FileText,
  LayoutTemplate,
  ChevronDown,
  ChevronRight,
  Settings,
  Truck,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    name: "Orders",
    icon: ShoppingCart,
    children: [
      { name: "List Orders", href: "/admin/orders" },
      { name: "Add New Order", href: "/admin/orders/new" },
      { name: "Payment Request", href: "/admin/orders/payment-request" },
      { name: "Order Status", href: "/admin/orders/status" },
      { name: "Coupons / Discount", href: "/admin/orders/coupons" },
      { name: "Unpaid Orders", href: "/admin/orders/unpaid" },
      { name: "Archive Orders", href: "/admin/orders/archive" },
    ],
  },
  {
    name: "Quote Management",
    href: "/admin/quotes",
    icon: FileText,
  },
  {
    name: "Customer",
    href: "/admin/customers",
    icon: Users,
  },
  {
    name: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    name: "Templates",
    href: "/admin/templates",
    icon: LayoutTemplate,
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: FileText,
  },
  {
    name: "4over Integration",
    icon: Truck,
    children: [
      { name: "Dashboard", href: "/admin/4over" },
      { name: "Workflow Dashboard", href: "/admin/4over/workflow" },
      { name: "4over Orders", href: "/admin/4over/orders" },
      { name: "Product Catalog", href: "/admin/4over/products" },
    ],
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(["Orders"])

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-800 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Web2Print</span>
          <span className="text-xs text-slate-400">USA Solutions</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-700",
                      pathname.startsWith("/admin/orders") ? "bg-slate-700" : "",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {expandedItems.includes(item.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedItems.includes(item.name) && (
                    <ul className="ml-6 mt-1 space-y-1 border-l border-slate-700 pl-3">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={cn(
                              "block rounded px-3 py-1.5 text-sm transition-colors hover:bg-slate-700",
                              pathname === child.href ? "bg-blue-600 font-medium" : "text-slate-300",
                            )}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-700",
                    pathname === item.href ? "bg-blue-600" : "",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600">
            <span className="text-sm font-medium">WA</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">web2printusa_admin</p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  )
}
