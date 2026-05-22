import { randomUUID } from 'crypto';
import { DynamicStructuredTool } from 'langchain';
import { z } from 'zod';

import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

import { ScriptingAgent } from '@/agents/scripting';

import { getContentAsString } from '@/utils/getContentAsString';

// Lines that begin a Go source file. `package`/`import`/`func` are the
// definitive signals; `//` and `/*` cover leading comment headers (license,
// doc block) that may precede the package declaration.
const GO_STARTS_LINE =
  /^\s*(?:package\s+\w+|import\s*[("]|func\s+\w+|\/\/|\/\*)/;

// Real Go keyword patterns — `//` and `/*` comment markers alone are not
// reliable because they're common in English prose (e.g. "// For example...").
// Require a real Go keyword to be present before treating the response as Go.
const GO_KEYWORD = /^\s*(?:package\s+\w+|import\s*[("]|func\s+\w+)/;

/**
 * Scans backwards from the end of the response to trim trailing explanatory
 * prose that the
 * scripting agent may have appended after the Go code.  The last top-level `}`
 * on its own line is the natural end of a Go file — anything after it is
 * explanatory text that the assistant must not inline.
 *
 * Falls back to returning everything from `start` onwards when no closing
 * brace is found (the agent may have returned a bare snippet rather than a
 * complete source file).
 */
function extractGoBlock(lines: string[], start: number): string {
  for (let i = lines.length - 1; i >= start; i--) {
    if (/^\s*\}\s*$/.test(lines[i])) {
      return lines.slice(start, i + 1).join('\n');
    }
  }
  return lines.slice(start).join('\n');
}

/**
 * Creates a sub-agent tool that delegates Go script authoring to the dedicated
 * scripting agent. The assistant agent uses this whenever a user needs a Go
 * script for the Irmin compute sandbox — rather than guessing Irmin SDK
 * conventions itself, it asks the scripting expert and surfaces the returned
 * script verbatim.
 *
 * Calls ScriptingAgent.execute() directly with an ephemeral thread id instead
 * of going through AgentsManager. This avoids creating a user-visible row in
 * the conversations table and skips title generation for every internal call.
 *
 * @param authToken - Bearer token forwarded to the scripting agent
 * @param workspace - The workspace the scripting agent should run inside
 * @param user - The calling user (forwarded for downstream API auth)
 * @returns A DynamicStructuredTool the assistant agent can invoke
 */
export function createScriptingAssistantTool(
  authToken: string,
  workspace: Workspace,
  user: User
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'scripting_assistant',
    description:
      'Delegate a Go script authoring task to the dedicated Irmin Scripting ' +
      'expert agent. Use this whenever the user needs a runnable Go script ' +
      'for the Irmin compute sandbox — do NOT guess Irmin SDK conventions, ' +
      'imports, or workflow integration patterns yourself. Pass any known ' +
      'repository context (slug, object path, ref) so the scripting expert ' +
      'can resolve schemas and SDK usage. Inline the returned Go code ' +
      'verbatim inside a fenced code block; do not rewrite, abbreviate, or ' +
      '"tidy" it.',
    schema: z.object({
      question: z
        .string()
        .describe(
          'The scripting request in natural language. Be specific: include ' +
            'what the script should do, its inputs/outputs, and any ' +
            'repositories or objects it should operate on.'
        ),
      repositorySlug: z
        .string()
        .optional()
        .describe('Repository the script should target, if known.'),
      repositoryObjectPath: z
        .string()
        .optional()
        .describe('Object path inside the repository, if known.'),
      repositoryRef: z
        .string()
        .optional()
        .describe('Branch, tag, or commit ref, if known.'),
      currentScript: z
        .string()
        .optional()
        .describe(
          'Any Go code already drafted that the expert should refine, if any.'
        ),
    }),
    func: async ({
      question,
      repositorySlug,
      repositoryObjectPath,
      repositoryRef,
      currentScript,
    }) => {
      try {
        const context: Record<string, unknown> = {
          // Required by the ScriptingAgent's config: the agent needs to know
          // what script file (with extension) is being worked on.
          'script-name': 'irmin-script.go',
        };
        if (repositorySlug) context['repository-slug'] = repositorySlug;
        if (repositoryObjectPath)
          context['repository-object-path'] = repositoryObjectPath;
        if (repositoryRef) context['repository-ref'] = repositoryRef;
        if (currentScript) context['current-script-content'] = currentScript;

        const scriptingAgent = new ScriptingAgent();
        const ephemeralThreadId = randomUUID();
        const response = await scriptingAgent.execute(
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

        // Strip markdown code fences if the scripting agent wrapped its Go
        // code. The assistant inlines this verbatim, so stray backticks
        // would confuse downstream rendering or copy-paste workflows.
        const cleaned = content
          .trim()
          .replace(/^```[a-zA-Z]*\n?/, '')
          .replace(/\n?```\s*$/, '')
          .trim();

        if (!cleaned) {
          return JSON.stringify({
            success: false,
            message: 'The scripting expert returned an empty response.',
          });
        }

        // The scripting agent's contract is "ONE Go script OR ONE
        // clarification paragraph." Detect which we got so the assistant
        // doesn't surface a clarification as if it were code. If the very
        // first line isn't Go, scan line-by-line — the agent occasionally
        // emits a short preamble before the actual code.
        //
        // NOTE: `//` and `/*` comment markers alone are not reliable Go
        // signals — they're common in English prose (e.g. "// For
        // example..."). Require a real Go keyword (`package`/`import`/`func`)
        // somewhere in the response before treating it as Go code.
        const lines = cleaned.split('\n');
        const hasGoKeywords =
          GO_KEYWORD.test(cleaned) || lines.some((l) => GO_KEYWORD.test(l));

        if (!hasGoKeywords) {
          return JSON.stringify({ success: false, clarification: cleaned });
        }

        const goStart = GO_STARTS_LINE.test(cleaned)
          ? 0
          : lines.findIndex((line) => GO_STARTS_LINE.test(line));

        if (goStart < 0) {
          return JSON.stringify({ success: false, clarification: cleaned });
        }

        const script = extractGoBlock(lines, goStart);
        return JSON.stringify({ success: true, script });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          message: `Failed to delegate to scripting expert: ${errorMessage}`,
        });
      }
    },
  });
}
