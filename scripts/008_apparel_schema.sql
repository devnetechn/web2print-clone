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
