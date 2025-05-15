-- Enhance the product_drafts table with new fields

-- First add the new columns if they don't exist
DO $$
BEGIN
    -- Add catalog_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'catalog_id'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN catalog_id INTEGER REFERENCES catalogs(id);
    END IF;
    
    -- Add minimum_price if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'minimum_price'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN minimum_price DECIMAL(10, 2);
    END IF;
    
    -- Add attributes_data for enhanced attribute storage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'attributes_data'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN attributes_data JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add canonical_url for SEO
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'canonical_url'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN canonical_url TEXT;
    END IF;
    
    -- Add publication info
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'published_at'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'published_version'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN published_version INTEGER DEFAULT 1;
    END IF;
    
    -- Add AI-generated content flags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'has_ai_description'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN has_ai_description BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'has_ai_seo'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN has_ai_seo BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add shipping information
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'free_shipping'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN free_shipping BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'shipping_class'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN shipping_class TEXT DEFAULT 'standard';
    END IF;
    
    -- Add audit information
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'last_reviewer'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN last_reviewer INTEGER REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN rejection_reason TEXT;
    END IF;
    
    -- Add completed_steps for tracking wizard progress
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'completed_steps'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN completed_steps TEXT[];
    END IF;
    
    -- Add version control
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'version'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Add change history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_drafts' AND column_name = 'change_history'
    ) THEN
        ALTER TABLE product_drafts ADD COLUMN change_history JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Update the wizard_progress default value to include the new steps
    ALTER TABLE product_drafts 
    ALTER COLUMN wizard_progress SET DEFAULT '{"basic-info": false, "images": false, "additional-info": false, "attributes": false, "seo": false, "sales-promotions": false, "review": false}'::jsonb;
END
$$;

-- Create new indexes for improved performance
DO $$
BEGIN
    -- Add index for catalog_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'product_drafts' AND indexname = 'idx_product_drafts_catalog'
    ) THEN
        CREATE INDEX idx_product_drafts_catalog ON product_drafts(catalog_id);
    END IF;
    
    -- Add index for supplier_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'product_drafts' AND indexname = 'idx_product_drafts_supplier'
    ) THEN
        CREATE INDEX idx_product_drafts_supplier ON product_drafts(supplier_id);
    END IF;
    
    -- Add index for category_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'product_drafts' AND indexname = 'idx_product_drafts_category'
    ) THEN
        CREATE INDEX idx_product_drafts_category ON product_drafts(category_id);
    END IF;
END
$$;