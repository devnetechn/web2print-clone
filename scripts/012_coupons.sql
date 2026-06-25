-- Replaces the hardcoded "SAVE10" check in cart/checkout with real,
-- admin-manageable discount codes.
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons"
  ON public.coupons FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount)
VALUES ('SAVE10', 'percentage', 10, 0)
ON CONFLICT (code) DO NOTHING;
