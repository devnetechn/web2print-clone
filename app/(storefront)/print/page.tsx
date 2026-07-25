import Link from "next/link"

const TOP_CATEGORIES = [
  { name: "Business Cards", slug: "business-cards", description: "Premium quality business cards in various stocks and finishes" },
  { name: "Marketing Products", slug: "marketing-materials", description: "Flyers, brochures, postcards, booklets and more" },
  { name: "Signs & Banners", slug: "signs-banners", description: "Indoor and outdoor signage, banners, and displays" },
  { name: "Boxes & Packaging", slug: "boxes-packaging", description: "Custom packaging and box solutions" },
  { name: "Roll Labels & Stickers", slug: "roll-labels-stickers", description: "Custom roll labels, stickers, and adhesive products" },
  { name: "Promo Products", slug: "promo-products", description: "T-shirts, tote bags, mugs, and promotional items" },
]

const CATEGORY_IMAGES: Record<string, string> = {
  "business-cards": "/images/categories/business-cards.jpg",
  "marketing-materials": "/images/categories/flyers.jpg",
  "signs-banners": "/images/categories/posters.jpg",
  "boxes-packaging": "/images/categories/notepads.jpg",
  "roll-labels-stickers": "/images/categories/postcards.jpg",
  "promo-products": "/images/categories/magnets.jpg",
}

export default function PrintShopHome() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-200 py-2 px-4">
        <div className="container mx-auto">
          <p className="text-sm text-slate-500">
            <Link href="/" className="hover:text-[#e42a27]">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700 font-medium">Print Products</span>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Professional Printing for Your Business</h1>
        <hr className="border-slate-200 mb-8" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
          {TOP_CATEGORIES.map((cat) => (
            <div key={cat.slug} className="group text-center">
              <Link href={`/print/${cat.slug}`}>
                <div className="aspect-square bg-slate-100 mb-3 overflow-hidden rounded">
                  <img
                    src={CATEGORY_IMAGES[cat.slug]}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <h2 className="text-base font-semibold text-slate-900 mb-1">{cat.name}</h2>
              <p className="text-xs text-slate-500 mb-3">{cat.description}</p>
              <Link
                href={`/print/${cat.slug}`}
                className="inline-flex items-center gap-1 bg-[#e07b39] hover:bg-[#c9692a] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                View details <span className="text-base leading-none">&rsaquo;</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
