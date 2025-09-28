import { NextRequest, NextResponse } from 'next/server'
import { getAuthSupabase, initializeProfilesTable } from '@/lib/auth-supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getAuthSupabase()
    
    console.log('🔍 Testing Supabase Auth setup...')
    
    // Test 1: Basic connection
    const { data: authTest, error: authError } = await supabase.auth.admin.listUsers()
    
    // Test 2: Check if profiles table exists
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    // Test 3: Get schema info
    const { data: schemaTest, error: schemaError } = await supabase
      .rpc('get_schema_version')
    
    const results = {
      authConnection: {
        success: !authError,
        error: authError?.message,
        userCount: authTest?.users?.length || 0
      },
      profilesTable: {
        exists: !profilesError,
        error: profilesError?.message,
        needsCreation: profilesError?.code === '42P01' // table doesn't exist
      },
      schemaVersion: {
        available: !schemaError,
        error: schemaError?.message
      }
    }
    
    return NextResponse.json({
      message: 'Supabase Auth connection test',
      results,
      recommendations: {
        nextSteps: results.profilesTable.needsCreation 
          ? ['Create profiles table in Supabase Dashboard']
          : ['Profiles table exists - ready for authentication']
      }
    })
    
  } catch (error) {
    console.error('❌ Supabase Auth test failed:', error)
    return NextResponse.json(
      { 
        error: 'Supabase Auth test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'get_profiles_sql') {
      const result = await initializeProfilesTable()
      
      return NextResponse.json({
        success: true,
        message: 'SQL for creating profiles table',
        sql: result.sql,
        instructions: [
          '1. Go to Supabase Dashboard → SQL Editor',
          '2. Copy and paste the SQL below',
          '3. Click "RUN" to execute',
          '4. Test registration after creation'
        ]
      })
    }
    
    return NextResponse.json({
      error: 'Unknown action',
      availableActions: ['get_profiles_sql']
    }, { status: 400 })
    
  } catch (error) {
    console.error('❌ Supabase Auth setup failed:', error)
    return NextResponse.json(
      { 
        error: 'Supabase Auth setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}