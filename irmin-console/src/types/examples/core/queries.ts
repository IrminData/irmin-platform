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
    name: 'Identify underperforming stores',
    description: 'Retrieve stores where annual costs exceed annual revenue',
    content: `
      SELECT store_id, city, country, annual_revenue, annual_cost
      FROM store_locations
      WHERE annual_cost > annual_revenue
      ORDER BY (annual_cost - annual_revenue) DESC;
    `,
    type: 'sql',
    owner: 'user_1',
    stored: true,
    started_at: getRandomDateTimeString(500, 'past', 60),
    finished_at: getRandomDateTimeString(500, 'past', 60),
    execution_time: 1120,
    logs: [
      'Query started execution',
      'No syntax errors detected',
      'Query returned 12 rows',
      'Query completed successfully',
    ],
  },
  {
    id: 'query_2',
    name: 'Locate profitable outlets',
    description: 'Find stores that are generating more revenue than costs',
    content: `
      SELECT store_id, city, country, annual_revenue, annual_cost
      FROM store_locations
      WHERE annual_revenue > annual_cost
      ORDER BY annual_revenue DESC;
    `,
    type: 'sql',
    owner: 'user_2',
    stored: true,
    started_at: getRandomDateTimeString(500, 'past', 60),
    finished_at: getRandomDateTimeString(500, 'past', 60),
    execution_time: 945,
    logs: [
      'Query started execution',
      'Index applied on annual_revenue column',
      'Query returned 30 rows',
      'Query completed successfully',
    ],
  },
  {
    id: 'query_3',
    name: 'Identify high foot traffic locations',
    description:
      'List stores with foot traffic exceeding 50,000 visitors per month',
    content: `
      SELECT store_id, city, country, foot_traffic
      FROM store_locations
      WHERE foot_traffic > 50000
      ORDER BY foot_traffic DESC;
    `,
    type: 'sql',
    owner: 'user_3',
    stored: true,
    started_at: getRandomDateTimeString(500, 'past', 60),
    finished_at: getRandomDateTimeString(500, 'past', 60),
    execution_time: 1060,
    logs: [
      'Query started execution',
      'Index used for foot_traffic column',
      'Query returned 7 rows',
      'Query completed successfully',
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
  execution_time: 984,
  logs: exampleWorkflowRunLogs.logs,
});
