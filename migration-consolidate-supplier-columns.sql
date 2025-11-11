-- Migration: Consolidate Supplier Columns (Phase 1)
-- Purpose: Backfill supplierId from legacy supplier text column before refactoring
-- Date: 2025-11-12

BEGIN;

-- Step 1: Create "Unknown Supplier" if it doesn't exist
INSERT INTO suppliers (
  name,
  email,
  phone,
  address,
  is_active,
  created_at,
  updated_at
)
SELECT
  'Unknown Supplier',
  'legacy@heartcart.shop',
  '0000000000',
  'Legacy Products - No Supplier Information',
  true,
  NOW()::text,
  NOW()::text
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers WHERE name = 'Unknown Supplier'
);

-- Step 2: Get the Unknown Supplier ID
DO $$
DECLARE
  unknown_supplier_id INTEGER;
  backfilled_from_text INTEGER;
  backfilled_to_unknown INTEGER;
  invalid_supplier_ids INTEGER;
BEGIN
  -- Get the Unknown Supplier ID
  SELECT id INTO unknown_supplier_id 
  FROM suppliers 
  WHERE name = 'Unknown Supplier' 
  LIMIT 1;

  RAISE NOTICE 'Unknown Supplier ID: %', unknown_supplier_id;

  -- Step 3: Backfill supplierId FROM supplier text column where valid
  -- This handles cases where supplier has "2" or "7" but supplierId is null
  UPDATE products
  SET "supplierId" = supplier::integer
  WHERE "supplierId" IS NULL 
    AND supplier IS NOT NULL 
    AND supplier ~ '^\d+$'  -- Only numeric values
    AND EXISTS (SELECT 1 FROM suppliers WHERE id = supplier::integer);

  GET DIAGNOSTICS backfilled_from_text = ROW_COUNT;
  RAISE NOTICE 'Backfilled % products from supplier text column', backfilled_from_text;

  -- Step 4: Report any invalid supplier text values
  SELECT COUNT(*) INTO invalid_supplier_ids
  FROM products
  WHERE "supplierId" IS NULL
    AND supplier IS NOT NULL
    AND (
      supplier !~ '^\d+$'  -- Not numeric
      OR NOT EXISTS (SELECT 1 FROM suppliers WHERE id = supplier::integer)  -- ID doesn't exist
    );

  IF invalid_supplier_ids > 0 THEN
    RAISE WARNING '% products have invalid supplier text values that cannot be converted', invalid_supplier_ids;
    RAISE NOTICE 'Check products table manually for invalid supplier values where supplierId is null';
  END IF;

  -- Step 5: Backfill remaining NULL supplierId to Unknown Supplier
  UPDATE products
  SET "supplierId" = unknown_supplier_id
  WHERE "supplierId" IS NULL;

  GET DIAGNOSTICS backfilled_to_unknown = ROW_COUNT;
  RAISE NOTICE 'Backfilled % products to Unknown Supplier', backfilled_to_unknown;

  -- Step 6: Final verification
  SELECT COUNT(*) INTO backfilled_from_text
  FROM products
  WHERE "supplierId" IS NULL;

  IF backfilled_from_text > 0 THEN
    RAISE EXCEPTION 'Still have % products with null supplierId - cannot proceed!', backfilled_from_text;
  END IF;

  RAISE NOTICE 'Verification passed: All products have supplierId';

END $$;

-- Step 7: Apply NOT NULL constraint
ALTER TABLE products ALTER COLUMN "supplierId" SET NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 complete: supplierId column consolidated and NOT NULL constraint applied';
  RAISE NOTICE 'Next: Remove supplier text column from code, then drop column from database';
END $$;

COMMIT;

-- Post-migration verification
-- Run these queries to verify success:
/*
-- Check all products have supplierId
SELECT 
  COUNT(*) as total_products,
  COUNT("supplierId") as has_supplierId,
  COUNT(*) FILTER (WHERE "supplierId" IS NULL) as null_supplierId
FROM products;

-- Check how many use each supplier
SELECT 
  s.id,
  s.name,
  COUNT(p.id) as product_count
FROM suppliers s
LEFT JOIN products p ON p."supplierId" = s.id
GROUP BY s.id, s.name
ORDER BY product_count DESC;

-- Verify supplier text column can be safely dropped (should show it's redundant)
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE supplier IS NULL OR supplier::integer = "supplierId") as matches,
  COUNT(*) FILTER (WHERE supplier IS NOT NULL AND supplier::integer != "supplierId") as mismatches
FROM products
WHERE supplier ~ '^\d+$';
*/
