-- Create product_drafts table
CREATE TABLE IF NOT EXISTS product_drafts (
  id SERIAL PRIMARY KEY,
  original_product_id INTEGER REFERENCES products(id),
  draft_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'review', 'ready'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic product information
  name TEXT,
  slug TEXT,
  sku TEXT,
  description TEXT,
  brand TEXT,
  category_id INTEGER REFERENCES categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Pricing information
  cost_price DECIMAL(10, 2),
  regular_price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  on_sale BOOLEAN DEFAULT FALSE,
  markup_percentage INTEGER,
  
  -- Images
  image_urls TEXT[],
  image_object_keys TEXT[],
  main_image_index INTEGER DEFAULT 0,
  
  -- Inventory
  stock_level INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  backorder_enabled BOOLEAN DEFAULT FALSE,
  
  -- Attributes (stored as JSON)
  attributes JSONB DEFAULT '[]',
  
  -- Supplier information
  supplier_id INTEGER REFERENCES suppliers(id),
  
  -- Physical properties
  weight TEXT,
  dimensions TEXT,
  
  -- Promotions
  discount_label TEXT,
  special_sale_text TEXT,
  special_sale_start TIMESTAMP WITH TIME ZONE,
  special_sale_end TIMESTAMP WITH TIME ZONE,
  is_flash_deal BOOLEAN DEFAULT FALSE,
  flash_deal_end TIMESTAMP WITH TIME ZONE,
  
  -- Tax information
  taxable BOOLEAN DEFAULT TRUE,
  tax_class TEXT DEFAULT 'standard',
  
  -- SEO metadata
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  
  -- Wizard progress tracking
  wizard_progress JSONB DEFAULT '{"basic-info": false, "images": false, "additional-info": false, "sales-promotions": false, "review": false}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_drafts_original_product 
ON product_drafts(original_product_id);

CREATE INDEX IF NOT EXISTS idx_product_drafts_status 
ON product_drafts(draft_status);