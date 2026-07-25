export type FAQ = { q: string; a: string }

export type FilePrepInfo = {
  note?: string
  resolution: string
  color_mode: string
  bleed: string
  file_types: string[]
}

export type TemplateLink = { size: string; url: string }

export type ProductContent = {
  category_slug: string
  description: string | null
  faqs: FAQ[]
  template_file_prep: FilePrepInfo | null
  template_urls: TemplateLink[]
  updated_at: string
}
