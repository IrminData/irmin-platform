/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toolCatalog } from './toolCatalog';

describe('tool catalog', () => {
  it('selects tools by capability rather than caller-known MCP names', () => {
    const tools = [
      { name: 'irmin_execute_sql' },
      { name: 'irmin_list_scripts' },
      { name: 'unknown' },
    ] as never;
    assert.deepEqual(
      toolCatalog
        .select(tools, ['query.execute', 'script.read'])
        .map((tool) => tool.name),
      ['irmin_execute_sql', 'irmin_list_scripts']
    );
  });
});
