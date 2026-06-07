"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Star, Heart, Zap, ChevronRight, Calculator } from "lucide-react"
import { COLOR_FAMILIES, getProductColors } from "@/lib/merch/colors"

// ============================================
// ALL DATA IS LOCAL - NO API NEEDED
// ============================================

const BRANDS = [
  { id: "gildan", name: "Gildan", slug: "gildan" },
  { id: "next-level", name: "Next Level", slug: "next-level" },
  { id: "bella-canvas", name: "BELLA+CANVAS", slug: "bella-canvas" },
  { id: "american-apparel", name: "American Apparel", slug: "american-apparel" },
]

const CATEGORIES = [
  { id: "crew-neck-tees", name: "Crew Neck Tees", slug: "crew-neck-tees" },
  { id: "v-neck-tees", name: "V-Neck Tees", slug: "v-neck-tees" },
  { id: "long-sleeve-tees", name: "Long Sleeve Tees", slug: "long-sleeve-tees" },
  { id: "polos", name: "Polos", slug: "polos" },
  { id: "hoodies", name: "Hoodies", slug: "hoodies" },
  { id: "sweatshirts", name: "Sweatshirts", slug: "sweatshirts" },
]

// Your exact products with pricing from the price list
const PRODUCTS = [
  // GILDAN
  { id: "g-5000", style_number: "5000", name: "Heavy Cotton Tee", fabric: "100% Cotton", weight: "5.3 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 68, base_price: 2.74, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[0], badge: "best-seller" as const },
  { id: "g-64000", style_number: "64000", name: "Softstyle Tee", fabric: "100% Ring Spun Cotton", weight: "4.5 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 55, base_price: 3.07, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[0], badge: "new" as const },
  { id: "g-3000", style_number: "3000", name: "Heavy Cotton Tank", fabric: "100% Cotton", weight: "5.3 oz", sizes: ["S", "M", "L", "XL", "2XL"], color_count: 24, base_price: 2.27, print_methods: ["silkscreen", "dtf"], brand: BRANDS[0], category: CATEGORIES[0] },
  { id: "g-2300", style_number: "2300", name: "Ultra Cotton Pocket Tee", fabric: "100% Cotton", weight: "6.0 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 18, base_price: 5.07, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[0] },
  { id: "g-2400", style_number: "2400", name: "Ultra Cotton Long Sleeve Tee", fabric: "100% Cotton", weight: "6.0 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 32, base_price: 5.05, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[2] },
  { id: "g-5300", style_number: "5300", name: "Heavy Cotton Long Sleeve Pocket Tee", fabric: "100% Cotton", weight: "5.3 oz", sizes: ["S", "M", "L", "XL", "2XL"], color_count: 8, base_price: 4.02, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[2] },
  { id: "g-64400", style_number: "64400", name: "Softstyle Long Sleeve Tee", fabric: "100% Ring Spun Cotton", weight: "4.5 oz", sizes: ["S", "M", "L", "XL", "2XL"], color_count: 20, base_price: 4.95, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[2] },
  { id: "g-18000", style_number: "18000", name: "Heavy Blend Crewneck Sweatshirt", fabric: "50% Cotton / 50% Polyester", weight: "8.0 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 45, base_price: 7.09, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[5], badge: "staff-pick" as const },
  { id: "g-18600", style_number: "18600", name: "Heavy Blend Full-Zip Hooded Sweatshirt", fabric: "50% Cotton / 50% Polyester", weight: "8.0 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 28, base_price: 18.13, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[4] },
  { id: "g-18200", style_number: "18200", name: "Heavy Blend Hoodie", fabric: "50% Cotton / 50% Polyester", weight: "8.0 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 38, base_price: 8.45, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[4] },
  { id: "g-8800", style_number: "8800", name: "DryBlend Jersey Polo", fabric: "50% Cotton / 50% Polyester", weight: "5.6 oz", sizes: ["S", "M", "L", "XL", "2XL", "3XL"], color_count: 24, base_price: 7.33, print_methods: ["silkscreen", "embroidery"], brand: BRANDS[0], category: CATEGORIES[3], badge: "top-rated" as const },
  { id: "g-sf000", style_number: "SF000", name: "Softstyle Fleece Crewneck", fabric: "80% Ring Spun Cotton / 20% Polyester", weight: "7.2 oz", sizes: ["S", "M", "L", "XL", "2XL"], color_count: 12, base_price: 9.30, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[0], category: CATEGORIES[5] },
  
  // NEXT LEVEL
  { id: "nl-3600", style_number: "3600", name: "Cotton Crew", fabric: "100% Combed Cotton", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], color_count: 52, base_price: 4.08, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[1], category: CATEGORIES[0], badge: "best-seller" as const },
  { id: "nl-3600sw", style_number: "3600SW", name: "Sueded Crew", fabric: "100% Combed Cotton Sueded", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 18, base_price: 5.90, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[1], category: CATEGORIES[0] },
  { id: "nl-6210", style_number: "6210", name: "CVC Crew", fabric: "60% Combed Cotton / 40% Polyester", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], color_count: 38, base_price: 4.19, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[1], category: CATEGORIES[0] },
  { id: "nl-3310", style_number: "3310", name: "Boyfriend Tee", fabric: "100% Combed Cotton", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 28, base_price: 3.10, print_methods: ["silkscreen", "dtf"], brand: BRANDS[1], category: CATEGORIES[0] },
  { id: "nl-6051", style_number: "6051", name: "Tri-Blend Crew", fabric: "50% Poly / 25% Cotton / 25% Rayon", weight: "4.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 32, base_price: 6.56, print_methods: ["silkscreen", "dtf"], brand: BRANDS[1], category: CATEGORIES[0] },
  { id: "nl-6411", style_number: "6411", name: "Sueded Long Sleeve Crew", fabric: "100% Combed Cotton Sueded", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 14, base_price: 8.28, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[1], category: CATEGORIES[2] },
  { id: "nl-9000", style_number: "9000", name: "French Terry Hoodie", fabric: "80% Cotton / 20% Polyester", weight: "6.5 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 22, base_price: 14.48, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[1], category: CATEGORIES[4] },
  { id: "nl-9001", style_number: "9001", name: "French Terry Raglan Hoodie", fabric: "80% Cotton / 20% Polyester", weight: "6.5 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 12, base_price: 13.99, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[1], category: CATEGORIES[4] },
  { id: "nl-9300", style_number: "9300", name: "PCH Pullover Hoodie", fabric: "52% Cotton / 48% Polyester", weight: "8.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 8, base_price: 17.73, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[1], category: CATEGORIES[4] },
  { id: "nl-7410", style_number: "7410", name: "Inspired Dye Long Sleeve Crew", fabric: "100% Combed Cotton", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 10, base_price: 6.00, print_methods: ["silkscreen", "dtf"], brand: BRANDS[1], category: CATEGORIES[2] },
  
  // BELLA+CANVAS
  { id: "bc-3001", style_number: "3001", name: "Unisex Jersey Tee", fabric: "100% Airlume Cotton", weight: "4.2 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], color_count: 98, base_price: 4.49, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[0], badge: "top-rated" as const },
  { id: "bc-3001cvc", style_number: "3001CVC", name: "Unisex Heather CVC Tee", fabric: "52% Airlume Cotton / 48% Poly", weight: "4.2 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], color_count: 45, base_price: 4.59, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[0] },
  { id: "bc-3413", style_number: "3413", name: "Unisex Triblend Tee", fabric: "50% Poly / 25% Cotton / 25% Rayon", weight: "3.8 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], color_count: 42, base_price: 6.49, print_methods: ["silkscreen", "dtf"], brand: BRANDS[2], category: CATEGORIES[0] },
  { id: "bc-3005", style_number: "3005", name: "Unisex Jersey V-Neck Tee", fabric: "100% Airlume Cotton", weight: "4.2 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 35, base_price: 5.69, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[1] },
  { id: "bc-3200", style_number: "3200", name: "Unisex 3/4-Sleeve Baseball Tee", fabric: "100% Airlume Cotton", weight: "4.2 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 28, base_price: 6.49, print_methods: ["silkscreen", "dtf"], brand: BRANDS[2], category: CATEGORIES[2] },
  { id: "bc-3415", style_number: "3415", name: "Unisex Triblend V-Neck Tee", fabric: "50% Poly / 25% Cotton / 25% Rayon", weight: "3.8 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 24, base_price: 7.19, print_methods: ["silkscreen", "dtf"], brand: BRANDS[2], category: CATEGORIES[1] },
  { id: "bc-3501", style_number: "3501", name: "Unisex Long Sleeve Jersey Tee", fabric: "100% Airlume Cotton", weight: "4.2 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 32, base_price: 7.39, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[2] },
  { id: "bc-3501cvc", style_number: "3501CVC", name: "Unisex Long Sleeve CVC Tee", fabric: "52% Airlume Cotton / 48% Poly", weight: "4.2 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 18, base_price: 7.49, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[2] },
  { id: "bc-3513", style_number: "3513", name: "Unisex Triblend Long Sleeve Tee", fabric: "50% Poly / 25% Cotton / 25% Rayon", weight: "3.8 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 16, base_price: 9.59, print_methods: ["silkscreen", "dtf"], brand: BRANDS[2], category: CATEGORIES[2] },
  { id: "bc-3719", style_number: "3719", name: "Unisex Fleece Pullover Hoodie", fabric: "52% Airlume Cotton / 48% Poly", weight: "7.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 38, base_price: 17.59, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[4], badge: "best-seller" as const },
  { id: "bc-3739", style_number: "3739", name: "Unisex Full-Zip Hoodie", fabric: "52% Airlume Cotton / 48% Poly", weight: "7.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 18, base_price: 18.59, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[4] },
  { id: "bc-3901", style_number: "3901", name: "Unisex Sponge Fleece Crewneck", fabric: "52% Airlume Cotton / 48% Poly", weight: "7.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 22, base_price: 16.49, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[5] },
  { id: "bc-3945", style_number: "3945", name: "Unisex Drop Shoulder Crewneck", fabric: "52% Airlume Cotton / 48% Poly", weight: "7.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 14, base_price: 16.59, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[2], category: CATEGORIES[5] },
  
  // AMERICAN APPAREL
  { id: "aa-2001", style_number: "2001", name: "Fine Jersey Tee", fabric: "100% Combed Cotton", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 45, base_price: 4.68, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[0], badge: "staff-pick" as const },
  { id: "aa-2001cvc", style_number: "2001CVC", name: "Fine Jersey CVC Tee", fabric: "60% Cotton / 40% Polyester", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 28, base_price: 4.68, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[0] },
  { id: "aa-1301", style_number: "1301", name: "Heavyweight Tee", fabric: "100% Combed Cotton", weight: "6.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 32, base_price: 3.25, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[0] },
  { id: "aa-1304", style_number: "1304", name: "Heavyweight Pocket Tee", fabric: "100% Combed Cotton", weight: "6.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 14, base_price: 5.36, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[0] },
  { id: "aa-2007", style_number: "2007", name: "Fine Jersey Long Sleeve Tee", fabric: "100% Combed Cotton", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 22, base_price: 7.78, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[2] },
  { id: "aa-2003cvc", style_number: "2003CVC", name: "Fine Jersey V-Neck", fabric: "60% Cotton / 40% Polyester", weight: "4.3 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 18, base_price: 6.11, print_methods: ["silkscreen", "dtf"], brand: BRANDS[3], category: CATEGORIES[1] },
  { id: "aa-9001", style_number: "AA9001", name: "California Fleece Hoodie", fabric: "100% Cotton Fleece", weight: "10.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 22, base_price: 9.65, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[4] },
  { id: "aa-9410", style_number: "9410", name: "Unisex Vintage Fleece Pullover Hoodie", fabric: "60% Cotton / 40% Polyester", weight: "8.0 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 12, base_price: 11.95, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[4] },
  { id: "aa-rf491", style_number: "RF491", name: "ReFlex Fleece Pullover Hoodie", fabric: "54% Cotton / 46% Polyester", weight: "8.5 oz", sizes: ["XS", "S", "M", "L", "XL", "2XL"], color_count: 16, base_price: 15.51, print_methods: ["silkscreen", "dtf", "embroidery"], brand: BRANDS[3], category: CATEGORIES[4] },
]

// Product images from Unsplash
const PRODUCT_IMAGES: Record<string, string> = {
  '5000': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop',
  '64000': 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop',
  '3000': 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop',
  '2300': 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&h=600&fit=crop',
  '2400': 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=600&h=600&fit=crop',
  '18000': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop',
  '18600': 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=600&fit=crop',
  '18200': 'https://images.unsplash.com/photo-1572495641004-28421ae29ed4?w=600&h=600&fit=crop',
  '8800': 'https://images.unsplash.com/photo-1625910513413-5fc45b31c1d6?w=600&h=600&fit=crop',
  '3600': 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&h=600&fit=crop',
  '6210': 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&h=600&fit=crop',
  '3310': 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=600&fit=crop',
  '9000': 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&h=600&fit=crop',
  '3001': 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=600&fit=crop',
  '3001CVC': 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=600&h=600&fit=crop',
  '3413': 'https://images.unsplash.com/photo-1618354691792-d1d42acfd860?w=600&h=600&fit=crop',
  '3005': 'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=600&h=600&fit=crop',
  '3719': 'https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=600&h=600&fit=crop',
  '2001': 'https://images.unsplash.com/photo-1554568218-0f1715e72254?w=600&h=600&fit=crop',
  '1301': 'https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=600&h=600&fit=crop',
}

const CATEGORY_IMAGES: Record<string, string> = {
  'crew-neck-tees': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop',
  'v-neck-tees': 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&h=600&fit=crop',
  'long-sleeve-tees': 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop',
  'polos': 'https://images.unsplash.com/photo-1625910513413-5fc45b31c1d6?w=600&h=600&fit=crop',
  'hoodies': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop',
  'sweatshirts': 'https://images.unsplash.com/photo-1572495641004-28421ae29ed4?w=600&h=600&fit=crop',
}

type Product = typeof PRODUCTS[0]

function getProductImage(product: Product): string {
  return PRODUCT_IMAGES[product.style_number] || CATEGORY_IMAGES[product.category?.slug] || PRODUCT_IMAGES['5000']
}

function getProductRating(product: Product): { rating: number; reviews: number } {
  const hash = product.style_number.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return { rating: 4.0 + (hash % 10) / 10, reviews: 1000 + (hash * 73) % 9000 }
}

export default function MerchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedColorFamily, setSelectedColorFamily] = useState<string>("all")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [sortBy, setSortBy] = useState("recommended")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const filteredProducts = useMemo(() => {
    return PRODUCTS
      .filter((product) => {
        if (selectedCategory !== "all" && product.category?.slug !== selectedCategory) return false
        if (selectedBrand !== "all" && product.brand?.slug !== selectedBrand) return false
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return (
            product.name.toLowerCase().includes(query) ||
            product.style_number.toLowerCase().includes(query) ||
            product.brand?.name.toLowerCase().includes(query)
          )
        }
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-low': return a.base_price - b.base_price
          case 'price-high': return b.base_price - a.base_price
          case 'name': return a.name.localeCompare(b.name)
          default: return 0
        }
      })
  }, [selectedCategory, selectedBrand, searchQuery, sortBy])

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Promo Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1529720317453-c8da503f2051?w=1920&h=400&fit=crop"
          alt="Custom apparel promotion"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#e42a27]/90 to-[#e42a27]/70" />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4">
<h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
  Custom Apparel & Merchandise
  </h1>
  <p className="text-white/90 text-lg mb-4">Screen printing, embroidery & DTF printing</p>
  <Link href="/merch/pricing">
    <Button size="lg" variant="secondary" className="font-semibold">
      <Calculator className="mr-2 h-5 w-5" />
      Get Instant Pricing
    </Button>
  </Link>
          </div>
        </div>
      </div>

      {/* Breadcrumb & Title */}
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/merch" className="hover:text-primary">All Products</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Custom Apparel</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Custom Apparel</h2>
            <p className="text-muted-foreground">{filteredProducts.length} items</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Sort By:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="sticky top-0 z-40 bg-white border-y">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Brand Filter */}
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {BRANDS.map(brand => (
                  <SelectItem key={brand.id} value={brand.slug}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Color Family Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline">Color:</span>
              <div className="flex gap-1">
                {COLOR_FAMILIES.slice(0, 10).map((family) => (
                  <button
                    key={family.name}
                    onClick={() => setSelectedColorFamily(selectedColorFamily === family.name ? "all" : family.name)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      selectedColorFamily === family.name 
                        ? 'border-primary scale-110 ring-2 ring-primary/30' 
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                    style={{ 
                      background: family.name === 'Multi' 
                        ? 'conic-gradient(red, orange, yellow, green, blue, purple, red)' 
                        : family.hex 
                    }}
                    title={family.name}
                  />
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedCategory !== "all" || selectedBrand !== "all" || selectedColorFamily !== "all" || searchQuery) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedCategory("all")
                  setSelectedBrand("all")
                  setSelectedColorFamily("all")
                  setSearchQuery("")
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid - 3 Column Like CustomInk */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              isFavorite={favorites.has(product.id)}
              onToggleFavorite={() => toggleFavorite(product.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, isFavorite, onToggleFavorite }: { 
  product: Product
  isFavorite: boolean
  onToggleFavorite: () => void 
}) {
  const { rating, reviews } = getProductRating(product)
  const colors = getProductColors(product.brand?.name || 'Gildan', 8)
  const totalColors = product.color_count || colors.length
  const imageUrl = getProductImage(product)
  
  const salePrice = product.base_price
  const originalPrice = product.base_price * 1.15

  const badgeStyles: Record<string, string> = {
    'best-seller': 'bg-orange-500 text-white',
    'staff-pick': 'bg-green-600 text-white',
    'top-rated': 'bg-blue-600 text-white',
    'new': 'bg-purple-600 text-white',
  }

  const badgeLabels: Record<string, string> = {
    'best-seller': 'Best Seller',
    'staff-pick': 'Staff Pick',
    'top-rated': 'Top Rated',
    'new': 'New',
  }

  return (
    <div className="group relative">
      {/* Product Image */}
      <Link href={`/merch/${product.id}`}>
        <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 mb-4">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* "Your Design Here" Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 text-white px-6 py-4 rounded-lg text-center transform -rotate-6 opacity-80">
              <p className="text-sm font-light italic">Your</p>
              <p className="text-2xl font-bold">DESIGN</p>
              <p className="text-sm font-light italic">Here</p>
            </div>
          </div>

          {/* Badge */}
          {product.badge && (
            <div className={`absolute top-3 left-3 px-3 py-1 rounded text-xs font-semibold ${badgeStyles[product.badge]}`}>
              {badgeLabels[product.badge]}
            </div>
          )}
        </div>
      </Link>

      {/* Favorite Button */}
      <button
        onClick={onToggleFavorite}
        className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors"
      >
        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
      </button>

      {/* Color Swatches */}
      <div className="flex items-center gap-1 mb-2">
        {colors.slice(0, 8).map((color, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full border border-slate-200"
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        ))}
        {totalColors > 8 && (
          <span className="text-xs text-muted-foreground ml-1">+{totalColors - 8}</span>
        )}
      </div>

      {/* Product Info */}
      <Link href={`/merch/${product.id}`}>
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {product.brand?.name} {product.name}
        </h3>
      </Link>

      {/* Rating */}
      <div className="flex items-center gap-1 my-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">({reviews.toLocaleString()}+)</span>
      </div>

      {/* Pricing */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-muted-foreground line-through">${originalPrice.toFixed(2)}</span>
        <span className="text-lg font-bold text-[#e42a27]">${salePrice.toFixed(2)}</span>
        <span className="text-sm text-muted-foreground">/ea for 25 items</span>
      </div>

      <Link href={`/merch/${product.id}`} className="text-sm text-[#e42a27] hover:underline">
        Pricing Details
      </Link>

      {/* Rush Available */}
      <div className="flex items-center gap-1 mt-2 text-sm text-amber-600">
        <Zap className="h-4 w-4" />
        <span>3-Day Super Rush Available</span>
      </div>

      {product.print_methods?.includes('dtf') && (
        <p className="text-sm text-muted-foreground mt-1">No Minimum</p>
      )}
    </div>
  )
}
