-- Migration: Convert batch_upload_errors table to camelCase naming
-- This migration renames the table and columns to use camelCase convention

-- Step 1: Rename table
ALTER TABLE batch_upload_errors RENAME TO "batchUploadErrors";

-- Step 2: Rename columns
ALTER TABLE "batchUploadErrors" RENAME COLUMN batch_upload_id TO "batchUploadId";
ALTER TABLE "batchUploadErrors" RENAME COLUMN created_at TO "createdAt";

-- Step 3: Update foreign key constraint name for consistency
-- Drop old constraint
ALTER TABLE "batchUploadErrors" DROP CONSTRAINT IF EXISTS batch_upload_errors_batch_upload_id_fkey;

-- Add new constraint with camelCase naming (referencing batchUploads table which will be renamed later)
-- Note: This will need to be updated after batchUploads table is also converted
ALTER TABLE "batchUploadErrors" ADD CONSTRAINT "batchUploadErrors_batchUploadId_fkey" 
  FOREIGN KEY ("batchUploadId") REFERENCES batch_uploads(id) ON DELETE CASCADE;

-- Step 4: Update index names
DROP INDEX IF EXISTS idx_batch_upload_errors_batch_upload_id;
CREATE INDEX "idx_batchUploadErrors_batchUploadId" ON "batchUploadErrors"("batchUploadId");

-- Verification query
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'batchUploadErrors' 
ORDER BY ordinal_position;