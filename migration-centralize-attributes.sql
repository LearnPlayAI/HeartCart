-- Migration to centralize attribute system
-- Add new fields to product_attributes table

-- Add selected_options field for storing options as JSON
ALTER TABLE product_attributes 
ADD COLUMN IF NOT EXISTS selected_options JSONB DEFAULT '[]';

-- Add text_value field to store custom values directly
ALTER TABLE product_attributes
ADD COLUMN IF NOT EXISTS text_value TEXT;

-- Add price_adjustment field (will always be set to 0 as per requirements)
ALTER TABLE product_attributes
ADD COLUMN IF NOT EXISTS price_adjustment DECIMAL(10, 2) DEFAULT 0;

-- Convert timestamps to be compatible with the schema
ALTER TABLE product_attributes
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::TIMESTAMPTZ,
ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::TIMESTAMPTZ;

-- We're keeping the existing tables for backward compatibility temporarily:
-- - catalog_attributes
-- - category_attribute_options
-- - category_attributes
-- - product_attribute_options
-- - product_attribute_values
-- - catalog_attribute_options