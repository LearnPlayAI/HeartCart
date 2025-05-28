-- Migration: Convert users table columns from snake_case to camelCase
-- This aligns the users table with our camelCase naming convention used throughout the application

-- Rename columns to camelCase
ALTER TABLE users RENAME COLUMN full_name TO "fullName";
ALTER TABLE users RENAME COLUMN phone_number TO "phoneNumber";
ALTER TABLE users RENAME COLUMN postal_code TO "postalCode";
ALTER TABLE users RENAME COLUMN profile_picture TO "profilePicture";
ALTER TABLE users RENAME COLUMN is_active TO "isActive";
ALTER TABLE users RENAME COLUMN created_at TO "createdAt";
ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt";

-- Note: email, username, password, role, address, city, country remain unchanged as they are already properly named