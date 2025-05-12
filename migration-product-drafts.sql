-- Migration for product_drafts table
-- Create the product_drafts table for auto-save functionality

CREATE TABLE IF NOT EXISTS product_drafts (
  id SERIAL PRIMARY KEY,
  draft_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  catalog_id INTEGER REFERENCES catalogs(id),
  step INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS product_drafts_user_id_idx ON product_drafts(user_id);
CREATE INDEX IF NOT EXISTS product_drafts_catalog_id_idx ON product_drafts(catalog_id);