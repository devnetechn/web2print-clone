import { notFound } from "next/navigation"
import { APPAREL_ENABLED } from "@/lib/feature-flags"

// Hiding the nav links isn't enough on its own — /merch and its subpages still
// render for anyone with a direct link, and those links are out there. Guarding
// here rather than in each page means every current and future route under
// /merch is covered by one check.
//
// notFound() rather than a redirect on purpose: a redirect tells crawlers the
// page moved, which is wrong — apparel comes back once the client signs off.
export default function MerchLayout({ children }: { children: React.ReactNode }) {
  if (!APPAREL_ENABLED) {
    notFound()
  }

  return <>{children}</>
}
