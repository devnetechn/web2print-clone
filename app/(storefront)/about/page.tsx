import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Web2Print USA pairs national print power with first-name service — and the business services that get you launched, branded, and found.",
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#e42a27]">About Web2Print USA</p>
        <h1 className="text-4xl font-extrabold tracking-[-0.015em] text-[#2c327a] md:text-5xl text-balance">
          Their job ends at checkout. Ours starts there.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-600 text-pretty">
          We&apos;re a full-service print partner built for businesses that need more than a
          shopping cart. From business cards and banners to packaging and custom apparel, we
          deliver national print power with the kind of first-name service most big printers
          gave up on.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-slate-600 text-pretty">
          And we go beyond print. Through our business services, we help you make it official —
          LLC registration, web design, and getting found on Google — so the brand on your
          business card is backed by a real, growing business.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { title: "National print power", desc: "A full catalogue of print products, produced and shipped nationwide." },
            { title: "First-name service", desc: "Real people who know your order and pick up the phone." },
            { title: "Beyond print", desc: "Business formation, web design, and marketing to grow your brand." },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-[#2c327a]">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/print"
            className="inline-flex items-center justify-center rounded-md bg-[#2c327a] px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#232963]"
          >
            Shop print
          </Link>
          <Link
            href="/quote"
            className="inline-flex items-center justify-center rounded-md border-2 border-[#2c327a] px-7 py-3.5 text-base font-bold text-[#2c327a] transition-colors hover:bg-[#2c327a] hover:text-white"
          >
            Get a quote
          </Link>
        </div>
      </div>
    </div>
  )
}
