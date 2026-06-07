-- Create 4over markup settings table
CREATE TABLE IF NOT EXISTS public.fourover_markups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  markup_type TEXT DEFAULT 'percentage', -- 'percentage' or 'fixed'
  markup_value DECIMAL(10, 2) NOT NULL DEFAULT 40.00,
  min_markup DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create 4over orders tracking table
CREATE TABLE IF NOT EXISTS public.fourover_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  fourover_order_id TEXT,
  fourover_job_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, submitted, processing, shipped, delivered, error
  cost_from_4over DECIMAL(10, 2),
  our_price DECIMAL(10, 2),
  tracking_number TEXT,
  carrier TEXT,
  error_message TEXT,
  submitted_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default markup settings
INSERT INTO public.fourover_markups (category, markup_type, markup_value) VALUES
  ('business_cards', 'percentage', 40.00),
  ('postcards', 'percentage', 40.00),
  ('flyers', 'percentage', 35.00),
  ('brochures', 'percentage', 45.00),
  ('banners', 'percentage', 50.00),
  ('signs', 'percentage', 50.00),
  ('stickers', 'percentage', 45.00),
  ('booklets', 'percentage', 40.00),
  ('posters', 'percentage', 45.00),
  ('default', 'percentage', 40.00)
ON CONFLICT (category) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fourover_orders_order_id ON public.fourover_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_fourover_orders_status ON public.fourover_orders(status);
