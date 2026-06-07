import Link from "next/link"

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-[#2c327a] mb-8">Business Services</h1>
      <p className="text-lg text-slate-600 mb-8">
        We offer a full range of business services to help you launch and grow your brand.
      </p>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          href="/services/storefront-makeover"
          className="block p-6 bg-white border border-slate-200 rounded-lg hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-bold text-[#2c327a] mb-2">Storefront Makeover</h2>
          <p className="text-slate-600">Transform your business presence with our complete storefront makeover service.</p>
        </Link>
      </div>
    </div>
  )
}
