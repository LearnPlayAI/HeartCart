-- Migration to create attribute_discount_rules table
CREATE TABLE IF NOT EXISTS "attribute_discount_rules" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "discount_type" TEXT NOT NULL DEFAULT 'percentage',
  "discount_value" DECIMAL(10, 2) NOT NULL,
  "attribute_id" INTEGER NOT NULL REFERENCES "attributes"("id"),
  "option_id" INTEGER REFERENCES "attribute_options"("id"),
  "product_id" INTEGER REFERENCES "products"("id"),
  "category_id" INTEGER REFERENCES "categories"("id"),
  "catalog_id" INTEGER REFERENCES "catalogs"("id"),
  "min_quantity" INTEGER DEFAULT 1,
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);