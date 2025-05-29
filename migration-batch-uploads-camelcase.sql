-- Migration: Convert batch_uploads table to camelCase naming
-- This migration renames the table and all columns to use camelCase convention

-- Step 1: Rename table
ALTER TABLE batch_uploads RENAME TO "batchUploads";

-- Step 2: Rename all columns to camelCase
ALTER TABLE "batchUploads" RENAME COLUMN catalog_id TO "catalogId";
ALTER TABLE "batchUploads" RENAME COLUMN user_id TO "userId";
ALTER TABLE "batchUploads" RENAME COLUMN total_records TO "totalRecords";
ALTER TABLE "batchUploads" RENAME COLUMN processed_records TO "processedRecords";
ALTER TABLE "batchUploads" RENAME COLUMN success_count TO "successCount";
ALTER TABLE "batchUploads" RENAME COLUMN error_count TO "errorCount";
ALTER TABLE "batchUploads" RENAME COLUMN file_original_name TO "fileOriginalName";
ALTER TABLE "batchUploads" RENAME COLUMN file_name TO "fileName";
ALTER TABLE "batchUploads" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "batchUploads" RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE "batchUploads" RENAME COLUMN completed_at TO "completedAt";
ALTER TABLE "batchUploads" RENAME COLUMN last_processed_row TO "lastProcessedRow";
ALTER TABLE "batchUploads" RENAME COLUMN processing_strategy TO "processingStrategy";
ALTER TABLE "batchUploads" RENAME COLUMN retry_count TO "retryCount";
ALTER TABLE "batchUploads" RENAME COLUMN max_retries TO "maxRetries";
ALTER TABLE "batchUploads" RENAME COLUMN catalog_capacity TO "catalogCapacity";
ALTER TABLE "batchUploads" RENAME COLUMN catalog_current_count TO "catalogCurrentCount";
ALTER TABLE "batchUploads" RENAME COLUMN canceled_at TO "canceledAt";
ALTER TABLE "batchUploads" RENAME COLUMN paused_at TO "pausedAt";
ALTER TABLE "batchUploads" RENAME COLUMN resumed_at TO "resumedAt";
ALTER TABLE "batchUploads" RENAME COLUMN failed_at TO "failedAt";
ALTER TABLE "batchUploads" RENAME COLUMN started_at TO "startedAt";

-- Step 3: Update foreign key constraints
ALTER TABLE "batchUploads" DROP CONSTRAINT IF EXISTS batch_uploads_catalog_id_fkey;
ALTER TABLE "batchUploads" ADD CONSTRAINT "batchUploads_catalogId_fkey" 
  FOREIGN KEY ("catalogId") REFERENCES catalogs(id) ON DELETE SET NULL;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_batch_uploads_status;
DROP INDEX IF EXISTS idx_batch_uploads_catalog_id;
DROP INDEX IF EXISTS idx_batch_uploads_user_id;

CREATE INDEX "idx_batchUploads_status" ON "batchUploads"(status);
CREATE INDEX "idx_batchUploads_catalogId" ON "batchUploads"("catalogId");
CREATE INDEX "idx_batchUploads_userId" ON "batchUploads"("userId");

-- Step 5: Update the foreign key constraint in batchUploadErrors table
ALTER TABLE "batchUploadErrors" DROP CONSTRAINT IF EXISTS "batchUploadErrors_batchUploadId_fkey";
ALTER TABLE "batchUploadErrors" ADD CONSTRAINT "batchUploadErrors_batchUploadId_fkey" 
  FOREIGN KEY ("batchUploadId") REFERENCES "batchUploads"(id) ON DELETE CASCADE;

-- Verification query
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'batchUploads' 
ORDER BY ordinal_position;