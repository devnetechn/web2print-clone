CREATE TABLE IF NOT EXISTS public.product_content (
  category_slug TEXT PRIMARY KEY,
  description   TEXT,
  faqs          JSONB NOT NULL DEFAULT '[]',
  template_file_prep JSONB,
  template_urls JSONB NOT NULL DEFAULT '[]',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_content ENABLE ROW LEVEL SECURITY;

-- Storefront reads server-side (no anon client exposure needed), but allow
-- anon select so createClient() works without service role on the storefront
CREATE POLICY "public_read_product_content"
  ON public.product_content FOR SELECT USING (true);
