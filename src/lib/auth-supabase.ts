import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export interface SupabaseUser {
  id: string
  email: string
  name: string
  role: 'analyst' | 'admin'
  emailVerified: boolean
}

export interface Profile {
  id: string
  user_id: string
  name: string
  role: 'analyst' | 'admin'
  created_at: string
  updated_at: string
}

// Get Auth Supabase client (server-side)
export function getAuthSupabase() {
  const authUrl = process.env.SUPABASE_AUTH_URL
  const authKey = process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY
  
  if (!authUrl || !authKey) {
    throw new Error('Missing Supabase Auth credentials')
  }
  
  return createClient(authUrl, authKey, {
    auth: {
      persistSession: false,
    }
  })
}

// Get Auth Supabase client (client-side) 
export function getAuthSupabaseClient() {
  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL
  const authKey = process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY
  
  if (!authUrl || !authKey) {
    throw new Error('Missing public Supabase Auth credentials')
  }
  
  return createClient(authUrl, authKey)
}

// Get current user from Supabase session
export async function getCurrentUser(): Promise<SupabaseUser | null> {
  try {
    const supabase = getAuthSupabase()
    
    // Get session from cookies (server-side)
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    const refreshToken = cookieStore.get('sb-refresh-token')?.value
    
    if (!accessToken) {
      return null
    }
    
    // Set session
    const { data: { user }, error: userError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    })
    
    if (userError || !user) {
      console.log('No valid session found:', userError?.message)
      return null
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (profileError) {
      console.log('No profile found for user:', user.id)
      return null
    }
    
    return {
      id: user.id,
      email: user.email || '',
      name: profile.name,
      role: profile.role,
      emailVerified: user.email_confirmed_at !== null
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Register user with Supabase Auth
export async function registerUser(email: string, password: string, name: string, role: 'analyst' | 'admin' = 'analyst') {
  const supabase = getAuthSupabase()
  
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: process.env.NODE_ENV === 'development', // Auto-confirm in dev
    })
    
    if (authError) {
      throw authError
    }
    
    const user = authData.user
    if (!user) {
      throw new Error('User creation failed')
    }
    
    // Create profile record
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          user_id: user.id,
          name,
          role,
        }
      ])
      .select()
      .single()
    
    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(user.id)
      throw profileError
    }
    
    return {
      user: {
        id: user.id,
        email: user.email || '',
        name,
        role,
        emailVerified: user.email_confirmed_at !== null
      },
      profile
    }
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

// Authenticate user with Supabase Auth
export async function authenticateUser(email: string, password: string): Promise<{ user: SupabaseUser; session: any } | null> {
  const supabase = getAuthSupabase()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error || !data.user) {
      console.log('Authentication failed:', error?.message)
      return null
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single()
    
    if (profileError) {
      console.log('Profile not found for user:', data.user.id)
      return null
    }
    
    const user: SupabaseUser = {
      id: data.user.id,
      email: data.user.email || '',
      name: profile.name,
      role: profile.role,
      emailVerified: data.user.email_confirmed_at !== null
    }
    
    return {
      user,
      session: data.session
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

// Set auth cookies for session
export async function setAuthCookies(session: any) {
  const cookieStore = await cookies()
  
  const maxAge = 7 * 24 * 60 * 60 // 7 days
  const cookieOptions = {
    httpOnly: true,
    secure: false, // Allow over HTTP in development/sandbox
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
  
  cookieStore.set('sb-access-token', session.access_token, cookieOptions)
  cookieStore.set('sb-refresh-token', session.refresh_token, cookieOptions)
}

// Clear auth cookies
export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete('sb-access-token')
  cookieStore.delete('sb-refresh-token')
}

// Initialize profiles table schema
export async function initializeProfilesTable() {
  const supabase = getAuthSupabase()
  
  // Note: This SQL should be run in Supabase Dashboard
  const sql = `
    -- Create profiles table
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'analyst' CHECK (role IN ('analyst', 'admin')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Enable Row Level Security
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can update their own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = user_id);

    -- Create function to handle profile creation
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (user_id, name, role)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'New User'), 'analyst');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create trigger for automatic profile creation
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

    -- Create updated_at trigger
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER handle_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  `
  
  return {
    success: false,
    message: 'Profiles table needs to be created in Supabase Dashboard',
    sql
  }
}
