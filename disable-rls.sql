-- Disable Row Level Security for development
ALTER TABLE threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;

-- Also disable RLS for storage objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;