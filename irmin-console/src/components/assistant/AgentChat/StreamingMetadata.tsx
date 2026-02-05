import { useMemo } from 'react';

import type { ToolUIPart } from 'ai';

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ui/ai-elements/tool';

import { useLocale } from '@/context/LocaleContext';

import type { ServerStreamEvent } from './types';
import { shouldHideTool } from './utils';

interface StreamingMetadataProps {
  streamingParts: ServerStreamEvent[];
}

interface ConsolidatedToolCall {
  toolName: string;
  toolCallId: string;
  state: ToolUIPart['state'];
  input?: ToolUIPart['input'];
  output?: string;
}

export const StreamingMetadata = ({
  streamingParts,
}: StreamingMetadataProps) => {
  const { dict } = useLocale();

  // Consolidate tool calls by toolCallId - single entry per tool call that updates
  const consolidatedToolCalls = useMemo(() => {
    const toolCallsMap = new Map<string, ConsolidatedToolCall>();

    for (const part of streamingParts) {
      if (
        part.type !== 'tool-input-available' &&
        part.type !== 'tool-output-available'
      ) {
        continue;
      }

      const toolCallId = part.toolCallId || `tool-${toolCallsMap.size}`;
      const toolName = part.toolName || '';

      // Skip hidden/internal tools early
      if (shouldHideTool(toolName)) {
        continue;
      }

      const existing = toolCallsMap.get(toolCallId);

      if (part.type === 'tool-input-available') {
        toolCallsMap.set(toolCallId, {
          toolName: toolName || existing?.toolName || 'unknown',
          toolCallId,
          state: existing?.output ? 'output-available' : 'input-available',
          input: part.input as ToolUIPart['input'],
          output: existing?.output,
        });
      } else if (part.type === 'tool-output-available') {
        // Format output as string for display
        const outputString =
          typeof part.output === 'string'
            ? part.output
            : JSON.stringify(part.output, null, 2);
        toolCallsMap.set(toolCallId, {
          toolName: toolName || existing?.toolName || 'unknown',
          toolCallId,
          state: 'output-available',
          input: existing?.input,
          output: outputString,
        });
      }
    }

    // Filter out any remaining hidden tools (e.g., if toolName was set from existing)
    return Array.from(toolCallsMap.values()).filter(
      (tc) => !shouldHideTool(tc.toolName)
    );
  }, [streamingParts]);

  // Render errors only
  const errorParts = streamingParts.filter(
    (p) => p.type === 'stream-error' || p.type === 'error'
  );

  if (consolidatedToolCalls.length === 0 && errorParts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Tool calls - consolidated by toolCallId, single entry per call */}
      {consolidatedToolCalls.length > 0 && (
        <div className='mt-4 space-y-2'>
          {consolidatedToolCalls.map((toolCall) => (
            <Tool key={toolCall.toolCallId} defaultOpen={false}>
              <ToolHeader
                type={`tool-${toolCall.toolName}`}
                state={toolCall.state}
              />
              <ToolContent>
                {toolCall.input !== undefined && (
                  <ToolInput input={toolCall.input} />
                )}
                {toolCall.output !== undefined && (
                  <ToolOutput output={toolCall.output} errorText={undefined} />
                )}
              </ToolContent>
            </Tool>
          ))}
        </div>
      )}

      {/* Errors only - no system messages or stream-complete */}
      {errorParts.map((part, index) => {
        const errorPart = part as { error?: string; content?: string };
        return (
          <div
            key={`streaming-error-${index}`}
            className={`
              mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm
              text-red-700
            `}
          >
            <div className='mb-1 font-medium'>{dict.assistant.error}</div>
            <div>{errorPart.error || errorPart.content}</div>
          </div>
        );
      })}
    </>
  );
};
