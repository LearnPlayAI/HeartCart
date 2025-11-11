-- Production Schema Migration: Update shippingMethods table to match development
-- This migrates from old snake_case columns to new camelCase columns

BEGIN;

-- Add new columns if they don't exist
ALTER TABLE "shippingMethods" 
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "baseCost" NUMERIC,
  ADD COLUMN IF NOT EXISTS "customerPrice" NUMERIC,
  ADD COLUMN IF NOT EXISTS "logisticsCompanyId" INTEGER,
  ADD COLUMN IF NOT EXISTS "estimatedDeliveryDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;

-- Copy data from old columns to new columns
UPDATE "shippingMethods"
SET 
  "baseCost" = COALESCE("baseCost", "basePrice"),
  "customerPrice" = COALESCE("customerPrice", "basePrice"),
  "logisticsCompanyId" = COALESCE("logisticsCompanyId", "companyId"),
  "code" = COALESCE("code", 'METHOD_' || id::text)
WHERE "baseCost" IS NULL OR "customerPrice" IS NULL OR "logisticsCompanyId" IS NULL OR "code" IS NULL;

-- Parse estimatedDays text to integer (e.g., "2-3" -> 3)
UPDATE "shippingMethods"
SET "estimatedDeliveryDays" = CASE
  WHEN "estimatedDeliveryDays" IS NULL THEN
    CASE
      WHEN "estimatedDays" ~ '^\d+-\d+$' THEN 
        split_part("estimatedDays", '-', 2)::integer
      WHEN "estimatedDays" ~ '^\d+$' THEN 
        "estimatedDays"::integer
      ELSE 3
    END
  ELSE "estimatedDeliveryDays"
END;

-- Make new columns NOT NULL after data migration
ALTER TABLE "shippingMethods"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "baseCost" SET NOT NULL,
  ALTER COLUMN "customerPrice" SET NOT NULL,
  ALTER COLUMN "logisticsCompanyId" SET NOT NULL,
  ALTER COLUMN "estimatedDeliveryDays" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "shippingMethods"
  DROP CONSTRAINT IF EXISTS "shippingMethods_logisticsCompanyId_fkey",
  ADD CONSTRAINT "shippingMethods_logisticsCompanyId_fkey" 
    FOREIGN KEY ("logisticsCompanyId") 
    REFERENCES "logisticsCompanies"(id)
    ON DELETE RESTRICT;

-- Optional: Drop old columns (commented out for safety - uncomment after verification)
-- ALTER TABLE "shippingMethods"
--   DROP COLUMN IF EXISTS "basePrice",
--   DROP COLUMN IF EXISTS "companyId",
--   DROP COLUMN IF EXISTS "estimatedDays";

COMMIT;

-- Verification queries
SELECT id, name, code, "baseCost", "customerPrice", "logisticsCompanyId", "estimatedDeliveryDays"
FROM "shippingMethods"
ORDER BY id;
