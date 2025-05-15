-- Migration to convert all timestamp fields to text for SAST timezone consistency

-- Tables with timestamp fields in schema.ts:
-- users, categories, aiSettings, suppliers, catalogs,
-- product_attributes, session

-- Convert timestamp fields in product_attributes
ALTER TABLE product_attributes 
ALTER COLUMN created_at TYPE TEXT USING created_at::TEXT,
ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT;

-- Convert expire column in session table
ALTER TABLE session
ALTER COLUMN expire TYPE TEXT USING expire::TEXT;

-- Add comments for clarity
COMMENT ON COLUMN product_attributes.created_at IS 'Creation date in SAST timezone format as text';
COMMENT ON COLUMN product_attributes.updated_at IS 'Last update date in SAST timezone format as text';
COMMENT ON COLUMN session.expire IS 'Session expiration date in SAST timezone format as text';