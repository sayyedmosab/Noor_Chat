import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth-supabase'

export async function POST(request: NextRequest) {
  try {
    await clearAuthCookies()

    return NextResponse.json({
      success: true,
      message: 'Logout successful',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Logout endpoint - use POST method',
  })
}