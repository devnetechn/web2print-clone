"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Phone, ShoppingCart, Menu } from "lucide-react"
import { useState, useEffect } from "react"
import { APPAREL_ENABLED } from "@/lib/feature-flags"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type NavLink = { label: string; href: string; muted?: boolean; accent?: boolean }
type NavGroup = { id: string; label: string; href?: string; accent?: boolean; links: NavLink[] }

const NAV_GROUPS: NavGroup[] = [
  ...(APPAREL_ENABLED
    ? [
        {
          id: "merch",
          label: "Custom Apparel",
          href: "/merch",
          accent: true,
          links: [
            { label: "Shop All Apparel", href: "/merch" },
            { label: "T-Shirts", href: "/merch?category=crew-neck-tees" },
            { label: "Polos", href: "/merch?category=polos" },
            { label: "Hoodies & Sweatshirts", href: "/merch?category=hoodies" },
            { label: "Screen Printing", href: "/merch?method=silkscreen" },
            { label: "Embroidery", href: "/merch?method=embroidery" },
            { label: "DTG Printing", href: "/merch?method=dtg" },
            { label: "Request a Quote", href: "/merch/quote", accent: true },
          ],
        } as NavGroup,
      ]
    : []),
  {
    id: "industries",
    label: "Industries We Serve",
    links: [
      { label: "Trade Shows & Events", href: "/industries/trade-shows" },
      { label: "Schools & Universities", href: "/industries/schools" },
      { label: "Government Agencies", href: "/industries/government" },
      { label: "Corporate & Enterprise", href: "/industries/corporate" },
      { label: "Restaurants", href: "/industries/restaurants" },
      { label: "Non-Profits", href: "/industries/nonprofits" },
    ],
  },
  {
    id: "printing",
    label: "Printing",
    href: "/print",
    links: [
      { label: "Business Cards", href: "/print/business-cards" },
      { label: "Marketing Products", href: "/print/marketing-materials" },
      { label: "Signs & Banners", href: "/print/signs-banners" },
      { label: "Boxes & Packaging", href: "/print/boxes-packaging" },
      { label: "Roll Labels & Stickers", href: "/print/roll-labels-stickers" },
      { label: "Promo Products", href: "/print/promo-products" },
      { label: "View All", href: "/print", accent: true },
    ],
  },
  {
    id: "programs",
    label: "Business Programs",
    links: [
      { label: "Reseller Program", href: "/programs/reseller" },
      { label: "Wholesale", href: "/programs/wholesale" },
      { label: "Affiliate Program", href: "/programs/affiliate" },
    ],
  },
  {
    id: "services",
    label: "Business Services",
    links: [
      { label: "Website Design", href: "/services/website-design" },
      { label: "Storefront Makeover", href: "/services/storefront-makeover" },
      { label: "Graphic Design", href: "/services/graphic-design" },
      { label: "Branding", href: "/services/branding" },
    ],
  },
]

