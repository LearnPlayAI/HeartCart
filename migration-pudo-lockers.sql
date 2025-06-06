-- Migration: Add PUDO Lockers table for shipping integration
-- This table stores PUDO locker information synced from the PUDO API

CREATE TABLE IF NOT EXISTS "pudoLockers" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "latitude" DECIMAL(10, 8) NOT NULL,
  "longitude" DECIMAL(11, 8) NOT NULL,
  "address" TEXT NOT NULL,
  "openingHours" JSONB,
  "lockerType" JSONB,
  "place" JSONB,
  "boxTypes" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "lastSynced" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_pudo_lockers_code" ON "pudoLockers" ("code");
CREATE INDEX IF NOT EXISTS "idx_pudo_lockers_location" ON "pudoLockers" ("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "idx_pudo_lockers_active" ON "pudoLockers" ("isActive");
CREATE INDEX IF NOT EXISTS "idx_pudo_lockers_last_synced" ON "pudoLockers" ("lastSynced");

-- Add a trigger to update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_pudo_lockers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_pudo_lockers_updated_at
  BEFORE UPDATE ON "pudoLockers"
  FOR EACH ROW
  EXECUTE FUNCTION update_pudo_lockers_updated_at();