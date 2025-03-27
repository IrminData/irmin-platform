import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { StoredQuery } from '@/types/core/StoredQuery';

import { exampleWorkspaceUsers } from '.';

/**
 * Example Query objects for testing
 * {@link StoredQuery}
 */
export const queries: () => StoredQuery[] = () => [
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
