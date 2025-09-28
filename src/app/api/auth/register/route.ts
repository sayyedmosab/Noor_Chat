import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'
import { validateEmail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, role = 'analyst' } = body

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    if (fullName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Full name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (!['analyst', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be analyst or admin' },
        { status: 400 }
      )
    }

    try {
      const result = await registerUser(
        email.toLowerCase().trim(),
        password,
        fullName.trim(),
        role
      )

      return NextResponse.json({
        success: true,
        message: process.env.NODE_ENV === 'development' 
          ? 'Account created and automatically verified for development! You can now login.'
          : 'Account created successfully. Please check your email for verification instructions.',
        user: result.user,
        developmentMode: process.env.NODE_ENV === 'development',
      })

    } catch (error: unknown) {
      // Handle Supabase-specific errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message
        
        if (errorMessage.includes('User already registered') || errorMessage.includes('already been registered')) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 409 }
          )
        }
        
        if (errorMessage.includes('profiles')) {
          return NextResponse.json(
            { 
              error: 'Database setup incomplete',
              details: 'The profiles table needs to be created in Supabase Dashboard',
              setupRequired: true
            },
            { status: 503 }
          )
        }
        
        if (errorMessage.includes('duplicate key value')) {
          return NextResponse.json(
            { error: 'Username or email already exists' },
            { status: 409 }
          )
        }
      }
      
      throw error
    }
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}