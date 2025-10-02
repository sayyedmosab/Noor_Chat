import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Only allow this in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const db = getDB()
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }
    
    // Verify the user by email (development only)
    const result = await db.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE email = $1 RETURNING id, email, name',
      [email.toLowerCase().trim()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 }
      )
    }

    const user = result.rows[0]

    return NextResponse.json({
      success: true,
      message: `Account for ${user.email} has been manually verified in development mode!`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Manual verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}