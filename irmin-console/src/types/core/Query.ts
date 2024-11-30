import { JSONValue } from '@/types/internal/GenericJSON';

import { IrminFileType } from './EditorItems';

/**
 * Query object interface
 *
 * @typeParam id - Unique ID of the query
 * @typeParam name - Name of the query
 * @typeParam description - Description of the query
 * @typeParam content - The query itself
 * @typeParam type - The type of the query (e.g., `sql`, `js`, etc.)
 * @typeParam owner - The ID of the user who created the query
 * @typeParam stored - Whether the query results are stored in the system
 * @typeParam started_at - Timestamp when the query execution started
 * @typeParam finished_at - Timestamp when the query execution finished
 * @typeParam execution_time - Time taken to execute the query in milliseconds
 * @typeParam logs - Logs from the query execution
 */
export interface Query {
  id: string;
  name: string;
  description: string;
  content: string;
  type: IrminFileType;
  owner: string;
  stored: boolean;
  started_at: string;
  finished_at: string;
  execution_time: number;
  logs: string[];
}

/**
 * Query Execution Result
 *
 * @typeParam result - The resulting data from the query execution
 * @typeParam execution_time - Time taken to execute the query in milliseconds
 * @typeParam logs - Logs from the query execution
 */
export interface QueryExecutionResult {
  result: JSONValue;
  execution_time: number;
  logs: string[];
}
