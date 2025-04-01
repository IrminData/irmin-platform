import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { QueryResult, StoredQuery } from '@/types/core/StoredQuery';

import { exampleWorkspaceUsers } from '.';

/**
 * Example Query objects for testing
 * {@link StoredQuery}
 */
export const queries = (): StoredQuery[] => [
  {
    id: 'query_1',
    name: 'Identify underperforming locations',
    description: 'Retrieve stores where annual costs exceed annual revenue',
    sql: `
      SELECT store_id, city, country, annual_revenue, annual_cost
      FROM store_locations
      WHERE annual_cost > annual_revenue
      ORDER BY (annual_cost - annual_revenue) DESC;
    `,
    owner: exampleWorkspaceUsers[0],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(500, 'past', 60),
  },
];

const exampleQueryResult = {
  columns: ['store_id', 'city', 'country', 'annual_revenue', 'annual_cost'],
  data: [
    {
      store_id: 'store_1',
      city: 'New York',
      country: 'USA',
      annual_revenue: 500000,
      annual_cost: 600000,
    },
    {
      store_id: 'store_2',
      city: 'Los Angeles',
      country: 'USA',
      annual_revenue: 300000,
      annual_cost: 400000,
    },
  ],
  has_errors: false,
  duration: 120,
  started_at: '2023-10-01T12:00:00Z',
  finished_at: '2023-10-01T12:00:02Z',
  logs: ['Query executed successfully', 'Rows returned: 2'],
};

const exampleQueryResultWithErrors = {
  columns: ['store_id', 'city', 'country', 'annual_revenue', 'annual_cost'],
  data: [],
  has_errors: true,
  duration: 150,
  started_at: '2023-10-01T12:00:00Z',
  finished_at: '2023-10-01T12:00:02Z',
  logs: [
    'Query execution failed',
    'Error: Invalid SQL syntax near "WHERE annual_cost > annual_revenue"',
  ],
};

export const queryResult = (): QueryResult => {
  const random = Math.random();

  if (random < 0.5) {
    return exampleQueryResult;
  } else {
    return exampleQueryResultWithErrors;
  }
};
