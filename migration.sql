-- Create category_attributes table
CREATE TABLE IF NOT EXISTS "category_attributes" (
  "id" SERIAL PRIMARY KEY,
  "category_id" INTEGER NOT NULL REFERENCES "categories"("id"),
  "name" VARCHAR(100) NOT NULL,
  "display_name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "attribute_type" VARCHAR(50) NOT NULL,
  "is_required" BOOLEAN DEFAULT FALSE,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE ("category_id", "name")
);

-- Create category_attribute_options table
CREATE TABLE IF NOT EXISTS "category_attribute_options" (
  "id" SERIAL PRIMARY KEY,
  "attribute_id" INTEGER NOT NULL REFERENCES "category_attributes"("id"),
  "value" VARCHAR(255) NOT NULL,
  "display_value" VARCHAR(255) NOT NULL,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create product_attribute_values table
CREATE TABLE IF NOT EXISTS "product_attribute_values" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL REFERENCES "products"("id"),
  "attribute_id" INTEGER NOT NULL REFERENCES "category_attributes"("id"),
  "value" TEXT NOT NULL,
  "price_adjustment" DECIMAL(10, 2) DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE ("product_id", "attribute_id")
);

-- Create product_attribute_combinations table
CREATE TABLE IF NOT EXISTS "product_attribute_combinations" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL REFERENCES "products"("id"),
  "combination_hash" VARCHAR(64) NOT NULL,
  "price_adjustment" DECIMAL(10, 2) DEFAULT 0,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE ("product_id", "combination_hash")
);