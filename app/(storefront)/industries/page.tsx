import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { INDUSTRIES, INDUSTRY_ORDER, SCHOOLS_GOV_TILE } from "@/lib/industries"

export const metadata = {
  title: "Industries We Serve — Print for the People Building Something",
  description:
    "Print built for your industry — beauty pros, trades, restaurants, real estate, medical practices, nightlife, schools and government. See what your industry orders most.",
}

export default function IndustriesPage() {
  const tiles = [
    ...INDUSTRY_ORDER.map((slug) => {
      const d = INDUSTRIES[slug]
      return { slug: d.slug, name: d.name, hook: d.hook, image: d.tileImage }
    }),
    {
      slug: SCHOOLS_GOV_TILE.slug,
      name: SCHOOLS_GOV_TILE.name,
      hook: SCHOOLS_GOV_TILE.hook,
      image: SCHOOLS_GOV_TILE.tileImage,
    },
  ]

  return (
    <div className="bg-white">
      {/* Intro */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#e42a27]">Industries We Serve</div>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-tight text-[#2c327a] md:text-5xl">
            Built around the way your industry works.
          </h1>
          <p className="mt-5 max-w-3xl text-pretty leading-relaxed text-slate-600">
            Every industry prints different things for different reasons. A barber&apos;s card has a different job than a
            mover&apos;s yard sign or a dentist&apos;s recall postcard. We&apos;ve spent years printing for South Florida
            businesses — from one-chair shops to county school districts — and we&apos;ve organized everything we do
            around what your industry actually orders. Find your lane below.
          </p>
        </div>
      </section>

      {/* Tile grid */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Link
              key={t.slug}
              href={`/industries/${t.slug}`}
              className="group relative overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <Image
                  src={t.image || "/placeholder.svg"}
                  alt={t.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1f2430]/85 via-[#1f2430]/25 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h2 className="text-lg font-bold text-white">{t.name}</h2>
                <p className="mt-1 text-sm text-slate-200">{t.hook}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white">
                  Explore
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
