-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    openai_thread_id TEXT
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies for threads table
CREATE POLICY "Allow authenticated users to read threads"
ON threads FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert threads"
ON threads FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update threads"
ON threads FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete threads"
ON threads FOR DELETE
TO authenticated
USING (true);

-- Create policies for messages table
CREATE POLICY "Allow authenticated users to read messages"
ON messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update messages"
ON messages FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete messages"
ON messages FOR DELETE
TO authenticated
USING (true);

-- Create policies for files table
CREATE POLICY "Allow authenticated users to read files"
ON files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert files"
ON files FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update files"
ON files FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete files"
ON files FOR DELETE
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_files_thread_id ON files(thread_id);

-- Create the add_column function from migration
CREATE OR REPLACE FUNCTION add_column(
  table_name text,
  column_name text,
  column_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I %s',
    table_name,
    column_name,
    column_type
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_column(text, text, text) TO authenticated;