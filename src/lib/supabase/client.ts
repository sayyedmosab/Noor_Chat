import { createBrowserClient } from '@supabase/ssr'

// Create Supabase client for browser (Client Components)
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
  )
}

// Create Query Supabase client for browser (read-only analysis)
export function createQuerySupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_QUERY_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_QUERY_ANON_KEY!
  )
}