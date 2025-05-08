-- Create batch_uploads table
CREATE TABLE IF NOT EXISTS batch_uploads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  catalog_id INTEGER REFERENCES catalogs(id) ON DELETE SET NULL,
  user_id INTEGER,
  total_records INTEGER,
  processed_records INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  warnings JSONB,
  file_original_name VARCHAR(255),
  file_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create batch_upload_errors table
CREATE TABLE IF NOT EXISTS batch_upload_errors (
  id SERIAL PRIMARY KEY,
  batch_upload_id INTEGER REFERENCES batch_uploads(id) ON DELETE CASCADE,
  row INTEGER,
  field VARCHAR(255),
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_uploads_status ON batch_uploads(status);
CREATE INDEX IF NOT EXISTS idx_batch_uploads_catalog_id ON batch_uploads(catalog_id);
CREATE INDEX IF NOT EXISTS idx_batch_uploads_user_id ON batch_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_upload_errors_batch_upload_id ON batch_upload_errors(batch_upload_id);