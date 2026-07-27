"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, X, Clock, ChevronRight, TrendingUp, LayoutGrid } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const RECENT_KEY = "w2p-recent-searches"
const MAX_RECENT = 6

// Top-level categories — every href resolves to a real /print/[category] page.
const CATEGORIES: { label: string; href: string }[] = [
  { label: "Business Cards", href: "/print/business-cards" },
  { label: "Marketing Products", href: "/print/marketing-materials" },
  { label: "Signs & Banners", href: "/print/signs-banners" },
  { label: "Boxes & Packaging", href: "/print/boxes-packaging" },
  { label: "Roll Labels & Stickers", href: "/print/roll-labels-stickers" },
  { label: "Promo Products", href: "/print/promo-products" },
]

// Trending products — real product-type pages (/print/[category]/[typeSlug])
// with the catalog's own images.
const TRENDING: { name: string; category: string; href: string; img: string }[] = [
  { name: "Silk Business Cards", category: "Business Cards", href: "/print/business-cards/silk-cards", img: "/images/cat/business-cards/silk.jpg" },
  { name: "Raised Foil Cards", category: "Business Cards", href: "/print/business-cards/raised-foil", img: "/images/cat/business-cards/raised-foil.jpg" },
  { name: "Foil Worx Trading Cards", category: "Marketing Products", href: "/print/marketing-materials/trading-cards", img: "/images/cat/trading-cards.jpg" },
  { name: "Postcards", category: "Marketing Products", href: "/print/marketing-materials/postcards", img: "/images/cat/postcards.jpg" },
  { name: "Outdoor Banners", category: "Signs & Banners", href: "/print/signs-banners/outdoor-banners", img: "/images/signs/outdoor-banners.jpg" },
  { name: "Roll Labels", category: "Roll Labels & Stickers", href: "/print/roll-labels-stickers/roll-labels", img: "/images/cat/roll-labels.jpg" },
  { name: "Custom T-Shirts", category: "Promo Products", href: "/print/promo-products/t-shirts", img: "/images/cat/t-shirts.jpg" },
  { name: "Custom Packaging", category: "Boxes & Packaging", href: "/print/boxes-packaging/packaging", img: "/images/cat/packaging.jpg" },
]

export function HeaderSearch({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage on mount.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
      if (Array.isArray(stored)) setRecent(stored.slice(0, MAX_RECENT))
    } catch {
      /* ignore malformed storage */
    }
  }, [])

  // Close on outside click (desktop dropdown only).
  useEffect(() => {
    if (variant !== "desktop") return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [variant])

  function persistRecent(next: string[]) {
    setRecent(next)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  function runSearch(raw: string) {
    const q = raw.trim()
    if (!q) return
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT)
    persistRecent(next)
    setOpen(false)
    setQuery("")
    router.push(`/products?search=${encodeURIComponent(q)}`)
  }

  function removeRecent(term: string) {
    persistRecent(recent.filter((r) => r !== term))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch(query)
  }

  const isMobile = variant === "mobile"

  return (
    <div ref={containerRef} className={`relative ${isMobile ? "w-full" : "hidden md:block w-48 lg:w-56"}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search products"
          className="w-full pr-10 h-10 border-slate-300 rounded-full bg-white"
          aria-label="Search products"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1 h-8 w-8 rounded-full text-slate-500 hover:text-[#2c327a]"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {open && (
        <div
          className={`z-[120] rounded-xl border border-slate-200 bg-white shadow-2xl ${
            isMobile
              ? "mt-3"
              : "absolute left-0 top-full mt-2 w-[540px] max-w-[calc(100vw-15rem)] max-h-[70vh] overflow-y-auto"
          }`}
        >
          {/* Recent searches */}
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
              {recent.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  <button
                    type="button"
                    onClick={() => runSearch(term)}
                    className="inline-flex items-center gap-1 hover:text-[#2c327a]"
                  >
                    <Clock className="h-3 w-3" />
                    {term}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecent(term)}
                    aria-label={`Remove ${term}`}
                    className="text-slate-400 hover:text-[#e42a27]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className={`gap-4 p-4 ${isMobile ? "flex flex-col" : "grid grid-cols-[200px_1fr]"}`}>
            {/* Categories */}
            <div className={isMobile ? "" : "border-r border-slate-100 pr-4"}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#2c327a]">
                <LayoutGrid className="h-4 w-4" />
                Categories
              </div>
              <ul className="space-y-1">
                {CATEGORIES.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2c327a]"
                    >
                      {c.label}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trending products */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#e42a27]">
                <TrendingUp className="h-4 w-4" />
                Trending Products
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TRENDING.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      <Image src={p.img || "/placeholder.svg"} alt={p.name} fill className="object-cover" sizes="48px" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                      <div className="truncate text-xs text-slate-400">{p.category}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
