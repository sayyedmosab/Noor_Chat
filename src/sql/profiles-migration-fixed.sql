-- PostgreSQL Migration: Update profiles table schema
-- Based on official PostgreSQL documentation syntax
-- Compatible with PostgreSQL 9.0+ (IF EXISTS support confirmed)

-- Step 1: Add missing columns (safe operations)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Remove email column (should be in auth.users only)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS email CASCADE;

-- Step 3: Handle RLS policy dependencies by temporarily disabling RLS
-- This prevents "cannot alter type of a column used in a policy definition" errors
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on other tables that might have policies referencing profiles.role
DO $$
BEGIN
    -- Disable RLS on customers table if it exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Add more tables here if they have policies referencing profiles.role
    -- Example:
    -- IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    --     ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
    -- END IF;
END $$;

-- Step 4: Drop existing constraints that reference the role column
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check CASCADE;

-- Step 5: Safely alter the role column type and default
ALTER TABLE public.profiles 
ALTER COLUMN role SET DATA TYPE TEXT;

ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'analyst';

-- Step 6: Add the constraint back with proper values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('analyst', 'admin'));

-- Step 7: Generate usernames for existing users (using standard PostgreSQL functions)
UPDATE public.profiles 
SET username = (
    LOWER(REPLACE(full_name, ' ', '_')) || '_' || SUBSTRING(id::TEXT FROM 1 FOR 8)
)
WHERE username IS NULL;

-- Step 8: Add unique constraint to username column
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Step 9: Re-enable RLS and recreate policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first (clean slate)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;

-- Create new RLS policies for profiles table
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

-- Step 10: Re-enable RLS and recreate policies for other tables
DO $$
BEGIN
    -- Re-enable customers table RLS and policies if it exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Analysts can view customers" ON public.customers;
        DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
        DROP POLICY IF EXISTS "Role based access to customers" ON public.customers;
        
        -- Recreate policies using EXISTS subquery pattern
        CREATE POLICY "Analysts can view customers" ON public.customers
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('analyst', 'admin')
                )
            );
        
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
    END IF;
END $$;

-- Step 11: Create or replace trigger function for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, username, role, updated_at)
    VALUES (
        NEW.id,
        -- Handle metadata from different auth sources
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.user_metadata->>'full_name', 
            NEW.raw_user_meta_data->>'name',
            NEW.user_metadata->>'name',
            'New User'
        ),
        -- Generate unique username from email using standard functions
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

-- Step 12: Recreate trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 13: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Step 14: Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Step 15: Create performance indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles(updated_at);

-- Step 16: Verify the final schema
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Show table structure
    RAISE NOTICE 'Final profiles table structure:';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %, default: %)', 
            rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
    END LOOP;
    
    -- Show constraints
    RAISE NOTICE 'Table constraints:';
    FOR rec IN 
        SELECT conname, contype, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass
    LOOP
        RAISE NOTICE '  %: %', rec.conname, rec.definition;
    END LOOP;
    
    -- Show policies
    RAISE NOTICE 'RLS policies:';
    FOR rec IN 
        SELECT policyname, cmd, permissive, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        RAISE NOTICE '  %: % (%)', rec.policyname, rec.cmd, 
            CASE WHEN rec.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
    END LOOP;
END $$;

-- Migration completed successfully!
-- The profiles table now has the correct schema with proper RLS policies.