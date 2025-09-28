import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Read the corrected profiles SQL
    const sqlPath = join(process.cwd(), 'src', 'sql', 'profiles.sql')
    const sql = await readFile(sqlPath, 'utf-8')
    
    return NextResponse.json({
      success: true,
      message: 'CORRECTED Profiles table SQL (2024/2025 best practices)',
      sql,
      instructions: [
        '1. Go to Supabase Dashboard → Auth Database → SQL Editor',
        '2. Copy and paste the SQL below',  
        '3. Click "RUN" to execute',
        '4. Test registration after creation'
      ],
      fixes: [
        'FIXED: Changed user_id to id (references auth.users(id))',
        'FIXED: Using @supabase/ssr for Next.js App Router',
        'FIXED: Proper RLS policies with auth.uid()',
        'FIXED: Auto-username generation to avoid conflicts',
        'FIXED: Compatibility with both raw_user_meta_data and user_metadata'
      ]
    })
  } catch (error) {
    console.error('Failed to read profiles SQL:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load profiles setup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    const supabase = createSupabaseServer()
    
    switch (action) {
      case 'test_profiles':
        // Test if profiles table exists and is properly configured
        const { data: profileTest, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, username, role')
          .limit(1)
        
        if (profileError) {
          return NextResponse.json({
            success: false,
            error: 'Profiles table test failed',
            details: profileError.message,
            needsSetup: profileError.code === '42P01' // relation does not exist
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Profiles table exists and is accessible',
          sampleCount: profileTest?.length || 0
        })
        
      case 'test_auth':
        // Test auth.users table access
        const { data: authTest, error: authError } = await supabase.auth.admin.listUsers()
        
        if (authError) {
          return NextResponse.json({
            success: false,
            error: 'Auth table test failed',
            details: authError.message
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Auth system is working',
          userCount: authTest.users?.length || 0
        })
        
      case 'test_trigger':
        // Test if the trigger is working by checking function exists
        // Note: This is a simplified check - in production you'd use proper function checking
        try {
          const { data: functionTest, error: functionError } = await supabase
            .from('information_schema.routines')
            .select('routine_name')
            .eq('routine_name', 'handle_new_user')
            .limit(1)
          
          return NextResponse.json({
            success: !functionError && functionTest && functionTest.length > 0,
            message: (!functionError && functionTest && functionTest.length > 0) 
              ? 'Trigger function exists' 
              : 'Trigger function not found',
            details: functionError?.message
          })
        } catch (error) {
        
          return NextResponse.json({
            success: false,
            message: 'Error checking trigger function',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
        
      default:
        return NextResponse.json({
          error: 'Unknown action',
          availableActions: ['test_profiles', 'test_auth', 'test_trigger']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Profiles setup test failed:', error)
    return NextResponse.json(
      { 
        error: 'Setup test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}