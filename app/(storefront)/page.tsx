import Link from "next/link"
import { Truck, Shield, Tag, Headphones, ArrowRight } from "lucide-react"
import { HomeHero } from "@/components/storefront/home-hero"
import { TrustindexReviews } from "@/components/storefront/trustindex-reviews"
import { APPAREL_ENABLED } from "@/lib/feature-flags"

// 8 category tiles. All route to existing pages (six /print categories,
// trading cards, and apparel). The apparel tile points at /merch when the
// apparel catalogue is live, otherwise it pre-selects Custom Apparel on the
// quote form so it never 404s. Tile art uses the REAL product photos already
// in /public/images/cat (copied from the 4over source), not generated art.
const CATEGORY_TILES = [
  { label: "Business Cards", img: "/images/cat/business-cards/foil-worx.jpg", href: "/print/business-cards" },
  { label: "Marketing Materials", img: "/images/cat/flyers-and-brochures.jpg", href: "/print/marketing-materials" },
  { label: "Signs & Banners", img: "/images/cat/outdoor-banners/scrim-vinyl.jpg", href: "/print/signs-banners" },
  { label: "Boxes & Packaging", img: "/images/cat/packaging.jpg", href: "/print/boxes-packaging" },
  { label: "Roll Labels & Stickers", img: "/images/cat/roll-labels.jpg", href: "/print/roll-labels-stickers" },
  { label: "Promo Products", img: "/images/cat/mugs.jpg", href: "/print/promo-products" },
  { label: "Trading Cards", img: "/images/cat/trading-cards.jpg", href: "/print/trading-cards" },
  {
    label: "Custom Apparel",
    img: "/images/cat/t-shirts.jpg",
    href: APPAREL_ENABLED ? "/merch" : "/quote?product=custom-apparel",
  },
]

export default async function HomePage() {
  return (
    <div>
      {/* 1 + 2. New split hero (replaces the retired slide carousel) */}
      <HomeHero />

      {/* 3. Value-prop badge strip (unchanged) */}
      <section className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200">
            {[
              { icon: <Truck className="h-5 w-5" />, title: "Free Shipping", desc: "On select products & quantities" },
              { icon: <Shield className="h-5 w-5" />, title: "Shop with Confidence", desc: "Secure & protected transactions" },
              { icon: <Tag className="h-5 w-5" />, title: "Best Offers", desc: "Unbeatable deals on every order" },
              { icon: <Headphones className="h-5 w-5" />, title: "Online Support", desc: "Here to help every step of the way" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-5">
                <div className="text-[#2c327a] shrink-0">{item.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Category grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-[-0.015em] text-[#2c327a] text-balance md:text-4xl">
            What are we printing for you?
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {CATEGORY_TILES.map((cat) => (
              <Link key={cat.label} href={cat.href} className="group flex flex-col gap-3">
                <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={cat.img || "/placeholder.svg"}
                    alt={cat.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <span className="text-center text-sm font-bold text-[#2c327a] transition-colors group-hover:text-[#e42a27] md:text-base">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Trusted by Leading Brands */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.015em] text-[#2c327a]">Trusted by leading brands</h2>
          </div>
          <div className="grid grid-cols-3 gap-6 md:grid-cols-6 md:gap-8">
            {[
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/6979be31bd9bc47e637f6b1f.svg", alt: "Mom's Kitchen" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/6979c3971fbd2c4a66368b75.png", alt: "DC Prep" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/6979be3fbd9bc4262c7f6c8f.png", alt: "Partner" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c72c90da8255945170872e.png", alt: "Miami Dade Schools" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0d7d9b3d1391fa20a5f2c.png", alt: "DC Government" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0dfec1192fae91a3c7ac2.png", alt: "UDC University" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0ba64fbf3b6d1fefb0d40.png", alt: "Hookie Life" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0d5cf52ed57400fa8ed39.png", alt: "Liberty Tax" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0b3b97f917b203dce858e.png", alt: "BCPS" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0a74cf6b49a31c7a80acc.png", alt: "MCPS" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0a74c210e4355ba262699.png", alt: "Broward Public Schools" },
              { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0a74cb3d139bbb801a884.png", alt: "Palm Beach Schools" },
            ].map((logo, i) => (
              <div
                key={i}
                className="flex h-16 items-center justify-center opacity-60 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0 md:h-20"
              >
                <img src={logo.src || "/placeholder.svg"} alt={logo.alt} className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Beyond Print banner */}
      <section className="bg-[#1f2430] py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#f0b429]">Beyond Print</p>
              <h2 className="text-3xl font-extrabold tracking-[-0.015em] text-white text-balance md:text-4xl">
                Make it official.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-300 text-pretty">
                LLC registration, web design, and getting found on Google. We help you
                build the business behind the brand — not just the print.
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-md bg-[#f0b429] px-8 py-4 text-base font-bold text-[#1f2430] transition-colors hover:bg-[#d99e1f]"
            >
              Explore business services
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. What our customers say (live Google reviews via Trustindex) */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-extrabold tracking-[-0.015em] text-[#2c327a] md:text-4xl">
              What our customers say
            </h2>
            <div className="mx-auto h-1 w-24 bg-[#e42a27]" />
          </div>
          <TrustindexReviews />
        </div>
      </section>
    </div>
  )
}
