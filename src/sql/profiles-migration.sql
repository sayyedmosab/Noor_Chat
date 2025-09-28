-- Migration: Update existing profiles table to match expected schema
-- Run this in Supabase Dashboard → SQL Editor

-- 1) Add missing username column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2) Remove email column (it should be in auth.users, not profiles)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS email;

-- 3) Add avatar_url column if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4) First, drop ALL policies that might reference the profiles.role column
-- This includes policies on OTHER tables that reference profiles.role via JOINs

-- Drop policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Drop policies on OTHER tables that might reference profiles.role
DROP POLICY IF EXISTS "Analysts can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Role based access to customers" ON public.customers;
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;

-- Drop any other table policies that might reference profiles.role
-- (Add more as needed based on your schema)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Find and drop all policies that might reference profiles.role
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE definition LIKE '%profiles%role%' 
           OR definition LIKE '%auth.uid()%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- 5) Remove existing constraints that might reference the role column
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 6) Now safely update data types and constraints
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE TEXT,
ALTER COLUMN role SET DEFAULT 'analyst';

-- Add constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('analyst', 'admin'));

-- 7) Generate usernames for existing users without them
UPDATE public.profiles 
SET username = CONCAT(
    LOWER(REPLACE(full_name, ' ', '_')), 
    '_', 
    SUBSTR(id::TEXT, 1, 8)
)
WHERE username IS NULL;

-- 8) Ensure Row Level Security is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 9) Create new policies (after column alterations are complete)

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

-- Recreate customers table policies (if customers table exists)
-- These policies were dropped earlier because they referenced profiles.role
DO $$
BEGIN
    -- Check if customers table exists before creating policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        
        -- Enable RLS on customers table
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
        
        -- Analysts can view customers (read-only access)
        CREATE POLICY "Analysts can view customers" ON public.customers
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('analyst', 'admin')
            )
          );
        
        -- Admins can manage customers (full access)
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

-- 10) Create or replace trigger function
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

-- 11) Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 12) Create updated_at trigger if not exists
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

-- 13) Add indexes for performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Done! Profiles table is now updated to match the expected schema