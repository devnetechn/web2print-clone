import catalogJson from "./templates-catalog.json"

export type TemplateVariant = {
  variant: string
  eps: string | null
  jpg: string | null
}

export type TemplateSize = {
  size: string
  variants: TemplateVariant[]
}

export type TemplateProduct = {
  product: string
  slug?: string
  sizes: TemplateSize[]
}

export type TemplateCategory = {
  name: string
  products: TemplateProduct[]
}

export const templateCatalog = catalogJson as TemplateCategory[]

export function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function getCategory(slug: string): TemplateCategory | undefined {
  return templateCatalog.find(c => categorySlug(c.name) === slug)
}

export function catalogStats() {
  let templates = 0
  let files = 0
  let products = 0
  for (const cat of templateCatalog) {
    products += cat.products.length
    for (const p of cat.products) {
      for (const s of p.sizes) {
        templates += s.variants.length
        for (const v of s.variants) {
          if (v.eps) files++
          if (v.jpg) files++
        }
      }
    }
  }
  return { categories: templateCatalog.length, products, templates, files }
}
