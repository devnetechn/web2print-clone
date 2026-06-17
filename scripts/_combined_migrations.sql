-- ============================================================
-- 001_create_tables.sql
-- ============================================================
-- Create customers/profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  print_provider TEXT, -- '4over', 'printful', etc
  provider_product_id TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  turnaround_days INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product options (sizes, materials, finishes)
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL, -- 'size', 'material', 'finish'
  option_value TEXT NOT NULL, -- '4x6', 'glossy', etc
  price_modifier DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL UNIQUE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, production, shipped, completed, cancelled
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  shipping DECIMAL(10, 2) DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, refunded
  payment_intent_id TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  order_notes TEXT,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  production_date TIMESTAMPTZ,
  shipped_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  options JSONB, -- size, material, finish selected
  design_file_url TEXT,
  print_provider TEXT,
  provider_order_id TEXT,
  provider_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create design templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  thumbnail_url TEXT,
  template_data JSONB, -- Canvas JSON for design studio
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved designs table (customer designs in progress)
CREATE TABLE IF NOT EXISTS public.saved_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  design_name TEXT,
  design_data JSONB, -- Canvas JSON
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow/status logs
CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_options_product_id ON public.product_options(product_id);
CREATE INDEX IF NOT EXISTS idx_saved_designs_user_id ON public.saved_designs(user_id);


-- ============================================================
-- 002_enable_rls.sql
-- ============================================================
-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Order items policies
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Saved designs policies
CREATE POLICY "Users can manage own designs"
  ON public.saved_designs FOR ALL
  USING (auth.uid() = user_id);

-- Public read for products and templates (no RLS needed)
-- These tables are readable by everyone


-- ============================================================
-- 003_create_triggers.sql
-- ============================================================
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER saved_designs_updated_at
  BEFORE UPDATE ON public.saved_designs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 004_seed_data.sql
-- ============================================================
-- Seed sample products
INSERT INTO public.products (id, name, description, category, base_price, print_provider, turnaround_days) VALUES
('11111111-1111-1111-1111-111111111111', 'Business Cards', 'Premium business cards with multiple finish options', 'Cards', 49.99, '4over', 3),
('22222222-2222-2222-2222-222222222222', 'Postcards', 'High-quality postcards for direct mail campaigns', 'Cards', 89.99, '4over', 4),
('33333333-3333-3333-3333-333333333333', 'Flyers', 'Eye-catching flyers for promotions and events', 'Marketing', 79.99, '4over', 3),
('44444444-4444-4444-4444-444444444444', 'Brochures', 'Professional tri-fold brochures', 'Marketing', 129.99, '4over', 5),
('55555555-5555-5555-5555-555555555555', 'Posters', 'Large format posters for displays', 'Signage', 39.99, '4over', 4),
('66666666-6666-6666-6666-666666666666', 'Banners', 'Vinyl banners for indoor/outdoor use', 'Signage', 149.99, '4over', 7);

-- Seed product options for business cards
INSERT INTO public.product_options (product_id, option_name, option_value, price_modifier) VALUES
('11111111-1111-1111-1111-111111111111', 'size', '3.5" x 2"', 0.00),
('11111111-1111-1111-1111-111111111111', 'size', '4" x 6"', 15.00),
('11111111-1111-1111-1111-111111111111', 'finish', 'Matte', 0.00),
('11111111-1111-1111-1111-111111111111', 'finish', 'Glossy', 10.00),
('11111111-1111-1111-1111-111111111111', 'finish', 'UV Coating', 25.00),
('11111111-1111-1111-1111-111111111111', 'quantity', '250', 0.00),
('11111111-1111-1111-1111-111111111111', 'quantity', '500', 20.00),
('11111111-1111-1111-1111-111111111111', 'quantity', '1000', 35.00);

