import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronRight, Grid3X3, Printer, Package, FileText, MapPin, Tag, Gift, Megaphone, CreditCard, Palette, Flag, Mail } from "lucide-react"
import { CATEGORY_GROUPS, groupProductsByParentCategory, getParentCategory } from "@/lib/4over/category-mapping"

// Parent category icons matching 4over.com
const parentCategoryIcons: Record<string, any> = {
  "Business Cards": CreditCard,
  "Marketing Products": FileText,
  "Signs & Banners": Flag,
  "Boxes & Packaging": Package,
  "Roll Labels & Stickers": Tag,
  "Promo Products": Gift,
  "Direct Mail Services": Mail,
  "Other Products": Grid3X3,
}

// Subcategory icons
const subcategoryIcons: Record<string, any> = {
  "Business Cards": CreditCard,
  "Flyers/Brochures": FileText,
  "Door Hangers": MapPin,
  "Magnets": Package,
  "Event Tickets": Tag,
  "Flags": Flag,
  "Large Posters": Grid3X3,
  "Calendars": Gift,
  "Menus": FileText,
  "Letterheads": FileText,
  "EDDM": Mail,
  "Car Magnets": Package,
  "Indoor Banners": Megaphone,
  "Window Clings": Package,
  "Hang Tags": Tag,
  "Adhesive Vinyl": Palette,
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; parent?: string; search?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from("products").select("*").eq("is_active", true).order("category").order("name")

  if (params.category) {
    query = query.eq("category", params.category)
  }

  if (params.search) {
    query = query.ilike("name", `%${params.search}%`)
  }

  const { data: products } = await query

  // Get unique subcategories from DB
  const { data: allCategories } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true)

  const subcategories = [...new Set(allCategories?.map((c) => c.category).filter(Boolean))] as string[]

  // Group products by subcategory
  const productsBySubcategory: Record<string, any[]> = {}
  for (const product of products || []) {
    const cat = product.category || "Other"
    if (!productsBySubcategory[cat]) productsBySubcategory[cat] = []
    productsBySubcategory[cat].push(product)
  }

  // Group products by parent category (4over.com style)
  const productsByParentCategory = groupProductsByParentCategory(products || [])

  // Filter by parent category if specified
  let filteredProducts = products || []
  let parentCategoryName: string | null = null
  
  if (params.parent) {
    const parentGroup = CATEGORY_GROUPS.find(g => g.slug === params.parent)
    if (parentGroup) {
      parentCategoryName = parentGroup.name
      filteredProducts = (products || []).filter(p => {
        const parent = getParentCategory(p.category || "")
        return parent?.slug === params.parent
      })
    }
  }

  // Get parent category stats
  const parentCategoryStats = CATEGORY_GROUPS.map(group => ({
    ...group,
    count: productsByParentCategory[group.name]?.length || 0,
    minPrice: Math.min(...(productsByParentCategory[group.name]?.map(p => p.base_price || 0).filter(p => p > 0) || [0])),
    Icon: parentCategoryIcons[group.name] || Printer
  })).filter(g => g.count > 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {parentCategoryName || params.category || "Print Products"}
          </h1>
          <p className="text-slate-300 max-w-2xl">
            {parentCategoryName 
              ? CATEGORY_GROUPS.find(g => g.name === parentCategoryName)?.description
              : "Professional printing solutions with fast turnaround. Business cards, flyers, banners, and more."
            }
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Package className="h-4 w-4" /> {filteredProducts.length} Products</span>
            <span className="flex items-center gap-1"><Grid3X3 className="h-4 w-4" /> {Object.keys(productsByParentCategory).length} Categories</span>
          </div>
        </div>
      </div>

      {/* Main Navigation - 4over Style */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
            <Link href="/products">
              <Button 
                variant={!params.parent && !params.category ? "default" : "ghost"} 
                size="sm"
                className="whitespace-nowrap"
              >
                All Products
              </Button>
            </Link>
            {parentCategoryStats.map((cat) => (
              <Link key={cat.slug} href={`/products?parent=${cat.slug}`}>
                <Button 
                  variant={params.parent === cat.slug ? "default" : "ghost"} 
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {cat.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Subcategories (like 4over left sidebar) */}
          {(params.parent || params.category) && (
            <div className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-20">
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Categories</h3>
                <div className="space-y-1">
                  {params.parent && (
                    <>
                      {CATEGORY_GROUPS.find(g => g.slug === params.parent)?.subcategories
                        .filter(sub => productsBySubcategory[sub]?.length > 0)
                        .map(sub => (
                          <Link 
                            key={sub} 
                            href={`/products?category=${encodeURIComponent(sub)}`}
                            className={`block py-1.5 px-2 text-sm rounded hover:bg-slate-100 transition-colors ${
                              params.category === sub ? "bg-primary/10 text-primary font-medium" : ""
                            }`}
                          >
                            {sub}
                            <span className="text-muted-foreground ml-1">({productsBySubcategory[sub]?.length || 0})</span>
                          </Link>
                        ))
                      }
                    </>
                  )}
                  {params.category && !params.parent && (
                    <Link 
                      href="/products"
                      className="block py-1.5 px-2 text-sm text-primary hover:underline"
                    >
                      &larr; All Products
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Search Bar */}
            <div className="max-w-xl mb-6">
              <form className="relative" action="/products">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  name="search"
                  placeholder="Search products..."
                  defaultValue={params.search || ""}
                  className="pl-10 h-10"
                />
              </form>
            </div>

            {/* Breadcrumb */}
            {(params.parent || params.category || params.search) && (
              <div className="flex items-center gap-2 mb-6 text-sm">
                <Link href="/products" className="text-muted-foreground hover:text-foreground">Products</Link>
                {params.parent && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Link 
                      href={`/products?parent=${params.parent}`}
                      className={params.category ? "text-muted-foreground hover:text-foreground" : "font-medium"}
                    >
                      {parentCategoryName}
                    </Link>
                  </>
                )}
                {params.category && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{params.category}</span>
                  </>
                )}
                {params.search && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Search: {params.search}</span>
                  </>
                )}
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <h2 className="text-2xl font-semibold mb-2">No products found</h2>
                <p className="text-muted-foreground mb-4">Try adjusting your search or browse all products</p>
                <Link href="/products">
                  <Button>View All Products</Button>
                </Link>
              </div>
            ) : params.category || params.search ? (
              // Single category or search results - flat grid
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : params.parent ? (
              // Parent category view - show subcategories with products
              <>
                {Object.entries(productsBySubcategory)
                  .filter(([subcat]) => {
                    const parent = getParentCategory(subcat)
                    return parent?.slug === params.parent
                  })
                  .map(([subcat, prods]) => (
                    <div key={subcat} className="mb-10">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">{subcat}</h2>
                        <Link 
                          href={`/products?category=${encodeURIComponent(subcat)}`}
                          className="text-primary text-sm hover:underline flex items-center gap-1"
                        >
                          View all {prods.length} <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {prods.slice(0, 4).map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </div>
                  ))
                }
              </>
            ) : (
              // Home view - show parent category cards
              <>
                {/* Parent Category Cards */}
                <div className="mb-10">
                  <h2 className="text-xl font-bold mb-4">Browse by Category</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {parentCategoryStats.map((cat) => {
                      const IconComponent = cat.Icon
                      return (
                        <Link key={cat.slug} href={`/products?parent=${cat.slug}`}>
                          <Card className="group hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full">
                            <CardContent className="p-5">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                  <IconComponent className="h-5 w-5" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{cat.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">{cat.count} products</p>
                                  {cat.minPrice > 0 && (
                                    <p className="text-xs text-primary mt-1">From ${cat.minPrice.toFixed(2)}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Featured Products by Parent Category */}
                {Object.entries(productsByParentCategory).slice(0, 4).map(([parentName, prods]) => (
                  <div key={parentName} className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">{parentName}</h2>
                      <Link 
                        href={`/products?parent=${CATEGORY_GROUPS.find(g => g.name === parentName)?.slug}`}
                        className="text-primary text-sm hover:underline flex items-center gap-1"
                      >
                        View all {prods.length} <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {prods.slice(0, 5).map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: any }) {
  const IconComponent = subcategoryIcons[product.category] || Printer
  
  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group hover:shadow-lg transition-all h-full border hover:border-primary">
        <CardContent className="p-3">
          <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <IconComponent className="h-12 w-12 text-slate-300 group-hover:text-primary/50 transition-colors" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {product.name}
            </h3>
            {product.base_price > 0 && (
              <p className="text-sm font-semibold text-primary">
                From ${product.base_price.toFixed(2)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
