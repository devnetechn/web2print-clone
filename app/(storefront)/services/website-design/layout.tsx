import type { Metadata } from "next"
import { canonical } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Website Design",
  description:
    "Professional website design from Web2Print USA — fast, modern, mobile-friendly sites that turn visitors into customers for your business.",
  ...canonical("/services/website-design"),
}

export default function WebsiteDesignLayout({ children }: { children: React.ReactNode }) {
  return children
}
