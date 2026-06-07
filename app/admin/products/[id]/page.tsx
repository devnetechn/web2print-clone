import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, ExternalLink, Package, DollarSign, Tag, Calendar } from "lucide-react"
import Link from "next/link"
import { DeleteProductButton } from "@/components/admin/delete-product-button"

export default async function AdminProductDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !product) {
    notFound()
  }

  // Get product options count
  const { count: optionsCount } = await supabase
    .from("product_options")
    .select("*", { count: "exact", head: true })
    .eq("product_id", id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground">{product.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/products/${product.id}`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Store
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/products/${product.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Link>
          </Button>
          <DeleteProductButton productId={product.id} productName={product.name} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Product Name</p>
                  <p className="font-medium">{product.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">URL Slug</p>
                  <code className="text-sm bg-slate-100 px-2 py-1 rounded">{product.slug || "N/A"}</code>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{product.description || "No description"}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="font-semibold text-lg">${Number(product.base_price).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4over Integration */}
          <Card>
            <CardHeader>
              <CardTitle>4over Integration</CardTitle>
              <CardDescription>Print fulfillment provider configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Print Provider</p>
                  <p className="font-medium">{product.print_provider || "Not configured"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">4over Product ID</p>
                  {product.fourover_id ? (
                    <code className="text-sm bg-slate-100 px-2 py-1 rounded">{product.fourover_id}</code>
                  ) : (
                    <span className="text-muted-foreground">Not mapped</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider Product ID</p>
                  {product.provider_product_id ? (
                    <code className="text-sm bg-slate-100 px-2 py-1 rounded">{product.provider_product_id}</code>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product Options</p>
                  <p className="font-medium">{optionsCount || 0} options configured</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Options */}
          {product.options && Array.isArray(product.options) && product.options.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Product Options</CardTitle>
                <CardDescription>Customizable options for this product</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {product.options.map((option: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <p className="font-medium mb-2">{option.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {option.values?.map((value: string, vi: number) => (
                          <Badge key={vi} variant="secondary">{value}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product ID</p>
                  <code className="text-xs">{product.id.slice(0, 8)}...</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="font-semibold">${Number(product.base_price).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Tag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Options</p>
                  <p className="font-semibold">{optionsCount || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {product.created_at 
                      ? new Date(product.created_at).toLocaleDateString()
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
            </CardHeader>
            <CardContent>
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg border"
                />
              ) : (
                <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Package className="h-12 w-12 text-slate-300" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