-- Seed product options for postcards
INSERT INTO public.product_options (product_id, option_name, option_value, price_modifier) VALUES
('22222222-2222-2222-2222-222222222222', 'size', '4" x 6"', 0.00),
('22222222-2222-2222-2222-222222222222', 'size', '5" x 7"', 20.00),
('22222222-2222-2222-2222-222222222222', 'size', '6" x 9"', 35.00),
('22222222-2222-2222-2222-222222222222', 'finish', 'Matte', 0.00),
('22222222-2222-2222-2222-222222222222', 'finish', 'Glossy', 15.00),
('22222222-2222-2222-2222-222222222222', 'quantity', '500', 0.00),
('22222222-2222-2222-2222-222222222222', 'quantity', '1000', 30.00),
('22222222-2222-2222-2222-222222222222', 'quantity', '2500', 60.00);


-- ============================================================
-- 005_4over_tables.sql
-- ============================================================
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


-- ============================================================
-- 006_fourover_sync_tables.sql
-- ============================================================
-- 4over Product Sync Tables
-- Stores all products, option groups, and base prices from 4over API
-- Self-contained schema - no dependencies on other tables

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS fourover_sync_status CASCADE;
DROP TABLE IF EXISTS fourover_base_prices CASCADE;
DROP TABLE IF EXISTS fourover_option_groups CASCADE;
DROP TABLE IF EXISTS fourover_products CASCADE;
DROP TABLE IF EXISTS fourover_categories CASCADE;

-- Categories from 4over
CREATE TABLE fourover_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_uuid TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  parent_category_uuid TEXT,
  category_order INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products from 4over productsfeed
CREATE TABLE fourover_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid TEXT UNIQUE NOT NULL,
  product_code TEXT,
  product_description TEXT,
  product_name TEXT,
  category_uuid TEXT,
  product_data JSONB, -- Full product data from API including product_option_groups
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Option groups for each product (Size, Stock, Colorspec, Coating, Binding, etc.)
CREATE TABLE fourover_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid TEXT NOT NULL,
  option_group_uuid TEXT NOT NULL,
  option_group_name TEXT NOT NULL,
  option_group_order INTEGER,
  options JSONB NOT NULL, -- Array of {option_uuid, option_name, option_order, option_prices_list}
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_uuid, option_group_uuid)
);

-- Base prices for each product (by runsize and colorspec)
CREATE TABLE fourover_base_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid TEXT NOT NULL,
  runsize_uuid TEXT,
  runsize INTEGER,
  colorspec_uuid TEXT,
  colorspec TEXT,
  product_baseprice DECIMAL(12,6) NOT NULL,
  turnaroundtime_uuid TEXT,
  turnaroundtime TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_uuid, runsize_uuid, colorspec_uuid)
);

-- Sync status tracking
CREATE TABLE fourover_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'categories', 'products', 'prices', 'full'
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  synced_items INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_fourover_products_category ON fourover_products(category_uuid);
CREATE INDEX idx_fourover_products_code ON fourover_products(product_code);
CREATE INDEX idx_fourover_option_groups_product ON fourover_option_groups(product_uuid);
CREATE INDEX idx_fourover_base_prices_product ON fourover_base_prices(product_uuid);
CREATE INDEX idx_fourover_base_prices_runsize ON fourover_base_prices(runsize);

-- Enable RLS but allow public read for now (admin-only write)
ALTER TABLE fourover_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fourover_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE fourover_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE fourover_base_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fourover_sync_status ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "fourover_categories_public_read" ON fourover_categories FOR SELECT USING (true);
CREATE POLICY "fourover_products_public_read" ON fourover_products FOR SELECT USING (true);
CREATE POLICY "fourover_option_groups_public_read" ON fourover_option_groups FOR SELECT USING (true);
CREATE POLICY "fourover_base_prices_public_read" ON fourover_base_prices FOR SELECT USING (true);
CREATE POLICY "fourover_sync_status_public_read" ON fourover_sync_status FOR SELECT USING (true);

