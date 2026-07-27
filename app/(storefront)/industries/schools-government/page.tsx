import Link from "next/link"
import { ArrowRight, Download, ShieldCheck, FileText, Building2, GraduationCap } from "lucide-react"

export const metadata = {
  title: "Certified Print Vendor for Schools & Government | MBE/SBE | Web2Print USA",
  description:
    "SAM.gov-registered, Florida MBE, and Broward County/BCPS MBE, SBE & CBE certified print vendor serving school districts, government agencies, and public institutions.",
}

const QUOTE_HREF = "/quote?industry=government"

// Certification cards — exact official titles to be supplied by the client.
// Rendered as named badge slots; do not paraphrase official certification
// names once provided.
const CERTIFICATIONS = [
  { label: "SAM.gov Registration", note: "[PLACEHOLDER — registration / CAGE number]" },
  { label: "Florida MBE", note: "[PLACEHOLDER — issuing body & number]" },
  { label: "Broward County / BCPS MBE", note: "[PLACEHOLDER — number]" },
  { label: "Broward County / BCPS SBE", note: "[PLACEHOLDER — number]" },
  { label: "Broward County / BCPS CBE", note: "[PLACEHOLDER — number]" },
  { label: "State Vendor Status", note: "[PLACEHOLDER — portal registrations]" },
]

function CapabilityStatementCard() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#2c327a]/10 text-[#2c327a]">
          <Download className="h-6 w-6" />
        </div>
        <div>
          <div className="font-bold text-[#2c327a]">Download our Capability Statement (PDF)</div>
          <p className="text-sm text-slate-500">
            {"[PLACEHOLDER — link to the capability statement file provided by the client]"}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-2 rounded-md bg-[#e42a27] px-5 py-2.5 text-sm font-bold text-white opacity-70">
        Download PDF
      </span>
    </div>
  )
}

export default function SchoolsGovernmentPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#2c327a]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#2c327a]">
            <ShieldCheck className="h-4 w-4" />
            Schools &amp; Government
          </div>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-tight text-[#2c327a] md:text-5xl">
            A certified vendor, ready to work.
          </h1>
          <p className="mt-5 max-w-3xl text-pretty leading-relaxed text-slate-600">
            Web2Print USA serves school districts, government agencies, universities, nonprofits, and public
            institutions across Florida and beyond — with the certifications, registrations, and fulfillment record
            public purchasing requires.
          </p>
          <div className="mt-7 max-w-2xl">
            <CapabilityStatementCard />
          </div>
        </div>
      </section>

      <div className="container mx-auto flex flex-col gap-16 px-4 py-14 md:py-20">
        {/* Certifications & registrations */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#e42a27]">
            <ShieldCheck className="h-4 w-4" />
            Certifications &amp; registrations
          </div>
          <h2 className="text-2xl font-bold text-[#2c327a] md:text-3xl">Verified, documented, ready for the file.</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CERTIFICATIONS.map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-[#2c327a]">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#e42a27]" />
                  {c.label}
                </div>
                <p className="mt-2 text-xs text-slate-400">{c.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For prime contractors */}
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#e42a27]">
            <Building2 className="h-4 w-4" />
            For prime contractors
          </div>
          <h2 className="text-2xl font-bold text-[#2c327a]">A certified subcontracting partner.</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
            Bidding work with diversity participation requirements? Web2Print USA is a certified minority- and
            small-business partner available for print, promotional, and apparel scopes as a subcontractor.
            Certifications verified, capacity documented, references available.
          </p>
        </section>

        {/* What institutions order */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#e42a27]">
            <FileText className="h-4 w-4" />
            What institutions order
          </div>
          <h2 className="text-2xl font-bold text-[#2c327a] md:text-3xl">From a single banner to district-wide programs.</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
            Curriculum and event printing, banners and signage, mailers, forms and NCR, promotional items, spirit wear
            and staff apparel, and large-format. From a single banner to district-wide programs — quoted formally,
            delivered on schedule, invoiced the way your accounting office needs.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              "Curriculum & event printing",
              "Banners & signage",
              "Mailers",
              "Forms & NCR",
              "Promotional items",
              "Spirit wear & staff apparel",
              "Large-format",
            ].map((item) => (
              <li key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Education */}
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#e42a27]">
            <GraduationCap className="h-4 w-4" />
            Education
          </div>
          <p className="max-w-3xl leading-relaxed text-slate-600">
            Serving Miami-Dade, Broward, Palm Beach, Montgomery County, and Baltimore County public schools.
          </p>
          <p className="text-xs text-slate-400">
            {"[PLACEHOLDER — link to the existing Education page; keep its current URL: \"See our education work →\"]"}
          </p>
        </section>

        {/* Capability statement (repeated near footer) */}
        <section>
          <CapabilityStatementCard />
        </section>

        {/* Formal quote CTA */}
        <section className="rounded-xl bg-[#2c327a] p-10 text-center">
          <h2 className="text-balance text-3xl font-extrabold text-white">Ready to put us on the vendor list?</h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-slate-200">
            Send us your scope and we&apos;ll return a formal quote structured for your purchasing process.
          </p>
          <Link
            href={QUOTE_HREF}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#e42a27] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#c51f1f]"
          >
            Request a formal quote
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}
