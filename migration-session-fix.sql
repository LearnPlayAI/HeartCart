-- Fix session table handling with text instead of timestamp
-- Convert expire column to timestamp for compatibility with connect-pg-simple
ALTER TABLE session 
ADD COLUMN expire_timestamp TIMESTAMP WITH TIME ZONE;

-- Update the expire_timestamp column with values converted from text
UPDATE session 
SET expire_timestamp = expire::TIMESTAMP WITH TIME ZONE
WHERE expire IS NOT NULL;

-- Create a function to automatically update expire_timestamp when expire is updated
CREATE OR REPLACE FUNCTION update_expire_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expire_timestamp := NEW.expire::TIMESTAMP WITH TIME ZONE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep expire_timestamp in sync with expire
CREATE TRIGGER session_expire_update
BEFORE INSERT OR UPDATE ON session
FOR EACH ROW
EXECUTE FUNCTION update_expire_timestamp();

-- Create an index on expire_timestamp for faster pruning
CREATE INDEX IF NOT EXISTS session_expire_timestamp_idx ON session (expire_timestamp);