-- Service role write policies (for sync job)
CREATE POLICY "fourover_categories_service_write" ON fourover_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fourover_products_service_write" ON fourover_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fourover_option_groups_service_write" ON fourover_option_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fourover_base_prices_service_write" ON fourover_base_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fourover_sync_status_service_write" ON fourover_sync_status FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- 006_update_products.sql
-- ============================================================
-- Add 4over related columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS fourover_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_fourover_id ON products(fourover_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);


-- ============================================================
-- 008_apparel_schema.sql
-- ============================================================
-- Apparel & Merch Schema for Web2Print USA
-- Run this in Supabase SQL Editor

-- Apparel Brands Table
CREATE TABLE IF NOT EXISTS apparel_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apparel Categories Table
CREATE TABLE IF NOT EXISTS apparel_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Print Methods Table
CREATE TABLE IF NOT EXISTS print_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  min_quantity INTEGER DEFAULT 1,
  best_for TEXT,
  limitations TEXT,
  pricing_note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apparel Products Table
CREATE TABLE IF NOT EXISTS apparel_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES apparel_brands(id) ON DELETE CASCADE,
  category_id UUID REFERENCES apparel_categories(id) ON DELETE SET NULL,
  style_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fabric TEXT,
  weight TEXT,
  sizes TEXT[], -- Array of available sizes
  color_count INTEGER DEFAULT 1,
  base_price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  colors JSONB, -- Array of {name, hex} objects
  print_methods TEXT[], -- Array of compatible print method slugs
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, style_number)
);

-- Quote Requests Table
CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  company_name TEXT,
  
  -- Product Selection
  product_id UUID REFERENCES apparel_products(id),
  brand_name TEXT,
  style_number TEXT,
  product_name TEXT,
  
  -- Print Details
  print_method TEXT NOT NULL, -- silkscreen, embroidery, dtg
  print_locations TEXT[], -- front, back, left_chest, sleeve, etc.
  number_of_colors INTEGER DEFAULT 1,
  
  -- Quantity & Sizing
  total_quantity INTEGER NOT NULL,
  size_breakdown JSONB, -- {XS: 5, S: 10, M: 15, L: 10, XL: 5, 2XL: 3}
  garment_color TEXT,
  
  -- Artwork
  artwork_url TEXT,
  artwork_notes TEXT,
  
  -- Status & Notes
  status TEXT DEFAULT 'pending', -- pending, quoted, approved, in_production, completed, cancelled
  quoted_price NUMERIC(10,2),
  internal_notes TEXT,
  customer_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  quoted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_apparel_products_brand ON apparel_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_apparel_products_category ON apparel_products(category_id);
CREATE INDEX IF NOT EXISTS idx_apparel_products_active ON apparel_products(is_active);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(customer_email);

