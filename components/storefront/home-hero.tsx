import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Star } from "lucide-react"
import { HeroProductSlider } from "@/components/storefront/hero-product-slider"

// New homepage hero — replaces the retired slide carousel. Split layout:
// copy on the left, framed product image with crop marks on the right.
// Colors map to the existing brand palette: --ink #1f2430 (dark), --gold #e42a27
// (red accent from the brand), navy #2c327a for the primary CTA.
export function HomeHero() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-4 pt-6 pb-12 md:pt-8 md:pb-16 lg:pt-10 lg:pb-20">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Block A: kicker + headline. On mobile this sits above the image;
              on desktop it's the top of the left copy column. */}
          <div className="max-w-xl lg:col-start-1 lg:row-start-1 lg:pt-12">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#e42a27]">
              Their job ends at checkout. Ours starts there.
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.015em] text-[#2c327a] text-balance sm:text-5xl lg:text-6xl">
              Print that means business.
            </h1>
          </div>

          {/* Image: framed product slider with crop marks. DOM-ordered between
              the headline and the supporting copy so it appears right below the
              headline on mobile; grid placement keeps it in the right column,
              spanning both rows, on desktop. */}
          <div className="relative lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start">
            <CropMarks />
            <HeroProductSlider />
            {/* Powered by chip */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-600 shadow-md">
              Powered by <span className="text-[#2c327a]">Born for Prosperity</span>
            </div>
          </div>

          {/* Block C: supporting copy + CTAs + social proof. On mobile this
              renders below the image; on desktop it continues the left column. */}
          <div className="max-w-xl lg:col-start-1 lg:row-start-2">
            <p className="text-lg leading-relaxed text-slate-600 text-pretty">
              Business cards, banners, packaging, and custom apparel — plus the
              business services that get you launched and found. National print
              power, first-name service.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/print"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2c327a] px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#232963]"
              >
                Shop print
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/quote"
                className="inline-flex items-center justify-center rounded-md border-2 border-[#2c327a] px-7 py-3.5 text-base font-bold text-[#2c327a] transition-colors hover:bg-[#2c327a] hover:text-white"
              >
                Get a quote
              </Link>
            </div>

            {/* Google reviews badge */}
            <div className="mt-5 flex items-center gap-3">
              <Image
                src="/google-logo.png"
                alt="Google"
                width={72}
                height={24}
                className="h-6 w-auto"
              />
              <div className="flex items-center gap-1" aria-label="Rated 4 out of 5 stars on Google">
                {[0, 1, 2, 3].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-[#fbbc05] text-[#fbbc05]" />
                ))}
                <Star className="h-4 w-4 text-[#fbbc05]" />
              </div>
              <span className="text-sm font-semibold text-slate-700">4.0</span>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Trusted by schools, government agencies, and growing brands nationwide.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Decorative registration/crop marks around the image frame, echoing the
// print-production motif from the reference mockup.
function CropMarks() {
  const mark = "absolute h-6 w-6 border-slate-300"
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -m-3">
      <span className={`${mark} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${mark} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${mark} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${mark} bottom-0 right-0 border-b-2 border-r-2`} />
    </div>
  )
}
