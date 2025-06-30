-- Add supplier order number column to orderItemSupplierStatus table
ALTER TABLE "orderItemSupplierStatus" 
ADD COLUMN "supplierOrderNumber" text;

-- Update any existing records to have empty string instead of null for consistency
UPDATE "orderItemSupplierStatus" 
SET "supplierOrderNumber" = '' 
WHERE "supplierOrderNumber" IS NULL;