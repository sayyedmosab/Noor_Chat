import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create Supabase server client for Auth Database (Server Components & API Routes)
export function createSupabaseServer() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.SUPABASE_AUTH_URL!,
    process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Create Supabase server client for Query Database (for data analysis)
export function createQuerySupabaseServer() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.SUPABASE_QUERY_URL!,
    process.env.SUPABASE_QUERY_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore cookie setting
          }
        },
      },
    }
  )
}