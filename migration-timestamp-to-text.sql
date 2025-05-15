-- Migration script to convert all timestamp fields to text fields
-- This ensures all date and time information is stored as strings
-- 
-- NOTE: For the session table specifically, we keep timestamps as they are
-- because the PostgreSQL session store requires timestamp-based fields.

-- Users table
ALTER TABLE users 
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT,
  ALTER COLUMN last_login TYPE TEXT;

-- Products table
-- (We already updated the flash_deal_end, special_sale_start, and special_sale_end fields)
ALTER TABLE products
  ALTER COLUMN created_at TYPE TEXT;

-- Orders table
ALTER TABLE orders
  ALTER COLUMN created_at TYPE TEXT;

-- Order Items table
ALTER TABLE order_items
  ALTER COLUMN created_at TYPE TEXT;

-- Cart Items table
ALTER TABLE cart_items
  ALTER COLUMN created_at TYPE TEXT;

-- Product Images table
ALTER TABLE product_images
  ALTER COLUMN created_at TYPE TEXT;

-- AI Recommendations table
ALTER TABLE ai_recommendations
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Pricing table
ALTER TABLE pricing
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT,
  ALTER COLUMN start_date TYPE TEXT,
  ALTER COLUMN end_date TYPE TEXT;

-- AI Settings table
ALTER TABLE ai_settings
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Suppliers table
ALTER TABLE suppliers
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Catalogs table
ALTER TABLE catalogs
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Attributes table
ALTER TABLE attributes
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Attribute Options table
ALTER TABLE attribute_options
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Catalog Attributes table
ALTER TABLE catalog_attributes
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Catalog Attribute Options table
ALTER TABLE catalog_attribute_options
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Category Attributes table
ALTER TABLE category_attributes
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Category Attribute Options table
ALTER TABLE category_attribute_options
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Product Attributes table
ALTER TABLE product_attributes
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Product Attribute Options table
ALTER TABLE product_attribute_options
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Product Attribute Values table
ALTER TABLE product_attribute_values
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT,
  ALTER COLUMN date_value TYPE TEXT;

-- Batch Uploads table
ALTER TABLE batch_uploads
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN started_at TYPE TEXT,
  ALTER COLUMN completed_at TYPE TEXT,
  ALTER COLUMN canceled_at TYPE TEXT,
  ALTER COLUMN paused_at TYPE TEXT,
  ALTER COLUMN resumed_at TYPE TEXT,
  ALTER COLUMN failed_at TYPE TEXT;

-- Batch Upload Errors table
ALTER TABLE batch_upload_errors
  ALTER COLUMN created_at TYPE TEXT;

-- Attribute Discount Rules table
ALTER TABLE attribute_discount_rules
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT,
  ALTER COLUMN start_date TYPE TEXT,
  ALTER COLUMN end_date TYPE TEXT;

-- Product Drafts table
ALTER TABLE product_drafts
  ALTER COLUMN created_at TYPE TEXT,
  ALTER COLUMN updated_at TYPE TEXT;

-- Session Table (Special Case)
-- The session table must use timestamp with time zone for its expire column
-- to work properly with the PostgreSQL session store.
-- If the session table had text-based expire fields, execute this SQL:
-- DROP TABLE IF EXISTS session CASCADE;
-- CREATE TABLE session (
--   sid VARCHAR NOT NULL PRIMARY KEY,
--   sess JSON NOT NULL,
--   expire TIMESTAMP WITH TIME ZONE NOT NULL
-- );
-- CREATE INDEX IDX_session_expire ON session (expire);