"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Phone, ShoppingCart, Menu, User, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { HeaderSearch } from "@/components/storefront/header-search"
import { createClient } from "@/lib/supabase/client"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NavLink = { label: string; href: string; muted?: boolean; accent?: boolean; comingSoon?: boolean }
type NavGroup = { id: string; label: string; href?: string; accent?: boolean; links: NavLink[] }

// Simplified top nav per the homepage restructure: About, Industries We Serve,
// Printing, Beyond Print. "About" is a simple link (no dropdown). Beyond Print
// groups the business-services offerings; every link resolves to a real route
// (the services hub, website design, storefront makeover, or the quote form) so
// nothing 404s.
const NAV_GROUPS: NavGroup[] = [
  {
    id: "about",
    label: "About",
    href: "/about",
    links: [],
  },
  {
    id: "industries",
    label: "Industries We Serve",
    href: "/industries",
    links: [
      { label: "Beauty & Grooming", href: "/industries/beauty-grooming" },
      { label: "Home Services & Trades", href: "/industries/home-services-trades" },
      { label: "Food & Restaurants", href: "/industries/food-restaurants" },
      { label: "Real Estate Pros", href: "/industries/real-estate" },
      { label: "Medical & Dental Practices", href: "/industries/medical-dental" },
      { label: "Nightlife & Events", href: "/industries/nightlife-events" },
      { label: "Schools & Government", href: "/industries/schools-government" },
      { label: "View All Industries", href: "/industries", accent: true },
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
    id: "beyond-print",
    label: "Beyond Print",
    href: "/services",
    links: [
      { label: "Start a Business", href: "/services" },
      { label: "Web Design", href: "/services/website-design" },
      { label: "Get Found on Google", href: "/services", comingSoon: true },
      { label: "Graphic Design", href: "/services", comingSoon: true },
      { label: "Storefront Makeover", href: "/services/storefront-makeover" },
      { label: "Request a Quote", href: "/quote", accent: true },
    ],
  },
]

export function StorefrontHeader() {
  const router = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)

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

  // Track login state so the header can switch between "Login" and an
  // account menu with Logout, and stay in sync across tabs / sign-in events.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

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
                  className="lg:hidden -ml-2 h-11 w-11 text-[#2c327a] hover:text-[#2c327a] hover:bg-[#2c327a]/10"
                  aria-label="Open menu"
                >
                  <Menu className="h-7 w-7" strokeWidth={2.75} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 overflow-y-auto">
                <SheetHeader className="px-4 py-4 border-b text-left">
                  <SheetTitle>
                    <img src="/logo.png" alt="Web2Print USA Solutions" className="h-10" />
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile accordion navigation */}
                <nav className="px-2 py-2">
                  <Accordion type="single" collapsible className="w-full">
                    {NAV_GROUPS.filter((group) => group.id !== "beyond-print").map((group) =>
                      group.links.length === 0 ? (
                        // No dropdown (e.g. About) -> render as a direct link
                        <Link
                          key={group.id}
                          href={group.href || "#"}
                          onClick={() => setMobileOpen(false)}
                          className="flex px-2 py-3 text-sm font-medium text-slate-800 hover:text-[#e42a27] border-b border-slate-100"
                        >
                          {group.label}
                        </Link>
                      ) : (
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
                              {group.links.map((link) =>
                                link.comingSoon ? (
                                  <span
                                    key={link.href + link.label}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 cursor-not-allowed"
                                  >
                                    {link.label}
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      Coming Soon
                                    </span>
                                  </span>
                                ) : (
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
                                ),
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    )}
                  </Accordion>

                  {/* Mobile utility links (Login/Register removed -> sign-in
                      now lives in the cart/checkout flow) */}
                  <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2">
                    <Link
                      href="/tracking"
                      onClick={() => setMobileOpen(false)}
                      className="px-2 py-3 text-sm text-slate-700 hover:text-[#e42a27]"
                    >
                      Order Tracking
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
              <img src="/logo.png" alt="Web2Print USA Solutions" className="h-20 md:h-24" />
            </Link>

            {/* Spacer pushes the search + right-side cluster together toward the
                right, so the search sits next to the phone number. */}
            <div className="flex-1" />

            {/* Search Box - hidden on small screens (available in mobile menu).
                Self-contained: recent searches, categories, trending. */}
            <div className="hidden md:block md:mr-6 lg:mr-8">
              <HeaderSearch variant="desktop" />
            </div>

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

            {/* CTA buttons - both stay visible on mobile per spec.
                Login/Register was removed from the header; sign-in now lives
                inside the cart/checkout flow. */}
            <Link
              href="/quote"
              className="hidden sm:inline-flex items-center rounded-md border-2 border-[#2c327a] px-3 py-2 text-xs font-bold text-[#2c327a] transition-colors hover:bg-[#2c327a] hover:text-white lg:px-4 lg:text-sm"
            >
              Get Quote
            </Link>
            <Link
              href="/print"
              className="inline-flex items-center rounded-md bg-[#e42a27] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#c51f1f] lg:px-4 lg:text-sm"
            >
              Shop Print
            </Link>

            {/* Account - always visible. Shows a plain login link when
                signed out, or a dropdown with Logout when signed in. */}
            {userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center text-sm text-slate-700 hover:text-[#e42a27]"
                    aria-label="Account menu"
                  >
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="truncate font-normal text-slate-500">
                    {userEmail}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/account/login"
                className="flex items-center text-sm text-slate-700 hover:text-[#e42a27]"
                aria-label="Login or Sign Up"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

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
          </div>

          {/* Always-visible full-width mobile search (like the reference).
              Hidden on md+ where the inline top-bar search is used instead. */}
          <div className="md:hidden pb-3">
            <HeaderSearch variant="mobile" />
          </div>
        </div>
      </div>

      {/* Desktop Navigation Bar - hidden below lg */}
      <nav className="bg-[#2c327a] hidden lg:block">
        <div className="container mx-auto px-4">
          <ul className="flex justify-center text-sm font-medium">
            {NAV_GROUPS.map((group) => {
              const hasDropdown = group.links.length > 0
              return (
                <li
                  key={group.id}
                  className="border-r border-white/30 relative first:border-l"
                  onMouseEnter={() => hasDropdown && setOpenMenu(group.id)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {group.href ? (
                    <Link href={group.href} className="block px-6 py-3 text-white hover:bg-white/10 cursor-pointer">
                      {group.label}
                    </Link>
                  ) : (
                    <span
                      onClick={() => setOpenMenu(openMenu === group.id ? null : group.id)}
                      className="block px-6 py-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      {group.label}
                    </span>
                  )}
                  {hasDropdown && openMenu === group.id && (
                    <div className="absolute left-0 top-full bg-white shadow-lg min-w-[240px] z-[100]">
                      {group.links.map((link, i) =>
                        link.comingSoon ? (
                          <span
                            key={link.href + link.label}
                            className={`flex items-center justify-between gap-2 px-4 py-3 text-slate-400 cursor-not-allowed ${
                              i < group.links.length - 1 ? "border-b border-slate-100" : ""
                            }`}
                          >
                            {link.label}
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Coming Soon
                            </span>
                          </span>
                        ) : (
                          <Link
                            key={link.href + link.label}
                            href={link.href}
                            className={`block px-4 py-3 hover:bg-[#2c327a] hover:text-white ${
                              i < group.links.length - 1 ? "border-b border-slate-100" : ""
                            } ${link.accent ? "text-[#e42a27] font-semibold hover:bg-[#e42a27]" : "text-slate-700"}`}
                          >
                            {link.label}
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </header>
  )
}
