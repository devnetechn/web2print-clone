import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check } from "lucide-react"
import { BEYOND_PRINT_BAND, quoteHref, type IndustryData } from "@/lib/industries"

function CtaButtons({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={quoteHref(slug)}
        className="inline-flex items-center gap-2 rounded-md bg-[#e42a27] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#c51f1f]"
      >
        Get a quote
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href="/print"
        className="inline-flex items-center rounded-md border-2 border-[#2c327a] px-6 py-3 text-sm font-bold text-[#2c327a] transition-colors hover:bg-[#2c327a] hover:text-white"
      >
        Shop print
      </Link>
    </div>
  )
}

export function IndustryPage({ data }: { data: IndustryData }) {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="container mx-auto grid items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#e42a27]">
              {data.name}
            </div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight text-[#2c327a] md:text-5xl">
              {data.hook}
            </h1>
            <p className="mt-5 max-w-xl text-pretty leading-relaxed text-slate-600">{data.intro}</p>
            <div className="mt-7">
              <CtaButtons slug={data.slug} />
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 shadow-lg">
            <Image
              src={data.heroImage || "/placeholder.svg"}
              alt={`${data.name} printing from Web2Print USA`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </section>

      {/* Sections — alternate image side for rhythm */}
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="flex flex-col gap-16">
          {data.sections.map((section, i) => {
            const flip = i % 2 === 1
            return (
              <section key={section.title} className="grid items-center gap-8 md:grid-cols-2">
                <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 shadow-md ${flip ? "md:order-2" : ""}`}>
                  <Image
                    src={section.image || "/placeholder.svg"}
                    alt={section.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className={flip ? "md:order-1" : ""}>
                  <h2 className="text-2xl font-bold text-[#2c327a] md:text-3xl">{section.title}</h2>
                  <p className="mt-4 leading-relaxed text-slate-600">{section.body}</p>
                  {section.products && section.products.length > 0 && (
                    <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {section.products.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="h-4 w-4 flex-shrink-0 text-[#e42a27]" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {/* Proof slot (flagged placeholder) */}
      <section className="border-y border-dashed border-slate-300 bg-slate-50">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white p-8">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Proof / testimonials</div>
            <p className="mt-2 text-sm text-slate-500">
              {"[PLACEHOLDER — "}
              {data.proofNote}
              {"]"}
            </p>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#2c327a]">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-14 text-center">
          <h2 className="text-balance text-3xl font-extrabold text-white">Ready to print for {data.name.toLowerCase()}?</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={quoteHref(data.slug)}
              className="inline-flex items-center gap-2 rounded-md bg-[#e42a27] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#c51f1f]"
            >
              Get a quote
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/print"
              className="inline-flex items-center rounded-md border-2 border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white hover:text-[#2c327a]"
            >
              Shop print
            </Link>
          </div>
        </div>
      </section>

      {/* Shared Beyond Print bridge band */}
      <section className="bg-[#1f2430]">
        <div className="container mx-auto flex flex-col items-start gap-4 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white">{BEYOND_PRINT_BAND.heading}</h2>
            <p className="mt-2 leading-relaxed text-slate-300">{BEYOND_PRINT_BAND.body}</p>
          </div>
          <Link
            href={BEYOND_PRINT_BAND.href}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-md border-2 border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white hover:text-[#1f2430]"
          >
            {BEYOND_PRINT_BAND.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
