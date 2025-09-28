import { NextRequest, NextResponse } from 'next/server'
import { signOutUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await signOutUser()

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