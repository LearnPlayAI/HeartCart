-- Migration to drop attribute discount rules table as part of the centralized attribute system
-- This will be applied in a future release after all the code has been updated

-- Drop the table
DROP TABLE IF EXISTS attribute_discount_rules;

-- Note: The relationships will be automatically removed when the table is dropped
-- No foreign key constraints need to be explicitly dropped