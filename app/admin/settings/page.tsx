"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Store,
  CreditCard,
  Truck,
  Mail,
  Shield,
  Palette,
  Globe,
  Users,
  Settings as SettingsIcon,
  Save,
  Check,
  AlertCircle,
} from "lucide-react"

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [storeSettings, setStoreSettings] = useState({
    storeName: "Web2Print USA",
    storeEmail: "info@web2printusa.com",
    storePhone: "(555) 123-4567",
    storeAddress: "123 Print Street, New York, NY 10001",
    timezone: "America/New_York",
    currency: "USD",
    taxRate: "8.875",
    enableTax: true,
  })

  const [paymentSettings, setPaymentSettings] = useState({
    stripeEnabled: true,
    stripePublishableKey: "",
    payOnAccountEnabled: true,
    creditLimit: "5000",
    paymentTerms: "Net 30",
  })

  const [shippingSettings, setShippingSettings] = useState({
    freeShippingThreshold: "100",
    defaultShippingMethod: "standard",
    enableLocalPickup: true,
    pickupAddress: "123 Print Street, New York, NY 10001",
  })

  const [emailSettings, setEmailSettings] = useState({
    orderConfirmation: true,
    shippingNotification: true,
    paymentReceipt: true,
    reviewRequest: true,
    fromEmail: "orders@web2printusa.com",
    fromName: "Web2Print USA",
  })

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-slate-600">Manage your store configuration and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="store" className="gap-2">
            <Store className="h-4 w-4" />
            Store
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="h-4 w-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Admin Users
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Globe className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>Basic information about your store</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={storeSettings.storeName}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storeEmail">Store Email</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={storeSettings.storeEmail}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeEmail: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storePhone">Store Phone</Label>
                  <Input
                    id="storePhone"
                    value={storeSettings.storePhone}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storePhone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storeAddress">Store Address</Label>
                  <Textarea
                    id="storeAddress"
                    value={storeSettings.storeAddress}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>Configure regional preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={storeSettings.timezone}
                    onValueChange={(v) => setStoreSettings({ ...storeSettings, timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={storeSettings.currency}
                    onValueChange={(v) => setStoreSettings({ ...storeSettings, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Tax</Label>
                    <p className="text-sm text-slate-500">Calculate tax on orders</p>
                  </div>
                  <Switch
                    checked={storeSettings.enableTax}
                    onCheckedChange={(v) => setStoreSettings({ ...storeSettings, enableTax: v })}
                  />
                </div>
                {storeSettings.enableTax && (
                  <div className="grid gap-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.001"
                      value={storeSettings.taxRate}
                      onChange={(e) => setStoreSettings({ ...storeSettings, taxRate: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Stripe
                  {paymentSettings.stripeEnabled && <Badge variant="secondary">Connected</Badge>}
                </CardTitle>
                <CardDescription>Accept credit card payments via Stripe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Stripe</Label>
                    <p className="text-sm text-slate-500">Accept credit card payments</p>
                  </div>
                  <Switch
                    checked={paymentSettings.stripeEnabled}
                    onCheckedChange={(v) => setPaymentSettings({ ...paymentSettings, stripeEnabled: v })}
                  />
                </div>
                {paymentSettings.stripeEnabled && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <Check className="h-4 w-4" />
                      <span className="font-medium">Stripe is connected</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Your Stripe integration is active and ready to accept payments.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pay on Account</CardTitle>
                <CardDescription>Allow customers to pay on account with credit terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Pay on Account</Label>
                    <p className="text-sm text-slate-500">Allow B2B credit accounts</p>
                  </div>
                  <Switch
                    checked={paymentSettings.payOnAccountEnabled}
                    onCheckedChange={(v) => setPaymentSettings({ ...paymentSettings, payOnAccountEnabled: v })}
                  />
                </div>
                {paymentSettings.payOnAccountEnabled && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="creditLimit">Default Credit Limit ($)</Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        value={paymentSettings.creditLimit}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, creditLimit: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={paymentSettings.paymentTerms}
                        onValueChange={(v) => setPaymentSettings({ ...paymentSettings, paymentTerms: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 45">Net 45</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Options</CardTitle>
                <CardDescription>Configure shipping methods and rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="freeShipping">Free Shipping Threshold ($)</Label>
                  <Input
                    id="freeShipping"
                    type="number"
                    value={shippingSettings.freeShippingThreshold}
                    onChange={(e) =>
                      setShippingSettings({ ...shippingSettings, freeShippingThreshold: e.target.value })
                    }
                  />
                  <p className="text-sm text-slate-500">Orders above this amount qualify for free shipping</p>
                </div>
                <div className="grid gap-2">
                  <Label>Default Shipping Method</Label>
                  <Select
                    value={shippingSettings.defaultShippingMethod}
                    onValueChange={(v) => setShippingSettings({ ...shippingSettings, defaultShippingMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Shipping (5-7 days)</SelectItem>
                      <SelectItem value="expedited">Expedited Shipping (2-3 days)</SelectItem>
                      <SelectItem value="overnight">Overnight Shipping (1 day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Local Pickup</CardTitle>
                <CardDescription>Allow customers to pick up orders in person</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Local Pickup</Label>
                    <p className="text-sm text-slate-500">Allow in-store pickup</p>
                  </div>
                  <Switch
                    checked={shippingSettings.enableLocalPickup}
                    onCheckedChange={(v) => setShippingSettings({ ...shippingSettings, enableLocalPickup: v })}
                  />
                </div>
                {shippingSettings.enableLocalPickup && (
                  <div className="grid gap-2">
                    <Label htmlFor="pickupAddress">Pickup Address</Label>
                    <Textarea
                      id="pickupAddress"
                      value={shippingSettings.pickupAddress}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, pickupAddress: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Configure email sender settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Configure which emails to send to customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Order Confirmation</Label>
                    <p className="text-sm text-slate-500">Send when order is placed</p>
                  </div>
                  <Switch
                    checked={emailSettings.orderConfirmation}
                    onCheckedChange={(v) => setEmailSettings({ ...emailSettings, orderConfirmation: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Shipping Notification</Label>
                    <p className="text-sm text-slate-500">Send when order ships</p>
                  </div>
                  <Switch
                    checked={emailSettings.shippingNotification}
                    onCheckedChange={(v) => setEmailSettings({ ...emailSettings, shippingNotification: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Payment Receipt</Label>
                    <p className="text-sm text-slate-500">Send payment confirmation</p>
                  </div>
                  <Switch
                    checked={emailSettings.paymentReceipt}
                    onCheckedChange={(v) => setEmailSettings({ ...emailSettings, paymentReceipt: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Review Request</Label>
                    <p className="text-sm text-slate-500">Request review after delivery</p>
                  </div>
                  <Switch
                    checked={emailSettings.reviewRequest}
                    onCheckedChange={(v) => setEmailSettings({ ...emailSettings, reviewRequest: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admin Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Manage admin access and permissions</CardDescription>
              </div>
              <Button className="gap-2">
                <Users className="h-4 w-4" />
                Add Admin User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <span className="font-medium text-blue-600">WA</span>
                    </div>
                    <div>
                      <p className="font-medium">Web2Print Admin</p>
                      <p className="text-sm text-slate-500">admin@web2printusa.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge>Super Admin</Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <span className="font-medium text-green-600">SM</span>
                    </div>
                    <div>
                      <p className="font-medium">Store Manager</p>
                      <p className="text-sm text-slate-500">manager@web2printusa.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">Store Manager</Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>4over Integration</span>
                  <Badge className="bg-green-500">Connected</Badge>
                </CardTitle>
                <CardDescription>Fulfillment integration with 4over print provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">4over API Connected</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Products synced and ready for fulfillment
                  </p>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/admin/4over">Manage 4over Settings</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Stripe</span>
                  <Badge className="bg-green-500">Connected</Badge>
                </CardTitle>
                <CardDescription>Payment processing integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Stripe Connected</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Ready to accept payments
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  View Stripe Dashboard
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Supabase</span>
                  <Badge className="bg-green-500">Connected</Badge>
                </CardTitle>
                <CardDescription>Database and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Supabase Connected</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Database and auth ready
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  View Supabase Dashboard
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Email Provider</span>
                  <Badge variant="outline">Not Connected</Badge>
                </CardTitle>
                <CardDescription>Transactional email service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Not Configured</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">
                    Connect an email provider to send transactional emails
                  </p>
                </div>
                <Button className="w-full">Connect Email Provider</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
