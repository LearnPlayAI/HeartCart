-- Migration: Backfill Legacy Products with Unknown Supplier and Apply NOT NULL Constraint
-- Purpose: Fix products with null supplierId before applying NOT NULL constraint
-- Date: 2025-11-12

BEGIN;

-- Step 1: Create "Unknown Supplier" if it doesn't exist
-- This supplier will be used for all legacy products that don't have a supplier assigned
INSERT INTO suppliers (
  name,
  "contactEmail",
  "contactPhone",
  address,
  "vatNumber",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'Unknown Supplier',
  'legacy@heartcart.shop',
  '0000000000',
  'Legacy Products - No Supplier Information',
  NULL,
  true,
  NOW()::text,
  NOW()::text
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers WHERE name = 'Unknown Supplier'
);

-- Step 2: Get the ID of the Unknown Supplier
DO $$
DECLARE
  unknown_supplier_id INTEGER;
  affected_products_count INTEGER;
BEGIN
  -- Get the Unknown Supplier ID
  SELECT id INTO unknown_supplier_id 
  FROM suppliers 
  WHERE name = 'Unknown Supplier' 
  LIMIT 1;

  -- Check how many products will be updated
  SELECT COUNT(*) INTO affected_products_count
  FROM products
  WHERE "supplierId" IS NULL;

  RAISE NOTICE 'Unknown Supplier ID: %', unknown_supplier_id;
  RAISE NOTICE 'Products to be updated: %', affected_products_count;

  -- Step 3: Update all products with null supplierId
  UPDATE products
  SET "supplierId" = unknown_supplier_id
  WHERE "supplierId" IS NULL;

  RAISE NOTICE 'Updated % products to use Unknown Supplier', affected_products_count;
END $$;

-- Step 4: Verify no null values remain
DO $$
DECLARE
  remaining_nulls INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_nulls
  FROM products
  WHERE "supplierId" IS NULL;

  IF remaining_nulls > 0 THEN
    RAISE EXCEPTION 'Still have % products with null supplierId - cannot proceed', remaining_nulls;
  END IF;

  RAISE NOTICE 'Verification passed: No products with null supplierId';
END $$;

-- Step 5: Apply the NOT NULL constraint
ALTER TABLE products ALTER COLUMN "supplierId" SET NOT NULL;

RAISE NOTICE 'Successfully applied NOT NULL constraint to products.supplierId';

COMMIT;

-- Verification query (run after migration)
-- SELECT COUNT(*) as total_products, 
--        COUNT("supplierId") as products_with_supplier,
--        COUNT(*) FILTER (WHERE "supplierId" IS NULL) as null_suppliers
-- FROM products;
