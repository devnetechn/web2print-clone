-- Add 4over related columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS fourover_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_fourover_id ON products(fourover_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
