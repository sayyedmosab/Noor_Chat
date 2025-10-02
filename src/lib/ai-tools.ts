/**
 * @fileoverview Defines the structure of tools (functions) made available to the Gemini AI model.
 * This structure is based on the Google AI Generative Language API's FunctionDeclaration format.
 */

// Note: In a real environment, you would import this type from the Google AI SDK.
// For this context, we'll define a simplified version of the interface.
interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: {
      [key: string]: {
        type: string;
        description: string;
        items?: {
          type: string;
        };
      };
    };
    required: string[];
  };
}

/**
 * An array of function declarations that will be sent to the Gemini model.
 * This tells the model what functions it can call, what parameters they expect,
 * and what they do.
 */
export const aiTools: FunctionDeclaration[] = [
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
    description: 'Use this tool when the user\'s request is ambiguous or too broad. Ask a specific question to get the information needed to proceed.',
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