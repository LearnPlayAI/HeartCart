-- Create Global Attributes table
CREATE TABLE IF NOT EXISTS "global_attributes" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "display_name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "attribute_type" VARCHAR(50) NOT NULL,
  "is_required" BOOLEAN DEFAULT false,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "global_attributes_name_unique" UNIQUE ("name")
);

-- Create Global Attribute Options table
CREATE TABLE IF NOT EXISTS "global_attribute_options" (
  "id" SERIAL PRIMARY KEY,
  "attribute_id" INTEGER NOT NULL REFERENCES "global_attributes"("id"),
  "value" VARCHAR(255) NOT NULL,
  "display_value" VARCHAR(255) NOT NULL,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add global_attribute_id column to product_attribute_values if it doesn't exist
ALTER TABLE "product_attribute_values" 
ADD COLUMN IF NOT EXISTS "global_attribute_id" INTEGER REFERENCES "global_attributes"("id"),
ADD COLUMN IF NOT EXISTS "is_from_global_attribute" BOOLEAN DEFAULT false;