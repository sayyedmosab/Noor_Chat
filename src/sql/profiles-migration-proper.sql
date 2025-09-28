-- PostgreSQL Migration: Proper handling of column type changes with policy dependencies
-- Step-by-step approach to handle "cannot alter type of a column used in a policy definition"

-- Step 1: Add missing columns first (safe operations that don't conflict)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Remove email column (should be in auth.users only)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS email CASCADE;

-- Step 3: CRITICAL - Drop ALL policies that reference profiles.role column
-- This must be done BEFORE attempting to alter the column type

-- First, find and drop all policies on ALL tables that might reference profiles.role
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies that reference profiles table or auth.uid() 
    -- (these likely reference profiles.role in their conditions)
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE definition LIKE '%profiles%' 
           OR definition LIKE '%auth.uid()%'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                          policy_record.policyname, 
                          policy_record.schemaname, 
                          policy_record.tablename);
            RAISE NOTICE 'Dropped policy: %.%.%', 
                policy_record.schemaname, policy_record.tablename, policy_record.policyname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to drop policy %.%.%: %', 
                    policy_record.schemaname, policy_record.tablename, policy_record.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 4: Explicitly drop known policies (belt and suspenders approach)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Drop policies on other tables that reference profiles
DROP POLICY IF EXISTS "Analysts can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Role based access to customers" ON public.customers;
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;

-- Step 5: Drop constraints that reference the role column
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check CASCADE;

-- Step 6: NOW we can safely alter the column type (no policies reference it)
ALTER TABLE public.profiles 
ALTER COLUMN role SET DATA TYPE TEXT;

ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'analyst';

-- Step 7: Add the constraint back
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('analyst', 'admin'));

-- Step 8: Generate usernames for existing users
UPDATE public.profiles 
SET username = (
    LOWER(REPLACE(full_name, ' ', '_')) || '_' || SUBSTRING(id::TEXT FROM 1 FOR 8)
)
WHERE username IS NULL;

-- Step 9: Add unique constraint to username
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Step 10: Ensure RLS is enabled on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on other tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 11: NOW recreate all the policies (after column type change is complete)

-- Profiles table policies
CREATE POLICY "Profiles: select own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Profiles: insert own" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: update own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Recreate policies for other tables that reference profiles.role
DO $$
BEGIN
    -- Recreate customers table policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        
        -- Analysts can view customers
        CREATE POLICY "Analysts can view customers" ON public.customers
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('analyst', 'admin')
                )
            );
        
        -- Admins can manage customers
        CREATE POLICY "Admins can manage customers" ON public.customers
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'admin'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'admin'
                )
            );
            
        RAISE NOTICE 'Recreated policies for customers table';
    END IF;
END $$;

-- Step 12: Create or replace trigger functions
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

-- Step 13: Recreate triggers
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

-- Step 14: Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles(updated_at);

-- Step 15: Final verification
DO $$
DECLARE
    rec RECORD;
    policy_count INTEGER;
BEGIN
    -- Check that the migration worked
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Profiles table has % RLS policies', policy_count;
    
    -- Show the policies that were recreated
    FOR rec IN 
        SELECT policyname, cmd 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  Policy: % (%)', rec.policyname, rec.cmd;
    END LOOP;
    
    -- Check role column
    SELECT data_type INTO rec 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role' AND table_schema = 'public';
    
    RAISE NOTICE 'Role column type: %', rec.data_type;
    
END $$;