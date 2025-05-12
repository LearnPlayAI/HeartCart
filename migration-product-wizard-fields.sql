-- Migration for Product Wizard Fields

-- Add new fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS minimum_price DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS minimum_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS discount_label TEXT,
ADD COLUMN IF NOT EXISTS special_sale_text TEXT,
ADD COLUMN IF NOT EXISTS special_sale_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS special_sale_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS required_attribute_ids INTEGER[];

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_special_sale ON products (special_sale_start, special_sale_end);
CREATE INDEX IF NOT EXISTS idx_products_minimum_price ON products (minimum_price);
CREATE INDEX IF NOT EXISTS idx_products_minimum_order ON products (minimum_order);

-- Comment about usage:
-- This is a reference SQL migration script, but actual schema changes will be
-- applied using the 'npm run db:push' command which pushes the Drizzle schema
-- directly to the database.