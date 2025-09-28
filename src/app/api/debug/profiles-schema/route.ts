import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    
    // Check what columns exist in profiles table
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public')
    
    // Try to get a sample profile to see actual structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    return NextResponse.json({
      success: true,
      message: 'Profiles table schema analysis',
      schema: {
        columns: schemaData || [],
        schemaError: schemaError?.message,
        sample: sampleData || [],
        sampleError: sampleError?.message
      }
    })
  } catch (error) {
    console.error('Schema debug error:', error)
    return NextResponse.json(
      { 
        error: 'Schema analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}