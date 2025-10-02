// run_agent.js

import { simulateFunctionCall } from './AskMeAnything_GeminiExpertAgent.js';
import fs from 'fs/promises';
import path from 'path';

const GEMINI_API_KEY = "AIzaSyDcTDU_Fku2Zj4hLe9wRsCWvUu2q7RdOAM";

// Full, valid aiTools object
const aiTools = [
  {
    name: 'get_detailed_schema',
    description: 'Use this tool to request the detailed schema (including all columns, types, and keys) for specific tables when you need more information to construct a query. Only request details for tables you have identified as relevant from the worldview map.',
    parameters: {
      type: 'object',
      properties: {
        tables: {
          type: 'array',
          description: 'An array of table names for which you need the detailed schema.',
          items: {
            type: 'string',
          },
        },
        reason: {
            type: 'string',
            description: 'A brief explanation of why you need the details for these tables and what you plan to do with them.'
        }
      },
      required: ['tables', 'reason'],
    },
  },
  {
    name: 'execute_sql',
    description: 'Use this tool to execute a SQL query against the database. This should be one of the last steps.',
    parameters: {
        type: 'object',
        properties: {
            sql: {
                type: 'string',
                description: 'The PostgreSQL query to execute.'
            }
        },
        required: ['sql']
    }
  },
  {
    name: 'ask_clarifying_question',
    description: "Use this tool when the user's request is ambiguous or too broad. Ask a specific question to get the information needed to proceed.",
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The specific question to ask the user for clarification.',
        },
      },
      required: ['question'],
    },
  },
  {
    name: 'refine_query',
    description: 'Use this tool when the initial results are incomplete or suggest a better query is needed. This will restart the planning process with a more specific goal.',
    parameters: {
        type: 'object',
        properties: {
            new_question: {
                type: 'string',
                description: 'A new, more specific question that will be used to restart the analysis loop.'
            }
        },
        required: ['new_question']
    }
  }
];

async function testAgentReasoning() {
  console.log("--- Running Agent Reasoning Simulation ---");

  try {
    const worldviewPath = path.resolve(process.cwd(), 'worldviewmap.json');
    const worldviewContent = await fs.readFile(worldviewPath, 'utf-8');
    const worldviewMap = JSON.parse(worldviewContent);

    const testQuestion = `Worldview Map: ${JSON.stringify(worldviewMap)}\n\nQuestion: What is the name and status of projects related to Change Adoption?`;

    const toolsPayload = {
      tools: [{ functionDeclarations: aiTools }],
      toolConfig: { functionCallingConfig: { mode: 'ANY' } },
      systemInstruction: {
        role: 'system',
        parts: [{
          text: `You are a world-class data analysis agent. You must follow the rules and protocol defined in the Worldview Map. To execute a query, you MUST call the `execute_sql` function after explaining it.`
        }]
      }
    };

    const responseJson = await simulateFunctionCall(testQuestion, GEMINI_API_KEY, toolsPayload);
    
    console.log("--- Agent Simulation Result (Suggested Tool Call): ---\n");
    console.log(responseJson);

  } catch (error) {
    console.error("Agent Reasoning Simulation Failed:", error.message);
  }
}

testAgentReasoning();
