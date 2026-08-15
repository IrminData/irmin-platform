/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toolCatalog } from './toolCatalog';

describe('tool catalog', () => {
  it('selects tools by capability rather than caller-known MCP names', () => {
    const tools = [
      {
        name: 'transport-name-can-change',
        metadata: { irminDescriptor: { capability: 'query.execute' } },
      },
      {
        name: 'another-transport-name',
        metadata: { irminDescriptor: { capability: 'script.read' } },
      },
      { name: 'unknown', metadata: {} },
    ] as never;
    assert.deepEqual(
      toolCatalog
        .select(tools, ['query.execute', 'script.read'])
        .map((tool) => tool.name),
      ['transport-name-can-change', 'another-transport-name']
    );
  });
});
