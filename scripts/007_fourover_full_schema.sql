-- Full 4over data schema migration
-- Run this to add tables for complete 4over catalog data

-- Categories table
CREATE TABLE IF NOT EXISTS fourover_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fourover_uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Option groups table (Size, Stock, Coating, Colorspec, Runsize, Turnaround-times, etc.)
CREATE TABLE IF NOT EXISTS fourover_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fourover_uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options table (specific options within each group)
CREATE TABLE IF NOT EXISTS fourover_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fourover_uuid TEXT UNIQUE NOT NULL,
  option_group_id UUID REFERENCES fourover_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product option groups (which option groups apply to which products)
CREATE TABLE IF NOT EXISTS fourover_product_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  option_group_id UUID REFERENCES fourover_option_groups(id) ON DELETE CASCADE,
  fourover_product_option_group_uuid TEXT,
  min_occurs INTEGER DEFAULT 1,
  max_occurs INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, option_group_id)
);

-- Product options (specific options available for each product)
CREATE TABLE IF NOT EXISTS fourover_product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  option_group_id UUID REFERENCES fourover_option_groups(id) ON DELETE CASCADE,
  option_id UUID REFERENCES fourover_options(id) ON DELETE CASCADE,
  fourover_option_uuid TEXT,
  name TEXT NOT NULL,
  description TEXT,
  has_pricing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base prices table (prices by runsize and colorspec)
CREATE TABLE IF NOT EXISTS fourover_base_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  runsize TEXT NOT NULL,
  runsize_uuid TEXT,
  colorspec TEXT NOT NULL,
  colorspec_uuid TEXT,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, runsize, colorspec)
);

-- Option prices table (additional prices for options like turnaround, finishing)
CREATE TABLE IF NOT EXISTS fourover_option_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  option_uuid TEXT NOT NULL,
  runsize TEXT,
  runsize_uuid TEXT,
  colorspec TEXT,
  colorspec_uuid TEXT,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES fourover_categories(id);

-- Add product_code column if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fourover_categories_uuid ON fourover_categories(fourover_uuid);
CREATE INDEX IF NOT EXISTS idx_fourover_options_group ON fourover_options(option_group_id);
CREATE INDEX IF NOT EXISTS idx_fourover_product_options_product ON fourover_product_options(product_id);
CREATE INDEX IF NOT EXISTS idx_fourover_base_prices_product ON fourover_base_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_fourover_option_prices_product ON fourover_option_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_fourover_id ON products(fourover_id);
