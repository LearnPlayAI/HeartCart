-- Credit System Migration Script
-- Adds missing credit system fields to orders table and creates notification table

-- Add credit system fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "creditUsed" DECIMAL(10,2) DEFAULT 0 NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "remainingBalance" DECIMAL(10,2);

-- Create notifications table for credit system
CREATE TABLE IF NOT EXISTS "notifications" (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    metadata TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (NOW()::text)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications("createdAt");

-- Update product table to ensure credit system fields exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS "supplierAvailable" BOOLEAN DEFAULT true NOT NULL;

-- Ensure customer credits table has unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_credits_user_id ON "customerCredits"("userId");

-- Add indexes for credit transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON "creditTransactions"("userId");
CREATE INDEX IF NOT EXISTS idx_credit_transactions_order_id ON "creditTransactions"("orderId");
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON "creditTransactions"("transactionType");

-- Add indexes for supplier status tracking
CREATE INDEX IF NOT EXISTS idx_supplier_status_order_item ON "orderItemSupplierStatus"("orderItemId");
CREATE INDEX IF NOT EXISTS idx_supplier_status_order ON "orderItemSupplierStatus"("orderId");
CREATE INDEX IF NOT EXISTS idx_supplier_status_product ON "orderItemSupplierStatus"("productId");
CREATE INDEX IF NOT EXISTS idx_supplier_status_status ON "orderItemSupplierStatus"("supplierStatus");

-- Insert default credit records for existing users if they don't exist
INSERT INTO "customerCredits" ("userId", "totalCreditAmount", "availableCreditAmount", "createdAt", "updatedAt")
SELECT 
    id,
    0,
    0,
    NOW()::text,
    NOW()::text
FROM users 
WHERE id NOT IN (SELECT "userId" FROM "customerCredits");

-- Update orders table to set default credit values for existing orders
UPDATE orders 
SET "creditUsed" = 0 
WHERE "creditUsed" IS NULL;