-- Complete Field Support Migration for Product Wizard
-- This migration adds all missing fields for complete product wizard functionality

-- Add SEO fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_keywords TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Add additional pricing fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate_percentage DOUBLE PRECISION;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS products_meta_title_idx ON products(meta_title);
CREATE INDEX IF NOT EXISTS products_canonical_url_idx ON products(canonical_url);

-- Update any existing products to have basic SEO if missing
UPDATE products 
SET meta_title = name 
WHERE meta_title IS NULL AND name IS NOT NULL;

-- Log the migration
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  'complete-field-support', 
  NOW(), 
  'Added SEO fields (meta_title, meta_description, meta_keywords, canonical_url) and pricing fields (compare_at_price, tax_rate_percentage) to products table'
) ON CONFLICT (migration_name) DO NOTHING;