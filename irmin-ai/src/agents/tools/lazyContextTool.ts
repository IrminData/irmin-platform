import IrminCore from '@/irmin-api';
import { DynamicStructuredTool } from 'langchain';
import { z } from 'zod';

/**
 * Creates a lazy context loading tool that fetches Irmin API data on-demand.
 *
 * This tool allows the agent to request context (connection, workflow, repository,
 * scripts, etc.) only when needed, rather than loading everything upfront.
 * This significantly reduces initial response latency.
 *
 * @param authToken - Bearer token for API authentication
 * @param workspaceSlug - The workspace slug to fetch context from
 * @returns A DynamicStructuredTool for on-demand context loading
 */
export function createLazyContextTool(
  authToken: string,
  workspaceSlug: string
): DynamicStructuredTool {
  const irmin = new IrminCore(authToken);

  return new DynamicStructuredTool({
    name: 'irmin_get_context',
    description:
      'Fetches detailed context about Irmin resources on demand. ' +
      'Use this when you need specific information about a connection, workflow, ' +
      'repository, script, or object schema. ' +
      'This is more efficient than having all context loaded upfront.',
    schema: z.object({
      contextType: z
        .enum([
          'connection',
          'workflow',
          'repository',
          'script',
          'object_schema',
          'stored_query',
        ])
        .describe('The type of context to fetch'),
      id: z
        .string()
        .describe(
          'The ID or slug of the resource (e.g., connection ID, repository slug, script ID)'
        ),
      additionalParams: z
        .object({
          objectPath: z
            .string()
            .optional()
            .describe('For object_schema: the path within the repository'),
          ref: z
            .string()
            .optional()
            .describe(
              'For object_schema: the branch/tag reference (defaults to main branch)'
            ),
        })
        .optional()
        .describe('Additional parameters for specific context types'),
    }),
    func: async ({ contextType, id, additionalParams }) => {
      try {
        switch (contextType) {
          case 'connection': {
            const res = await irmin.connectionService.fetchConnection({
              workspace: workspaceSlug,
              connectionID: id,
            });
            if (res.data) {
              return JSON.stringify({
                success: true,
                type: 'connection',
                data: res.data,
              });
            }
            return JSON.stringify({
              success: false,
              message: `Connection ${id} not found`,
            });
          }

          case 'workflow': {
            const res = await irmin.workflowService.fetchWorkflow({
              workspace: workspaceSlug,
              workflowID: id,
            });
            if (res.data) {
              return JSON.stringify({
                success: true,
                type: 'workflow',
                data: res.data,
              });
            }
            return JSON.stringify({
              success: false,
              message: `Workflow ${id} not found`,
            });
          }

          case 'repository': {
            const res = await irmin.repositoryService.fetchRepository({
              workspace: workspaceSlug,
              slug: id,
            });
            if (res.data) {
              return JSON.stringify({
                success: true,
                type: 'repository',
                data: res.data,
              });
            }
            return JSON.stringify({
              success: false,
              message: `Repository ${id} not found`,
            });
          }

          case 'script': {
            const res = await irmin.scriptService.getScript({
              workspace: workspaceSlug,
              scriptId: id,
            });
            if (res.data) {
              return JSON.stringify({
                success: true,
                type: 'script',
                data: {
                  scriptId: id,
                  name: res.data.name,
                  content: res.data.content,
                },
              });
            }
            return JSON.stringify({
              success: false,
              message: `Script ${id} not found`,
            });
          }

          case 'object_schema': {
            const objectPath = additionalParams?.objectPath || '';
            const ref = additionalParams?.ref;
            const res = await irmin.objectService.getObjectSchema({
              workspace: workspaceSlug,
              repository: id,
              path: objectPath,
              ref,
            });
            if (res.data) {
              return JSON.stringify({
                success: true,
                type: 'object_schema',
                data: res.data,
              });
            }
            return JSON.stringify({
              success: false,
              message: `Object schema for ${id}/${objectPath} not found`,
            });
          }

          case 'stored_query': {
            const res = await irmin.queryService.getStoredQuery({
              workspace: workspaceSlug,
              queryID: id,
            });
            if (res.data) {
              return JSON.stringify({
                success: true,
                type: 'stored_query',
                data: res.data,
              });
            }
            return JSON.stringify({
              success: false,
              message: `Stored query ${id} not found`,
            });
          }

          default:
            return JSON.stringify({
              success: false,
              message: `Unknown context type: ${contextType}`,
            });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          message: `Failed to fetch ${contextType}: ${errorMessage}`,
        });
      }
    },
  });
}

/**
 * Creates a batch context loading tool for fetching multiple resources at once.
 *
 * @param authToken - Bearer token for API authentication
 * @param workspaceSlug - The workspace slug to fetch context from
 * @returns A DynamicStructuredTool for batch context loading
 */
export function createBatchContextTool(
  authToken: string,
  workspaceSlug: string
): DynamicStructuredTool {
  const irmin = new IrminCore(authToken);

  return new DynamicStructuredTool({
    name: 'irmin_get_batch_context',
    description:
      'Fetches multiple Irmin resources in a single call. ' +
      'More efficient than multiple individual calls when you need several resources.',
    schema: z.object({
      requests: z
        .array(
          z.object({
            type: z.enum([
              'connection',
              'workflow',
              'repository',
              'script',
              'stored_query',
            ]),
            id: z.string(),
          })
        )
        .max(10)
        .describe('Array of resources to fetch (max 10)'),
    }),
    func: async ({ requests }) => {
      const results = await Promise.all(
        requests.map(async (request: { type: string; id: string }) => {
          const { type, id } = request;
          try {
            switch (type) {
              case 'connection': {
                const res = await irmin.connectionService.fetchConnection({
                  workspace: workspaceSlug,
                  connectionID: id,
                });
                return { type, id, success: !!res.data, data: res.data };
              }
              case 'workflow': {
                const res = await irmin.workflowService.fetchWorkflow({
                  workspace: workspaceSlug,
                  workflowID: id,
                });
                return { type, id, success: !!res.data, data: res.data };
              }
              case 'repository': {
                const res = await irmin.repositoryService.fetchRepository({
                  workspace: workspaceSlug,
                  slug: id,
                });
                return { type, id, success: !!res.data, data: res.data };
              }
              case 'script': {
                const res = await irmin.scriptService.getScript({
                  workspace: workspaceSlug,
                  scriptId: id,
                });
                return {
                  type,
                  id,
                  success: !!res.data,
                  data: res.data
                    ? {
                        scriptId: id,
                        name: res.data.name,
                        content: res.data.content,
                      }
                    : null,
                };
              }
              case 'stored_query': {
                const res = await irmin.queryService.getStoredQuery({
                  workspace: workspaceSlug,
                  queryID: id,
                });
                return { type, id, success: !!res.data, data: res.data };
              }
              default:
                return { type, id, success: false, error: 'Unknown type' };
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            return { type, id, success: false, error: errorMessage };
          }
        })
      );

      return JSON.stringify({
        success: true,
        results,
        fetchedCount: results.filter((r) => r.success).length,
        totalRequested: requests.length,
      });
    },
  });
}
