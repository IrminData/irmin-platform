import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Repository } from '@/types/core/Repository';

import { workspaceUsers } from './users';

/**
 * Get example Repositories
 *
 * Array of {@link Repository}
 */
export const repositories = (): Repository[] => [
  {
    id: '1',
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    description:
      'This is an example of a Repository that has been created by the Google Analytics Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    owner: workspaceUsers()[0],
    is_immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '2',
    name: 'App data',
    slug: 'app-data',
    description:
      'This is an example of a Repository that has been created by an Action Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    owner: workspaceUsers()[1],
    is_immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '3',
    name: 'Excel KPIs',
    slug: 'kpis-from-excel',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    owner: workspaceUsers()[2],
    is_immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '4',
    name: 'Management data from Excel',
    slug: 'management-data-from-excel',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    is_immutable: false,
    owner: workspaceUsers()[3],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '5',
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    is_immutable: false,
    owner: workspaceUsers()[0],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '6',
    name: 'Top 100 Ad Clicking Users',
    slug: 'top-100-ad-clicking-users',
    description: '',
    documentation: '',
    is_immutable: false,
    owner: workspaceUsers()[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
