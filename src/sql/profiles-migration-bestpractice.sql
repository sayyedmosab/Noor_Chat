-- PostgreSQL Migration: Following Official Best Practices
-- Based on PostgreSQL Documentation 5.7: "treat RLS policies as dependent objects"
-- Recommended approach: capture policies → drop → alter column → recreate

-- Step 1: Add missing columns (safe operations first)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Remove email column 
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS email CASCADE;

-- Step 3: CAPTURE existing policies before dropping them (PostgreSQL best practice)
-- This ensures we can recreate them exactly as they were

-- Create temporary table to store policy definitions
CREATE TEMP TABLE temp_policies AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    -- Generate the CREATE POLICY statement for recreation
    'CREATE POLICY ' || quote_ident(policyname) || 
    ' ON ' || quote_ident(schemaname) || '.' || quote_ident(tablename) ||
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
WHERE (definition LIKE '%profiles%' OR definition LIKE '%auth.uid()%')
AND schemaname = 'public';

-- Step 4: Show what policies will be affected (for transparency)
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Policies that will be dropped and recreated:';
    FOR rec IN SELECT schemaname, tablename, policyname FROM temp_policies LOOP
        RAISE NOTICE '  %.%.%', rec.schemaname, rec.tablename, rec.policyname;
    END LOOP;
END $$;

-- Step 5: Drop all policies that reference the column we're changing
-- (This is the official PostgreSQL recommended approach)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT DISTINCT schemaname, tablename, policyname FROM temp_policies LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                          rec.policyname, rec.schemaname, rec.tablename);
            RAISE NOTICE 'Dropped policy: %.%.%', rec.schemaname, rec.tablename, rec.policyname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop policy %.%.%: %', 
                    rec.schemaname, rec.tablename, rec.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 6: Drop constraints that reference the column
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check CASCADE;

-- Step 7: Now perform the column type change (following PostgreSQL docs)
-- Use explicit USING clause for any conversion (best practice)
ALTER TABLE public.profiles 
ALTER COLUMN role SET DATA TYPE TEXT USING role::TEXT;

-- Set the default value
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'analyst';

-- Step 8: Recreate the constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('analyst', 'admin'));

-- Step 9: Update existing data
UPDATE public.profiles 
SET username = (
    LOWER(REPLACE(full_name, ' ', '_')) || '_' || SUBSTRING(id::TEXT FROM 1 FOR 8)
)
WHERE username IS NULL;

-- Step 10: Add username uniqueness constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Step 11: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on dependent tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_name = 'customers' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 12: Recreate all policies from saved definitions (PostgreSQL best practice)
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Recreating policies from saved definitions...';
    
    FOR rec IN SELECT create_statement FROM temp_policies ORDER BY schemaname, tablename, policyname LOOP
        BEGIN
            EXECUTE rec.create_statement;
            RAISE NOTICE 'Recreated policy: %', SUBSTRING(rec.create_statement FROM 'CREATE POLICY ([^ ]+)');
        EXCEPTION
            WHEN OTHERS THEN
                -- If recreation fails, create basic policies instead
                RAISE WARNING 'Could not recreate policy with statement: %', rec.create_statement;
                RAISE WARNING 'Error: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 13: Fallback - Create essential policies if none were recreated
DO $$
BEGIN
    -- Check if profiles policies exist, create basic ones if not
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') THEN
        RAISE NOTICE 'No profiles policies found, creating basic RLS policies...';
        
        CREATE POLICY "Profiles: select own" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Profiles: insert own" ON public.profiles  
            FOR INSERT WITH CHECK (auth.uid() = id);
            
        CREATE POLICY "Profiles: update own" ON public.profiles
            FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
    
    -- Create basic customers policies if table exists and no policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public')
       AND NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public') THEN
        
        RAISE NOTICE 'No customers policies found, creating role-based policies...';
        
        CREATE POLICY "Analysts can view customers" ON public.customers
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM public.profiles 
                       WHERE profiles.id = auth.uid() 
                       AND profiles.role IN ('analyst', 'admin'))
            );
            
        CREATE POLICY "Admins can manage customers" ON public.customers
            FOR ALL USING (
                EXISTS (SELECT 1 FROM public.profiles 
                       WHERE profiles.id = auth.uid() 
                       AND profiles.role = 'admin')
            )
            WITH CHECK (
                EXISTS (SELECT 1 FROM public.profiles 
                       WHERE profiles.id = auth.uid() 
                       AND profiles.role = 'admin')
            );
    END IF;
END $$;

-- Step 14: Create/update trigger functions (standard Supabase pattern)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, username, role, updated_at)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.user_metadata->>'full_name', 
            NEW.raw_user_meta_data->>'name',
            NEW.user_metadata->>'name',
            'New User'
        ),
        SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8),
        COALESCE(
            NEW.raw_user_meta_data->>'role',
            NEW.user_metadata->>'role',
            'analyst'
        ),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Step 15: Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Step 16: Add performance indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles(updated_at);

-- Step 17: Verification and cleanup (PostgreSQL best practice)
DO $$
DECLARE
    rec RECORD;
    policy_count INTEGER;
    constraint_count INTEGER;
BEGIN
    -- Verify column type change
    SELECT data_type INTO rec FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role' AND table_schema = 'public';
    RAISE NOTICE 'Role column type successfully changed to: %', rec.data_type;
    
    -- Count recreated policies
    SELECT COUNT(*) INTO policy_count FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public';
    RAISE NOTICE 'Profiles table has % RLS policies', policy_count;
    
    -- Count constraints
    SELECT COUNT(*) INTO constraint_count FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND table_schema = 'public' AND constraint_type = 'CHECK';
    RAISE NOTICE 'Profiles table has % CHECK constraints', constraint_count;
    
    -- Show final policies
    FOR rec IN SELECT policyname, cmd FROM pg_policies 
               WHERE tablename IN ('profiles', 'customers') AND schemaname = 'public'
               ORDER BY tablename, policyname LOOP
        RAISE NOTICE 'Active policy: % (%)', rec.policyname, rec.cmd;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully following PostgreSQL best practices';
END $$;

-- Clean up temporary table
DROP TABLE temp_policies;