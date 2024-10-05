import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Query, QueryExecutionResult } from '@/types/core/Query';

import { exampleCollectionData, exampleWorkflowRunLogs } from '.';

/**
 * Example Query objects for testing
 * {@link Query}
 */
export const queries: () => Query[] = () => [
  {
    id: 'query_1',
    name: 'Query 1',
    description: 'This is the first query',
    content: 'SELECT * FROM table',
    type: 'sql',
    owner: 'user_1',
    stored: true,
    started_at: getRandomDateTimeString(500, 'past', 60),
    finished_at: getRandomDateTimeString(500, 'past', 60),
    execution_time: 1000,
    logs: [
      'This is an example log message',
      'This is another example log message',
      'This is yet another example log message',
    ],
  },
  {
    id: 'query_2',
    name: 'Query 2',
    description: 'This is the second query',
    content: 'SELECT * FROM table',
    type: 'sql',
    owner: 'user_2',
    stored: true,
    started_at: getRandomDateTimeString(500, 'past', 60),
    finished_at: getRandomDateTimeString(500, 'past', 60),
    execution_time: 1000,
    logs: [
      'This is an example log message',
      'This is another example log message',
      'This is yet another example log message',
    ],
  },
  {
    id: 'query_3',
    name: 'Query 3',
    description: 'This is the third query',
    content: 'SELECT * FROM table',
    type: 'sql',
    owner: 'user_3',
    stored: true,
    started_at: getRandomDateTimeString(500, 'past', 60),
    finished_at: getRandomDateTimeString(500, 'past', 60),
    execution_time: 1000,
    logs: [
      'This is an example log message',
      'This is another example log message',
      'This is yet another example log message',
    ],
  },
];

/**
 * Example Query Execution Result object for testing
 * {@link QueryExecutionResult}
 *
 * @param type - (optional) Type of the query execution result
 */
export const queryExecutionResult = (
  type?: 'table' | 'file' | 'folder'
): QueryExecutionResult => ({
  result: exampleCollectionData(type),
  execution_time: 1000,
  logs: exampleWorkflowRunLogs.logs,
});
