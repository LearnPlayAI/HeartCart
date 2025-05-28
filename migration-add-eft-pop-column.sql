-- Add eftPop column to orders table to store proof of payment file path
ALTER TABLE orders ADD COLUMN "eftPop" TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN orders."eftPop" IS 'File path to the EFT proof of payment PDF document';