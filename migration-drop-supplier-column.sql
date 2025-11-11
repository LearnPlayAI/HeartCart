-- Phase 3: Drop supplier text column from products table
-- 
-- IMPORTANT: Only run this migration AFTER:
-- 1. migration-consolidate-supplier-columns.sql has been successfully run in production
-- 2. Code changes removing supplier column references have been deployed
-- 3. Application has been running successfully without the supplier column for at least 24-48 hours
--
-- This migration is IRREVERSIBLE - the supplier text column data will be permanently lost
-- (but that's OK because all data was migrated to supplierId in Phase 1)

BEGIN;

-- Verify that supplierId column exists and has NOT NULL constraint
DO $$
DECLARE
  supplier_id_not_null boolean;
BEGIN
  -- Check if supplierId column exists and is NOT NULL
  SELECT COUNT(*) > 0 INTO supplier_id_not_null
  FROM information_schema.columns
  WHERE table_name = 'products'
    AND column_name = 'supplierId'
    AND is_nullable = 'NO';
  
  IF NOT supplier_id_not_null THEN
    RAISE EXCEPTION 'supplierId column is not properly configured as NOT NULL. Run migration-consolidate-supplier-columns.sql first.';
  END IF;
  
  RAISE NOTICE 'Pre-check passed: supplierId column exists with NOT NULL constraint';
END $$;

-- Verify no products have NULL supplierId
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM products
  WHERE "supplierId" IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION '% products still have NULL supplierId. Cannot drop supplier column safely.', null_count;
  END IF;
  
  RAISE NOTICE 'Verification passed: All products have valid supplierId';
END $$;

-- Check if supplier column still exists before attempting to drop
DO $$
DECLARE
  supplier_column_exists boolean;
BEGIN
  SELECT COUNT(*) > 0 INTO supplier_column_exists
  FROM information_schema.columns
  WHERE table_name = 'products'
    AND column_name = 'supplier';
  
  IF supplier_column_exists THEN
    RAISE NOTICE 'Dropping supplier text column from products table...';
    ALTER TABLE products DROP COLUMN supplier;
    RAISE NOTICE 'Successfully dropped supplier column';
  ELSE
    RAISE NOTICE 'Supplier column already dropped - skipping';
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  supplier_column_exists boolean;
  supplier_id_exists boolean;
BEGIN
  SELECT COUNT(*) > 0 INTO supplier_column_exists
  FROM information_schema.columns
  WHERE table_name = 'products'
    AND column_name = 'supplier';
  
  SELECT COUNT(*) > 0 INTO supplier_id_exists
  FROM information_schema.columns
  WHERE table_name = 'products'
    AND column_name = 'supplierId';
  
  IF supplier_column_exists THEN
    RAISE EXCEPTION 'Supplier column still exists after drop attempt';
  END IF;
  
  IF NOT supplier_id_exists THEN
    RAISE EXCEPTION 'supplierId column missing - data integrity compromised';
  END IF;
  
  RAISE NOTICE 'Phase 3 complete: supplier column dropped successfully';
  RAISE NOTICE 'Migration completed - products table now uses supplierId only';
END $$;

COMMIT;
