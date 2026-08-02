import { useState } from 'react';

import type { ServerStreamEvent } from './types';

interface UseStreamingState {
  isStreaming: boolean;
  streamingMessage: string;
  streamingMessageId: string | null;
  streamingParts: ServerStreamEvent[];
  abortController: AbortController | null;
  setIsStreaming: (value: boolean) => void;
  setStreamingMessage: (value: string) => void;
  setStreamingMessageId: (value: string | null) => void;
  setStreamingParts: (value: ServerStreamEvent[]) => void;
  setAbortController: (value: AbortController | null) => void;
  resetStreamingState: () => void;
}

export const useStreamingState = (): UseStreamingState => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [streamingParts, setStreamingParts] = useState<ServerStreamEvent[]>([]);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const resetStreamingState = () => {
    setIsStreaming(false);
    setStreamingMessage('');
    setStreamingParts([]);
    setStreamingMessageId(null);
    setAbortController(null);
  };

  return {
    isStreaming,
    streamingMessage,
    streamingMessageId,
    streamingParts,
    abortController,
    setIsStreaming,
    setStreamingMessage,
    setStreamingMessageId,
    setStreamingParts,
    setAbortController,
    resetStreamingState,
  };
};
