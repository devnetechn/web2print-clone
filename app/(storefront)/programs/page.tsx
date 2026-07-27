import type { Metadata } from "next"
import { canonical } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Business Programs",
  description:
    "Web2Print USA business programs help you save time and money on recurring print orders — built for teams, franchises, and growing brands.",
  ...canonical("/programs"),
}

export default function ProgramsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-[#2c327a] mb-8">Business Programs</h1>
      <p className="text-lg text-slate-600">
        Explore our business programs designed to help you save time and money on your printing needs.
      </p>
    </div>
  )
}
