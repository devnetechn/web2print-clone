import Link from "next/link"
import { StorefrontHeader } from "@/components/storefront/storefront-header"
import { StorefrontFooter } from "@/components/storefront/storefront-footer"

export const metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist. Browse our print catalog or head back home.",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[#e42a27]">404 Error</p>
          <h1 className="mt-3 text-4xl font-bold text-[#2c327a] text-balance md:text-5xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-4 leading-relaxed text-slate-600 text-pretty">
            The page may have moved or no longer exists. Let&apos;s get you back to printing something great.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-[#e42a27] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#c51f1f]"
            >
              Back to Home
            </Link>
            <Link
              href="/print"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-6 py-3 text-sm font-bold text-[#2c327a] transition-colors hover:border-[#2c327a]"
            >
              Browse Print Products
            </Link>
          </div>
        </div>
      </main>
      <StorefrontFooter />
    </div>
  )
}
