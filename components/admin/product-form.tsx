"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Save, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { saveProduct } from "@/app/actions/products"

type ProductOption = {
  name: string
  values: string[]
  priceModifiers?: Record<string, number>
}

type ProductFormProps = {
  product?: {
    id: string
    name: string
    slug: string
    description: string | null
    category: string
    base_price: number
    is_active: boolean
    provider_product_id: string | null
    options: ProductOption[] | null
    image_url: string | null
  }
}

const CATEGORIES = [
  "Business Cards",
  "Postcards & Flyers",
  "Brochures",
  "Banners & Signs",
  "Marketing Materials",
  "Stickers & Labels",
  "Promotional Items",
]

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    category: product?.category || "Business Cards",
    base_price: product?.base_price?.toString() || "",
    is_active: product?.is_active ?? true,
    provider_product_id: product?.provider_product_id || "",
    image_url: product?.image_url || "",
  })
  const [options, setOptions] = useState<ProductOption[]>(product?.options || [])
  const [newOptionName, setNewOptionName] = useState("")
  const [newOptionValue, setNewOptionValue] = useState("")
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null)

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: product ? prev.slug : generateSlug(name)
    }))
  }

  const addOption = () => {
    if (!newOptionName.trim()) return
    setOptions(prev => [...prev, { name: newOptionName.trim(), values: [] }])
    setNewOptionName("")
    setSelectedOptionIndex(options.length)
  }

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index))
    if (selectedOptionIndex === index) {
      setSelectedOptionIndex(null)
    }
  }

  const addOptionValue = () => {
    if (selectedOptionIndex === null || !newOptionValue.trim()) return
    setOptions(prev => prev.map((opt, i) => 
      i === selectedOptionIndex 
        ? { ...opt, values: [...opt.values, newOptionValue.trim()] }
        : opt
    ))
    setNewOptionValue("")
  }

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    setOptions(prev => prev.map((opt, i) => 
      i === optionIndex 
        ? { ...opt, values: opt.values.filter((_, vi) => vi !== valueIndex) }
        : opt
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const productData = {
        id: product?.id,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        category: formData.category,
        base_price: parseFloat(formData.base_price) || 0,
        is_active: formData.is_active,
        provider_product_id: formData.provider_product_id || null,
        image_url: formData.image_url || null,
        options: options.length > 0 ? options : null,
      }

      await saveProduct(productData)
      router.push("/admin/products")
      router.refresh()
    } catch (error) {
      console.error("Failed to save product:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {product ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="text-muted-foreground">
              {product ? "Update product details and options" : "Create a new product for your catalog"}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Product
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Product name, description, and category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Premium Business Cards"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="premium-business-cards"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your product..."
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7"
                      value={formData.base_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Options */}
          <Card>
            <CardHeader>
              <CardTitle>Product Options</CardTitle>
              <CardDescription>Configure customizable options like size, finish, quantity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Option name (e.g., Size, Paper, Finish)"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                />
                <Button type="button" onClick={addOption} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>

              {options.length > 0 && (
                <div className="space-y-4 pt-4">
                  {options.map((option, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border ${selectedOptionIndex === index ? 'border-primary bg-primary/5' : 'bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          className="font-medium text-left"
                          onClick={() => setSelectedOptionIndex(index)}
                        >
                          {option.name}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value, vi) => (
                          <Badge key={vi} variant="secondary" className="gap-1">
                            {value}
                            <button
                              type="button"
                              onClick={() => removeOptionValue(index, vi)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {option.values.length === 0 && (
                          <span className="text-sm text-muted-foreground">No values added</span>
                        )}
                      </div>
                      {selectedOptionIndex === index && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Input
                            value={newOptionValue}
                            onChange={(e) => setNewOptionValue(e.target.value)}
                            placeholder={`Add ${option.name.toLowerCase()} value`}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOptionValue())}
                            className="flex-1"
                          />
                          <Button type="button" onClick={addOptionValue} size="sm">
                            Add Value
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Product is visible in the store
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4over Integration</CardTitle>
              <CardDescription>Link to 4over product catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="provider_product_id">4over Product ID</Label>
                <Input
                  id="provider_product_id"
                  value={formData.provider_product_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider_product_id: e.target.value }))}
                  placeholder="e.g., BC-001"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 4over product ID to enable automatic fulfillment
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              {formData.image_url && (
                <div className="mt-4">
                  <img
                    src={formData.image_url}
                    alt="Product preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
