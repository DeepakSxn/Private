-- Create a function to add columns dynamically
create or replace function add_column(
  table_name text,
  column_name text,
  column_type text
)
returns void
language plpgsql
security definer
as $$
begin
  execute format(
    'ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I %s',
    table_name,
    column_name,
    column_type
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function add_column(text, text, text) to authenticated; 