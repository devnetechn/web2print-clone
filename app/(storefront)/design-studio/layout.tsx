import { notFound } from "next/navigation"
import { DESIGN_STUDIO_ENABLED } from "@/lib/feature-flags"

// See app/(storefront)/merch/layout.tsx — same reasoning. The design studio URL
// was linked from every product page, so direct links to it are already out in
// the wild and hiding the buttons alone would not take it offline.
export default function DesignStudioLayout({ children }: { children: React.ReactNode }) {
  if (!DESIGN_STUDIO_ENABLED) {
    notFound()
  }

  return <>{children}</>
}
