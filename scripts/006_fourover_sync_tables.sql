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
