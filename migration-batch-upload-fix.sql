-- Add missing columns to batch_uploads table
ALTER TABLE batch_uploads 
ADD COLUMN IF NOT EXISTS last_processed_row INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_strategy VARCHAR(50) DEFAULT 'sequential',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS catalog_capacity INTEGER,
ADD COLUMN IF NOT EXISTS catalog_current_count INTEGER,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;

-- Correct data type for batch_upload_errors.row_number to align with interface
ALTER TABLE batch_upload_errors
RENAME COLUMN row_number TO row;