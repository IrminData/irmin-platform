import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Dashboard } from '@/types/api/Dashboard';

import { widgets } from './widgets';

/**
 * Get example dashboards
 *
 * Array of {@link Dashboard}
 *
 * @param last - If true, the items will avoid having children
 */
export const dashboards = (last = false): Dashboard[] => [
  {
    id: 0,
    name: 'Main Dashboard',
    widgets: !last ? widgets(true) : undefined,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'Financial Overview',
    widgets: !last ? widgets(true) : undefined,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'App Analytics',
    widgets: !last ? widgets(true) : undefined,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    name: 'Ad Campaign Performance',
    widgets: !last ? widgets(true) : undefined,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
