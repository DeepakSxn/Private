-- Add openai_thread_id column to threads table
ALTER TABLE threads 
ADD COLUMN IF NOT EXISTS openai_thread_id text;

-- Update RLS policies to allow access to the new column
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read threads
CREATE POLICY "Allow authenticated users to read threads"
ON threads FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to insert threads
CREATE POLICY "Allow authenticated users to insert threads"
ON threads FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to update threads
CREATE POLICY "Allow authenticated users to update threads"
ON threads FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true); 