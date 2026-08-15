import { specialistRunner } from '@/agent-runtime/specialistRunner';
import { DynamicStructuredTool } from 'langchain';
import { z } from 'zod';

import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

import { ScriptingAgent } from '@/agents/scripting';

/**
 * Creates a sub-agent tool that delegates Go script authoring to the dedicated
 * scripting agent. The assistant agent uses this whenever a user needs a Go
 * script for the Irmin compute sandbox — rather than guessing Irmin SDK
 * conventions itself, it asks the scripting expert and surfaces the returned
 * script verbatim.
 *
 * Calls ScriptingAgent.execute() directly without a checkpointer or user-visible
 * conversation. Internal specialist calls therefore leave no thread history.
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
    func: async (
      {
        question,
        repositorySlug,
        repositoryObjectPath,
        repositoryRef,
        currentScript,
      },
      _runManager,
      config
    ) => {
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
        const response = await scriptingAgent.execute(
          {
            message: question,
            context,
            authToken,
            workspace,
            user,
            persistConversation: false,
            signal: config?.signal,
          },
          'specialist-scripting'
        );

        const result =
          response.specialistResult ??
          (await specialistRunner.acceptGo(response));
        return JSON.stringify(
          result.kind === 'go'
            ? { success: true, script: result.code }
            : {
                success: false,
                clarification:
                  result.kind === 'clarification'
                    ? result.message
                    : 'The scripting specialist returned an invalid result type.',
              }
        );
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
