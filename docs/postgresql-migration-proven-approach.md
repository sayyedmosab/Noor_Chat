# PostgreSQL Migration: Proven Working Approach

## The ONLY Approach That Works for Column Type Changes with RLS Dependencies

**Tested and Confirmed Working**: This is the exact script that successfully migrated the profiles table with RLS policy dependencies.

```sql
BEGIN;

-- 0) Drop profiles policies (plain DDL)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;

-- 2) Drop customers policies only if table exists (procedural)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    DROP POLICY IF EXISTS "Analysts can view customers" ON public.customers;
    DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
    DROP POLICY IF EXISTS "Role based access to customers" ON public.customers;
  END IF;
END;
$$;

-- 3) Temporarily disable RLS on profiles (and customers if present)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;

-- 4) Alter role column type/default and replace constraint
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE text,
  ALTER COLUMN role SET DEFAULT 'analyst';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('analyst', 'admin'));

-- 5) Add/drop columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 6) Regenerate usernames
UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(COALESCE(full_name, ''), '\s+', '', 'g')) || '' || SUBSTR(id::text, 1, 8)
WHERE username IS NULL;

-- 7) Re-enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8) Recreate profiles policies
CREATE POLICY "Profiles: select own" ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- 9) If customers exists, recreate its policies and re-enable RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN

    ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Analysts can view customers" ON public.customers
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = (SELECT auth.uid())::uuid
            AND public.profiles.role IN ('analyst','admin')
        )
      );

    CREATE POLICY "Admins can manage customers" ON public.customers
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = (SELECT auth.uid())::uuid
            AND public.profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = (SELECT auth.uid())::uuid
            AND public.profiles.role = 'admin'
        )
      );

  END IF;
END;
$$;

COMMIT;
```

## Key Success Factors

### 1. **Transaction Wrapper**
- `BEGIN;` ... `COMMIT;` ensures atomicity
- If any step fails, entire migration rolls back

### 2. **Explicit Policy Dropping**
- Drop ALL policies that might reference the column
- Use both direct DDL and conditional DO blocks for optional tables

### 3. **Disable RLS During Migration**
- `ALTER TABLE DISABLE ROW LEVEL SECURITY` removes policy enforcement
- Critical step that prevents policy conflicts during column alteration

### 4. **Combined ALTER TABLE Operations**
```sql
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE text,
  ALTER COLUMN role SET DEFAULT 'analyst';
```
- Multiple operations in single ALTER TABLE statement is more efficient

### 5. **Proper Supabase RLS Pattern**
```sql
-- Correct Supabase auth pattern
USING ((SELECT auth.uid()) = id)

-- Correct role-based pattern with explicit casting
WHERE public.profiles.id = (SELECT auth.uid())::uuid
```

### 6. **Conditional Table Operations**
- Use `information_schema.tables` to check table existence
- Wrap optional operations in DO blocks

## Critical Lessons Learned

### ❌ **What Doesn't Work**
- Trying to capture and restore policies automatically
- Complex policy discovery and recreation logic  
- Leaving RLS enabled during column alterations
- Assuming `auth.uid()` works without explicit SELECT

### ✅ **What Works**
- Manual, explicit policy dropping
- Disabling RLS completely during migration
- Simple, hardcoded policy recreation
- Transaction wrapping for safety
- Proper Supabase auth.uid() syntax with SELECT

## When to Use This Approach

**Use this exact pattern when:**
1. Altering column types that are referenced in RLS policies
2. Changing columns that have cross-table policy dependencies  
3. Migrating Supabase projects with established RLS policies
4. Any "cannot alter type of a column used in a policy definition" error

**Required Prerequisites:**
1. Know all tables that have policies referencing the column
2. Know the exact policy names and definitions you want to recreate
3. Have tested the policy recreation syntax
4. Can tolerate brief RLS disable during migration

## Template for Future Migrations

```sql
BEGIN;

-- 1. Drop all policies on target table
DROP POLICY IF EXISTS "policy_name_1" ON public.target_table;
DROP POLICY IF EXISTS "policy_name_2" ON public.target_table;

-- 2. Drop policies on dependent tables (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dependent_table') THEN
    DROP POLICY IF EXISTS "dependent_policy_1" ON public.dependent_table;
    DROP POLICY IF EXISTS "dependent_policy_2" ON public.dependent_table;
  END IF;
END $$;

-- 3. Disable RLS
ALTER TABLE public.target_table DISABLE ROW LEVEL SECURITY;
-- Repeat for dependent tables...

-- 4. Perform alterations
ALTER TABLE public.target_table
  ALTER COLUMN target_column TYPE new_type,
  DROP CONSTRAINT IF EXISTS old_constraint,
  ADD CONSTRAINT new_constraint CHECK (...);

-- 5. Re-enable RLS  
ALTER TABLE public.target_table ENABLE ROW LEVEL SECURITY;

-- 6. Recreate policies with exact syntax
CREATE POLICY "new_policy" ON public.target_table FOR SELECT USING ((SELECT auth.uid()) = id);

-- 7. Recreate dependent table policies (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dependent_table') THEN
    ALTER TABLE public.dependent_table ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "dependent_policy" ON public.dependent_table FOR SELECT USING (...);
  END IF;
END $$;

COMMIT;
```

**This is the definitive, tested approach for PostgreSQL RLS migrations.**