-- PostgreSQL Migration: SIMPLE drop → alter → recreate approach
-- This follows the exact sequence without any complexity

-- Step 1: Add safe columns first
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Remove email column
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS email CASCADE;

-- Step 3: DROP ALL POLICIES FIRST (no capture, just drop everything)
-- This is the critical step that must happen before ALTER

-- Drop policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Drop policies on ALL other tables that might reference profiles.role
DROP POLICY IF EXISTS "Analysts can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Role based access to customers" ON public.customers;
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;

-- Drop any other policies that might exist (add more as needed)
-- The key is: DROP FIRST, ask questions later

-- Step 4: Drop constraints that reference the column
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check CASCADE;

-- Step 5: NOW alter the column (should work because no policies reference it)
ALTER TABLE public.profiles 
ALTER COLUMN role SET DATA TYPE TEXT USING role::TEXT;

ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'analyst';

-- Step 6: Add constraint back
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('analyst', 'admin'));

-- Step 7: Update data
UPDATE public.profiles 
SET username = LOWER(REPLACE(full_name, ' ', '_')) || '_' || SUBSTRING(id::TEXT FROM 1 FOR 8)
WHERE username IS NULL;

-- Step 8: Add username constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Step 9: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on other tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 10: RECREATE policies (hardcoded, simple, no complexity)
-- Basic profiles policies
CREATE POLICY "Profiles: select own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles: insert own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: update own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Basic customers policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        
        CREATE POLICY "Analysts can view customers" ON public.customers
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('analyst', 'admin')
                )
            );
        
        CREATE POLICY "Admins can manage customers" ON public.customers
            FOR ALL USING (
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

-- Step 11: Create trigger functions
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
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
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

-- Step 12: Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 13: Add indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Done - simple, direct, no complexity, follows drop → alter → recreate exactly