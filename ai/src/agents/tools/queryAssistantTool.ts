import { specialistRunner } from '@/agent-runtime/specialistRunner';
import { DynamicStructuredTool } from 'langchain';
import { z } from 'zod';

import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

import { QueryAgent } from '@/agents/query';

/**
 * Creates a sub-agent tool that delegates SQL/DuckDB authoring to the dedicated
 * query agent. The scripting agent uses this whenever a generated Go script
 * needs to embed a DuckDB query — rather than guessing SQL syntax itself, it
 * asks the query expert and inlines the returned statement verbatim.
 *
 * Calls QueryAgent.execute() directly without a checkpointer or user-visible
 * conversation. Internal specialist calls therefore leave no thread history.
 *
 * @param authToken - Bearer token forwarded to the query agent
 * @param workspace - The workspace the query agent should run inside
 * @param user - The calling user (forwarded for downstream API auth)
 * @returns A DynamicStructuredTool the scripting agent can invoke
 */
export function createQueryAssistantTool(
  authToken: string,
  workspace: Workspace,
  user: User
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'irmin_query_author',
    metadata: { irminCapability: 'query.author' },
    description:
      'Delegate a DuckDB/SQL authoring question to the dedicated Irmin SQL ' +
      'expert agent. Use this whenever you need a SQL query — do NOT guess ' +
      'DuckDB syntax or Irmin placeholder formats yourself. Pass the ' +
      'repository context from your own context so the SQL expert can ' +
      'resolve schemas. Inline the returned SQL verbatim in your output ' +
      '(directly in your response, or inside a Go script if generating one).',
    schema: z.object({
      question: z
        .string()
        .describe(
          'The SQL request in natural language. Be specific: include what ' +
            'the script needs the query to compute, what columns/filters ' +
            'apply, and the expected shape of the output.'
        ),
      repositorySlug: z
        .string()
        .optional()
        .describe('Repository the query should target, if known.'),
      repositoryObjectPath: z
        .string()
        .optional()
        .describe('Object path inside the repository, if known.'),
      repositoryRef: z
        .string()
        .optional()
        .describe('Branch, tag, or commit ref, if known.'),
      currentSql: z
        .string()
        .optional()
        .describe(
          'Any SQL already drafted that the expert should refine, if any.'
        ),
    }),
    func: async ({
      question,
      repositorySlug,
      repositoryObjectPath,
      repositoryRef,
      currentSql,
    }) => {
      try {
        const context: Record<string, unknown> = {};
        if (repositorySlug) context['repository-slug'] = repositorySlug;
        if (repositoryObjectPath)
          context['repository-object-path'] = repositoryObjectPath;
        if (repositoryRef) context['repository-ref'] = repositoryRef;
        if (currentSql) context['current-sql'] = currentSql;

        const queryAgent = new QueryAgent();
        const response = await queryAgent.execute(
          {
            message: question,
            context,
            authToken,
            workspace,
            user,
            persistConversation: false,
          },
          'specialist-query'
        );

        const result =
          response.specialistResult ?? specialistRunner.acceptSql(response);
        return JSON.stringify(
          result.kind === 'sql'
            ? { success: true, sql: result.sql }
            : {
                success: false,
                clarification:
                  result.kind === 'clarification'
                    ? result.message
                    : 'The SQL specialist returned an invalid result type.',
              }
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          message: `Failed to delegate to SQL expert: ${errorMessage}`,
        });
      }
    },
  });
}