-- Insert Brands
INSERT INTO apparel_brands (name, slug, description, sort_order) VALUES
('Gildan', 'gildan', 'Best-value basics, wide size range (S–5XL), huge color selection. Industry standard for promotional & team apparel.', 1),
('Next Level Apparel', 'next-level', 'Fashion-forward, soft premium blanks. Popular for retail-quality feel, fitted cuts, and vibrant DTG printing.', 2),
('BELLA + CANVAS', 'bella-canvas', 'Premium fashion-forward blanks known for ultra-soft feel and on-trend fits. Excellent for retail, lifestyle branding, and DTG printing.', 3),
('American Apparel', 'american-apparel', 'LA-made premium fashion basics with a distinct slim/fitted aesthetic. Popular for trendy lifestyle brands.', 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert Categories
INSERT INTO apparel_categories (name, slug, icon, sort_order) VALUES
('Crew Neck T-Shirts', 'crew-neck-tees', 'shirt', 1),
('V-Neck T-Shirts', 'v-neck-tees', 'shirt', 2),
('Long Sleeve T-Shirts', 'long-sleeve-tees', 'shirt', 3),
('Hoodies', 'hoodies', 'hoodie', 4),
('Crew Neck Sweatshirts', 'sweatshirts', 'shirt', 5),
('Polos', 'polos', 'polo', 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert Print Methods
INSERT INTO print_methods (name, slug, description, min_quantity, best_for, limitations, pricing_note) VALUES
('Screen Printing', 'silkscreen', 'Best for bold, vibrant designs with 1–6 colors. Ideal for large quantity orders. Ink is pushed through a mesh screen directly onto fabric.', 12, 'Simple logos, text, solid-color designs', 'Color changes add cost; gradients require halftones', 'Lowest cost per piece at volume'),
('Embroidery', 'embroidery', 'Thread stitched directly into the garment for a premium, professional look. Ideal for polos, hats, and corporate apparel.', 12, 'Logos, text, structured designs on polos & hats', 'Not ideal for photo-realistic or very fine detail art', 'Priced by stitch count + garment cost'),
('Direct-to-Garment (DTG)', 'dtg', 'Inkjet printing directly onto the garment. No minimums, unlimited colors, great for detailed/photo artwork.', 1, 'Full-color artwork, photographs, complex designs', 'Best on 100% cotton; may fade faster than screen print', 'Higher per-piece cost; price drops with quantity')
ON CONFLICT (slug) DO NOTHING;

-- Insert Gildan Products
INSERT INTO apparel_products (brand_id, category_id, style_number, name, fabric, weight, sizes, color_count, base_price, print_methods) VALUES
-- Gildan Crew Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '5000', 'Heavy Cotton Tee', '100% Cotton', '5.3 oz', ARRAY['S','M','L','XL','2XL','3XL','4XL','5XL'], 30, 2.74, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '64000', 'Softstyle Tee', '100% Ring-Spun Cotton', '4.5 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL'], 65, 3.07, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '3000', 'Ultra Cotton Tee', '100% Cotton', '6.0 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL'], 35, 2.27, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Gildan V-Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '2300', 'Softstyle V-Neck Tee', '100% Ring-Spun Cotton', '4.5 oz', ARRAY['S','M','L','XL','2XL','3XL','4XL','5XL'], 15, 5.07, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '2400', 'Ultra Cotton V-Neck Tee', '100% Cotton', '6.0 oz', ARRAY['S','M','L','XL','2XL','3XL','4XL','5XL'], 10, 5.05, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Gildan Long Sleeve
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '5300', 'Heavy Cotton Long Sleeve Tee', '100% Cotton', '5.3 oz', ARRAY['S','M','L','XL','2XL','3XL'], 20, 4.02, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '64400', 'Softstyle Long Sleeve Tee', '100% Ring-Spun Cotton', '4.5 oz', ARRAY['S','M','L','XL','2XL','3XL'], 15, 4.95, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Gildan Hoodies
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'hoodies'), '18000', 'Heavy Blend Pullover Hoodie', '50/50 Cotton-Poly', '8.0 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL'], 30, 7.09, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'hoodies'), '18600', 'Heavy Blend Full Zip Hoodie', '50/50 Cotton-Poly', '8.0 oz', ARRAY['S','M','L','XL','2XL','3XL','4XL','5XL'], 20, 18.13, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Gildan Sweatshirts
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'sweatshirts'), '18200', 'Heavy Blend Crew Sweatshirt', '50/50 Cotton-Poly', '8.0 oz', ARRAY['S','M','L','XL','2XL','3XL'], 25, 8.45, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Gildan Polos
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'polos'), '8800', 'DryBlend Jersey Polo', '50/50 Cotton-Poly', '5.6 oz', ARRAY['S','M','L','XL','2XL','3XL','4XL','5XL'], 15, 7.33, ARRAY['silkscreen', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'gildan'), (SELECT id FROM apparel_categories WHERE slug = 'polos'), 'SF000', 'Softstyle Adult Polo', '100% Ring-Spun Cotton', '5.0 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL'], 10, 9.30, ARRAY['silkscreen', 'embroidery'])
ON CONFLICT (brand_id, style_number) DO NOTHING;

