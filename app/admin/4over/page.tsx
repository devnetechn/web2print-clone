"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RefreshCw, Package, DollarSign, Truck, CheckCircle, AlertCircle } from "lucide-react"

interface Markup {
  id: string
  category: string
  markup_value: number
}

interface SyncStatus {
  loading: boolean
  success: boolean | null
  message: string
  categories?: number
  products?: number
  options?: number
  prices?: number
}

export default function FourOverAdminPage() {
  const [markups, setMarkups] = useState<Markup[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ loading: false, success: null, message: "" })
  const [testStatus, setTestStatus] = useState<{ loading: boolean; result: string | null }>({ loading: false, result: null })

  useEffect(() => {
    fetchMarkups()
  }, [])

  const fetchMarkups = async () => {
    try {
      const res = await fetch("/api/admin/4over/markups")
      if (!res.ok) {
        console.error("Markups API error:", res.status)
        return
      }
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)
      setMarkups(data.markups || [])
    } catch (error) {
      console.error("Failed to fetch markups:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateMarkup = async (id: string, newValue: number) => {
    try {
      await fetch("/api/admin/4over/markups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, markup_value: newValue })
      })
      setMarkups(prev => prev.map(m => m.id === id ? { ...m, markup_value: newValue } : m))
    } catch (error) {
      console.error("Failed to update markup:", error)
    }
  }

  const testConnection = async () => {
    setTestStatus({ loading: true, result: null })
    try {
      const res = await fetch("/api/4over/products?action=categories")
      if (!res.ok) {
        setTestStatus({ loading: false, result: `Error: HTTP ${res.status}` })
        return
      }
      const text = await res.text()
      if (!text) {
        setTestStatus({ loading: false, result: "No response from API" })
        return
      }
      const data = JSON.parse(text)
      if (data.error) {
        setTestStatus({ loading: false, result: `Error: ${data.error}` })
      } else {
        setTestStatus({ loading: false, result: `Connected! Found ${data.categories?.length || 0} categories` })
      }
    } catch (error) {
      setTestStatus({ loading: false, result: "Connection failed" })
    }
  }

  const syncProducts = async (reset: boolean = false) => {
    setSyncStatus({ loading: true, success: null, message: reset ? "Resetting and syncing all products with prices..." : "Syncing all products with prices..." })
    try {
      const url = reset ? "/api/admin/4over/sync?reset=true" : "/api/admin/4over/sync"
      const res = await fetch(url, { method: "POST" })
      if (!res.ok) {
        setSyncStatus({ loading: false, success: false, message: `HTTP Error: ${res.status}` })
        return
      }
      const text = await res.text()
      if (!text) {
        setSyncStatus({ loading: false, success: false, message: "No response from API" })
        return
      }
      const data = JSON.parse(text)
      if (data.error) {
        setSyncStatus({ loading: false, success: false, message: data.error })
      } else {
        setSyncStatus({ 
          loading: false, 
          success: true, 
          message: data.message || "Sync complete!",
          categories: data.categories,
          products: data.products,
          prices: data.prices
        })
        setTimeout(() => fetchMarkups(), 1000)
      }
    } catch (error) {
      setSyncStatus({ loading: false, success: false, message: "Sync failed: " + String(error) })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">4over Integration</h1>
        <p className="text-slate-600 mt-1">Manage your 4over API connection, product sync, and price markups</p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              API Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testConnection} disabled={testStatus.loading} className="w-full">
              {testStatus.loading ? "Testing..." : "Test Connection"}
            </Button>
            {testStatus.result && (
              <p className={`mt-2 text-sm ${testStatus.result.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                {testStatus.result}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-600" />
              Product Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => syncProducts(false)} disabled={syncStatus.loading} className="w-full">
              {syncStatus.loading ? "Syncing..." : "Sync All Products & Prices"}
            </Button>
            <Button onClick={() => syncProducts(true)} disabled={syncStatus.loading} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              Reset & Resync All
            </Button>
            {syncStatus.message && (
              <div className={`mt-2 text-sm flex items-center gap-1 ${syncStatus.success ? "text-green-600" : syncStatus.success === false ? "text-red-600" : "text-slate-600"}`}>
                {syncStatus.success && <CheckCircle className="h-4 w-4" />}
                {syncStatus.success === false && <AlertCircle className="h-4 w-4" />}
                {syncStatus.message}
              </div>
            )}
            {syncStatus.products !== undefined && (
              <p className="text-xs text-slate-500 mt-1">
                {syncStatus.categories} categories, {syncStatus.products} products
                {syncStatus.options ? `, ${syncStatus.options} options` : ""}
                {syncStatus.prices ? `, ${syncStatus.prices} prices` : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              Fulfillment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">Live</p>
            <p className="text-sm text-slate-500">Orders auto-submit to 4over</p>
          </CardContent>
        </Card>
      </div>

      {/* Markup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Price Markups
          </CardTitle>
          <CardDescription>
            Set your profit margin for each product category. The markup percentage is added to 4over's wholesale price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading markups...</p>
          ) : markups.length === 0 ? (
            <p className="text-slate-500">No markups configured. Click "Sync Products" to load categories.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markups.map((markup) => (
                <div key={markup.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 capitalize">{markup.category.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={markup.markup_value || 40}
                      onChange={(e) => updateMarkup(markup.id, Number(e.target.value))}
                      className="w-20 text-right"
                      min={0}
                      max={200}
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Example</CardTitle>
          <CardDescription>How your markups affect customer pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Product</th>
                  <th className="text-right py-2 px-3">4over Cost</th>
                  <th className="text-right py-2 px-3">Markup</th>
                  <th className="text-right py-2 px-3">Your Price</th>
                  <th className="text-right py-2 px-3">Profit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3">Business Cards (500)</td>
                  <td className="text-right py-2 px-3">$25.00</td>
                  <td className="text-right py-2 px-3">40%</td>
                  <td className="text-right py-2 px-3 font-medium">$35.00</td>
                  <td className="text-right py-2 px-3 text-green-600">$10.00</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3">Flyers (1000)</td>
                  <td className="text-right py-2 px-3">$75.00</td>
                  <td className="text-right py-2 px-3">35%</td>
                  <td className="text-right py-2 px-3 font-medium">$101.25</td>
                  <td className="text-right py-2 px-3 text-green-600">$26.25</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Banner (3x6)</td>
                  <td className="text-right py-2 px-3">$45.00</td>
                  <td className="text-right py-2 px-3">50%</td>
                  <td className="text-right py-2 px-3 font-medium">$67.50</td>
                  <td className="text-right py-2 px-3 text-green-600">$22.50</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
