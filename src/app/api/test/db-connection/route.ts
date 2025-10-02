import { NextRequest, NextResponse } from 'next/server'
import { testSupabaseConnections } from '@/lib/db-supabase'

export async function GET(request: NextRequest) {
  try {
    const results = await testSupabaseConnections();
    return NextResponse.json({
      success: true,
      ...results
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during connection test.',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}