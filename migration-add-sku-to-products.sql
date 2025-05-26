-- Add SKU field to products table
-- This is a critical field for dropshipping operations as it's the unique identifier used when ordering from suppliers

ALTER TABLE products ADD COLUMN sku TEXT;

-- Add unique constraint on SKU field
ALTER TABLE products ADD CONSTRAINT products_sku_unique UNIQUE (sku);

-- Add index on SKU for faster lookups
CREATE INDEX IF NOT EXISTS products_sku_idx ON products (sku);

-- Update any existing products to have a temporary SKU based on their ID if needed
-- (This is just for data consistency, new products will have proper SKUs)
UPDATE products SET sku = 'PROD-' || id::text WHERE sku IS NULL;