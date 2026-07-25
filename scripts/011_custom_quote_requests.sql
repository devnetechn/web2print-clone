-- General custom quote requests for non-apparel, non-standard items
-- (oversized signs, custom boxes, specialty labels, etc.) that don't fit
-- the regular product calculators. Separate from the existing
-- `quote_requests` table, which is specifically for the apparel bulk-order
-- quote flow at /merch/quote.
CREATE TABLE IF NOT EXISTS public.custom_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  quote_title TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT,
  reference_file_url TEXT,
  status TEXT DEFAULT 'new', -- new, quoted, accepted, declined
  quoted_price DECIMAL(10, 2),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_quote_requests_status ON public.custom_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_custom_quote_requests_customer_id ON public.custom_quote_requests(customer_id);

ALTER TABLE public.custom_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a custom quote request"
  ON public.custom_quote_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own custom quote requests"
  ON public.custom_quote_requests FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage custom quote requests"
  ON public.custom_quote_requests FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
