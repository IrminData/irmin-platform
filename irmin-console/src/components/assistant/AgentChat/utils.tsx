import type { ReactNode } from 'react';

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ui/ai-elements/code-block';
import { Response } from '@/components/ui/ai-elements/response';

import type { ServerToolEvent, StoredToolCall } from './types';

// Type guards for message metadata (handles both stored and streaming formats)
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
export const renderMessageContent = (content: string): ReactNode => {
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
