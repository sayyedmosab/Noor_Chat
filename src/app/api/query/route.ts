import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getQueryEngine } from '@/lib/database/query-engine'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { action, ...params } = await request.json()

    const queryEngine = getQueryEngine()

    switch (action) {
      case 'execute_sql':
        return await executeSql(params.sql, user)
      
      case 'get_schema':
        return await getSchema()
      
      case 'get_sample':
        return await getSampleData(params.tableName, user)
      
      case 'test_connection':
        return await testConnection()
      
      case 'natural_language_query':
        return await naturalLanguageQuery(params.question, user)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Query API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function executeSql(sql: string, user: any) {
  if (!sql) {
    return NextResponse.json(
      { error: 'SQL query is required' },
      { status: 400 }
    )
  }

  const queryEngine = getQueryEngine()
  const result = await queryEngine.executeQuery(sql)
  
  return NextResponse.json({
    success: result.success,
    data: result.data,
    rowCount: result.rowCount,
    executionTime: result.executionTime,
    error: result.error,
    metadata: {
      executedBy: user.id,
      userRole: user.role,
      timestamp: new Date().toISOString()
    }
  })
}

async function getSchema() {
  const queryEngine = getQueryEngine()
  const schema = await queryEngine.getDatabaseSchema()
  
  if (!schema) {
    return NextResponse.json(
      { error: 'Failed to retrieve database schema' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({
    success: true,
    schema: schema,
    tableCount: schema.tables.length
  })
}

async function getSampleData(tableName: string, user: any) {
  if (!tableName) {
    return NextResponse.json(
      { error: 'Table name is required' },
      { status: 400 }
    )
  }

  const queryEngine = getQueryEngine()
  const result = await queryEngine.getSampleData(tableName)
  
  return NextResponse.json({
    success: result.success,
    data: result.data,
    tableName,
    error: result.error,
    metadata: {
      sampleSize: result.rowCount || 0,
      executedBy: user.id
    }
  })
}

async function testConnection() {
  const queryEngine = getQueryEngine()
  const result = await queryEngine.testConnection()
  
  return NextResponse.json({
    connected: result.connected,
    error: result.error,
    timestamp: new Date().toISOString()
  })
}

async function naturalLanguageQuery(question: string, user: any) {
  if (!question) {
    return NextResponse.json(
      { error: 'Question is required' },
      { status: 400 }
    )
  }

  // Get Gemini API key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service not configured' },
      { status: 500 }
    )
  }

  const queryEngine = getQueryEngine()
  
  // Get database schema first
  const schema = await queryEngine.getDatabaseSchema()
  if (!schema) {
    return NextResponse.json(
      { error: 'Failed to retrieve database schema' },
      { status: 500 }
    )
  }

  // Generate SQL from natural language
  const sqlGeneration = await queryEngine.generateSQLFromNaturalLanguage(
    question, 
    schema, 
    apiKey
  )

  if (!sqlGeneration) {
    return NextResponse.json(
      { error: 'Failed to generate SQL from question' },
      { status: 500 }
    )
  }

  // Execute the generated SQL
  const result = await queryEngine.executeQuery(sqlGeneration.sql)
  
  return NextResponse.json({
    success: result.success,
    question,
    generatedSQL: sqlGeneration.sql,
    explanation: sqlGeneration.explanation,
    data: result.data,
    rowCount: result.rowCount,
    executionTime: result.executionTime,
    error: result.error,
    metadata: {
      executedBy: user.id,
      userRole: user.role,
      timestamp: new Date().toISOString()
    }
  })
}