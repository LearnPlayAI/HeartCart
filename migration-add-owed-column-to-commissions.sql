-- Add owed column to repCommissions table for accurate payment tracking
-- This column will track the amount currently owed and be zeroed when payments are made

-- Add the owed column to repCommissions table
ALTER TABLE "repCommissions" ADD COLUMN "owed" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Populate owed column with current commission amounts for unpaid commissions
UPDATE "repCommissions" 
SET "owed" = "commissionAmount"
WHERE "status" = 'earned';

-- For paid commissions, owed should remain 0.00 (already set by default)
-- This ensures existing paid commissions show zero owed amount

-- Add comment to column for clarity
COMMENT ON COLUMN "repCommissions"."owed" IS 'Amount currently owed to sales rep - zeroed when payment is made';