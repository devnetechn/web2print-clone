import type { Metadata } from "next"
import { canonical } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Request a Quote",
  description:
    "Get a fast, custom quote for large-format, specialty, or high-volume printing from Web2Print USA — tell us what you need and we'll price it.",
  ...canonical("/quote"),
}

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return children
}
