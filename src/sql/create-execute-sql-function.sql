-- Creates the execute_sql function and adds a test to verify it.
-- Run this script on your existing Query Database.

CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  results JSON[] := ARRAY[]::json[];
BEGIN
  -- Security check: only allow SELECT and WITH statements
  IF NOT (LOWER(TRIM(sql_query)) LIKE 'select%' OR LOWER(TRIM(sql_query)) LIKE 'with%') THEN
    RAISE EXCEPTION 'Only SELECT and WITH queries are allowed';
  END IF;

  -- Execute the query and collect results
  FOR rec IN EXECUTE sql_query LOOP
    results := array_append(results, row_to_json(rec)::json);
  END LOOP;

  -- Return as JSON array
  RETURN COALESCE(array_to_json(results), '[]'::json);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to the roles used by Supabase
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO anon;

-- Test the function by retrieving the public schema
SELECT execute_sql('SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name;');
