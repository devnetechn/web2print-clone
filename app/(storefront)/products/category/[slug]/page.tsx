import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, Grid3X3, List, SlidersHorizontal, Printer, Package, FileText, CreditCard, Tag, Megaphone, MapPin, Gift, Palette } from "lucide-react"

// Category icons mapping
const categoryIcons: Record<string, any> = {
  "business-cards": CreditCard,
  "flyers-brochures": FileText,
  "door-hangers": MapPin,
  "magnets": Package,
  "event-tickets": Tag,
  "flags": Megaphone,
  "large-posters": Grid3X3,
  "calendars": Gift,
  "menus": FileText,
  "letterheads": FileText,
  "eddm": Megaphone,
  "car-magnets": Package,
  "indoor-banners": Megaphone,
  "window-clings": Package,
  "hang-tags": Tag,
  "adhesive-vinyl": Palette,
}

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[\/\s]+/g, "-")
}

export default async function CategoryPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; view?: string }>
}) {
  const { slug } = await params
  const { sort = "name", view = "grid" } = await searchParams
  const supabase = await createClient()

  // Convert slug to category name (e.g., "business-cards" -> "Business Cards")
  const categoryName = slugToName(slug)

  // Build query with sorting
  let query = supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .ilike("category", categoryName)

  // Apply sorting
  switch (sort) {
    case "price-low":
      query = query.order("base_price", { ascending: true })
      break
    case "price-high":
      query = query.order("base_price", { ascending: false })
      break
    case "newest":
      query = query.order("created_at", { ascending: false })
      break
    default:
      query = query.order("name")
  }

  const { data: products, error } = await query

  if (error || !products || products.length === 0) {
    // Try a more flexible match
    const { data: allProducts } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
    
    const matchedProducts = allProducts?.filter(p => 
      nameToSlug(p.category || "") === slug
    )
    
    if (!matchedProducts || matchedProducts.length === 0) {
      notFound()
    }
  }

  const actualProducts = products || []
  const actualCategory = actualProducts[0]?.category || categoryName

  // Get all categories for sidebar
  const { data: allCategories } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true)
  
  const categories = [...new Set(allCategories?.map(c => c.category).filter(Boolean))] as string[]

  // Calculate price range
  const prices = actualProducts.map(p => p.base_price || 0).filter(p => p > 0)
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

  const IconComponent = categoryIcons[slug] || Printer

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/products" className="text-muted-foreground hover:text-foreground">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{actualCategory}</span>
          </div>
        </div>
      </div>

      {/* Category Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconComponent className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{actualCategory}</h1>
              <p className="text-muted-foreground">
                {actualProducts.length} products available
                {minPrice > 0 && ` • Starting at $${minPrice.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Categories */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-4 space-y-6">
              {/* Categories */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {categories.map((cat) => {
                      const catSlug = nameToSlug(cat)
                      const isActive = catSlug === slug
                      return (
                        <Link
                          key={cat}
                          href={`/products/category/${catSlug}`}
                          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive 
                              ? "bg-primary text-primary-foreground font-medium" 
                              : "hover:bg-slate-100"
                          }`}
                        >
                          {cat}
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Price Range Info */}
              {minPrice > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Price Range</h3>
                    <p className="text-sm text-muted-foreground">
                      ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Help */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Our print experts can help you choose the right product.
                  </p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground">
                Showing {actualProducts.length} products
              </p>
              <div className="flex items-center gap-4">
                {/* Sort */}
                <Select defaultValue={sort}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">
                      <Link href={`/products/category/${slug}?sort=name`} className="block w-full">Name (A-Z)</Link>
                    </SelectItem>
                    <SelectItem value="price-low">
                      <Link href={`/products/category/${slug}?sort=price-low`} className="block w-full">Price: Low to High</Link>
                    </SelectItem>
                    <SelectItem value="price-high">
                      <Link href={`/products/category/${slug}?sort=price-high`} className="block w-full">Price: High to Low</Link>
                    </SelectItem>
                    <SelectItem value="newest">
                      <Link href={`/products/category/${slug}?sort=newest`} className="block w-full">Newest</Link>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex border rounded-md">
                  <Link 
                    href={`/products/category/${slug}?sort=${sort}&view=grid`}
                    className={`p-2 ${view === "grid" ? "bg-slate-100" : ""}`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Link>
                  <Link 
                    href={`/products/category/${slug}?sort=${sort}&view=list`}
                    className={`p-2 ${view === "list" ? "bg-slate-100" : ""}`}
                  >
                    <List className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Products Grid/List */}
            {view === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {actualProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {actualProducts.map((product) => (
                  <ProductListItem key={product.id} product={product} />
                ))}
              </div>
            )}

            {actualProducts.length === 0 && (
              <div className="text-center py-20">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No products found</h2>
                <p className="text-muted-foreground mb-4">
                  We couldn&apos;t find any products in this category.
                </p>
                <Button asChild>
                  <Link href="/products">Browse All Products</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: any }) {
  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group hover:shadow-lg transition-all h-full border hover:border-primary">
        <CardContent className="p-4">
          <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <Printer className="h-12 w-12 text-slate-300" />
            )}
          </div>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {product.name}
          </h3>
          {product.base_price > 0 && (
            <p className="text-primary font-semibold">
              From ${product.base_price.toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function ProductListItem({ product }: { product: any }) {
  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group hover:shadow-md transition-all hover:border-primary">
        <CardContent className="p-4 flex gap-4">
          <div className="w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <Printer className="h-10 w-10 text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium group-hover:text-primary transition-colors mb-1">
              {product.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {product.description || `High-quality ${product.category} with professional printing.`}
            </p>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{product.category}</Badge>
              {product.base_price > 0 && (
                <span className="text-primary font-semibold">
                  From ${product.base_price.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <Button size="sm">View Product</Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
