import { NextRequest, NextResponse } from 'next/server'
import { initializeDB } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Initializing database schema...')
    await initializeDB()
    
    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully',
    })
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Database initialization endpoint. Use POST to initialize schema.',
    endpoints: {
      'POST /api/test/db-init': 'Initialize database schema',
    }
  })
}