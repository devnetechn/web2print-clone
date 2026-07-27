// Scrapes the full 4over template catalog into lib/print/templates-catalog.json
// Run: node scripts/scrape-templates.mjs
import { writeFile } from "node:fs/promises"

const BASE = "https://4over.com/templates/files/list/category/"
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

// category display name -> product-type slugs
const CATEGORIES = [
  {
    name: "Business Cards",
    products: ["business-cards"],
  },
  {
    name: "Marketing Products",
    products: [
      "postcards", "flyers-brochures", "presentation-folder", "announcement-cards", "booklets",
      "bookmarks", "calendars", "catalogs", "counter-cards", "door-hangers", "envelopes",
      "event-tickets", "greeting-cards", "hang-tags", "letterheads", "magnets", "menus",
      "ncr-forms", "notepads", "posters", "rack-cards", "sell-sheets", "social-cards",
      "table-tent", "trading-cards",
    ],
  },
  {
    name: "Signs & Banners",
    products: ["banners-flags", "display-events", "graphics", "signs-banners-signs"],
  },
  {
    name: "Boxes & Packaging",
    products: ["packaging-tags-cards"],
  },
  {
    name: "Roll Labels & Stickers",
    products: ["rolls-labels-stickers"],
  },
  {
    name: "Promo Products",
    products: ["apparel", "marketing-promo-products"],
  },
  {
    name: "Direct Mail Services",
    products: ["direct-mail", "eddm"],
  },
]

function decode(s) {
  return s
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#0?39;/g, "'")
    .replace(/&rsquo;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}

function parseProduct(html) {
  // product name from first <h2>
  const h2 = (html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1]
  const productName = h2 ? decode(h2) : null
  const sizes = []
  const parts = html.split('<div class="templates-item__title">')
  for (let p = 1; p < parts.length; p++) {
    const seg = parts[p].split('<div class="templates-item">')[0] // stop at next item wrapper if any
    const sizeName = decode(parts[p].slice(0, parts[p].indexOf("</div>")))
    const variants = []
    const gridRe = /<div class="templates-item__grid-item--title">([\s\S]*?)<\/div>([\s\S]*?)(?=<div class="templates-item__grid-item--title">|<div class="templates-item__title">|<h2|$)/g
    let g
    while ((g = gridRe.exec(parts[p]))) {
      const variantName = decode(g[1])
      const body = g[2]
      const eps = (body.match(/href="(https:\/\/4over\.com\/media\/asset\/[^"]+\.eps)"/i) || [])[1] || null
      const jpg = (body.match(/href="(https:\/\/4over\.com\/media\/asset\/[^"]+\.jpg)"/i) || [])[1] || null
      if (eps || jpg) variants.push({ variant: variantName, eps, jpg })
    }
    if (variants.length) sizes.push({ size: sizeName, variants })
  }
  return { product: productName, sizes }
}

async function main() {
  const catalog = []
  let totalFiles = 0
  let totalTemplates = 0
  for (const cat of CATEGORIES) {
    const entry = { name: cat.name, products: [] }
    for (const slug of cat.products) {
      const url = BASE + slug + "/"
      process.stdout.write(`  ${cat.name} / ${slug} ... `)
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA } })
        const html = await res.text()
        const prod = parseProduct(html)
        if (!prod.product || !prod.sizes.length) {
          console.log("EMPTY")
          continue
        }
        prod.slug = slug
        entry.products.push(prod)
        const files = prod.sizes.reduce((a, s) => a + s.variants.reduce((b, v) => b + (v.eps ? 1 : 0) + (v.jpg ? 1 : 0), 0), 0)
        const tpls = prod.sizes.reduce((a, s) => a + s.variants.length, 0)
        totalFiles += files
        totalTemplates += tpls
        console.log(`${prod.product}: ${tpls} templates, ${files} files`)
      } catch (e) {
        console.log("ERROR " + e.message)
      }
    }
    if (entry.products.length) catalog.push(entry)
  }
  await writeFile(new URL("../lib/print/templates-catalog.json", import.meta.url), JSON.stringify(catalog, null, 2))
  console.log(`\nWrote catalog: ${catalog.length} categories, ${totalTemplates} templates, ${totalFiles} files`)
}

main().catch(e => { console.error(e); process.exit(1) })
