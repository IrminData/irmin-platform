import { useMemo } from 'react';

import type { StoredMessage } from '@langchain/core/messages';
import type { ToolUIPart } from 'ai';

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/ai-elements/reasoning';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ui/ai-elements/tool';

import {
  getMessageContent,
  getMessageId,
  getMessageType,
} from './storedMessageHelpers';
import { shouldHideTool } from './utils';

/**
 * Format output string - if it's JSON, pretty-print it
 */
function formatToolOutput(output: string): string {
  if (!output) return output;

  // Try to parse as JSON and pretty-print
  const trimmed = output.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Not valid JSON, return as-is
    }
  }

  return output;
}

interface ConsolidatedToolMessagesProps {
  messages: StoredMessage[];
}

interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface ConsolidatedTool {
  toolCallId: string;
  toolName: string;
  state: ToolUIPart['state'];
  input?: Record<string, unknown>;
  output?: string;
}

/**
 * Extract tool call info from additional_kwargs.tool_calls
 */
function extractToolCallsFromMessage(message: StoredMessage): ToolCallInfo[] {
  const additionalKwargs = message.data?.additional_kwargs as
    Record<string, unknown> | undefined;
  const toolCalls = additionalKwargs?.tool_calls as
    | Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>
    | undefined;

  if (!toolCalls || !Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls
    .filter((tc) => tc.type === 'function')
    .map((tc) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        // Invalid JSON arguments
      }
      return {
        id: tc.id,
        name: tc.function.name,
        args,
      };
    });
}

/**
 * Consolidate tool_call and tool_result messages into unified tool displays.
 * Pairs tool calls with their results by tool_call_id.
 */
export const ConsolidatedToolMessages = ({
  messages,
}: ConsolidatedToolMessagesProps) => {
  const { reasoningMessages, consolidatedTools } = useMemo(() => {
    const reasoning: StoredMessage[] = [];
    const toolCallsMap = new Map<string, ConsolidatedTool>();

    for (const message of messages) {
      const messageType = getMessageType(message);

      if (messageType === 'reasoning') {
        reasoning.push(message);
        continue;
      }

      if (messageType === 'tool_call') {
        // Extract tool calls from the message
        const toolCalls = extractToolCallsFromMessage(message);
        for (const tc of toolCalls) {
          // Skip hidden/internal tools
          if (shouldHideTool(tc.name)) {
            continue;
          }
          const existing = toolCallsMap.get(tc.id);
          toolCallsMap.set(tc.id, {
            toolCallId: tc.id,
            toolName: tc.name,
            state: existing?.output ? 'output-available' : 'input-available',
            input: tc.args,
            output: existing?.output,
          });
        }
      }

      if (messageType === 'tool_result') {
        // Get tool_call_id and name from the tool result message
        const data = message.data as unknown as Record<string, unknown>;
        const toolCallId = data?.tool_call_id as string | undefined;
        const toolName = (data?.name as string) || 'result';
        const rawOutput = getMessageContent(message);
        const output = formatToolOutput(rawOutput);

        if (toolCallId) {
          const existing = toolCallsMap.get(toolCallId);
          toolCallsMap.set(toolCallId, {
            toolCallId,
            toolName: existing?.toolName || toolName,
            state: 'output-available',
            input: existing?.input,
            output,
          });
        } else {
          // No tool_call_id, render as standalone result
          const standaloneId = `standalone-${getMessageId(message)}`;
          toolCallsMap.set(standaloneId, {
            toolCallId: standaloneId,
            toolName,
            state: 'output-available',
            input: undefined,
            output,
          });
        }
      }
    }

    // Filter out hidden tools from the final list
    const visibleTools = Array.from(toolCallsMap.values()).filter(
      (tc) => !shouldHideTool(tc.toolName)
    );

    return {
      reasoningMessages: reasoning,
      consolidatedTools: visibleTools,
    };
  }, [messages]);

  if (reasoningMessages.length === 0 && consolidatedTools.length === 0) {
    return null;
  }

  return (
    <>
      {/* Reasoning messages */}
      {reasoningMessages.map((message) => (
        <div key={`reasoning-${getMessageId(message)}`} className='mt-4'>
          <Reasoning defaultOpen={false}>
            <ReasoningTrigger />
            <ReasoningContent>{getMessageContent(message)}</ReasoningContent>
          </Reasoning>
        </div>
      ))}

      {/* Consolidated tool calls */}
      {consolidatedTools.length > 0 && (
        <div className='mt-4 space-y-2'>
          {consolidatedTools.map((tool) => (
            <Tool key={tool.toolCallId} defaultOpen={false}>
              <ToolHeader type={`tool-${tool.toolName}`} state={tool.state} />
              <ToolContent>
                {tool.input !== undefined &&
                  Object.keys(tool.input).length > 0 && (
                    <ToolInput input={tool.input} />
                  )}
                {tool.output !== undefined && (
                  <ToolOutput output={tool.output} errorText={undefined} />
                )}
              </ToolContent>
            </Tool>
          ))}
        </div>
      )}
    </>
  );
};