export function StorefrontHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  // Listen for cart changes
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const printCart = JSON.parse(localStorage.getItem("print_cart") || "[]")
        setCartCount(printCart.length)
      } catch {
        setCartCount(0)
      }
    }

    updateCartCount()

    // Listen for storage events (cross-tab updates)
    window.addEventListener("storage", updateCartCount)

    // Also poll periodically for same-tab updates
    const interval = setInterval(updateCartCount, 1000)

    return () => {
      window.removeEventListener("storage", updateCartCount)
      clearInterval(interval)
    }
  }, [])

  return (
    <header>
      {/* Main Header Row - Logo, Search, Phone, Order Tracking, Login */}
      <div className="bg-white py-3 md:py-4 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 md:gap-6">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden -ml-2 text-slate-700"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 overflow-y-auto">
                <SheetHeader className="px-4 py-4 border-b text-left">
                  <SheetTitle>
                    <img src="/logo.png" alt="Web2Print USA Solutions" className="h-10" />
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile search */}
                <div className="p-4 border-b">
                  <div className="relative">
                    <Input
                      placeholder="Search our products here"
                      className="w-full pr-10 h-10 border-slate-300 rounded-full bg-white"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1 h-8 w-8 rounded-full text-slate-500"
                      aria-label="Search"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Mobile accordion navigation */}
                <nav className="px-2 py-2">
                  <Accordion type="single" collapsible className="w-full">
                    {NAV_GROUPS.map((group) => (
                      <AccordionItem key={group.id} value={group.id} className="border-b border-slate-100">
                        <AccordionTrigger
                          className={`px-2 py-3 text-sm font-medium hover:no-underline ${
                            group.accent ? "text-[#e42a27] font-semibold" : "text-slate-800"
                          }`}
                        >
                          {group.label}
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
                          <div className="flex flex-col">
                            {group.href && (
                              <Link
                                href={group.href}
                                onClick={() => setMobileOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-[#2c327a] hover:text-[#e42a27]"
                              >
                                {group.label} Home
                              </Link>
                            )}
                            {group.links.map((link) => (
                              <Link
                                key={link.href + link.label}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className={`px-4 py-2 text-sm hover:text-[#e42a27] ${
                                  link.accent ? "text-[#e42a27] font-semibold" : "text-slate-600"
                                }`}
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {/* Mobile utility links */}
                  <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2">
                    <Link
                      href="/templates"
                      onClick={() => setMobileOpen(false)}
                      className="px-2 py-3 text-sm text-slate-700 hover:text-[#e42a27]"
                    >
                      Free Design Templates
                    </Link>
                    <Link
                      href="/tracking"
                      onClick={() => setMobileOpen(false)}
                      className="px-2 py-3 text-sm text-slate-700 hover:text-[#e42a27]"
                    >
                      Order Tracking
                    </Link>
                    <Link
                      href="/account/login"
                      onClick={() => setMobileOpen(false)}
                      className="px-2 py-3 text-sm text-slate-700 hover:text-[#e42a27]"
                    >
                      Login / Register
                    </Link>
                    <a
                      href="tel:888-843-6867"
                      className="px-2 py-3 text-sm font-semibold text-slate-800 hover:text-[#e42a27]"
                    >
                      Call 888-843-6867
                    </a>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <img src="/logo.png" alt="Web2Print USA Solutions" className="h-14 md:h-16" />
            </Link>

            {/* Search Box - hidden on small screens (available in mobile menu) */}
            <div className="relative hidden md:block flex-1 max-w-md">
              <Input
                placeholder="Search our products here"
                className="w-full pr-10 h-10 border-slate-300 rounded-full bg-white"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-8 w-8 rounded-full text-slate-500 hover:text-[#2c327a]"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Spacer pushes right-side items to the edge on mobile */}
            <div className="flex-1 md:hidden" />

            {/* Phone - hidden below lg */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <Phone className="h-5 w-5 text-slate-600" />
              <div className="flex flex-col leading-tight">
                <span className="text-slate-500 text-xs">Phone</span>
                <a href="tel:888-843-6867" className="text-slate-800 font-semibold hover:text-[#e42a27]">
                  888-843-6867
                </a>
              </div>
            </div>

            {/* UPS Order Tracking - hidden below lg */}
            <Link href="/tracking" className="hidden lg:flex items-center gap-2 text-sm hover:text-[#e42a27]">
              <img src="https://www.ups.com/assets/resources/images/UPS_logo.svg" alt="UPS" className="h-5 w-auto" />
              <span className="text-slate-700">Order Tracking</span>
            </Link>

            {/* Cart - always visible */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 text-sm text-slate-700 hover:text-[#e42a27]"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#e42a27] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Login/Register - hidden below lg */}
            <Link href="/account/login" className="hidden lg:block text-sm text-slate-700 hover:text-[#e42a27]">
              Login/Register
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Bar - hidden below lg */}
      <nav className="bg-[#2c327a] hidden lg:block">
        <div className="container mx-auto px-4">
          <ul className="flex justify-center text-sm font-medium">
            {/* Custom Apparel - Primary CTA */}
            {APPAREL_ENABLED && (
              <li
                className="border-r border-white/30 relative"
                onMouseEnter={() => setOpenMenu("merch")}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Link
                  href="/merch"
                  className="block px-6 py-3 text-white bg-[#e42a27] hover:bg-[#c51f1f] cursor-pointer font-semibold"
                >
                  Custom Apparel
                </Link>
                {openMenu === "merch" && (
                  <div className="absolute left-0 top-full bg-white shadow-lg min-w-[260px] z-[100]">
                    <Link href="/merch" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100 font-semibold">Shop All Apparel</Link>
                    <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">By Category</div>
                    <Link href="/merch?category=crew-neck-tees" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">T-Shirts</Link>
                    <Link href="/merch?category=polos" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Polos</Link>
                    <Link href="/merch?category=hoodies" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Hoodies & Sweatshirts</Link>
                    <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase border-t">By Print Method</div>
                    <Link href="/merch?method=silkscreen" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Screen Printing</Link>
                    <Link href="/merch?method=embroidery" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Embroidery</Link>
                    <Link href="/merch?method=dtg" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">DTG Printing</Link>
                    <Link href="/merch/quote" className="block px-4 py-3 text-[#e42a27] hover:bg-[#e42a27] hover:text-white font-semibold">Request a Quote</Link>
                  </div>
                )}
              </li>
            )}
            {/* Industries We Serve */}
            <li
              className="border-r border-white/30 relative"
              onMouseEnter={() => setOpenMenu("industries")}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <span
                onClick={() => setOpenMenu(openMenu === "industries" ? null : "industries")}
                className="block px-6 py-3 text-white hover:bg-white/10 cursor-pointer"
              >
                Industries We Serve
              </span>
              {openMenu === "industries" && (
                <div className="absolute left-0 top-full bg-white shadow-lg min-w-[220px] z-[100]">
                  <Link href="/industries/trade-shows" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Trade Shows & Events</Link>
                  <Link href="/industries/schools" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Schools & Universities</Link>
                  <Link href="/industries/government" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Government Agencies</Link>
                  <Link href="/industries/corporate" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Corporate & Enterprise</Link>
                  <Link href="/industries/restaurants" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Restaurants</Link>
                  <Link href="/industries/nonprofits" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white">Non-Profits</Link>
                </div>
              )}
            </li>
            {/* Printing dropdown */}
            <li
              className="border-r border-white/30 relative"
              onMouseEnter={() => setOpenMenu("printing")}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href="/print"
                className="block px-6 py-3 text-white hover:bg-white/10 cursor-pointer"
              >
                Printing
              </Link>
              {openMenu === "printing" && (
                <div className="absolute left-0 top-full bg-white shadow-lg min-w-[240px] z-[100]">
                  <Link href="/print/business-cards" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Business Cards</Link>
                  <Link href="/print/marketing-materials" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Marketing Products</Link>
                  <Link href="/print/signs-banners" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Signs & Banners</Link>
                  <Link href="/print/boxes-packaging" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Boxes & Packaging</Link>
                  <Link href="/print/roll-labels-stickers" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Roll Labels & Stickers</Link>
                  <Link href="/print/promo-products" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Promo Products</Link>
                  {/* 2026-07-10: "Direct Mail Services" link removed from this
                      dropdown per explicit user request. 2026-07-11: EDDM/
                      Direct Mail Services removed entirely (not just this nav
                      link) per Boss Dwayne's follow-up request -- the
                      underlying "/print/eddm" page no longer exists. */}
                  <Link href="/templates" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Free Design Templates</Link>
                  <Link href="/print" className="block px-4 py-3 text-[#e42a27] hover:bg-[#e42a27] hover:text-white font-semibold">View All</Link>
                </div>
              )}
            </li>
            {/* Business Programs */}
            <li
              className="border-r border-white/30 relative"
              onMouseEnter={() => setOpenMenu("programs")}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <span
                onClick={() => setOpenMenu(openMenu === "programs" ? null : "programs")}
                className="block px-6 py-3 text-white hover:bg-white/10 cursor-pointer"
              >
                Business Programs
              </span>
              {openMenu === "programs" && (
                <div className="absolute left-0 top-full bg-white shadow-lg min-w-[220px] z-[100]">
                  <Link href="/programs/reseller" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Reseller Program</Link>
                  <Link href="/programs/wholesale" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Wholesale</Link>
                  <Link href="/programs/affiliate" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white">Affiliate Program</Link>
                </div>
              )}
            </li>
            {/* Business Services */}
            <li
              className="border-r border-white/30 relative"
              onMouseEnter={() => setOpenMenu("services")}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <span
                onClick={() => setOpenMenu(openMenu === "services" ? null : "services")}
                className="block px-6 py-3 text-white hover:bg-white/10 cursor-pointer"
              >
                Business Services
              </span>
              {openMenu === "services" && (
                <div className="absolute left-0 top-full bg-white shadow-lg min-w-[220px] z-[100]">
                  <Link href="/services/website-design" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Website Design</Link>
                  <Link href="/services/storefront-makeover" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Storefront Makeover</Link>
                  <Link href="/services/graphic-design" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Graphic Design</Link>
                  <Link href="/services/branding" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white">Branding</Link>
                </div>
              )}
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}
