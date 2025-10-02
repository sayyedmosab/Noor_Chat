console.log('Orchestrator file loaded!');
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getQueryEngine } from '@/lib/database/query-engine';
import { aiTools } from '@/lib/ai-tools';
import { GoogleGenAI, GenerationConfig, Content, FinishReason, Part } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Incoming /api/query request body:', JSON.stringify(body, null, 2));
    const { action, question, history } = body;

    if (action === 'test_connection') {
      console.log('Running database connection test...');
      const queryEngine = await getQueryEngine();
      const result = await queryEngine.testConnection();
      return NextResponse.json(result);
    }

    let user = await getCurrentUser();
    if (!user) {
      console.warn('Bypassing auth: No authenticated user found. Creating mock user for local testing.');
      user = {
        id: 'local-test-user',
        role: 'admin',
        email: 'local@test.dev',
        full_name: 'Local Test User',
        username: 'localtest'
      };
    }

    if (action !== 'natural_language_query') {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const result = await naturalLanguageQueryOrchestrator(question, user, history || []);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Query API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Orchestrates the multi-turn, tool-calling conversation with the Gemini model
 * using the correct SDK chat session pattern.
 */
async function naturalLanguageQueryOrchestrator(question: string, user: any, initialHistory: Content[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI service not configured. GEMINI_API_KEY is missing.');
  }

  const queryEngine = await getQueryEngine();
  const worldviewMap = queryEngine.getWorldviewMap();

  // Multi-turn agentic loop using Gemini 2.0 REST API
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const MAX_TURNS = 6;
  let turn = 0;

  // Define strong system instructions for agentic protocol
  // System instructions for agentic protocol
  const systemInstruction = {
    role: 'system',
    parts: [{
      text: `You are a world-class data analysis agent. Always use the available tools to interact with the database and analyze data. Never assume or fabricate results. For any database action, always call the appropriate tool (functionCall) and wait for the tool response before continuing. All tool results and final answers must be returned in strict JSON format. Use the agentic multi-turn protocol: 1) Plan, 2) Request details, 3) Output SQL, 4) Analyze results. If you need clarification, call ask_clarifying_question. Never skip steps or respond with only explanations. Example final answer: {"status": "final_response", "analysis": "..."}`
    }]
  };

  // Tool/function declarations for Gemini function calling
  const toolDeclarations = [
    {
      functionDeclarations: [
        {
          name: 'get_detailed_schema',
          description: 'Get detailed schema for specific tables. Response must be strict JSON.',
          parameters: {
            type: 'object',
            properties: {
              tables: { type: 'array', items: { type: 'string' }, description: 'List of table names.' }
            },
            required: ['tables']
          },
          responseSchema: {
            type: 'object',
            properties: {
              detailed_schema: { type: 'array', items: { type: 'object' } }
            },
            required: ['detailed_schema']
          }
        },
        {
          name: 'execute_sql',
          description: 'Execute a SQL query on the database. Response must be strict JSON.',
          parameters: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SQL query to execute.' }
            },
            required: ['sql']
          },
          responseSchema: {
            type: 'object',
            properties: {
              query_result: { type: 'object' }
            },
            required: ['query_result']
          }
        },
        {
          name: 'ask_clarifying_question',
          description: 'Ask the user for clarification if needed. Response must be strict JSON.',
          parameters: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'Clarifying question to ask.' }
            },
            required: ['question']
          },
          responseSchema: {
            type: 'object',
            properties: {
              clarification: { type: 'string' }
            },
            required: ['clarification']
          }
        }
      ]
    }
  ];

  // Build initial history in Gemini format
  let history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  if (initialHistory && initialHistory.length > 0) {
    history = initialHistory as Array<{ role: string; parts: Array<{ text: string }> }>;
  }
  // Add worldview map and question as first user turn
  if (turn === 0) {
    history.push({ role: 'user', parts: [{ text: `Worldview Map: ${JSON.stringify(worldviewMap)}\nQuestion: ${question}` }] });
  }

  while (turn < MAX_TURNS) {
    const turnStart = Date.now();
    // Build request body with full history, system instructions, and tool declarations
    const body = {
      contents: [systemInstruction, ...history],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40,
        responseMimeType: 'application/json'
      },
      tools: toolDeclarations
    };

    console.log(`\n--- Gemini Turn ${turn + 1} ---`);
    console.log('History:', JSON.stringify(history, null, 2));
    console.log('Gemini API request body:', JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const turnEnd = Date.now();
    const turnDuration = turnEnd - turnStart;

    if (!response.ok) {
      console.error(`Gemini API error: ${response.status} (Turn ${turn + 1}, ${turnDuration}ms)`);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts: Array<{ text?: string; functionCall?: any }> = candidate?.content?.parts || [];
    let lastResponseText = parts.map((p: { text?: string }) => p.text).filter(Boolean).join('\n');

    console.log('Gemini Response:', JSON.stringify(parts, null, 2));
    console.log(`Turn ${turn + 1} duration: ${turnDuration}ms`);

    // Detect tool calls in response parts
    let toolCallFound = false;
    for (const part of parts) {
      if (part.functionCall) {
        toolCallFound = true;
        const call = part.functionCall;
        let toolResultText = '';
        console.log('Tool Call:', JSON.stringify(call, null, 2));
        if (call.name === 'get_detailed_schema') {
          const tables = call.args.tables;
          const detailedSchema = await queryEngine.getDetailedSchemaFromRepository(tables);
          toolResultText = JSON.stringify({ detailed_schema: detailedSchema });
        } else if (call.name === 'execute_sql') {
          const sql = call.args.sql;
          const queryResult = await queryEngine.executeQuery(sql);
          toolResultText = JSON.stringify({ query_result: queryResult });
        } else if (call.name === 'ask_clarifying_question') {
          console.log('Clarifying question requested:', call.args.question);
          // End loop and return clarification needed
          return { status: 'clarification_needed', text: call.args.question };
        } else {
          toolResultText = JSON.stringify({ error: `Unknown tool: ${call.name}` });
        }
        console.log('Tool Result:', toolResultText);
        // Add tool result as model turn to history and continue loop
        history.push({ role: 'model', parts: [{ text: toolResultText }] });
        break;
      }
    }
    if (!toolCallFound) {
      // No tool call, treat as final response
      console.log('Final Gemini Response:', lastResponseText);
      // Validate JSON output
      try {
        const parsed = JSON.parse(lastResponseText);
        return parsed;
      } catch (err) {
        console.error('Non-JSON response received. Protocol violation.');
        return { status: 'error', error: 'Non-JSON response received from Gemini. Protocol violation.', raw: lastResponseText };
      }
    }
    turn++;
  }
  // If loop ends without final response
  console.log('Max turns reached. Last Gemini Response:', history[history.length - 1]?.parts?.[0]?.text);
  return {
    status: 'max_turns_reached',
    text: history[history.length - 1]?.parts?.[0]?.text
  };
}