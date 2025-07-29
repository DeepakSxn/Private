-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read threads" ON threads;
DROP POLICY IF EXISTS "Allow authenticated users to insert threads" ON threads;
DROP POLICY IF EXISTS "Allow authenticated users to update threads" ON threads;
DROP POLICY IF EXISTS "Allow authenticated users to delete threads" ON threads;

DROP POLICY IF EXISTS "Allow authenticated users to read messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to update messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to delete messages" ON messages;

DROP POLICY IF EXISTS "Allow authenticated users to read files" ON files;
DROP POLICY IF EXISTS "Allow authenticated users to insert files" ON files;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON files;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON files;

-- Create new policies that allow anonymous access
CREATE POLICY "Allow all users to read threads"
ON threads FOR SELECT
USING (true);

CREATE POLICY "Allow all users to insert threads"
ON threads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all users to update threads"
ON threads FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all users to delete threads"
ON threads FOR DELETE
USING (true);

-- Messages policies
CREATE POLICY "Allow all users to read messages"
ON messages FOR SELECT
USING (true);

CREATE POLICY "Allow all users to insert messages"
ON messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all users to update messages"
ON messages FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all users to delete messages"
ON messages FOR DELETE
USING (true);

-- Files policies
CREATE POLICY "Allow all users to read files"
ON files FOR SELECT
USING (true);

CREATE POLICY "Allow all users to insert files"
ON files FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all users to update files"
ON files FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all users to delete files"
ON files FOR DELETE
USING (true);