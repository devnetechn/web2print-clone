import Link from "next/link"
import { ChevronLeft } from "lucide-react"

const BRANDS = [
  { name: "Gildan", slug: "gildan", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Gildan_logo.svg/200px-Gildan_logo.svg.png" },
  { name: "BELLA+CANVAS", slug: "bella-canvas", logo: "https://images.squarespace-cdn.com/content/v1/5e949a92e17d55230cd1d44f/1605819270453-2LPKXW6R4EZJH2R4JRXW/BELLA%2BCANVAS.png" },
  { name: "Next Level", slug: "next-level", logo: "https://www.nextlevelapparel.com/media/logo/websites/1/2020_NL_Logo_Black.png" },
  { name: "American Apparel", slug: "american-apparel", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/American_Apparel_logo.svg/200px-American_Apparel_logo.svg.png" },
  { name: "Comfort Colors", slug: "comfort-colors", logo: "https://images.squarespace-cdn.com/content/v1/5e949a92e17d55230cd1d44f/1605819379040-1VR6JJN8YZZFVZ5QKZXS/Comfort+Colors.png" },
  { name: "Champion", slug: "champion", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Champion_logo2.svg/200px-Champion_logo2.svg.png" },
  { name: "Carhartt", slug: "carhartt", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Carhartt_logo.svg/200px-Carhartt_logo.svg.png" },
  { name: "Nike", slug: "nike", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png" },
  { name: "Adidas", slug: "adidas", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/200px-Adidas_Logo.svg.png" },
  { name: "New Era", slug: "new-era", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/New_Era_logo.svg/200px-New_Era_logo.svg.png" },
  { name: "Richardson", slug: "richardson", logo: "https://www.richardsonsports.com/media/logo/websites/1/Richardson_Logo.png" },
  { name: "The North Face", slug: "the-north-face", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/The_North_Face_logo.svg/200px-The_North_Face_logo.svg.png" },
  { name: "Under Armour", slug: "under-armour", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Under_armour_logo.svg/200px-Under_armour_logo.svg.png" },
  { name: "Columbia", slug: "columbia", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Columbia_Sportswear_logo.svg/200px-Columbia_Sportswear_logo.svg.png" },
  { name: "Port Authority", slug: "port-authority", logo: "https://www.sanmar.com/medias/PortAuthorityWhite-Brand-Logo.png" },
  { name: "Sport-Tek", slug: "sport-tek", logo: "https://www.sanmar.com/medias/SportTekWhite-Brand-Logo.png" },
]

export default function MerchBrandsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-50 border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/merch" className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2c327a] mb-3">Shop by Brand</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            We carry the top apparel brands for custom printing and embroidery. 
            Click on a brand to see available products.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href={`/merch?brand=${encodeURIComponent(brand.name)}`}
              className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-xl hover:border-[#2c327a] hover:shadow-md transition-all group"
            >
              <div className="h-16 flex items-center justify-center mb-3 grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all">
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-[#2c327a] text-center">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
