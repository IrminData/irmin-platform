/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contextAssembler } from './contextAssembler';

describe('context assembler', () => {
  it('uses deterministic keys and provenance labels', () => {
    const result = contextAssembler.assemble('assistant', {
      workflow: 'trusted workspace response',
      'current-sql': 'select 1',
      irmin_documentation: 'docs',
    });
    const metadata = result._irmin_context as {
      provenance: Array<{ key: string; trust: string }>;
    };
    assert.deepEqual(
      metadata.provenance.map(({ key, trust }) => [key, trust]),
      [
        ['current-sql', 'user-provided'],
        ['irmin_documentation', 'trusted-system'],
        ['workflow', 'workspace-data'],
      ]
    );
  });

  it('summarizes oversized retrieved context deterministically', () => {
    const value = 'x'.repeat(300_000);
    const first = contextAssembler.assemble('assistant', {
      irmin_documentation: value,
    });
    const second = contextAssembler.assemble('assistant', {
      irmin_documentation: value,
    });
    assert.deepEqual(first, second);
    assert.match(String(first.irmin_documentation), /context summarized/);
  });
});
