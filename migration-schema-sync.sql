-- Migration to ensure schema.ts matches actual database structure
-- This migration adds missing columns to match the schema.ts file

-- Check and add timestamp fields to categories table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_at') THEN
        ALTER TABLE categories ADD COLUMN created_at TEXT DEFAULT to_char(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'updated_at') THEN
        ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT to_char(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL;
    END IF;
    
    -- Update any existing rows in categories with timestamp values if fields were just added
    UPDATE categories 
    SET created_at = to_char(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        updated_at = to_char(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    WHERE created_at IS NULL OR updated_at IS NULL;
END
$$;

-- Check and add missing fields to product_drafts table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_drafts' AND column_name = 'selected_attributes') THEN
        ALTER TABLE product_drafts ADD COLUMN selected_attributes JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_drafts' AND column_name = 'ai_suggestions') THEN
        ALTER TABLE product_drafts ADD COLUMN ai_suggestions JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_drafts' AND column_name = 'discount_data') THEN
        ALTER TABLE product_drafts ADD COLUMN discount_data JSONB DEFAULT '{}';
    END IF;
END
$$;

-- Add index on product_drafts.selected_attributes to improve query performance (for GIN indexes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'product_drafts' AND indexname = 'idx_product_drafts_selected_attributes') THEN
        CREATE INDEX idx_product_drafts_selected_attributes ON product_drafts USING GIN (selected_attributes);
    END IF;
END
$$;

-- Verify that all columns in schema.ts exist in the database tables
-- This is an informational query that will show missing fields
DO $$
DECLARE
    category_count INTEGER;
    product_drafts_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count
    FROM information_schema.columns 
    WHERE table_name = 'categories' 
    AND column_name IN ('created_at', 'updated_at');
    
    RAISE NOTICE 'Categories table timestamp fields present: % of 2', category_count;
    
    SELECT COUNT(*) INTO product_drafts_count
    FROM information_schema.columns 
    WHERE table_name = 'product_drafts' 
    AND column_name IN ('selected_attributes', 'ai_suggestions', 'discount_data');
    
    RAISE NOTICE 'Product drafts missing fields present: % of 3', product_drafts_count;
END
$$;