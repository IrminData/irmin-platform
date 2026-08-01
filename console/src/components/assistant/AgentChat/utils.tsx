import type { ReactNode } from 'react';

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ui/ai-elements/code-block';
import { Response } from '@/components/ui/ai-elements/response';

import type { ServerToolEvent, StoredToolCall } from './types';

// ============================================================================
// Tool Filtering Utilities (centralized to avoid duplication)
// ============================================================================

/** Internal/middleware tools that shouldn't be shown to users */
const HIDDEN_TOOLS = new Set(['extract', '__extract', 'tool_selector']);

/** Check if a string looks like a UUID (internal ID, not a real tool name) */
const isUUID = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Check if a tool should be hidden from display.
 * Filters out internal middleware tools, UUIDs, and placeholder names.
 */
export const shouldHideTool = (toolName: string | undefined): boolean => {
  if (!toolName || toolName === 'unknown' || toolName === 'result') {
    return true;
  }
  if (HIDDEN_TOOLS.has(toolName.toLowerCase())) {
    return true;
  }
  if (isUUID(toolName)) {
    return true;
  }
  return false;
};

// ============================================================================
// Type guards for message metadata (handles both stored and streaming formats)
// ============================================================================
export const isStoredToolCall = (item: unknown): item is StoredToolCall => {
  return typeof item === 'object' && item !== null && 'name' in item;
};

export const isStoredToolCallsArray = (
  value: unknown
): value is StoredToolCall[] => {
  return Array.isArray(value) && value.every(isStoredToolCall);
};

export const isServerToolEvent = (item: unknown): item is ServerToolEvent => {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    (item as ServerToolEvent).type.startsWith('tool-')
  );
};

export const isServerToolEventsArray = (
  value: unknown
): value is ServerToolEvent[] => {
  return Array.isArray(value) && value.every(isServerToolEvent);
};

export const isThinkingStepsArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

export const isIterationsNumber = (value: unknown): value is number => {
  return typeof value === 'number' && value > 0;
};

// Helper function to detect and render code blocks
export const renderMessageContent = (
  content: string,
  messageType?: string
): ReactNode => {
  // For tool calls, tool results, and reasoning, don't render content here
  // The StoredMessageMetadata component will handle the rendering
  if (
    messageType === 'tool_call' ||
    messageType === 'tool_result' ||
    messageType === 'reasoning'
  ) {
    return null;
  }

  // Simple markdown code block detection
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push(<Response key={`text-${lastIndex}`}>{textBefore}</Response>);
      }
    }

    // Add code block
    const language = match[1] || 'text';
    const code = match[2];
    parts.push(
      <CodeBlock key={`code-${match.index}`} code={code} language={language}>
        <CodeBlockCopyButton />
      </CodeBlock>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      parts.push(
        <Response key={`text-${lastIndex}`}>{remainingText}</Response>
      );
    }
  }

  // If no code blocks found, return as simple response
  if (parts.length === 0) {
    return <Response>{content}</Response>;
  }

  return <>{parts}</>;
};
