-- Add missing timestamp fields to the batch_uploads table
ALTER TABLE batch_uploads 
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;