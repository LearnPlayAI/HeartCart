-- Migration to convert ALL remaining timestamp fields to text for SAST timezone consistency

-- Convert timestamp fields in aiSettings
ALTER TABLE ai_settings
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT;

-- Convert timestamp fields in pricing table
ALTER TABLE pricing
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT,
ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT;

-- Convert timestamp fields in order_items
ALTER TABLE order_items
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT;

-- Convert timestamp fields in orders
ALTER TABLE orders
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT,
ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT;

-- Convert timestamp fields in users
ALTER TABLE users
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT,
ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT,
ALTER COLUMN last_login TYPE TEXT USING last_login::TEXT;

-- Convert timestamp fields in suppliers
ALTER TABLE suppliers
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT,
ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT;

-- Convert timestamp fields in catalogs
ALTER TABLE catalogs
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT,
ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT;

-- Convert timestamp fields in categories
ALTER TABLE categories
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT,
ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT;

-- Add standardized comments
COMMENT ON COLUMN users.created_at IS 'Creation date in SAST timezone format as text';
COMMENT ON COLUMN users.updated_at IS 'Last update date in SAST timezone format as text';
COMMENT ON COLUMN users.last_login IS 'Last login date in SAST timezone format as text';