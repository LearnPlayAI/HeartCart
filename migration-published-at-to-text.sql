-- Migration to convert published_at field in product_drafts table from timestamp to text
ALTER TABLE product_drafts 
ALTER COLUMN published_at TYPE TEXT USING published_at::TEXT;

-- Add comment explaining the change
COMMENT ON COLUMN product_drafts.published_at IS 'Publication date in SAST timezone format as text';