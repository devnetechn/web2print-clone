import Link from "next/link"

export function StorefrontFooter() {
  return (
    <footer>
      {/* Newsletter Section - Single Row Layout */}
      <section className="bg-[#3a3f4d] py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left side - Text */}
            <div className="lg:flex-shrink-0">
              <h2 className="text-2xl font-bold text-white">Get Inspired, Stay Informed!</h2>
              <p className="text-white/70 text-sm">Subscribe to our newsletter and let your creativity soar</p>
            </div>

            {/* Right side - Form */}
            <div className="flex-1 max-w-xl">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email ID"
                  className="flex-1 h-12 px-6 rounded-md border-none focus:ring-2 focus:ring-[#e42a27] text-slate-800 bg-white"
                />
                <button className="bg-[#e42a27] hover:bg-[#c91f1c] text-white px-8 h-12 rounded-md font-bold uppercase whitespace-nowrap">
                  SUBSCRIBE
                </button>
              </div>

              <div className="mt-3 text-sm text-white/70">
                <p className="mb-1">Subscribe to receive promotional offers.</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-white/30" />
                  <span>I agree to Terms & Conditions</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-slate-100 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold text-[#2c327a] mb-4">Product Category</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/print/business-cards" className="hover:text-[#e42a27]">
                    Business Cards
                  </Link>
                </li>
                <li>
                  <Link href="/print/marketing-materials" className="hover:text-[#e42a27]">
                    Marketing Products
                  </Link>
                </li>
                <li>
                  <Link href="/print/signs-banners" className="hover:text-[#e42a27]">
                    Signs & Banners
                  </Link>
                </li>
                <li>
                  <Link href="/print/boxes-packaging" className="hover:text-[#e42a27]">
                    Boxes & Packaging
                  </Link>
                </li>
                <li>
                  <Link href="/print/roll-labels-stickers" className="hover:text-[#e42a27]">
                    Roll Labels & Stickers
                  </Link>
                </li>
                <li>
                  <Link href="/print/promo-products" className="hover:text-[#e42a27]">
                    Promo Products
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#2c327a] mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/blog" className="hover:text-[#e42a27]">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/quote" className="hover:text-[#e42a27]">
                    Request a Quote
                  </Link>
                </li>
                <li>
                  <Link href="/artwork" className="hover:text-[#e42a27]">
                    Artwork Guidelines
                  </Link>
                </li>
                <li>
                  <Link href="/templates" className="hover:text-[#e42a27]">
                    Download Templates
                  </Link>
                </li>
                <li>
                  <Link href="/testimonials" className="hover:text-[#e42a27]">
                    Testimonials
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#2c327a] mb-4">Support & Info</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/about" className="hover:text-[#e42a27]">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#e42a27]">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[#e42a27]">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#e42a27]">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#2c327a] mb-4">Contact Us</h4>
              <div className="space-y-2 text-sm text-slate-600">
                <div>
                  <div className="font-semibold text-slate-800">📍 Web2Print USA</div>
                  <div>7901 4th St. N #27125.</div>
                  <div>St. Petersburg, FL 33702</div>
                  <div>USA</div>
                </div>
                <div className="pt-2">
                  <div>📞 +1.888.843.6867</div>
                  <div>✉️ info@web2printusa.com</div>
                </div>

                <div className="flex gap-2 pt-3">
                  <img src="/visa-logo-generic.png" alt="Visa" className="h-6" />
                  <img src="/mastercard-logo.png" alt="Mastercard" className="h-6" />
                  <img src="/abstract-discover-logo.png" alt="Discover" className="h-6" />
                  <img src="/amex-logo.png" alt="Amex" className="h-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="#" className="text-slate-600 hover:text-[#2c327a]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-slate-600 hover:text-[#2c327a]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="#" className="text-slate-600 hover:text-[#2c327a]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="#" className="text-slate-600 hover:text-[#2c327a]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="#" className="text-slate-600 hover:text-[#2c327a]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </a>
            </div>
            <p className="text-sm text-slate-600">Copyright ©2026 Web2Print USA Solution. All Rights Reserved.</p>
          </div>
        </div>
      </div>

      <a
        href="https://wa.me/18888436867"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
      >
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </footer>
  )
}
