import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AgentResponseSchema } from './agents';

describe('agent response boundary', () => {
  it('returns typed specialist results without provider message structures', () => {
    const parsed = AgentResponseSchema.parse({
      conversationId: 'conversation-1',
      specialistResult: { kind: 'sql', sql: 'SELECT 1' },
      messages: [{ additional_kwargs: { reasoning_content: 'private' } }],
    });

    assert.deepEqual(parsed, {
      conversationId: 'conversation-1',
      specialistResult: { kind: 'sql', sql: 'SELECT 1' },
    });
  });
});
