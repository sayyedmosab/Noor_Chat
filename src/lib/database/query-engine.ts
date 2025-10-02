import { createQuerySupabaseServer } from '@/lib/supabase/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface QueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowCount?: number;
  error?: string;
  executionTime?: number;
}

// This interface can be expanded based on the actual structure of your JSON files
export interface DetailedTableSchema {
  schema: string;
  table: string;
  columns: any[]; // Define more strictly if possible
}

/**
 * Database Query Engine for analyzing data from the Query Database.
 * This class is now also responsible for loading and providing schema information
 * from local JSON files.
 */
export class QueryEngine {
  private supabase: ReturnType<typeof createQuerySupabaseServer> = createQuerySupabaseServer();
  private worldviewMap: any;
  private detailedSchema: DetailedTableSchema[];

  constructor() {
    this.worldviewMap = null;
    this.detailedSchema = [];
  }

  /**
   * Loads the schema assets from the filesystem into memory.
   * This should be called once when the engine is initialized.
   */
  async loadSchemaAssets(): Promise<void> {
    try {
      const worldviewPath = path.resolve(process.cwd(), 'worldviewmap.json');
      const detailedSchemaPath = path.resolve(process.cwd(), 'DB as JSON.txt');

      const worldviewContent = await fs.readFile(worldviewPath, 'utf-8');
      const detailedSchemaContent = await fs.readFile(detailedSchemaPath, 'utf-8');

      this.worldviewMap = JSON.parse(worldviewContent);
      this.detailedSchema = JSON.parse(detailedSchemaContent);

      console.log('Schema assets loaded successfully.');
    } catch (error) {
      console.error('Failed to load schema assets:', error);
      throw new Error('Could not initialize QueryEngine: Failed to load schema assets.');
    }
  }

  /**
   * Returns the loaded high-level business logic graph.
   */
  getWorldviewMap(): any {
    if (!this.worldviewMap) {
      throw new Error('Worldview map has not been loaded. Call loadSchemaAssets() first.');
    }
    return this.worldviewMap;
  }

  /**
   * Retrieves the detailed schema for a specific list of tables from the in-memory repository.
   * @param tables An array of table names to retrieve details for.
   */
  getDetailedSchemaFromRepository(tables: string[]): DetailedTableSchema[] {
    if (!this.detailedSchema) {
      throw new Error('Detailed schema has not been loaded. Call loadSchemaAssets() first.');
    }
    const lowercasedTables = tables.map(t => t.toLowerCase());
    return this.detailedSchema.filter(tableInfo => lowercasedTables.includes(tableInfo.table.toLowerCase()));
  }

  /**
   * Execute a raw SQL query on the query database.
   * IMPORTANT: Only use for read-only operations.
   */
  async executeQuery(sql: string): Promise<QueryResult> {
    const startTime = Date.now();
    try {
      const trimmedSql = sql.trim().toLowerCase();
      if (!trimmedSql.startsWith('select') && !trimmedSql.startsWith('with')) {
        return {
          success: false,
          error: 'Only SELECT and WITH queries are allowed for security reasons',
        };
      }

      const supabase = await this.supabase;
      const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });

      if (error) {
        return { success: false, error: error.message || 'Query execution failed' };
      }

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        data: data || [],
        rowCount: Array.isArray(data) ? data.length : 0,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown query error',
        executionTime,
      };
    }
  }

  /**
   * Test database connection.
   */
  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const result = await this.executeQuery('SELECT 1 as test');
      return {
        connected: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
}

// Singleton instance management
let queryEngineInstance: QueryEngine | null = null;

/**
 * Gets the singleton instance of the QueryEngine.
 * Initializes the engine and loads schema assets on the first call.
 */
export async function getQueryEngine(): Promise<QueryEngine> {
  if (!queryEngineInstance) {
    const engine = new QueryEngine();
    await engine.loadSchemaAssets();
    queryEngineInstance = engine;
  }
  return queryEngineInstance;
}