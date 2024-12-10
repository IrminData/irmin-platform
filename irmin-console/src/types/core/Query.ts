import { JSONValue } from '@/types/internal/GenericJSON';

import { IrminFileType } from './EditorItems';

/**
 * Query object interface
 */
export interface Query {
  /** Unique ID of the query */
  id: string;
  /** Name of the query */
  name: string;
  /** Description of the query */
  description: string;
  /** The query itself */
  content: string;
  /** The type of the query (e.g., `sql`, `js`, etc.) */
  type: IrminFileType;
  /** The ID of the user who created the query */
  owner: string;
  /** Whether the query results are stored in the system */
  stored: boolean;
  /** Timestamp when the query execution started */
  started_at: string;
  /** Timestamp when the query execution finished */
  finished_at: string;
  /** Time taken to execute the query in milliseconds */
  execution_time: number;
  /** Logs from the query execution */
  logs: string[];
}

/**
 * Query Execution Result
 */
export interface QueryExecutionResult {
  /** The resulting data from the query execution */
  result: JSONValue;
  /** Time taken to execute the query in milliseconds */
  execution_time: number;
  /** Logs from the query execution */
  logs: string[];
}
