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

  // Render tool calls inline as they happen (in order)
  const toolParts = streamingParts.filter(
    (p) =>
      p.type === 'tool-input-available' || p.type === 'tool-output-available'
  );

  // Render errors only
  const errorParts = streamingParts.filter(
    (p) => p.type === 'stream-error' || p.type === 'error'
  );

  return (
    <>
      {/* Tool calls - rendered inline as they happen */}
      {toolParts.length > 0 && (
        <div className='mt-4 space-y-2'>
          {toolParts.map((part, index) => {
            if (part.type === 'tool-input-available') {
              return (
                <Tool key={`streaming-tool-input-${index}`} defaultOpen={false}>
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
                  key={`streaming-tool-output-${index}`}
                  defaultOpen={false}
                >
                  <ToolHeader
                    type={`tool-${part.toolName || part.toolCallId || 'unknown'}`}
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