-- Insert Next Level Products
INSERT INTO apparel_products (brand_id, category_id, style_number, name, fabric, weight, sizes, color_count, base_price, print_methods) VALUES
-- Next Level Crew Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '3600', 'Unisex Cotton T-Shirt', '100% Combed Ring-Spun Cotton', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL'], 30, 4.08, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '3600SW', 'Sueded Crew T-Shirt', '60/40 Cotton-Poly Sueded', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 10, 5.90, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '6210', 'Women''s CVC Crew Neck Tee', '60/40 CVC Cotton-Poly', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL'], 20, 4.19, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Next Level V-Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '3310', 'Unisex Cotton V-Neck', '100% Combed Ring-Spun Cotton', '4.3 oz', ARRAY['XS','S','M','L','XL'], 15, 3.10, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '6051', 'Women''s CVC V-Neck Tee', '60/40 CVC Cotton-Poly', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 15, 6.56, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Next Level Long Sleeve
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '6411', 'Women''s Relaxed Long Sleeve Tee', '100% Combed Ring-Spun Cotton', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 15, 8.28, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Next Level Hoodies
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'hoodies'), '9000', 'Unisex Classic Pullover Hoodie', '80/20 Ring-Spun Cotton-Poly Fleece', '8.0 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 15, 14.48, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'hoodies'), '9001', 'Unisex Pullover Hoodie', '80/20 Ring-Spun Cotton-Poly Fleece', '8.0 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 10, 13.99, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Next Level Sweatshirts
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'sweatshirts'), '9300', 'Unisex Classic Crew Sweatshirt', '80/20 Ring-Spun Cotton-Poly Fleece', '8.0 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 10, 17.73, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- Next Level Polos
((SELECT id FROM apparel_brands WHERE slug = 'next-level'), (SELECT id FROM apparel_categories WHERE slug = 'polos'), '7410', 'Unisex Pacifica Polo', '100% Polyester Performance', '4.0 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 8, 6.00, ARRAY['silkscreen', 'embroidery'])
ON CONFLICT (brand_id, style_number) DO NOTHING;

-- Insert BELLA + CANVAS Products
INSERT INTO apparel_products (brand_id, category_id, style_number, name, fabric, weight, sizes, color_count, base_price, print_methods) VALUES
-- BELLA + CANVAS Crew Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '3001', 'Unisex Jersey Short Sleeve Tee', '100% Airlume Combed & Ring-Spun Cotton', '4.2 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL'], 100, 4.49, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '3001CVC', 'CVC Unisex Jersey Tee', '52/48 CVC Cotton-Poly Airlume', '4.2 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL'], 30, 4.59, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '3413', 'Unisex Triblend Short Sleeve Tee', '50/25/25 Poly-Cotton-Rayon Triblend', '3.8 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL'], 35, 6.49, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- BELLA + CANVAS V-Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '3005', 'Unisex Jersey V-Neck Tee', '100% Airlume Combed & Ring-Spun Cotton', '4.2 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 30, 5.69, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '3200', 'Unisex Jersey Short Sleeve V-Neck', '100% Airlume Combed & Ring-Spun Cotton', '4.2 oz', ARRAY['XS','S','M','L','XL','2XL'], 20, 6.49, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '3415', 'Unisex Triblend V-Neck', '50/25/25 Poly-Cotton-Rayon Triblend', '3.8 oz', ARRAY['XS','S','M','L','XL','2XL'], 20, 7.19, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- BELLA + CANVAS Long Sleeve
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '3501', 'Unisex Jersey Long Sleeve Tee', '100% Airlume Combed & Ring-Spun Cotton', '4.2 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL'], 50, 7.39, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '3501CVC', 'CVC Long Sleeve Tee', '52/48 CVC Cotton-Poly Airlume', '4.2 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL'], 20, 7.49, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '3513', 'Unisex Triblend Long Sleeve', '50/25/25 Poly-Cotton-Rayon Triblend', '3.8 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 20, 9.59, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- BELLA + CANVAS Hoodies
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'hoodies'), '3719', 'Unisex Sponge Fleece Pullover Hoodie', '52/48 Airlume Cotton-Poly Sponge Fleece', '7.5 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 60, 17.59, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'hoodies'), '3739', 'Unisex Sponge Fleece DTM Hoodie', '52/48 Airlume Cotton-Poly Sponge Fleece', '7.5 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 30, 18.59, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- BELLA + CANVAS Sweatshirts
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'sweatshirts'), '3901', 'Unisex Sponge Fleece Crew Neck Sweatshirt', '52/48 Airlume Cotton-Poly Sponge Fleece', '7.5 oz', ARRAY['XS','S','M','L','XL','2XL','3XL'], 50, 16.49, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- BELLA + CANVAS Polos
((SELECT id FROM apparel_brands WHERE slug = 'bella-canvas'), (SELECT id FROM apparel_categories WHERE slug = 'polos'), '3945', 'Unisex Jersey Short Sleeve Polo', '100% Airlume Combed & Ring-Spun Cotton', '4.2 oz', ARRAY['XS','S','M','L','XL','2XL'], 15, 16.59, ARRAY['silkscreen', 'embroidery'])
ON CONFLICT (brand_id, style_number) DO NOTHING;

