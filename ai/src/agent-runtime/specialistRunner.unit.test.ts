/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { specialistRunner } from './specialistRunner';
import { toolCatalog } from './toolCatalog';

describe('specialist runner', () => {
  it('accepts only SQL with successful execution evidence', () => {
    toolCatalog.select(
      [
        {
          name: 'irmin_query_execute_sql',
          metadata: {
            irminDescriptor: { capability: 'query.execute' },
          },
        },
      ] as never,
      ['query.execute']
    );
    const sql = specialistRunner.acceptSql({
      messages: [
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: 'call-1',
              name: 'irmin_query_execute_sql',
              args: { sql: 'SELECT 1;' },
            },
          ],
        }),
        new ToolMessage({
          content: '{"success":true}',
          tool_call_id: 'call-1',
          name: 'irmin_query_execute_sql',
          status: 'success',
        }),
        new AIMessage('SELECT 1;'),
      ],
    });
    assert.deepEqual(sql, { kind: 'sql', sql: 'SELECT 1;' });

    assert.equal(
      specialistRunner.acceptSql({
        messages: [new AIMessage('SELECT 1;')],
      }).kind,
      'clarification'
    );

    assert.equal(
      specialistRunner.acceptSql({
        messages: [
          new AIMessage({
            content: '',
            tool_calls: [
              {
                id: 'call-2',
                name: 'irmin_query_execute_sql',
                args: { sql: 'SELECT 1;' },
              },
            ],
          }),
          new ToolMessage({
            content: '{"success":true}',
            tool_call_id: 'call-2',
            name: 'irmin_query_execute_sql',
            status: 'success',
          }),
          new AIMessage('SELECT 2;'),
        ],
      }).kind,
      'clarification'
    );
  });

  it('rejects SQL changed after an earlier successful execution', () => {
    const result = specialistRunner.acceptSql({
      messages: [
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: 'call-a',
              name: 'irmin_query_execute_sql',
              args: { sql: 'SELECT 1;' },
            },
          ],
        }),
        new ToolMessage({
          content: '{"success":true}',
          tool_call_id: 'call-a',
          name: 'irmin_query_execute_sql',
          status: 'success',
        }),
        new AIMessage('SELECT 2;'),
      ],
    });
    assert.equal(result.kind, 'clarification');
  });

  it('formats and compiles Go before accepting it', async () => {
    const result = await specialistRunner.acceptGo({
      messages: [
        new AIMessage(
          'package main\nimport "fmt"\nfunc main(){fmt.Println("ok")}'
        ),
      ],
    });
    assert.equal(result.kind, 'go');
    if (result.kind === 'go') assert.match(result.code, /func main\(\) \{/);

    const unsupported = await specialistRunner.acceptGo({
      messages: [
        new AIMessage(
          'package main\nimport "example.com/unreviewed"\nfunc main(){}'
        ),
      ],
    });
    assert.equal(unsupported.kind, 'clarification');
  });
});
