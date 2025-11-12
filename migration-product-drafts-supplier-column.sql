-- Migration: Rename product_drafts.supplier_id to supplierId for consistency
-- This aligns product_drafts with the products table naming convention
-- Safe to run: Uses ALTER TABLE RENAME COLUMN which preserves all data

BEGIN;

-- Rename the column from supplier_id to supplierId
ALTER TABLE product_drafts 
  RENAME COLUMN supplier_id TO "supplierId";

-- Verify the column was renamed successfully
DO $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'product_drafts' 
    AND column_name = 'supplierId'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION 'Migration failed: supplierId column not found after rename';
  END IF;
  
  RAISE NOTICE 'Migration successful: product_drafts.supplier_id renamed to supplierId';
END $$;

COMMIT;

-- Post-migration verification query:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'product_drafts' 
-- AND column_name LIKE '%supplier%';
