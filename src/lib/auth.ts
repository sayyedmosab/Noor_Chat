import { createSupabaseServer } from './supabase/server'
import { redirect } from 'next/navigation'

export interface AppUser {
  id: string
  email: string
  full_name: string
  username: string
  role: 'analyst' | 'admin'
  avatar_url?: string
}

export interface Profile {
  id: string
  full_name: string
  username: string
  role: 'analyst' | 'admin'
  avatar_url?: string
  updated_at: string
}

// Get current user (Server Components & API Routes)
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
const supabase = await createSupabaseServer()
    
    // Get current session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return null
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.log('Profile not found for user:', user.id, profileError.message)
      return null
    }
    
    return {
      id: user.id,
      email: user.email || '',
      full_name: profile.full_name || 'Unknown User',
      username: profile.username || '',
      role: profile.role || 'analyst',
      avatar_url: profile.avatar_url
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Require authentication (redirect if not authenticated)
export async function requireAuth(): Promise<AppUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return user
}

// Check if user has admin role
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireAuth()
  
  if (user.role !== 'admin') {
    redirect('/unauthorized')
  }
  
  return user
}

// Register new user
export async function registerUser(email: string, password: string, fullName: string, role: 'analyst' | 'admin' = 'analyst') {
  const supabase = await createSupabaseServer()
  
  try {
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: process.env.NODE_ENV === 'development', // Auto-confirm in dev
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })
    
    if (authError) {
      throw authError
    }
    
    const user = authData.user
    if (!user) {
      throw new Error('User creation failed')
    }
    
    // The profile will be created automatically by the trigger
    // Wait a moment and then fetch it
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.warn('Profile creation may have failed:', profileError.message)
      // Try to create manually as fallback
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            full_name: fullName,
            username: email.split('@')[0] + '_' + user.id.substring(0, 8),
            role: role
          }
        ])
      
      if (insertError) {
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(user.id)
        throw insertError
      }
    }
    
    return {
      user: {
        id: user.id,
        email: user.email || '',
        full_name: fullName,
        username: profile?.username || email.split('@')[0],
        role: role,
        avatar_url: profile?.avatar_url
      },
      profile
    }
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

// Sign in user
export async function signInUser(email: string, password: string) {
  const supabase = await createSupabaseServer()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

// Sign out user
export async function signOutUser() {
  const supabase = await createSupabaseServer()
  
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}
