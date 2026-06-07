"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function APISettingsPage() {
  const [publicKey, setPublicKey] = useState("web2printusa")
  const [privateKey, setPrivateKey] = useState("••••••••")
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "error" | null>("connected")
  const [saving, setSaving] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    setConnectionStatus(null)
    try {
      const res = await fetch("/api/4over/products?action=categories")
      if (res.ok) {
        setConnectionStatus("connected")
      } else {
        setConnectionStatus("error")
      }
    } catch {
      setConnectionStatus("error")
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSaving(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">4over API Settings</h1>
          <p className="text-slate-500">Configure your 4over API connection</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>
              Your 4over API keys. Contact 4over support if you need new credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Public Key
              </label>
              <Input
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Your public API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Private Key
              </label>
              <Input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Your private API key"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Credentials"}
              </Button>
              <Button variant="outline" onClick={testConnection} disabled={testing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${testing ? "animate-spin" : ""}`} />
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {connectionStatus === "connected" ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">Connected</p>
                    <p className="text-sm text-slate-500">
                      Successfully connected to 4over API
                    </p>
                  </div>
                </>
              ) : connectionStatus === "error" ? (
                <>
                  <XCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="font-medium text-red-700">Connection Failed</p>
                    <p className="text-sm text-slate-500">
                      Check your API credentials and try again
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
                  <div>
                    <p className="font-medium text-slate-700">Testing...</p>
                    <p className="text-sm text-slate-500">
                      Checking connection to 4over API
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>
              4over API endpoints being used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Base URL</span>
                <code className="bg-slate-100 px-2 py-0.5 rounded">https://api.4over.com</code>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Products</span>
                <code className="bg-slate-100 px-2 py-0.5 rounded">/products</code>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Pricing</span>
                <code className="bg-slate-100 px-2 py-0.5 rounded">/pricing</code>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Orders</span>
                <code className="bg-slate-100 px-2 py-0.5 rounded">/orders</code>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Shipping</span>
                <code className="bg-slate-100 px-2 py-0.5 rounded">/shipping</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
