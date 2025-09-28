import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Helper function to format query results for display
function formatQueryResults(data: any[]): string {
  if (!data || data.length === 0) {
    return 'No data found.'
  }

  // Get column names from first row
  const columns = Object.keys(data[0])
  
  // Limit display to first 10 rows for readability
  const displayData = data.slice(0, 10)
  
  // Create simple table format
  let result = '\n**Data Sample:**\n'
  
  // Headers
  result += '| ' + columns.join(' | ') + ' |\n'
  result += '| ' + columns.map(() => '---').join(' | ') + ' |\n'
  
  // Rows
  displayData.forEach(row => {
    const values = columns.map(col => {
      const value = row[col]
      if (value === null || value === undefined) return 'null'
      if (typeof value === 'string' && value.length > 50) {
        return value.substring(0, 47) + '...'
      }
      return String(value)
    })
    result += '| ' + values.join(' | ') + ' |\n'
  })
  
  if (data.length > 10) {
    result += `\n_Showing first 10 rows of ${data.length} total rows._`
  }
  
  return result
}

// Simple Gemini API integration using fetch (Cloudflare Workers compatible)
async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.8,
      topK: 40
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated'
}

function createSystemPrompt(userRole: 'analyst' | 'admin'): string {
  const basePrompt = `You are an intelligent data analysis assistant for a Chat + Canvas application. You help users analyze data, answer questions, and provide insights.

USER ROLE: ${userRole === 'admin' ? 'Super Admin (full access)' : 'Super Analyst (read-only)'}

YOUR CAPABILITIES:
- Answer questions about data analysis concepts
- Help generate SQL queries for database analysis
- Provide insights on data patterns and trends  
- Suggest visualization approaches
- Explain statistical concepts
- Guide users through data exploration
- Execute database queries when users ask about specific data

IMPORTANT GUIDELINES:
- Be conversational and helpful
- When users ask about data in tables, offer to query the database
- Explain SQL queries before executing them
- Provide data insights and summaries after query results
- Suggest follow-up questions and next steps
- Keep responses focused and relevant

DATABASE INTEGRATION:
- You can execute SELECT queries on the connected database
- Always explain what queries will do before running them
- Provide meaningful analysis of query results
- Suggest additional queries to explore data further

CURRENT CONTEXT:
- This is a dual-database architecture system
- Query database is connected for data analysis
- Role-based access controls are in place
- You have access to database schema information

RESPONSE FORMAT:
- For data questions: Explain + Generate SQL + Execute + Analyze results
- For concepts: Provide clear explanations with examples
- For errors: Explain what went wrong and suggest alternatives

Remember: You're helping with real data analysis. Be practical and educational.`

  return basePrompt
}

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

    // Parse request body
    const { message, userId, userRole } = await request.json()
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Verify user ID matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Create system prompt based on user role
    const systemPrompt = createSystemPrompt(userRole)
    
    // Combine system prompt with user message
    const fullPrompt = `${systemPrompt}

USER QUESTION: ${message}

Please provide a helpful response:`

    // Check if this looks like a data query request
    const isDataQuery = message.toLowerCase().includes('table') || 
                       message.toLowerCase().includes('query') ||
                       message.toLowerCase().includes('data') ||
                       message.toLowerCase().includes('show me') ||
                       message.toLowerCase().includes('find') ||
                       message.toLowerCase().includes('how many')

    let response: string

    if (isDataQuery) {
      // Try to handle as a database query
      try {
        const queryResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3001'}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'natural_language_query',
            question: message
          })
        })

        if (queryResponse.ok) {
          const queryData = await queryResponse.json()
          
          if (queryData.success) {
            // Format the response with query results
            response = `I found the following data for your question: "${message}"

**Generated SQL Query:**
\`\`\`sql
${queryData.generatedSQL}
\`\`\`

**Explanation:** ${queryData.explanation}

**Results:** Found ${queryData.rowCount} rows in ${queryData.executionTime}ms

${queryData.data && queryData.data.length > 0 ? 
  formatQueryResults(queryData.data) : 
  'No data returned from the query.'}

Would you like me to analyze this data further or help with additional queries?`
          } else {
            // Query failed, fall back to regular chat
            response = await generateWithGemini(fullPrompt + `\n\nNote: I tried to query the database but encountered an error: ${queryData.error}. Let me help you with general guidance instead.`, apiKey)
          }
        } else {
          // API call failed, fall back to regular chat
          response = await generateWithGemini(fullPrompt, apiKey)
        }
      } catch (queryError) {
        // Error in query attempt, fall back to regular chat
        response = await generateWithGemini(fullPrompt, apiKey)
      }
    } else {
      // Handle as regular chat
      response = await generateWithGemini(fullPrompt, apiKey)
    }

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
      userId: user.id,
      hasDataQuery: isDataQuery
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        return NextResponse.json(
          { error: 'API key invalid or quota exceeded' },
          { status: 500 }
        )
      } else if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}