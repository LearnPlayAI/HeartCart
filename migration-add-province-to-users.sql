-- Migration: Add province column to users table
-- This adds the province field to the users table to store user's province selection

-- Add province column to users table
ALTER TABLE users ADD COLUMN province TEXT;

-- Update existing records to have a default province (optional)
-- You can remove this line if you want existing users to have NULL province
UPDATE users SET province = 'Gauteng' WHERE province IS NULL;