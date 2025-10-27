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

import type { AIMessage } from '@/types/ai/base';

/**
 * Repairs malformed JSON by properly counting braces outside of string values
 * and adding missing closing braces only when structurally valid
 */
function repairJsonStructure(jsonString: string): string {
  let braceCount = 0;
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < jsonString.length) {
    const char = jsonString[i];

    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }
    }

    i++;
  }

  // Only add closing braces if we have unmatched opening braces
  if (braceCount > 0) {
    return jsonString + '}'.repeat(braceCount);
  }

  return jsonString;
}

interface StoredMessageMetadataProps {
  message: AIMessage;
}

export const StoredMessageMetadata = ({
  message,
}: StoredMessageMetadataProps) => {
  const { dict } = useLocale();

  // Don't render metadata for user messages
  if (message.role !== 'assistant') {
    return null;
  }

  // Handle different message types
  if (message.messageType === 'tool_call') {
    let toolCallData: {
      name: string;
      args: Record<string, unknown>;
    } | null = null;
    try {
      // Clean the content by removing extra tokens that might be appended
      let cleanContent = message.content;

      // Remove common streaming tokens that might appear anywhere in the content
      cleanContent = cleanContent.replace(/<\|tool_call_end\|>/g, '');
      cleanContent = cleanContent.replace(/<\|tool_calls_section_end\|>/g, '');

      // Additional cleanup for any remaining streaming artifacts
      cleanContent = cleanContent.replace(/<\|.*?\|>/g, '');

      // Fix malformed JSON by properly counting braces outside of strings
      cleanContent = repairJsonStructure(cleanContent);

      toolCallData = JSON.parse(cleanContent);
    } catch (error) {
      console.error(
        'Failed to parse tool call:',
        error,
        'Content:',
        message.content
      );
      // If parsing fails, render as plain text
      return null;
    }

    if (!toolCallData) {
      return null;
    }

    return (
      <div className='mt-4 space-y-2'>
        <div className='text-sm font-medium text-muted-foreground'>
          {dict.assistant.toolCalls} (1)
        </div>
        <Tool defaultOpen={false}>
          <ToolHeader
            type={`tool-${toolCallData.name || 'unknown'}`}
            state='input-available'
          />
          <ToolContent>
            {toolCallData.args && <ToolInput input={toolCallData.args} />}
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (message.messageType === 'tool_result') {
    return (
      <div className='mt-4 space-y-2'>
        <div className='text-sm font-medium text-muted-foreground'>
          {dict.assistant.toolCalls} (1)
        </div>
        <Tool defaultOpen={false}>
          <ToolHeader type='tool-result' state='output-available' />
          <ToolContent>
            <ToolOutput output={message.content} errorText={undefined} />
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (message.messageType === 'reasoning') {
    return (
      <div className='mt-4 space-y-2'>
        <div className='text-sm font-medium text-muted-foreground'>
          {dict.assistant.thinkingSteps} (1)
        </div>
        <Reasoning defaultOpen={false}>
          <ReasoningTrigger />
          <ReasoningContent>{message.content}</ReasoningContent>
        </Reasoning>
      </div>
    );
  }

  // For text messages, check if there's metadata to render
  if (message.metadata && Object.keys(message.metadata).length > 0) {
    return (
      <>
        {/* Tool calls from metadata are handled by MessageMetadata component */}

        {/* Render thinking steps if available in metadata */}
        {message.metadata.thinkingSteps &&
          Array.isArray(message.metadata.thinkingSteps) &&
          message.metadata.thinkingSteps.length > 0 && (
            <div className='mt-4 space-y-2'>
              <div className='text-sm font-medium text-muted-foreground'>
                {dict.assistant.thinkingSteps} (
                {message.metadata.thinkingSteps.length})
              </div>
              {message.metadata.thinkingSteps.map(
                (step: string, index: number) => {
                  // Create a simple hash from step content for uniqueness
                  const stepHash = step
                    .split('')
                    .reduce((hash, char) => hash + char.charCodeAt(0), 0);
                  return (
                    <Reasoning
                      // eslint-disable-next-line react/no-array-index-key
                      key={`thinking-${message.id}-${stepHash}-${index}`}
                      defaultOpen={false}
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>{step}</ReasoningContent>
                    </Reasoning>
                  );
                }
              )}
            </div>
          )}
      </>
    );
  }

  return null;
};
