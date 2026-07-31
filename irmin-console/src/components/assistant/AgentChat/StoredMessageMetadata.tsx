import type { StoredMessage } from '@langchain/core/messages';

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
  getMessageRole,
  getMessageType,
} from './storedMessageHelpers';

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
  message: StoredMessage;
}

export const StoredMessageMetadata = ({
  message,
}: StoredMessageMetadataProps) => {
  const role = getMessageRole(message);
  const messageType = getMessageType(message);
  const content = getMessageContent(message);

  // Don't render metadata for user messages
  if (role !== 'assistant') {
    return null;
  }

  // Handle different message types
  if (messageType === 'tool_call') {
    let toolCallData: {
      name: string;
      args: Record<string, unknown>;
    } | null = null;
    try {
      // Clean the content by removing extra tokens that might be appended
      let cleanContent = content;

      // Remove common streaming tokens that might appear anywhere in the content
      cleanContent = cleanContent.replace(/<\|tool_call_end\|>/g, '');
      cleanContent = cleanContent.replace(/<\|tool_calls_section_end\|>/g, '');

      // Additional cleanup for any remaining streaming artifacts
      cleanContent = cleanContent.replace(/<\|.*?\|>/g, '');

      // Fix malformed JSON by properly counting braces outside of strings
      cleanContent = repairJsonStructure(cleanContent);

      toolCallData = JSON.parse(cleanContent);
    } catch (error) {
      console.error('Failed to parse tool call:', error, 'Content:', content);
      // If parsing fails, render as plain text
      return null;
    }

    if (!toolCallData) {
      return null;
    }

    return (
      <div className='mt-4'>
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

  if (messageType === 'tool_result') {
    // Get the tool name from the message data (LangChain stores it in data.name)
    const data = message.data as unknown as Record<string, unknown>;
    const toolName =
      (data?.name as string) || (data?.tool_name as string) || 'result';

    return (
      <div className='mt-4'>
        <Tool defaultOpen={false}>
          <ToolHeader type={`tool-${toolName}`} state='output-available' />
          <ToolContent>
            <ToolOutput output={content} errorText={undefined} />
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (messageType === 'reasoning') {
    return (
      <div className='mt-4'>
        <Reasoning defaultOpen={false}>
          <ReasoningTrigger />
          <ReasoningContent>{content}</ReasoningContent>
        </Reasoning>
      </div>
    );
  }

  // For text messages, metadata (thinking steps, tool calls) is handled by MessageMetadata component
  // to avoid duplication. This component only handles specific message types above.
  return null;
};
