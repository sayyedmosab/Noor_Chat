import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

// Helper function to format query results for display
function formatQueryResults(data: any[]): string {
  if (!data || data.length === 0) {
    return 'No data found.';
  }
  const columns = Object.keys(data[0]);
  const displayData = data.slice(0, 10);
  let result = '\n**Data Sample:**\n';
  result += '| ' + columns.join(' | ') + ' |\n';
  result += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
  displayData.forEach(row => {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return 'null';
      if (typeof value === 'string' && value.length > 50) {
        return value.substring(0, 47) + '...';
      }
      return String(value);
    });
    result += '| ' + values.join(' | ') + ' |\n';
  });
  if (data.length > 10) {
    result += `\n_Showing first 10 rows of ${data.length} total rows._`;
  }
  return result;
}

/**
 * Generates a response using the Gemini API for simple, non-agentic chats.
 * Uses the new `@google/genai` SDK.
 */
async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  try {
  const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    // Extract text from candidates array (SDK reference)
    let text = '';
    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text || '';
      }
    }
    return text;
  } catch (error) {
    console.error('Error in generateWithGemini:', error);
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        return 'API key invalid or quota exceeded';
      } else if (error.message.includes('400')) {
        return 'Invalid request format for Gemini API.';
      } else if (error.message.includes('429')) {
        return 'Rate limit exceeded. Please try again in a moment.';
      }
    }
    return "I'm having trouble connecting to my knowledge base right now. Please try again in a moment.";
  }
}

function createSystemPrompt(userRole: 'analyst' | 'admin'): string {
  // This function remains the same, providing the initial context for the AI.
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

Remember: Youre helping with real data analysis. Be practical and educational.`;
  return basePrompt;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { message, userId, userRole } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }


    const isDataQuery = message.toLowerCase().includes('table') ||
                       message.toLowerCase().includes('query') ||
                       message.toLowerCase().includes('data') ||
                       message.toLowerCase().includes('show me') ||
                       message.toLowerCase().includes('find') ||
                       message.toLowerCase().includes('how many');

    let responseText: string;

    if (isDataQuery) {
      // For data queries, load worldview map and DB schema summary for context
      try {
        // Load worldview map only
        const worldviewMapRaw = await import('fs/promises').then(fs => fs.readFile(process.cwd() + '/worldviewmap.json', 'utf-8'));
        const worldviewMap = JSON.parse(worldviewMapRaw);

        // History: for now, always start with empty array, but type explicitly
        const history: Array<{ role: string; content: string }> = [];

        // Instructions/messages for orchestrator
        const isFirstQuery = history.length === 0;
        const orchestratorInstructions = isFirstQuery
          ? 'This is the first query in the session. Use only the worldview map for reasoning. If you need more details, ask for specific tables or columns.'
          : 'This is a follow-up query. Use the worldview map and provided history for context.';

        const queryPayload = {
          action: 'natural_language_query',
          question: message,
          worldviewMap,
          history,
          instructions: orchestratorInstructions
        };

  const queryBaseUrl = process.env.APP_URL || 'http://localhost:3101';
  const queryResponse = await fetch(`${queryBaseUrl}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryPayload),
        });

        if (queryResponse.ok) {
          const queryData = await queryResponse.json();
          responseText = queryData.text || 'I was unable to process your data request.';
        } else {
          const errorData = await queryResponse.text();
          console.error('Error from /api/query:', errorData);
          responseText = 'I encountered an error while trying to process your data request.';
        }
      } catch (queryError) {
        console.error('Failed to fetch /api/query:', queryError);
        responseText = 'The data analysis service seems to be unavailable right now.';
      }
    } else {
      // For simple chats, use the local generateWithGemini function.
      const systemPrompt = createSystemPrompt(userRole);
      const fullPrompt = `${systemPrompt}\n\nUSER QUESTION: ${message}\n\nPlease provide a helpful response:`;
      responseText = await generateWithGemini(fullPrompt, apiKey);
    }

    return NextResponse.json({
      response: responseText,
      timestamp: new Date().toISOString(),
      userId: user.id,
      hasDataQuery: isDataQuery,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        return NextResponse.json({ error: 'API key invalid or quota exceeded' }, { status: 500 });
      } else if (error.message.includes('429')) {
        return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a moment.' }, { status: 429 });
      }
    }
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
