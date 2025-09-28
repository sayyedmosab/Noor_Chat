import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Read the migration SQL
    const sqlPath = join(process.cwd(), 'src', 'sql', 'profiles-migration.sql')
    const sql = await readFile(sqlPath, 'utf-8')
    
    return NextResponse.json({
      success: true,
      message: 'Profiles table migration SQL (Fix existing schema)',
      sql,
      instructions: [
        '1. Go to Supabase Dashboard → Auth Database → SQL Editor',
        '2. Copy and paste the migration SQL below',  
        '3. Click "RUN" to execute',
        '4. This will update your existing profiles table to the correct schema',
        '5. Test registration after migration'
      ],
      changes: [
        'ADD: username column (unique)',
        'REMOVE: email column (belongs in auth.users)',
        'ADD: avatar_url column',
        'FIX: Generate usernames for existing users',
        'FIX: Update RLS policies with correct names',
        'FIX: Improve trigger function with better metadata handling',
        'ADD: Performance indexes'
      ]
    })
  } catch (error) {
    console.error('Failed to read migration SQL:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load migration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}