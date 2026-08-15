/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('tools service canonical catalog', () => {
  it('attaches registry descriptors to transport tools', async () => {
    process.env.AI_API_SYSTEM_TOKEN = 'test-system-token';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.LANGSMITH_API_KEY = 'test-langsmith-key';
    const { toolsService } = await import('./tools');
    const queryTool = { name: 'renamable-query-tool', metadata: {} };
    const destructiveTool = {
      name: 'irmin_repository_object_delete',
      metadata: {},
    };
    const catalogTool = {
      name: 'irmin_tool_catalog_list',
      metadata: {},
      invoke: async () => ({
        artifact: [
          {
            type: 'mcp_structured_content',
            data: {
              data: [
                {
                  name: 'renamable-query-tool',
                  capability: 'query.execute',
                  catalog_version: 1,
                  risk: 'write',
                },
                {
                  name: 'irmin_repository_object_delete',
                  capability: 'repository.destructive',
                  catalog_version: 1,
                  risk: 'destructive',
                },
              ],
            },
          },
        ],
      }),
    };
    const client = {
      getTools: async () => [queryTool, destructiveTool, catalogTool],
    };

    const tools = await toolsService.getTools(client as never);
    assert.deepEqual(tools[0]?.metadata?.irminDescriptor, {
      name: 'renamable-query-tool',
      capability: 'query.execute',
      catalog_version: 1,
      risk: 'write',
    });
    assert.equal(
      tools.some((tool) => tool.name === destructiveTool.name),
      false,
      'destructive tools must remain unavailable until approval replay exists'
    );
  });
});
