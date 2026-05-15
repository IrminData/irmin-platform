import { randomUUID } from 'crypto';
import { DynamicStructuredTool } from 'langchain';
import { z } from 'zod';

import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

import { QueryAgent } from '@/agents/query';

import { getContentAsString } from '@/utils/getContentAsString';

/**
 * Creates a sub-agent tool that delegates SQL/DuckDB authoring to the dedicated
 * query agent. The scripting agent uses this whenever a generated Go script
 * needs to embed a DuckDB query — rather than guessing SQL syntax itself, it
 * asks the query expert and inlines the returned statement verbatim.
 *
 * Calls QueryAgent.execute() directly with an ephemeral thread id instead of
 * going through AgentsManager. This avoids creating a user-visible row in the
 * conversations table and skips title generation for every internal call. The
 * LangGraph checkpointer state keyed by the ephemeral id is internal and not
 * surfaced in the UI.
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
    name: 'query_sql_assistant',
    description:
      'Delegate a DuckDB/SQL authoring question to the dedicated Irmin SQL ' +
      'expert agent. Use this whenever the script needs to embed a SQL ' +
      'query — do NOT guess DuckDB syntax or Irmin placeholder formats ' +
      'yourself. Pass the repository context from your own context so the ' +
      'SQL expert can resolve schemas. Inline the returned SQL verbatim ' +
      'inside the generated Go script.',
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
        const ephemeralThreadId = randomUUID();
        const response = await queryAgent.execute(
          {
            message: question,
            context,
            authToken,
            workspace,
            user,
          },
          ephemeralThreadId
        );

        const messages = response.messages ?? [];
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage
          ? getContentAsString(lastMessage.content)
          : '';

        // Strip markdown code fences if the query agent wrapped its SQL.
        // The scripting agent inlines this verbatim into a Go string literal,
        // so stray backticks would break compilation or escape the string.
        const cleaned = content
          .trim()
          .replace(/^```[a-zA-Z]*\n?/, '')
          .replace(/\n?```\s*$/, '')
          .trim();

        if (!cleaned) {
          return JSON.stringify({
            success: false,
            message: 'The SQL expert returned an empty response.',
          });
        }

        // The query agent's contract is "ONE SQL statement OR ONE
        // clarification paragraph." Detect which we got so the scripting
        // agent doesn't inline a clarification as if it were SQL. The
        // \b word boundary only applies to the keyword alternation —
        // `--` and `/*` are non-word characters and need no boundary.
        const SQL_STARTS_LINE =
          /^\s*(?:(?:SELECT|WITH|INSERT|UPDATE|DELETE|COPY|CREATE|DROP|ALTER)\b|--|\/\*)/i;

        const lines = cleaned.split('\n');
        const sqlStart = SQL_STARTS_LINE.test(cleaned)
          ? 0
          : lines.findIndex((line) => SQL_STARTS_LINE.test(line));

        if (sqlStart < 0) {
          // No SQL detected — this is a clarification request.
          return JSON.stringify({ success: false, clarification: cleaned });
        }

        return JSON.stringify({
          success: true,
          sql: extractSqlBlock(lines, sqlStart),
        });
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

/**
 * Trim trailing prose from a SQL block. The query agent's contract is one
 * SQL statement, so the LAST line ending with `;` marks the statement
 * terminator and anything after it is explanatory text the scripting agent
 * must not inline. Falls back to the first blank line if no terminator is
 * present, and finally to end-of-input.
 */
function extractSqlBlock(lines: string[], start: number): string {
  for (let i = lines.length - 1; i >= start; i--) {
    if (/;\s*$/.test(lines[i])) {
      return lines
        .slice(start, i + 1)
        .join('\n')
        .trim();
    }
  }
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      return lines.slice(start, i).join('\n').trim();
    }
  }
  return lines.slice(start).join('\n').trim();
}
