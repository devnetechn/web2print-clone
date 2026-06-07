"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Phone, ShoppingCart } from "lucide-react"
import { useState, useEffect } from "react"

export function StorefrontHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
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
      <div className="bg-white py-4 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <img src="/logo.png" alt="Web2Print USA Solutions" className="h-14" />
            </Link>

            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search our products here"
                className="w-full pr-10 h-10 border-slate-300 rounded-full bg-white"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-8 w-8 rounded-full text-slate-500 hover:text-[#2c327a]"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-5 w-5 text-slate-600" />
              <div className="flex flex-col leading-tight">
                <span className="text-slate-500 text-xs">Phone</span>
                <a href="tel:888-843-6867" className="text-slate-800 font-semibold hover:text-[#e42a27]">
                  888-843-6867
                </a>
              </div>
            </div>

            {/* UPS Order Tracking */}
            <Link href="/tracking" className="flex items-center gap-2 text-sm hover:text-[#e42a27]">
              <img src="https://www.ups.com/assets/resources/images/UPS_logo.svg" alt="UPS" className="h-5 w-auto" />
              <span className="text-slate-700">Order Tracking</span>
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative flex items-center gap-2 text-sm text-slate-700 hover:text-[#e42a27]">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#e42a27] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Login/Register */}
            <Link href="/auth/login" className="text-sm text-slate-700 hover:text-[#e42a27]">
              Login/Register
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="bg-[#2c327a]">
        <div className="container mx-auto px-4">
          <ul className="flex justify-center text-sm font-medium">
            {/* Custom Apparel - Primary CTA */}
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
                  <Link href="/print/marketing-materials" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Marketing Materials</Link>
                  <Link href="/print/signs-banners" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Signs & Banners</Link>
                  <Link href="/print/boxes-packaging" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Boxes & Packaging</Link>
                  <Link href="/print/roll-labels-stickers" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Roll Labels & Stickers</Link>
                  <Link href="/print/promo-products" className="block px-4 py-3 text-slate-700 hover:bg-[#2c327a] hover:text-white border-b border-slate-100">Promo Products</Link>
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
