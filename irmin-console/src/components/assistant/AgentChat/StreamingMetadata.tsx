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

import { useLocale } from '@/context/LocaleContext';

import type { ServerStreamEvent } from './types';

interface StreamingMetadataProps {
  streamingParts: ServerStreamEvent[];
}

export const StreamingMetadata = ({
  streamingParts,
}: StreamingMetadataProps) => {
  const { dict } = useLocale();

  if (streamingParts.length === 0) {
    return null;
  }

  return (
    <>
      {streamingParts.some(
        (p) =>
          p.type === 'tool-input-available' ||
          p.type === 'tool-output-available'
      ) && (
        <div className='mt-4 space-y-2'>
          <div className='text-sm font-medium text-muted-foreground'>
            {dict.assistant.toolCalls} (
            {
              streamingParts.filter(
                (p) =>
                  p.type === 'tool-input-available' ||
                  p.type === 'tool-output-available'
              ).length
            }
            )
          </div>
          {streamingParts.map((part, index) => {
            if (part.type === 'tool-input-available') {
              return (
                <Tool
                  // eslint-disable-next-line react/no-array-index-key
                  key={`streaming-tool-input-${index}`}
                  defaultOpen={false}
                >
                  <ToolHeader
                    type={`tool-${part.toolName || 'unknown'}`}
                    state='input-available'
                  />
                  <ToolContent>
                    {part.input && <ToolInput input={part.input} />}
                  </ToolContent>
                </Tool>
              );
            }
            if (part.type === 'tool-output-available') {
              return (
                <Tool
                  // eslint-disable-next-line react/no-array-index-key
                  key={`streaming-tool-output-${index}`}
                  defaultOpen={false}
                >
                  <ToolHeader
                    type={`tool-${part.toolCallId || 'unknown'}`}
                    state='output-available'
                  />
                  <ToolContent>
                    {part.output && (
                      <ToolOutput output={part.output} errorText={undefined} />
                    )}
                  </ToolContent>
                </Tool>
              );
            }
            return null;
          })}
        </div>
      )}

      {streamingParts.some((p) => p.type === 'reasoning-end') && (
        <div className='mt-4 space-y-2'>
          <div className='text-sm font-medium text-muted-foreground'>
            {dict.assistant.thinkingSteps} (
            {streamingParts.filter((p) => p.type === 'reasoning-end').length})
          </div>
          {streamingParts.map((part, index) => {
            if (part.type === 'reasoning-end') {
              return (
                <Reasoning
                  // eslint-disable-next-line react/no-array-index-key
                  key={`streaming-reasoning-${index}`}
                  defaultOpen={false}
                >
                  <ReasoningTrigger />
                  <ReasoningContent>{part.delta || ''}</ReasoningContent>
                </Reasoning>
              );
            }
            return null;
          })}
        </div>
      )}

      {streamingParts.map((part, index) => {
        if (part.type === 'system') {
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`streaming-system-${index}`}
              className='mt-4 rounded-md bg-muted p-3 text-sm'
            >
              <div className='mb-1 font-medium text-muted-foreground'>
                {dict.assistant.systemMessage}
              </div>
              <div>{part.content}</div>
            </div>
          );
        }
        if (part.type === 'stream-complete') {
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`streaming-complete-${index}`}
              className='mt-2 flex items-center gap-2 text-sm text-green-600'
            >
              <div
                className={`
                  flex size-4 items-center justify-center rounded-full
                  bg-green-500 text-xs font-medium text-white
                `}
              >
                ✓
              </div>
              <span>{dict.assistant.streamCompleted}</span>
            </div>
          );
        }
        if (part.type === 'stream-error' || part.type === 'error') {
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`streaming-error-${index}`}
              className={`
                mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm
                text-red-700
              `}
            >
              <div className='mb-1 font-medium'>{dict.assistant.error}</div>
              <div>{part.error || part.content}</div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
};
