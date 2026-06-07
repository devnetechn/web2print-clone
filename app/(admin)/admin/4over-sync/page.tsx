"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, CheckCircle, XCircle, Clock, Database, Wrench } from "lucide-react"

interface SyncStatus {
  id: string
  sync_type: string
  status: string
  started_at: string
  completed_at: string | null
  total_items: number
  synced_items: number
  error_message: string | null
}

interface SyncCounts {
  products: number
  prices: number
  categories: number
}

interface TableStatus {
  exists: boolean
  count: number
}

export default function FourOverSyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [latestSync, setLatestSync] = useState<SyncStatus | null>(null)
  const [counts, setCounts] = useState<SyncCounts>({ products: 0, prices: 0, categories: 0 })
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [tablesExist, setTablesExist] = useState<boolean | null>(null)
  const [tableStatus, setTableStatus] = useState<Record<string, TableStatus>>({})
  const [progress, setProgress] = useState(0)
  
  // Check if tables exist on load
  useEffect(() => {
    checkTables()
  }, [])
  
  // Fetch current status on load
  useEffect(() => {
    if (tablesExist) {
      fetchStatus()
    }
  }, [tablesExist])
  
  // Poll for status while syncing - only poll general status, not specific ID
  useEffect(() => {
    if (syncing) {
      const interval = setInterval(() => {
        fetchStatus() // Don't pass syncId - just fetch latest
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [syncing])
  
  const checkTables = async () => {
    try {
      const res = await fetch("/api/4over/setup-tables")
      const data = await res.json()
      
      if (data.success && data.tables) {
        setTablesExist(true)
        setTableStatus(data.tables)
      } else {
        setTablesExist(false)
      }
    } catch {
      setTablesExist(false)
    }
  }
  
  const setupTables = async () => {
    setSettingUp(true)
    setError(null)
    
    try {
      const res = await fetch("/api/4over/setup-tables", {
        method: "POST"
      })
      const data = await res.json()
      
      if (data.success) {
        setTablesExist(true)
        checkTables()
      } else {
        setError(data.error || "Failed to create tables")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSettingUp(false)
    }
  }
  
  const fetchStatus = async (syncId?: string) => {
    // Skip if tables don't exist
    if (tablesExist === false) return
    
    try {
      const url = syncId 
        ? `/api/4over/sync-full?syncId=${syncId}`
        : "/api/4over/sync-full"
      
      const res = await fetch(url)
      if (!res.ok) return // Ignore HTTP errors
      
      const data = await res.json()
      
      if (data.success) {
        if (data.sync) {
          setLatestSync(data.sync)
          if (data.sync.status !== "running") {
            setSyncing(false)
          }
        } else if (data.latestSync) {
          setLatestSync(data.latestSync)
          if (data.latestSync.status !== "running") {
            setSyncing(false)
          }
        }
        if (data.counts) {
          setCounts(data.counts)
        }
        if (data.tablesExist !== undefined) {
          setTablesExist(data.tablesExist)
        }
      }
    } catch {
      // Ignore errors during polling
    }
  }
  
  const startSync = async () => {
    setSyncing(true)
    setError(null)
    setResult(null)
    setProgress(0)
    
    // Run sync in steps: categories -> products (paginated)
    try {
      // Step 1: Categories
      console.log("[v0] Starting categories sync...")
      const catRes = await fetch("/api/4over/sync-full?step=categories", { method: "POST" })
      const catData = await catRes.json()
      
      if (!catData.success) {
        setError(catData.error || "Categories sync failed")
        setSyncing(false)
        return
      }
      
      setResult({ message: catData.message, step: "categories" })
      await fetchStatus() // Refresh counts
      
      // Step 2: Products (paginated)
      let page = 1
      let complete = false
      let retryCount = 0
      const maxRetries = 3
      
      while (!complete && page < 100) { // Safety limit
        console.log("[v0] Syncing products page", page)
        const prodRes = await fetch(`/api/4over/sync-full?step=products&page=${page}`, { method: "POST" })
        const prodData = await prodRes.json()
        
        if (!prodData.success) {
          setError(prodData.error || "Products sync failed")
          setSyncing(false)
          return
        }
        
        // Handle rate limiting - wait longer and retry same page
        if (prodData.rateLimited) {
          retryCount++
          if (retryCount > maxRetries) {
            setError("Rate limited too many times - try again in a few minutes")
            setSyncing(false)
            return
          }
          const waitTime = 10 + (retryCount * 5) // 15s, 20s, 25s
          setResult({ message: `Rate limited, waiting ${waitTime}s before retry (${retryCount}/${maxRetries})...`, step: "products", page })
          await new Promise(r => setTimeout(r, waitTime * 1000))
          continue
        }
        
        retryCount = 0 // Reset on success
        setResult({ message: prodData.message, step: "products", page })
        if (prodData.progress) setProgress(prodData.progress)
        await fetchStatus() // Refresh counts
        
        if (prodData.complete) {
          complete = true
        } else {
          page = prodData.nextPage || page + 1
        }
        
        // Delay between pages to avoid rate limiting (3 seconds)
        await new Promise(r => setTimeout(r, 3000))
      }
      
      setResult({ message: "Sync complete!", complete: true })
      setSyncing(false)
      await fetchStatus()
      
    } catch (err) {
      setError(String(err))
      setSyncing(false)
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-5 w-5 text-green-500" />
      case "failed": return <XCircle className="h-5 w-5 text-red-500" />
      case "running": return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      default: return <Clock className="h-5 w-5 text-slate-400" />
    }
  }
  
  const syncProgress = latestSync 
    ? Math.round((latestSync.synced_items / (latestSync.total_items || 1)) * 100)
    : progress

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">4over Product Sync</h1>
        
        {/* Table Setup Section - show when tables don't exist or still checking */}
        {tablesExist !== true && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {tablesExist === null ? "Checking Database..." : "Database Setup Required"}
              </CardTitle>
              <CardDescription>
                {tablesExist === null 
                  ? "Checking if sync tables exist..." 
                  : "The 4over sync tables need to be created. Copy the SQL below and run it in your Supabase SQL Editor."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-auto max-h-64">
                <pre id="sql-code">{`-- Run this SQL in Supabase SQL Editor

DROP TABLE IF EXISTS fourover_sync_status CASCADE;
DROP TABLE IF EXISTS fourover_base_prices CASCADE;
DROP TABLE IF EXISTS fourover_option_groups CASCADE;
DROP TABLE IF EXISTS fourover_products CASCADE;
DROP TABLE IF EXISTS fourover_categories CASCADE;

CREATE TABLE fourover_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_uuid TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  parent_category_uuid TEXT,
  category_order INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fourover_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid TEXT UNIQUE NOT NULL,
  product_code TEXT,
  product_description TEXT,
  product_name TEXT,
  category_uuid TEXT,
  product_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fourover_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid TEXT NOT NULL,
  option_group_uuid TEXT NOT NULL,
  option_group_name TEXT NOT NULL,
  option_group_order INTEGER,
  options JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_uuid, option_group_uuid)
);

CREATE TABLE fourover_base_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid TEXT NOT NULL,
  runsize_uuid TEXT,
  runsize INTEGER,
  colorspec_uuid TEXT,
  colorspec TEXT,
  product_baseprice DECIMAL(12,6) NOT NULL,
  turnaroundtime_uuid TEXT,
  turnaroundtime TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_uuid, runsize_uuid, colorspec_uuid)
);

CREATE TABLE fourover_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  synced_items INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fourover_products_category ON fourover_products(category_uuid);
CREATE INDEX idx_fourover_products_code ON fourover_products(product_code);
CREATE INDEX idx_fourover_option_groups_product ON fourover_option_groups(product_uuid);
CREATE INDEX idx_fourover_base_prices_product ON fourover_base_prices(product_uuid);
CREATE INDEX idx_fourover_base_prices_runsize ON fourover_base_prices(runsize);`}</pre>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    const sql = document.getElementById('sql-code')?.textContent || ''
                    navigator.clipboard.writeText(sql)
                    alert('SQL copied to clipboard!')
                  }}
                  variant="outline"
                >
                  Copy SQL
                </Button>
                <Button 
                  onClick={checkTables}
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Tables
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Table Status */}
        {tablesExist && Object.keys(tableStatus).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(tableStatus).map(([name, status]) => (
                  <div key={name} className="text-center p-3 bg-slate-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs font-mono">{name.replace('fourover_', '')}</p>
                    <p className="text-lg font-bold">{status.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Current Counts */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{counts.categories}</p>
                  <p className="text-sm text-slate-500">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{counts.products}</p>
                  <p className="text-sm text-slate-500">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{counts.prices}</p>
                  <p className="text-sm text-slate-500">Prices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sync Control */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Full Product Sync</CardTitle>
            <CardDescription>
              Sync all categories, products, option groups, and base prices from 4over API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={startSync} 
              disabled={syncing}
              className="w-full"
              size="lg"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing... ({syncProgress}%)
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Full Sync
                </>
              )}
            </Button>
            
            {syncing && latestSync && (
              <div className="mt-4">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {latestSync.synced_items} / {latestSync.total_items} products
                </p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            {result && !syncing && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
                <p className="font-medium">Sync completed!</p>
                <p className="text-sm">
                  {result.syncedProducts} products, {result.syncedPrices} prices synced
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Latest Sync Status */}
        {latestSync && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(latestSync.status)}
                Latest Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium capitalize">{latestSync.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium">{latestSync.sync_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Started</span>
                  <span className="font-medium">
                    {new Date(latestSync.started_at).toLocaleString()}
                  </span>
                </div>
                {latestSync.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Completed</span>
                    <span className="font-medium">
                      {new Date(latestSync.completed_at).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium">
                    {latestSync.synced_items} / {latestSync.total_items} items
                  </span>
                </div>
                {latestSync.error_message && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-xs">
                    {latestSync.error_message}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
