-- VAT System Migration Script
-- Adds VAT fields to orders table and creates VAT system settings

-- Add VAT fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "vatRegistrationNumber" TEXT;

-- Create VAT system settings in systemSettings table
INSERT INTO "systemSettings" ("settingKey", "settingValue", "description", "isActive", "createdAt", "updatedAt")
VALUES 
  ('vatRate', '0.00', 'South African VAT rate percentage (currently 0% as company is not VAT registered)', true, NOW()::text, NOW()::text),
  ('vatRegistrationNumber', '', 'Company VAT registration number (empty when not VAT registered)', true, NOW()::text, NOW()::text),
  ('vatRegistered', 'false', 'Whether the company is registered for VAT in South Africa', true, NOW()::text, NOW()::text)
ON CONFLICT ("settingKey") DO NOTHING;

-- Add comments to VAT fields for documentation
COMMENT ON COLUMN orders."vatAmount" IS 'Calculated VAT amount for this order based on admin-set VAT rate';
COMMENT ON COLUMN orders."vatRate" IS 'VAT rate percentage used for this order (historical record from admin settings)';
COMMENT ON COLUMN orders."vatRegistrationNumber" IS 'VAT registration number at time of order (historical record)';

-- Create index for VAT queries
CREATE INDEX IF NOT EXISTS idx_orders_vat_amount ON orders("vatAmount");
CREATE INDEX IF NOT EXISTS idx_orders_vat_rate ON orders("vatRate");