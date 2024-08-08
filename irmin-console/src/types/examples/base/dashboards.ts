import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Dashboard } from '@/types/api/Dashboard';

import { exampleWidgets } from '.';

/**
 * Example dashboards
 *
 * Array of {@link Dashboard}
 */
export const dashboards: Dashboard[] = [
  {
    id: 0,
    name: 'Main Dashboard',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'Financial Overview',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'App Analytics',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    name: 'Ad Campaign Performance',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
