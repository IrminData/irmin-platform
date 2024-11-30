import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Query, QueryExecutionResult } from '@/types/core/Query';

import { exampleWorkflowRunLogs } from '.';

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
 */
export const queryExecutionResult = (): QueryExecutionResult => ({
  result: [
    {
      city: 'New York',
      country: 'USA',
      population: 8175133,
    },
    {
      city: 'Los Angeles',
      country: 'USA',
      population: 3792621,
    },
    {
      city: 'Chicago',
      country: 'USA',
      population: 2695598,
    },
    {
      city: 'Houston',
      country: 'USA',
      population: 2100263,
    },
    {
      city: 'Phoenix',
      country: 'USA',
      population: 1445632,
    },
    {
      city: 'Philadelphia',
      country: 'USA',
      population: 1526006,
    },
    {
      city: 'San Antonio',
      country: 'USA',
      population: 1327407,
    },
    {
      city: 'San Diego',
      country: 'USA',
      population: 1307402,
    },
    {
      city: 'Dallas',
      country: 'USA',
      population: 1197816,
    },
    {
      city: 'San Jose',
      country: 'USA',
      population: 945942,
    },
  ],
  execution_time: 1000,
  logs: exampleWorkflowRunLogs.logs,
});
