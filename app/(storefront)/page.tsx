import Link from "next/link"
import { Truck, Shield, Tag, Headphones } from "lucide-react"
import { HeroSlider } from "@/components/storefront/hero-slider"
import { TrustindexReviews } from "@/components/storefront/trustindex-reviews"

export default async function HomePage() {
  return (
    <div>
      <HeroSlider />

      {/* Trust Bar - directly below hero */}
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

      {/* Category Grid Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#2c327a] mb-10 text-balance">
            Custom T-shirts &amp; Promotional Products for Your Brand
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: "T-shirts",             img: "/categories/tshirts.jpg",    href: "/merch?category=tshirts" },
              { label: "Sweatshirts",          img: "/categories/sweatshirts.jpg", href: "/merch?category=sweatshirts" },
              { label: "Hats",                 img: "/categories/hats.jpg",       href: "/merch?category=hats" },
              { label: "Tradeshow & Signage",  img: "/categories/tradeshow.jpg",  href: "/merch?category=tradeshow" },
              { label: "Bags",                 img: "/categories/bags.jpg",       href: "/merch?category=bags" },
              { label: "Drinkware",            img: "/categories/drinkware.jpg",  href: "/merch?category=drinkware" },
              { label: "Polos & Business Wear",img: "/categories/polos.jpg",      href: "/merch?category=polos" },
              { label: "Workwear & Uniforms",  img: "/categories/workwear.jpg",   href: "/merch?category=workwear" },
              { label: "Office Supplies",      img: "/categories/office.jpg",     href: "/merch?category=office" },
              { label: "Technology",           img: "/categories/technology.jpg", href: "/merch?category=technology" },
              { label: "Signage",              img: "/categories/signage.jpg",    href: "/merch?category=signage" },
              { label: "Activewear",           img: "/categories/activewear.jpg", href: "/merch?category=activewear" },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group flex flex-col gap-2"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={cat.img}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="text-sm md:text-base font-semibold text-[#2c327a] group-hover:text-[#e42a27] transition-colors">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted Brands Section */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Trusted by Leading Brands</h2>
            <Link href="/merch/brands" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              See All Brands
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
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
                className="flex items-center justify-center h-16 md:h-20 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-200"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2c327a] mb-3">WHAT OUR CUSTOMERS SAY</h2>
            <div className="w-24 h-1 bg-[#e42a27] mx-auto" />
          </div>
          <TrustindexReviews />
        </div>
      </section>


    </div>
  )
}
