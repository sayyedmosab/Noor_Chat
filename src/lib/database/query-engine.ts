import { createQuerySupabaseServer } from '@/lib/supabase/server'

export interface QueryResult {
  success: boolean
  data?: any[]
  columns?: string[]
  rowCount?: number
  error?: string
  executionTime?: number
}

export interface DatabaseSchema {
  tables: Array<{
    name: string
    columns: Array<{
      name: string
      type: string
      nullable: boolean
      default?: string
    }>
  }>
}

/**
 * Database Query Engine for analyzing data from the Query Database
 * Uses the second Supabase instance configured for data analysis
 */
export class QueryEngine {
  private supabase = createQuerySupabaseServer()

  /**
   * Execute a raw SQL query on the query database
   * IMPORTANT: Only use for read-only operations
   */
  async executeQuery(sql: string): Promise<QueryResult> {
    const startTime = Date.now()
    
    try {
      // Security check: only allow SELECT statements
      const trimmedSql = sql.trim().toLowerCase()
      if (!trimmedSql.startsWith('select') && !trimmedSql.startsWith('with')) {
        return {
          success: false,
          error: 'Only SELECT queries are allowed for security reasons'
        }
      }

      // Execute query using Supabase RPC or direct SQL
      const { data, error } = await this.supabase.rpc('execute_sql', { 
        sql_query: sql 
      })

      if (error) {
        return {
          success: false,
          error: error.message || 'Query execution failed'
        }
      }

      const executionTime = Date.now() - startTime

      return {
        success: true,
        data: data || [],
        rowCount: Array.isArray(data) ? data.length : 0,
        executionTime
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown query error',
        executionTime
      }
    }
  }

  /**
   * Get database schema information
   */
  async getDatabaseSchema(): Promise<DatabaseSchema | null> {
    try {
      // Query to get table and column information
      const schemaQuery = `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default
        FROM information_schema.tables t
        JOIN information_schema.columns c 
          ON t.table_name = c.table_name 
          AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
      `

      const result = await this.executeQuery(schemaQuery)
      
      if (!result.success || !result.data) {
        return null
      }

      // Group columns by table
      const tables: Record<string, any[]> = {}
      
      result.data.forEach((row: any) => {
        if (!tables[row.table_name]) {
          tables[row.table_name] = []
        }
        
        tables[row.table_name].push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        })
      })

      return {
        tables: Object.entries(tables).map(([name, columns]) => ({
          name,
          columns
        }))
      }

    } catch (error) {
      console.error('Failed to get database schema:', error)
      return null
    }
  }

  /**
   * Get sample data from a table (limited to first 5 rows)
   */
  async getSampleData(tableName: string): Promise<QueryResult> {
    // Sanitize table name to prevent SQL injection
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '')
    
    const sampleQuery = `
      SELECT * 
      FROM "${sanitizedTableName}" 
      LIMIT 5
    `
    
    return this.executeQuery(sampleQuery)
  }

  /**
   * Get table row count
   */
  async getTableRowCount(tableName: string): Promise<number | null> {
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '')
    
    const countQuery = `
      SELECT COUNT(*) as total_rows
      FROM "${sanitizedTableName}"
    `
    
    const result = await this.executeQuery(countQuery)
    
    if (result.success && result.data && result.data.length > 0) {
      return result.data[0].total_rows || 0
    }
    
    return null
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const result = await this.executeQuery('SELECT 1 as test')
      
      return {
        connected: result.success,
        error: result.error
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  /**
   * Generate SQL query from natural language using Gemini
   * This will be called by the chat system
   */
  async generateSQLFromNaturalLanguage(
    question: string, 
    schema: DatabaseSchema, 
    apiKey: string
  ): Promise<{ sql: string; explanation: string } | null> {
    try {
      const schemaInfo = schema.tables.map(table => {
        const columnInfo = table.columns.map(col => 
          `${col.name} (${col.type}${col.nullable ? ', nullable' : ', not null'})`
        ).join(', ')
        
        return `Table: ${table.name}\nColumns: ${columnInfo}`
      }).join('\n\n')

      const prompt = `You are a SQL expert. Generate a PostgreSQL SELECT query based on the user's question and database schema.

DATABASE SCHEMA:
${schemaInfo}

USER QUESTION: ${question}

Rules:
1. Only generate SELECT queries (no INSERT, UPDATE, DELETE)
2. Use proper PostgreSQL syntax
3. Include helpful comments in the SQL
4. Limit results to reasonable numbers (use LIMIT)
5. Use proper table and column names from the schema
6. Be careful with JOINs and relationships

Respond with JSON format:
{
  "sql": "SELECT ...",
  "explanation": "This query does X by joining Y tables..."
}`

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more precise SQL
            maxOutputTokens: 1024
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      
      // Try to parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return {
            sql: parsed.sql,
            explanation: parsed.explanation
          }
        }
      } catch (parseError) {
        // If JSON parsing fails, extract SQL manually
        const sqlMatch = responseText.match(/```sql\n([\s\S]*?)\n```/i) ||
                        responseText.match(/SELECT[\s\S]*?;/i)
        
        if (sqlMatch) {
          return {
            sql: sqlMatch[1] || sqlMatch[0],
            explanation: 'Generated SQL query based on your question.'
          }
        }
      }

      return null

    } catch (error) {
      console.error('Failed to generate SQL:', error)
      return null
    }
  }
}

// Singleton instance
let queryEngine: QueryEngine | null = null

export function getQueryEngine(): QueryEngine {
  if (!queryEngine) {
    queryEngine = new QueryEngine()
  }
  return queryEngine
}