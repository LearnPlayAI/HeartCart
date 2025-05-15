-- Migration: Change session.expire back to timestamp with time zone
-- Description: Fix the session table to work with connect-pg-simple as an exception to our text-based date standardization

-- Update the expire column type back to timestamp with time zone
ALTER TABLE session ALTER COLUMN expire TYPE timestamp with time zone USING expire::timestamp with time zone;