# PostgreSQL Row Level Security (RLS) Best Practices

## Official PostgreSQL RLS Documentation Summary

### Enabling/Disabling RLS

```sql
-- Enable RLS on table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Disable RLS on table  
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;

-- Check RLS status
SELECT 
    schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE schemaname = 'public';
```

### Policy Types and Syntax

#### Basic Policy Structure
```sql
CREATE POLICY policy_name ON table_name
    [ AS { PERMISSIVE | RESTRICTIVE } ]
    [ FOR { ALL | SELECT | INSERT | UPDATE | DELETE } ]
    [ TO { role_name | PUBLIC | CURRENT_USER | SESSION_USER } [, ...] ]
    [ USING ( using_expression ) ]
    [ WITH CHECK ( check_expression ) ]
```

#### Policy Examples
```sql
-- User can only see their own records
CREATE POLICY "users_own_records" ON users
    FOR ALL 
    USING (user_id = current_user_id());

-- Role-based access with profiles table
CREATE POLICY "analyst_read_access" ON customers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('analyst', 'admin')
        )
    );

-- Admin full access
CREATE POLICY "admin_full_access" ON customers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
```

### Policy Management

#### Viewing Existing Policies
```sql
-- View all policies
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,  -- 'PERMISSIVE' or 'RESTRICTIVE'
    roles,       -- Array of role names
    cmd,         -- 'ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'  
    qual,        -- USING expression
    with_check   -- WITH CHECK expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Generate CREATE POLICY statements for backup/recreation
SELECT
    'CREATE POLICY ' || quote_ident(policyname) || ' ON ' || 
    quote_ident(schemaname) || '.' || quote_ident(tablename) ||
    CASE 
        WHEN cmd = 'ALL' THEN ' FOR ALL'
        WHEN cmd = 'SELECT' THEN ' FOR SELECT'  
        WHEN cmd = 'INSERT' THEN ' FOR INSERT'
        WHEN cmd = 'UPDATE' THEN ' FOR UPDATE'
        WHEN cmd = 'DELETE' THEN ' FOR DELETE'
        ELSE ''
    END ||
    CASE WHEN roles IS NOT NULL AND roles != '{public}' 
         THEN ' TO ' || array_to_string(roles, ', ') 
         ELSE '' 
    END ||
    CASE WHEN qual IS NOT NULL 
         THEN ' USING (' || qual || ')' 
         ELSE '' 
    END ||
    CASE WHEN with_check IS NOT NULL 
         THEN ' WITH CHECK (' || with_check || ')' 
         ELSE '' 
    END || ';' AS create_statement
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'your_table';
```

#### Modifying Policies
```sql
-- Drop policy
DROP POLICY [ IF EXISTS ] policy_name ON table_name [ CASCADE | RESTRICT ];

-- Rename policy  
ALTER POLICY policy_name ON table_name RENAME TO new_name;

-- No direct ALTER POLICY for conditions - must DROP and CREATE
```

## Migration Best Practices for RLS

### When Altering Tables with RLS Policies

#### Problem: Column Type Changes
- **Error**: "cannot alter type of a column used in a policy definition"
- **Cause**: RLS policies create dependencies on column definitions
- **Solution**: Follow capture → drop → alter → recreate pattern

#### Standard Migration Pattern
```sql
-- 1. Capture existing policies
CREATE TEMP TABLE policy_backup AS
SELECT 
    schemaname, tablename, policyname,
    -- ... generate CREATE statements
FROM pg_policies 
WHERE definition REFERENCES target_column;

-- 2. Drop all policies that reference the column
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT schemaname, tablename, policyname FROM policy_backup LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', 
                      rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;
END $$;

-- 3. Alter the column
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type USING expression;

-- 4. Recreate policies from backup
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT create_statement FROM policy_backup LOOP
        EXECUTE rec.create_statement;
    END LOOP;
END $$;

-- 5. Clean up
DROP TABLE policy_backup;
```

### Cross-Table Policy Dependencies

#### Common Pattern: User Profiles + Data Tables
```sql
-- Profiles table (auth data)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    -- ... other columns
);

-- Data table with role-based access
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    -- ... other columns
);

-- Policies that reference profiles.role
CREATE POLICY "role_based_read" ON customers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin')
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'user')
    );
```

#### Migration Considerations
- Policies on **any table** that reference `profiles.role` will block alterations
- Must identify and handle **all cross-table dependencies**
- Use systematic approach to find all affected policies

### Policy Performance Optimization

#### Index Supporting Policies
```sql
-- For policies using auth.uid()
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- For role-based policies  
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_user_role ON profiles(user_id, role);

-- For tenant-based isolation
CREATE INDEX idx_data_tenant_id ON data_table(tenant_id);
```

#### Efficient Policy Expressions
```sql
-- Good: Simple equality check
USING (tenant_id = current_tenant_id())

-- Good: EXISTS with indexed columns
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))

-- Avoid: Complex subqueries without indexes
USING (id IN (SELECT data_id FROM complex_view WHERE ...))

-- Avoid: Function calls in policies (unless immutable)
USING (created_at > expensive_function())
```

## Supabase-Specific RLS Patterns

### Auth Integration
```sql
-- Standard Supabase auth pattern
USING (auth.uid() = user_id)

-- Role-based with profiles
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
```

### Common Supabase Policies

#### User Own Records
```sql
-- Users can only access their own records
CREATE POLICY "users_own" ON user_data
    FOR ALL USING (auth.uid() = user_id);
```

#### Role-Based Access
```sql
-- Analysts can read, admins can manage
CREATE POLICY "analysts_read" ON sensitive_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('analyst', 'admin')
        )
    );

CREATE POLICY "admins_manage" ON sensitive_data  
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
```

#### Tenant Isolation
```sql
-- Multi-tenant with organization isolation
CREATE POLICY "org_isolation" ON tenant_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo
            JOIN profiles p ON p.id = uo.user_id  
            WHERE p.id = auth.uid() 
            AND uo.org_id = tenant_data.org_id
        )
    );
```

## Troubleshooting RLS Issues

### Common Problems

1. **No data visible after enabling RLS**
   - **Cause**: No permissive policies exist
   - **Solution**: Create appropriate SELECT policies

2. **Cannot insert/update data**  
   - **Cause**: Missing INSERT/UPDATE policies or WITH CHECK constraints
   - **Solution**: Add policies for INSERT/UPDATE operations

3. **Performance issues**
   - **Cause**: Policy expressions not using indexes  
   - **Solution**: Add indexes supporting policy conditions

4. **Migration failures with policies**
   - **Cause**: Policies reference columns being altered
   - **Solution**: Use capture → drop → alter → recreate pattern

### Debugging Policies

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- View policy conditions
SELECT tablename, policyname, qual, with_check FROM pg_policies;

-- Test policy effects (as different users)
SET ROLE test_user;
SELECT * FROM protected_table; -- See what this user can access
RESET ROLE;
```

### Policy Testing

```sql
-- Create test users for policy validation
INSERT INTO auth.users (id, email) VALUES 
    ('test-admin-id', 'admin@test.com'),
    ('test-user-id', 'user@test.com');

INSERT INTO profiles (id, role) VALUES
    ('test-admin-id', 'admin'),  
    ('test-user-id', 'user');

-- Test as different users (in application or via auth context)
```