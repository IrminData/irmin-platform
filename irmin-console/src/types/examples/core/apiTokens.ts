import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { APIToken } from '@/types/core/APIToken';

/**
 * Get example API tokens
 *
 * Array of {@link APIToken}
 */
export const apiTokens: () => APIToken[] = () => [
  {
    id: 'token-1',
    name: 'My device',
    expiry: getRandomDateTimeString(10, 'future', 2),
    token: '1JElGIU01ePV6PAos52N3EtGb5EQyzM0FXNSWqcEmJvHyRE1e0',
    updated_at: getRandomDateTimeString(10, 'past', 2),
    created_at: getRandomDateTimeString(10, 'past', 2),
  },
  {
    id: 'token-2',
    name: 'API integration',
    expiry: getRandomDateTimeString(10, 'future', 2),
    token: '1VH12v8eWfqwV67BLRxmmU62Q114tK5urASU00V8b39b0FZ6J3',
    updated_at: getRandomDateTimeString(10, 'past', 2),
    created_at: getRandomDateTimeString(10, 'past', 2),
  },
  {
    id: 'token-3',
    name: 'AWS Lambda',
    expiry: getRandomDateTimeString(10, 'future', 2),
    token: 'aFZRS5ZfNia4kfy099hAJr8ezmrnV1inQdD4tq5PvMOowUWI2e',
    updated_at: getRandomDateTimeString(10, 'past', 2),
    created_at: getRandomDateTimeString(10, 'past', 2),
  },
  {
    id: 'token-4',
    name: 'Google Cloud Function',
    expiry: getRandomDateTimeString(10, 'future', 2),
    token: 'HQYbstsKLxs974pNioZuHFH9Fos2Sp2kKu78pbmVcNWuwpzo19',
    updated_at: getRandomDateTimeString(10, 'past', 2),
    created_at: getRandomDateTimeString(10, 'past', 2),
  },
  {
    id: 'token-5',
    name: 'Azure Function',
    expiry: getRandomDateTimeString(10, 'future', 2),
    token: 'fiKu132aBqwvuw5wk0UhFuhjFInYl9bHq5Wf22a24FswP0Qndh',
    updated_at: getRandomDateTimeString(10, 'past', 2),
    created_at: getRandomDateTimeString(10, 'past', 2),
  },
];
