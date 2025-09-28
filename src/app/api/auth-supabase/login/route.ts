import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, setAuthCookies } from '@/lib/auth-supabase'
import { validateEmail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    try {
      const result = await authenticateUser(email.toLowerCase().trim(), password)

      if (!result) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Set session cookies
      await setAuthCookies(result.session)

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: result.user,
      })

    } catch (error: unknown) {
      // Handle Supabase-specific errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message
        
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
        
        if (errorMessage.includes('Invalid login credentials')) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          )
        }
      }
      throw error
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}