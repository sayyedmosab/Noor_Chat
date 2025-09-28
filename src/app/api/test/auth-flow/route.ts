import { NextRequest, NextResponse } from 'next/server'
import { getAuthSupabase } from '@/lib/db-supabase'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    const authSupabase = getAuthSupabase()
    if (!authSupabase) {
      throw new Error('Auth Supabase client not available')
    }
    
    console.log('🔧 Testing auth flow action:', action)
    
    switch (action) {
      case 'create_user_table':
        // Test creating users table via Supabase
        const { data: createData, error: createError } = await authSupabase
          .from('users')
          .insert([
            { 
              email: 'test@example.com',
              password_hash: 'dummy_hash', 
              name: 'Test User',
              role: 'analyst',
              email_verified: true
            }
          ])
          .select()
        
        if (createError) {
          console.log('Users table does not exist or insert failed:', createError.message)
          
          // If table doesn't exist, we need to create it manually in Supabase dashboard
          return NextResponse.json({
            success: false,
            message: 'Users table needs to be created in Supabase dashboard',
            error: createError.message,
            sqlToRun: `
              CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('analyst', 'admin')),
                email_verified BOOLEAN DEFAULT FALSE,
                email_verification_token VARCHAR(255),
                password_reset_token VARCHAR(255),
                password_reset_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            `
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'User inserted successfully (table exists)',
          data: createData
        })
        
      case 'test_connection':
        // Simple connection test
        const { data: testData, error: testError } = await authSupabase
          .from('users')
          .select('count')
          .limit(1)
        
        return NextResponse.json({
          success: !testError,
          message: testError ? 'Connection failed' : 'Connection successful',
          error: testError?.message,
          canAccessUsersTable: !testError
        })
        
      case 'check_tables':
        // Try to list available tables
        const { data: tablesData, error: tablesError } = await authSupabase
          .rpc('get_table_names')
        
        if (tablesError) {
          return NextResponse.json({
            success: false,
            message: 'Cannot list tables (RPC not available)',
            error: tablesError.message,
            note: 'This is expected - we need to create tables manually'
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Tables listed successfully',
          tables: tablesData
        })
        
      default:
        return NextResponse.json({
          error: 'Unknown action',
          availableActions: ['create_user_table', 'test_connection', 'check_tables']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Auth flow test failed:', error)
    return NextResponse.json(
      { 
        error: 'Auth flow test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Authentication flow testing endpoint',
    usage: 'POST with {"action": "test_connection|create_user_table|check_tables"}',
    note: 'This tests Supabase authentication database operations'
  })
}