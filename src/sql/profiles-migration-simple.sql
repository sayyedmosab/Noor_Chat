-- ALTERNATIVE MIGRATION: Simpler approach - temporarily disable RLS
-- This is safer if you have complex cross-table policy dependencies
-- Run this in Supabase Dashboard → SQL Editor

-- 1) Add missing columns first (these don't conflict with policies)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2) Remove email column (it should be in auth.users, not profiles)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS email;

-- 3) TEMPORARILY DISABLE RLS on all tables to avoid policy conflicts
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- If you have other tables with policies referencing profiles.role, disable RLS on them too
DO $$
BEGIN
    -- Disable RLS on customers table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Add more tables here as needed
    -- IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    --     ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
    -- END IF;
END $$;

-- 4) Now safely alter the role column
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE TEXT,
ALTER COLUMN role SET DEFAULT 'analyst';

-- 5) Add/update constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('analyst', 'admin'));

-- 6) Generate usernames for existing users without them
UPDATE public.profiles 
SET username = CONCAT(
    LOWER(REPLACE(full_name, ' ', '_')), 
    '_', 
    SUBSTR(id::TEXT, 1, 8)
)
WHERE username IS NULL;

-- 7) RE-ENABLE RLS and recreate policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;

-- Create new policies for profiles
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

-- 8) Re-enable RLS and recreate policies for other tables
DO $$
BEGIN
    -- Re-enable customers table RLS and policies if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
        
        -- Clean up existing policies
        DROP POLICY IF EXISTS "Analysts can view customers" ON public.customers;
        DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
        DROP POLICY IF EXISTS "Role based access to customers" ON public.customers;
        
        -- Recreate policies
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

-- 9) Create or replace trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, role, updated_at)
  VALUES (
    NEW.id,
    -- Handle metadata from different sources
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.user_metadata->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      NEW.user_metadata->>'name',
      'New User'
    ),
    -- Generate unique username from email
    CONCAT(
      SPLIT_PART(NEW.email, '@', 1), 
      '_', 
      SUBSTR(NEW.id::TEXT, 1, 8)
    ),
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

-- 10) Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 11) Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 12) Add indexes for performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Done! Migration completed successfully
-- RLS is now re-enabled with proper policies