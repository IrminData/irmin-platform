import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { LogEvent } from '@/types/core/Log';

import { exampleWorkflows } from '.';
import { workspaceUsers } from './users';

/**
 * Example log events for testing
 * {@link LogEvent}
 */
export const logEvents: () => LogEvent[] = () => [
  {
    id: 'log-event-1',
    type: 'CREATE',
    description: 'Created a new workflow.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[0],
    workflow: exampleWorkflows[0],
  },
  {
    id: 'log-event-2',
    type: 'UPDATE',
    description: 'Updated a workflow.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[1],
    workflow: exampleWorkflows[1],
  },
  {
    id: 'log-event-3',
    type: 'DELETE',
    description: 'Deleted a workflow.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[2],
    workflow: exampleWorkflows[2],
  },
  {
    id: 'log-event-4',
    type: 'LOGIN',
    description: 'Logged in.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[3],
  },
  {
    id: 'log-event-5',
    type: 'LOGOUT',
    description: 'Logged out.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[4],
  },
  {
    id: 'log-event-6',
    type: 'ERROR',
    description: 'An error occurred.',
    created_at: getRandomDateTimeString(20, 'past', 5),
  },
  {
    id: 'log-event-7',
    type: 'INFO',
    description: 'Informational message.',
    created_at: getRandomDateTimeString(20, 'past', 5),
  },
  {
    id: 'log-event-8',
    type: 'WARNING',
    description: 'Warning message.',
    created_at: getRandomDateTimeString(20, 'past', 5),
  },
  {
    id: 'log-event-9',
    type: 'CREATE',
    description: 'Created a new connection.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[0],
  },
  {
    id: 'log-event-10',
    type: 'UPDATE',
    description: 'Updated a connection.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[1],
  },
  {
    id: 'log-event-11',
    type: 'DELETE',
    description: 'Deleted a connection.',
    created_at: getRandomDateTimeString(20, 'past', 5),
    user: workspaceUsers()[2],
  },
];
