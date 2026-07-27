import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep crawlers out of transactional, account, and internal routes.
        disallow: [
          "/admin",
          "/api",
          "/cart",
          "/checkout",
          "/account",
          "/merch/checkout",
          "/tracking",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
