import { useMemo } from 'react';

import type { StoredMessage } from '@langchain/core/messages';

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/ai-elements/reasoning';
import {
  Task,
  TaskContent,
  TaskTrigger,
} from '@/components/ui/ai-elements/task';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ui/ai-elements/tool';

import { useLocale } from '@/context/LocaleContext';

import { getMessageMetadata, getMessageRole } from './storedMessageHelpers';
import {
  isIterationsNumber,
  isServerToolEvent,
  isServerToolEventsArray,
  isStoredToolCall,
  isStoredToolCallsArray,
  isThinkingStepsArray,
  shouldHideTool,
} from './utils';

interface MessageMetadataProps {
  message: StoredMessage;
  agentId: string;
  hasStoredToolMessages?: boolean;
  /** Which section to render: 'thinking' (before content), 'tools' (after content), or 'all' (default) */
  section?: 'thinking' | 'tools' | 'all';
}

export const MessageMetadata = ({
  message,
  hasStoredToolMessages = false,
  section = 'all',
}: MessageMetadataProps) => {
  const { dict } = useLocale();

  const role = getMessageRole(message);
  const metadata = getMessageMetadata(message);

  // Consolidate and filter tool calls - must be before early return
  const consolidatedToolCalls = useMemo(() => {
    if (!metadata) return [];

    if (
      hasStoredToolMessages ||
      ((!isStoredToolCallsArray(metadata.toolCalls) ||
        metadata.toolCalls.length === 0) &&
        (!isServerToolEventsArray(metadata.toolCalls) ||
          metadata.toolCalls.length === 0))
    ) {
      return [];
    }

    // For server tool events, consolidate by toolCallId
    if (isServerToolEventsArray(metadata.toolCalls)) {
      const toolCallsMap = new Map<
        string,
        {
          toolCallId: string;
          toolName: string;
          state: 'input-available' | 'output-available';
          input?: Record<string, unknown>;
          output?: string;
        }
      >();

      for (const event of metadata.toolCalls) {
        if (!isServerToolEvent(event)) continue;

        const toolCallId = event.toolCallId || `tool-${toolCallsMap.size}`;
        const toolName = event.toolName || '';

        // Skip hidden tools
        if (shouldHideTool(toolName)) continue;

        const existing = toolCallsMap.get(toolCallId);

        if (event.type === 'tool-input-available') {
          toolCallsMap.set(toolCallId, {
            toolCallId,
            toolName: toolName || existing?.toolName || 'unknown',
            state: existing?.output ? 'output-available' : 'input-available',
            input: event.input as Record<string, unknown>,
            output: existing?.output,
          });
        } else if (event.type === 'tool-output-available') {
          toolCallsMap.set(toolCallId, {
            toolCallId,
            toolName: toolName || existing?.toolName || 'unknown',
            state: 'output-available',
            input: existing?.input,
            output:
              typeof event.output === 'string'
                ? event.output
                : JSON.stringify(event.output, null, 2),
          });
        }
      }

      return Array.from(toolCallsMap.values()).filter(
        (tc) => !shouldHideTool(tc.toolName)
      );
    }

    // For stored tool calls, just filter
    if (isStoredToolCallsArray(metadata.toolCalls)) {
      return metadata.toolCalls.filter(
        (tc) => isStoredToolCall(tc) && !shouldHideTool(tc.name)
      );
    }

    return [];
  }, [metadata, hasStoredToolMessages]);

  if (role !== 'assistant' || !metadata) {
    return null;
  }

  const thinkingElement =
    isThinkingStepsArray(metadata.thinkingSteps) &&
    metadata.thinkingSteps.length > 0 ? (
      <div className='mb-4 space-y-2'>
        {metadata.thinkingSteps.map((step: string, index: number) => (
          <Reasoning
            key={`thinking-${message.data?.id || message.type}-${step.slice(0, 20)}-${index}`}
            defaultOpen={false}
          >
            <ReasoningTrigger />
            <ReasoningContent>{step}</ReasoningContent>
          </Reasoning>
        ))}
      </div>
    ) : null;

  const toolCallsElement =
    consolidatedToolCalls.length === 0 ? null : (
      <div className='mt-4 space-y-2'>
        {consolidatedToolCalls.map((toolCall, index) => {
          // Check if it's a consolidated server tool event
          if ('toolCallId' in toolCall && 'toolName' in toolCall) {
            const tc = toolCall as {
              toolCallId: string;
              toolName: string;
              state: 'input-available' | 'output-available';
              input?: Record<string, unknown>;
              output?: string;
            };
            return (
              <Tool
                key={`tool-${message.data?.id || message.type}-${tc.toolCallId}`}
                defaultOpen={false}
              >
                <ToolHeader type={`tool-${tc.toolName}`} state={tc.state} />
                <ToolContent>
                  {tc.input && <ToolInput input={tc.input} />}
                  {tc.output && (
                    <ToolOutput output={tc.output} errorText={undefined} />
                  )}
                </ToolContent>
              </Tool>
            );
          }

          // Stored tool call format
          if (isStoredToolCall(toolCall)) {
            return (
              <Tool
                key={`tool-${message.data?.id || message.type}-${toolCall.name}-${index}`}
                defaultOpen={false}
              >
                <ToolHeader
                  type={`tool-${toolCall.name}`}
                  state='output-available'
                />
                <ToolContent>
                  {toolCall.args && <ToolInput input={toolCall.args} />}
                  {toolCall.output && (
                    <ToolOutput
                      output={toolCall.output}
                      errorText={undefined}
                    />
                  )}
                </ToolContent>
              </Tool>
            );
          }

          return null;
        })}
      </div>
    );

  const iterationsElement = !isIterationsNumber(metadata.iterations) ? null : (
    <Task
      title={`${dict.assistant.iteration} ${metadata.iterations}`}
      defaultOpen={false}
    >
      <TaskTrigger title={`${dict.assistant.iteration} ${metadata.iterations}`}>
        <div className='flex items-center gap-2'>
          <div
            className={`
              flex size-6 items-center justify-center rounded-full bg-blue-500
              text-xs font-medium text-white
            `}
          >
            {metadata.iterations}
          </div>
          <div className='text-sm font-medium text-blue-900'>
            {metadata.iterations} {dict.assistant.iteration.toLowerCase()}
            {metadata.iterations !== 1 ? 's' : ''}
            {(isStoredToolCallsArray(metadata.toolCalls) ||
              isServerToolEventsArray(metadata.toolCalls)) &&
              ` • ${metadata.toolCalls.length} tool call${metadata.toolCalls.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </TaskTrigger>
      <TaskContent>
        <div className='text-sm text-muted-foreground'>
          {dict.assistant.thisResponseWasGeneratedThrough} {metadata.iterations}{' '}
          {dict.assistant.iteration.toLowerCase()}
          {metadata.iterations !== 1 ? 's' : ''}{' '}
          {dict.assistant.ofReasoningAndToolUsage}.
        </div>
      </TaskContent>
    </Task>
  );

  // Render based on section prop
  if (section === 'thinking') {
    return thinkingElement;
  }

  if (section === 'tools') {
    return (
      <>
        {toolCallsElement}
        {iterationsElement}
      </>
    );
  }

  // 'all' - render everything (thinking first, then tools, then iterations)
  return (
    <>
      {thinkingElement}
      {toolCallsElement}
      {iterationsElement}
    </>
  );
};
