import { NextRequest, NextResponse } from 'next/server'
import { testSupabaseConnections, initializeSupabaseDB } from '@/lib/db-supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Testing Supabase database connections...')
    
    // First test connections
    const connectionTest = await testSupabaseConnections()
    
    // Then initialize schema
    await initializeSupabaseDB()
    
    return NextResponse.json({
      success: true,
      message: 'Supabase databases tested and initialized successfully',
      connections: connectionTest,
    })
  } catch (error) {
    console.error('❌ Supabase test failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test Supabase databases',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Just test connections without schema initialization
    const connectionTest = await testSupabaseConnections()
    
    return NextResponse.json({
      message: 'Supabase connection test endpoint',
      connections: connectionTest,
      endpoints: {
        'GET /api/test/supabase': 'Test Supabase connections',
        'POST /api/test/supabase': 'Test connections and initialize schema',
      }
    })
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test Supabase connections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}