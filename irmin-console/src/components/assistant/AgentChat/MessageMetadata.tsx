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

import type { AIMessage } from '@/types/ai/base';

import {
  isIterationsNumber,
  isServerToolEvent,
  isServerToolEventsArray,
  isStoredToolCall,
  isStoredToolCallsArray,
  isThinkingStepsArray,
} from './utils';

interface MessageMetadataProps {
  message: AIMessage;
  agentId: string;
}

export const MessageMetadata = ({ message }: MessageMetadataProps) => {
  const { dict } = useLocale();

  if (message.role !== 'assistant' || !message.metadata) {
    return null;
  }

  return (
    <>
      {/* Render tool calls if available */}
      {((isStoredToolCallsArray(message.metadata.toolCalls) &&
        message.metadata.toolCalls.length > 0) ||
        (isServerToolEventsArray(message.metadata.toolCalls) &&
          message.metadata.toolCalls.length > 0)) && (
        <div className='mt-4 space-y-2'>
          <div className='text-sm font-medium text-muted-foreground'>
            {dict.assistant.toolCalls} ({message.metadata.toolCalls.length})
          </div>
          {message.metadata.toolCalls.map((toolCall, index) => {
            if (isStoredToolCall(toolCall)) {
              return (
                <Tool
                  // eslint-disable-next-line react/no-array-index-key
                  key={`tool-${message.id}-${toolCall.name}-${index}`}
                  defaultOpen={false}
                >
                  <ToolHeader
                    type={`tool-${toolCall.name}` as `tool-${string}`}
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

            if (isServerToolEvent(toolCall)) {
              return (
                <Tool
                  // eslint-disable-next-line react/no-array-index-key
                  key={`tool-${message.id}-${toolCall.toolCallId}-${index}`}
                  defaultOpen={false}
                >
                  <ToolHeader
                    type={
                      `tool-${toolCall.toolName || toolCall.toolCallId || 'unknown'}` as `tool-${string}`
                    }
                    state={
                      toolCall.type === 'tool-output-available'
                        ? 'output-available'
                        : 'input-available'
                    }
                  />
                  <ToolContent>
                    {toolCall.input && <ToolInput input={toolCall.input} />}
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
      )}

      {isThinkingStepsArray(message.metadata.thinkingSteps) &&
        message.metadata.thinkingSteps.length > 0 && (
          <div className='mt-4 space-y-2'>
            <div className='text-sm font-medium text-muted-foreground'>
              {dict.assistant.thinkingSteps} (
              {message.metadata.thinkingSteps.length})
            </div>
            {message.metadata.thinkingSteps.map(
              (step: string, index: number) => (
                <Reasoning
                  // eslint-disable-next-line react/no-array-index-key
                  key={`thinking-${message.id}-${step.slice(0, 20)}-${index}`}
                  defaultOpen={false}
                >
                  <ReasoningTrigger />
                  <ReasoningContent>{step}</ReasoningContent>
                </Reasoning>
              )
            )}
          </div>
        )}

      {isIterationsNumber(message.metadata.iterations) && (
        <Task
          title={`${dict.assistant.iteration} ${message.metadata.iterations}`}
          defaultOpen={false}
        >
          <TaskTrigger
            title={`${dict.assistant.iteration} ${message.metadata.iterations}`}
          >
            <div className='flex items-center gap-2'>
              <div
                className={`
                  flex size-6 items-center justify-center rounded-full
                  bg-blue-500 text-xs font-medium text-white
                `}
              >
                {message.metadata.iterations}
              </div>
              <div className='text-sm font-medium text-blue-900'>
                {message.metadata.iterations}{' '}
                {dict.assistant.iteration.toLowerCase()}
                {message.metadata.iterations !== 1 ? 's' : ''}
                {(isStoredToolCallsArray(message.metadata.toolCalls) ||
                  isServerToolEventsArray(message.metadata.toolCalls)) &&
                  ` • ${message.metadata.toolCalls.length} tool call${message.metadata.toolCalls.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </TaskTrigger>
          <TaskContent>
            <div className='text-sm text-muted-foreground'>
              {dict.assistant.thisResponseWasGeneratedThrough}{' '}
              {message.metadata.iterations}{' '}
              {dict.assistant.iteration.toLowerCase()}
              {message.metadata.iterations !== 1 ? 's' : ''}{' '}
              {dict.assistant.ofReasoningAndToolUsage}.
            </div>
          </TaskContent>
        </Task>
      )}
    </>
  );
};