-- Insert American Apparel Products
INSERT INTO apparel_products (brand_id, category_id, style_number, name, fabric, weight, sizes, color_count, base_price, print_methods) VALUES
-- American Apparel Crew Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '2001', 'Fine Jersey Unisex Short-Sleeve Tee', '100% Fine Jersey Cotton', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL'], 30, 4.68, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '2001CVC', 'CVC Unisex T-Shirt', '50/50 CVC Cotton-Poly', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL'], 20, 4.68, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'crew-neck-tees'), '1301', 'Ladies Fine Jersey Short-Sleeve Tee', '100% Fine Jersey Cotton', '4.3 oz', ARRAY['XS','S','M','L','XL','2XL','3XL','4XL'], 25, 3.25, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- American Apparel V-Neck Tees
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'v-neck-tees'), '1304', 'Ladies Fine Jersey Short-Sleeve V-Neck', '100% Fine Jersey Cotton', '4.3 oz', ARRAY['S','M','L','XL','2XL','3XL'], 20, 5.36, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- American Apparel Long Sleeve
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '2007', 'Fine Jersey Long Sleeve Tee', '100% Fine Jersey Cotton', '4.3 oz', ARRAY['S','M','L','XL','2XL','3XL'], 15, 7.78, ARRAY['silkscreen', 'dtg', 'embroidery']),
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'long-sleeve-tees'), '2003CVC', 'CVC Long Sleeve T-Shirt', '50/50 CVC Cotton-Poly', '4.3 oz', ARRAY['S','M','L','XL','2XL','3XL'], 15, 6.11, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- American Apparel Hoodies
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'hoodies'), 'AA9001', 'ReFlex Fleece Unisex Pullover Hoodie', '50/50 Fleece Cotton-Poly', '8.0 oz', ARRAY['S','M','L','XL','2XL','3XL'], 15, 9.65, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- American Apparel Sweatshirts
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'sweatshirts'), '9410', 'ReFlex Fleece Crewneck Sweatshirt', '50/50 Fleece Cotton-Poly', '8.0 oz', ARRAY['S','M','L','XL','2XL','3XL'], 10, 11.95, ARRAY['silkscreen', 'dtg', 'embroidery']),
-- American Apparel Polos
((SELECT id FROM apparel_brands WHERE slug = 'american-apparel'), (SELECT id FROM apparel_categories WHERE slug = 'polos'), 'RF491', 'Reflex Jersey Short-Sleeve Polo', '65/35 Poly-Cotton Pique', '5.4 oz', ARRAY['S','M','L','XL','2XL','3XL'], 10, 15.51, ARRAY['silkscreen', 'embroidery'])
ON CONFLICT (brand_id, style_number) DO NOTHING;


