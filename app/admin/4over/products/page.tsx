"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RefreshCw, Download, Check, AlertCircle } from "lucide-react"

interface Category {
  id: string
  name: string
  productCount: number
  lastSync: string | null
  enabled: boolean
}

const mockCategories: Category[] = [
  { id: "BC", name: "Business Cards", productCount: 45, lastSync: "2024-04-15", enabled: true },
  { id: "PC", name: "Postcards", productCount: 32, lastSync: "2024-04-15", enabled: true },
  { id: "FL", name: "Flyers", productCount: 28, lastSync: "2024-04-15", enabled: true },
  { id: "BR", name: "Brochures", productCount: 24, lastSync: "2024-04-15", enabled: true },
  { id: "BN", name: "Banners", productCount: 18, lastSync: "2024-04-15", enabled: true },
  { id: "ST", name: "Stickers", productCount: 36, lastSync: "2024-04-15", enabled: true },
  { id: "BK", name: "Booklets", productCount: 22, lastSync: null, enabled: false },
  { id: "FD", name: "Folders", productCount: 15, lastSync: null, enabled: false },
  { id: "EN", name: "Envelopes", productCount: 20, lastSync: null, enabled: false },
]

export default function ProductSyncPage() {
  const [categories, setCategories] = useState(mockCategories)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)

  const syncCategory = async (categoryId: string) => {
    setSyncing(categoryId)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, lastSync: new Date().toISOString().split("T")[0] }
          : c
      )
    )
    setSyncing(null)
  }

  const syncAll = async () => {
    setSyncingAll(true)
    for (const category of categories.filter((c) => c.enabled)) {
      await syncCategory(category.id)
    }
    setSyncingAll(false)
  }

  const toggleCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, enabled: !c.enabled } : c
      )
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Sync</h1>
          <p className="text-slate-500">Sync product catalog and pricing from 4over</p>
        </div>
        <Button onClick={syncAll} disabled={syncingAll}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncingAll ? "animate-spin" : ""}`} />
          {syncingAll ? "Syncing All..." : "Sync All Enabled"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>
              Enable categories to sync from 4over. Syncing will update products and current pricing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">Enabled</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Products</th>
                    <th className="pb-3 font-medium">Last Synced</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b">
                      <td className="py-4">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className={`w-10 h-6 rounded-full transition-colors ${
                            category.enabled ? "bg-green-500" : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                              category.enabled ? "translate-x-4" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-4 font-medium">{category.name}</td>
                      <td className="py-4 text-slate-600">{category.productCount}</td>
                      <td className="py-4">
                        {category.lastSync ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Check className="h-4 w-4" />
                            {category.lastSync}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400">
                            <AlertCircle className="h-4 w-4" />
                            Never
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncCategory(category.id)}
                          disabled={syncing === category.id || !category.enabled}
                        >
                          {syncing === category.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              Sync
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">
                  {categories.filter((c) => c.enabled).length}
                </div>
                <div className="text-sm text-slate-500">Categories Enabled</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">
                  {categories
                    .filter((c) => c.enabled)
                    .reduce((sum, c) => sum + c.productCount, 0)}
                </div>
                <div className="text-sm text-slate-500">Total Products</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {categories.filter((c) => c.lastSync).length}
                </div>
                <div className="text-sm text-slate-500">Synced Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
