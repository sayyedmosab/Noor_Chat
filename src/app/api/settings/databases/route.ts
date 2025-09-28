import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  getAppConfig,
  addDatabaseConfig,
  updateDatabaseConfig,
  removeDatabaseConfig,
  testDatabaseConnection,
  switchActiveAuthDatabase,
  switchActiveQueryDatabase
} from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    // Require admin access for database configuration
    await requireAdmin()
    
    const config = getAppConfig()
    
    // Don't expose service role keys in the response
    const sanitizedDatabases = config.databases.map(db => ({
      ...db,
      serviceRoleKey: db.serviceRoleKey ? '***masked***' : undefined
    }))
    
    return NextResponse.json({
      success: true,
      databases: sanitizedDatabases,
      activeAuthDb: config.activeAuthDb,
      activeQueryDb: config.activeQueryDb,
      settings: config.settings
    })
  } catch (error) {
    if ((error as any)?.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    console.error('Get databases config error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin()
    
    const body = await request.json()
    const { action, ...data } = body
    
    switch (action) {
      case 'add': {
        const { name, type, url, anonKey, serviceRoleKey, description } = data
        
        if (!name || !type || !url || !anonKey) {
          return NextResponse.json(
            { error: 'Missing required fields: name, type, url, anonKey' },
            { status: 400 }
          )
        }
        
        const newDb = addDatabaseConfig({
          name,
          type,
          url,
          anonKey,
          serviceRoleKey,
          description,
          isActive: true
        })
        
        return NextResponse.json({
          success: true,
          message: 'Database added successfully',
          database: {
            ...newDb,
            serviceRoleKey: newDb.serviceRoleKey ? '***masked***' : undefined
          }
        })
      }
      
      case 'update': {
        const { id, ...updates } = data
        
        if (!id) {
          return NextResponse.json(
            { error: 'Database ID required' },
            { status: 400 }
          )
        }
        
        const updatedDb = updateDatabaseConfig(id, updates)
        
        if (!updatedDb) {
          return NextResponse.json(
            { error: 'Database not found' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          message: 'Database updated successfully',
          database: {
            ...updatedDb,
            serviceRoleKey: updatedDb.serviceRoleKey ? '***masked***' : undefined
          }
        })
      }
      
      case 'remove': {
        const { id } = data
        
        if (!id) {
          return NextResponse.json(
            { error: 'Database ID required' },
            { status: 400 }
          )
        }
        
        const success = removeDatabaseConfig(id)
        
        if (!success) {
          return NextResponse.json(
            { error: 'Database not found' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          message: 'Database removed successfully'
        })
      }
      
      case 'switch_auth': {
        const { id } = data
        
        const success = switchActiveAuthDatabase(id)
        
        if (!success) {
          return NextResponse.json(
            { error: 'Invalid auth database ID or database not active' },
            { status: 400 }
          )
        }
        
        return NextResponse.json({
          success: true,
          message: 'Active auth database switched successfully'
        })
      }
      
      case 'switch_query': {
        const { id } = data
        
        const success = switchActiveQueryDatabase(id)
        
        if (!success) {
          return NextResponse.json(
            { error: 'Invalid query database ID or database not active' },
            { status: 400 }
          )
        }
        
        return NextResponse.json({
          success: true,
          message: 'Active query database switched successfully'
        })
      }
      
      case 'test': {
        const { id } = data
        const config = getAppConfig()
        const db = config.databases.find(d => d.id === id)
        
        if (!db) {
          return NextResponse.json(
            { error: 'Database not found' },
            { status: 404 }
          )
        }
        
        const testResult = await testDatabaseConnection(db)
        
        return NextResponse.json({
          success: testResult.success,
          message: testResult.message,
          details: testResult.details
        })
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    if ((error as any)?.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    console.error('Database config error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}