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

  if (role !== 'assistant' || !metadata) {
    return null;
  }

  const renderThinking = () => {
    if (
      !isThinkingStepsArray(metadata.thinkingSteps) ||
      metadata.thinkingSteps.length === 0
    ) {
      return null;
    }

    return (
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
    );
  };

  const renderToolCalls = () => {
    if (
      hasStoredToolMessages ||
      ((!isStoredToolCallsArray(metadata.toolCalls) ||
        metadata.toolCalls.length === 0) &&
        (!isServerToolEventsArray(metadata.toolCalls) ||
          metadata.toolCalls.length === 0))
    ) {
      return null;
    }

    return (
      <div className='mt-4 space-y-2'>
        {metadata.toolCalls.map((toolCall, index) => {
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

          if (isServerToolEvent(toolCall)) {
            return (
              <Tool
                key={`tool-${message.data?.id || message.type}-${toolCall.toolCallId}-${index}`}
                defaultOpen={false}
              >
                <ToolHeader
                  type={`tool-${toolCall.toolName || toolCall.toolCallId || 'unknown'}`}
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
    );
  };

  const renderIterations = () => {
    if (!isIterationsNumber(metadata.iterations)) {
      return null;
    }

    return (
      <Task
        title={`${dict.assistant.iteration} ${metadata.iterations}`}
        defaultOpen={false}
      >
        <TaskTrigger
          title={`${dict.assistant.iteration} ${metadata.iterations}`}
        >
          <div className='flex items-center gap-2'>
            <div
              className={`
                flex size-6 items-center justify-center rounded-full
                bg-blue-500 text-xs font-medium text-white
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
            {dict.assistant.thisResponseWasGeneratedThrough}{' '}
            {metadata.iterations} {dict.assistant.iteration.toLowerCase()}
            {metadata.iterations !== 1 ? 's' : ''}{' '}
            {dict.assistant.ofReasoningAndToolUsage}.
          </div>
        </TaskContent>
      </Task>
    );
  };

  // Render based on section prop
  if (section === 'thinking') {
    return renderThinking();
  }

  if (section === 'tools') {
    return (
      <>
        {renderToolCalls()}
        {renderIterations()}
      </>
    );
  }

  // 'all' - render everything (thinking first, then tools, then iterations)
  return (
    <>
      {renderThinking()}
      {renderToolCalls()}
      {renderIterations()}
    </>
  );
};
